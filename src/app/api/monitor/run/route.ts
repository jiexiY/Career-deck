import { NextResponse } from "next/server";
import { runMonitoringEngine } from "@/lib/career-deck/monitoring";

export async function POST() {
  const run = await runMonitoringEngine();

  return NextResponse.json({
    generatedFrom: "adapter-registry",
    ...run,
  });
}
