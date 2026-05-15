import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
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
import { useBookmarks } from "@/context/BookmarkContext";
import { getArabicFontFamily, useQuranSettings } from "@/context/QuranContext";
import SurahCard, { SurahMeta } from "@/components/SurahCard";

async function fetchSurahs(): Promise<SurahMeta[]> {
  const res = await fetch("https://api.alquran.cloud/v1/surah");
  const json = await res.json();
  return json.data;
}

export default function QuranScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { lastRead } = useBookmarks();
  const { settings } = useQuranSettings();
  const [search, setSearch] = useState("");

  const arabicFont = getArabicFontFamily(settings.fontType);

  const { data: surahs, isLoading, error } = useQuery({
    queryKey: ["surahs"],
    queryFn: fetchSurahs,
    staleTime: 1000 * 60 * 60,
  });

  const filtered = surahs?.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.englishName.toLowerCase().includes(q) ||
      s.englishNameTranslation.toLowerCase().includes(q) ||
      s.number.toString().includes(q)
    );
  });

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
        <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: arabicFont }]}>
          القرآن الكريم
        </Text>
        <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
          The Holy Quran
        </Text>
        <View
          style={[
            styles.searchBar,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Ionicons name="search" size={18} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search surah..."
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

      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {error ? (
        <View style={styles.center}>
          <Ionicons name="wifi-outline" size={40} color={colors.mutedForeground} />
          <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
            Failed to load. Check your connection.
          </Text>
        </View>
      ) : null}

      {filtered && (
        <FlatList
          data={filtered}
          keyExtractor={(s) => s.number.toString()}
          contentInsetAdjustmentBehavior="automatic"
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
              <View style={styles.listHeaderSpace} />
            )
          }
          renderItem={({ item }) => (
            <SurahCard
              surah={item}
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
    gap: 2,
  },
  headerTitle: {
    fontSize: 28,
    textAlign: "right",
    writingDirection: "rtl",
  },
  headerSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 10,
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
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  errorText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
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
  continueText: {
    gap: 2,
  },
  continueLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  continueTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  listHeaderSpace: {
    height: 8,
  },
});
