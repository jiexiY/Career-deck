import {
  attempts,
  opportunities,
  report,
  reviewQueue,
  sources,
} from "./seed";
import type {
  DashboardData,
  DailyReport,
  FetchAttempt,
  Opportunity,
  ReviewItem,
  Source,
} from "./types";

export interface CareerDeckRepository {
  listSources(): Promise<Source[]>;
  listAttempts(): Promise<FetchAttempt[]>;
  listOpportunities(): Promise<Opportunity[]>;
  listReviewQueue(): Promise<ReviewItem[]>;
  getDailyReport(date: string): Promise<DailyReport>;
  getDashboardData(): Promise<DashboardData>;
}

class SeedRepository implements CareerDeckRepository {
  async listSources() {
    return sources;
  }

  async listAttempts() {
    return attempts;
  }

  async listOpportunities() {
    return opportunities;
  }

  async listReviewQueue() {
    return reviewQueue;
  }

  async getDailyReport() {
    return report;
  }

  async getDashboardData() {
    return {
      sources,
      attempts,
      opportunities,
      reviewQueue,
      report,
    };
  }
}

let repository: CareerDeckRepository | null = null;

export function getRepository(): CareerDeckRepository {
  repository ??= new SeedRepository();
  return repository;
}
