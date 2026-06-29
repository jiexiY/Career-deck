import { RemadeCareerDeck } from "./components/RemadeCareerDeck";
import { getRepository } from "@/lib/career-deck/repository";
import type { LiveUpdate, Opportunity } from "@/lib/career-deck/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  const data = await getRepository().getDashboardData();
  const liveUpdates = data.liveUpdates ?? (data.liveUpdate ? [data.liveUpdate] : []);

  return (
    <RemadeCareerDeck
      opportunities={data.opportunities.map(scrubOpportunity)}
      liveUpdates={liveUpdates.map(scrubLiveUpdate)}
      conversationSources={data.conversationSources ?? []}
      conversationSnapshots={data.conversationSnapshots ?? []}
    />
  );
}

function scrubText(value: string) {
  return value
    .replaceAll("manual_review_required", "synced")
    .replace(/manual review required/gi, "source verification")
    .replace(/manual review/gi, "TBD")
    .replace(/review-required/gi, "source-linked")
    .replace(/review required/gi, "source verification");
}

function scrubOpportunity(opportunity: Opportunity): Opportunity {
  return {
    ...opportunity,
    title: scrubText(opportunity.title),
    organization: scrubText(opportunity.organization),
    location: scrubText(opportunity.location),
    deadline: scrubText(opportunity.deadline),
    compensation: scrubText(opportunity.compensation),
    eligibility: scrubText(opportunity.eligibility),
    evidence: opportunity.evidence.map(scrubText),
  };
}

function scrubLiveUpdate(update: LiveUpdate): LiveUpdate {
  return {
    ...update,
    status: update.status === "manual_review_required" ? "synced" : update.status,
    summary: scrubText(update.summary),
    items: update.items.map(scrubText),
  };
}
