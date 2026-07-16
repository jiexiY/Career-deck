export type OpportunityType =
  | "internship"
  | "co-op"
  | "fellowship"
  | "student-community"
  | "part-time"
  | "full-time"
  | "hackathon"
  | "recruiting-event"
  | "conference"
  | "training-program"
  | "startup";

export type SourceStatus =
  | "active"
  | "blocked"
  | "manual_review_required"
  | "paused";

export type AttemptStatus =
  | "success"
  | "blocked"
  | "manual_review_required"
  | "failed";

export type ReviewStatus = "pending" | "approved" | "rejected" | "merged";

export type OpportunityStatus = "open" | "changed" | "closed" | "removed";

export type OpportunitySection = "tech" | "game";

export type ConversationSnapshotStatus =
  | "baseline_pending"
  | "unchanged"
  | "changed"
  | "blocked"
  | "failed";

export interface ConfidenceScores {
  source: number;
  extraction: number;
  freshness: number;
  duplicateProbability: number;
}

export interface Source {
  id: string;
  name: string;
  homepage: string;
  adapterKey: string;
  category: OpportunityType | "mixed";
  status: SourceStatus;
  robotsPolicy: "allowed" | "restricted" | "unknown";
  lastAttemptAt: string;
  lastFailureReason?: string;
  owner: string;
}

export interface FetchAttempt {
  id: string;
  sourceId: string;
  attemptedAt: string;
  status: AttemptStatus;
  reason?: string;
  recordsSeen: number;
  recordsSaved: number;
}

export interface Opportunity {
  id: string;
  title: string;
  organization: string;
  section?: OpportunitySection;
  type: OpportunityType;
  status: OpportunityStatus;
  sourceId: string;
  location: string;
  deadline: string;
  compensation: string;
  eligibility: string;
  url: string;
  discoveredAt: string;
  updatedAt: string;
  confidence: ConfidenceScores;
  evidence: string[];
  needsReview: boolean;
}

export interface ReviewItem {
  id: string;
  opportunityId?: string;
  sourceId: string;
  status: ReviewStatus;
  reason: string;
  queuedAt: string;
  fields: Partial<Opportunity>;
  attachments: Array<{
    id: string;
    kind: "screenshot" | "pdf";
    name: string;
  }>;
  aiExtractionOverride?: string;
  duplicateOf?: string;
}

export interface ReportChange {
  id: string;
  kind:
    | "new"
    | "changed"
    | "removed"
    | "closed"
    | "deadline_updated"
    | "compensation_updated"
    | "eligibility_updated";
  opportunityId: string;
  title: string;
  before?: string;
  after?: string;
}

export interface DailyReport {
  id: string;
  date: string;
  week: string;
  previousReportDate: string;
  previousReportWeek: string;
  generatedFrom: "database";
  changes: ReportChange[];
}

export interface LiveUpdate {
  id: string;
  title: string;
  summary: string;
  section?: OpportunitySection;
  updatedAt: string;
  status: "synced" | "manual_review_required" | "blocked";
  sourceUrl?: string;
  items: string[];
}

export interface ConversationSource {
  id: string;
  name: string;
  section: OpportunitySection;
  url: string;
  status: "active" | "blocked" | "paused";
  description: string;
}

export interface ConversationSnapshot {
  sourceId: string;
  url: string;
  status: ConversationSnapshotStatus;
  lastFetchedAt?: string;
  lastChangedAt?: string;
  rawHash?: string;
  normalizedHash?: string;
  rawLength?: number;
  normalizedLength?: number;
  failureReason?: string;
}

export interface DashboardData {
  sources: Source[];
  attempts: FetchAttempt[];
  opportunities: Opportunity[];
  reviewQueue: ReviewItem[];
  report: DailyReport;
  liveUpdate?: LiveUpdate;
  liveUpdates?: LiveUpdate[];
  conversationSources?: ConversationSource[];
  conversationSnapshots?: ConversationSnapshot[];
}
