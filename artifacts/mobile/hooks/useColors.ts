import { useColorScheme } from "react-native";
import { useContext } from "react";
import colors from "@/constants/colors";
import { QuranContext } from "@/context/QuranContext";

export function useColors() {
  const scheme = useColorScheme();
  const ctx = useContext(QuranContext);
  const themeSetting = ctx?.settings?.theme ?? "light";

  const effectiveScheme =
    themeSetting === "system" ? (scheme ?? "light") : themeSetting;

  const palette = effectiveScheme === "dark" ? colors.dark : colors.light;

  return { ...palette, radius: colors.radius };
}
