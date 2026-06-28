import liveCareerDeckData from "./live-data.json";
import {
  attempts,
  opportunities,
  report,
  reviewQueue,
  sources,
} from "./seed-imported";
import type {
  DashboardData,
  DailyReport,
  FetchAttempt,
  Opportunity,
  OpportunityStatus,
  OpportunityType,
  ReviewItem,
  Source,
} from "./types";

type LiveOpportunity = Partial<Opportunity> & {
  applicationUrl?: string;
  sourceName?: string;
  sourceUrl?: string;
};

type LiveData = {
  updatedAt?: string | null;
  opportunities?: LiveOpportunity[];
};

const opportunityTypes: OpportunityType[] = [
  "internship",
  "co-op",
  "fellowship",
  "student-community",
  "part-time",
  "full-time",
  "hackathon",
  "conference",
  "startup",
];

const opportunityStatuses: OpportunityStatus[] = ["open", "changed", "closed", "removed"];
const liveData = liveCareerDeckData as LiveData;

function normalizedType(value: unknown): OpportunityType {
  return typeof value === "string" && opportunityTypes.includes(value as OpportunityType)
    ? (value as OpportunityType)
    : "fellowship";
}

function normalizedStatus(value: unknown): OpportunityStatus {
  return typeof value === "string" && opportunityStatuses.includes(value as OpportunityStatus)
    ? (value as OpportunityStatus)
    : "open";
}

function normalizeLiveOpportunity(record: LiveOpportunity, index: number): Opportunity {
  const sourceId = record.sourceId ?? "src-live-ingest";
  const updatedAt = record.updatedAt ?? liveData.updatedAt ?? new Date().toISOString();

  return {
    id: record.id ?? `live-${index + 1}`,
    title: record.title ?? "Untitled opportunity",
    organization: record.organization ?? "Unknown organization",
    type: normalizedType(record.type),
    status: normalizedStatus(record.status),
    sourceId,
    location: record.location ?? "Not listed",
    deadline: record.deadline ?? "Manual review",
    compensation: record.compensation ?? "Manual review",
    eligibility: record.eligibility ?? "Manual review",
    url: record.url ?? record.applicationUrl ?? record.sourceUrl ?? "#",
    discoveredAt: record.discoveredAt ?? updatedAt,
    updatedAt,
    confidence: record.confidence ?? {
      source: 0.62,
      extraction: 0.48,
      freshness: 0.7,
      duplicateProbability: 0.25,
    },
    evidence:
      record.evidence && record.evidence.length
        ? record.evidence
        : ["Live-ingested record; manual source review remains required."],
    needsReview: record.needsReview ?? true,
  };
}

const liveOpportunities = (liveData.opportunities ?? []).map(normalizeLiveOpportunity);
const liveSourceIds = new Set(liveOpportunities.map((item) => item.sourceId));
const liveSources: Source[] = [...liveSourceIds]
  .filter((sourceId) => !sources.some((source) => source.id === sourceId))
  .map((sourceId) => ({
    id: sourceId,
    name: "Live Ingested Source",
    homepage: "https://career-deck-amber.vercel.app/api/ingest/opportunities",
    adapterKey: "liveIngestAdapter",
    category: "mixed",
    status: "manual_review_required",
    robotsPolicy: "unknown",
    lastAttemptAt: liveData.updatedAt ?? new Date().toISOString(),
    lastFailureReason:
      "Live-ingested records are accepted only as manual-review candidates until a source adapter verifies them.",
    owner: "platform",
  }));

const allSources = [...sources, ...liveSources];
const allOpportunities = [...liveOpportunities, ...opportunities];

export interface CareerDeckRepository {
  listSources(): Promise<Source[]>;
  listAttempts(): Promise<FetchAttempt[]>;
  listOpportunities(): Promise<Opportunity[]>;
  listReviewQueue(): Promise<ReviewItem[]>;
  getDailyReport(date: string): Promise<DailyReport>;
  getDashboardData(): Promise<DashboardData>;
}

class SeedRepository implements CareerDeckRepository {
  async listSources() {
    return allSources;
  }

  async listAttempts() {
    return attempts;
  }

  async listOpportunities() {
    return allOpportunities;
  }

  async listReviewQueue() {
    return reviewQueue;
  }

  async getDailyReport() {
    return report;
  }

  async getDashboardData() {
    return {
      sources: allSources,
      attempts,
      opportunities: allOpportunities,
      reviewQueue,
      report,
    };
  }
}

let repository: CareerDeckRepository | null = null;

export function getRepository(): CareerDeckRepository {
  repository ??= new SeedRepository();
  return repository;
}

