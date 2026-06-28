import { createHash } from "crypto";
import { NextResponse } from "next/server";
import conversationSourcesFile from "@/lib/career-deck/conversation-sources.json";
import conversationSnapshotsFile from "@/lib/career-deck/conversation-snapshots.json";
import type {
  ConversationSnapshot,
  ConversationSnapshotStatus,
  ConversationSource,
  Opportunity,
  OpportunityType,
} from "@/lib/career-deck/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const SNAPSHOT_PATH = "src/lib/career-deck/conversation-snapshots.json";
const LIVE_DATA_PATH = "src/lib/career-deck/live-data.json";

type SnapshotFile = {
  updatedAt: string | null;
  snapshots: ConversationSnapshot[];
};

type GitHubFile = {
  sha: string;
  data: SnapshotFile;
};

type GitHubJsonFile<T> = {
  sha: string;
  data: T;
};

type LiveDataFile = {
  updatedAt: string | null;
  opportunities: Array<Partial<Opportunity> & { sourceName?: string }>;
};

type SourceDetectionResult = {
  snapshot: ConversationSnapshot;
  opportunities: Array<Partial<Opportunity> & { sourceName?: string }>;
};

type LiveDataPersistenceResult = {
  persisted: boolean;
  reason: string | null;
  total: number;
  saved: number;
  records?: number;
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

  if (status === 503) {
    return "Source temporarily unavailable or blocking server-side fetches: HTTP 503";
  }

  return `Fetch failed: HTTP ${status}`;
}

function blockedStatus(status: number): ConversationSnapshotStatus {
  return status === 401 || status === 403 || status === 429 || status === 451 || status === 503
    ? "blocked"
    : "failed";
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/https?:\/\//g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90);
}

function cleanedHtmlForUrlExtraction(html: string) {
  return html
    .replace(/\\u0026/g, "&")
    .replace(/\\\//g, "/")
    .replace(/&amp;/g, "&")
    .replace(/%5C/g, "");
}

function extractCandidateUrls(html: string) {
  const cleaned = cleanedHtmlForUrlExtraction(html);
  const matches = cleaned.match(/https?:\/\/[^"'<>\s)]+/g) ?? [];
  const seen = new Set<string>();
  const candidates: string[] = [];

  for (const match of matches) {
    const url = normalizeExtractedUrl(match);

    if (!url || seen.has(url) || !isOpportunityLikeUrl(url)) {
      continue;
    }

    seen.add(url);
    candidates.push(url);
  }

  return candidates.slice(0, 120);
}

function normalizeExtractedUrl(value: string) {
  let cleaned = value
    .replace(/\\+$/g, "")
    .replace(/[",.]+$/g, "")
    .replace(/utm_source=chatgpt\.com\\?$/g, "utm_source=chatgpt.com");

  try {
    const url = new URL(cleaned);
    url.hash = "";
    url.searchParams.delete("utm_source");
    url.searchParams.delete("srsltid");

    return url.toString();
  } catch {
    cleaned = cleaned.split("\\")[0];
  }

  try {
    const url = new URL(cleaned);
    url.hash = "";

    return url.toString();
  } catch {
    return null;
  }
}

function isOpportunityLikeUrl(url: string) {
  const lower = url.toLowerCase();

  if (
    /chatgpt\.com|openai\.com|oaistatic\.com|auth0\.com|google\.com\/search/.test(lower) ||
    /reddit\.com|facebook\.com|wikipedia\.org|play\.google\.com|apps\.apple\.com/.test(lower) ||
    /linkedin\.com\/company|linkedin\.com\/jobs\//.test(lower)
  ) {
    return false;
  }

  return /career|careers|jobs|job-|greenhouse|lever|workday|ashby|workable|devpost|hackathon|intern|student|university|campus|early-career|earlycareers|emerging-talent|fellowship|co-op|coop|recruit/i.test(
    lower,
  );
}

function classifyOpportunityType(url: string): OpportunityType {
  const lower = url.toLowerCase();

  if (/co-?op|co_ops|coops/.test(lower)) {
    return "co-op";
  }

  if (/fellow|fellowship/.test(lower)) {
    return "fellowship";
  }

  if (/hackathon|devpost|mlh\.com\/events/.test(lower)) {
    return "hackathon";
  }

  if (/recruit|career-fair|event/.test(lower)) {
    return "recruiting-event";
  }

  if (/training|academy|bootcamp|apprentice/.test(lower)) {
    return "training-program";
  }

  if (/intern|internship/.test(lower)) {
    return "internship";
  }

  if (/student|university|campus|early-career|earlycareers|emerging-talent|graduate/.test(lower)) {
    return "student-community";
  }

  return "full-time";
}

function organizationFromUrl(url: string) {
  const hostname = new URL(url).hostname.replace(/^www\./, "");
  const known: Record<string, string> = {
    "riotgames.com": "Riot Games",
    "crystaldynamics.com": "Crystal Dynamics",
    "hubspot.com": "HubSpot",
    "2k.com": "2K",
    "playstation.com": "PlayStation",
    "activision.com": "Activision",
    "blizzard.com": "Blizzard Entertainment",
    "epicgames.com": "Epic Games",
    "ea.com": "Electronic Arts",
    "ubisoft.com": "Ubisoft",
    "king.com": "King",
    "zynga.com": "Zynga",
    "scopely.com": "Scopely",
    "tencent.com": "Tencent",
    "garena.com": "Garena",
    "papegames.com": "Paper Games",
    "infoldgames.com": "InFold Games",
    "neteasegames.com": "NetEase Games",
    "razer.com": "Razer",
    "devpost.com": "Devpost",
    "mlh.com": "Major League Hacking",
  };

  const knownKey = Object.keys(known).find((domain) => hostname.endsWith(domain));

  if (knownKey) {
    return known[knownKey];
  }

  const parts = hostname
    .replace(/^careers\./, "")
    .replace(/^jobs\./, "")
    .split(".")
    .filter(Boolean);
  const base = parts.length > 1 ? parts[parts.length - 2] : parts[0] ?? hostname;

  return base
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function titleFromUrl(url: string, type: OpportunityType) {
  const parsed = new URL(url);
  const pathParts = parsed.pathname
    .split("/")
    .filter(Boolean)
    .map((part) => decodeURIComponent(part))
    .filter((part) => !/^\d+$/.test(part) && !/^[a-f0-9-]{20,}$/i.test(part));
  const lastUsefulPart = pathParts[pathParts.length - 1] ?? "";
  const fromPath = lastUsefulPart
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[-_+]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (fromPath && fromPath.length > 2 && !/^jobs?$|^careers?$|^campus$|^earlycareers$/i.test(fromPath)) {
    return toTitleCase(fromPath);
  }

  if (type === "internship") {
    return "Internship Opportunities";
  }

  if (type === "co-op") {
    return "Co-op Opportunities";
  }

  if (type === "hackathon") {
    return "Hackathon";
  }

  if (type === "student-community") {
    return "Student Programs";
  }

  if (type === "recruiting-event") {
    return "Recruiting Event";
  }

  if (type === "training-program") {
    return "Training Program";
  }

  if (type === "fellowship") {
    return "Fellowship";
  }

  return "Career Opportunities";
}

function toTitleCase(value: string) {
  return value.replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

function confidenceForUrl(url: string) {
  const lower = url.toLowerCase();
  const aggregator = /gamejobs|indeed|ziprecruiter|showbizjobs|builtin|prosple|recruit\.net|outscal|wondercv|shixiseng|watchjobs/.test(
    lower,
  );

  return {
    source: aggregator ? 0.48 : 0.82,
    extraction: aggregator ? 0.46 : 0.56,
    freshness: aggregator ? 0.5 : 0.68,
    duplicateProbability: aggregator ? 0.36 : 0.24,
  };
}

function buildOpportunityRecord(
  source: ConversationSource,
  url: string,
  checkedAt: string,
): Partial<Opportunity> & { sourceName?: string } {
  const type = classifyOpportunityType(url);
  const organization = organizationFromUrl(url);
  const title = titleFromUrl(url, type);
  const confidence = confidenceForUrl(url);

  return {
    id: `conversation-${source.section}-${slugify(`${organization}-${title}-${url}`)}`,
    title,
    organization,
    section: source.section,
    type,
    status: "open",
    sourceId: source.id,
    sourceName: source.name,
    url,
    location: "TBD",
    deadline: "TBD",
    compensation: "TBD",
    eligibility: "TBD",
    discoveredAt: checkedAt,
    updatedAt: checkedAt,
    confidence,
    evidence: [
      `URL extracted from ${source.name}. Fields marked TBD until verified against the official source.`,
    ],
    needsReview: true,
  };
}

function extractConversationOpportunities(
  source: ConversationSource,
  html: string,
  checkedAt: string,
) {
  return extractCandidateUrls(html).map((url) => buildOpportunityRecord(source, url, checkedAt));
}

async function fetchConversationSource(url: string) {
  const headerSets: HeadersInit[] = [
    {
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
    },
    {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent": "CareerDeckSourceMonitor/1.0",
    },
  ];
  let lastResponse: Response | null = null;

  for (const headers of headerSets) {
    const response = await fetch(url, {
      headers,
      cache: "no-store",
    });

    if (response.ok) {
      return response;
    }

    lastResponse = response;
  }

  return lastResponse ?? fetch(url, { cache: "no-store" });
}

async function readRemoteSnapshotFile(): Promise<GitHubFile | null> {
  return readRemoteJsonFile<SnapshotFile>(SNAPSHOT_PATH);
}

async function readRemoteJsonFile<T>(path: string): Promise<GitHubJsonFile<T> | null> {
  const { repo, branch, token } = repoConfig();

  if (!token) {
    return null;
  }

  const response = await fetch(
    `https://api.github.com/repos/${repo}/contents/${path}?ref=${branch}`,
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
    throw new Error(`Unable to read ${path}: ${response.status} ${await response.text()}`);
  }

  const payload = (await response.json()) as { sha: string; content?: string };
  const decoded = payload.content
    ? (JSON.parse(Buffer.from(payload.content, "base64").toString("utf8")) as T)
    : ({} as T);

  return {
    sha: payload.sha,
    data: decoded,
  };
}

async function persistSnapshotFile(nextFile: SnapshotFile, sha: string) {
  return persistJsonFile(SNAPSHOT_PATH, nextFile, sha, "Update Career Deck conversation snapshots");
}

async function persistJsonFile(path: string, data: unknown, sha: string, message: string) {
  const { repo, branch, token } = repoConfig();

  if (!token) {
    throw new Error("CAREER_DECK_GITHUB_TOKEN is not configured");
  }

  const content = Buffer.from(JSON.stringify(data, null, 2) + "\n", "utf8").toString("base64");
  const response = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
    method: "PUT",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({
      message,
      content,
      sha,
      branch,
    }),
  });

  if (!response.ok) {
    throw new Error(`Unable to persist ${path}: ${response.status} ${await response.text()}`);
  }
}

function normalizeLiveDataFile(file: Partial<LiveDataFile> | null | undefined): LiveDataFile {
  return {
    updatedAt: file?.updatedAt ?? null,
    opportunities: Array.isArray(file?.opportunities) ? file.opportunities : [],
  };
}

async function readRemoteLiveDataFile() {
  const remote = await readRemoteJsonFile<LiveDataFile>(LIVE_DATA_PATH);

  return remote
    ? {
        sha: remote.sha,
        data: normalizeLiveDataFile(remote.data),
      }
    : null;
}

function mergeLiveOpportunities(
  current: LiveDataFile,
  incoming: Array<Partial<Opportunity> & { sourceName?: string }>,
  checkedAt: string,
) {
  const byId = new Map(current.opportunities.map((opportunity) => [String(opportunity.id), opportunity]));

  for (const opportunity of incoming) {
    if (!opportunity.id) {
      continue;
    }

    byId.set(opportunity.id, {
      ...(byId.get(opportunity.id) ?? {}),
      ...opportunity,
      discoveredAt: byId.get(opportunity.id)?.discoveredAt ?? opportunity.discoveredAt ?? checkedAt,
      updatedAt: checkedAt,
    });
  }

  return {
    updatedAt: checkedAt,
    opportunities: Array.from(byId.values()).sort((a, b) =>
      String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? "")),
    ),
  };
}

async function persistLiveOpportunities(
  incoming: Array<Partial<Opportunity> & { sourceName?: string }>,
  checkedAt: string,
) {
  const remoteLiveData = await readRemoteLiveDataFile();

  if (!remoteLiveData) {
    return {
      persisted: false,
      reason: "CAREER_DECK_GITHUB_TOKEN is not configured",
      total: incoming.length,
      saved: 0,
    };
  }

  const before = remoteLiveData.data.opportunities.length;
  const nextFile = mergeLiveOpportunities(remoteLiveData.data, incoming, checkedAt);
  const after = nextFile.opportunities.length;

  await persistJsonFile(
    LIVE_DATA_PATH,
    nextFile,
    remoteLiveData.sha,
    "Sync Career Deck conversation opportunities",
  );

  return {
    persisted: true,
    reason: null,
    total: incoming.length,
    saved: after - before,
    records: after,
  };
}

async function detectSource(
  source: ConversationSource,
  previous: ConversationSnapshot | undefined,
  checkedAt: string,
): Promise<SourceDetectionResult> {
  try {
    const response = await fetchConversationSource(source.url);

    if (!response.ok) {
      return {
        snapshot: {
          ...previous,
          sourceId: source.id,
          url: source.url,
          status: blockedStatus(response.status),
          lastFetchedAt: checkedAt,
          failureReason: blockedReason(response.status),
        },
        opportunities: [],
      };
    }

    const raw = await response.text();
    const normalized = normalizeConversationHtml(raw);
    const rawHash = hash(raw);
    const normalizedHash = hash(normalized);
    const changed = Boolean(previous?.normalizedHash && previous.normalizedHash !== normalizedHash);

    return {
      snapshot: {
        sourceId: source.id,
        url: source.url,
        status: previous?.normalizedHash ? (changed ? "changed" : "unchanged") : "baseline_pending",
        lastFetchedAt: checkedAt,
        lastChangedAt: changed ? checkedAt : previous?.lastChangedAt,
        rawHash,
        normalizedHash,
        rawLength: raw.length,
        normalizedLength: normalized.length,
      },
      opportunities: extractConversationOpportunities(source, raw, checkedAt),
    };
  } catch (error) {
    return {
      snapshot: {
        ...previous,
        sourceId: source.id,
        url: source.url,
        status: "failed",
        lastFetchedAt: checkedAt,
        failureReason: error instanceof Error ? error.message : "Unknown fetch error",
      },
      opportunities: [],
    };
  }
}

async function runDetection() {
  const checkedAt = new Date().toISOString();
  const sources = (conversationSourcesFile as { sources: ConversationSource[] }).sources;
  const localSnapshotFile = conversationSnapshotsFile as SnapshotFile;
  let remoteFile: GitHubFile | null = null;
  let snapshotSource: SnapshotFile = {
    updatedAt: localSnapshotFile.updatedAt ?? null,
    snapshots: Array.isArray(localSnapshotFile.snapshots) ? localSnapshotFile.snapshots : [],
  };
  let persistenceError: string | null = null;
  let liveDataPersistenceError: string | null = null;

  try {
    remoteFile = await readRemoteSnapshotFile();
    snapshotSource = {
      updatedAt: remoteFile?.data.updatedAt ?? snapshotSource.updatedAt,
      snapshots: Array.isArray(remoteFile?.data.snapshots) ? remoteFile.data.snapshots : [],
    };
  } catch (error) {
    persistenceError = error instanceof Error ? error.message : "Unable to read remote snapshots";
  }

  const previousBySource = new Map(
    (snapshotSource.snapshots ?? []).map((snapshot) => [snapshot.sourceId, snapshot]),
  );
  const results = await Promise.all(
    sources.map((source) => detectSource(source, previousBySource.get(source.id), checkedAt)),
  );
  const snapshots = results.map((result) => result.snapshot);
  const extractedOpportunities = results.flatMap((result) => result.opportunities);
  const nextFile: SnapshotFile = {
    updatedAt: checkedAt,
    snapshots,
  };

  let persisted = false;
  let liveDataPersistence: LiveDataPersistenceResult = {
    persisted: false,
    reason: "No opportunities extracted",
    total: extractedOpportunities.length,
    saved: 0,
  };

  if (remoteFile) {
    try {
      await persistSnapshotFile(nextFile, remoteFile.sha);
      persisted = true;
    } catch (error) {
      persistenceError =
        error instanceof Error ? error.message : "Unable to persist conversation snapshots";
    }
  }

  if (extractedOpportunities.length) {
    try {
      liveDataPersistence = await persistLiveOpportunities(extractedOpportunities, checkedAt);
    } catch (error) {
      liveDataPersistenceError =
        error instanceof Error ? error.message : "Unable to persist live opportunity data";
    }
  }

  return {
    ok: true,
    checkedAt,
    persisted,
    persistenceError,
    liveDataPersisted: liveDataPersistence.persisted,
    liveDataPersistenceError,
    extractedOpportunities: liveDataPersistence.total,
    savedOpportunities: liveDataPersistence.saved,
    totalLiveRecords: liveDataPersistence.records,
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
