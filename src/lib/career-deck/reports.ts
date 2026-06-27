import { getRepository } from "./repository";
import type { DailyReport } from "./types";

export async function generateDailyReportFromDatabase(date: string): Promise<DailyReport> {
  const repository = getRepository();
  return repository.getDailyReport(date);
}

export function summarizeReport(report: DailyReport) {
  return {
    new: report.changes.filter((change) => change.kind === "new").length,
    changed: report.changes.filter((change) =>
      ["changed", "deadline_updated", "compensation_updated", "eligibility_updated"].includes(
        change.kind,
      ),
    ).length,
    closed: report.changes.filter((change) => change.kind === "closed").length,
    removed: report.changes.filter((change) => change.kind === "removed").length,
  };
}
