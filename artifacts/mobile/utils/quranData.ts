/**
 * Offline Quran data layer.
 * All data is bundled locally — no network required.
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const surahListJson: SurahMeta[] = require("../assets/data/surah-list.json");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const arabicBySurahJson: Record<string, SurahArabic> = require("../assets/data/quran-arabic.json");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const englishBySurahJson: Record<string, string[]> = require("../assets/data/quran-english-surah.json");

export interface SurahMeta {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
}

export interface LocalAyah {
  number: number;
  numberInSurah: number;
  text: string;
  juz: number;
  page: number;
  sajda: boolean | { id: number; recommended: boolean; obligatory: boolean };
}

export interface SurahArabic {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
  ayahs: LocalAyah[];
}

/** Strips tajweed bracket markup so text can be displayed as plain Arabic. */
export function stripTajweedTags(text: string): string {
  return text.replace(/\[([^\[]+)\[([^\]]*)\]/g, "$2");
}

/** All 114 surah metadata objects — immediately available, no loading. */
export const SURAH_LIST: SurahMeta[] = surahListJson;

/**
 * Returns the Arabic text (quran-tajweed edition, with tajweed markup) for a
 * given surah, in the same shape the surah reader already expects.
 */
export function getSurahArabic(surahNumber: number): SurahArabic | null {
  return arabicBySurahJson[surahNumber] ?? null;
}

/**
 * Returns Arabic + translation for a surah in the `{ data: SurahApiResponse }`
 * envelope that surah/[id].tsx already reads — no component changes needed.
 */
export function getSurahApiResponse(surahNumber: number): {
  data: SurahArabic;
} | null {
  const data = arabicBySurahJson[surahNumber];
  return data ? { data } : null;
}

/**
 * Returns translation sentences for a surah as a zero-based array.
 * Index 0 = ayah 1, etc.
 */
export function getSurahTranslation(surahNumber: number): string[] {
  return englishBySurahJson[surahNumber] ?? [];
}

/**
 * Returns translation-only response in API envelope for the surah reader.
 */
export function getTranslationApiResponse(surahNumber: number): {
  data: { ayahs: { number: number; numberInSurah: number; text: string }[] };
} | null {
  const arabic = arabicBySurahJson[surahNumber];
  const texts = englishBySurahJson[surahNumber];
  if (!arabic || !texts) return null;
  return {
    data: {
      ayahs: arabic.ayahs.map((a, i) => ({
        number: a.number,
        numberInSurah: a.numberInSurah,
        text: texts[i] ?? "",
      })),
    },
  };
}

// ── Flat index: globalAyahNumber → { surahNum, numberInSurah, arabicText } ──
// Built once at module load; enables O(1) lookup for Ayah of the Day.

interface FlatAyah {
  surahNum: number;
  numberInSurah: number;
  arabicText: string;
}

const flatIndex: Map<number, FlatAyah> = new Map();

(function buildFlatIndex() {
  for (const surahNumStr of Object.keys(arabicBySurahJson)) {
    const surah = arabicBySurahJson[surahNumStr];
    for (const ayah of surah.ayahs) {
      flatIndex.set(ayah.number, {
        surahNum: surah.number,
        numberInSurah: ayah.numberInSurah,
        arabicText: ayah.text,
      });
    }
  }
})();

export interface AyahDetails {
  number: number;
  text: string;
  numberInSurah: number;
  surah: SurahMeta;
  translation: string;
}

/**
 * Look up any ayah by its global number (1-6236) — used by Ayah of the Day.
 */
export function getAyahByGlobalNumber(
  globalNumber: number
): AyahDetails | null {
  const entry = flatIndex.get(globalNumber);
  if (!entry) return null;
  const texts = englishBySurahJson[entry.surahNum] ?? [];
  const translation = texts[entry.numberInSurah - 1] ?? "";
  const surah = SURAH_LIST[entry.surahNum - 1];
  if (!surah) return null;
  return {
    number: globalNumber,
    text: entry.arabicText,
    numberInSurah: entry.numberInSurah,
    surah,
    translation,
  };
}

export interface SearchResult {
  number: number;
  numberInSurah: number;
  arabicText: string;
  englishText: string;
  surah: SurahMeta;
}

/**
 * Full-text search over the Sahih International translation.
 * Returns up to `maxResults` matches ordered by surah/ayah sequence.
 */
export function searchQuran(
  query: string,
  maxResults = 30
): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const results: SearchResult[] = [];

  for (const surahMeta of SURAH_LIST) {
    const texts = englishBySurahJson[surahMeta.number] ?? [];
    const arabicSurah = arabicBySurahJson[surahMeta.number];

    for (let i = 0; i < texts.length; i++) {
      if (texts[i].toLowerCase().includes(q)) {
        const arabicAyah = arabicSurah?.ayahs[i];
        results.push({
          number: arabicAyah?.number ?? 0,
          numberInSurah: i + 1,
          arabicText: arabicAyah?.text ?? "",
          englishText: texts[i],
          surah: surahMeta,
        });
        if (results.length >= maxResults) return results;
      }
    }
  }

  return results;
}
