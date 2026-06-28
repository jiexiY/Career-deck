import { createHash } from "crypto";
import { NextResponse } from "next/server";
import conversationSourcesFile from "@/lib/career-deck/conversation-sources.json";
import conversationSnapshotsFile from "@/lib/career-deck/conversation-snapshots.json";
import type {
  ConversationSnapshot,
  ConversationSnapshotStatus,
  ConversationSource,
} from "@/lib/career-deck/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const SNAPSHOT_PATH = "src/lib/career-deck/conversation-snapshots.json";

type SnapshotFile = {
  updatedAt: string | null;
  snapshots: ConversationSnapshot[];
};

type GitHubFile = {
  sha: string;
  data: SnapshotFile;
};

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

function isAuthorized(request: Request) {
  const expected = process.env.CRON_SECRET;

  if (!expected) {
    return process.env.NODE_ENV !== "production";
  }

  return request.headers.get("authorization") === `Bearer ${expected}`;
}

function repoConfig() {
  return {
    repo: process.env.CAREER_DECK_GITHUB_REPO ?? "jiexiY/Career-deck",
    branch: process.env.CAREER_DECK_GITHUB_BRANCH ?? "main",
    token: process.env.CAREER_DECK_GITHUB_TOKEN,
  };
}

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeConversationHtml(html: string) {
  return html
    .replace(/nonce="[^"]*"/g, 'nonce=""')
    .replace(/data-build="[^"]*"/g, 'data-build=""')
    .replace(/data-seq="[^"]*"/g, 'data-seq=""')
    .replace(/"dd-trace-id" content="[^"]*"/g, '"dd-trace-id" content=""')
    .replace(/"dd-trace-time" content="[^"]*"/g, '"dd-trace-time" content=""')
    .replace(/\/_next\/static\/[^"')\s]+/g, "/_next/static/asset")
    .replace(/\b[0-9a-f]{24,}\b/gi, "HASH")
    .replace(/\s+/g, " ")
    .trim();
}

function blockedReason(status: number) {
  if (status === 401 || status === 403) {
    return `Blocked by source access policy: HTTP ${status}`;
  }

  if (status === 429) {
    return "Blocked by source rate limiting: HTTP 429";
  }

  if (status === 451) {
    return "Blocked by legal restriction: HTTP 451";
  }

  return `Fetch failed: HTTP ${status}`;
}

function blockedStatus(status: number): ConversationSnapshotStatus {
  return status === 401 || status === 403 || status === 429 || status === 451
    ? "blocked"
    : "failed";
}

async function readRemoteSnapshotFile(): Promise<GitHubFile | null> {
  const { repo, branch, token } = repoConfig();

  if (!token) {
    return null;
  }

  const response = await fetch(
    `https://api.github.com/repos/${repo}/contents/${SNAPSHOT_PATH}?ref=${branch}`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`Unable to read snapshot file: ${response.status} ${await response.text()}`);
  }

  const payload = (await response.json()) as { sha: string; content?: string };
  const decoded = payload.content
    ? (JSON.parse(Buffer.from(payload.content, "base64").toString("utf8")) as SnapshotFile)
    : { updatedAt: null, snapshots: [] };

  return {
    sha: payload.sha,
    data: {
      updatedAt: decoded.updatedAt ?? null,
      snapshots: Array.isArray(decoded.snapshots) ? decoded.snapshots : [],
    },
  };
}

async function persistSnapshotFile(nextFile: SnapshotFile, sha: string) {
  const { repo, branch, token } = repoConfig();

  if (!token) {
    throw new Error("CAREER_DECK_GITHUB_TOKEN is not configured");
  }

  const content = Buffer.from(JSON.stringify(nextFile, null, 2) + "\n", "utf8").toString(
    "base64",
  );
  const response = await fetch(`https://api.github.com/repos/${repo}/contents/${SNAPSHOT_PATH}`, {
    method: "PUT",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({
      message: "Update Career Deck conversation snapshots",
      content,
      sha,
      branch,
    }),
  });

  if (!response.ok) {
    throw new Error(`Unable to persist snapshot file: ${response.status} ${await response.text()}`);
  }
}

async function detectSource(
  source: ConversationSource,
  previous: ConversationSnapshot | undefined,
  checkedAt: string,
): Promise<ConversationSnapshot> {
  try {
    const response = await fetch(source.url, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "CareerDeckSourceMonitor/1.0",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        ...previous,
        sourceId: source.id,
        url: source.url,
        status: blockedStatus(response.status),
        lastFetchedAt: checkedAt,
        failureReason: blockedReason(response.status),
      };
    }

    const raw = await response.text();
    const normalized = normalizeConversationHtml(raw);
    const rawHash = hash(raw);
    const normalizedHash = hash(normalized);
    const changed = Boolean(previous?.normalizedHash && previous.normalizedHash !== normalizedHash);

    return {
      sourceId: source.id,
      url: source.url,
      status: previous?.normalizedHash ? (changed ? "changed" : "unchanged") : "baseline_pending",
      lastFetchedAt: checkedAt,
      lastChangedAt: changed ? checkedAt : previous?.lastChangedAt,
      rawHash,
      normalizedHash,
      rawLength: raw.length,
      normalizedLength: normalized.length,
    };
  } catch (error) {
    return {
      ...previous,
      sourceId: source.id,
      url: source.url,
      status: "failed",
      lastFetchedAt: checkedAt,
      failureReason: error instanceof Error ? error.message : "Unknown fetch error",
    };
  }
}

async function runDetection() {
  const checkedAt = new Date().toISOString();
  const sources = (conversationSourcesFile as { sources: ConversationSource[] }).sources;
  const localSnapshotFile = conversationSnapshotsFile as SnapshotFile;
  let remoteFile: GitHubFile | null = null;
  let snapshotSource: SnapshotFile = localSnapshotFile;
  let persistenceError: string | null = null;

  try {
    remoteFile = await readRemoteSnapshotFile();
    snapshotSource = remoteFile?.data ?? localSnapshotFile;
  } catch (error) {
    persistenceError = error instanceof Error ? error.message : "Unable to read remote snapshots";
  }

  const previousBySource = new Map(
    (snapshotSource.snapshots ?? []).map((snapshot) => [snapshot.sourceId, snapshot]),
  );
  const snapshots = await Promise.all(
    sources.map((source) => detectSource(source, previousBySource.get(source.id), checkedAt)),
  );
  const nextFile: SnapshotFile = {
    updatedAt: checkedAt,
    snapshots,
  };

  let persisted = false;

  if (remoteFile) {
    try {
      await persistSnapshotFile(nextFile, remoteFile.sha);
      persisted = true;
    } catch (error) {
      persistenceError =
        error instanceof Error ? error.message : "Unable to persist conversation snapshots";
    }
  }

  return {
    ok: true,
    checkedAt,
    persisted,
    persistenceError,
    sources: sources.length,
    changes: snapshots.filter((snapshot) => snapshot.status === "changed").length,
    blocked: snapshots.filter((snapshot) => snapshot.status === "blocked").length,
    failed: snapshots.filter((snapshot) => snapshot.status === "failed").length,
    snapshots: snapshots.map((snapshot) => ({
      sourceId: snapshot.sourceId,
      status: snapshot.status,
      lastFetchedAt: snapshot.lastFetchedAt,
      lastChangedAt: snapshot.lastChangedAt,
      rawLength: snapshot.rawLength,
      normalizedLength: snapshot.normalizedLength,
      normalizedHashPrefix: snapshot.normalizedHash?.slice(0, 12),
      failureReason: snapshot.failureReason,
    })),
  };
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return json(
      {
        error: "Unauthorized",
        setup:
          "Set CRON_SECRET in Vercel and call this route with Authorization: Bearer <CRON_SECRET>.",
      },
      process.env.CRON_SECRET ? 401 : 503,
    );
  }

  return json(await runDetection());
}

export async function POST(request: Request) {
  return GET(request);
}
