"use client";

import {
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CircleAlert,
  Cpu,
  ExternalLink,
  Gamepad2,
  MapPin,
  Search,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";
import type {
  ConversationSnapshot,
  ConversationSource,
  LiveUpdate,
  Opportunity,
  OpportunitySection,
} from "@/lib/career-deck/types";

type SectionFilter = "all" | OpportunitySection;

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
  const [section, setSection] = useState<SectionFilter>("all");
  const [query, setQuery] = useState("");

  const counts = useMemo(
    () => ({
      all: opportunities.length,
      tech: opportunities.filter((item) => (item.section ?? "tech") === "tech").length,
      game: opportunities.filter((item) => item.section === "game").length,
    }),
    [opportunities],
  );

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return opportunities.filter((opportunity) => {
      const matchesSection =
        section === "all" ? true : (opportunity.section ?? "tech") === section;
      const searchable = [
        opportunity.title,
        opportunity.organization,
        opportunity.type,
        opportunity.location,
      ]
        .join(" ")
        .toLowerCase();

      return matchesSection && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [opportunities, query, section]);

  const spotlight = filtered.slice(0, 6);

  return (
    <main className="min-h-screen bg-[#f4f6f8] text-[#101418]">
      <section className="border-b border-[#dfe4ea] bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-8 lg:grid-cols-[1fr_360px] lg:items-end">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-lg border border-[#cfd8e3] bg-[#f7fafc] px-3 py-2 text-sm font-medium text-[#344256]">
              <Sparkles size={16} aria-hidden="true" />
              Live career deck
            </div>
            <h1 className="max-w-4xl text-4xl font-semibold tracking-normal text-[#101418] md:text-6xl">
              Career Deck
            </h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-[#516071]">
              A curated opportunity board for tech and game careers, synced from your shared
              research conversations and organized for fast scanning.
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
        <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
          <div className="grid gap-3">
            {liveUpdates.map((update) => (
              <SyncCard key={update.id} update={update} />
            ))}
          </div>

          <aside className="rounded-lg border border-[#dfe4ea] bg-white p-4">
            <p className="text-sm font-semibold text-[#101418]">Deck Snapshot</p>
            <div className="mt-4 grid gap-3 text-sm">
              <SnapshotRow label="Visible records" value={String(filtered.length)} />
              <SnapshotRow label="Tech section" value={String(counts.tech)} />
              <SnapshotRow label="Game section" value={String(counts.game)} />
              <SnapshotRow label="Last sync" value={latestSync(liveUpdates)} />
            </div>

            <SourceMonitor
              sources={conversationSources}
              snapshots={conversationSnapshots}
            />
          </aside>
        </div>

        <section className="mt-6 rounded-lg border border-[#dfe4ea] bg-white p-4">
          <div className="grid gap-3 lg:grid-cols-[auto_1fr] lg:items-center">
            <div className="flex flex-wrap gap-2">
              {(["all", "tech", "game"] as const).map((item) => (
                <button
                  type="button"
                  key={item}
                  onClick={() => setSection(item)}
                  className={`inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-medium capitalize ${
                    section === item
                      ? "bg-[#101418] text-white"
                      : "border border-[#cfd8e3] bg-white text-[#344256] hover:bg-[#f4f6f8]"
                  }`}
                >
                  {item === "game" && <Gamepad2 size={16} aria-hidden="true" />}
                  {item === "tech" && <Cpu size={16} aria-hidden="true" />}
                  {item === "all" && <BriefcaseBusiness size={16} aria-hidden="true" />}
                  {item} ({counts[item]})
                </button>
              ))}
            </div>

            <label className="relative block">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7788]"
                aria-hidden="true"
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search roles, studios, programs"
                className="h-10 w-full rounded-lg border border-[#cfd8e3] bg-[#f8fafc] pl-10 pr-3 text-sm outline-none focus:border-[#101418] focus:bg-white"
              />
            </label>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {spotlight.map((opportunity) => (
            <OpportunityCard key={opportunity.id} opportunity={opportunity} />
          ))}
        </section>

        {filtered.length > spotlight.length && (
          <section className="mt-6 rounded-lg border border-[#dfe4ea] bg-white">
            <div className="border-b border-[#e8edf2] px-4 py-3">
              <h2 className="text-base font-semibold text-[#101418]">More Opportunities</h2>
            </div>
            <div className="divide-y divide-[#e8edf2]">
              {filtered.slice(6).map((opportunity) => (
                <CompactOpportunity key={opportunity.id} opportunity={opportunity} />
              ))}
            </div>
          </section>
        )}
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

function SyncCard({ update }: { update: LiveUpdate }) {
  return (
    <article className="rounded-lg border border-[#dfe4ea] bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <SectionBadge section={update.section ?? "tech"} />
        <span className="inline-flex h-7 items-center gap-1 rounded-lg border border-[#bfd8c7] bg-[#f0faf3] px-2 text-xs font-medium text-[#1d6b3b]">
          <Check size={13} aria-hidden="true" />
          Synced
        </span>
      </div>
      <h2 className="mt-3 text-lg font-semibold text-[#101418]">{update.title}</h2>
      <p className="mt-2 text-sm leading-6 text-[#516071]">{update.summary}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <span className="font-mono text-xs text-[#647184]">{formatTimestamp(update.updatedAt)}</span>
        {update.sourceUrl && (
          <a
            href={update.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-8 items-center gap-2 rounded-lg border border-[#cfd8e3] px-3 font-medium text-[#263241] hover:bg-[#f4f6f8]"
          >
            <ExternalLink size={14} aria-hidden="true" />
            Open source
          </a>
        )}
      </div>
    </article>
  );
}

function OpportunityCard({ opportunity }: { opportunity: Opportunity }) {
  return (
    <article className="flex min-h-[300px] flex-col rounded-lg border border-[#dfe4ea] bg-white p-5">
      <div className="flex flex-wrap items-center gap-2">
        <SectionBadge section={opportunity.section ?? "tech"} />
        <span className="rounded-lg bg-[#eef2f6] px-2 py-1 text-xs font-medium capitalize text-[#344256]">
          {opportunity.type.replace("-", " ")}
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
        <QualityLine label="Source" value={opportunity.confidence.source} />
        <QualityLine label="Freshness" value={opportunity.confidence.freshness} />
      </div>

      <a
        href={opportunity.url}
        target="_blank"
        rel="noreferrer"
        className="mt-auto inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#101418] px-4 text-sm font-medium text-white hover:bg-[#28313c]"
      >
        Open role
        <ExternalLink size={15} aria-hidden="true" />
      </a>
    </article>
  );
}

function CompactOpportunity({ opportunity }: { opportunity: Opportunity }) {
  return (
    <article className="grid gap-3 px-4 py-4 lg:grid-cols-[1fr_150px_120px_auto] lg:items-center">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <SectionBadge section={opportunity.section ?? "tech"} />
          {needsVerification(opportunity) && (
            <span className="text-xs font-medium text-[#765800]">Verify source</span>
          )}
        </div>
        <h3 className="mt-2 font-semibold text-[#101418]">{opportunity.title}</h3>
        <p className="mt-1 text-sm text-[#647184]">{opportunity.organization}</p>
      </div>
      <p className="text-sm capitalize text-[#344256]">{opportunity.type.replace("-", " ")}</p>
      <p className="font-mono text-xs text-[#647184]">{opportunity.deadline}</p>
      <a
        href={opportunity.url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[#cfd8e3] px-3 text-sm font-medium text-[#263241] hover:bg-[#f4f6f8]"
      >
        Open
        <ExternalLink size={14} aria-hidden="true" />
      </a>
    </article>
  );
}

function SectionBadge({ section }: { section: OpportunitySection }) {
  const isGame = section === "game";

  return (
    <span
      className={`inline-flex h-7 items-center gap-1 rounded-lg px-2 text-xs font-semibold capitalize ${
        isGame ? "bg-[#ede7ff] text-[#4b2ba8]" : "bg-[#e8f2ff] text-[#1f5d99]"
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

function QualityLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="grid grid-cols-[78px_1fr_42px] items-center gap-2">
      <span className="text-xs text-[#647184]">{label}</span>
      <span className="h-2 rounded-sm bg-[#e7edf3]">
        <span
          className="block h-2 rounded-sm bg-[#1f6f8b]"
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
}: {
  sources: ConversationSource[];
  snapshots: ConversationSnapshot[];
}) {
  const snapshotBySource = new Map(snapshots.map((item) => [item.sourceId, item]));

  if (!sources.length) {
    return null;
  }

  return (
    <div className="mt-5 border-t border-[#eef2f5] pt-4">
      <p className="text-sm font-semibold text-[#101418]">Source Monitor</p>
      <div className="mt-3 divide-y divide-[#eef2f5]">
        {sources.map((source) => {
          const snapshot = snapshotBySource.get(source.id);
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
            </div>
          );
        })}
      </div>
    </div>
  );
}

function needsVerification(opportunity: Opportunity) {
  return (
    opportunity.needsReview ||
    opportunity.confidence.source < 0.8 ||
    opportunity.confidence.extraction < 0.7
  );
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
