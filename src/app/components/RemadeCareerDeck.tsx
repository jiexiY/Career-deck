"use client";

import { ArrowLeft, ChevronDown, ExternalLink, Search, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  ConversationSnapshot,
  ConversationSource,
  LiveUpdate,
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

export function RemadeCareerDeck({
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

  const counts = useMemo(
    () => ({
      all: deckOpportunities.length,
      tech: deckOpportunities.filter((item) => (item.section ?? "tech") === "tech").length,
      game: deckOpportunities.filter((item) => item.section === "game").length,
    }),
    [deckOpportunities],
  );

  const visibleOpportunities = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return deckOpportunities.filter((opportunity) => {
      const section = opportunity.section ?? "tech";
      const matchesSection = activeSection === "all" || activeSection === section;
      const matchesCategory = categories[section] === "all" || opportunity.type === categories[section];
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

      return matchesSection && matchesCategory && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [activeSection, categories, deckOpportunities, query]);

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
        liveUpdates={liveUpdates}
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
      liveUpdates={liveUpdates}
      liveSourceStatuses={liveSourceStatuses}
      opportunities={visibleOpportunities}
      query={query}
      onBack={() => setView("home")}
      onCategoryChange={(section, value) =>
        setCategories((current) => ({ ...current, [section]: value }))
      }
      onQueryChange={setQuery}
      onSelectOpportunity={setSelectedOpportunity}
      onSectionChange={setActiveSection}
    />
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
    <main className="min-h-screen bg-white text-black">
      <section className="relative mx-auto min-h-screen max-w-[1440px] overflow-hidden px-6 py-10">
        <div className="absolute left-6 top-5 z-10 w-[min(790px,calc(100%-3rem))] rounded-[120px] border border-black/5 bg-white/58 px-10 py-11 shadow-[0_30px_85px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-2xl">
          <h1 className="text-6xl font-thin leading-none tracking-normal sm:text-7xl lg:text-8xl">
            Career Deck
          </h1>
        </div>

        <Image
          src="/career-deck-landing.jpg"
          alt="Career Deck cover artwork"
          width={4564}
          height={3006}
          priority
          className="absolute bottom-[120px] right-0 h-auto w-[min(82vw,1150px)] object-contain"
        />

        <div className="absolute bottom-7 right-10 z-10 w-[min(810px,calc(100%-5rem))] rounded-[70px] border border-black/5 bg-white/55 px-8 py-6 shadow-[0_24px_70px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-2xl">
          <div className="grid items-center gap-4 md:grid-cols-[1fr_240px_120px]">
            <p className="font-serif text-5xl italic leading-none">To my beloved</p>
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
                className="h-16 w-full rounded-[8px] border border-transparent bg-[#b060bd] px-5 text-center text-2xl font-semibold text-white outline-none placeholder:text-white/70 focus:border-white"
              />
            </label>
            <button
              type="button"
              onClick={onOpen}
              className="h-14 rounded-full bg-black px-7 text-sm font-semibold text-white"
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
  liveUpdates,
  liveSourceStatuses,
  onBack,
  onCategoryChange,
  onOpenAll,
  onOpenSection,
}: {
  counts: { all: number; tech: number; game: number };
  categories: Record<OpportunitySection, CategoryFilter>;
  liveUpdates: LiveUpdate[];
  liveSourceStatuses: LiveSourceStatus[];
  onBack: () => void;
  onCategoryChange: (section: OpportunitySection, value: CategoryFilter) => void;
  onOpenAll: () => void;
  onOpenSection: (section: OpportunitySection) => void;
}) {
  return (
    <main className="min-h-screen bg-[#f3e5f5] text-black">
      <section className="min-h-screen bg-[radial-gradient(circle_at_0%_0%,rgba(243,229,245,1)_0%,rgba(211,173,217,0.9)_48%,rgba(179,117,189,1)_100%)] px-6 py-12">
        <GlassBackButton onClick={onBack} label="Back to cover" />
        <div className="mx-auto grid min-h-[calc(100vh-6rem)] max-w-[1440px] gap-8 lg:grid-cols-[1fr_430px]">
          <div className="relative min-h-[620px] overflow-hidden">
            <h1 className="pl-14 text-6xl font-thin leading-none tracking-normal sm:text-7xl lg:text-8xl">
              Career Deck
            </h1>

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
              Last sync {latestSync(liveUpdates)}
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
  liveUpdates,
  liveSourceStatuses,
  opportunities,
  query,
  onBack,
  onCategoryChange,
  onQueryChange,
  onSelectOpportunity,
  onSectionChange,
}: {
  activeSection: OpportunitySection | "all";
  categories: Record<OpportunitySection, CategoryFilter>;
  counts: { all: number; tech: number; game: number };
  liveUpdates: LiveUpdate[];
  liveSourceStatuses: LiveSourceStatus[];
  opportunities: Opportunity[];
  query: string;
  onBack: () => void;
  onCategoryChange: (section: OpportunitySection, value: CategoryFilter) => void;
  onQueryChange: (value: string) => void;
  onSelectOpportunity: (opportunity: Opportunity) => void;
  onSectionChange: (section: OpportunitySection | "all") => void;
}) {
  return (
    <main className="min-h-screen bg-[#f3e5f5] text-black">
      <section className="min-h-screen bg-[radial-gradient(circle_at_0%_0%,rgba(193,139,202,0.95)_0%,rgba(218,184,224,0.86)_48%,rgba(243,229,245,0.98)_100%)] px-5 pb-28 pt-10 sm:px-8 lg:px-12">
        <GlassBackButton onClick={onBack} label="Back to home" />
        <header className="mx-auto flex max-w-[1440px] flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <h1 className="pl-14 text-6xl font-thin leading-none tracking-normal sm:text-7xl lg:text-8xl">
            Career Deck
          </h1>

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

        <GameReportCharts opportunities={opportunities} />

        <section className="mx-auto mt-8 grid max-w-[1368px] gap-5 md:grid-cols-2 xl:grid-cols-3">
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
          liveUpdates={liveUpdates}
          liveSourceStatuses={liveSourceStatuses}
          onCategoryChange={onCategoryChange}
        />
      </section>
    </main>
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
  const reportInsight = gameReportInsights[opportunity.id];

  return (
    <article className="relative min-h-[430px] rounded-[29px] border border-white/45 bg-white/20 px-5 pb-4 pt-14 shadow-[inset_0_1px_0_rgba(255,255,255,0.62),0_28px_70px_rgba(92,38,105,0.12)] backdrop-blur-2xl transition duration-200 hover:-translate-y-1 hover:bg-white/28">
      <span
        className={`absolute left-4 top-4 rounded-full px-3 py-0.5 text-xs font-medium text-white shadow-[0_8px_22px_rgba(103,0,130,0.18)] ${
          priority ? "bg-[#a100c6]" : "bg-[#d774dc]"
        }`}
      >
        {priority ? "Priority" : "Standard"}
      </span>

      <button
        type="button"
        onClick={onSelect}
        className="grid h-full w-full grid-rows-[auto_auto_1fr_auto] text-center outline-none focus-visible:ring-2 focus-visible:ring-[#8f00b8]"
      >
        <span className="text-base font-semibold">
          {formatOpportunityType(opportunity.type)} {opportunity.title}
        </span>
        <span className="mt-1 block text-2xl font-thin leading-tight">{opportunity.organization}</span>

        <span className="mt-4 grid gap-3">
          <span className="flex min-h-[104px] items-center justify-center rounded-[27px] border border-white/45 bg-white/18 px-4 text-sm font-semibold leading-tight shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
            {conciseSummary(opportunity)}
          </span>
          <FitnessBreakdown opportunity={opportunity} compact />
        </span>

        {reportInsight && (
          <span className="mt-3 grid grid-cols-[96px_1fr] gap-2 rounded-[20px] border border-white/45 bg-white/16 px-3 py-2 text-left text-xs font-semibold leading-snug">
            <span className="rounded-full bg-white/38 px-2 py-1 text-center">{reportInsight.fit}</span>
            <span>
              {reportInsight.bucket}: {reportInsight.action}
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

function GameReportCharts({ opportunities }: { opportunities: Opportunity[] }) {
  const reportRecords = opportunities.filter((opportunity) => opportunity.id.startsWith(libraryGameReportIdPrefix));

  if (!reportRecords.length) {
    return null;
  }

  const openCount = reportRecords.filter((opportunity) => opportunity.status === "open").length;
  const closedCount = reportRecords.filter((opportunity) => opportunity.status === "closed").length;
  const reviewCount = reportRecords.filter((opportunity) => opportunity.needsReview).length;
  const maxBucket = Math.max(...gameReportBuckets.map((bucket) => bucket.value));

  return (
    <section className="mx-auto mt-8 grid max-w-[1368px] gap-4 lg:grid-cols-[1.2fr_1fr]">
      <div className="rounded-[29px] border border-white/50 bg-white/18 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_24px_80px_rgba(101,36,112,0.12)] backdrop-blur-2xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">Game report summary</h2>
            <p className="mt-1 text-sm font-medium text-black/58">OpenAI Library file: July 1 source-verified where possible</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs font-semibold">
            <MetricChip label="Open" value={openCount} />
            <MetricChip label="Review" value={reviewCount} />
            <MetricChip label="Closed" value={closedCount} />
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          {gameReportBuckets.map((bucket) => (
            <div key={bucket.label} className="grid gap-1.5">
              <div className="flex items-center justify-between gap-3 text-sm font-semibold">
                <span>{bucket.label}</span>
                <span>{bucket.value}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full border border-white/40 bg-white/24">
                <div
                  className="h-full rounded-full bg-[#9e00b8]"
                  style={{ width: `${Math.max(8, (bucket.value / maxBucket) * 100)}%` }}
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
            {gameReportPriorityRoles.map((item) => (
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
            {gameReportSignals.map((signal) => (
              <span key={signal} className="rounded-full border border-white/45 bg-white/22 px-3 py-1 text-xs font-semibold">
                {signal}
              </span>
            ))}
          </div>
          <div className="mt-4 grid gap-2">
            {gameReportFixes.map((fix) => (
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
  const reportInsight = gameReportInsights[opportunity.id];

  return (
    <main className="min-h-screen bg-[#f3e5f5] text-black">
      <section className="min-h-screen bg-[radial-gradient(circle_at_0%_0%,rgba(243,229,245,1)_0%,rgba(226,176,234,0.92)_100%)] px-4 py-8">
        <div className="mx-auto max-w-[1440px]">
          <h1 className="px-6 text-6xl font-thin leading-none tracking-normal sm:text-7xl lg:text-8xl">
            Career Deck
          </h1>

          <div className="mt-5 min-h-[calc(100vh-210px)] rounded-[120px] border border-white/45 bg-white/18 p-7 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_30px_120px_rgba(96,0,118,0.18)] backdrop-blur-2xl md:p-12 lg:p-16">
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
                  <FitnessBreakdown opportunity={opportunity} />
                  {reportInsight && (
                    <div className="mt-4 rounded-[24px] border border-white/45 bg-white/18 p-4 text-left text-sm font-semibold leading-snug shadow-[inset_0_1px_0_rgba(255,255,255,0.42)]">
                      <p className="text-xs uppercase text-black/48">Library report read</p>
                      <p className="mt-1">{reportInsight.fit} fit - {reportInsight.bucket}</p>
                      <p className="mt-2 text-black/62">{reportInsight.action}</p>
                    </div>
                  )}
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
          label={`Game category ${counts.game}`}
          value={categories.game}
          onChange={(value) => onCategoryChange("game", value)}
        />
        <CategorySelect
          label={`Tech category ${counts.tech}`}
          value={categories.tech}
          onChange={(value) => onCategoryChange("tech", value)}
        />
        <span title={liveExtractionLabel(liveSourceStatuses)}>Last sync {latestSync(liveUpdates)}</span>
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
    <label className="relative mt-7 block first:mt-0">
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
    return clampText(opportunity.eligibility, 70);
  }

  if (opportunity.evidence[0]) {
    return clampText(opportunity.evidence[0], 70);
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
