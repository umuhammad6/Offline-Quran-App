import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useNavigation } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { getArabicFontFamily, useQuranSettings } from "@/context/QuranContext";
import { useBookmarks } from "@/context/BookmarkContext";
import { AyahData } from "@/components/AyahItem";
import TajweedText, { stripTajweedTags } from "@/components/TajweedText";
import * as Haptics from "expo-haptics";
import {
  Modal,
  Pressable,
} from "react-native";

interface ApiAyah {
  number: number;
  text: string;
  numberInSurah: number;
  juz: number;
}

interface SurahApiResponse {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
  ayahs: ApiAyah[];
}

async function fetchSurahEdition(
  surahId: number,
  edition: string
): Promise<SurahApiResponse> {
  const res = await fetch(
    `https://api.alquran.cloud/v1/surah/${surahId}/${edition}`
  );
  const json = await res.json();
  return json.data;
}

const BISMILLAH = "بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ";

export default function SurahScreen() {
  const { id, scrollToAyah } = useLocalSearchParams<{
    id: string;
    scrollToAyah?: string;
  }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { settings } = useQuranSettings();
  const { addBookmark, removeBookmark, isBookmarked, setLastRead, bookmarks } =
    useBookmarks();
  const flatRef = useRef<FlatList>(null);
  const [actionAyah, setActionAyah] = useState<AyahData | null>(null);

  const surahId = Number(id);
  const arabicEdition = settings.showTajweed
    ? "quran-tajweed"
    : "quran-uthmani";

  const { data: arabicData, isLoading: arabicLoading } = useQuery({
    queryKey: ["surah-arabic", surahId, arabicEdition],
    queryFn: () => fetchSurahEdition(surahId, arabicEdition),
    staleTime: 1000 * 60 * 60,
  });

  const { data: translationData } = useQuery({
    queryKey: ["surah-translation", surahId, settings.translationEdition],
    queryFn: () =>
      fetchSurahEdition(surahId, settings.translationEdition),
    enabled: settings.showTranslation,
    staleTime: 1000 * 60 * 60,
  });

  const { data: tafseerData } = useQuery({
    queryKey: ["surah-tafseer", surahId, settings.tafseerEdition],
    queryFn: () => fetchSurahEdition(surahId, settings.tafseerEdition),
    enabled: settings.showTafseer,
    staleTime: 1000 * 60 * 60,
  });

  useEffect(() => {
    if (arabicData) {
      navigation.setOptions({
        title: `${arabicData.englishName}`,
        headerRight: () => (
          <Text style={{ fontFamily: fontFamily, fontSize: 18, color: colors.accent, marginRight: 8 }}>
            {arabicData.name}
          </Text>
        ),
      });
    }
  }, [arabicData, navigation, colors.accent]);

  useEffect(() => {
    if (arabicData && scrollToAyah) {
      const ayahNum = Number(scrollToAyah);
      const index = arabicData.ayahs.findIndex(
        (a) => a.numberInSurah === ayahNum
      );
      if (index !== -1) {
        setTimeout(() => {
          flatRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.1 });
        }, 500);
      }
    }
  }, [arabicData, scrollToAyah]);

  const ayahs: AyahData[] = (arabicData?.ayahs ?? []).map((ayah, i) => ({
    number: ayah.number,
    numberInSurah: ayah.numberInSurah,
    text: ayah.text,
    translation: translationData?.ayahs[i]?.text,
    tafseer: tafseerData?.ayahs[i]?.text,
    surahNumber: surahId,
    surahName: arabicData?.name ?? "",
    surahEnglishName: arabicData?.englishName ?? "",
  }));

  const showBismillah = surahId !== 1 && surahId !== 9;
  const fontFamily = getArabicFontFamily(settings.fontType);

  const handleLongPress = (ayah: AyahData) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActionAyah(ayah);
  };

  const [expandedTafseers, setExpandedTafseers] = useState<Set<number>>(
    new Set()
  );

  if (arabicLoading) {
    return (
      <View
        style={[
          styles.center,
          { backgroundColor: colors.background, flex: 1 },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        ref={flatRef}
        data={ayahs}
        keyExtractor={(a) => a.numberInSurah.toString()}
        contentInsetAdjustmentBehavior="automatic"
        ListHeaderComponent={
          <View style={styles.listHeader}>
            {showBismillah && (
              <View
                style={[
                  styles.bismillahCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.bismillahText,
                    {
                      color: colors.foreground,
                      fontFamily,
                      fontSize: settings.arabicFontSize,
                    },
                  ]}
                >
                  {BISMILLAH}
                </Text>
              </View>
            )}
            {arabicData && (
              <View
                style={[
                  styles.surahInfoCard,
                  {
                    backgroundColor: colors.primary,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.surahInfoEnglish,
                    { color: colors.primaryForeground },
                  ]}
                >
                  {arabicData.englishName}
                </Text>
                <Text
                  style={[
                    styles.surahInfoTranslation,
                    { color: colors.primaryForeground, opacity: 0.8 },
                  ]}
                >
                  {arabicData.englishNameTranslation}
                </Text>
                <View style={styles.surahMeta}>
                  <Text
                    style={[
                      styles.surahMetaText,
                      { color: colors.primaryForeground, opacity: 0.7 },
                    ]}
                  >
                    {arabicData.numberOfAyahs} verses · {arabicData.revelationType}
                  </Text>
                </View>
              </View>
            )}
          </View>
        }
        renderItem={({ item: ayah }) => {
          const bookmarked = isBookmarked(ayah.surahNumber, ayah.numberInSurah);
          const tafseerExpanded = expandedTafseers.has(ayah.numberInSurah);

          return (
            <Pressable
              onLongPress={() => handleLongPress(ayah)}
              style={({ pressed }) => [
                styles.ayahCard,
                {
                  backgroundColor: pressed
                    ? colors.secondary
                    : colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.ayahHeader}>
                <View
                  style={[
                    styles.ayahBadge,
                    { borderColor: colors.accent },
                  ]}
                >
                  <Text
                    style={[
                      styles.ayahNumber,
                      { color: colors.accent },
                    ]}
                  >
                    {ayah.numberInSurah}
                  </Text>
                </View>
                {bookmarked && (
                  <Ionicons
                    name="bookmark"
                    size={16}
                    color={colors.accent}
                  />
                )}
              </View>

              {settings.showTajweed ? (
                <TajweedText
                  text={ayah.text}
                  fontSize={settings.arabicFontSize}
                  fontFamily={fontFamily}
                  color={colors.foreground}
                />
              ) : (
                <Text
                  style={[
                    styles.arabicText,
                    {
                      color: colors.foreground,
                      fontSize: settings.arabicFontSize,
                      fontFamily,
                      lineHeight: settings.arabicFontSize * 1.9,
                    },
                  ]}
                >
                  {ayah.text}
                </Text>
              )}

              {settings.showTranslation && ayah.translation ? (
                <Text
                  style={[
                    styles.translation,
                    {
                      color: colors.mutedForeground,
                      fontSize: settings.translationFontSize,
                    },
                  ]}
                >
                  {ayah.translation}
                </Text>
              ) : null}

              {settings.showTafseer && ayah.tafseer ? (
                <View>
                  <TouchableOpacity
                    style={styles.tafseerToggle}
                    onPress={() =>
                      setExpandedTafseers((prev) => {
                        const next = new Set(prev);
                        if (next.has(ayah.numberInSurah)) {
                          next.delete(ayah.numberInSurah);
                        } else {
                          next.add(ayah.numberInSurah);
                        }
                        return next;
                      })
                    }
                  >
                    <Text
                      style={[styles.tafseerLabel, { color: colors.primary }]}
                    >
                      Tafseer
                    </Text>
                    <Ionicons
                      name={tafseerExpanded ? "chevron-up" : "chevron-down"}
                      size={14}
                      color={colors.primary}
                    />
                  </TouchableOpacity>
                  {tafseerExpanded && (
                    <Text
                      style={[
                        styles.tafseerText,
                        {
                          color: colors.mutedForeground,
                          fontSize: settings.tafseerFontSize,
                          borderLeftColor: colors.primary,
                        },
                      ]}
                    >
                      {ayah.tafseer}
                    </Text>
                  )}
                </View>
              ) : null}
            </Pressable>
          );
        }}
        contentContainerStyle={{
          paddingBottom: Platform.OS === "web" ? 84 + 34 : 100,
        }}
        onScrollToIndexFailed={() => {}}
        showsVerticalScrollIndicator={false}
      />

      {actionAyah && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setActionAyah(null)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setActionAyah(null)}
          >
            <View
              style={[
                styles.actionSheet,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.actionTitle,
                  { color: colors.mutedForeground },
                ]}
              >
                {actionAyah.surahEnglishName} · Ayah{" "}
                {actionAyah.numberInSurah}
              </Text>

              {(() => {
                const bookmarked = isBookmarked(
                  actionAyah.surahNumber,
                  actionAyah.numberInSurah
                );
                return (
                  <TouchableOpacity
                    style={styles.actionItem}
                    onPress={() => {
                      if (bookmarked) {
                        const found = bookmarks.find(
                          (b) =>
                            b.surahNumber === actionAyah.surahNumber &&
                            b.ayahNumber === actionAyah.numberInSurah
                        );
                        if (found) removeBookmark(found.id);
                      } else {
                        addBookmark({
                          surahNumber: actionAyah.surahNumber,
                          ayahNumber: actionAyah.numberInSurah,
                          surahName: actionAyah.surahName,
                          surahEnglishName: actionAyah.surahEnglishName,
                        });
                      }
                      Haptics.notificationAsync(
                        Haptics.NotificationFeedbackType.Success
                      );
                      setActionAyah(null);
                    }}
                  >
                    <Ionicons
                      name={bookmarked ? "bookmark" : "bookmark-outline"}
                      size={22}
                      color={bookmarked ? colors.accent : colors.foreground}
                    />
                    <Text
                      style={[
                        styles.actionText,
                        {
                          color: bookmarked
                            ? colors.accent
                            : colors.foreground,
                        },
                      ]}
                    >
                      {bookmarked ? "Remove Bookmark" : "Bookmark Ayah"}
                    </Text>
                  </TouchableOpacity>
                );
              })()}

              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => {
                  setLastRead({
                    surahNumber: actionAyah.surahNumber,
                    ayahNumber: actionAyah.numberInSurah,
                    surahName: actionAyah.surahName,
                    surahEnglishName: actionAyah.surahEnglishName,
                  });
                  Haptics.notificationAsync(
                    Haptics.NotificationFeedbackType.Success
                  );
                  setActionAyah(null);
                }}
              >
                <Ionicons
                  name="book-outline"
                  size={22}
                  color={colors.foreground}
                />
                <Text
                  style={[styles.actionText, { color: colors.foreground }]}
                >
                  Mark as Last Read
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.cancelBtn,
                  { borderTopColor: colors.border },
                ]}
                onPress={() => setActionAyah(null)}
              >
                <Text
                  style={[
                    styles.cancelText,
                    { color: colors.mutedForeground },
                  ]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
  listHeader: {
    gap: 12,
    marginBottom: 8,
  },
  bismillahCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
  },
  bismillahText: {
    textAlign: "center",
    writingDirection: "rtl",
    lineHeight: 54,
  },
  surahInfoCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    gap: 4,
  },
  surahInfoEnglish: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  surahInfoTranslation: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  surahMeta: {
    marginTop: 4,
  },
  surahMetaText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  ayahCard: {
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  ayahHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ayahBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  ayahNumber: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  arabicText: {
    textAlign: "right",
    writingDirection: "rtl",
  },
  translation: {
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
  tafseerToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
  },
  tafseerLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  tafseerText: {
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    paddingLeft: 12,
    borderLeftWidth: 2,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  actionSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    padding: 20,
    paddingBottom: 36,
    gap: 4,
  },
  actionTitle: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    marginBottom: 8,
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  actionText: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
  },
  cancelBtn: {
    borderTopWidth: 1,
    marginTop: 8,
    paddingTop: 14,
    alignItems: "center",
  },
  cancelText: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
});
