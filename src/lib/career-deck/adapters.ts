import type { FetchAttempt, Opportunity, Source } from "./types";

export interface SourceAdapterContext {
  source: Source;
  attemptedAt: string;
}

export interface AdapterFetchResult {
  ok: boolean;
  html?: string;
  blockedReason?: string;
}

export interface AdapterValidationResult {
  valid: boolean;
  confidence: number;
  reason?: string;
}

export interface SourceAdapter {
  key: string;
  fetch(context: SourceAdapterContext): Promise<AdapterFetchResult>;
  parse(result: AdapterFetchResult): Promise<unknown[]>;
  normalize(records: unknown[], context: SourceAdapterContext): Promise<Opportunity[]>;
  validate(opportunity: Opportunity): Promise<AdapterValidationResult>;
  save(opportunities: Opportunity[]): Promise<{ saved: number }>;
}

export class BlockedSourceAdapter implements SourceAdapter {
  constructor(
    public key: string,
    private reason: string,
  ) {}

  async fetch(): Promise<AdapterFetchResult> {
    return {
      ok: false,
      blockedReason: this.reason,
    };
  }

  async parse(): Promise<unknown[]> {
    return [];
  }

  async normalize(): Promise<Opportunity[]> {
    return [];
  }

  async validate(): Promise<AdapterValidationResult> {
    return {
      valid: false,
      confidence: 0,
      reason: this.reason,
    };
  }

  async save() {
    return { saved: 0 };
  }
}

export class FutureHtmlAdapter implements SourceAdapter {
  constructor(public key: string) {}

  async fetch(): Promise<AdapterFetchResult> {
    return { ok: true, html: "" };
  }

  async parse(): Promise<unknown[]> {
    return [];
  }

  async normalize(): Promise<Opportunity[]> {
    return [];
  }

  async validate(): Promise<AdapterValidationResult> {
    return {
      valid: false,
      confidence: 0,
      reason: "Adapter scaffold is installed, but extraction rules are not enabled.",
    };
  }

  async save() {
    return { saved: 0 };
  }
}

export function createAdapterRegistry() {
  return new Map<string, SourceAdapter>([
    ["githubCampusAdapter", new FutureHtmlAdapter("githubCampusAdapter")],
    [
      "ycBatchAdapter",
      new BlockedSourceAdapter(
        "ycBatchAdapter",
        "JavaScript-rendered content requires a reviewed future adapter.",
      ),
    ],
    [
      "linkedInAdapter",
      new BlockedSourceAdapter(
        "linkedInAdapter",
        "Login requirement and platform restrictions prevent compliant scraping.",
      ),
    ],
    ["nsfStudentAdapter", new FutureHtmlAdapter("nsfStudentAdapter")],
    [
      "xAnnouncementsAdapter",
      new BlockedSourceAdapter(
        "xAnnouncementsAdapter",
        "Anti-bot protections and legal restrictions require manual review or approved API access.",
      ),
    ],
  ]);
}

export function makeAttemptFromAdapter(
  source: Source,
  result: AdapterFetchResult,
  attemptedAt: string,
): FetchAttempt {
  return {
    id: `attempt-${source.id}-${attemptedAt}`,
    sourceId: source.id,
    attemptedAt,
    status: result.ok ? "success" : "blocked",
    reason: result.blockedReason,
    recordsSeen: 0,
    recordsSaved: 0,
  };
}
