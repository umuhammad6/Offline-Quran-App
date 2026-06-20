---
name: Offline Quran data layer
description: How the Quran app was converted to fully offline — data sources, file locations, and critical rendering rules.
---

## Offline data files (artifacts/mobile/assets/data/)
- `surah-list.json` (19KB) — 114 surah metadata objects; array indexed 0-113
- `quran-arabic.json` (2190KB) — quran-tajweed edition by surah key: `{ "1": { number, name, englishName, ..., ayahs: [{number, numberInSurah, text, juz, page, sajda}] } }`
- `quran-english-surah.json` (858KB) — Sahih International by surah: `{ "1": ["ayah 1 text", ...] }`
- `quran-english-flat.json` (898KB) — by global ayah number: `{ "1": "text" }` (currently unused; flat index built at runtime from arabic file)

## Data layer (artifacts/mobile/utils/quranData.ts)
- `SURAH_LIST` — preloaded array of all 114 surah metas
- `getSurahArabic(n)` — returns SurahArabic with tajweed-marked ayah texts
- `getSurahTranslation(n)` — returns string[] of translations (0-indexed)
- `getAyahByGlobalNumber(n)` — flat index lookup, returns AyahDetails with stripped tajweed
- `searchQuran(query, max)` — full-text search over English translation
- `stripTajweedTags(text)` — removes `[rule[chars]` markup from Arabic text

## Prayer times (artifacts/mobile/app/(tabs)/prayer.tsx)
- Now uses `adhan` npm package (installed) for local astronomical calculation
- No more aladhan.com API calls
- Method selected automatically by GPS coordinates (same lat/lng zones as before)
- Manual location modal now shows GPS button + lat/lng input (Nominatim removed)

## Critical: Tajweed text rendering
The quran-tajweed edition uses `[ruleCode[chars]` bracket markup for colorization.
- When `settings.showTajweed = true` → use `<TajweedText text={ayah.text} .../>` (handles parsing)
- When `settings.showTajweed = false` → MUST call `stripTajweedTags(ayah.text)` before rendering in a plain `<Text>` or the raw brackets appear in the output

**Why:** The TajweedText component parses and hides the bracket notation. A plain React Native `<Text>` renders it verbatim, showing garbled output like `[h:1[ٱ]`.

## Download script
`scripts/downloadQuran.mjs` — downloads all 4 JSON files from alquran.cloud API. Run once to refresh data.
