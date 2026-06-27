import { createAdapterRegistry, makeAttemptFromAdapter } from "./adapters";
import { getRepository } from "./repository";
import type { FetchAttempt, ReviewItem, Source } from "./types";

export interface MonitoringRun {
  attemptedAt: string;
  attempts: FetchAttempt[];
  reviewItems: ReviewItem[];
}

export async function runMonitoringEngine(): Promise<MonitoringRun> {
  const repository = getRepository();
  const registry = createAdapterRegistry();
  const sources = await repository.listSources();
  const attemptedAt = new Date().toISOString();
  const attempts: FetchAttempt[] = [];
  const reviewItems: ReviewItem[] = [];

  for (const source of sources) {
    const adapter = registry.get(source.adapterKey);
    const result = adapter
      ? await adapter.fetch({ source, attemptedAt })
      : {
          ok: false,
          blockedReason: "No adapter registered for source.",
        };

    attempts.push(makeAttemptFromAdapter(source, result, attemptedAt));

    if (!result.ok) {
      reviewItems.push(createManualReviewItem(source, attemptedAt, result.blockedReason));
      continue;
    }

    if (source.status === "manual_review_required") {
      reviewItems.push(
        createManualReviewItem(
          source,
          attemptedAt,
          "Source policy requires reviewer approval before automated save.",
        ),
      );
    }
  }

  return {
    attemptedAt,
    attempts,
    reviewItems,
  };
}

function createManualReviewItem(
  source: Source,
  queuedAt: string,
  reason = "Manual review required.",
): ReviewItem {
  return {
    id: `review-${source.id}-${queuedAt}`,
    sourceId: source.id,
    status: "pending",
    reason,
    queuedAt,
    fields: {},
    attachments: [],
  };
}
