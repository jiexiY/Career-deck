import vm from "node:vm";

const TARGET_TRACKS = [
  {
    track: "game operations",
    keywords: ["game operations", "operations", "live operations", "live ops", "publishing"],
  },
  {
    track: "version/live ops",
    keywords: ["live ops", "version", "event", "campaign", "game operations"],
  },
  {
    track: "product operations",
    keywords: ["product", "project coordinator", "operations", "producer"],
  },
  {
    track: "community operations",
    keywords: ["community", "discord", "reddit", "player"],
  },
  {
    track: "content marketing",
    keywords: ["content", "social media", "marketing", "campaign", "brand"],
  },
  {
    track: "KOL/influencer operations",
    keywords: ["kol", "influencer", "creator"],
  },
  {
    track: "user research",
    keywords: ["user research", "research", "user experience", "ux"],
  },
  {
    track: "game UX/product planning",
    keywords: ["ux", "user experience", "designer", "product planning", "game design"],
  },
  {
    track: "publishing/overseas operations",
    keywords: ["overseas", "global", "publishing", "localization"],
  },
  {
    track: "early-career game production",
    keywords: ["intern", "internship", "coordinator", "associate", "fellowship", "training"],
  },
];

const LOW_FIT_NEGATIVE_KEYWORDS = [
  "senior",
  "principal",
  "legal counsel",
  "litigation",
  "privacy",
  "engineer",
  "architecture",
  "architect",
  "devops",
  "sre",
  "cloud",
  "backend",
  "frontend",
  "software engineering",
  "data development",
  "animator",
];

const HIGH_FIT_KEYWORDS = [
  "intern",
  "community",
  "social media",
  "content marketing",
  "kol",
  "influencer",
  "operations",
  "user experience",
  "ux",
  "campaign",
];

const TARGET_TITLE_KEYWORDS = [
  "intern",
  "internship",
  "fellow",
  "fellowship",
  "junior",
  "part-time",
  "part time",
  "contractor",
  "developer engagement",
  "developer relations",
  "community",
  "social",
  "content",
  "marketing",
  "influencer",
  "kol",
  "creator",
  "product marketing",
  "product manager",
  "product management",
  "operations",
  "ops",
  "esport",
  "publishing",
  "localization",
  "producer",
  "coordinator",
  "analyst",
  "quality analyst",
  "support specialist",
  "human evaluator",
  "ux",
  "user experience",
  "research",
];

const HARD_EXCLUDE_TITLE_KEYWORDS = [
  "counsel",
  "legal",
  "engineer",
  "programmer",
  "architect",
  "artist",
  "director",
  "senior",
  "sr.",
  "staff",
  "principal",
  "lead",
  "finance",
  "fp&a",
  "public policy",
  "data center",
  "global mobility",
  "office of the ceo",
  "架构师",
  "工程师",
  "程序员",
  "艺术家",
  "法务",
];

const NON_TARGET_TITLE_KEYWORDS = [
  "talent acquisition",
  "human resources",
  "hr operations",
  "hr intern",
  "human resources intern",
  "it operations",
  "business strategy analyst",
  "programmer",
  "financial accounting",
  "accounting",
  "finance",
  "compliance",
  "business system",
  "sales executive",
  "mechanical engineering",
  "big data development",
  "data engineer",
  "backend developer",
  "software engineering",
  "product engineer",
  "agent development",
  "ai application",
  "game ai research",
  "solution architect",
  "game mode developer",
  "game developer",
  "full stack developer",
  "technical artist",
  "environment artist",
  "lighting artist",
  "engine research",
  "ml researcher",
  "world model research",
  "nlp research",
  "anti-fraud",
  "recruiter",
  "hrbp",
  "people team",
  "tencent cloud",
  "wechat",
  "wxg",
];

const OFFICIAL_GREENHOUSE_API = "https://boards-api.greenhouse.io/v1/boards";
const OFFICIAL_ASHBY_API = "https://api.ashbyhq.com/posting-api/job-board";
const DEFAULT_MONITOR_USER_AGENT = "CareerDeckGameMonitor/1.0 (+https://career-deck-amber.vercel.app)";

export function blockedReason(status) {
  if (status === 401 || status === 403) return `Blocked by source access policy: HTTP ${status}`;
  if (status === 429) return "Blocked by source rate limiting: HTTP 429";
  if (status === 451) return "Blocked by legal restriction: HTTP 451";
  if (status === 503) return "Source temporarily unavailable or blocking server-side fetches: HTTP 503";
  return `Fetch failed: HTTP ${status}`;
}

export function pacificDate(value) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

export function slugify(value) {
  return String(value)
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, "-")
    .slice(0, 120);
}

function stripHtml(value) {
  return String(value ?? "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function normalizedKey(...parts) {
  return parts
    .join("::")
    .toLowerCase()
    .replace(/[^a-z0-9:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function textIncludesAny(text, keywords) {
  const haystack = text.toLowerCase();

  return keywords.some((keyword) => {
    const needle = keyword.toLowerCase();

    if (/^[a-z0-9 ]+$/.test(needle)) {
      const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
      return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`).test(haystack);
    }

    return haystack.includes(needle);
  });
}

function hasHardExcludedTitle(title) {
  const text = title.toLowerCase();
  const isExplicitEarlyCareer = textIncludesAny(text, ["intern", "fellow", "junior", "part-time", "part time"]);

  return !isExplicitEarlyCareer && textIncludesAny(text, HARD_EXCLUDE_TITLE_KEYWORDS);
}

function hasNonTargetTitle(title) {
  return textIncludesAny(title, NON_TARGET_TITLE_KEYWORDS);
}

function inferRoleTrack(title, content) {
  const text = `${title} ${content}`.toLowerCase();
  const ranked = TARGET_TRACKS.map((item) => ({
    track: item.track,
    score: item.keywords.filter((keyword) => text.includes(keyword)).length,
  })).sort((a, b) => b.score - a.score);

  return ranked[0]?.score ? ranked[0].track : "game operations";
}

function inferLocationMode(location) {
  const text = location.toLowerCase();
  if (text.includes("remote")) return "remote";
  if (text.includes("hybrid")) return "hybrid";
  if (text.includes("office") || text.includes("singapore") || text.includes("hong kong") || text.includes("japan")) {
    return "in_person";
  }
  return "hybrid_unknown";
}

function inferOpportunityType(title) {
  const text = title.toLowerCase();
  if (text.includes("intern")) return "internship";
  if (text.includes("fellow")) return "fellowship";
  if (text.includes("part-time") || text.includes("part time")) return "part-time";
  if (text.includes("training") || text.includes("camp")) return "training-program";
  if (text.includes("community")) return "student-community";
  return "full-time";
}

function inferFitScore(title, content, location) {
  const text = `${title} ${content} ${location}`.toLowerCase();
  let score = 5;

  for (const keyword of HIGH_FIT_KEYWORDS) {
    if (text.includes(keyword)) score += 1;
  }

  if (text.includes("statistics") || text.includes("analytics") || text.includes("metrics")) score += 1;
  if (text.includes("chinese") || text.includes("mandarin") || text.includes("bilingual")) score += 1;
  if (text.includes("remote")) score += 1;

  for (const keyword of LOW_FIT_NEGATIVE_KEYWORDS) {
    if (text.includes(keyword)) score -= 2;
  }

  return Math.max(1, Math.min(10, score));
}

function summarizeQualifications(content, fallback) {
  const sentences = content
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const required = sentences
    .filter((sentence) => textIncludesAny(sentence, ["experience", "ability", "skill", "knowledge", "familiar", "background"]))
    .slice(0, 4);

  return required.length ? required : fallback;
}

function portfolioMaterialsFor(track, title) {
  const text = `${track} ${title}`.toLowerCase();
  const materials = new Set(["Game KPI dashboard", "Community sentiment memo"]);

  if (text.includes("content") || text.includes("marketing") || text.includes("social")) {
    materials.add("Content calendar");
    materials.add("Campaign metrics dashboard");
  }

  if (text.includes("kol") || text.includes("influencer")) {
    materials.add("KOL tracker");
  }

  if (text.includes("ux") || text.includes("user experience") || text.includes("research")) {
    materials.add("UX/game system teardown");
  }

  if (text.includes("operations") || text.includes("live")) {
    materials.add("Infinity Nikki version-ops case");
  }

  return Array.from(materials).slice(0, 5);
}

function fitReasonFor(track, fitScore) {
  if (fitScore >= 8) {
    return `Strong ${track} match for Sociology + Statistics, community/content research, analytics, and AI Club project leadership.`;
  }

  if (fitScore >= 6) {
    return `Relevant ${track} path, but application materials should prove game-domain work and practical execution.`;
  }

  return `Adjacent game-industry role; keep as research unless requirements and location are realistic.`;
}

function risksFor(job, location, type) {
  const risks = [];

  if (!String(job.content ?? "").toLowerCase().includes("intern") && type !== "internship") {
    risks.push("Not explicitly an internship; confirm early-career eligibility before prioritizing.");
  }

  if (!location.toLowerCase().includes("remote")) {
    risks.push("Location or work authorization may be the main constraint.");
  }

  risks.push("Deadline not listed on the official source feed; monitor as open until the official route disappears.");

  return risks;
}

function monitorHeaders(accept = "application/json") {
  return {
    "user-agent": DEFAULT_MONITOR_USER_AGENT,
    accept,
  };
}

async function checkManualSource(source, fetchImpl, checkedAt) {
  if (source.priority === "reposting_watchlist") {
    return {
      ...source,
      lastAttemptAt: checkedAt,
      status: "blocked",
      failureReason:
        source.failureReason ??
        "Reposting/watchlist source is not treated as verified and requires manual review before publishing.",
    };
  }

  try {
    const response = await fetchImpl(source.url, {
      cache: "no-store",
      headers: {
        "user-agent": DEFAULT_MONITOR_USER_AGENT,
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(12_000),
    });

    if (!response.ok) {
      return {
        ...source,
        lastAttemptAt: checkedAt,
        status: response.status === 404 ? "manual_review_required" : "blocked",
        failureReason: blockedReason(response.status),
      };
    }

    return {
      ...source,
      lastAttemptAt: checkedAt,
      status: "manual_review_required",
      failureReason:
        source.failureReason ??
        "Source is reachable, but no reviewed parser adapter is configured. Manual review required before publishing roles.",
    };
  } catch (error) {
    return {
      ...source,
      lastAttemptAt: checkedAt,
      status: "blocked",
      failureReason: error instanceof Error ? error.message : "Fetch failed before parsing.",
    };
  }
}

function createGreenhouseAdapter(source) {
  const boardToken = source.boardToken ?? inferGreenhouseBoardToken(source.url);
  const apiUrl = `${OFFICIAL_GREENHOUSE_API}/${boardToken}/jobs?content=true`;

  return {
    key: "greenhouse",
    source,
    async fetch(context) {
      const response = await context.fetch(apiUrl, {
        cache: "no-store",
        headers: monitorHeaders(),
        signal: AbortSignal.timeout(12_000),
      });
      const raw = await response.text();

      if (!response.ok) {
        return {
          ok: false,
          status: response.status === 404 ? "manual_review_required" : "blocked",
          failureReason: blockedReason(response.status),
          raw,
          rawLength: raw.length,
        };
      }

      return {
        ok: true,
        status: "active",
        raw,
        rawLength: raw.length,
      };
    },
    async parse(result) {
      if (!result.ok) return [];
      const payload = JSON.parse(result.raw);
      return Array.isArray(payload.jobs) ? payload.jobs : [];
    },
    async normalize(records, context) {
      return records.map((job) => {
        const title = String(job.title ?? "Untitled role").trim();
        const location = String(job.location?.name ?? "Location not listed").trim();
        const content = stripHtml(job.content);
        const roleTrack = inferRoleTrack(title, content);
        const fitScore = inferFitScore(title, content, location);
        const type = inferOpportunityType(title);
        const existing = findExistingMonitor(context.monitor, {
          applicationLink: job.absolute_url,
          company: source.company,
          roleTitle: title,
          location,
        });
        const opportunityId =
          existing?.opportunityId ??
          `official-game-${slugify(`${source.company}-${title}-${location}-${job.id ?? job.internal_job_id}`)}`;

        return {
          opportunityId,
          company: source.company,
          roleTitle: title,
          location,
          locationMode: inferLocationMode(location),
          roleTrack,
          monitorStatus: existing ? "active" : "new",
          verified: true,
          applicationLink: job.absolute_url,
          sourceLink: job.absolute_url,
          requiredQualifications: summarizeQualifications(content, [
            "Official posting should be reviewed before final tailoring.",
          ]),
          preferredQualifications: summarizeQualifications(content, [
            "Game/community/content/analytics proof improves fit for this lane.",
          ]).slice(0, 3),
          fitScore,
          fitReason: fitReasonFor(roleTrack, fitScore),
          blockersRisks: risksFor(job, location, type),
          portfolioMaterials: portfolioMaterialsFor(roleTrack, title),
          dateFirstFound: existing?.dateFirstFound ?? context.checkedDate,
          lastCheckedDate: context.checkedDate,
          adapterSourceId: source.id,
          publicType: type,
          publicEligibility: content.slice(0, 240) || "Official Greenhouse posting verified; details require source review.",
          sourceFeedLabel: "Greenhouse",
        };
      });
    },
    async validate(opportunity) {
      const title = String(opportunity.roleTitle);
      const relevant = textIncludesAny(title, TARGET_TITLE_KEYWORDS);
      const official = /^https?:\/\//i.test(String(opportunity.applicationLink));

      if (!official) {
        return {
          valid: false,
          reason: "Rejected because the official Greenhouse feed did not provide a valid application link.",
        };
      }

      if (hasHardExcludedTitle(title)) {
        return {
          valid: false,
          reason: "Rejected because the title is senior/technical/legal/art-focused rather than the requested early-career ops/community/content/UX lane.",
        };
      }

      if (hasNonTargetTitle(title)) {
        return {
          valid: false,
          reason: "Rejected because the title is outside the requested game ops/community/content/UX/product/publishing lane.",
        };
      }

      if (!relevant || opportunity.fitScore < 6) {
        return {
          valid: false,
          reason: "Rejected as low-confidence for the requested game operations/community/content/UX lane.",
        };
      }

      return { valid: true };
    },
    async save(opportunities) {
      return { saved: opportunities.length };
    },
  };
}

function inferGreenhouseBoardToken(url) {
  const match = String(url).match(/greenhouse\.io\/([^/?#]+)/i);
  return match?.[1] ?? "neteasegames";
}

function createAshbyAdapter(source) {
  const boardToken = source.boardToken ?? inferAshbyBoardToken(source.url);
  const apiUrl = `${OFFICIAL_ASHBY_API}/${boardToken}?includeCompensation=true`;

  return {
    key: "ashby",
    source,
    async fetch(context) {
      const response = await context.fetch(apiUrl, {
        cache: "no-store",
        headers: monitorHeaders(),
        signal: AbortSignal.timeout(12_000),
      });
      const raw = await response.text();

      if (!response.ok) {
        return {
          ok: false,
          status: response.status === 404 ? "manual_review_required" : "blocked",
          failureReason: blockedReason(response.status),
          raw,
          rawLength: raw.length,
        };
      }

      return {
        ok: true,
        status: "active",
        raw,
        rawLength: raw.length,
      };
    },
    async parse(result) {
      if (!result.ok) return [];
      const payload = JSON.parse(result.raw);
      return Array.isArray(payload.jobs) ? payload.jobs : [];
    },
    async normalize(records, context) {
      return records
        .filter((job) => job?.isListed !== false)
        .map((job) => {
          const title = String(job.title ?? "Untitled role").trim();
          const location = String(job.location ?? "Location not listed").trim();
          const applicationLink = String(job.applyUrl ?? job.jobUrl ?? "").trim();
          const sourceLink = String(job.jobUrl ?? applicationLink).trim();
          const content = stripHtml(
            [
              job.descriptionPlain,
              job.descriptionHtml,
              job.department,
              job.team,
              job.employmentType,
              job.workplaceType,
            ].join(" "),
          );
          const roleTrack = inferRoleTrack(title, content);
          const fitScore = inferFitScore(title, content, location);
          const type = inferOpportunityType(title);
          const existing = findExistingMonitor(context.monitor, {
            applicationLink,
            company: source.company,
            roleTitle: title,
            location,
          });
          const opportunityId =
            existing?.opportunityId ??
            `official-game-${slugify(`${source.company}-${title}-${location}-${job.id ?? sourceLink}`)}`;

          return {
            opportunityId,
            company: source.company,
            roleTitle: title,
            location,
            locationMode: inferLocationMode(location),
            roleTrack,
            monitorStatus: existing ? "active" : "new",
            verified: true,
            applicationLink,
            sourceLink,
            requiredQualifications: summarizeQualifications(content, [
              "Official Ashby posting should be reviewed before final tailoring.",
            ]),
            preferredQualifications: summarizeQualifications(content, [
              "Game/community/content/analytics proof improves fit for this lane.",
            ]).slice(0, 3),
            fitScore,
            fitReason: fitReasonFor(roleTrack, fitScore),
            blockersRisks: risksFor({ ...job, content }, location, type),
            portfolioMaterials: portfolioMaterialsFor(roleTrack, title),
            dateFirstFound: existing?.dateFirstFound ?? context.checkedDate,
            lastCheckedDate: context.checkedDate,
            adapterSourceId: source.id,
            publicType: type,
            publicEligibility: content.slice(0, 240) || "Official Ashby posting verified; details require source review.",
            sourceFeedLabel: "Ashby",
          };
        });
    },
    async validate(opportunity) {
      const title = String(opportunity.roleTitle);
      const relevant = textIncludesAny(title, TARGET_TITLE_KEYWORDS);
      const official = /^https?:\/\/jobs\.ashbyhq\.com\/[^/]+\/[0-9a-f-]+(?:\/application)?$/i.test(
        String(opportunity.applicationLink),
      );

      if (!official) {
        return {
          valid: false,
          reason: "Rejected because the official Ashby feed did not provide a valid application link.",
        };
      }

      if (hasHardExcludedTitle(title)) {
        return {
          valid: false,
          reason: "Rejected because the title is senior/technical/legal/art-focused rather than the requested early-career ops/community/content/UX lane.",
        };
      }

      if (hasNonTargetTitle(title)) {
        return {
          valid: false,
          reason: "Rejected because the title is outside the requested game ops/community/content/UX/product/publishing lane.",
        };
      }

      if (!relevant || opportunity.fitScore < 6) {
        return {
          valid: false,
          reason: "Rejected as low-confidence for the requested game operations/community/content/UX lane.",
        };
      }

      return { valid: true };
    },
    async save(opportunities) {
      return { saved: opportunities.length };
    },
  };
}

function inferAshbyBoardToken(url) {
  const match = String(url).match(/ashbyhq\.com\/([^/?#]+)/i);
  return match?.[1] ?? "thatgamecompany";
}

function createWorkdayAdapter(source) {
  const config = workdayConfigFromSource(source);
  const apiUrl = `${config.origin}/wday/cxs/${config.tenant}/${config.siteId}/jobs`;
  const pageSize = Math.min(source.pageSize ?? 20, 20);
  const maxRecords = source.maxRecords ?? 400;

  return {
    key: "workday",
    source,
    async fetch(context) {
      const jobPostings = [];
      let total = null;
      let rawLength = 0;

      for (let offset = 0; offset < maxRecords; offset += pageSize) {
        const response = await context.fetch(apiUrl, {
          method: "POST",
          cache: "no-store",
          headers: {
            ...monitorHeaders(),
            "content-type": "application/json",
          },
          body: JSON.stringify({
            appliedFacets: source.appliedFacets ?? {},
            limit: pageSize,
            offset,
            searchText: source.searchText ?? "",
          }),
          signal: AbortSignal.timeout(15_000),
        });
        const raw = await response.text();
        rawLength += raw.length;

        if (!response.ok) {
          return {
            ok: false,
            status: response.status === 404 ? "manual_review_required" : "blocked",
            failureReason: blockedReason(response.status),
            raw,
            rawLength,
          };
        }

        const payload = JSON.parse(raw);
        const pageJobs = Array.isArray(payload.jobPostings) ? payload.jobPostings : [];
        total = Number.isFinite(payload.total) ? payload.total : total;
        jobPostings.push(...pageJobs);

        if (pageJobs.length < pageSize || (total !== null && jobPostings.length >= total)) {
          break;
        }
      }

      return {
        ok: true,
        status: "active",
        raw: JSON.stringify({ total: total ?? jobPostings.length, jobPostings }),
        rawLength,
      };
    },
    async parse(result) {
      if (!result.ok) return [];
      const payload = JSON.parse(result.raw);
      return Array.isArray(payload.jobPostings) ? payload.jobPostings : [];
    },
    async normalize(records, context) {
      const normalized = [];

      for (const job of records) {
        const title = String(job.title ?? "Untitled role").trim();
        const location = workdayLocation(job);
        const applicationLink = workdayApplicationLink(config, job);

        if (!applicationLink) continue;

        const listContent = workdayListContent(job);
        const shouldFetchDetail = textIncludesAny(title, TARGET_TITLE_KEYWORDS) && !hasHardExcludedTitle(title);
        const detailContent = shouldFetchDetail
          ? await fetchWorkdayDetail({ config, job, context })
          : "";
        const content = stripHtml(`${listContent} ${detailContent}`);
        const roleTrack = inferRoleTrack(title, content);
        const fitScore = inferFitScore(title, content, location);
        const type = inferOpportunityType(title);
        const existing = findExistingMonitor(context.monitor, {
          applicationLink,
          company: source.company,
          roleTitle: title,
          location,
        });
        const opportunityId =
          existing?.opportunityId ??
          `official-game-${slugify(`${source.company}-${title}-${location}-${job.externalPath ?? applicationLink}`)}`;

        normalized.push({
          opportunityId,
          company: source.company,
          roleTitle: title,
          location,
          locationMode: inferLocationMode(location),
          roleTrack,
          monitorStatus: existing ? "active" : "new",
          verified: true,
          applicationLink,
          sourceLink: applicationLink,
          requiredQualifications: summarizeQualifications(content, [
            "Official Workday posting should be reviewed before final tailoring.",
          ]),
          preferredQualifications: summarizeQualifications(content, [
            "Game/community/content/analytics proof improves fit for this lane.",
          ]).slice(0, 3),
          fitScore,
          fitReason: fitReasonFor(roleTrack, fitScore),
          blockersRisks: risksFor({ ...job, content }, location, type),
          portfolioMaterials: portfolioMaterialsFor(roleTrack, title),
          dateFirstFound: existing?.dateFirstFound ?? context.checkedDate,
          lastCheckedDate: context.checkedDate,
          adapterSourceId: source.id,
          publicType: type,
          publicEligibility: content.slice(0, 240) || "Official Workday posting verified; details require source review.",
          sourceFeedLabel: "Workday",
        });
      }

      return normalized;
    },
    async validate(opportunity) {
      const title = String(opportunity.roleTitle);
      const relevant = textIncludesAny(title, TARGET_TITLE_KEYWORDS);
      const official = /^https?:\/\/[^/]+\.myworkdayjobs\.com\//i.test(String(opportunity.applicationLink));

      if (!official) {
        return {
          valid: false,
          reason: "Rejected because the official Workday feed did not provide a valid application link.",
        };
      }

      if (hasHardExcludedTitle(title)) {
        return {
          valid: false,
          reason: "Rejected because the title is senior/technical/legal/art-focused rather than the requested early-career ops/community/content/UX lane.",
        };
      }

      if (hasNonTargetTitle(title)) {
        return {
          valid: false,
          reason: "Rejected because the title is outside the requested game ops/community/content/UX/product/publishing lane.",
        };
      }

      if (!relevant || opportunity.fitScore < 6) {
        return {
          valid: false,
          reason: "Rejected as low-confidence for the requested game operations/community/content/UX lane.",
        };
      }

      return { valid: true };
    },
    async save(opportunities) {
      return { saved: opportunities.length };
    },
  };
}

function createGarenaNuxtAdapter(source) {
  const baseUrl = source.url.replace(/\/$/, "");
  const atsOrigin = source.atsOrigin ?? "https://ats.workatsea.com";

  return {
    key: "garena-nuxt",
    source,
    async fetch(context) {
      const response = await context.fetch(source.url, {
        cache: "no-store",
        headers: monitorHeaders("text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"),
        signal: AbortSignal.timeout(15_000),
      });
      const raw = await response.text();

      if (!response.ok) {
        return {
          ok: false,
          status: response.status === 404 ? "manual_review_required" : "blocked",
          failureReason: blockedReason(response.status),
          raw,
          rawLength: raw.length,
        };
      }

      return {
        ok: true,
        status: "active",
        raw,
        rawLength: raw.length,
      };
    },
    async parse(result) {
      if (!result.ok) return [];
      const state = parseNuxtState(result.raw);
      const jobs = state?.state?.Job?.jobList;

      return Array.isArray(jobs) ? jobs : [];
    },
    async normalize(records, context) {
      const normalized = [];

      for (const job of records) {
        const title = String(job.title ?? "Untitled role").trim();
        const location = garenaTagText(job, "location") || "Location not listed";
        const category = garenaTagText(job, "jobCategory");
        const jobType = garenaTagText(job, "jobType");
        const detail = await fetchGarenaDetail({ baseUrl, job, context });
        const content = stripHtml([
          title,
          location,
          category,
          jobType,
          job.description,
          detail.description,
          detail.jobDescription,
          detail.jobRequirements,
        ].join(" "));
        const roleTrack = inferRoleTrack(`${title} ${category}`, content);
        const fitScore = inferFitScore(`${title} ${category} ${jobType}`, content, location);
        const type = garenaOpportunityType(title, jobType);
        const sourceLink = `${baseUrl}/${encodeURIComponent(String(job.id ?? ""))}`;
        const applicationLink = `${atsOrigin.replace(/\/$/, "")}/apply/${encodeURIComponent(String(job.id ?? ""))}`;

        if (!job.id) continue;

        const existing = findExistingMonitor(context.monitor, {
          applicationLink,
          company: source.company,
          roleTitle: title,
          location,
        });
        const opportunityId =
          existing?.opportunityId ??
          `official-game-${slugify(`${source.company}-${title}-${location}-${job.id}`)}`;

        normalized.push({
          opportunityId,
          company: source.company,
          roleTitle: title,
          location,
          locationMode: inferLocationMode(location),
          roleTrack,
          monitorStatus: existing ? "active" : "new",
          verified: true,
          applicationLink,
          sourceLink,
          requiredQualifications: summarizeQualifications(content, [
            "Official Garena posting should be reviewed before final tailoring.",
          ]),
          preferredQualifications: summarizeQualifications(content, [
            "Game/community/content/analytics proof improves fit for this lane.",
          ]).slice(0, 3),
          fitScore,
          fitReason: fitReasonFor(roleTrack, fitScore),
          blockersRisks: risksFor({ ...job, content }, location, type),
          portfolioMaterials: portfolioMaterialsFor(roleTrack, title),
          dateFirstFound: existing?.dateFirstFound ?? context.checkedDate,
          lastCheckedDate: context.checkedDate,
          adapterSourceId: source.id,
          publicType: type,
          publicEligibility: content.slice(0, 240) || "Official Garena posting verified; details require source review.",
          sourceCategory: category,
          sourceJobType: jobType,
          sourceFeedLabel: "Garena",
        });
      }

      return normalized;
    },
    async validate(opportunity) {
      const title = String(opportunity.roleTitle);
      const category = String(opportunity.sourceCategory ?? "");
      const jobType = String(opportunity.sourceJobType ?? "");
      const relevanceText = `${title} ${category} ${jobType} ${opportunity.publicEligibility ?? ""}`;
      const officialApplication = /^https:\/\/ats\.workatsea\.com\/apply\/J\d+/i.test(
        String(opportunity.applicationLink),
      );
      const officialSource = /^https:\/\/careers\.garena\.com\/global\/careers\/J\d+/i.test(
        String(opportunity.sourceLink),
      );
      const relevant =
        textIncludesAny(relevanceText, TARGET_TITLE_KEYWORDS) ||
        textIncludesAny(category, ["game operations", "marketing", "esports", "strategy", "business intelligence", "product management"]) ||
        textIncludesAny(jobType, ["internship", "entry level"]);

      if (!officialApplication || !officialSource) {
        return {
          valid: false,
          reason: "Rejected because the official Garena source did not provide verifiable official application and source routes.",
        };
      }

      if (hasHardExcludedTitle(title) || hasNonTargetTitle(title)) {
        return {
          valid: false,
          reason: "Rejected because the title is technical/HR/legal or outside the requested game ops/community/content/UX/product/publishing lane.",
        };
      }

      if (!relevant || opportunity.fitScore < 6) {
        return {
          valid: false,
          reason: "Rejected as low-confidence for the requested game operations/community/content/UX lane.",
        };
      }

      return { valid: true };
    },
    async save(opportunities) {
      return { saved: opportunities.length };
    },
  };
}

function parseNuxtState(html) {
  const match = String(html).match(/<script>window\.__NUXT__=([\s\S]*?)<\/script>/);
  if (!match) return null;

  const context = { window: {} };
  vm.runInNewContext(`window.__NUXT__=${match[1]}`, context, {
    timeout: 1_000,
    contextCodeGeneration: { strings: false, wasm: false },
  });

  return context.window.__NUXT__ ?? null;
}

function garenaTagText(job, key) {
  const value = job?.tags?.[key];
  return Array.isArray(value) ? value.filter(Boolean).join(", ") : String(value ?? "").trim();
}

function garenaOpportunityType(title, jobType) {
  const text = `${title} ${jobType}`.toLowerCase();
  if (text.includes("intern")) return "internship";
  if (text.includes("trainee") || text.includes("development program")) return "training-program";
  if (text.includes("freelance") || text.includes("contract")) return "part-time";
  if (text.includes("entry level")) return "full-time";
  return inferOpportunityType(title);
}

async function fetchGarenaDetail({ baseUrl, job, context }) {
  if (!job.id || hasHardExcludedTitle(String(job.title ?? "")) || hasNonTargetTitle(String(job.title ?? ""))) {
    return {};
  }

  try {
    const response = await context.fetch(`${baseUrl}/${encodeURIComponent(String(job.id))}`, {
      cache: "no-store",
      headers: monitorHeaders("text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"),
      signal: AbortSignal.timeout(8_000),
    });

    if (!response.ok) return {};

    const state = parseNuxtState(await response.text());
    return state?.state?.Job?.jobDetail ?? {};
  } catch {
    return {};
  }
}

function workdayConfigFromSource(source) {
  const url = new URL(source.url);
  const siteId = source.siteId ?? url.pathname.split("/").filter(Boolean)[0];

  if (!siteId) {
    throw new Error(`Workday source ${source.id} needs a siteId.`);
  }

  return {
    origin: url.origin,
    tenant: source.tenant ?? url.hostname.split(".")[0],
    siteId,
  };
}

function workdayLocation(job) {
  if (job.locationsText) return String(job.locationsText).trim();

  const locationField = Array.isArray(job.bulletFields)
    ? job.bulletFields.find((field) => /location/i.test(String(field.name ?? "")))
    : undefined;

  return String(locationField?.text ?? "Location not listed").trim();
}

function workdayApplicationLink(config, job) {
  const externalPath = String(job.externalPath ?? "").trim();
  if (!externalPath) return "";
  if (/^https?:\/\//i.test(externalPath)) return externalPath;
  const normalizedPath = externalPath.startsWith("/") ? externalPath : `/${externalPath}`;
  return `${config.origin}/${config.siteId}${normalizedPath}`;
}

function workdayDetailApiUrl(config, job) {
  const externalPath = String(job.externalPath ?? "").trim();
  if (!externalPath || /^https?:\/\//i.test(externalPath)) return "";
  const normalizedPath = externalPath.startsWith("/") ? externalPath : `/${externalPath}`;
  return `${config.origin}/wday/cxs/${config.tenant}/${config.siteId}${normalizedPath}`;
}

function workdayListContent(job) {
  const fields = Array.isArray(job.bulletFields)
    ? job.bulletFields.map((field) => `${field.name ?? ""}: ${field.text ?? ""}`)
    : [];

  return stripHtml([
    job.title,
    job.locationsText,
    job.postedOn,
    job.timeType,
    job.jobType,
    ...fields,
  ].join(" "));
}

async function fetchWorkdayDetail({ config, job, context }) {
  const detailUrl = workdayDetailApiUrl(config, job);
  if (!detailUrl) return "";

  try {
    const response = await context.fetch(detailUrl, {
      cache: "no-store",
      headers: monitorHeaders(),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) return "";

    const payload = await response.json();
    const info = payload.jobPostingInfo ?? payload;

    return stripHtml([
      info.title,
      info.jobDescription,
      info.jobDescriptionSummary,
      info.qualifications,
      info.location,
      info.additionalLocations,
      info.timeType,
      info.jobReqId,
    ].join(" "));
  } catch {
    return "";
  }
}

function findExistingMonitor(monitor, incoming) {
  const incomingKey = normalizedKey(incoming.company, incoming.roleTitle, incoming.location);

  return monitor.opportunities.find((opportunity) => {
    if (opportunity.applicationLink === incoming.applicationLink) return true;
    return normalizedKey(opportunity.company, opportunity.roleTitle, opportunity.location) === incomingKey;
  });
}

function publicOpportunityFromMonitor(monitorRecord, checkedAt) {
  return {
    id: monitorRecord.opportunityId,
    title: monitorRecord.roleTitle,
    organization: monitorRecord.company,
    section: "game",
    type: monitorRecord.publicType ?? "full-time",
    status: monitorRecord.monitorStatus === "closed" ? "closed" : "open",
    sourceId: `game-monitor-${monitorRecord.adapterSourceId ?? "official"}`,
    sourceName: "Game Monitor Official Adapter",
    url: monitorRecord.applicationLink,
    location: monitorRecord.location,
    deadline: "Rolling / official posting open",
    compensation: "TBD",
    eligibility: monitorRecord.publicEligibility ?? monitorRecord.requiredQualifications.join(" "),
    discoveredAt: `${monitorRecord.dateFirstFound}T19:00:00-07:00`,
    updatedAt: checkedAt,
    confidence: {
      source: 0.96,
      extraction: 0.82,
      freshness: monitorRecord.monitorStatus === "closed" ? 0.4 : 0.9,
      duplicateProbability: 0.05,
    },
    evidence: [
      `Verified official application route: ${monitorRecord.applicationLink}`,
      `Game monitor fit score ${monitorRecord.fitScore}/10; last checked ${monitorRecord.lastCheckedDate}.`,
    ],
    needsReview: false,
  };
}

function mergeMonitorOpportunity(existing, incoming) {
  const persistedStatus = existing?.monitorStatus;
  const nextStatus =
    persistedStatus === "urgent" && incoming.monitorStatus === "active"
      ? "urgent"
      : existing?.opportunityId?.startsWith("official-game-") && existing?.dateFirstFound === incoming.lastCheckedDate
        ? "new"
        : incoming.monitorStatus;

  return {
    ...existing,
    ...incoming,
    monitorStatus: nextStatus,
    dateFirstFound: existing?.dateFirstFound ?? incoming.dateFirstFound,
  };
}

function mergePublicOpportunity(existing, incoming) {
  return {
    ...existing,
    ...incoming,
    discoveredAt: existing?.discoveredAt ?? incoming.discoveredAt,
  };
}

function markClosedMissingOfficialRoles(current, openUrls, checkedDate, successfulSourceIds) {
  return current.map((opportunity) => {
    const isAdapterOwned = opportunity.verified && opportunity.opportunityId?.startsWith("official-game-");
    const sourceWasParsed = opportunity.adapterSourceId && successfulSourceIds.has(opportunity.adapterSourceId);

    if (!isAdapterOwned || !sourceWasParsed || openUrls.has(opportunity.applicationLink)) {
      return opportunity;
    }

    return {
      ...opportunity,
      monitorStatus: "closed",
      lastCheckedDate: checkedDate,
      blockersRisks: Array.from(
        new Set([
          ...(opportunity.blockersRisks ?? []),
          "Official application route was not present in the latest adapter run.",
        ]),
      ),
    };
  });
}

function createAdapters(sources) {
  return sources
    .filter(
      (source) =>
        source.adapterKey === "greenhouse" ||
        source.adapterKey === "ashby" ||
        source.adapterKey === "workday" ||
        source.adapterKey === "garena-nuxt" ||
        source.boardToken,
    )
    .map((source) => {
      if (source.adapterKey === "ashby") return createAshbyAdapter(source);
      if (source.adapterKey === "workday") return createWorkdayAdapter(source);
      if (source.adapterKey === "garena-nuxt") return createGarenaNuxtAdapter(source);
      return createGreenhouseAdapter(source);
    });
}

/**
 * @typedef {Object} GameMonitorRunOptions
 * @property {Record<string, any>} monitor
 * @property {Record<string, any>=} liveData
 * @property {string=} checkedAt
 * @property {typeof fetch=} fetchImpl
 */

/**
 * @param {GameMonitorRunOptions} options
 */
export async function runGameMonitor({
  monitor,
  liveData,
  checkedAt = new Date().toISOString(),
  fetchImpl = fetch,
} = {}) {
  if (!monitor) {
    throw new Error("runGameMonitor requires monitor data.");
  }

  const checkedDate = pacificDate(new Date(checkedAt));
  const adapters = createAdapters(monitor.sources);
  const nextSourcesById = new Map(monitor.sources.map((source) => [source.id, { ...source }]));
  const nextMonitorById = new Map(monitor.opportunities.map((opportunity) => [opportunity.opportunityId, opportunity]));
  const liveOpportunities = Array.isArray(liveData?.opportunities) ? liveData.opportunities : [];
  const nextPublicById = new Map(liveOpportunities.map((opportunity) => [opportunity.id, opportunity]));
  const openOfficialUrls = new Set();
  const adapterSourceIds = new Set(adapters.map((adapter) => adapter.source.id));
  const successfulSourceIds = new Set();
  const changes = [];
  const adapterResults = [];

  for (const source of monitor.sources) {
    if (adapterSourceIds.has(source.id)) continue;

    const checkedSource = await checkManualSource(source, fetchImpl, checkedAt);
    nextSourcesById.set(source.id, checkedSource);
    adapterResults.push({
      sourceId: source.id,
      status: checkedSource.status,
      failureReason: checkedSource.failureReason,
      recordsSeen: 0,
      recordsSaved: 0,
    });
  }

  for (const adapter of adapters) {
    const source = adapter.source;
    const result = await adapter.fetch({ fetch: fetchImpl, checkedAt, checkedDate, monitor });
    const sourceStatus = {
      ...source,
      lastAttemptAt: checkedAt,
      status: result.status,
      failureReason: result.failureReason,
    };
    nextSourcesById.set(source.id, sourceStatus);

    if (!result.ok) {
      adapterResults.push({
        sourceId: source.id,
        status: result.status,
        failureReason: result.failureReason,
        recordsSeen: 0,
        recordsSaved: 0,
      });
      continue;
    }

    const parsed = await adapter.parse(result);
    successfulSourceIds.add(source.id);
    const normalized = await adapter.normalize(parsed, { checkedAt, checkedDate, monitor, fetch: fetchImpl });
    const valid = [];

    for (const opportunity of normalized) {
      const validation = await adapter.validate(opportunity);

      if (!validation.valid) {
        continue;
      }

      valid.push(opportunity);
      openOfficialUrls.add(opportunity.applicationLink);
      const existing = nextMonitorById.get(opportunity.opportunityId);
      const merged = mergeMonitorOpportunity(existing, opportunity);
      const publicOpportunity = publicOpportunityFromMonitor(merged, checkedAt);
      const existingPublic = nextPublicById.get(publicOpportunity.id);

      nextMonitorById.set(merged.opportunityId, stripInternalMonitorFields(merged));
      nextPublicById.set(publicOpportunity.id, mergePublicOpportunity(existingPublic, publicOpportunity));

      if (!existing) {
        changes.push({
          kind: "new",
          label: `${merged.company}: ${merged.roleTitle}`,
          detail: `Verified official application route added with fit score ${merged.fitScore}/10.`,
        });
      } else if (existing.monitorStatus === "closed") {
        changes.push({
          kind: "status",
          label: `${merged.company}: ${merged.roleTitle}`,
          detail: "Official route is visible again; status returned to active.",
        });
      }
    }

    await adapter.save(valid);
    adapterResults.push({
      sourceId: source.id,
      status: "active",
      recordsSeen: parsed.length,
      recordsSaved: valid.length,
    });
  }

  const closedAwareMonitor = markClosedMissingOfficialRoles(
    Array.from(nextMonitorById.values()),
    openOfficialUrls,
    checkedDate,
    successfulSourceIds,
  );

  for (const opportunity of closedAwareMonitor) {
    const publicOpportunity = nextPublicById.get(opportunity.opportunityId);
    if (publicOpportunity) {
      if (opportunity.opportunityId.startsWith("official-game-") && opportunity.monitorStatus === "closed") {
        nextPublicById.delete(publicOpportunity.id);
        continue;
      }

      nextPublicById.set(publicOpportunity.id, {
        ...publicOpportunity,
        status: opportunity.monitorStatus === "closed" ? "closed" : publicOpportunity.status,
        updatedAt: checkedAt,
      });
    }
  }

  const activeMonitorIds = new Set(
    closedAwareMonitor
      .filter((opportunity) => opportunity.monitorStatus !== "closed")
      .map((opportunity) => opportunity.opportunityId),
  );

  for (const id of nextPublicById.keys()) {
    if (String(id).startsWith("official-game-") && !activeMonitorIds.has(id)) {
      nextPublicById.delete(id);
    }
  }

  const nextOpportunities = dedupeMonitor(closedAwareMonitor);
  const newRolesFound = changes.filter((change) => change.kind === "new").length;
  const stillOpen = nextOpportunities.filter((item) => item.monitorStatus === "active" || item.monitorStatus === "urgent" || item.monitorStatus === "new").length;
  const urgent = nextOpportunities.filter((item) => item.monitorStatus === "urgent").length;
  const closed = nextOpportunities.filter((item) => item.monitorStatus === "closed").length;
  const bestFit = nextOpportunities
    .filter((item) => item.monitorStatus !== "closed")
    .sort((a, b) => b.fitScore - a.fitScore)[0];

  const nextMonitor = {
    ...monitor,
    updatedAt: checkedAt,
    dailyBrief: {
      ...monitor.dailyBrief,
      date: checkedDate,
      summary:
        adapters.length > 0
          ? "Daily game monitor parsed official adapter feeds, updated verified roles, and preserved blocked/manual-review sources without fabricating missing data."
          : "Daily game monitor found no configured parse adapters; source status can still be reviewed manually.",
      newRolesFound,
      stillOpen,
      urgent,
      closed,
      bestFitOpportunityId: bestFit?.opportunityId ?? monitor.dailyBrief.bestFitOpportunityId,
      changes:
        changes.length > 0
          ? changes.slice(0, 8)
          : [
              {
                kind: "source-check",
                label: "Official adapter run",
                detail: "No new verified roles were found. Existing verified roles were refreshed from official source state.",
              },
            ],
    },
    sources: monitor.sources.map((source) => nextSourcesById.get(source.id) ?? source),
    opportunities: nextOpportunities,
  };

  const nextLiveData = liveData
    ? {
        ...liveData,
        updatedAt: checkedAt,
        opportunities: Array.from(nextPublicById.values()),
      }
    : undefined;

  return {
    monitor: nextMonitor,
    liveData: nextLiveData,
    adapterResults,
    changed: JSON.stringify(monitor) !== JSON.stringify(nextMonitor),
  };
}

function stripInternalMonitorFields(opportunity) {
  const publicRecord = { ...opportunity };
  delete publicRecord.publicType;
  delete publicRecord.publicEligibility;
  delete publicRecord.sourceFeedLabel;
  return publicRecord;
}

function dedupeMonitor(opportunities) {
  const byKey = new Map();

  for (const opportunity of opportunities) {
    const key = normalizedKey(opportunity.company, opportunity.roleTitle, opportunity.location);
    const previous = byKey.get(key);

    if (!previous || opportunity.lastCheckedDate >= previous.lastCheckedDate) {
      byKey.set(key, opportunity);
    }
  }

  return Array.from(byKey.values()).sort((a, b) => {
    if (a.monitorStatus === "closed" && b.monitorStatus !== "closed") return 1;
    if (b.monitorStatus === "closed" && a.monitorStatus !== "closed") return -1;
    return b.fitScore - a.fitScore || a.company.localeCompare(b.company);
  });
}
