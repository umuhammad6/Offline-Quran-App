import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";

const TOTAL_AYAHS = 6236;
const STORAGE_KEY = "quran_ayah_of_day";

interface AyahOfDay {
  date: string;
  number: number;
}

interface AyahDetails {
  number: number;
  text: string;
  numberInSurah: number;
  surah: {
    number: number;
    name: string;
    englishName: string;
    englishNameTranslation: string;
    numberOfAyahs: number;
    revelationType: string;
  };
  translation: string;
  tafseer: string;
}

function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

async function getDailyAyahNumber(): Promise<number> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed: AyahOfDay = JSON.parse(stored);
      if (parsed.date === getTodayString()) {
        return parsed.number;
      }
    }
  } catch {}
  const num = Math.floor(Math.random() * TOTAL_AYAHS) + 1;
  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ date: getTodayString(), number: num })
  );
  return num;
}

async function fetchAyahDetails(number: number): Promise<AyahDetails> {
  const res = await fetch(
    `https://api.alquran.cloud/v1/ayah/${number}/editions/quran-uthmani,en.sahih,en.muyassar`
  );
  const json = await res.json();
  const [arabic, translation, tafseer] = json.data;
  return {
    number,
    text: arabic.text,
    numberInSurah: arabic.numberInSurah,
    surah: arabic.surah,
    translation: translation.text,
    tafseer: tafseer.text,
  };
}

export default function AyahOfDayScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [ayahNumber, setAyahNumber] = useState<number | null>(null);
  const [showTafseer, setShowTafseer] = useState(false);

  useEffect(() => {
    getDailyAyahNumber().then(setAyahNumber);
  }, []);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["ayah-of-day", ayahNumber],
    queryFn: () => fetchAyahDetails(ayahNumber!),
    enabled: ayahNumber !== null,
    staleTime: 1000 * 60 * 60 * 12,
  });

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 84 + 34 : 100;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topPad, paddingBottom: bottomPad },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={[colors.primary, colors.primary + "CC"]}
          style={styles.heroCard}
        >
          <Text style={[styles.heroLabel, { color: colors.primaryForeground, opacity: 0.7 }]}>
            AYAH OF THE DAY
          </Text>
          <Text style={[styles.heroDate, { color: colors.primaryForeground, opacity: 0.8 }]}>
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </Text>
          <View style={styles.starRow}>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={[
                  styles.starDot,
                  { backgroundColor: colors.accent },
                ]}
              />
            ))}
          </View>
        </LinearGradient>

        {(isLoading || ayahNumber === null) && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}

        {error && (
          <View style={styles.center}>
            <Ionicons name="wifi-outline" size={40} color={colors.mutedForeground} />
            <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
              Failed to load. Tap to retry.
            </Text>
            <TouchableOpacity
              style={[styles.retryBtn, { backgroundColor: colors.primary }]}
              onPress={() => refetch()}
            >
              <Text style={[styles.retryText, { color: colors.primaryForeground }]}>
                Retry
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {data && (
          <>
            <View
              style={[
                styles.surahBadge,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.surahBadgeText, { color: colors.mutedForeground }]}>
                {data.surah.englishName} ({data.surah.name}) · Ayah{" "}
                {data.numberInSurah}
              </Text>
            </View>

            <View
              style={[
                styles.arabicCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text
                style={[
                  styles.arabicText,
                  { color: colors.foreground },
                ]}
              >
                {data.text}
              </Text>

              <View style={[styles.divider, { backgroundColor: colors.accent }]} />

              <Text
                style={[styles.translationText, { color: colors.mutedForeground }]}
              >
                {data.translation}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.tafseerToggle,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={() => setShowTafseer((v) => !v)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tafseerLabel, { color: colors.primary }]}>
                View Tafseer
              </Text>
              <Ionicons
                name={showTafseer ? "chevron-up" : "chevron-down"}
                size={18}
                color={colors.primary}
              />
            </TouchableOpacity>

            {showTafseer && (
              <View
                style={[
                  styles.tafseerCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.tafseerTitle, { color: colors.foreground }]}>
                  Commentary
                </Text>
                <Text style={[styles.tafseerText, { color: colors.mutedForeground }]}>
                  {data.tafseer}
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    padding: 20,
    gap: 16,
  },
  heroCard: {
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    gap: 8,
  },
  heroLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 2,
  },
  heroDate: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  starRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 8,
  },
  starDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 12,
  },
  errorText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  retryBtn: {
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  retryText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  surahBadge: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignSelf: "center",
  },
  surahBadgeText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  arabicCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    gap: 16,
  },
  arabicText: {
    fontSize: 28,
    fontFamily: "Amiri_400Regular",
    textAlign: "center",
    lineHeight: 52,
    writingDirection: "rtl",
  },
  divider: {
    height: 1.5,
    width: 40,
    alignSelf: "center",
    borderRadius: 1,
  },
  translationText: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    lineHeight: 26,
    textAlign: "center",
  },
  tafseerToggle: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tafseerLabel: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  tafseerCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 12,
  },
  tafseerTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  tafseerText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 24,
  },
});
