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

## Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

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

## Build

```bash
npm run build
```

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
