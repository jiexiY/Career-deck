import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const monitorPath = path.join(root, "src", "lib", "career-deck", "game-monitor.json");
const shouldCommit = process.argv.includes("--commit");
const checkedAt = new Date().toISOString();

function pacificDate(value) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

function blockedReason(status) {
  if (status === 401 || status === 403) return `Blocked by source access policy: HTTP ${status}`;
  if (status === 429) return "Blocked by source rate limiting: HTTP 429";
  if (status === 451) return "Blocked by legal restriction: HTTP 451";
  if (status === 503) return "Source temporarily unavailable or blocking server-side fetches: HTTP 503";
  return `Fetch failed: HTTP ${status}`;
}

async function checkSource(url) {
  try {
    const response = await fetch(url, {
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

function dedupeByCompanyTitleLocation(opportunities) {
  const seen = new Set();
  const deduped = [];

  for (const opportunity of opportunities) {
    const key = [opportunity.company, opportunity.roleTitle, opportunity.location]
      .join("::")
      .toLowerCase()
      .replace(/[^a-z0-9:]+/g, " ")
      .trim();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(opportunity);
  }

  return deduped;
}

function commitIfRequested() {
  if (!shouldCommit) return;

  const status = execFileSync("git", ["status", "--short", monitorPath], {
    cwd: root,
    encoding: "utf8",
  }).trim();

  if (!status) {
    console.log("No game monitor changes to commit.");
    return;
  }

  execFileSync("git", ["add", monitorPath], { cwd: root, stdio: "inherit" });
  execFileSync("git", ["commit", "-m", "Update game opportunities monitor"], {
    cwd: root,
    stdio: "inherit",
  });
}

const monitor = JSON.parse(await fs.readFile(monitorPath, "utf8"));
const checkedDate = pacificDate(new Date(checkedAt));
const sourceResults = await Promise.all(
  monitor.sources.map(async (source) => ({
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
const nextOpportunities = dedupeByCompanyTitleLocation(monitor.opportunities).map((opportunity) => ({
  ...opportunity,
  lastCheckedDate: checkedDate,
}));
const activeSourceCount = nextSources.filter((source) => source.status === "active").length;
const blockedSourceCount = nextSources.filter((source) => source.status === "blocked").length;
const sourceChangedCount = nextSources.filter((source, index) => source.status !== monitor.sources[index]?.status)
  .length;

const nextMonitor = {
  ...monitor,
  updatedAt: checkedAt,
  dailyBrief: {
    ...monitor.dailyBrief,
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

await fs.writeFile(monitorPath, `${JSON.stringify(nextMonitor, null, 2)}\n`);

console.log(
  JSON.stringify(
    {
      checkedAt,
      opportunities: nextOpportunities.length,
      activeSources: activeSourceCount,
      blockedSources: blockedSourceCount,
      sourceChangedCount,
      committed: shouldCommit,
    },
    null,
    2,
  ),
);

commitIfRequested();
