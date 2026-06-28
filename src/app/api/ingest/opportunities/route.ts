import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const LIVE_DATA_PATH = "src/lib/career-deck/live-data.json";

type AnyRecord = Record<string, unknown>;

type IngestBody = {
  records?: AnyRecord[];
  opportunities?: AnyRecord[];
  dryRun?: boolean;
};

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

function getBearerToken(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const [scheme, token] = header.split(" ");
  return scheme?.toLowerCase() === "bearer" ? token : null;
}

function requireAuth(request: Request) {
  const expected = process.env.CAREER_DECK_INGEST_TOKEN;
  return Boolean(expected) && getBearerToken(request) === expected;
}

function repoConfig() {
  return {
    repo: process.env.CAREER_DECK_GITHUB_REPO ?? "jiexiY/Career-deck",
    branch: process.env.CAREER_DECK_GITHUB_BRANCH ?? "main",
    token: process.env.CAREER_DECK_GITHUB_TOKEN,
  };
}

function textValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeRecord(record: AnyRecord) {
  const now = new Date().toISOString();
  const title = textValue(record.title, "Untitled opportunity");
  const organization = textValue(record.organization, "Unknown organization");
  const slug = `${organization}-${title}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return {
    ...record,
    id: textValue(record.id, slug || crypto.randomUUID()),
    title,
    organization,
    type: textValue(record.type, "fellowship"),
    status: textValue(record.status, "active"),
    sourceId: textValue(record.sourceId, textValue(record.sourceName, "live-monitor")),
    sourceUrl: textValue(record.sourceUrl, textValue(record.applicationUrl)),
    applicationUrl: textValue(record.applicationUrl, textValue(record.sourceUrl)),
    location: textValue(record.location, "Not listed"),
    deadline: record.deadline ?? null,
    compensation: record.compensation ?? "Not listed",
    eligibility: record.eligibility ?? "Not listed",
    fitScore: record.fitScore ?? record.score ?? null,
    priority: record.priority ?? null,
    whyItFits: record.whyItFits ?? "",
    nextSteps: record.nextSteps ?? "",
    discoveredAt: record.discoveredAt ?? now,
    updatedAt: record.updatedAt ?? now,
    needsReview: record.needsReview ?? false,
    tags: Array.isArray(record.tags) ? record.tags : [],
    evidence: Array.isArray(record.evidence) ? record.evidence : [],
    isNewSincePreviousReport: record.isNewSincePreviousReport ?? true,
  };
}

async function getCurrentLiveData() {
  const { repo, branch, token } = repoConfig();
  if (!token) {
    throw new Error("CAREER_DECK_GITHUB_TOKEN is not configured");
  }

  const response = await fetch(
    `https://api.github.com/repos/${repo}/contents/${LIVE_DATA_PATH}?ref=${branch}`,
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
    throw new Error(`Unable to read live data file: ${response.status} ${await response.text()}`);
  }

  const payload = (await response.json()) as { sha: string; content?: string };
  const decoded = payload.content
    ? JSON.parse(Buffer.from(payload.content, "base64").toString("utf8"))
    : { updatedAt: null, opportunities: [] };

  return {
    sha: payload.sha,
    data: {
      updatedAt: decoded.updatedAt ?? null,
      opportunities: Array.isArray(decoded.opportunities) ? decoded.opportunities : [],
    },
  };
}

async function persistLiveData(data: unknown, sha: string) {
  const { repo, branch, token } = repoConfig();
  if (!token) {
    throw new Error("CAREER_DECK_GITHUB_TOKEN is not configured");
  }

  const content = Buffer.from(JSON.stringify(data, null, 2) + "\n", "utf8").toString("base64");
  const response = await fetch(`https://api.github.com/repos/${repo}/contents/${LIVE_DATA_PATH}`, {
    method: "PUT",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({
      message: "Update Career Deck live opportunities",
      content,
      sha,
      branch,
    }),
  });

  if (!response.ok) {
    throw new Error(`Unable to persist live data: ${response.status} ${await response.text()}`);
  }
}

export async function POST(request: Request) {
  if (!requireAuth(request)) {
    return json({ error: "Unauthorized" }, 401);
  }

  let body: IngestBody;
  try {
    body = (await request.json()) as IngestBody;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const input = body.records ?? body.opportunities;
  if (!Array.isArray(input)) {
    return json({ error: "Expected records or opportunities array" }, 400);
  }

  const incoming = input.map(normalizeRecord);
  const current = await getCurrentLiveData();
  const byId = new Map(current.data.opportunities.map((item: AnyRecord) => [String(item.id), item]));

  for (const record of incoming) {
    byId.set(String(record.id), {
      ...(byId.get(String(record.id)) ?? {}),
      ...record,
      updatedAt: record.updatedAt ?? new Date().toISOString(),
    });
  }

  const nextData = {
    updatedAt: new Date().toISOString(),
    opportunities: (Array.from(byId.values()) as AnyRecord[]).sort((a: AnyRecord, b: AnyRecord) =>
      String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? "")),
    ),
  };

  if (!body.dryRun) {
    await persistLiveData(nextData, current.sha);
  }

  return json({
    ok: true,
    dryRun: body.dryRun ?? false,
    received: incoming.length,
    total: nextData.opportunities.length,
    updatedAt: nextData.updatedAt,
  });
}


