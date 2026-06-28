import { NextResponse } from "next/server";
import conversationSourcesFile from "@/lib/career-deck/conversation-sources.json";
import { fetchConversationOpportunities } from "@/lib/career-deck/conversation-adapter";
import type { ConversationSource } from "@/lib/career-deck/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const checkedAt = new Date().toISOString();
  const sources = (conversationSourcesFile as { sources: ConversationSource[] }).sources;
  const results = await Promise.all(
    sources.map((source) => fetchConversationOpportunities(source, checkedAt)),
  );
  const opportunities = results.flatMap((result) => result.opportunities);

  return NextResponse.json(
    {
      ok: true,
      checkedAt,
      sources: results.map((result) => ({
        sourceId: result.sourceId,
        status: result.status,
        rawLength: result.rawLength,
        opportunities: result.opportunities.length,
        failureReason: result.failureReason,
      })),
      opportunities,
    },
    {
      headers: {
        "Cache-Control": "s-maxage=60, stale-while-revalidate=120",
      },
    },
  );
}
