import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

export interface QuranSettings {
  fontType: "uthmani" | "indopak";
  arabicFontSize: number;
  translationFontSize: number;
  tafseerFontSize: number;
  showTajweed: boolean;
  showTranslation: boolean;
  showTafseer: boolean;
  translationEdition: string;
  tafseerSource: string;
  theme: "light" | "dark" | "system";
  continuousMode: boolean;
}

const DEFAULT_SETTINGS: QuranSettings = {
  fontType: "uthmani",
  arabicFontSize: 30,
  translationFontSize: 15,
  tafseerFontSize: 13,
  showTajweed: false,
  showTranslation: true,
  showTafseer: false,
  translationEdition: "en.sahih",
  tafseerSource: "169",
  theme: "light",
  continuousMode: false,
};

export const ARABIC_FONT_FAMILIES: Record<QuranSettings["fontType"], string> = {
  uthmani: "KFGQPCHafsUthmanic",
  indopak: "NotoNaskhArabic_400Regular",
};

export const FONT_TYPE_LABELS: Record<QuranSettings["fontType"], string> = {
  uthmani: "Uthmani / Madani",
  indopak: "Indo-Pak / Farsi",
};

export const FONT_TYPE_DESCRIPTIONS: Record<QuranSettings["fontType"], string> = {
  uthmani:
    "King Fahd Complex (KFGQPC) Hafs font — the Madinah Mushaf style with Uthmani orthography and diacritical marks",
  indopak:
    "Naskh style used across South Asia and Iran — same Uthmani text standard with Indo-Pak diacritical conventions",
};

export function getArabicFontFamily(fontType: QuranSettings["fontType"]): string {
  return ARABIC_FONT_FAMILIES[fontType];
}

export function getArabicEdition(fontType: QuranSettings["fontType"]): string {
  return fontType === "uthmani" ? "quran-uthmani" : "quran-simple-enhanced";
}

export const TRANSLATION_OPTIONS = [
  { id: "en.sahih", label: "Saheeh International", language: "English" },
  { id: "en.pickthall", label: "Pickthall", language: "English" },
  { id: "en.yusufali", label: "Yusuf Ali", language: "English" },
  { id: "fr.hamidullah", label: "Hamidullah", language: "French" },
  { id: "ur.maududi", label: "Maududi", language: "Urdu" },
  { id: "tr.ates", label: "Ates", language: "Turkish" },
];

export const TAFSEER_SOURCES = [
  { id: "169", label: "Tafsir Ibn Kathir", language: "English (Abridged)" },
  { id: "93", label: "Tazkirul Quran", language: "English" },
];

interface QuranContextType {
  settings: QuranSettings;
  updateSetting: <K extends keyof QuranSettings>(
    key: K,
    value: QuranSettings[K]
  ) => void;
}

export const QuranContext = createContext<QuranContextType | undefined>(undefined);

export function QuranProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<QuranSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    AsyncStorage.getItem("quran_settings").then((data) => {
      if (data) {
        try {
          setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(data) });
        } catch {}
      }
    });
  }, []);

  const updateSetting = <K extends keyof QuranSettings>(
    key: K,
    value: QuranSettings[K]
  ) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      AsyncStorage.setItem("quran_settings", JSON.stringify(next));
      return next;
    });
  };

  return (
    <QuranContext.Provider value={{ settings, updateSetting }}>
      {children}
    </QuranContext.Provider>
  );
}

export function useQuranSettings() {
  const ctx = useContext(QuranContext);
  if (!ctx)
    throw new Error("useQuranSettings must be used within QuranProvider");
  return ctx;
}
