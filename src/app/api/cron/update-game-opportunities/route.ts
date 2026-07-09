import { NextResponse } from "next/server";
import gameMonitorFile from "@/lib/career-deck/game-monitor.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const GAME_MONITOR_PATH = "src/lib/career-deck/game-monitor.json";

type GitHubJsonFile<T> = {
  sha: string;
  data: T;
};

type GameMonitorFile = typeof gameMonitorFile;

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

async function checkSource(url: string) {
  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        "user-agent": "CareerDeckGameMonitor/1.0 (+https://career-deck-amber.vercel.app)",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(12_000),
    });

    if (!response.ok) {
      return {
        status: response.status === 404 ? "manual_review_required" : "blocked",
        failureReason: blockedReason(response.status),
        rawLength: 0,
      };
    }

    const text = await response.text();

    return {
      status: "active",
      failureReason: undefined,
      rawLength: text.length,
    };
  } catch (error) {
    return {
      status: "blocked",
      failureReason: error instanceof Error ? error.message : "Fetch failed before parsing.",
      rawLength: 0,
    };
  }
}

function pacificDate(value: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

async function buildNextMonitorData(current: GameMonitorFile, checkedAt: string) {
  const checkedDate = pacificDate(new Date(checkedAt));
  const sourceResults = await Promise.all(
    current.sources.map(async (source) => ({
      source,
      result: await checkSource(source.url),
    })),
  );
  const nextSources = sourceResults.map(({ source, result }) => ({
    ...source,
    lastAttemptAt: checkedAt,
    status: result.status,
    failureReason: result.failureReason,
  }));
  const activeSourceCount = nextSources.filter((source) => source.status === "active").length;
  const blockedSourceCount = nextSources.filter((source) => source.status === "blocked").length;
  const sourceChangedCount = nextSources.filter((source, index) => source.status !== current.sources[index]?.status)
    .length;
  const nextOpportunities = current.opportunities.map((opportunity) => ({
    ...opportunity,
    lastCheckedDate: checkedDate,
  }));

  return {
    ...current,
    updatedAt: checkedAt,
    dailyBrief: {
      ...current.dailyBrief,
      date: checkedDate,
      summary:
        "Daily game monitor ran source reachability checks and refreshed last-checked dates. New roles are added only when an official application route can be verified.",
      newRolesFound: 0,
      stillOpen: nextOpportunities.filter((item) => item.monitorStatus === "active" || item.monitorStatus === "urgent")
        .length,
      urgent: nextOpportunities.filter((item) => item.monitorStatus === "urgent").length,
      closed: nextOpportunities.filter((item) => item.monitorStatus === "closed").length,
      changes: [
        {
          kind: "source-check",
          label: "Source reachability check",
          detail: `${activeSourceCount} active source(s), ${blockedSourceCount} blocked source(s), ${sourceChangedCount} source status change(s).`,
        },
        {
          kind: "integrity",
          label: "No fabricated roles",
          detail:
            "The run did not add roles from unparsed pages. Official or official-application-route verification is still required before publishing new cards.",
        },
      ],
    },
    sources: nextSources,
    opportunities: nextOpportunities,
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
  let source = {
    sha: "local-fallback",
    data: gameMonitorFile as GameMonitorFile,
  };

  try {
    source = await readGithubJson<GameMonitorFile>(GAME_MONITOR_PATH);
  } catch {
    // Local fallback keeps preview/dev runs useful even without GitHub access.
  }

  const nextData = await buildNextMonitorData(source.data, checkedAt);
  const persistence = await persistGithubJson(
    GAME_MONITOR_PATH,
    source.sha,
    nextData,
    "Update Career Deck game opportunity monitor",
  );

  return json({
    ok: true,
    checkedAt,
    schedule: "Daily at 7:00 PM Pacific (0 2 * * * UTC during PDT)",
    persisted: persistence.persisted,
    reason: persistence.reason,
    opportunities: nextData.opportunities.length,
    sources: nextData.sources.map((source) => ({
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
