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

interface SearchMatch {
  number: number;
  numberInSurah: number;
  text: string;
  surah: {
    number: number;
    name: string;
    englishName: string;
    englishNameTranslation: string;
  };
  juz: number;
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
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const doSearch = async (q = query) => {
    if (!q.trim()) return;
    setLoading(true);
    setError(false);
    setSearched(true);
    Keyboard.dismiss();
    try {
      const term = encodeURIComponent(q.trim());
      const res = await fetch(
        `https://api.alquran.cloud/v1/search/${term}/all/en.sahih`
      );
      const json = await res.json();
      if (json.code === 200 && json.data?.matches) {
        setMatches(json.data.matches);
      } else {
        setMatches([]);
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

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const highlightBg = colors.primary + "22";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 12,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Search
        </Text>
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
            placeholder="Search translations..."
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
          <Ionicons
            name="wifi-outline"
            size={44}
            color={colors.mutedForeground}
          />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Failed to search. Check your connection.
          </Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: colors.primary }]}
            onPress={() => doSearch()}
          >
            <Text
              style={[styles.retryText, { color: colors.primaryForeground }]}
            >
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && !searched && !error && (
        <View style={styles.center}>
          <Ionicons
            name="book-outline"
            size={44}
            color={colors.mutedForeground}
          />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Search the Quran translation
          </Text>
          <Text
            style={[styles.emptySubText, { color: colors.mutedForeground }]}
          >
            Try words like "mercy", "patience", "guidance"
          </Text>
        </View>
      )}

      {!loading && searched && !error && matches.length === 0 && (
        <View style={styles.center}>
          <Ionicons
            name="search-outline"
            size={44}
            color={colors.mutedForeground}
          />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            No results for "{query}"
          </Text>
          <Text
            style={[styles.emptySubText, { color: colors.mutedForeground }]}
          >
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
            <Text
              style={[styles.resultsCount, { color: colors.mutedForeground }]}
            >
              {matches.length} result{matches.length !== 1 ? "s" : ""} for "
              {query}"
            </Text>
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
                  },
                })
              }
              activeOpacity={0.7}
            >
              <View style={styles.resultHeader}>
                <View
                  style={[
                    styles.surahBadge,
                    { backgroundColor: colors.primary },
                  ]}
                >
                  <Text
                    style={[
                      styles.surahBadgeText,
                      { color: colors.primaryForeground },
                    ]}
                  >
                    {item.surah.number}:{item.numberInSurah}
                  </Text>
                </View>
                <Text style={[styles.surahName, { color: colors.foreground }]}>
                  {item.surah.englishName}
                </Text>
                <Text
                  style={[
                    styles.arabicName,
                    { color: colors.accent, fontFamily: arabicFont },
                  ]}
                >
                  {item.surah.name}
                </Text>
              </View>
              <HighlightedText
                text={item.text}
                query={query}
                highlightBg={highlightBg}
                style={[styles.resultText, { color: colors.mutedForeground }]}
              />
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
  emptyText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
  emptySubText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  retryBtn: {
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 10,
    marginTop: 8,
  },
  retryText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  resultsCount: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  resultCard: {
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  resultHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  surahBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  surahBadgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  surahName: { fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1 },
  arabicName: { fontSize: 16 },
  resultText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
});
