import type {
  ConversationSource,
  Opportunity,
  OpportunityType,
} from "@/lib/career-deck/types";

export type ExtractedConversationOpportunity = Partial<Opportunity> & {
  sourceName?: string;
};

export type ConversationAdapterResult = {
  sourceId: string;
  status: "success" | "blocked" | "failed";
  checkedAt: string;
  failureReason?: string;
  rawLength?: number;
  opportunities: ExtractedConversationOpportunity[];
};

export function blockedReason(status: number) {
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

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/https?:\/\//g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90);
}

export function extractCandidateUrls(html: string) {
  const cleaned = html
    .replace(/\\u0026/g, "&")
    .replace(/\\\//g, "/")
    .replace(/&amp;/g, "&")
    .replace(/%5C/g, "");
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
): ExtractedConversationOpportunity {
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

export function extractConversationOpportunities(
  source: ConversationSource,
  html: string,
  checkedAt: string,
) {
  return extractCandidateUrls(html).map((url) => buildOpportunityRecord(source, url, checkedAt));
}

export async function fetchConversationOpportunities(
  source: ConversationSource,
  checkedAt: string,
): Promise<ConversationAdapterResult> {
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
        sourceId: source.id,
        status: response.status === 401 || response.status === 403 || response.status === 429 || response.status === 451 ? "blocked" : "failed",
        checkedAt,
        failureReason: blockedReason(response.status),
        opportunities: [],
      };
    }

    const raw = await response.text();

    return {
      sourceId: source.id,
      status: "success",
      checkedAt,
      rawLength: raw.length,
      opportunities: extractConversationOpportunities(source, raw, checkedAt),
    };
  } catch (error) {
    return {
      sourceId: source.id,
      status: "failed",
      checkedAt,
      failureReason: error instanceof Error ? error.message : "Unknown fetch error",
      opportunities: [],
    };
  }
}
