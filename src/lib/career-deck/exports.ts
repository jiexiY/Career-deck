import type { Opportunity } from "./types";

export function toCsv(opportunities: Opportunity[]) {
  const headers = [
    "title",
    "organization",
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
    "needsReview",
    "url",
  ];

  const rows = opportunities.map((opportunity) => [
    opportunity.title,
    opportunity.organization,
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
    opportunity.needsReview,
    opportunity.url,
  ]);

  return [headers, ...rows]
    .map((row) =>
      row
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(","),
    )
    .join("\n");
}
