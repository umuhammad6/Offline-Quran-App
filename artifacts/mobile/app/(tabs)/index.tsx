import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useBookmarks } from "@/context/BookmarkContext";
import { getArabicFontFamily, useQuranSettings } from "@/context/QuranContext";
import SurahCard, { SurahMeta } from "@/components/SurahCard";
import SettingsGearButton from "@/components/SettingsGearButton";
import { SURAH_LIST } from "@/utils/quranData";

const AL_PREFIXES = /^(al-|ash-|an-|ar-|as-|at-|az-|ad-|adh-)/i;

function isArabicText(text: string): boolean {
  return /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);
}

function stripPrefix(name: string): string {
  return name.toLowerCase().replace(AL_PREFIXES, "");
}

function matchesSurah(surah: SurahMeta, q: string): boolean {
  if (!q) return true;
  if (isArabicText(q)) {
    return surah.name.includes(q);
  }
  const ql = q.toLowerCase();
  const nameLower = surah.englishName.toLowerCase();
  const stripped = stripPrefix(nameLower);
  const strippedQ = stripPrefix(ql);
  return (
    stripped.startsWith(strippedQ) ||
    nameLower.startsWith(ql) ||
    surah.englishNameTranslation.toLowerCase().includes(ql) ||
    surah.number.toString() === ql
  );
}

export default function QuranScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { lastRead } = useBookmarks();
  const { settings } = useQuranSettings();
  const [search, setSearch] = useState("");

  const arabicFont = getArabicFontFamily(settings.fontType);

  const filtered = SURAH_LIST.filter((s) => matchesSurah(s as SurahMeta, search.trim()));

  const topPad = Platform.OS === "web" ? 20 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 4,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.titleRow}>
          <View style={styles.titleLeft}>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>
              The Holy Quran
            </Text>
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
              114 Surahs · 6,236 Ayahs
            </Text>
          </View>
          <View style={styles.titleRight}>
            <Text
              style={[
                styles.headerArabic,
                { color: colors.primary, fontFamily: arabicFont },
              ]}
            >
              القرآن الكريم
            </Text>
            <SettingsGearButton />
          </View>
        </View>

        <View
          style={[
            styles.searchBar,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Ionicons name="search" size={18} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search by name, number, or Arabic..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons
                name="close-circle"
                size={18}
                color={colors.mutedForeground}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(s) => s.number.toString()}
        contentInsetAdjustmentBehavior="automatic"
        windowSize={7}
        maxToRenderPerBatch={10}
        initialNumToRender={12}
        removeClippedSubviews={Platform.OS !== "web"}
        ListHeaderComponent={
          lastRead ? (
            <TouchableOpacity
              style={[
                styles.continueCard,
                {
                  backgroundColor: colors.primary,
                  marginHorizontal: 16,
                  marginTop: 12,
                  marginBottom: 4,
                },
              ]}
              onPress={() =>
                router.push({
                  pathname: "/surah/[id]",
                  params: {
                    id: lastRead.surahNumber.toString(),
                    scrollToAyah: lastRead.ayahNumber.toString(),
                  },
                })
              }
            >
              <View style={styles.continueContent}>
                <Ionicons
                  name="book-outline"
                  size={20}
                  color={colors.primaryForeground}
                />
                <View style={styles.continueText}>
                  <Text
                    style={[
                      styles.continueLabel,
                      { color: colors.primaryForeground, opacity: 0.8 },
                    ]}
                  >
                    Continue Reading
                  </Text>
                  <Text
                    style={[
                      styles.continueTitle,
                      { color: colors.primaryForeground },
                    ]}
                  >
                    {lastRead.surahEnglishName} · Ayah {lastRead.ayahNumber}
                  </Text>
                </View>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.primaryForeground}
              />
            </TouchableOpacity>
          ) : (
            <View style={{ height: 8 }} />
          )
        }
        renderItem={({ item }) => (
          <SurahCard
            surah={item as SurahMeta}
            onPress={() =>
              router.push({
                pathname: "/surah/[id]",
                params: { id: item.number.toString() },
              })
            }
          />
        )}
        contentContainerStyle={{
          paddingBottom: Platform.OS === "web" ? 84 + 34 : 100,
        }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  titleLeft: { flex: 1 },
  titleRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  headerArabic: {
    fontSize: 22,
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 36,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    padding: 0,
  },
  continueCard: {
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  continueContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  continueText: { gap: 2 },
  continueLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  continueTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
