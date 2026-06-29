"use client";

import { ChevronDown, ExternalLink, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type {
  ConversationSnapshot,
  ConversationSource,
  LiveUpdate,
  Opportunity,
  OpportunitySection,
  OpportunityType,
} from "@/lib/career-deck/types";

type CategoryFilter = "all" | OpportunityType;

type LiveConversationResponse = {
  ok?: boolean;
  checkedAt?: string;
  sources?: LiveSourceStatus[];
  opportunities?: Opportunity[];
};

type LiveSourceStatus = {
  sourceId: string;
  status: "success" | "blocked" | "failed";
  rawLength?: number;
  opportunities: number;
  failureReason?: string;
};

const categoryOptions: Array<{ value: CategoryFilter; label: string }> = [
  { value: "all", label: "All categories" },
  { value: "internship", label: "Internships" },
  { value: "student-community", label: "Student programs" },
  { value: "co-op", label: "Co-ops" },
  { value: "hackathon", label: "Hackathons" },
  { value: "recruiting-event", label: "Recruiting events" },
  { value: "conference", label: "Conferences" },
  { value: "fellowship", label: "Fellowships" },
  { value: "training-program", label: "Training programs" },
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "startup", label: "Startups" },
];

export function FigmaCareerDeck({
  opportunities,
  liveUpdates,
  conversationSources,
  conversationSnapshots,
}: {
  opportunities: Opportunity[];
  liveUpdates: LiveUpdate[];
  conversationSources: ConversationSource[];
  conversationSnapshots: ConversationSnapshot[];
}) {
  const [query, setQuery] = useState("");
  const [deckOpportunities, setDeckOpportunities] = useState(opportunities);
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [liveSourceStatuses, setLiveSourceStatuses] = useState<LiveSourceStatus[]>([]);
  const [categories, setCategories] = useState<Record<OpportunitySection, CategoryFilter>>({
    tech: "all",
    game: "all",
  });

  useEffect(() => {
    let cancelled = false;

    async function refreshConversationOpportunities() {
      try {
        const response = await fetch("/api/live/conversation-opportunities", {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as LiveConversationResponse;

        if (!cancelled && Array.isArray(payload.sources)) {
          setLiveSourceStatuses(payload.sources);
        }

        if (!cancelled && Array.isArray(payload.opportunities)) {
          setDeckOpportunities((current) => mergeOpportunities(current, payload.opportunities ?? []));
        }
      } catch {
        // Keep rendering the database snapshot if the viewer-side refresh is unavailable.
      }
    }

    refreshConversationOpportunities();
    const interval = window.setInterval(refreshConversationOpportunities, 30_000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshConversationOpportunities();
      }
    };

    window.addEventListener("focus", refreshConversationOpportunities);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshConversationOpportunities);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const counts = useMemo(
    () => ({
      all: deckOpportunities.length,
      tech: deckOpportunities.filter((item) => (item.section ?? "tech") === "tech").length,
      game: deckOpportunities.filter((item) => item.section === "game").length,
    }),
    [deckOpportunities],
  );

  const normalizedQuery = query.trim().toLowerCase();
  const visibleOpportunities = useMemo(
    () =>
      deckOpportunities.filter((opportunity) => {
        const section = opportunity.section ?? "tech";
        const category = categories[section];
        const matchesCategory = category === "all" || opportunity.type === category;
        const searchable = [
          opportunity.title,
          opportunity.organization,
          opportunity.type,
          opportunity.location,
          opportunity.eligibility,
        ]
          .join(" ")
          .toLowerCase();

        return matchesCategory && (!normalizedQuery || searchable.includes(normalizedQuery));
      }),
    [categories, deckOpportunities, normalizedQuery],
  );

  const initialSelection = selectedOpportunity ?? visibleOpportunities[0] ?? null;

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f3e5f5] text-black">
      <div className="min-h-screen bg-[radial-gradient(circle_at_0%_0%,rgba(193,139,202,0.95)_0%,rgba(218,184,224,0.84)_48%,rgba(243,229,245,0.95)_100%)] px-5 pb-28 pt-10 sm:px-8 lg:px-12">
        <header className="mx-auto flex max-w-[1440px] flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <h1 className="font-sans text-6xl font-thin leading-none tracking-normal sm:text-7xl lg:text-8xl">
            Career Deck
          </h1>

          <label className="relative w-full max-w-[440px]">
            <span className="sr-only">Search career deck</span>
            <Search
              size={18}
              className="absolute left-5 top-1/2 -translate-y-1/2 text-black/55"
              aria-hidden="true"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search roles, companies, programs"
              className="h-12 w-full rounded-full border border-white/60 bg-white/20 pl-12 pr-5 text-sm text-black outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_18px_55px_rgba(101,36,112,0.14)] backdrop-blur-2xl placeholder:text-black/48 focus:border-white"
            />
          </label>
        </header>

        <section className="mx-auto mt-8 grid max-w-[1368px] gap-5 md:grid-cols-2 xl:grid-cols-3">
          {visibleOpportunities.length ? (
            visibleOpportunities.map((opportunity) => (
              <GlassOpportunityCard
                key={opportunity.id}
                opportunity={opportunity}
                onSelect={() => setSelectedOpportunity(opportunity)}
              />
            ))
          ) : (
            <div className="rounded-[29px] border border-white/55 bg-white/18 p-8 text-center text-lg shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_28px_90px_rgba(101,36,112,0.12)] backdrop-blur-2xl xl:col-span-3">
              No records match the selected filters.
            </div>
          )}
        </section>

        <DeckStatusBar
          categories={categories}
          counts={counts}
          liveUpdates={liveUpdates}
          liveSourceStatuses={liveSourceStatuses}
          onCategoryChange={(section, value) =>
            setCategories((current) => ({ ...current, [section]: value }))
          }
        />

        {initialSelection && (
          <DetailOverlay
            opportunity={initialSelection}
            conversationSources={conversationSources}
            conversationSnapshots={conversationSnapshots}
            liveSourceStatuses={liveSourceStatuses}
            onClose={() => setSelectedOpportunity(null)}
            visible={Boolean(selectedOpportunity)}
          />
        )}
      </div>
    </main>
  );
}

function GlassOpportunityCard({
  opportunity,
  onSelect,
}: {
  opportunity: Opportunity;
  onSelect: () => void;
}) {
  const priority = isPriority(opportunity);
  const rating = fitnessRating(opportunity);

  return (
    <article className="relative min-h-[250px] rounded-[29px] border border-white/45 bg-white/20 px-5 pb-4 pt-7 shadow-[inset_0_1px_0_rgba(255,255,255,0.62),0_28px_70px_rgba(92,38,105,0.12)] backdrop-blur-2xl transition duration-200 hover:-translate-y-1 hover:bg-white/28">
      <span
        className={`absolute left-[-24px] top-8 rounded-full px-5 py-1 text-sm font-medium text-white shadow-[0_12px_30px_rgba(103,0,130,0.22)] ${
          priority ? "bg-[#a100c6]" : "bg-[#d774dc]"
        }`}
      >
        {priority ? "Priority" : "Standard"}
      </span>

      <button
        type="button"
        onClick={onSelect}
        className="grid h-full w-full text-center outline-none focus-visible:ring-2 focus-visible:ring-[#8f00b8]"
      >
        <span className="text-base font-semibold">
          {formatOpportunityType(opportunity.type)} {opportunity.title}
        </span>
        <span className="mt-1 block text-2xl font-thin leading-tight">{opportunity.organization}</span>

        <span className="mt-4 grid grid-cols-2 gap-3">
          <span className="flex min-h-[130px] items-center justify-center rounded-[27px] border border-white/45 bg-white/18 px-4 text-sm font-semibold leading-tight shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
            {conciseSummary(opportunity)}
          </span>
          <span className="flex min-h-[130px] flex-col items-center justify-center gap-3 rounded-[27px] border border-white/45 bg-white/18 px-4 text-sm font-semibold leading-tight shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
            My fitness rating
            <FitnessDots rating={rating} compact />
          </span>
        </span>

        <span className="mt-4 block text-sm font-semibold">
          {formatDateLabel(opportunity.discoveredAt)} - {deadlineLabel(opportunity.deadline)}
        </span>
      </button>
    </article>
  );
}

function DetailOverlay({
  opportunity,
  conversationSources,
  conversationSnapshots,
  liveSourceStatuses,
  onClose,
  visible,
}: {
  opportunity: Opportunity;
  conversationSources: ConversationSource[];
  conversationSnapshots: ConversationSnapshot[];
  liveSourceStatuses: LiveSourceStatus[];
  onClose: () => void;
  visible: boolean;
}) {
  if (!visible) {
    return null;
  }

  const source = conversationSources.find((item) => item.id === opportunity.sourceId);
  const snapshot = conversationSnapshots.find((item) => item.sourceId === opportunity.sourceId);
  const liveSource = liveSourceStatuses.find((item) => item.sourceId === opportunity.sourceId);

  return (
    <section
      className="fixed inset-0 z-40 overflow-y-auto bg-[#f3e5f5]/35 px-4 py-8 backdrop-blur-sm"
      aria-label={`${opportunity.title} details`}
    >
      <div className="mx-auto min-h-[calc(100vh-4rem)] max-w-[1440px] rounded-[120px] border border-white/45 bg-white/18 p-7 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_30px_120px_rgba(96,0,118,0.18)] backdrop-blur-2xl md:p-12 lg:p-16">
        <div className="grid gap-8 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_430px]">
          <div>
            <div className="flex flex-wrap items-center justify-center gap-4 text-center">
              <span
                className={`rounded-full px-8 py-2 text-xl font-medium text-white ${
                  isPriority(opportunity) ? "bg-[#7b00a7]" : "bg-[#d774dc]"
                }`}
              >
                {isPriority(opportunity) ? "Priority" : "Standard"}
              </span>
              <div>
                <h2 className="text-2xl font-semibold md:text-3xl">
                  {formatOpportunityType(opportunity.type)} {opportunity.title}
                </h2>
                <p className="mt-1 text-4xl font-thin">{opportunity.organization}</p>
              </div>
            </div>

            <div className="mt-8 flex min-h-[410px] items-center justify-center rounded-[37px] border border-white/45 bg-white/18 px-7 py-8 text-center text-2xl font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
              <div className="grid max-w-2xl gap-5">
                <p>{detailSummary(opportunity)}</p>
                <div className="grid gap-3 text-base font-medium text-black/70 sm:grid-cols-2">
                  <DetailPill label="Compensation" value={opportunity.compensation} />
                  <DetailPill label="Eligibility" value={opportunity.eligibility} />
                  <DetailPill label="Location" value={opportunity.location} />
                  <DetailPill label="Deadline" value={opportunity.deadline} />
                </div>
              </div>
            </div>
          </div>

          <aside className="flex flex-col items-center justify-center gap-7 text-center">
            <button
              type="button"
              onClick={onClose}
              className="self-end rounded-full border border-white/55 bg-white/22 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_12px_35px_rgba(96,0,118,0.12)] backdrop-blur-2xl"
              aria-label="Close details"
            >
              <X size={28} aria-hidden="true" />
            </button>

            <div>
              <p className="text-3xl font-semibold">My fitness rate</p>
              <div className="mt-8">
                <FitnessMatrix rating={fitnessRating(opportunity)} />
              </div>
            </div>

            <div className="grid w-full gap-3 text-sm font-medium text-black/70">
              <SourceLine label="Source" value={source?.name ?? opportunity.sourceId} />
              <SourceLine label="Fetch" value={sourceStatus(snapshot, liveSource)} />
              <SourceLine label="Confidence" value={`${Math.round(opportunity.confidence.source * 100)}% source`} />
            </div>

            <a
              href={opportunity.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#7b00a7] px-7 text-sm font-semibold text-white shadow-[0_14px_38px_rgba(103,0,130,0.28)]"
            >
              Open opportunity
              <ExternalLink size={16} aria-hidden="true" />
            </a>
          </aside>
        </div>
      </div>
    </section>
  );
}

function DeckStatusBar({
  categories,
  counts,
  liveUpdates,
  liveSourceStatuses,
  onCategoryChange,
}: {
  categories: Record<OpportunitySection, CategoryFilter>;
  counts: { all: number; tech: number; game: number };
  liveUpdates: LiveUpdate[];
  liveSourceStatuses: LiveSourceStatus[];
  onCategoryChange: (section: OpportunitySection, value: CategoryFilter) => void;
}) {
  return (
    <div className="fixed bottom-5 left-1/2 z-30 w-[calc(100%-2rem)] max-w-[1260px] -translate-x-1/2 rounded-full border border-white/60 bg-white/24 px-5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_18px_55px_rgba(96,0,118,0.14)] backdrop-blur-2xl">
      <div className="grid items-center gap-3 text-center text-sm font-semibold sm:grid-cols-2 lg:grid-cols-4">
        <span>Total records {counts.all}</span>
        <CategorySelect
          label={`Game category (${counts.game})`}
          value={categories.game}
          onChange={(value) => onCategoryChange("game", value)}
        />
        <CategorySelect
          label={`Tech category (${counts.tech})`}
          value={categories.tech}
          onChange={(value) => onCategoryChange("tech", value)}
        />
        <span title={liveExtractionLabel(liveSourceStatuses)}>
          Last sync {latestSync(liveUpdates)}
        </span>
      </div>
    </div>
  );
}

function CategorySelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: CategoryFilter;
  onChange: (value: CategoryFilter) => void;
}) {
  return (
    <label className="relative block">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as CategoryFilter)}
        className="h-9 w-full appearance-none rounded-full border border-white/40 bg-white/20 px-4 pr-9 text-center font-semibold text-black outline-none backdrop-blur-2xl"
      >
        {categoryOptions.map((item) => (
          <option key={item.value} value={item.value}>
            {label.split(" ")[0]} {item.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={15}
        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2"
        aria-hidden="true"
      />
    </label>
  );
}

function FitnessDots({ rating, compact = false }: { rating: number; compact?: boolean }) {
  return (
    <span className="flex justify-center gap-1.5">
      {[1, 2, 3, 4, 5].map((item) => (
        <span
          key={item}
          className={`${compact ? "h-3 w-3" : "h-8 w-8"} rounded-full ${
            item <= rating ? "bg-[#9e00b8]" : "bg-[#d8a2dc]"
          }`}
        />
      ))}
    </span>
  );
}

function FitnessMatrix({ rating }: { rating: number }) {
  return (
    <div className="grid gap-5">
      {[0, 1, 2, 3, 4].map((row) => (
        <FitnessDots key={row} rating={Math.max(1, Math.min(5, rating + row - 2))} />
      ))}
    </div>
  );
}

function DetailPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-white/45 bg-white/18 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]">
      <p className="text-xs uppercase text-black/48">{label}</p>
      <p className="mt-1 leading-6">{value}</p>
    </div>
  );
}

function SourceLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-full border border-white/45 bg-white/16 px-5 py-3">
      <span className="text-black/50">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function isPriority(opportunity: Opportunity) {
  return opportunity.confidence.source >= 0.8 && opportunity.confidence.freshness >= 0.65;
}

function fitnessRating(opportunity: Opportunity) {
  const score =
    opportunity.confidence.source * 0.35 +
    opportunity.confidence.extraction * 0.25 +
    opportunity.confidence.freshness * 0.25 +
    (1 - opportunity.confidence.duplicateProbability) * 0.15;

  return Math.max(1, Math.min(5, Math.round(score * 5)));
}

function conciseSummary(opportunity: Opportunity) {
  if (opportunity.eligibility && opportunity.eligibility !== "TBD") {
    return clampText(opportunity.eligibility, 72);
  }

  if (opportunity.evidence[0]) {
    return clampText(opportunity.evidence[0], 72);
  }

  return `${formatOpportunityType(opportunity.type)} opportunity`;
}

function detailSummary(opportunity: Opportunity) {
  const evidence = opportunity.evidence.filter(Boolean).join(" ");

  if (evidence) {
    return clampText(evidence, 260);
  }

  return `${opportunity.organization} ${formatOpportunityType(opportunity.type)} record synced from ${opportunity.sourceId}.`;
}

function clampText(value: string, limit: number) {
  return value.length > limit ? `${value.slice(0, limit - 1).trim()}...` : value;
}

function deadlineLabel(value: string) {
  return value && value !== "TBD" ? value : "deadline TBD";
}

function formatDateLabel(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "release date TBD";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function mergeOpportunities(current: Opportunity[], incoming: Opportunity[]) {
  const byId = new Map(current.map((opportunity) => [opportunity.id, opportunity]));

  for (const opportunity of incoming) {
    byId.set(opportunity.id, {
      ...(byId.get(opportunity.id) ?? {}),
      ...opportunity,
    });
  }

  return Array.from(byId.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function latestSync(updates: LiveUpdate[]) {
  const latest = updates
    .map((update) => update.updatedAt)
    .sort((a, b) => b.localeCompare(a))[0];

  return latest ? formatTimestamp(latest) : "TBD";
}

function formatTimestamp(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function sourceStatus(snapshot?: ConversationSnapshot, liveSource?: LiveSourceStatus) {
  if (liveSource?.status === "blocked") {
    return "Blocked";
  }

  if (liveSource?.status === "failed") {
    return "Fetch failed";
  }

  if (liveSource) {
    return `${liveSource.opportunities} live records`;
  }

  if (snapshot?.status === "blocked") {
    return "Blocked";
  }

  if (snapshot?.status === "failed") {
    return "Fetch failed";
  }

  return snapshot?.lastFetchedAt ? `Checked ${formatTimestamp(snapshot.lastFetchedAt)}` : "Database";
}

function liveExtractionLabel(statuses: LiveSourceStatus[]) {
  if (!statuses.length) {
    return "Waiting for live source check";
  }

  return statuses
    .map((status) => `${status.sourceId}: ${status.status}, ${status.opportunities} records`)
    .join(" | ");
}

function formatOpportunityType(type: OpportunityType) {
  return type
    .replace("student-community", "student program")
    .replace("recruiting-event", "recruiting event")
    .replace("training-program", "training program")
    .replace("-", " ");
}
