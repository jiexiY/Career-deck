import gameMonitor from "./game-monitor.json";

export type GameLocationMode = "remote" | "hybrid_unknown" | "hybrid" | "in_person";
export type GameMonitorStatus = "new" | "active" | "urgent" | "closed" | "stale";
export type GameRoleTrack =
  | "game operations"
  | "version/live ops"
  | "product operations"
  | "community operations"
  | "content marketing"
  | "KOL/influencer operations"
  | "user research"
  | "game UX/product planning"
  | "publishing/overseas operations"
  | "early-career game production";

export type GameMonitorOpportunity = {
  opportunityId: string;
  company: string;
  roleTitle: string;
  location: string;
  locationMode: GameLocationMode;
  roleTrack: GameRoleTrack;
  monitorStatus: GameMonitorStatus;
  verified: boolean;
  applicationLink: string;
  sourceLink: string;
  requiredQualifications: string[];
  preferredQualifications: string[];
  fitScore: number;
  fitReason: string;
  blockersRisks: string[];
  portfolioMaterials: string[];
  dateFirstFound: string;
  lastCheckedDate: string;
  adapterSourceId?: string;
};

export type GamePortfolioPrep = {
  id: string;
  title: string;
  why: string;
  artifacts: string[];
  relatedTracks: GameRoleTrack[];
};

export type GameMonitorFilters = {
  company: string;
  locationMode: "all" | GameLocationMode;
  roleTrack: "all" | GameRoleTrack;
  status: "all" | GameMonitorStatus;
  minFit: number;
};

export const defaultGameMonitorFilters: GameMonitorFilters = {
  company: "all",
  locationMode: "all",
  roleTrack: "all",
  status: "all",
  minFit: 0,
};

export const gameMonitorData = gameMonitor;

export const gameMonitorOpportunities = gameMonitor.opportunities as GameMonitorOpportunity[];
export const gamePortfolioPrep = gameMonitor.portfolioPrep as GamePortfolioPrep[];

export const gameMonitorByOpportunityId = new Map(
  gameMonitorOpportunities.map((opportunity) => [opportunity.opportunityId, opportunity]),
);

export function getGameMonitorRecord(opportunityId: string) {
  return gameMonitorByOpportunityId.get(opportunityId);
}

function uniqueSorted<T extends string>(values: T[]) {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

export const gameMonitorFilterOptions = {
  companies: uniqueSorted(gameMonitorOpportunities.map((item) => item.company)),
  locationModes: uniqueSorted(gameMonitorOpportunities.map((item) => item.locationMode)),
  roleTracks: uniqueSorted(gameMonitorOpportunities.map((item) => item.roleTrack)),
  statuses: uniqueSorted(gameMonitorOpportunities.map((item) => item.monitorStatus)),
};

export function matchesGameMonitorFilters(
  monitor: GameMonitorOpportunity | undefined,
  filters: GameMonitorFilters,
) {
  if (!monitor) {
    return (
      filters.company === "all" &&
      filters.locationMode === "all" &&
      filters.roleTrack === "all" &&
      filters.status === "all" &&
      filters.minFit === 0
    );
  }

  return (
    (filters.company === "all" || monitor.company === filters.company) &&
    (filters.locationMode === "all" || monitor.locationMode === filters.locationMode) &&
    (filters.roleTrack === "all" || monitor.roleTrack === filters.roleTrack) &&
    (filters.status === "all" || monitor.monitorStatus === filters.status) &&
    monitor.fitScore >= filters.minFit
  );
}
