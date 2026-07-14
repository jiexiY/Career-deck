# Design QA

- Date: 2026-07-14
- Reference: `codex-clipboard-0bb3224f-993e-410b-b698-575d48aed0e6.png`
- Surface: Career Deck home page
- Reference-scale viewport: 896 x 726 CSS pixels (matching the 1120 x 907 capture at 1.25 device scale)
- Mobile viewport: 390 x 844 CSS pixels

## Checks

- The Liquid Ether background fills the complete viewport with no uncovered edge or fallback-color gap.
- The Career Deck headline capsule is anchored at `left: 0` on desktop and mobile.
- The back button remains usable and does not cover the headline text.
- The Game and Tech bubbles remain visually separate at both tested viewports.
- The home page has no horizontal overflow at either tested viewport.
- The existing category panel and home-page navigation remain available.

final result: passed
