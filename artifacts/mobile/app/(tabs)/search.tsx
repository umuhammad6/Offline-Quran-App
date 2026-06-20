import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { getArabicFontFamily, useQuranSettings } from "@/context/QuranContext";
import SettingsGearButton from "@/components/SettingsGearButton";

interface CombinedResult {
  number: number;
  numberInSurah: number;
  surah: {
    number: number;
    name: string;
    englishName: string;
    englishNameTranslation: string;
  };
  arabicText: string;
  englishText: string;
}

function isArabicText(text: string): boolean {
  return /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);
}

function HighlightedText({
  text,
  query,
  style,
  highlightBg,
}: {
  text: string;
  query: string;
  style?: object;
  highlightBg: string;
}) {
  if (!query.trim()) return <Text style={style}>{text}</Text>;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return (
    <Text style={style}>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <Text
            key={i}
            style={{
              backgroundColor: highlightBg,
              borderRadius: 3,
              overflow: "hidden",
              fontFamily: "Inter_600SemiBold",
            }}
          >
            {part}
          </Text>
        ) : (
          <Text key={i}>{part}</Text>
        )
      )}
    </Text>
  );
}

export default function SearchScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { settings } = useQuranSettings();
  const arabicFont = getArabicFontFamily(settings.fontType);
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<CombinedResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState(false);
  const [searchedQuery, setSearchedQuery] = useState("");
  const [isArabicSearch, setIsArabicSearch] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const doSearch = async (q = query) => {
    if (!q.trim()) return;
    setLoading(true);
    setError(false);
    setSearched(true);
    setSearchedQuery(q.trim());
    Keyboard.dismiss();

    const arabic = isArabicText(q.trim());
    setIsArabicSearch(arabic);

    try {
      const term = encodeURIComponent(q.trim());

      if (arabic) {
        // Arabic search: find ayahs by Arabic text, then fetch English translations
        const res = await fetch(
          `https://api.alquran.cloud/v1/search/${term}/all/ar`
        );
        const json = await res.json();
        const primary = (json.data?.matches ?? []).slice(0, 30);

        if (primary.length === 0) {
          setMatches([]);
          return;
        }

        // Batch-fetch English translation for each match
        const englishTexts = await Promise.all(
          primary.map(async (m: any) => {
            try {
              const r = await fetch(
                `https://api.alquran.cloud/v1/ayah/${m.surah.number}:${m.numberInSurah}/en.sahih`
              );
              const j = await r.json();
              return j.data?.text ?? "";
            } catch {
              return "";
            }
          })
        );

        setMatches(
          primary.map((m: any, i: number) => ({
            number: m.number,
            numberInSurah: m.numberInSurah,
            surah: m.surah,
            arabicText: m.text,
            englishText: englishTexts[i],
          }))
        );
      } else {
        // English search: find ayahs by English text, then fetch Arabic text
        const res = await fetch(
          `https://api.alquran.cloud/v1/search/${term}/all/en.sahih`
        );
        const json = await res.json();
        const primary = (json.data?.matches ?? []).slice(0, 30);

        if (primary.length === 0) {
          setMatches([]);
          return;
        }

        // Batch-fetch Arabic text for each match
        const arabicTexts = await Promise.all(
          primary.map(async (m: any) => {
            try {
              const r = await fetch(
                `https://api.alquran.cloud/v1/ayah/${m.surah.number}:${m.numberInSurah}/quran-uthmani`
              );
              const j = await r.json();
              return j.data?.text ?? "";
            } catch {
              return "";
            }
          })
        );

        setMatches(
          primary.map((m: any, i: number) => ({
            number: m.number,
            numberInSurah: m.numberInSurah,
            surah: m.surah,
            arabicText: arabicTexts[i],
            englishText: m.text,
          }))
        );
      }
    } catch {
      setError(true);
      setMatches([]);
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setQuery("");
    setMatches([]);
    setSearched(false);
    setError(false);
    inputRef.current?.focus();
  };

  const topPad = Platform.OS === "web" ? 20 : insets.top;
  const highlightBg = colors.primary + "30";

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
        <View style={styles.headerTitleRow}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            Search
          </Text>
          <SettingsGearButton />
        </View>

        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: colors.card,
              borderColor: query ? colors.primary : colors.border,
            },
          ]}
        >
          <Ionicons name="search" size={18} color={colors.mutedForeground} />
          <TextInput
            ref={inputRef}
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search in English or Arabic..."
            placeholderTextColor={colors.mutedForeground}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => doSearch()}
            returnKeyType="search"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={clearSearch}>
              <Ionicons
                name="close-circle"
                size={18}
                color={colors.mutedForeground}
              />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.searchBtn,
            {
              backgroundColor: colors.primary,
              opacity: query.trim() ? 1 : 0.5,
            },
          ]}
          onPress={() => doSearch()}
          disabled={!query.trim()}
        >
          <Text
            style={[styles.searchBtnText, { color: colors.primaryForeground }]}
          >
            Search
          </Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Searching...
          </Text>
        </View>
      )}

      {!loading && error && (
        <View style={styles.center}>
          <Ionicons name="wifi-outline" size={44} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Failed to search. Check your connection.
          </Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: colors.primary }]}
            onPress={() => doSearch()}
          >
            <Text style={[styles.retryText, { color: colors.primaryForeground }]}>
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && !searched && !error && (
        <View style={styles.center}>
          <Ionicons name="book-outline" size={44} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Search the Quran
          </Text>
          <Text style={[styles.emptySubText, { color: colors.mutedForeground }]}>
            Search in English: "mercy", "patience", "guidance"
          </Text>
          <Text style={[styles.emptySubText, { color: colors.mutedForeground }]}>
            Search in Arabic to find specific words in the Quran
          </Text>
        </View>
      )}

      {!loading && searched && !error && matches.length === 0 && (
        <View style={styles.center}>
          <Ionicons name="search-outline" size={44} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            No results for "{searchedQuery}"
          </Text>
          <Text style={[styles.emptySubText, { color: colors.mutedForeground }]}>
            Try different keywords or check spelling
          </Text>
        </View>
      )}

      {!loading && matches.length > 0 && (
        <FlatList
          data={matches}
          keyExtractor={(item) => item.number.toString()}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View style={styles.resultsHeader}>
              <Text style={[styles.resultsCount, { color: colors.mutedForeground }]}>
                {matches.length} result{matches.length !== 1 ? "s" : ""} for "
                {searchedQuery}"
              </Text>
              {isArabicSearch && (
                <View
                  style={[
                    styles.arabicBadge,
                    { backgroundColor: colors.accent + "22", borderColor: colors.accent },
                  ]}
                >
                  <Text style={[styles.arabicBadgeText, { color: colors.accent }]}>
                    Arabic
                  </Text>
                </View>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.resultCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={() =>
                router.push({
                  pathname: "/surah/[id]",
                  params: {
                    id: item.surah.number.toString(),
                    scrollToAyah: item.numberInSurah.toString(),
                    forceCardMode: "true",
                  },
                })
              }
              activeOpacity={0.7}
            >
              <View style={styles.resultHeader}>
                <View style={[styles.surahBadge, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.surahBadgeText, { color: colors.primaryForeground }]}>
                    {item.surah.number}:{item.numberInSurah}
                  </Text>
                </View>
                <Text style={[styles.surahName, { color: colors.foreground }]}>
                  {item.surah.englishName}
                </Text>
                <Text style={[styles.arabicName, { color: colors.accent, fontFamily: arabicFont }]}>
                  {item.surah.name}
                </Text>
              </View>

              {item.arabicText ? (
                <HighlightedText
                  text={item.arabicText}
                  query={isArabicSearch ? searchedQuery : ""}
                  highlightBg={highlightBg}
                  style={[
                    styles.resultArabic,
                    { color: colors.foreground, fontFamily: arabicFont },
                  ]}
                />
              ) : null}

              {item.englishText ? (
                <HighlightedText
                  text={item.englishText}
                  query={isArabicSearch ? "" : searchedQuery}
                  highlightBg={highlightBg}
                  style={[styles.resultEnglish, { color: colors.mutedForeground }]}
                />
              ) : null}
            </TouchableOpacity>
          )}
          contentContainerStyle={{
            paddingBottom: Platform.OS === "web" ? 84 + 34 : 100,
          }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { fontSize: 26, fontFamily: "Inter_700Bold" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    padding: 0,
  },
  searchBtn: { borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  searchBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 40,
  },
  emptyText: { fontSize: 15, fontFamily: "Inter_500Medium", textAlign: "center" },
  emptySubText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  retryBtn: { borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10, marginTop: 8 },
  retryText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  resultsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexWrap: "wrap",
  },
  resultsCount: { fontSize: 13, fontFamily: "Inter_400Regular" },
  arabicBadge: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  arabicBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  resultCard: {
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  resultHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  surahBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  surahBadgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  surahName: { fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1 },
  arabicName: { fontSize: 16 },
  resultArabic: {
    fontSize: 18,
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 34,
  },
  resultEnglish: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
});
