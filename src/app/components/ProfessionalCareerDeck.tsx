"use client";

import {
  CalendarDays,
  ChevronDown,
  CircleAlert,
  Cpu,
  ExternalLink,
  Gamepad2,
  MapPin,
  Search,
  Sparkles,
} from "lucide-react";
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
  { value: "fellowship", label: "Fellowships" },
  { value: "training-program", label: "Training programs" },
];

export function ProfessionalCareerDeck({
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
        // The persistent cron path remains the source of record if this viewer refresh fails.
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
  const updatesBySection = new Map(
    liveUpdates.map((update) => [update.section ?? "tech", update] as const),
  );

  function filteredFor(section: OpportunitySection) {
    const category = categories[section];

    return deckOpportunities.filter((opportunity) => {
      const matchesSection = (opportunity.section ?? "tech") === section;
      const matchesCategory = category === "all" || opportunity.type === category;
      const searchable = [
        opportunity.title,
        opportunity.organization,
        opportunity.type,
        opportunity.location,
      ]
        .join(" ")
        .toLowerCase();

      return (
        matchesSection &&
        matchesCategory &&
        (!normalizedQuery || searchable.includes(normalizedQuery))
      );
    });
  }

  function setSectionCategory(section: OpportunitySection, value: CategoryFilter) {
    setCategories((current) => ({ ...current, [section]: value }));
    window.requestAnimationFrame(() => {
      document.getElementById(`${section}-${value}-opportunities`)?.scrollIntoView({
        block: "start",
        behavior: "smooth",
      });
    });
  }

  return (
    <main className="min-h-screen bg-[#f7f8fb] text-[#101418]">
      <section className="border-b border-[#dfe4ea] bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-8 lg:grid-cols-[1fr_380px] lg:items-end">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-lg border border-[#cfd8e3] bg-[#f7fafc] px-3 py-2 text-sm font-medium text-[#344256]">
              <Sparkles size={16} aria-hidden="true" />
              Live career deck
            </div>
            <h1 className="max-w-4xl text-4xl font-semibold tracking-normal text-[#101418] md:text-6xl">
              Career Deck
            </h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-[#516071]">
              Tech and game opportunities synced from your shared research conversations, grouped
              by the career paths you want to watch.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-lg border border-[#dfe4ea] bg-[#f8fafc] p-2">
            <HeroStat label="Total" value={counts.all} />
            <HeroStat label="Tech" value={counts.tech} />
            <HeroStat label="Game" value={counts.game} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-6">
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <section className="rounded-lg border border-[#dfe4ea] bg-white p-4">
            <label className="relative block">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7788]"
                aria-hidden="true"
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search roles, studios, companies, programs"
                className="h-11 w-full rounded-lg border border-[#cfd8e3] bg-[#f8fafc] pl-10 pr-3 text-sm outline-none focus:border-[#101418] focus:bg-white"
              />
            </label>
          </section>

          <aside className="rounded-lg border border-[#dfe4ea] bg-white p-4 lg:self-start">
            <p className="text-sm font-semibold text-[#101418]">Deck Snapshot</p>
            <div className="mt-4 grid gap-3 text-sm">
              <SnapshotRow label="Total records" value={String(counts.all)} />
              <SnapshotRow label="Tech section" value={String(counts.tech)} />
              <SnapshotRow label="Game section" value={String(counts.game)} />
              <SnapshotRow label="Last sync" value={latestSync(liveUpdates)} />
            </div>

            <SourceMonitor
              sources={conversationSources}
              snapshots={conversationSnapshots}
              liveStatuses={liveSourceStatuses}
            />
          </aside>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <SectionDeck
            section="tech"
            category={categories.tech}
            setCategory={(value) => setSectionCategory("tech", value)}
            opportunities={filteredFor("tech")}
            total={counts.tech}
            update={updatesBySection.get("tech")}
          />

          <SectionDeck
            section="game"
            category={categories.game}
            setCategory={(value) => setSectionCategory("game", value)}
            opportunities={filteredFor("game")}
            total={counts.game}
            update={updatesBySection.get("game")}
          />
        </div>
      </section>
    </main>
  );
}

function HeroStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-white p-4 text-center">
      <p className="text-3xl font-semibold text-[#101418]">{value}</p>
      <p className="mt-1 text-sm text-[#647184]">{label}</p>
    </div>
  );
}

function SectionDeck({
  section,
  category,
  setCategory,
  opportunities,
  total,
  update,
}: {
  section: OpportunitySection;
  category: CategoryFilter;
  setCategory: (value: CategoryFilter) => void;
  opportunities: Opportunity[];
  total: number;
  update?: LiveUpdate;
}) {
  const theme = sectionTheme(section);
  const categoryLabel = categoryOptions.find((item) => item.value === category)?.label ?? "All";

  return (
    <section
      id={`${section}-${category}-opportunities`}
      className={`rounded-lg border bg-white ${theme.border}`}
    >
      <div className={`border-b ${theme.softBorder} ${theme.headerBg} p-4`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <SectionBadge section={section} />
              <span className={`rounded-lg px-2 py-1 text-xs font-semibold ${theme.countBadge}`}>
                {opportunities.length} shown
              </span>
              <span className="text-xs font-medium text-[#647184]">{total} total</span>
            </div>
            <h2 className="mt-3 text-2xl font-semibold text-[#101418]">
              {section === "tech" ? "Tech Opportunities" : "Game Opportunities"}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#516071]">
              {update?.summary ??
                "Synced opportunities from the connected conversation source."}
            </p>
          </div>

          <label className="relative min-w-[220px]">
            <span className="sr-only">
              {section === "tech" ? "Tech category" : "Game category"}
            </span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value as CategoryFilter)}
              className={`h-11 w-full appearance-none rounded-lg border bg-white pl-3 pr-10 text-sm font-medium outline-none ${theme.selectBorder}`}
            >
              {categoryOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={16}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#647184]"
              aria-hidden="true"
            />
          </label>
        </div>

        {update?.sourceUrl && (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="font-mono text-xs text-[#647184]">
              {formatTimestamp(update.updatedAt)}
            </span>
            <a
              href={update.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center gap-2 rounded-lg border border-[#cfd8e3] bg-white px-3 font-medium text-[#263241] hover:bg-[#f4f6f8]"
            >
              <ExternalLink size={14} aria-hidden="true" />
              Open source
            </a>
          </div>
        )}
      </div>

      <div className="p-4">
        {opportunities.length ? (
          <div className="grid gap-4 2xl:grid-cols-2">
            {opportunities.map((opportunity) => (
              <OpportunityCard
                key={opportunity.id}
                opportunity={opportunity}
                section={section}
              />
            ))}
          </div>
        ) : (
          <div className={`rounded-lg border border-dashed p-6 text-sm ${theme.emptyState}`}>
            No {categoryLabel.toLowerCase()} found in this section yet.
          </div>
        )}
      </div>
    </section>
  );
}

function OpportunityCard({
  opportunity,
  section,
}: {
  opportunity: Opportunity;
  section: OpportunitySection;
}) {
  const theme = sectionTheme(section);
  const [expanded, setExpanded] = useState(false);

  return (
    <article className={`flex min-h-[318px] flex-col rounded-lg border p-5 ${theme.card}`}>
      <div className="flex flex-wrap items-center gap-2">
        <SectionBadge section={section} />
        <span className="rounded-lg bg-white/80 px-2 py-1 text-xs font-medium capitalize text-[#344256]">
          {formatOpportunityType(opportunity.type)}
        </span>
        {needsVerification(opportunity) && (
          <span className="rounded-lg border border-[#e0c47a] bg-[#fff8dc] px-2 py-1 text-xs font-medium text-[#765800]">
            Verify source
          </span>
        )}
      </div>

      <h2 className="mt-4 text-xl font-semibold leading-7 text-[#101418]">{opportunity.title}</h2>
      <p className="mt-2 text-sm font-medium text-[#516071]">{opportunity.organization}</p>

      <div className="mt-5 grid gap-3 text-sm text-[#344256]">
        <InfoLine icon={<MapPin size={16} aria-hidden="true" />} value={opportunity.location} />
        <InfoLine
          icon={<CalendarDays size={16} aria-hidden="true" />}
          value={opportunity.deadline}
        />
      </div>

      <div className="mt-5 grid gap-2 text-sm">
        <QualityLine label="Source" value={opportunity.confidence.source} section={section} />
        <QualityLine label="Freshness" value={opportunity.confidence.freshness} section={section} />
      </div>

      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        className={`mt-5 inline-flex h-10 items-center justify-between gap-3 rounded-lg border bg-white px-3 text-sm font-semibold ${theme.detailButton}`}
        aria-expanded={expanded}
      >
        Details
        <ChevronDown
          size={16}
          className={`transition-transform ${expanded ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {expanded && (
        <div className={`mt-4 grid gap-4 border-t pt-4 text-sm ${theme.softBorder}`}>
          <div className="grid gap-3">
            <DetailRow label="Compensation" value={opportunity.compensation} />
            <DetailRow label="Eligibility" value={opportunity.eligibility} />
            <DetailRow label="Discovered" value={formatTimestamp(opportunity.discoveredAt)} />
            <DetailRow label="Updated" value={formatTimestamp(opportunity.updatedAt)} />
          </div>

          <div className="grid gap-2">
            <QualityLine
              label="Extract"
              value={opportunity.confidence.extraction}
              section={section}
            />
            <QualityLine
              label="Duplicate"
              value={opportunity.confidence.duplicateProbability}
              section={section}
            />
          </div>

          {opportunity.evidence.length > 0 && (
            <ul className="grid gap-2 text-xs leading-5 text-[#516071]">
              {opportunity.evidence.map((item) => (
                <li key={item} className="border-l-2 border-[#cfd8e3] pl-3">
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <a
        href={opportunity.url}
        target="_blank"
        rel="noreferrer"
        className={`mt-auto inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold text-white ${theme.action}`}
      >
        Open opportunity
        <ExternalLink size={15} aria-hidden="true" />
      </a>
    </article>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <span className="text-xs font-medium text-[#647184]">{label}</span>
      <span className="leading-6 text-[#344256]">{value}</span>
    </div>
  );
}

function SectionBadge({ section }: { section: OpportunitySection }) {
  const isGame = section === "game";

  return (
    <span
      className={`inline-flex h-7 items-center gap-1 rounded-lg px-2 text-xs font-semibold capitalize ${
        isGame ? "bg-[#6b2fc9] text-white" : "bg-[#ff2f92] text-white"
      }`}
    >
      {isGame ? <Gamepad2 size={13} aria-hidden="true" /> : <Cpu size={13} aria-hidden="true" />}
      {section}
    </span>
  );
}

function InfoLine({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[#647184]">{icon}</span>
      <span>{value}</span>
    </div>
  );
}

function QualityLine({
  label,
  value,
  section,
}: {
  label: string;
  value: number;
  section: OpportunitySection;
}) {
  const theme = sectionTheme(section);

  return (
    <div className="grid grid-cols-[78px_1fr_42px] items-center gap-2">
      <span className="text-xs text-[#647184]">{label}</span>
      <span className="h-2 rounded-sm bg-white/80">
        <span
          className={`block h-2 rounded-sm ${theme.meter}`}
          style={{ width: `${Math.round(value * 100)}%` }}
        />
      </span>
      <span className="font-mono text-[11px] text-[#344256]">{Math.round(value * 100)}%</span>
    </div>
  );
}

function SnapshotRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#eef2f5] pb-3 last:border-0 last:pb-0">
      <span className="text-[#647184]">{label}</span>
      <span className="font-medium text-[#101418]">{value}</span>
    </div>
  );
}

function SourceMonitor({
  sources,
  snapshots,
  liveStatuses,
}: {
  sources: ConversationSource[];
  snapshots: ConversationSnapshot[];
  liveStatuses: LiveSourceStatus[];
}) {
  const snapshotBySource = new Map(snapshots.map((item) => [item.sourceId, item]));
  const liveStatusBySource = new Map(liveStatuses.map((item) => [item.sourceId, item]));

  if (!sources.length) {
    return null;
  }

  return (
    <div className="mt-5 border-t border-[#eef2f5] pt-4">
      <p className="text-sm font-semibold text-[#101418]">Source Monitor</p>
      <div className="mt-3 divide-y divide-[#eef2f5]">
        {sources.map((source) => {
          const snapshot = snapshotBySource.get(source.id);
          const liveStatus = liveStatusBySource.get(source.id);
          const status = snapshot?.status ?? "baseline_pending";

          return (
            <div key={source.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <SectionBadge section={source.section} />
                    <span className={`text-xs font-semibold ${statusTone(status)}`}>
                      {sourceStatusLabel(status)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-[#101418]">{source.name}</p>
                  <p className="mt-1 text-xs leading-5 text-[#647184]">
                    {snapshot?.lastFetchedAt
                      ? `Checked ${formatTimestamp(snapshot.lastFetchedAt)}`
                      : "Waiting for first scheduled check"}
                  </p>
                  {liveStatus && (
                    <p className="mt-1 text-xs leading-5 text-[#344256]">
                      Live extraction: {liveSourceStatusLabel(liveStatus)}
                    </p>
                  )}
                </div>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#cfd8e3] text-[#263241] hover:bg-[#f4f6f8]"
                  aria-label={`Open ${source.name}`}
                  title={`Open ${source.name}`}
                >
                  <ExternalLink size={14} aria-hidden="true" />
                </a>
              </div>
              {snapshot?.failureReason && (
                <p className="mt-2 inline-flex items-center gap-1 text-xs text-[#8a4b10]">
                  <CircleAlert size={13} aria-hidden="true" />
                  {snapshot.failureReason}
                </p>
              )}
              {liveStatus?.failureReason && (
                <p className="mt-2 inline-flex items-center gap-1 text-xs text-[#8a4b10]">
                  <CircleAlert size={13} aria-hidden="true" />
                  {liveStatus.failureReason}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function liveSourceStatusLabel(status: LiveSourceStatus) {
  if (status.status === "blocked") {
    return "blocked";
  }

  if (status.status === "failed") {
    return "failed";
  }

  return `${status.opportunities} URL-backed records`;
}

function needsVerification(opportunity: Opportunity) {
  return (
    opportunity.needsReview ||
    opportunity.confidence.source < 0.8 ||
    opportunity.confidence.extraction < 0.7
  );
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

function sourceStatusLabel(status: ConversationSnapshot["status"]) {
  if (status === "changed") {
    return "Changed";
  }

  if (status === "unchanged") {
    return "Unchanged";
  }

  if (status === "blocked") {
    return "Blocked";
  }

  if (status === "failed") {
    return "Fetch failed";
  }

  return "Baseline pending";
}

function statusTone(status: ConversationSnapshot["status"]) {
  if (status === "changed") {
    return "text-[#8a4b10]";
  }

  if (status === "blocked" || status === "failed") {
    return "text-[#9b1c1c]";
  }

  if (status === "unchanged") {
    return "text-[#1d6b3b]";
  }

  return "text-[#647184]";
}

function formatOpportunityType(type: OpportunityType) {
  return type
    .replace("student-community", "student program")
    .replace("recruiting-event", "recruiting event")
    .replace("training-program", "training program")
    .replace("-", " ");
}

function sectionTheme(section: OpportunitySection) {
  if (section === "game") {
    return {
      border: "border-[#6b2fc9]",
      softBorder: "border-[#d7c6ff]",
      headerBg: "bg-[#f5f0ff]",
      countBadge: "bg-[#6b2fc9] text-white",
      selectBorder: "border-[#8a5ce0] focus:border-[#6b2fc9]",
      card: "border-[#8a5ce0] bg-[#f4efff]",
      action: "bg-[#6b2fc9] hover:bg-[#5925ad]",
      detailButton: "border-[#8a5ce0] text-[#4c2a89] hover:bg-[#faf7ff]",
      meter: "bg-[#6b2fc9]",
      emptyState: "border-[#bda7f2] bg-[#faf7ff] text-[#4c2a89]",
    };
  }

  return {
    border: "border-[#ff2f92]",
    softBorder: "border-[#ffc2dd]",
    headerBg: "bg-[#fff0f7]",
    countBadge: "bg-[#ff2f92] text-white",
    selectBorder: "border-[#ff73b8] focus:border-[#ff2f92]",
    card: "border-[#ff73b8] bg-[#fff0f7]",
    action: "bg-[#ff2f92] hover:bg-[#d81f78]",
    detailButton: "border-[#ff73b8] text-[#8a0f4f] hover:bg-[#fff8fb]",
    meter: "bg-[#ff2f92]",
    emptyState: "border-[#ffacd1] bg-[#fff8fb] text-[#8a0f4f]",
  };
}
