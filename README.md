Career Deck is a Next.js/Vercel-ready research database and monitoring platform
for internships, co-ops, fellowships, student communities, part-time and
full-time roles, hackathons, conferences, and startup opportunities.

The platform is built around a database contract first. Scrapers are independent
source adapters, so blocked or incomplete sources are recorded as source status
instead of being guessed into real opportunity records.

## Architecture

- `src/lib/career-deck/database.schema.sql` defines the relational data model.
- `src/lib/career-deck/adapters.ts` defines the `fetch`, `parse`, `normalize`,
  `validate`, and `save` adapter interface.
- `src/lib/career-deck/monitoring.ts` runs adapters without coupling them to
  the dashboard.
- `src/lib/career-deck/reports.ts` generates daily changelogs only from
  repository data.
- `src/lib/career-deck/exports.ts` exports validated database records.
- `src/app/components/ProfessionalCareerDeck.tsx` is the public career website.
- `src/lib/career-deck/conversation-sources.json` stores the ChatGPT share links
  used as Tech and Game source inputs.
- `src/lib/career-deck/conversation-snapshots.json` stores source-page hashes
  written by the scheduled detector.
- `src/lib/career-deck/game-monitor.json` stores the dedicated game-industry
  opportunity monitor: verified role metadata, fit scores, source status,
  daily brief, and portfolio prep.
- `scripts/update-game-opportunities.mjs` refreshes the game monitor locally
  and can commit the changed JSON when run with `--commit`.

## Run

```bash
npm run dev
```

Open https://career-deck-amber.vercel.app/

## Guardrails

- Blocked sources save attempted timestamps and failure reasons.
- Blocked or failed sources stay visible with their latest reason.
- Confidence scores are shown for source, extraction, freshness, and duplicate
  probability.
- Daily reports compare today's report with the previous dated report.
- Missing source data is never fabricated.

## API

- `POST /api/monitor/run` runs the adapter registry and returns safe attempts.
- `GET /api/exports/opportunities` downloads database opportunity records as CSV.
- `GET /api/cron/detect-conversation-updates` checks the ChatGPT source links,
  compares normalized page hashes, and saves changed or blocked status.
- `GET /api/cron/update-game-opportunities` runs the game-opportunity monitor
  source checks and can persist `game-monitor.json` back to GitHub.

## Conversation Source Sync

The source links are stored in
`src/lib/career-deck/conversation-sources.json`:

- Tech: `https://chatgpt.com/share/6a418ef2-e89c-83e8-9434-1af2bff1693`
- Game: `https://chatgpt.com/share/6a418e8c-b8f4-83e8-863c-dde3976f0019`

Vercel Cron runs `/api/cron/detect-conversation-updates`, configured in
`vercel.json`. The deployed Hobby plan uses the fastest supported Hobby cadence,
once per day. Vercel Pro can run the same endpoint once per minute by changing
the schedule to `* * * * *`. The first successful run creates the baseline
snapshot. Later runs mark the source as `changed`, `unchanged`, `blocked`, or
`failed`. Each successful run also extracts opportunity-like URLs from the
shared conversations and merges them into `src/lib/career-deck/live-data.json`
with unknown fields set to `TBD` and `needsReview: true`. The adapter never
invents deadlines, compensation, eligibility, or locations that were not
actually verified.

The website also calls `/api/live/conversation-opportunities` while it is open
and merges read-only extracted records into the visible deck about once per
minute. This gives a near-live viewer experience on Vercel Hobby without
exposing the protected GitHub-writing cron endpoint.

Required Vercel environment variables:

- `CRON_SECRET`: protects the cron endpoint.
- `CAREER_DECK_GITHUB_TOKEN`: lets the cron route save snapshot updates back to
  this repository.

Optional variables:

- `CAREER_DECK_GITHUB_REPO`: defaults to `jiexiY/Career-deck`.
- `CAREER_DECK_GITHUB_BRANCH`: defaults to `main`.

## Game Opportunities Monitor

The Game section has a dedicated monitor layer for internships, training camps,
fellowships, early-career programs, remote roles, and SF/in-person game roles.
It prioritizes game operations, version/live ops, product/community operations,
content marketing, KOL/influencer operations, user research, game UX/product
planning, publishing/overseas operations, and early-career production.

The public website uses `game-monitor.json` to show:

- newest high-fit opportunities
- urgent deadlines
- best-fit role today
- number of new roles found since the last update
- filters for company, location mode, role track, monitor status, and fit score
- detail-view fit analysis, source links, risks, and prep checklist
- a Daily Brief and Portfolio Prep section

Run the local monitor:

```bash
npm run update:game-opportunities
```

Commit the refreshed monitor JSON from a local run:

```bash
npm run update:game-opportunities -- --commit
```

Vercel Cron runs `/api/cron/update-game-opportunities` at `0 2 * * *`, which is
7:00 PM Pacific during daylight saving time. If strict year-round 7:00 PM
Pacific is required across daylight saving changes, update the UTC cron seasonally
or move scheduling to a timezone-aware GitHub Action.

Automatic persistence requires:

- `CRON_SECRET`, so Vercel can authorize the cron endpoint.
- `CAREER_DECK_GITHUB_TOKEN`, with permission to update repository contents.
- Optional `CAREER_DECK_GITHUB_REPO` and `CAREER_DECK_GITHUB_BRANCH` overrides.

If those credentials are missing, the cron route still reports source reachability
but cannot write the updated monitor data back to GitHub. The monitor deliberately
does not add new roles from blocked, mirrored, or unparsed pages; new cards should
only be published when an official application route is verified.

## Build

```bash
npm run build
```

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
