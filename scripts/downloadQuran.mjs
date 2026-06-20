#!/usr/bin/env node
/**
 * Downloads the full Quran (Arabic tajweed + English Sahih International)
 * from alquran.cloud API once, and saves as local JSON assets.
 *
 * Run: node scripts/downloadQuran.mjs
 */

import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "../artifacts/mobile/assets/data");

async function fetchWithRetry(url, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`  Fetching: ${url}`);
      const res = await fetch(url, {
        headers: { "Accept": "application/json" },
        signal: AbortSignal.timeout(60000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      console.warn(`  Attempt ${attempt} failed: ${e.message}`);
      if (attempt === retries) throw e;
      await new Promise(r => setTimeout(r, 2000 * attempt));
    }
  }
}

function saveJson(filename, data) {
  const path = join(OUT_DIR, filename);
  writeFileSync(path, JSON.stringify(data));
  const kb = Math.round(Buffer.byteLength(JSON.stringify(data)) / 1024);
  console.log(`  ✓ Saved ${filename} (${kb} KB)`);
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  console.log("\n📖 Downloading Quran data for offline use...\n");

  // ── 1. Surah metadata list ──────────────────────────────────────────
  console.log("1/3 Surah metadata...");
  const surahListRes = await fetchWithRetry("https://api.alquran.cloud/v1/surah");
  const surahList = surahListRes.data.map(s => ({
    number: s.number,
    name: s.name,
    englishName: s.englishName,
    englishNameTranslation: s.englishNameTranslation,
    numberOfAyahs: s.numberOfAyahs,
    revelationType: s.revelationType,
  }));
  saveJson("surah-list.json", surahList);

  // ── 2. Full Arabic (with tajweed markup) ───────────────────────────
  console.log("\n2/3 Full Arabic Quran (quran-tajweed edition)...");
  console.log("  (This may take 30-60 seconds — downloading ~6,236 ayahs)");
  const arabicRes = await fetchWithRetry("https://api.alquran.cloud/v1/quran/quran-tajweed");
  const arabicBySurah = {};
  for (const surah of arabicRes.data.surahs) {
    arabicBySurah[surah.number] = {
      number: surah.number,
      name: surah.name,
      englishName: surah.englishName,
      englishNameTranslation: surah.englishNameTranslation,
      numberOfAyahs: surah.numberOfAyahs,
      revelationType: surah.revelationType,
      ayahs: surah.ayahs.map(a => ({
        number: a.number,
        numberInSurah: a.numberInSurah,
        text: a.text,
        juz: a.juz,
        page: a.page,
        sajda: a.sajda,
      })),
    };
  }
  saveJson("quran-arabic.json", arabicBySurah);

  // ── 3. English translation (Sahih International) ──────────────────
  console.log("\n3/3 Sahih International translation...");
  const englishRes = await fetchWithRetry("https://api.alquran.cloud/v1/quran/en.sahih");
  // Store as { globalAyahNumber: text } for O(1) lookup by any identifier
  // Also store by surah for surah reader: { surahNum: [text, text, ...] }
  const translationBySurah = {};
  const translationByNumber = {};
  for (const surah of englishRes.data.surahs) {
    translationBySurah[surah.number] = surah.ayahs.map(a => a.text);
    for (const a of surah.ayahs) {
      translationByNumber[a.number] = a.text;
    }
  }
  saveJson("quran-english-surah.json", translationBySurah);
  saveJson("quran-english-flat.json", translationByNumber);

  console.log("\n✅ All Quran data saved to artifacts/mobile/assets/data/");
  console.log("   The app is now ready to run fully offline.\n");
}

main().catch(e => {
  console.error("\n❌ Download failed:", e.message);
  process.exit(1);
});
