"use client";

import {
  AlertTriangle,
  Archive,
  Check,
  Clock3,
  Database,
  Download,
  ExternalLink,
  FileText,
  GitMerge,
  RefreshCw,
  SearchCheck,
  ShieldAlert,
  Upload,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import type {
  DashboardData,
  LiveUpdate,
  Opportunity,
  OpportunitySection,
  ReviewItem,
  Source,
} from "@/lib/career-deck/types";
import { summarizeReport } from "@/lib/career-deck/reports";

type Tab = "overview" | "sources" | "review" | "reports" | "exports";
type SectionFilter = "all" | OpportunitySection;

const tabs: Array<{ id: Tab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "sources", label: "Sources" },
  { id: "review", label: "Manual Review" },
  { id: "reports", label: "Reports" },
  { id: "exports", label: "Exports" },
];

export function CareerDeckDashboard({ data }: { data: DashboardData }) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [sectionFilter, setSectionFilter] = useState<SectionFilter>("all");
  const [reviewItems, setReviewItems] = useState(data.reviewQueue);
  const [selectedReviewId, setSelectedReviewId] = useState(data.reviewQueue[0]?.id ?? "");
  const [runStatus, setRunStatus] = useState("Idle");
  const selectedReview = reviewItems.find((item) => item.id === selectedReviewId);
  const summary = summarizeReport(data.report);
  const liveUpdates = data.liveUpdates ?? (data.liveUpdate ? [data.liveUpdate] : []);
  const filteredOpportunities = useMemo(
    () =>
      sectionFilter === "all"
        ? data.opportunities
        : data.opportunities.filter(
            (opportunity) => (opportunity.section ?? "tech") === sectionFilter,
          ),
    [data.opportunities, sectionFilter],
  );
  const sectionCounts = useMemo(
    () => ({
      all: data.opportunities.length,
      tech: data.opportunities.filter((opportunity) => (opportunity.section ?? "tech") === "tech")
        .length,
      game: data.opportunities.filter((opportunity) => opportunity.section === "game").length,
    }),
    [data.opportunities],
  );

  const metrics = useMemo(() => {
    const blocked = data.sources.filter((source) => source.status === "blocked").length;
    const manual = data.sources.filter((source) => source.status === "manual_review_required").length;
    const lowConfidence = data.opportunities.filter(
      (opportunity) =>
        opportunity.needsReview ||
        opportunity.confidence.extraction < 0.8 ||
        opportunity.confidence.duplicateProbability > 0.2,
    ).length;

    return {
      opportunities: data.opportunities.length,
      activeSources: data.sources.filter((source) => source.status === "active").length,
      blocked,
      manual,
      lowConfidence,
    };
  }, [data]);

  function updateReviewStatus(id: string, status: ReviewItem["status"]) {
    setReviewItems((items) =>
      items.map((item) => (item.id === id ? { ...item, status } : item)),
    );
  }

  async function runMonitor() {
    setRunStatus("Running");
    const response = await fetch("/api/monitor/run", { method: "POST" });
    setRunStatus(response.ok ? "Completed with adapter-safe output" : "Run failed");
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa] text-[#15171a]">
      <header className="border-b border-[#d9dde3] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#14213d] text-white">
              <Database size={22} aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">Career Deck</h1>
              <p className="text-sm text-[#5c6675]">Research database and monitoring platform</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={runMonitor}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#14213d] px-4 text-sm font-medium text-white hover:bg-[#203357]"
            >
              <RefreshCw size={16} aria-hidden="true" />
              Run Monitor
            </button>
            <a
              href="/api/exports/opportunities"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#c7ced8] bg-white px-4 text-sm font-medium hover:bg-[#eef2f6]"
            >
              <Download size={16} aria-hidden="true" />
              CSV
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-6">
        <section className="mb-5 grid gap-3 md:grid-cols-5">
          <Metric label="Opportunities" value={metrics.opportunities} tone="blue" />
          <Metric label="Active Sources" value={metrics.activeSources} tone="green" />
          <Metric label="Blocked" value={metrics.blocked} tone="red" />
          <Metric label="Manual" value={metrics.manual} tone="amber" />
          <Metric label="Low Confidence" value={metrics.lowConfidence} tone="gray" />
        </section>

        {liveUpdates.length > 0 && (
          <div className="mb-5 grid gap-3">
            {liveUpdates.map((update) => (
              <LiveUpdatePanel key={update.id} update={update} />
            ))}
          </div>
        )}

        <section className="mb-5 border-y border-[#d9dde3] bg-white px-3 py-3">
          <div className="flex flex-wrap items-center gap-2">
            {(["all", "tech", "game"] as const).map((section) => (
              <button
                type="button"
                key={section}
                onClick={() => setSectionFilter(section)}
                className={`h-9 rounded-lg px-3 text-sm font-medium capitalize ${
                  sectionFilter === section
                    ? "bg-[#14213d] text-white"
                    : "text-[#374151] hover:bg-[#eef2f6]"
                }`}
              >
                {section} ({sectionCounts[section]})
              </button>
            ))}
          </div>
        </section>

        <section className="mb-5 border-y border-[#d9dde3] bg-white px-3 py-3">
          <div className="grid gap-2 sm:flex sm:items-center">
            <div className="grid max-w-full grid-cols-2 items-center gap-2 sm:flex sm:flex-wrap">
              {tabs.map((tab) => (
                <button
                  type="button"
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`h-9 rounded-lg px-3 text-sm font-medium sm:w-auto ${
                    activeTab === tab.id
                      ? "bg-[#14213d] text-white"
                      : "text-[#374151] hover:bg-[#eef2f6]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <span className="text-sm text-[#5c6675] sm:ml-auto">{runStatus}</span>
          </div>
        </section>

        {activeTab === "overview" && (
          <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
            <OpportunityTable opportunities={filteredOpportunities} sources={data.sources} />
            <IntegrityPanel data={data} />
          </div>
        )}

        {activeTab === "sources" && (
          <SourcePanel sources={data.sources} attempts={data.attempts} />
        )}

        {activeTab === "review" && (
          <ManualReviewPanel
            reviewItems={reviewItems}
            selectedReview={selectedReview}
            onSelect={setSelectedReviewId}
            onStatusChange={updateReviewStatus}
          />
        )}

        {activeTab === "reports" && (
          <ReportsPanel data={data} summary={summary} />
        )}

        {activeTab === "exports" && <ExportPanel opportunities={filteredOpportunities} />}
      </main>
    </div>
  );
}

function LiveUpdatePanel({ update }: { update: LiveUpdate }) {
  return (
    <section className="rounded-lg border border-[#d9dde3] bg-white">
      <div className="grid gap-4 p-4 lg:grid-cols-[1fr_220px] lg:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">{update.title}</h2>
            {update.section && <StatusPill label={update.section} />}
            <StatusPill label={update.status} />
          </div>
          <p className="mt-2 max-w-4xl text-sm text-[#4b5563]">{update.summary}</p>
          <ul className="mt-3 grid gap-2 text-sm text-[#374151] md:grid-cols-2">
            {update.items.map((item) => (
              <li key={item} className="flex gap-2">
                <Check size={15} className="mt-0.5 shrink-0 text-[#1c6b3c]" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="grid gap-2 text-sm">
          <DataLine label="Synced" value={update.updatedAt} />
          {update.sourceUrl && (
            <a
              href={update.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[#c7ced8] px-3 font-medium hover:bg-[#eef2f6]"
            >
              <ExternalLink size={15} aria-hidden="true" />
              Source
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "blue" | "green" | "red" | "amber" | "gray";
}) {
  const toneClass = {
    blue: "border-[#85a7d6] bg-[#edf4ff]",
    green: "border-[#89bda1] bg-[#eef8f2]",
    red: "border-[#e4a2a2] bg-[#fff1f1]",
    amber: "border-[#d8b56b] bg-[#fff7e3]",
    gray: "border-[#c7ced8] bg-white",
  }[tone];

  return (
    <div className={`rounded-lg border p-4 ${toneClass}`}>
      <p className="text-sm text-[#5c6675]">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </div>
  );
}

function OpportunityTable({
  opportunities,
  sources,
}: {
  opportunities: Opportunity[];
  sources: Source[];
}) {
  return (
    <section className="rounded-lg border border-[#d9dde3] bg-white">
      <div className="border-b border-[#d9dde3] px-4 py-3">
        <h2 className="text-lg font-semibold">Opportunity Deck</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1120px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[#d9dde3] bg-[#f2f4f7] text-[#4b5563]">
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Section</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Deadline</th>
              <th className="px-4 py-3 font-medium">Confidence</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Source</th>
              <th className="px-4 py-3 font-medium">Link</th>
            </tr>
          </thead>
          <tbody>
            {opportunities.map((opportunity) => {
              const source = sources.find((item) => item.id === opportunity.sourceId);

              return (
                <tr key={opportunity.id} className="border-b border-[#e7eaf0] last:border-0">
                  <td className="px-4 py-4">
                    <p className="font-medium">{opportunity.title}</p>
                    <p className="mt-1 text-[#5c6675]">{opportunity.organization}</p>
                  </td>
                  <td className="px-4 py-4">
                    <StatusPill label={opportunity.section ?? "tech"} />
                  </td>
                  <td className="px-4 py-4 capitalize">{opportunity.type.replace("-", " ")}</td>
                  <td className="px-4 py-4 font-mono text-xs">{opportunity.deadline}</td>
                  <td className="px-4 py-4">
                    <ConfidenceBars opportunity={opportunity} />
                  </td>
                  <td className="px-4 py-4">
                    <StatusPill label={opportunity.status} />
                    {opportunity.needsReview && (
                      <span className="ml-2 inline-flex items-center gap-1 text-xs text-[#9a6700]">
                        <AlertTriangle size={13} aria-hidden="true" />
                        Review
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4">{source?.name ?? "Unknown"}</td>
                  <td className="px-4 py-4">
                    <a
                      href={opportunity.url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Open ${opportunity.title}`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#c7ced8] hover:bg-[#eef2f6]"
                    >
                      <ExternalLink size={15} aria-hidden="true" />
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ConfidenceBars({ opportunity }: { opportunity: Opportunity }) {
  const rows = [
    ["Source", opportunity.confidence.source],
    ["Extract", opportunity.confidence.extraction],
    ["Fresh", opportunity.confidence.freshness],
    ["Dup", opportunity.confidence.duplicateProbability],
  ] as const;

  return (
    <div className="grid w-48 gap-1">
      {rows.map(([label, value]) => (
        <div key={label} className="grid grid-cols-[52px_1fr_34px] items-center gap-2">
          <span className="text-xs text-[#5c6675]">{label}</span>
          <span className="h-2 rounded-sm bg-[#e7eaf0]">
            <span
              className={`block h-2 rounded-sm ${
                label === "Dup" ? "bg-[#d97706]" : "bg-[#2563eb]"
              }`}
              style={{ width: `${Math.round(value * 100)}%` }}
            />
          </span>
          <span className="font-mono text-[11px]">{Math.round(value * 100)}%</span>
        </div>
      ))}
    </div>
  );
}

function IntegrityPanel({ data }: { data: DashboardData }) {
  return (
    <section className="rounded-lg border border-[#d9dde3] bg-white">
      <div className="border-b border-[#d9dde3] px-4 py-3">
        <h2 className="text-lg font-semibold">Reliability State</h2>
      </div>
      <div className="grid gap-3 p-4">
        <IntegrityRow
          icon={<Database size={18} aria-hidden="true" />}
          label="Reports source"
          value={data.report.generatedFrom}
        />
        <IntegrityRow
          icon={<ShieldAlert size={18} aria-hidden="true" />}
          label="Blocked attempts"
          value={String(data.attempts.filter((attempt) => attempt.status === "blocked").length)}
        />
        <IntegrityRow
          icon={<Clock3 size={18} aria-hidden="true" />}
          label="Last attempted"
          value={data.attempts[0]?.attemptedAt ?? "None"}
        />
        <IntegrityRow
          icon={<SearchCheck size={18} aria-hidden="true" />}
          label="No inferred records"
          value="Blocked sources saved as review tasks"
        />
      </div>
    </section>
  );
}

function IntegrityRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-[#edf0f4] pb-3 last:border-0 last:pb-0">
      <span className="mt-0.5 text-[#2563eb]">{icon}</span>
      <span>
        <p className="text-sm text-[#5c6675]">{label}</p>
        <p className="mt-1 text-sm font-medium">{value}</p>
      </span>
    </div>
  );
}

function SourcePanel({
  sources,
  attempts,
}: {
  sources: Source[];
  attempts: DashboardData["attempts"];
}) {
  return (
    <section className="rounded-lg border border-[#d9dde3] bg-white">
      <div className="border-b border-[#d9dde3] px-4 py-3">
        <h2 className="text-lg font-semibold">Source Adapters</h2>
      </div>
      <div className="grid gap-3 p-4 md:grid-cols-2">
        {sources.map((source) => {
          const attempt = attempts.find((item) => item.sourceId === source.id);
          return (
            <article key={source.id} className="rounded-lg border border-[#d9dde3] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{source.name}</h3>
                  <p className="mt-1 font-mono text-xs text-[#5c6675]">{source.adapterKey}</p>
                </div>
                <StatusPill label={source.status} />
              </div>
              <dl className="mt-4 grid gap-2 text-sm">
                <DataLine label="Category" value={source.category} />
                <DataLine label="Robots" value={source.robotsPolicy} />
                <DataLine label="Attempted" value={source.lastAttemptAt} />
                <DataLine label="Attempt status" value={attempt?.status ?? "none"} />
              </dl>
              {source.lastFailureReason && (
                <p className="mt-4 rounded-lg border border-[#f1d18a] bg-[#fff8e8] p-3 text-sm text-[#704d00]">
                  {source.lastFailureReason}
                </p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ManualReviewPanel({
  reviewItems,
  selectedReview,
  onSelect,
  onStatusChange,
}: {
  reviewItems: ReviewItem[];
  selectedReview?: ReviewItem;
  onSelect: (id: string) => void;
  onStatusChange: (id: string, status: ReviewItem["status"]) => void;
}) {
  return (
    <section className="grid gap-5 lg:grid-cols-[360px_1fr]">
      <div className="rounded-lg border border-[#d9dde3] bg-white">
        <div className="border-b border-[#d9dde3] px-4 py-3">
          <h2 className="text-lg font-semibold">Queue</h2>
        </div>
        <div className="grid">
          {reviewItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={`border-b border-[#e7eaf0] px-4 py-3 text-left last:border-0 ${
                selectedReview?.id === item.id ? "bg-[#eef4ff]" : "hover:bg-[#f7f8fa]"
              }`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="font-medium">{item.id}</span>
                <StatusPill label={item.status} />
              </span>
              <span className="mt-1 block text-sm text-[#5c6675]">{item.reason}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-[#d9dde3] bg-white">
        <div className="border-b border-[#d9dde3] px-4 py-3">
          <h2 className="text-lg font-semibold">Review Editor</h2>
        </div>
        {selectedReview ? (
          <div className="grid gap-5 p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span className="font-medium">Reason</span>
                <textarea
                  className="min-h-24 rounded-lg border border-[#c7ced8] px-3 py-2"
                  defaultValue={selectedReview.reason}
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium">AI Extraction Override</span>
                <textarea
                  className="min-h-24 rounded-lg border border-[#c7ced8] px-3 py-2"
                  defaultValue={selectedReview.aiExtractionOverride ?? ""}
                />
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <ReviewAction
                icon={<Check size={16} aria-hidden="true" />}
                label="Approve"
                onClick={() => onStatusChange(selectedReview.id, "approved")}
              />
              <ReviewAction
                icon={<X size={16} aria-hidden="true" />}
                label="Reject"
                onClick={() => onStatusChange(selectedReview.id, "rejected")}
              />
              <ReviewAction
                icon={<GitMerge size={16} aria-hidden="true" />}
                label="Merge"
                onClick={() => onStatusChange(selectedReview.id, "merged")}
              />
            </div>

            <div className="rounded-lg border border-dashed border-[#aeb7c4] p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Upload size={16} aria-hidden="true" />
                Attachments
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedReview.attachments.length ? (
                  selectedReview.attachments.map((attachment) => (
                    <span
                      key={attachment.id}
                      className="inline-flex items-center gap-2 rounded-lg border border-[#c7ced8] px-3 py-2 text-sm"
                    >
                      <FileText size={15} aria-hidden="true" />
                      {attachment.name}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-[#5c6675]">No files attached</span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="p-4 text-sm text-[#5c6675]">No review item selected.</p>
        )}
      </div>
    </section>
  );
}

function ReviewAction({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#c7ced8] bg-white px-3 text-sm font-medium hover:bg-[#eef2f6]"
    >
      {icon}
      {label}
    </button>
  );
}

function ReportsPanel({
  data,
  summary,
}: {
  data: DashboardData;
  summary: ReturnType<typeof summarizeReport>;
}) {
  return (
    <section className="rounded-lg border border-[#d9dde3] bg-white">
      <div className="border-b border-[#d9dde3] px-4 py-3">
        <h2 className="text-lg font-semibold">Daily Changelog</h2>
      </div>
      <div className="grid gap-4 p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <Metric label="New" value={summary.new} tone="green" />
          <Metric label="Changed" value={summary.changed} tone="blue" />
          <Metric label="Closed" value={summary.closed} tone="amber" />
          <Metric label="Removed" value={summary.removed} tone="red" />
        </div>
        <div className="rounded-lg border border-[#d9dde3]">
          <div className="grid gap-1 border-b border-[#d9dde3] p-4 text-sm">
            <DataLine label="Report date" value={`${data.report.date} (${data.report.week})`} />
            <DataLine
              label="Compared with"
              value={`${data.report.previousReportDate} (${data.report.previousReportWeek})`}
            />
            <DataLine label="Generated from" value={data.report.generatedFrom} />
          </div>
          <div className="divide-y divide-[#e7eaf0]">
            {data.report.changes.map((change) => (
              <div key={change.id} className="grid gap-1 p-4 text-sm md:grid-cols-[180px_1fr]">
                <StatusPill label={change.kind} />
                <div>
                  <p className="font-medium">{change.title}</p>
                  <p className="mt-1 text-[#5c6675]">
                    {change.before ? `${change.before} -> ${change.after}` : change.after}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ExportPanel({ opportunities }: { opportunities: Opportunity[] }) {
  return (
    <section className="rounded-lg border border-[#d9dde3] bg-white">
      <div className="border-b border-[#d9dde3] px-4 py-3">
        <h2 className="text-lg font-semibold">Export Engine</h2>
      </div>
      <div className="grid gap-4 p-4 md:grid-cols-3">
        <a
          href="/api/exports/opportunities"
          className="rounded-lg border border-[#d9dde3] p-4 hover:bg-[#f7f8fa]"
        >
          <Download size={18} aria-hidden="true" />
          <p className="mt-3 font-semibold">CSV</p>
          <p className="mt-1 text-sm text-[#5c6675]">{opportunities.length} database records</p>
        </a>
        <div className="rounded-lg border border-[#d9dde3] p-4">
          <Archive size={18} aria-hidden="true" />
          <p className="mt-3 font-semibold">Report Archive</p>
          <p className="mt-1 text-sm text-[#5c6675]">Daily changelogs remain database-backed</p>
        </div>
        <div className="rounded-lg border border-[#d9dde3] p-4">
          <FileText size={18} aria-hidden="true" />
          <p className="mt-3 font-semibold">Review Packet</p>
          <p className="mt-1 text-sm text-[#5c6675]">Screenshots and PDFs stay attached to queue items</p>
        </div>
      </div>
    </section>
  );
}

function StatusPill({ label }: { label: string }) {
  const normalized = label.replaceAll("_", " ");
  const isRisk = ["blocked", "failed", "closed", "removed", "rejected"].includes(label);
  const isGood = ["active", "success", "approved", "open", "new"].includes(label);

  return (
    <span
      className={`inline-flex h-7 items-center rounded-lg border px-2 text-xs font-medium capitalize ${
        isRisk
          ? "border-[#e4a2a2] bg-[#fff1f1] text-[#8a1f1f]"
          : isGood
            ? "border-[#89bda1] bg-[#eef8f2] text-[#1c6b3c]"
            : "border-[#d8b56b] bg-[#fff7e3] text-[#704d00]"
      }`}
    >
      {normalized}
    </span>
  );
}

function DataLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[130px_1fr] gap-3">
      <dt className="text-[#5c6675]">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
