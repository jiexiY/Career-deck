import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const apiUrl =
  process.env.CAREER_DECK_LIVE_API_URL ??
  "https://career-deck-amber.vercel.app/api/live/conversation-opportunities";
const liveDataPath = path.join(process.cwd(), "src/lib/career-deck/live-data.json");

const response = await fetch(apiUrl, {
  headers: {
    "User-Agent": "CareerDeckManualSync/1.0",
  },
  cache: "no-store",
});

if (!response.ok) {
  throw new Error(`Live conversation API returned ${response.status} ${response.statusText}`);
}

const payload = await response.json();
const checkedAt = payload.checkedAt ?? new Date().toISOString();
const incoming = Array.isArray(payload.opportunities) ? payload.opportunities : [];
const current = JSON.parse(await readFile(liveDataPath, "utf8"));
const existing = Array.isArray(current.opportunities) ? current.opportunities : [];
const byId = new Map(existing.map((item) => [String(item.id), item]));
let added = 0;
let updated = 0;

for (const item of incoming) {
  if (!item?.id) {
    continue;
  }

  const id = String(item.id);
  const previous = byId.get(id);

  byId.set(id, {
    ...(previous ?? {}),
    ...item,
    discoveredAt: previous?.discoveredAt ?? item.discoveredAt ?? checkedAt,
    updatedAt: checkedAt,
  });

  if (previous) {
    updated += 1;
  } else {
    added += 1;
  }
}

const opportunities = Array.from(byId.values()).sort((a, b) =>
  String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? "")),
);

await writeFile(
  liveDataPath,
  `${JSON.stringify(
    {
      updatedAt: checkedAt,
      opportunities,
    },
    null,
    2,
  )}\n`,
);

console.log(
  JSON.stringify(
    {
      checkedAt,
      sources: payload.sources ?? [],
      incoming: incoming.length,
      added,
      updated,
      total: opportunities.length,
    },
    null,
    2,
  ),
);
