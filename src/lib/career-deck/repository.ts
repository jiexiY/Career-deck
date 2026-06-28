import fallbackLiveData from "./live-data.json";
import fallbackLiveUpdate from "./live-update.json";
import fallbackLiveUpdates from "./live-updates.json";
import fallbackConversationSources from "./conversation-sources.json";
import fallbackConversationSnapshots from "./conversation-snapshots.json";
import {
  attempts,
  opportunities,
  report,
  reviewQueue,
  sources,
} from "./seed-imported";
import type {
  DashboardData,
  ConversationSnapshot,
  ConversationSource,
  DailyReport,
  FetchAttempt,
  LiveUpdate,
  Opportunity,
  OpportunitySection,
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

type LiveUpdatesData = {
  updates?: LiveUpdate[];
};

type ConversationSourcesData = {
  sources?: ConversationSource[];
};

type ConversationSnapshotsData = {
  updatedAt?: string | null;
  snapshots?: ConversationSnapshot[];
};

const rawBaseUrl =
  "https://raw.githubusercontent.com/jiexiY/Career-deck/main/src/lib/career-deck";
const liveDataUrl = process.env.CAREER_DECK_LIVE_DATA_URL ?? `${rawBaseUrl}/live-data.json`;
const liveUpdateUrl =
  process.env.CAREER_DECK_LIVE_UPDATE_URL ?? `${rawBaseUrl}/live-update.json`;
const liveUpdatesUrl =
  process.env.CAREER_DECK_LIVE_UPDATES_URL ?? `${rawBaseUrl}/live-updates.json`;
const conversationSourcesUrl =
  process.env.CAREER_DECK_CONVERSATION_SOURCES_URL ??
  `${rawBaseUrl}/conversation-sources.json`;
const conversationSnapshotsUrl =
  process.env.CAREER_DECK_CONVERSATION_SNAPSHOTS_URL ??
  `${rawBaseUrl}/conversation-snapshots.json`;

const opportunityTypes: OpportunityType[] = [
  "internship",
  "co-op",
  "fellowship",
  "student-community",
  "part-time",
  "full-time",
  "hackathon",
  "recruiting-event",
  "conference",
  "training-program",
  "startup",
];

const opportunityStatuses: OpportunityStatus[] = ["open", "changed", "closed", "removed"];
const opportunitySections: OpportunitySection[] = ["tech", "game"];

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

function normalizedSection(value: unknown): OpportunitySection {
  return typeof value === "string" && opportunitySections.includes(value as OpportunitySection)
    ? (value as OpportunitySection)
    : "tech";
}

async function fetchJson<T>(url: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      return fallback;
    }

    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}

function normalizeLiveOpportunity(
  record: LiveOpportunity,
  index: number,
  liveData: LiveData,
): Opportunity {
  const sourceId = record.sourceId ?? "src-live-ingest";
  const updatedAt = record.updatedAt ?? liveData.updatedAt ?? new Date().toISOString();

  return {
    id: record.id ?? `live-${index + 1}`,
    title: record.title ?? "Untitled opportunity",
    organization: record.organization ?? "Unknown organization",
    section: normalizedSection(record.section),
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

function mergeOpportunities(liveOpportunities: Opportunity[]) {
  const byId = new Map<string, Opportunity>(
    opportunities.map((opportunity) => [
      opportunity.id,
      { ...opportunity, section: opportunity.section ?? "tech" },
    ]),
  );

  for (const opportunity of liveOpportunities) {
    byId.set(opportunity.id, {
      ...(byId.get(opportunity.id) ?? {}),
      ...opportunity,
    });
  }

  return Array.from(byId.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function normalizeLiveUpdates(payload: LiveUpdatesData | LiveUpdate[]) {
  const updates = Array.isArray(payload) ? payload : payload.updates;

  return updates?.length
    ? updates
    : [fallbackLiveUpdate as LiveUpdate];
}

function sourceNameFor(sourceId: string, liveRecords: LiveOpportunity[]) {
  return (
    liveRecords.find((record) => record.sourceId === sourceId && record.sourceName)?.sourceName ??
    "Live Ingested Source"
  );
}

function buildLiveSources(liveOpportunities: Opportunity[], liveRecords: LiveOpportunity[]) {
  const liveSourceIds = new Set(liveOpportunities.map((item) => item.sourceId));

  return [...liveSourceIds]
    .filter((sourceId) => !sources.some((source) => source.id === sourceId))
    .map<Source>((sourceId) => ({
      id: sourceId,
      name: sourceNameFor(sourceId, liveRecords),
      homepage: "https://career-deck-amber.vercel.app/api/ingest/opportunities",
      adapterKey: "liveIngestAdapter",
      category: "mixed",
      status: "manual_review_required",
      robotsPolicy: "unknown",
      lastAttemptAt: new Date().toISOString(),
      lastFailureReason:
        "Live-ingested records are accepted only as manual-review candidates until a source adapter verifies them.",
      owner: "platform",
    }));
}

async function getDashboardSnapshot(): Promise<DashboardData> {
  const liveData = await fetchJson<LiveData>(liveDataUrl, fallbackLiveData as LiveData);
  const liveUpdate = await fetchJson<LiveUpdate>(liveUpdateUrl, fallbackLiveUpdate as LiveUpdate);
  const liveUpdatesPayload = await fetchJson<LiveUpdatesData | LiveUpdate[]>(
    liveUpdatesUrl,
    fallbackLiveUpdates as LiveUpdatesData,
  );
  const conversationSourcesPayload = await fetchJson<ConversationSourcesData>(
    conversationSourcesUrl,
    fallbackConversationSources as ConversationSourcesData,
  );
  const conversationSnapshotsPayload = await fetchJson<ConversationSnapshotsData>(
    conversationSnapshotsUrl,
    fallbackConversationSnapshots as ConversationSnapshotsData,
  );
  const liveUpdates = normalizeLiveUpdates(liveUpdatesPayload);
  const liveRecords = liveData.opportunities ?? [];
  const liveOpportunities = liveRecords.map((record, index) =>
    normalizeLiveOpportunity(record, index, liveData),
  );
  const liveSources = buildLiveSources(liveOpportunities, liveRecords);

  return {
    sources: [...sources, ...liveSources],
    attempts,
    opportunities: mergeOpportunities(liveOpportunities),
    reviewQueue,
    report,
    liveUpdate,
    liveUpdates,
    conversationSources: conversationSourcesPayload.sources ?? [],
    conversationSnapshots: conversationSnapshotsPayload.snapshots ?? [],
  };
}

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
    return (await getDashboardSnapshot()).sources;
  }

  async listAttempts() {
    return attempts;
  }

  async listOpportunities() {
    return (await getDashboardSnapshot()).opportunities;
  }

  async listReviewQueue() {
    return reviewQueue;
  }

  async getDailyReport() {
    return report;
  }

  async getDashboardData() {
    return getDashboardSnapshot();
  }
}

let repository: CareerDeckRepository | null = null;

export function getRepository(): CareerDeckRepository {
  repository ??= new SeedRepository();
  return repository;
}

