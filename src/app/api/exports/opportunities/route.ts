import { NextResponse } from "next/server";
import { toCsv } from "@/lib/career-deck/exports";
import { getRepository } from "@/lib/career-deck/repository";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const opportunities = await getRepository().listOpportunities();
  const csv = toCsv(opportunities);

  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": "attachment; filename=career-deck-opportunities.csv",
    },
  });
}
