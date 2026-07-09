import { NextResponse } from "next/server";
import gameMonitorFile from "@/lib/career-deck/game-monitor.json";
import liveDataFile from "@/lib/career-deck/live-data.json";
import { runGameMonitor } from "@/lib/career-deck/game-monitor-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const GAME_MONITOR_PATH = "src/lib/career-deck/game-monitor.json";
const LIVE_DATA_PATH = "src/lib/career-deck/live-data.json";

type GitHubJsonFile<T> = {
  sha: string;
  data: T;
};

type GameMonitorFile = typeof gameMonitorFile;
type LiveDataFile = typeof liveDataFile;

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

async function readGithubJson<T>(path: string): Promise<GitHubJsonFile<T>> {
  const { repo, branch, token } = repoConfig();
  const response = await fetch(`https://api.github.com/repos/${repo}/contents/${path}?ref=${branch}`, {
    cache: "no-store",
    headers: {
      accept: "application/vnd.github+json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Unable to read ${path}: ${response.status} ${await response.text()}`);
  }

  const payload = await response.json();
  const content = Buffer.from(String(payload.content ?? ""), "base64").toString("utf8");

  return {
    sha: payload.sha,
    data: JSON.parse(content) as T,
  };
}

async function persistGithubJson<T>(path: string, sha: string, data: T, message: string) {
  const { repo, branch, token } = repoConfig();

  if (!token) {
    return {
      persisted: false,
      reason: "Missing CAREER_DECK_GITHUB_TOKEN. Cron can check sources but cannot update GitHub data.",
    };
  }

  const response = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
    method: "PUT",
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      branch,
      message,
      sha,
      content: Buffer.from(`${JSON.stringify(data, null, 2)}\n`).toString("base64"),
    }),
  });

  if (!response.ok) {
    return {
      persisted: false,
      reason: `Unable to persist ${path}: ${response.status} ${await response.text()}`,
    };
  }

  return {
    persisted: true,
    reason: null,
  };
}

async function run(request: Request) {
  if (!isAuthorized(request)) {
    return json({ ok: false, error: "Unauthorized" }, 401);
  }

  const checkedAt = new Date().toISOString();
  let monitorSource = {
    sha: "local-fallback",
    data: gameMonitorFile as GameMonitorFile,
  };
  let liveSource = {
    sha: "local-fallback",
    data: liveDataFile as LiveDataFile,
  };

  try {
    monitorSource = await readGithubJson<GameMonitorFile>(GAME_MONITOR_PATH);
  } catch {
    // Local fallback keeps preview/dev runs useful even without GitHub access.
  }

  try {
    liveSource = await readGithubJson<LiveDataFile>(LIVE_DATA_PATH);
  } catch {
    // Local fallback keeps preview/dev runs useful even without GitHub access.
  }

  const result = await runGameMonitor({
    monitor: monitorSource.data,
    liveData: liveSource.data,
    checkedAt,
  });
  const monitorPersistence = await persistGithubJson(
    GAME_MONITOR_PATH,
    monitorSource.sha,
    result.monitor,
    "Update Career Deck game opportunity monitor",
  );
  const livePersistence = await persistGithubJson(
    LIVE_DATA_PATH,
    liveSource.sha,
    result.liveData,
    "Update Career Deck game opportunity cards",
  );

  return json({
    ok: true,
    checkedAt,
    schedule: "Daily at 7:00 PM Pacific (0 2 * * * UTC during PDT)",
    persisted: monitorPersistence.persisted && livePersistence.persisted,
    monitorPersistence,
    livePersistence,
    opportunities: result.monitor.opportunities.length,
    publicOpportunities: result.liveData?.opportunities?.length ?? 0,
    adapterResults: result.adapterResults,
    sources: (result.monitor.sources as GameMonitorFile["sources"]).map((source) => ({
      id: source.id,
      company: source.company,
      status: source.status,
      failureReason: source.failureReason,
    })),
  });
}

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}
