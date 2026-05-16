import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { TAJWEED_RULE_LABELS } from "@/constants/tajweed";

const STORAGE_KEY = "tajweed_rule_settings";

const ALL_RULES = Object.keys(TAJWEED_RULE_LABELS);

const DEFAULT_ENABLED: Record<string, boolean> = Object.fromEntries(
  ALL_RULES.map((k) => [k, true])
);

interface TajweedContextType {
  enabledRules: Record<string, boolean>;
  isRuleEnabled: (code: string) => boolean;
  toggleRule: (code: string) => void;
  resetToDefaults: () => void;
}

export const TajweedContext = createContext<TajweedContextType>({
  enabledRules: DEFAULT_ENABLED,
  isRuleEnabled: () => true,
  toggleRule: () => {},
  resetToDefaults: () => {},
});

export function TajweedProvider({ children }: { children: React.ReactNode }) {
  const [enabledRules, setEnabledRules] =
    useState<Record<string, boolean>>(DEFAULT_ENABLED);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((s) => {
        if (s) {
          const parsed = JSON.parse(s) as Record<string, boolean>;
          setEnabledRules({ ...DEFAULT_ENABLED, ...parsed });
        }
      })
      .catch(() => {});
  }, []);

  const save = (rules: Record<string, boolean>) => {
    setEnabledRules(rules);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(rules)).catch(() => {});
  };

  const toggleRule = useCallback(
    (code: string) => {
      save({ ...enabledRules, [code]: !enabledRules[code] });
    },
    [enabledRules]
  );

  const resetToDefaults = useCallback(() => {
    save(DEFAULT_ENABLED);
  }, []);

  const isRuleEnabled = useCallback(
    (code: string) => enabledRules[code] !== false,
    [enabledRules]
  );

  return (
    <TajweedContext.Provider
      value={{ enabledRules, isRuleEnabled, toggleRule, resetToDefaults }}
    >
      {children}
    </TajweedContext.Provider>
  );
}

export function useTajweedRules() {
  return useContext(TajweedContext);
}
