import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
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

function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <Text key={i} style={{ fontFamily: "Inter_700Bold" }}>
        {part}
      </Text>
    ) : (
      part
    )
  );
}

export default function SearchScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState(false);
  const [exactMatch, setExactMatch] = useState(false);

  const doSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(false);
    setSearched(true);
    try {
      const term = encodeURIComponent(query.trim());
      const res = await fetch(
        `https://api.alquran.cloud/v1/search/${term}/all/en.sahih`
      );
      const json = await res.json();
      if (json.code === 200 && json.data?.matches) {
        let results: SearchMatch[] = json.data.matches;
        if (exactMatch) {
          const lower = query.toLowerCase();
          results = results.filter((m) =>
            m.text.toLowerCase().split(/\s+/).includes(lower)
          );
        }
        setMatches(results);
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

  const topPad = Platform.OS === "web" ? 67 : insets.top;

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
            styles.searchRow,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Ionicons name="search" size={18} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search by English words..."
            placeholderTextColor={colors.mutedForeground}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={doSearch}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setQuery("");
                setMatches([]);
                setSearched(false);
              }}
            >
              <Ionicons
                name="close-circle"
                size={18}
                color={colors.mutedForeground}
              />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.optionsRow}>
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              {
                backgroundColor: exactMatch ? colors.primary : colors.secondary,
                borderColor: exactMatch ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setExactMatch((v) => !v)}
          >
            <Text
              style={[
                styles.toggleText,
                {
                  color: exactMatch
                    ? colors.primaryForeground
                    : colors.foreground,
                },
              ]}
            >
              Exact Match
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.searchBtn,
              { backgroundColor: colors.primary },
            ]}
            onPress={doSearch}
          >
            <Text
              style={[styles.searchBtnText, { color: colors.primaryForeground }]}
            >
              Search
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {!loading && error && (
        <View style={styles.center}>
          <Ionicons name="wifi-outline" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Search failed. Check your connection.
          </Text>
        </View>
      )}

      {!loading && searched && !error && matches.length === 0 && (
        <View style={styles.center}>
          <Ionicons
            name="search-outline"
            size={40}
            color={colors.mutedForeground}
          />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            No results found for "{query}"
          </Text>
        </View>
      )}

      {!loading && !searched && (
        <View style={styles.center}>
          <Ionicons
            name="book-outline"
            size={44}
            color={colors.mutedForeground}
          />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Search through translations to find ayahs
          </Text>
        </View>
      )}

      {!loading && matches.length > 0 && (
        <FlatList
          data={matches}
          keyExtractor={(item) => item.number.toString()}
          contentInsetAdjustmentBehavior="automatic"
          ListHeaderComponent={
            <Text
              style={[styles.resultsCount, { color: colors.mutedForeground }]}
            >
              {matches.length} result{matches.length !== 1 ? "s" : ""} for "{query}"
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
                <Text
                  style={[styles.surahName, { color: colors.foreground }]}
                >
                  {item.surah.englishName}
                </Text>
                <Text
                  style={[
                    styles.juzText,
                    { color: colors.mutedForeground },
                  ]}
                >
                  Juz {item.juz}
                </Text>
              </View>
              <Text
                style={[styles.resultText, { color: colors.mutedForeground }]}
              >
                {highlightText(item.text, query)}
              </Text>
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
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
  },
  searchRow: {
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
  optionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  toggleBtn: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  toggleText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  searchBtn: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
  },
  searchBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  resultsCount: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  resultCard: {
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  surahBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  surahBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  surahName: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
  juzText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  resultText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
});
