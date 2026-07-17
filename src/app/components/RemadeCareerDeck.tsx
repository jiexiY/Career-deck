"use client";

import { ArrowLeft, ChevronDown, ExternalLink, Search, X } from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  defaultGameMonitorFilters,
  gameMonitorData,
  gameMonitorFilterOptions,
  gamePortfolioPrep,
  getGameMonitorRecord,
  matchesGameMonitorFilters,
  newestHighFitGameMonitors,
  type GameMonitorFilters,
  type GameMonitorOpportunity,
} from "@/lib/career-deck/game-monitor";
import { matchesPreferredOpportunityRegion } from "@/lib/career-deck/opportunity-region";
import { plainText } from "@/lib/career-deck/text";
import type {
  ConversationSnapshot,
  ConversationSource,
  Opportunity,
  OpportunitySection,
  OpportunityType,
} from "@/lib/career-deck/types";

type DeckView = "landing" | "home" | "opportunities";
type CategoryFilter = "all" | OpportunityType;
type FloatingBubbleBody = {
  section: OpportunitySection;
  size: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
};

type LiveConversationResponse = {
  ok?: boolean;
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

type ReportConfig = {
  section: OpportunitySection;
  idPrefix: string;
  title: string;
  subtitle: string;
  accent: string;
  buckets: Array<{ label: string; value: number; note: string }>;
  priorityRoles: Array<{ rank: number; role: string; reason: string }>;
  signals: string[];
  fixes: string[];
};

const LiquidEther = dynamic(() => import("./LiquidEther"), { ssr: false });

const categoryOptions: Array<{ value: CategoryFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "internship", label: "Internships" },
  { value: "student-community", label: "Student programs" },
  { value: "co-op", label: "Co-ops" },
  { value: "hackathon", label: "Hackathons" },
  { value: "recruiting-event", label: "Recruiting events" },
  { value: "conference", label: "Conferences" },
  { value: "fellowship", label: "Fellowships" },
  { value: "training-program", label: "Training" },
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "startup", label: "Startups" },
];

const libraryGameReportIdPrefix = "library-game-2026-07-01-";
const libraryTechReportIdPrefix = "library-tech-2026-07-02-";

const gameReportBuckets = [
  { label: "New verified", value: 7, note: "Apply or manual-check today" },
  { label: "Carried forward", value: 6, note: "Track; act where fit is realistic" },
  { label: "Closed", value: 4, note: "Do not spend application time" },
  { label: "Stale / unverified", value: 5, note: "Discovery only" },
  { label: "Watchlist notes", value: 6, note: "Strategic prep" },
];

const gameReportPriorityRoles = [
  {
    rank: 1,
    role: "NetEase Social Media Content Marketing Intern",
    reason: "Remote, social sciences accepted, bilingual EN/CN, content + community + metrics.",
  },
  {
    rank: 2,
    role: "Tencent Game Operations Interns",
    reason: "Strongest true game-ops path; apply if Workday forms are active.",
  },
  {
    rank: 3,
    role: "Garena Game Operations Internship",
    reason: "Broad game-ops gateway; Singapore availability is the constraint.",
  },
  {
    rank: 4,
    role: "NetEase UX / KOL roles",
    reason: "Good fit only if portfolio or location/work eligibility is credible.",
  },
];

const gameReportSignals = [
  "Bilingual EN/CN",
  "Content calendars",
  "Campaign metrics",
  "Community feedback loops",
  "Game-analysis writing",
  "Game UX portfolio",
];

const gameReportFixes = [
  "Build 3 one-page game-ops case studies.",
  "Publish a mock social/player analytics dashboard.",
  "Prepare Mandarin + English resume variants.",
  "Document end-to-end event/content workflows.",
];

const gameReportInsights: Record<string, { fit: string; bucket: string; action: string }> = {
  "library-game-2026-07-01-netease-social-media-content-marketing-intern": {
    fit: "High",
    bucket: "New verified",
    action: "Apply with social + analytics + bilingual positioning.",
  },
  "library-game-2026-07-01-tencent-level-infinite-game-operations-intern-r107226": {
    fit: "High",
    bucket: "New verified",
    action: "Manual Workday check; submit if active.",
  },
  "library-game-2026-07-01-tencent-game-research-intern-r107142": {
    fit: "Medium-High",
    bucket: "New verified",
    action: "Show game-analysis writing and player research examples.",
  },
  "library-game-2026-07-01-garena-general-openings-internships-game-operations": {
    fit: "Medium-High",
    bucket: "New verified",
    action: "Apply only if Singapore availability is realistic.",
  },
  "library-game-2026-07-01-garena-product-coordinator-game-operations": {
    fit: "Medium",
    bucket: "New verified",
    action: "Use as a live-ops duties template if location blocks action.",
  },
  "library-game-2026-07-01-tencent-product-manager-intern-r107232": {
    fit: "Medium-Low",
    bucket: "New verified",
    action: "Treat as PM trajectory research unless degree requirements match.",
  },
  "library-game-2026-07-01-tencent-data-science-intern-r107184": {
    fit: "Medium",
    bucket: "New verified",
    action: "Strengthen public analytics proof before prioritizing.",
  },
  "library-game-2026-07-01-papergames-infold-video-design-intern-shining-nikki": {
    fit: "Medium",
    bucket: "Carried forward",
    action: "Proceed only with a credible video/design portfolio.",
  },
  "library-game-2026-07-01-papergames-infold-recruitment-intern-game-rd-planning": {
    fit: "Medium",
    bucket: "Carried forward",
    action: "Manual portal verification required before applying.",
  },
  "library-game-2026-07-01-tencent-level-infinite-game-operations-intern-r106760": {
    fit: "High",
    bucket: "Carried forward",
    action: "Manual Workday check; submit if active.",
  },
  "library-game-2026-07-01-netease-user-experience-center-junior-ux-designer": {
    fit: "Medium-High",
    bucket: "Carried forward",
    action: "Proceed only with game-specific UX portfolio proof.",
  },
  "library-game-2026-07-01-netease-overseas-influencer-kol-operations-intern-indonesia": {
    fit: "Medium",
    bucket: "Carried forward",
    action: "Check location/work eligibility before applying.",
  },
  "library-game-2026-07-01-garena-associate-project-coordinator-contract": {
    fit: "Medium",
    bucket: "Adjacent",
    action: "Use as an operations portfolio template; not an internship.",
  },
};

const techReportBuckets = [
  { label: "New / changed", value: 21, note: "July 1 revised PDF; fastest deadline checks first" },
  { label: "Prior monitor", value: 57, note: "July 2 catchup records with detailed fit notes" },
  { label: "Top fit", value: 12, note: "5/5 or strongest 4.5/5 applications" },
  { label: "Portfolio sprints", value: 28, note: "Hackathons and build challenges for proof-of-work" },
  { label: "Needs timing check", value: 18, note: "Rolling, active-looking, or stale-source caveats" },
];

const techReportPriorityRoles = [
  {
    rank: 1,
    role: "Claude Corps Fellow",
    reason: "Urgent July 17 deadline, strongest AI adoption plus social-impact fellowship fit.",
  },
  {
    rank: 2,
    role: "OpenAI Campus Network",
    reason: "Best match for AI club leadership, workshops, and student AI programming.",
  },
  {
    rank: 3,
    role: "Microsoft Copilot Student Ambassador",
    reason: "Strong responsible AI tooling and campus adoption path with rolling review.",
  },
  {
    rank: 4,
    role: "Google Student Researcher",
    reason: "Research/evaluation lane with July 17 timing and strong stats + AI testing fit.",
  },
  {
    rank: 5,
    role: "Scale AI Technical Advisor Specialist",
    reason: "High-upside paid AI evaluation role, but verify the stale January start-date caveat.",
  },
];

const techReportSignals = [
  "AI evaluation",
  "Campus workshops",
  "Source confidence",
  "Product analytics",
  "GitHub demo",
  "Figma prototype",
  "Workflow audits",
  "Student community",
];

const techReportFixes = [
  "Ship one AI Opportunity Monitor demo with source confidence and database-backed reports.",
  "Prepare a reusable GitHub/Figma/demo packet for applications and hackathons.",
  "Write one short AI-evaluation case study with stale-source and duplicate handling.",
  "Verify rolling or active-looking postings before spending more than 30 minutes tailoring.",
];

const techReportInsights: Record<string, { fit: string; bucket: string; action: string }> = {
  "library-tech-2026-07-02-anthropic-codepath-claude-corps-fellow": {
    fit: "5/5",
    bucket: "New / changed",
    action: "Apply urgently with AI adoption and social-impact framing.",
  },
  "library-tech-2026-07-02-openai-campus-network-student-club-interest-form": {
    fit: "5/5",
    bucket: "New / changed",
    action: "Pitch AI club leadership, workshops, and student programming.",
  },
  "library-tech-2026-07-02-microsoft-copilot-student-ambassador": {
    fit: "5/5",
    bucket: "New / changed",
    action: "Use campus AI adoption and responsible-tooling examples.",
  },
  "library-tech-2026-07-02-notion-campus-leaders": {
    fit: "5/5",
    bucket: "New / changed",
    action: "Lead with systems building, Notion workflows, and community operations.",
  },
  "library-tech-2026-07-02-cloudflare-people-team-intern-hr-operations-ai-innovation-fall-2026": {
    fit: "5/5",
    bucket: "Prior monitor",
    action: "Apply with AI operations, documentation, dashboards, and people-systems proof.",
  },
  "library-tech-2026-07-02-google-student-researcher-bs-ms-winter-summer-2026": {
    fit: "5/5",
    bucket: "Prior monitor",
    action: "Apply by July 17 with a stats/research resume and AI-evaluation artifact.",
  },
  "library-tech-2026-07-02-google-gemini-build-with-gemini-xprize": {
    fit: "5/5",
    bucket: "Prior monitor",
    action: "Turn Career Deck into a product demo with users and source confidence.",
  },
  "library-tech-2026-07-02-scale-ai-technical-advisor-specialist-part-time-internship": {
    fit: "5/5 if current",
    bucket: "Prior monitor",
    action: "Verify recruiter timing, then emphasize AI evaluation and model-failure analysis.",
  },
  "library-tech-2026-07-02-sharkninja-sharkbyte-applied-ai-analytics-co-op-fall-2026": {
    fit: "5/5",
    bucket: "Prior monitor",
    action: "Position around AI workflows, dashboards, SQL/Python, and messy-data decisions.",
  },
  "library-tech-2026-07-02-whitney-museum-technology-ai-product-engineering-intern-fall-2026": {
    fit: "5/5",
    bucket: "Prior monitor",
    action: "Apply with a RAG assistant demo, privacy risks, eval notes, and user research framing.",
  },
  "library-tech-2026-07-02-zipline-software-systems-validation-intern-fall-2026": {
    fit: "5/5",
    bucket: "Prior monitor",
    action: "Build a simulated flight-log validation dashboard with anomaly flags.",
  },
};

const opportunityReportInsights: Record<string, { fit: string; bucket: string; action: string }> = {
  ...gameReportInsights,
  ...techReportInsights,
};

const reportConfigs: ReportConfig[] = [
  {
    section: "game",
    idPrefix: libraryGameReportIdPrefix,
    title: "Game report summary",
    subtitle: "OpenAI Library file: July 1 source-verified where possible",
    accent: "#9e00b8",
    buckets: gameReportBuckets,
    priorityRoles: gameReportPriorityRoles,
    signals: gameReportSignals,
    fixes: gameReportFixes,
  },
  {
    section: "tech",
    idPrefix: libraryTechReportIdPrefix,
    title: "Tech report summary",
    subtitle: "OpenAI Library files: July 1 revised set plus July 2 catchup PDF",
    accent: "#d10aa5",
    buckets: techReportBuckets,
    priorityRoles: techReportPriorityRoles,
    signals: techReportSignals,
    fixes: techReportFixes,
  },
];

export function RemadeCareerDeck({
  opportunities,
  conversationSources,
  conversationSnapshots,
}: {
  opportunities: Opportunity[];
  conversationSources: ConversationSource[];
  conversationSnapshots: ConversationSnapshot[];
}) {
  const [view, setView] = useState<DeckView>("landing");
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [securityError, setSecurityError] = useState("");
  const [activeSection, setActiveSection] = useState<OpportunitySection | "all">("all");
  const [query, setQuery] = useState("");
  const [deckOpportunities, setDeckOpportunities] = useState(opportunities);
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [liveSourceStatuses, setLiveSourceStatuses] = useState<LiveSourceStatus[]>([]);
  const [categories, setCategories] = useState<Record<OpportunitySection, CategoryFilter>>({
    tech: "all",
    game: "all",
  });
  const [gameFilters, setGameFilters] = useState<GameMonitorFilters>(defaultGameMonitorFilters);

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
        // Keep rendering the database snapshot if viewer-side refresh is unavailable.
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

  const focusDeckOpportunities = useMemo(
    () => deckOpportunities.filter(matchesPreferredOpportunityRegion),
    [deckOpportunities],
  );
  const lastSyncedAt = latestDiscoveredTimestamp(focusDeckOpportunities);

  const counts = useMemo(
    () => ({
      all: focusDeckOpportunities.length,
      tech: focusDeckOpportunities.filter((item) => (item.section ?? "tech") === "tech").length,
      game: focusDeckOpportunities.filter((item) => item.section === "game").length,
    }),
    [focusDeckOpportunities],
  );

  const visibleOpportunities = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return focusDeckOpportunities.filter((opportunity) => {
      const section = opportunity.section ?? "tech";
      const matchesSection = activeSection === "all" || activeSection === section;
      const matchesCategory = categories[section] === "all" || opportunity.type === categories[section];
      const matchesVerifiedGameDisplay =
        section !== "game" || isVerifiedGameDisplayOpportunity(opportunity);
      const matchesGameFilters =
        activeSection === "game" && section === "game"
          ? matchesGameMonitorFilters(getGameMonitorRecord(opportunity.id), gameFilters)
          : true;
      const searchable = [
        opportunity.title,
        opportunity.organization,
        opportunity.type,
        opportunity.location,
        opportunity.eligibility,
        opportunity.compensation,
      ]
        .join(" ")
        .toLowerCase();

      return (
        matchesSection &&
        matchesCategory &&
        matchesVerifiedGameDisplay &&
        matchesGameFilters &&
        (!normalizedQuery || searchable.includes(normalizedQuery))
      );
    });
  }, [activeSection, categories, focusDeckOpportunities, gameFilters, query]);

  function updateSecurityAnswer(value: string) {
    setSecurityAnswer(value);

    if (securityError && value.trim().toLowerCase() === "charlie") {
      setSecurityError("");
    }
  }

  function openDeck() {
    if (securityAnswer.trim().toLowerCase() !== "charlie") {
      setSecurityError("Answer is wrong. Try again.");
      return;
    }

    setSecurityError("");
    setView("home");
  }

  function returnToLanding() {
    setSecurityAnswer("");
    setSecurityError("");
    setView("landing");
  }

  function openSection(section: OpportunitySection) {
    setActiveSection(section);
    setView("opportunities");
  }

  if (selectedOpportunity) {
    return (
      <DetailPage
        opportunity={selectedOpportunity}
        conversationSources={conversationSources}
        conversationSnapshots={conversationSnapshots}
        liveSourceStatuses={liveSourceStatuses}
        onClose={() => setSelectedOpportunity(null)}
      />
    );
  }

  if (view === "landing") {
    return (
      <LandingPage
        answer={securityAnswer}
        error={securityError}
        onAnswerChange={updateSecurityAnswer}
        onOpen={openDeck}
      />
    );
  }

  if (view === "home") {
    return (
      <HomePage
        counts={counts}
        categories={categories}
        lastSyncedAt={lastSyncedAt}
        liveSourceStatuses={liveSourceStatuses}
        onBack={returnToLanding}
        onOpenSection={openSection}
        onOpenAll={() => {
          setActiveSection("all");
          setView("opportunities");
        }}
        onCategoryChange={(section, value) =>
          setCategories((current) => ({ ...current, [section]: value }))
        }
      />
    );
  }

  return (
    <OpportunitiesPage
      activeSection={activeSection}
      categories={categories}
      counts={counts}
      lastSyncedAt={lastSyncedAt}
      liveSourceStatuses={liveSourceStatuses}
      opportunities={visibleOpportunities}
      query={query}
      gameFilters={gameFilters}
      onBack={() => setView("home")}
      onCategoryChange={(section, value) =>
        setCategories((current) => ({ ...current, [section]: value }))
      }
      onGameFilterChange={(key, value) =>
        setGameFilters((current) => ({ ...current, [key]: value }))
      }
      onQueryChange={setQuery}
      onSelectOpportunity={setSelectedOpportunity}
      onSectionChange={setActiveSection}
    />
  );
}

function DeckHeadline({
  className = "",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`pointer-events-none flex items-center rounded-r-[999px] border-y border-r border-white/54 bg-white/18 shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_24px_80px_rgba(84,14,105,0.13)] backdrop-blur-2xl ${
        compact
          ? "min-h-[96px] w-[min(470px,calc(100vw-1.25rem))] justify-start pr-8 pl-4 sm:min-h-[112px] sm:pr-10 sm:pl-6"
          : "min-h-[104px] w-[min(760px,calc(100vw-1.5rem))] justify-start pr-8 pl-4 sm:min-h-[132px] sm:pr-12 sm:pl-6"
      } ${className}`}
    >
      <h1
        className={`font-thin leading-none tracking-normal ${
          compact ? "text-5xl sm:text-6xl" : "text-5xl sm:text-7xl lg:text-8xl"
        }`}
      >
        Career Deck
      </h1>
    </div>
  );
}

function LiquidEtherBackground({ variant }: { variant: "landing" | "home" | "opportunities" }) {
  const isHome = variant === "home";
  const isLanding = variant === "landing";
  const isPrimarySurface = isLanding || isHome;

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {isPrimarySurface && (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_14%_18%,rgba(82,39,255,0.42),transparent_35%),radial-gradient(ellipse_at_46%_78%,rgba(255,159,252,0.46),transparent_38%),radial-gradient(ellipse_at_88%_22%,rgba(180,151,207,0.54),transparent_37%),linear-gradient(135deg,rgba(255,255,255,0.72),rgba(246,229,255,0.62)_38%,rgba(214,169,224,0.74))]" />
      )}
      <div
        className={`absolute ${
          isPrimarySurface
            ? "inset-[-16%] opacity-100 saturate-[1.34] contrast-[1.12]"
            : "inset-0 opacity-80"
        }`}
      >
        <LiquidEther
          colors={
            isLanding
              ? ["#5227FF", "#FF9FFC", "#B497CF"]
              : isHome
                ? ["#5227FF", "#FF9FFC", "#B497CF"]
                : ["#D10AA5", "#7C3AED", "#F3E5F5"]
          }
          mouseForce={isLanding ? 20 : isHome ? 16 : 12}
          cursorSize={isLanding ? 100 : isHome ? 110 : 92}
          isViscous={false}
          viscous={isLanding ? 30 : 26}
          iterationsViscous={isLanding ? 32 : 24}
          iterationsPoisson={isLanding ? 32 : 24}
          resolution={isLanding ? 0.5 : 0.42}
          isBounce={false}
          autoDemo
          autoSpeed={isLanding ? 0.5 : isHome ? 0.34 : 0.24}
          autoIntensity={isLanding ? 2.2 : isHome ? 1.8 : 1.35}
          takeoverDuration={0.25}
          autoResumeDelay={isLanding ? 3000 : 2200}
          autoRampDuration={isLanding ? 0.6 : 0.7}
          className="h-full w-full"
          style={{ height: "100%", width: "100%" }}
        />
      </div>
      <div
        className={
          isPrimarySurface
            ? "absolute inset-0 bg-[radial-gradient(circle_at_11%_9%,rgba(255,255,255,0.34),transparent_30%),radial-gradient(circle_at_82%_16%,rgba(255,255,255,0.12),transparent_28%),linear-gradient(115deg,rgba(255,255,255,0.10),rgba(255,255,255,0.03)_44%,rgba(137,39,158,0.03))]"
            : "absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(255,255,255,0.36),transparent_34%),linear-gradient(115deg,rgba(255,255,255,0.34),rgba(255,255,255,0.08)_46%,rgba(137,39,158,0.16))]"
        }
      />
      {isPrimarySurface && (
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.07)_56%,rgba(255,255,255,0.16))]" />
      )}
    </div>
  );
}

function LandingPage({
  answer,
  error,
  onAnswerChange,
  onOpen,
}: {
  answer: string;
  error: string;
  onAnswerChange: (value: string) => void;
  onOpen: () => void;
}) {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f5e8ff] text-black">
      <section className="relative min-h-screen w-full overflow-hidden bg-[#f5e8ff]">
        <LiquidEtherBackground variant="landing" />

        <Image
          src="/career-deck-landing.jpg"
          alt="Career Deck cover artwork"
          width={4564}
          height={3006}
          priority
          className="absolute right-0 top-[104px] z-10 h-auto w-[min(66vw,960px)] max-w-none object-contain"
        />

        <DeckHeadline compact className="absolute left-0 top-4 z-20" />

        <div className="absolute bottom-6 right-6 z-20 w-[min(560px,calc(100%-3rem))] rounded-[70px] border border-black/5 bg-white/55 px-6 py-5 shadow-[0_24px_70px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-2xl">
          <div className="grid items-center gap-3 md:grid-cols-[1fr_160px_90px]">
            <p className="font-serif text-4xl italic leading-none">To my beloved</p>
            <label>
              <span className="sr-only">Security answer</span>
              <input
                value={answer}
                onChange={(event) => onAnswerChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    onOpen();
                  }
                }}
                placeholder="name"
                className="h-12 w-full rounded-[8px] border border-transparent bg-[#b060bd] px-4 text-center text-xl font-semibold text-white outline-none placeholder:text-white/70 focus:border-white"
              />
            </label>
            <button
              type="button"
              onClick={onOpen}
              className="h-12 rounded-full bg-black px-5 text-sm font-semibold text-white"
            >
              Open
            </button>
          </div>
          {error && <p className="mt-3 text-center text-sm font-semibold text-[#7b006e]">{error}</p>}
        </div>
      </section>
    </main>
  );
}

function HomePage({
  counts,
  categories,
  lastSyncedAt,
  liveSourceStatuses,
  onBack,
  onCategoryChange,
  onOpenAll,
  onOpenSection,
}: {
  counts: { all: number; tech: number; game: number };
  categories: Record<OpportunitySection, CategoryFilter>;
  lastSyncedAt?: string;
  liveSourceStatuses: LiveSourceStatus[];
  onBack: () => void;
  onCategoryChange: (section: OpportunitySection, value: CategoryFilter) => void;
  onOpenAll: () => void;
  onOpenSection: (section: OpportunitySection) => void;
}) {
  return (
    <main className="min-h-screen bg-[#f5e8ff] text-black">
      <section className="relative min-h-screen w-full overflow-hidden bg-[#f5e8ff] px-6 py-12">
        <LiquidEtherBackground variant="home" />
        <GlassBackButton onClick={onBack} label="Back to cover" />
        <DeckHeadline className="absolute left-0 top-12 z-20" />
        <div className="relative z-10 mx-auto grid min-h-[calc(100vh-6rem)] max-w-[1440px] gap-8 lg:grid-cols-[1fr_430px]">
          <div className="relative min-h-[620px] overflow-hidden">
            <FloatingSectionBubbles onOpenSection={onOpenSection} />
          </div>

          <aside className="flex min-h-[620px] flex-col justify-center rounded-[240px] border border-white/45 bg-white/15 px-12 py-16 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_24px_90px_rgba(101,36,112,0.16)] backdrop-blur-2xl">
            <button type="button" onClick={onOpenAll} className="mb-10 text-3xl font-semibold">
              Total records {counts.all}
            </button>
            <CategorySelect
              label={`Game category ${counts.game}`}
              value={categories.game}
              onChange={(value) => onCategoryChange("game", value)}
            />
            <CategorySelect
              label={`Tech category ${counts.tech}`}
              value={categories.tech}
              onChange={(value) => onCategoryChange("tech", value)}
            />
            <p className="mt-10 text-2xl font-semibold" title={liveExtractionLabel(liveSourceStatuses)}>
              Last sync {formatSyncTimestamp(lastSyncedAt)}
            </p>
          </aside>
        </div>
      </section>
    </main>
  );
}

function FloatingSectionBubbles({
  onOpenSection,
}: {
  onOpenSection: (section: OpportunitySection) => void;
}) {
  const arenaRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);
  const bodiesRef = useRef<FloatingBubbleBody[]>([]);
  const bubbleRefs = useRef<Record<OpportunitySection, HTMLButtonElement | null>>({
    game: null,
    tech: null,
  });

  useEffect(() => {
    const arena = arenaRef.current;

    if (!arena) {
      return;
    }

    const arenaElement = arena;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function applyBodies() {
      for (const body of bodiesRef.current) {
        const node = bubbleRefs.current[body.section];

        if (!node) {
          continue;
        }

        node.style.width = `${body.size}px`;
        node.style.height = `${body.size}px`;
        node.style.transform = `translate3d(${body.x}px, ${body.y}px, 0)`;
      }
    }

    function clampBody(body: FloatingBubbleBody, width: number, height: number) {
      body.x = Math.max(0, Math.min(width - body.size, body.x));
      body.y = Math.max(0, Math.min(height - body.size, body.y));
    }

    function resetBodies() {
      const { width, height } = arenaElement.getBoundingClientRect();
      const gap = Math.max(28, Math.min(54, width * 0.05));
      const size = Math.max(168, Math.min(360, (width - gap - 40) / 2, height * 0.72));
      const gameSize = size;
      const techSize = Math.max(158, size * 0.9);

      bodiesRef.current = [
        {
          section: "game",
          size: gameSize,
          x: Math.max(0, width * 0.06),
          y: Math.max(0, height * 0.33 - gameSize / 2),
          vx: 0.019 + Math.random() * 0.013,
          vy: -0.013 - Math.random() * 0.012,
        },
        {
          section: "tech",
          size: techSize,
          x: Math.max(gameSize + gap, width * 0.52),
          y: Math.max(0, height * 0.24 - techSize / 2),
          vx: -0.017 - Math.random() * 0.012,
          vy: 0.014 + Math.random() * 0.013,
        },
      ];

      for (const body of bodiesRef.current) {
        clampBody(body, width, height);
      }

      applyBodies();
    }

    function randomizeBounce(body: FloatingBubbleBody) {
      const speed = 0.017 + Math.random() * 0.02;
      const angle = Math.atan2(body.vy, body.vx) + (Math.random() - 0.5) * 0.72;

      body.vx = Math.cos(angle) * speed;
      body.vy = Math.sin(angle) * speed;
    }

    function tick(timestamp: number) {
      const { width, height } = arenaElement.getBoundingClientRect();
      const previous = lastFrameRef.current ?? timestamp;
      const dt = Math.min(34, timestamp - previous);

      lastFrameRef.current = timestamp;

      for (const body of bodiesRef.current) {
        body.x += body.vx * dt;
        body.y += body.vy * dt;

        if (body.x <= 0 || body.x + body.size >= width) {
          body.vx *= -1;
          randomizeBounce(body);
        }

        if (body.y <= 0 || body.y + body.size >= height) {
          body.vy *= -1;
          randomizeBounce(body);
        }

        clampBody(body, width, height);
      }

      const [game, tech] = bodiesRef.current;

      if (game && tech) {
        const gameCenterX = game.x + game.size / 2;
        const gameCenterY = game.y + game.size / 2;
        const techCenterX = tech.x + tech.size / 2;
        const techCenterY = tech.y + tech.size / 2;
        const dx = techCenterX - gameCenterX;
        const dy = techCenterY - gameCenterY;
        const distance = Math.max(1, Math.hypot(dx, dy));
        const minimumDistance = (game.size + tech.size) / 2 + 8;

        if (distance < minimumDistance) {
          const nx = dx / distance;
          const ny = dy / distance;
          const overlap = minimumDistance - distance;

          game.x -= (nx * overlap) / 2;
          game.y -= (ny * overlap) / 2;
          tech.x += (nx * overlap) / 2;
          tech.y += (ny * overlap) / 2;

          const gameSpeed = 0.018 + Math.random() * 0.017;
          const techSpeed = 0.018 + Math.random() * 0.017;
          const angle = Math.atan2(ny, nx) + (Math.random() - 0.5) * 0.62;

          game.vx = -Math.cos(angle) * gameSpeed;
          game.vy = -Math.sin(angle) * gameSpeed;
          tech.vx = Math.cos(angle) * techSpeed;
          tech.vy = Math.sin(angle) * techSpeed;

          clampBody(game, width, height);
          clampBody(tech, width, height);
        }
      }

      applyBodies();
      frameRef.current = window.requestAnimationFrame(tick);
    }

    resetBodies();

    if (!reducedMotion) {
      frameRef.current = window.requestAnimationFrame(tick);
    }

    const resizeObserver = new ResizeObserver(resetBodies);
    resizeObserver.observe(arenaElement);

    return () => {
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
      }

      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div
      ref={arenaRef}
      className="absolute inset-x-0 bottom-0 top-[132px] overflow-hidden"
      aria-label="Career deck sections"
    >
      {(["game", "tech"] as const).map((section) => (
        <button
          key={section}
          ref={(node) => {
            bubbleRefs.current[section] = node;
          }}
          type="button"
          onClick={() => onOpenSection(section)}
          className="absolute left-0 top-0 flex items-center justify-center rounded-full border border-white/45 bg-white/18 text-4xl font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_24px_80px_rgba(101,36,112,0.16)] backdrop-blur-2xl transition-[background,box-shadow,transform] hover:scale-[1.02] hover:bg-white/24 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          style={{
            width: section === "game" ? 340 : 310,
            height: section === "game" ? 340 : 310,
            transform: section === "game" ? "translate3d(28px, 132px, 0)" : "translate3d(430px, 84px, 0)",
            willChange: "transform",
          }}
        >
          {section === "game" ? "Game" : "Tech"}
        </button>
      ))}
    </div>
  );
}

function OpportunitiesPage({
  activeSection,
  categories,
  counts,
  lastSyncedAt,
  liveSourceStatuses,
  opportunities,
  query,
  gameFilters,
  onBack,
  onCategoryChange,
  onGameFilterChange,
  onQueryChange,
  onSelectOpportunity,
  onSectionChange,
}: {
  activeSection: OpportunitySection | "all";
  categories: Record<OpportunitySection, CategoryFilter>;
  counts: { all: number; tech: number; game: number };
  lastSyncedAt?: string;
  liveSourceStatuses: LiveSourceStatus[];
  opportunities: Opportunity[];
  query: string;
  gameFilters: GameMonitorFilters;
  onBack: () => void;
  onCategoryChange: (section: OpportunitySection, value: CategoryFilter) => void;
  onGameFilterChange: <Key extends keyof GameMonitorFilters>(
    key: Key,
    value: GameMonitorFilters[Key],
  ) => void;
  onQueryChange: (value: string) => void;
  onSelectOpportunity: (opportunity: Opportunity) => void;
  onSectionChange: (section: OpportunitySection | "all") => void;
}) {
  return (
    <main className="min-h-screen bg-[#f3e5f5] text-black">
      <section className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_0%_0%,rgba(193,139,202,0.95)_0%,rgba(218,184,224,0.86)_48%,rgba(243,229,245,0.98)_100%)] pb-10 pl-0 pr-5 pt-10 sm:pr-8 lg:pr-12">
        <LiquidEtherBackground variant="opportunities" />
        <GlassBackButton onClick={onBack} label="Back to home" />
        <header className="relative z-10 flex max-w-[1440px] flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <DeckHeadline className="shrink-0" />

          <div className="grid w-full max-w-[520px] gap-3">
            <label className="relative">
              <span className="sr-only">Search career deck</span>
              <Search
                size={18}
                className="absolute left-5 top-1/2 -translate-y-1/2 text-black/55"
                aria-hidden="true"
              />
              <input
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder="Search roles, companies, programs"
                className="h-12 w-full rounded-full border border-white/60 bg-white/20 pl-12 pr-5 text-sm text-black outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_18px_55px_rgba(101,36,112,0.14)] backdrop-blur-2xl placeholder:text-black/48 focus:border-white"
              />
            </label>
            <div className="grid grid-cols-3 gap-2 rounded-full border border-white/50 bg-white/18 p-1 text-sm font-semibold backdrop-blur-2xl">
              {(["all", "game", "tech"] as const).map((section) => (
                <button
                  key={section}
                  type="button"
                  onClick={() => onSectionChange(section)}
                  className={`h-9 rounded-full capitalize ${activeSection === section ? "bg-white/70" : ""}`}
                >
                  {section}
                </button>
              ))}
            </div>
          </div>
        </header>

        {activeSection === "game" && (
          <GameMonitorPanel
            filters={gameFilters}
            opportunities={opportunities}
            onFilterChange={onGameFilterChange}
            onSelectOpportunity={onSelectOpportunity}
          />
        )}

        <div className="relative z-10">
          <ReportCharts opportunities={opportunities} />
        </div>

        <section className="relative z-10 mx-auto mt-8 grid w-[calc(100%-2.5rem)] max-w-[1368px] gap-5 sm:w-[calc(100%-4rem)] md:grid-cols-2 lg:w-[calc(100%-6rem)] xl:grid-cols-3">
          {opportunities.length ? (
            opportunities.map((opportunity) => (
              <OpportunityCard
                key={opportunity.id}
                opportunity={opportunity}
                onSelect={() => onSelectOpportunity(opportunity)}
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
          lastSyncedAt={lastSyncedAt}
          liveSourceStatuses={liveSourceStatuses}
          onCategoryChange={onCategoryChange}
        />
      </section>
    </main>
  );
}

function GameMonitorPanel({
  filters,
  opportunities,
  onFilterChange,
  onSelectOpportunity,
}: {
  filters: GameMonitorFilters;
  opportunities: Opportunity[];
  onFilterChange: <Key extends keyof GameMonitorFilters>(
    key: Key,
    value: GameMonitorFilters[Key],
  ) => void;
  onSelectOpportunity: (opportunity: Opportunity) => void;
}) {
  const linkedOpportunities = opportunities
    .map((opportunity) => ({
      opportunity,
      monitor: getGameMonitorRecord(opportunity.id),
    }))
    .filter((item): item is { opportunity: Opportunity; monitor: GameMonitorOpportunity } => Boolean(item.monitor));
  const actionableLinkedOpportunities = linkedOpportunities.filter((item) =>
    isVerifiedActionableOpportunity(item.opportunity, item.monitor),
  );
  const bestFit =
    actionableLinkedOpportunities.find(
      (item) => item.monitor.opportunityId === gameMonitorData.dailyBrief.bestFitOpportunityId,
    ) ?? actionableLinkedOpportunities.toSorted((a, b) => b.monitor.fitScore - a.monitor.fitScore)[0];
  const urgent = actionableLinkedOpportunities
    .filter((item) => item.monitor.monitorStatus === "urgent")
    .toSorted((a, b) => b.monitor.fitScore - a.monitor.fitScore)
    .slice(0, 3);
  const newestHighFit = newestHighFitGameMonitors(actionableLinkedOpportunities, 4);

  return (
    <section className="relative z-10 mx-auto mt-8 grid w-[calc(100%-2.5rem)] max-w-[1368px] gap-5 sm:w-[calc(100%-4rem)] lg:w-[calc(100%-6rem)]">
      <div className="grid gap-5 rounded-[29px] border border-white/55 bg-white/20 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.64),0_28px_90px_rgba(101,36,112,0.14)] backdrop-blur-2xl xl:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold">Game opportunities monitor</h2>
              <p className="mt-1 text-sm font-medium text-black/58">
                Daily 7 PM Pacific watchlist for verified game roles, urgent deadlines, and portfolio prep.
              </p>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center text-xs font-semibold">
              <MetricChip label="New" value={gameMonitorData.dailyBrief.newRolesFound} />
              <MetricChip label="Urgent" value={gameMonitorData.dailyBrief.urgent} />
              <MetricChip label="Open" value={gameMonitorData.dailyBrief.stillOpen} />
              <MetricChip label="Dupes" value={gameMonitorData.dailyBrief.duplicates ?? gameMonitorData.duplicateRecords?.length ?? 0} />
            </div>
          </div>

          <div className="mt-5 grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,10.5rem),1fr))] gap-3">
            <GameFilterSelect
              label="Company"
              value={filters.company}
              options={gameMonitorFilterOptions.companies}
              onChange={(value) => onFilterChange("company", value)}
            />
            <GameFilterSelect
              label="Location"
              value={filters.locationMode}
              options={gameMonitorFilterOptions.locationModes}
              onChange={(value) => onFilterChange("locationMode", value as GameMonitorFilters["locationMode"])}
            />
            <GameFilterSelect
              label="Track"
              value={filters.roleTrack}
              options={gameMonitorFilterOptions.roleTracks}
              onChange={(value) => onFilterChange("roleTrack", value as GameMonitorFilters["roleTrack"])}
            />
            <GameFilterSelect
              label="Status"
              value={filters.status}
              options={gameMonitorFilterOptions.statuses}
              onChange={(value) => onFilterChange("status", value as GameMonitorFilters["status"])}
            />
            <label className="grid min-w-0 gap-1 text-xs font-semibold text-black/60">
              Fit score
              <select
                value={filters.minFit}
                onChange={(event) => onFilterChange("minFit", Number(event.target.value))}
                className="h-10 w-full min-w-0 max-w-full rounded-full border border-white/45 bg-white/24 px-3 text-sm font-semibold text-black outline-none backdrop-blur-2xl"
              >
                {[0, 6, 7, 8, 9, 10].map((score) => (
                  <option key={score} value={score}>
                    {score === 0 ? "All" : `${score}+`}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[24px] border border-white/45 bg-white/18 p-4">
              <p className="text-sm font-semibold text-black/52">Best-fit role today</p>
              {bestFit ? (
                <button
                  type="button"
                  onClick={() => onSelectOpportunity(bestFit.opportunity)}
                  className="mt-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-[#8f00b8]"
                >
                  <span className="block text-xl font-semibold">{bestFit.monitor.roleTitle}</span>
                  <span className="mt-1 block text-sm font-medium text-black/64">
                    {bestFit.monitor.company} - fit {bestFit.monitor.fitScore}/10
                  </span>
                  <span className="mt-2 block text-sm text-black/64">{bestFit.monitor.fitReason}</span>
                </button>
              ) : (
                <p className="mt-2 text-sm font-medium text-black/60">No fit-ranked role matches the current filters.</p>
              )}
            </div>

            <div className="rounded-[24px] border border-white/45 bg-white/18 p-4">
              <p className="text-sm font-semibold text-black/52">Urgent deadlines</p>
              <div className="mt-3 grid gap-2">
                {urgent.length ? (
                  urgent.map((item) => (
                    <button
                      key={item.opportunity.id}
                      type="button"
                      onClick={() => onSelectOpportunity(item.opportunity)}
                      className="rounded-[18px] bg-white/18 px-3 py-2 text-left text-sm font-semibold outline-none transition hover:bg-white/30 focus-visible:ring-2 focus-visible:ring-[#8f00b8]"
                    >
                      {item.monitor.company}: {item.monitor.roleTitle}
                      <span className="block text-xs font-medium text-black/58">{item.monitor.blockersRisks[0]}</span>
                    </button>
                  ))
                ) : (
                  <p className="text-sm font-medium text-black/60">No urgent roles match the current filters.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="rounded-[24px] border border-white/45 bg-white/18 p-4">
            <h3 className="text-lg font-semibold">Newest high-fit opportunities</h3>
            <div className="mt-3 grid gap-2">
              {newestHighFit.map((item) => (
                <button
                  key={item.opportunity.id}
                  type="button"
                  onClick={() => onSelectOpportunity(item.opportunity)}
                  className="grid grid-cols-[44px_1fr] gap-3 rounded-[18px] bg-white/18 px-3 py-2 text-left text-sm outline-none transition hover:bg-white/30 focus-visible:ring-2 focus-visible:ring-[#8f00b8]"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/45 text-sm font-semibold">
                    {item.monitor.fitScore}
                  </span>
                  <span>
                    <strong className="block">{item.monitor.roleTitle}</strong>
                    <span className="text-black/62">{item.monitor.company} - {formatMonitorStatus(item.monitor.monitorStatus)}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-white/45 bg-white/18 p-4">
            <h3 className="text-lg font-semibold">Daily Brief</h3>
            <p className="mt-1 text-sm font-medium text-black/62">{gameMonitorData.dailyBrief.summary}</p>
            <div className="mt-3 grid gap-2">
              {gameMonitorData.dailyBrief.changes.map((change) => (
                <p key={`${change.kind}-${change.label}`} className="rounded-[16px] bg-white/16 px-3 py-2 text-xs font-semibold text-black/66">
                  {change.label}: {change.detail}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[29px] border border-white/55 bg-white/18 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.58),0_24px_70px_rgba(101,36,112,0.12)] backdrop-blur-2xl">
        <h2 className="text-xl font-semibold">Portfolio Prep</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {gamePortfolioPrep.map((item) => (
            <article key={item.id} className="rounded-[20px] border border-white/40 bg-white/16 p-3">
              <h3 className="text-sm font-semibold">{item.title}</h3>
              <p className="mt-1 text-xs font-medium text-black/60">{item.why}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {item.artifacts.slice(0, 3).map((artifact) => (
                  <span key={artifact} className="rounded-full bg-white/28 px-2 py-1 text-[11px] font-semibold text-black/62">
                    {artifact}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function GameFilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | number;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid min-w-0 gap-1 text-xs font-semibold text-black/60">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full min-w-0 max-w-full rounded-full border border-white/45 bg-white/24 px-3 text-sm font-semibold text-black outline-none backdrop-blur-2xl"
      >
        <option value="all">All</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {formatMonitorStatus(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

function OpportunityCard({
  opportunity,
  onSelect,
}: {
  opportunity: Opportunity;
  onSelect: () => void;
}) {
  const priority = isPriority(opportunity);
  const statusLabel = opportunity.needsReview ? "Source check" : priority ? "Priority" : "Standard";
  const reportInsight = opportunityReportInsights[opportunity.id];
  const gameMonitor = getGameMonitorRecord(opportunity.id);

  return (
    <article className="relative min-h-[430px] min-w-0 rounded-[29px] border border-white/45 bg-white/20 px-5 pb-4 pt-14 shadow-[inset_0_1px_0_rgba(255,255,255,0.62),0_28px_70px_rgba(92,38,105,0.12)] backdrop-blur-2xl transition duration-200 hover:-translate-y-1 hover:bg-white/28">
      <span
        className={`absolute left-4 top-4 rounded-full px-3 py-0.5 text-xs font-medium text-white shadow-[0_8px_22px_rgba(103,0,130,0.18)] ${
          opportunity.needsReview ? "bg-[#6d6470]" : priority ? "bg-[#a100c6]" : "bg-[#d774dc]"
        }`}
      >
        {statusLabel}
      </span>

      <button
        type="button"
        onClick={onSelect}
        className="grid h-full min-w-0 w-full grid-rows-[auto_auto_1fr_auto] text-center outline-none focus-visible:ring-2 focus-visible:ring-[#8f00b8]"
      >
        <span className="min-w-0 text-base font-semibold leading-snug [overflow-wrap:anywhere]">
          {formatOpportunityType(opportunity.type)} {plainText(opportunity.title)}
        </span>
        <span className="mt-1 block min-w-0 text-2xl font-thin leading-tight [overflow-wrap:anywhere]">
          {plainText(opportunity.organization)}
        </span>

        <span className="mt-4 grid gap-3">
          <span className="flex min-h-[104px] min-w-0 items-center justify-center rounded-[27px] border border-white/45 bg-white/18 px-4 text-sm font-semibold leading-snug [overflow-wrap:anywhere] shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
            {conciseSummary(opportunity)}
          </span>
          <FitnessBreakdown opportunity={opportunity} compact />
        </span>

        {reportInsight && (
          <span className="mt-3 grid min-w-0 grid-cols-[96px_minmax(0,1fr)] gap-2 rounded-[20px] border border-white/45 bg-white/16 px-3 py-2 text-left text-xs font-semibold leading-snug [overflow-wrap:anywhere]">
            <span className="rounded-full bg-white/38 px-2 py-1 text-center">{reportInsight.fit}</span>
            <span>
              {reportInsight.bucket}: {reportInsight.action}
            </span>
          </span>
        )}

        {gameMonitor && (
          <span className="mt-3 grid min-w-0 grid-cols-[86px_minmax(0,1fr)] gap-2 rounded-[20px] border border-white/45 bg-white/16 px-3 py-2 text-left text-xs font-semibold leading-snug [overflow-wrap:anywhere]">
            <span className="rounded-full bg-white/38 px-2 py-1 text-center">{gameMonitor.fitScore}/10</span>
            <span>
              {formatMonitorStatus(gameMonitor.roleTrack)} - {formatMonitorStatus(gameMonitor.monitorStatus)}
            </span>
          </span>
        )}

        <span className="mt-4 block text-sm font-semibold">
          {formatDateLabel(opportunity.discoveredAt)} - {deadlineLabel(opportunity.deadline)}
        </span>
      </button>
    </article>
  );
}

function ReportCharts({ opportunities }: { opportunities: Opportunity[] }) {
  const activeReports = reportConfigs
    .map((report) => ({
      report,
      records: opportunities.filter((opportunity) => opportunity.id.startsWith(report.idPrefix)),
    }))
    .filter(({ records }) => records.length);

  if (!activeReports.length) {
    return null;
  }

  return (
    <div className="mx-auto mt-8 grid w-[calc(100%-2.5rem)] max-w-[1368px] gap-6 sm:w-[calc(100%-4rem)] lg:w-[calc(100%-6rem)]">
      {activeReports.map(({ report, records }) => (
        <ReportPanel key={report.section} report={report} records={records} />
      ))}
    </div>
  );
}

function ReportPanel({ report, records }: { report: ReportConfig; records: Opportunity[] }) {
  const openCount = records.filter((opportunity) => opportunity.status === "open").length;
  const closedCount = records.filter((opportunity) => opportunity.status === "closed").length;
  const reviewCount = records.filter((opportunity) => opportunity.needsReview).length;
  const maxBucket = Math.max(...report.buckets.map((bucket) => bucket.value));

  return (
    <section className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
      <div className="rounded-[29px] border border-white/50 bg-white/18 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_24px_80px_rgba(101,36,112,0.12)] backdrop-blur-2xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">{report.title}</h2>
            <p className="mt-1 text-sm font-medium text-black/58">{report.subtitle}</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs font-semibold">
            <MetricChip label="Open" value={openCount} />
            <MetricChip label="Review" value={reviewCount} />
            <MetricChip label="Closed" value={closedCount} />
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          {report.buckets.map((bucket) => (
            <div key={bucket.label} className="grid gap-1.5">
              <div className="flex items-center justify-between gap-3 text-sm font-semibold">
                <span>{bucket.label}</span>
                <span>{bucket.value}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full border border-white/40 bg-white/24">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(8, (bucket.value / maxBucket) * 100)}%`,
                    backgroundColor: report.accent,
                  }}
                />
              </div>
              <p className="text-xs font-medium text-black/55">{bucket.note}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4">
        <div className="rounded-[29px] border border-white/50 bg-white/18 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_24px_80px_rgba(101,36,112,0.12)] backdrop-blur-2xl">
          <h2 className="text-xl font-semibold">Apply priority</h2>
          <div className="mt-4 grid gap-3">
            {report.priorityRoles.map((item) => (
              <div key={item.rank} className="grid grid-cols-[32px_1fr] gap-3 rounded-[20px] border border-white/40 bg-white/16 p-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/48 text-sm font-semibold">
                  {item.rank}
                </span>
                <span className="text-sm font-medium leading-snug">
                  <strong className="block">{item.role}</strong>
                  <span className="text-black/62">{item.reason}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[29px] border border-white/50 bg-white/18 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_24px_80px_rgba(101,36,112,0.12)] backdrop-blur-2xl">
          <h2 className="text-xl font-semibold">Fitness signals</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {report.signals.map((signal) => (
              <span key={signal} className="rounded-full border border-white/45 bg-white/22 px-3 py-1 text-xs font-semibold">
                {signal}
              </span>
            ))}
          </div>
          <div className="mt-4 grid gap-2">
            {report.fixes.map((fix) => (
              <p key={fix} className="rounded-[18px] bg-white/16 px-3 py-2 text-xs font-semibold text-black/65">
                {fix}
              </p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function MetricChip({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded-[18px] border border-white/45 bg-white/22 px-3 py-2">
      <span className="block text-lg leading-none">{value}</span>
      <span className="text-black/52">{label}</span>
    </span>
  );
}

function GlassBackButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="fixed left-3 top-3 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-white/60 bg-white/24 text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_10px_28px_rgba(96,0,118,0.14)] backdrop-blur-2xl transition hover:scale-[1.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7b00a7]"
    >
      <ArrowLeft size={20} strokeWidth={2.4} aria-hidden="true" />
    </button>
  );
}

function DetailPage({
  opportunity,
  conversationSources,
  conversationSnapshots,
  liveSourceStatuses,
  onClose,
}: {
  opportunity: Opportunity;
  conversationSources: ConversationSource[];
  conversationSnapshots: ConversationSnapshot[];
  liveSourceStatuses: LiveSourceStatus[];
  onClose: () => void;
}) {
  const source = conversationSources.find((item) => item.id === opportunity.sourceId);
  const snapshot = conversationSnapshots.find((item) => item.sourceId === opportunity.sourceId);
  const liveSource = liveSourceStatuses.find((item) => item.sourceId === opportunity.sourceId);
  const reportInsight = opportunityReportInsights[opportunity.id];
  const gameMonitor = getGameMonitorRecord(opportunity.id);

  return (
    <main className="min-h-screen bg-[#f3e5f5] text-black">
      <section className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_0%_0%,rgba(243,229,245,1)_0%,rgba(226,176,234,0.92)_100%)] py-6 sm:py-8">
        <DeckHeadline />

        <div className="px-3 sm:px-4">
          <div className="relative mx-auto mt-5 min-h-[calc(100vh-210px)] max-w-[1440px] rounded-[44px] border border-white/45 bg-white/18 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_30px_120px_rgba(96,0,118,0.18)] backdrop-blur-2xl sm:rounded-[64px] sm:p-8 lg:p-10 xl:rounded-[96px] xl:p-14">
            <button
              type="button"
              onClick={onClose}
              className="absolute right-5 top-5 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/55 bg-white/22 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_12px_35px_rgba(96,0,118,0.12)] backdrop-blur-2xl transition hover:bg-white/34 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7b00a7] sm:right-8 sm:top-8"
              aria-label="Close details"
            >
              <X size={22} aria-hidden="true" />
            </button>

            <div className="grid min-w-0 gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(340px,400px)]">
              <div className="min-w-0">
                <div className="flex min-w-0 flex-col items-start gap-3 pr-14 text-left sm:flex-row sm:gap-4 xl:pr-0">
                  <span
                    className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium text-white shadow-[0_8px_22px_rgba(103,0,130,0.14)] ${
                      isPriority(opportunity) ? "bg-[#7b00a7]" : "bg-[#d774dc]"
                    }`}
                  >
                    {isPriority(opportunity) ? "Priority" : "Standard"}
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-xl font-semibold leading-tight [overflow-wrap:anywhere] sm:text-2xl lg:text-3xl">
                      {formatOpportunityType(opportunity.type)} {plainText(opportunity.title)}
                    </h2>
                    <p className="mt-1 text-2xl font-thin leading-tight [overflow-wrap:anywhere] sm:text-3xl">
                      {plainText(opportunity.organization)}
                    </p>
                  </div>
                </div>

                <div className="mt-6 min-w-0 rounded-[32px] border border-white/45 bg-white/18 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] sm:p-6 lg:p-8">
                  <div className="grid min-w-0 gap-5">
                    <p className="mx-auto max-w-[70ch] text-left text-base font-semibold leading-7 text-black/82 [overflow-wrap:anywhere] sm:text-lg">
                      {detailSummary(opportunity)}
                    </p>
                    <div className="grid min-w-0 gap-3 text-sm font-medium text-black/70 md:grid-cols-2 sm:text-base">
                      <DetailPill label="Compensation" value={opportunity.compensation} />
                      <DetailPill label="Eligibility" value={opportunity.eligibility} />
                      <DetailPill label="Location" value={opportunity.location} />
                      <DetailPill label="Deadline" value={opportunity.deadline} />
                    </div>
                  </div>
                </div>
              </div>

              <aside className="flex min-w-0 flex-col items-stretch justify-start gap-5 text-center xl:pt-4">
                <div className="min-w-0">
                  <p className="text-3xl font-semibold">My fitness rate</p>
                  <FitnessBreakdown opportunity={opportunity} />
                  {reportInsight && (
                    <div className="mt-4 rounded-[24px] border border-white/45 bg-white/18 p-4 text-left text-sm font-semibold leading-snug shadow-[inset_0_1px_0_rgba(255,255,255,0.42)]">
                      <p className="text-xs uppercase text-black/48">Library report read</p>
                      <p className="mt-1">{reportInsight.fit} fit - {reportInsight.bucket}</p>
                      <p className="mt-2 text-black/62">{reportInsight.action}</p>
                    </div>
                  )}
                  {gameMonitor && <GameMonitorDetail monitor={gameMonitor} />}
                </div>

                <div className="grid w-full gap-3 text-sm font-medium text-black/70">
                  <SourceLine label="Source" value={source?.name ?? opportunity.sourceId} />
                  <SourceLine label="Fetch" value={sourceStatus(snapshot, liveSource)} />
                  <SourceLine
                    label="Confidence"
                    value={`${Math.round(opportunity.confidence.source * 100)}% source`}
                  />
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
        </div>
      </section>
    </main>
  );
}

function GameMonitorDetail({ monitor }: { monitor: GameMonitorOpportunity }) {
  return (
    <div className="mt-4 min-w-0 rounded-[24px] border border-white/45 bg-white/18 p-4 text-left text-sm font-semibold leading-snug [overflow-wrap:anywhere] shadow-[inset_0_1px_0_rgba(255,255,255,0.42)]">
      <p className="text-xs uppercase text-black/48">Game monitor fit</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <span className="rounded-full bg-white/38 px-3 py-1">{monitor.fitScore}/10 fit</span>
        <span className="rounded-full bg-white/38 px-3 py-1">{formatMonitorStatus(monitor.roleTrack)}</span>
        <span className="rounded-full bg-white/38 px-3 py-1">{formatMonitorStatus(monitor.locationMode)}</span>
        <span className="rounded-full bg-white/38 px-3 py-1">{formatMonitorStatus(monitor.monitorStatus)}</span>
      </div>
      <p className="mt-3 text-black/68">{monitor.fitReason}</p>
      <div className="mt-3 grid gap-3">
        <DetailMiniList label="Risks" items={monitor.blockersRisks} />
        <DetailMiniList label="Prep checklist" items={monitor.portfolioMaterials} />
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <a
          href={monitor.applicationLink}
          target="_blank"
          rel="noreferrer"
          className="rounded-full bg-[#7b00a7] px-4 py-2 text-center text-xs font-semibold text-white"
        >
          Application source
        </a>
        <a
          href={monitor.sourceLink}
          target="_blank"
          rel="noreferrer"
          className="rounded-full border border-white/45 bg-white/22 px-4 py-2 text-center text-xs font-semibold text-black"
        >
          Monitor source
        </a>
      </div>
    </div>
  );
}

function DetailMiniList({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <p className="text-xs uppercase text-black/48">{label}</p>
      <ul className="mt-1 grid min-w-0 gap-1 text-xs font-medium text-black/66 [overflow-wrap:anywhere]">
        {items.map((item) => (
          <li key={item}>- {item}</li>
        ))}
      </ul>
    </div>
  );
}

function DeckStatusBar({
  categories,
  counts,
  lastSyncedAt,
  liveSourceStatuses,
  onCategoryChange,
}: {
  categories: Record<OpportunitySection, CategoryFilter>;
  counts: { all: number; tech: number; game: number };
  lastSyncedAt?: string;
  liveSourceStatuses: LiveSourceStatus[];
  onCategoryChange: (section: OpportunitySection, value: CategoryFilter) => void;
}) {
  return (
    <div className="relative z-20 mx-auto mt-8 w-[calc(100%-2.5rem)] max-w-[1260px] rounded-[36px] border border-white/60 bg-white/24 px-5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_18px_55px_rgba(96,0,118,0.14)] backdrop-blur-2xl sm:w-[calc(100%-4rem)] lg:w-[calc(100%-6rem)] lg:rounded-full">
      <div className="grid items-center gap-3 text-center text-sm font-semibold sm:grid-cols-2 lg:grid-cols-4">
        <span>Total records {counts.all}</span>
        <CategorySelect
          label={`Game category ${counts.game}`}
          value={categories.game}
          onChange={(value) => onCategoryChange("game", value)}
        />
        <CategorySelect
          label={`Tech category ${counts.tech}`}
          value={categories.tech}
          onChange={(value) => onCategoryChange("tech", value)}
        />
        <span title={liveExtractionLabel(liveSourceStatuses)}>Last sync {formatSyncTimestamp(lastSyncedAt)}</span>
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
        className="h-12 w-full appearance-none rounded-full border border-white/40 bg-white/18 px-4 pr-9 text-center text-xl font-semibold text-black outline-none backdrop-blur-2xl"
      >
        {categoryOptions.map((item) => (
          <option key={item.value} value={item.value}>
            {label}: {item.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={17}
        className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2"
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

function FitnessBreakdown({
  opportunity,
  compact = false,
}: {
  opportunity: Opportunity;
  compact?: boolean;
}) {
  const rating = fitnessRating(opportunity);
  const confidenceRows = [
    { label: "Source", value: opportunity.confidence.source, tone: "bg-[#9e00b8]" },
    { label: "Extract", value: opportunity.confidence.extraction, tone: "bg-[#b83bc8]" },
    { label: "Fresh", value: opportunity.confidence.freshness, tone: "bg-[#7b00a7]" },
    { label: "Low dup", value: 1 - opportunity.confidence.duplicateProbability, tone: "bg-[#d774dc]" },
  ];

  return (
    <span
      className={`block rounded-[27px] border border-white/45 bg-white/18 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] ${
        compact ? "px-4 py-3 text-xs" : "mt-6 px-5 py-5 text-sm"
      }`}
    >
      <span className="flex items-center justify-between gap-3 font-semibold">
        <span>{compact ? "Fitness detail" : "Detailed fitness rating"}</span>
        <span className="flex items-center gap-2">
          <FitnessDots rating={rating} compact />
          <span>{rating}/5</span>
        </span>
      </span>

      <span className={`mt-3 grid ${compact ? "gap-2" : "gap-3"}`}>
        {confidenceRows.map((row) => (
          <span key={row.label} className="grid gap-1">
            <span className="flex justify-between gap-3 font-semibold text-black/68">
              <span>{row.label}</span>
              <span>{Math.round(row.value * 100)}%</span>
            </span>
            <span className="h-2 overflow-hidden rounded-full bg-white/34">
              <span className={`block h-full rounded-full ${row.tone}`} style={{ width: `${Math.round(row.value * 100)}%` }} />
            </span>
          </span>
        ))}
      </span>
    </span>
  );
}

function DetailPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[22px] border border-white/45 bg-white/18 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]">
      <p className="text-xs uppercase text-black/48">{label}</p>
      <p className="mt-1 leading-6 [overflow-wrap:anywhere]">{plainText(value)}</p>
    </div>
  );
}

function SourceLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-4 rounded-[20px] border border-white/45 bg-white/16 px-5 py-3">
      <span className="text-black/50">{label}</span>
      <span className="min-w-0 text-right [overflow-wrap:anywhere]">{value}</span>
    </div>
  );
}

function isPriority(opportunity: Opportunity) {
  return (
    !opportunity.needsReview &&
    opportunity.confidence.source >= 0.8 &&
    opportunity.confidence.freshness >= 0.65
  );
}

function isVerifiedActionableOpportunity(
  opportunity: Opportunity,
  monitor?: GameMonitorOpportunity,
) {
  return Boolean(
    monitor?.verified &&
      !opportunity.needsReview &&
      monitor.monitorStatus !== "closed" &&
      opportunity.status !== "closed",
  );
}

function isVerifiedGameDisplayOpportunity(opportunity: Opportunity) {
  if (opportunity.needsReview || opportunity.status === "closed") {
    return false;
  }

  const monitor = getGameMonitorRecord(opportunity.id);

  if (monitor) {
    return monitor.verified && monitor.monitorStatus !== "closed" && monitor.monitorStatus !== "stale";
  }

  return opportunity.confidence.source >= 0.9 && opportunity.confidence.extraction >= 0.8;
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
  const eligibility = plainText(opportunity.eligibility);

  if (eligibility && eligibility !== "TBD") {
    return clampText(eligibility, 70);
  }

  const evidence = displayEvidence(opportunity);

  if (evidence) {
    return clampText(evidence, 70);
  }

  return `${formatOpportunityType(opportunity.type)} opportunity`;
}

function detailSummary(opportunity: Opportunity) {
  const evidence = displayEvidence(opportunity);

  if (evidence) {
    return clampText(evidence, 260);
  }

  return `${opportunity.organization} ${formatOpportunityType(opportunity.type)} record synced from ${opportunity.sourceId}.`;
}

function displayEvidence(opportunity: Opportunity) {
  return opportunity.evidence
    .map((item) =>
      plainText(item)
        .replace(/verified official application route:\s*(?:https?:\/\/\S+)?/gi, "")
        .replace(/https?:\/\/\S+/gi, "")
        .replace(/^[\s,;:.-]+/, "")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean)
    .join(" ")
    .trim();
}

function clampText(value: string, limit: number) {
  return value.length > limit ? `${value.slice(0, limit - 1).trim()}...` : value;
}

function deadlineLabel(value: string) {
  const deadline = plainText(value);

  return deadline && deadline !== "TBD" ? deadline : "deadline TBD";
}

function formatMonitorStatus(value: string) {
  return value
    .replaceAll("_", " ")
    .replaceAll("/", " / ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
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
    const existing = byId.get(opportunity.id);

    byId.set(opportunity.id, {
      ...(existing ?? {}),
      ...opportunity,
      discoveredAt: existing?.discoveredAt ?? opportunity.discoveredAt,
    });
  }

  return Array.from(byId.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function latestDiscoveredTimestamp(opportunities: Opportunity[]) {
  let latestValue: string | undefined;
  let latestTime = Number.NEGATIVE_INFINITY;

  for (const opportunity of opportunities) {
    const discoveredTime = Date.parse(opportunity.discoveredAt);

    if (!Number.isNaN(discoveredTime) && discoveredTime > latestTime) {
      latestTime = discoveredTime;
      latestValue = opportunity.discoveredAt;
    }
  }

  return latestValue;
}

function formatSyncTimestamp(value?: string) {
  return value ? formatTimestamp(value) : "TBD";
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
