import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { captureRef } from "react-native-view-shot";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import { getArabicFontFamily, useQuranSettings } from "@/context/QuranContext";

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
    `https://api.alquran.cloud/v1/ayah/${number}/editions/quran-uthmani,en.sahih`
  );
  const json = await res.json();
  const [arabic, translation] = json.data;
  return {
    number,
    text: arabic.text,
    numberInSurah: arabic.numberInSurah,
    surah: arabic.surah,
    translation: translation.text,
  };
}

export default function AyahOfDayScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings } = useQuranSettings();
  const [ayahNumber, setAyahNumber] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedBg, setSelectedBg] = useState("#FFFFFF");
  const cardRef = useRef<View>(null);

  const BG_COLORS = [
    { label: "White", value: "#FFFFFF" },
    { label: "Parchment", value: "#FEF3C7" },
    { label: "Sage", value: "#F0FFF4" },
    { label: "Sky", value: "#EFF6FF" },
    { label: "Slate", value: "#334155" },
    { label: "Forest", value: "#1B4332" },
    { label: "Navy", value: "#1E3A5F" },
    { label: "Dark", value: "#1A1A1A" },
  ];

  const isLightBg = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return r * 0.299 + g * 0.587 + b * 0.114 > 128;
  };
  const cardTextColor = isLightBg(selectedBg) ? "#1A1A1A" : "#F5F5F5";

  const arabicFont = getArabicFontFamily(settings.fontType);

  useEffect(() => {
    getDailyAyahNumber().then(setAyahNumber);
  }, []);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["ayah-of-day", ayahNumber],
    queryFn: () => fetchAyahDetails(ayahNumber!),
    enabled: ayahNumber !== null,
    staleTime: 1000 * 60 * 60 * 12,
  });

  const handleSaveAsImage = async (mode: "share" | "save") => {
    if (!cardRef.current || !data) return;
    setSaving(true);
    try {
      const uri = await captureRef(cardRef, {
        format: "png",
        quality: 1,
        result: Platform.OS === "web" ? "data-uri" : "tmpfile",
      });

      if (Platform.OS === "web") {
        const link = document.createElement("a");
        link.href = uri as string;
        link.download = `quran-${data.surah.number}-${data.numberInSurah}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      if (mode === "share") {
        const isAvail = await Sharing.isAvailableAsync();
        if (isAvail) {
          await Sharing.shareAsync(uri, { mimeType: "image/png" });
        } else {
          Alert.alert("Error", "Sharing not available on this device.");
        }
      } else {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status === "granted") {
          await MediaLibrary.saveToLibraryAsync(uri);
          Alert.alert("Saved ✓", "Image saved to your camera roll.");
        } else {
          Alert.alert(
            "Permission needed",
            "Please allow photo library access in Settings."
          );
        }
      }
    } catch (err) {
      console.error("captureRef error:", err);
      Alert.alert("Error", "Failed to capture the image. Please try again.");
    } finally {
      setSaving(false);
    }
  };

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
          colors={[colors.primary, colors.primary + "BB"]}
          style={styles.heroCard}
        >
          <Text
            style={[
              styles.heroLabel,
              { color: colors.primaryForeground, opacity: 0.75 },
            ]}
          >
            AYAH OF THE DAY
          </Text>
          <Text
            style={[
              styles.heroDate,
              { color: colors.primaryForeground, opacity: 0.85 },
            ]}
          >
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
                style={[styles.starDot, { backgroundColor: colors.accent }]}
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
            <Ionicons
              name="wifi-outline"
              size={40}
              color={colors.mutedForeground}
            />
            <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
              Failed to load. Tap to retry.
            </Text>
            <TouchableOpacity
              style={[styles.retryBtn, { backgroundColor: colors.primary }]}
              onPress={() => refetch()}
            >
              <Text
                style={[styles.retryText, { color: colors.primaryForeground }]}
              >
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
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.surahBadgeText, { color: colors.mutedForeground }]}>
                {data.surah.englishName} ({data.surah.name}) · Ayah{" "}
                {data.numberInSurah}
              </Text>
            </View>

            {/* Capturable card */}
            <View
              ref={cardRef}
              style={[
                styles.arabicCard,
                { backgroundColor: selectedBg, borderColor: "transparent" },
              ]}
              collapsable={false}
            >
              <View style={styles.cardWatermark}>
                <Text
                  style={[
                    styles.watermarkText,
                    { color: isLightBg(selectedBg) ? "#00000022" : "#FFFFFF22" },
                  ]}
                >
                  The Holy Quran
                </Text>
              </View>
              <Text
                style={[
                  styles.arabicText,
                  {
                    color: cardTextColor,
                    fontFamily: arabicFont,
                    fontSize: settings.arabicFontSize,
                    lineHeight: settings.arabicFontSize * 2.0,
                  },
                ]}
              >
                {data.text}
              </Text>

              <View
                style={[
                  styles.divider,
                  {
                    backgroundColor: isLightBg(selectedBg)
                      ? colors.accent
                      : colors.primary,
                  },
                ]}
              />

              <Text style={[styles.translationText, { color: cardTextColor }]}>
                {data.translation}
              </Text>

              <Text style={[styles.referenceText, { color: cardTextColor + "BB" }]}>
                — {data.surah.englishName} {data.numberInSurah}
              </Text>
            </View>

            {/* Background colour picker */}
            <View style={styles.bgPickerContainer}>
              <Text style={[styles.bgPickerLabel, { color: colors.mutedForeground }]}>
                Card Background
              </Text>
              <View style={styles.bgSwatches}>
                {BG_COLORS.map((bg) => (
                  <TouchableOpacity
                    key={bg.value}
                    style={[
                      styles.bgSwatch,
                      {
                        backgroundColor: bg.value,
                        borderColor:
                          selectedBg === bg.value ? colors.primary : colors.border,
                        borderWidth: selectedBg === bg.value ? 2.5 : 1,
                      },
                    ]}
                    onPress={() => setSelectedBg(bg.value)}
                  />
                ))}
              </View>
            </View>

            <View style={styles.imageActions}>
              <TouchableOpacity
                style={[
                  styles.imageBtn,
                  { backgroundColor: colors.primary, flex: 1 },
                ]}
                onPress={() => handleSaveAsImage("share")}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={colors.primaryForeground} />
                ) : (
                  <>
                    <Ionicons
                      name="share-outline"
                      size={18}
                      color={colors.primaryForeground}
                    />
                    <Text
                      style={[
                        styles.imageBtnText,
                        { color: colors.primaryForeground },
                      ]}
                    >
                      Share as Image
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.imageBtn,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderWidth: 1,
                    flex: 1,
                  },
                ]}
                onPress={() => handleSaveAsImage("save")}
                disabled={saving}
              >
                <Ionicons
                  name="download-outline"
                  size={18}
                  color={colors.primary}
                />
                <Text
                  style={[styles.imageBtnText, { color: colors.primary }]}
                >
                  Save to Photos
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, gap: 14 },
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
  heroDate: { fontSize: 16, fontFamily: "Inter_400Regular" },
  starRow: { flexDirection: "row", gap: 6, marginTop: 8 },
  starDot: { width: 6, height: 6, borderRadius: 3 },
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
  retryText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  surahBadge: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignSelf: "center",
  },
  surahBadgeText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  arabicCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    gap: 14,
    overflow: "hidden",
  },
  cardWatermark: {
    position: "absolute",
    top: 12,
    left: 16,
  },
  watermarkText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  arabicText: {
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: 16,
  },
  divider: {
    height: 1.5,
    width: 40,
    alignSelf: "center",
    borderRadius: 1,
  },
  translationText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 24,
    textAlign: "center",
    color: "#1A1A1A",
  },
  referenceText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    color: "#6B7280",
  },
  imageActions: {
    flexDirection: "row",
    gap: 10,
  },
  imageBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  imageBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  bgPickerContainer: {
    gap: 8,
  },
  bgPickerLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  bgSwatches: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  bgSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
});
