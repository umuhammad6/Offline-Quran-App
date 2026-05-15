import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

export interface QuranSettings {
  fontType: "uthmani" | "simple";
  arabicFontSize: number;
  translationFontSize: number;
  tafseerFontSize: number;
  showTajweed: boolean;
  showTranslation: boolean;
  showTafseer: boolean;
  translationEdition: string;
  tafseerEdition: string;
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
  tafseerEdition: "en.muyassar",
};

export const TRANSLATION_OPTIONS = [
  { id: "en.sahih", label: "Saheeh International", language: "English" },
  { id: "en.pickthall", label: "Pickthall", language: "English" },
  { id: "en.yusufali", label: "Yusuf Ali", language: "English" },
  { id: "fr.hamidullah", label: "Hamidullah", language: "French" },
  { id: "ur.maududi", label: "Maududi", language: "Urdu" },
  { id: "tr.ates", label: "Ates", language: "Turkish" },
];

export const TAFSEER_OPTIONS = [
  { id: "en.muyassar", label: "Muyassar (Simplified)", language: "English" },
];

interface QuranContextType {
  settings: QuranSettings;
  updateSetting: <K extends keyof QuranSettings>(
    key: K,
    value: QuranSettings[K]
  ) => void;
}

const QuranContext = createContext<QuranContextType | undefined>(undefined);

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
