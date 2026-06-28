import type { Opportunity } from "./types";

function clean(value: unknown) {
  return String(value)
    .replaceAll("manual_review_required", "synced")
    .replace(/manual review required/gi, "source verification")
    .replace(/manual review/gi, "TBD");
}

export function toCsv(opportunities: Opportunity[]) {
  const headers = [
    "title",
    "organization",
    "section",
    "type",
    "status",
    "location",
    "deadline",
    "compensation",
    "eligibility",
    "sourceConfidence",
    "extractionConfidence",
    "freshnessScore",
    "duplicateProbability",
    "verificationNeeded",
    "url",
  ];

  const rows = opportunities.map((opportunity) => [
    opportunity.title,
    opportunity.organization,
    opportunity.section ?? "tech",
    opportunity.type,
    opportunity.status,
    opportunity.location,
    opportunity.deadline,
    opportunity.compensation,
    opportunity.eligibility,
    opportunity.confidence.source,
    opportunity.confidence.extraction,
    opportunity.confidence.freshness,
    opportunity.confidence.duplicateProbability,
    opportunity.needsReview ? "yes" : "no",
    opportunity.url,
  ]);

  return [headers, ...rows]
    .map((row) =>
      row
        .map((value) => `"${clean(value).replaceAll('"', '""')}"`)
        .join(","),
    )
    .join("\n");
}
