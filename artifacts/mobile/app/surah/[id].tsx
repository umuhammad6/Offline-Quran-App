import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import {
  getArabicEdition,
  getArabicFontFamily,
  useQuranSettings,
  type QuranSettings,
} from "@/context/QuranContext";
import { useBookmarks } from "@/context/BookmarkContext";
import { AyahData } from "@/components/AyahItem";
import TajweedText, { stripTajweedTags } from "@/components/TajweedText";

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

async function fetchAyahTafseer(
  surahId: number,
  ayahNum: number,
  tafsirId: string
): Promise<string> {
  const res = await fetch(
    `https://api.quran.com/api/v4/tafsirs/${tafsirId}/by_ayah/${surahId}:${ayahNum}`
  );
  const json = await res.json();
  const raw = json.tafsir?.text ?? "";
  return raw.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

const BISMILLAH = "بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ";
const MAX_SCROLL_RETRIES = 40;

export default function SurahScreen() {
  const { id, scrollToAyah, forceCardMode } = useLocalSearchParams<{
    id: string;
    scrollToAyah?: string;
    forceCardMode?: string;
  }>();
  const colors = useColors();
  const navigation = useNavigation();
  const router = useRouter();
  const { settings } = useQuranSettings();
  const { addBookmark, removeBookmark, isBookmarked, setLastRead, bookmarks } =
    useBookmarks();

  const surahId = Number(id);
  const fontFamily = getArabicFontFamily(settings.fontType);
  const arabicEdition = settings.showTajweed
    ? "quran-tajweed"
    : getArabicEdition(settings.fontType);

  const effectiveContinuous =
    settings.continuousMode && forceCardMode !== "true";

  const scrollRef = useRef<ScrollView>(null);
  const ayahPositions = useRef<Map<number, number>>(new Map());
  const scrollRetryRef = useRef(0);
  const highlightAnim = useRef(new Animated.Value(0)).current;
  const [highlightedAyah, setHighlightedAyah] = useState<number | null>(null);

  const [actionAyah, setActionAyah] = useState<AyahData | null>(null);
  const [tafseerCache, setTafseerCache] = useState<Map<number, string | null>>(
    new Map()
  );
  const [loadingTafseers, setLoadingTafseers] = useState<Set<number>>(
    new Set()
  );
  const [expandedTafseers, setExpandedTafseers] = useState<Set<number>>(
    new Set()
  );

  const { data: arabicData, isLoading: arabicLoading } = useQuery({
    queryKey: ["surah-arabic", surahId, arabicEdition],
    queryFn: () => fetchSurahEdition(surahId, arabicEdition),
    staleTime: 1000 * 60 * 60,
  });

  const { data: translationData } = useQuery({
    queryKey: ["surah-translation", surahId, settings.translationEdition],
    queryFn: () => fetchSurahEdition(surahId, settings.translationEdition),
    enabled: settings.showTranslation && !effectiveContinuous,
    staleTime: 1000 * 60 * 60,
  });

  useEffect(() => {
    if (arabicData) {
      navigation.setOptions({
        title: arabicData.englishName,
        headerRight: () => (
          <Text
            style={{
              fontFamily,
              fontSize: 18,
              color: colors.accent,
              marginRight: 8,
            }}
          >
            {arabicData.name}
          </Text>
        ),
      });
    }
  }, [arabicData, fontFamily, colors.accent]);

  const flashHighlight = useCallback(
    (ayahNum: number) => {
      setHighlightedAyah(ayahNum);
      highlightAnim.setValue(0);
      Animated.sequence([
        Animated.timing(highlightAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: false,
        }),
        Animated.delay(500),
        Animated.timing(highlightAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: false,
        }),
      ]).start(() => setHighlightedAyah(null));
    },
    [highlightAnim]
  );

  const doScrollToAyah = useCallback(
    (ayahNum: number) => {
      const y = ayahPositions.current.get(ayahNum);
      if (y !== undefined) {
        scrollRetryRef.current = 0;
        scrollRef.current?.scrollTo({ y: Math.max(0, y - 80), animated: true });
        setTimeout(() => flashHighlight(ayahNum), 400);
      } else if (scrollRetryRef.current < MAX_SCROLL_RETRIES) {
        scrollRetryRef.current++;
        setTimeout(() => doScrollToAyah(ayahNum), 150);
      }
    },
    [flashHighlight]
  );

  useEffect(() => {
    if (!arabicData || !scrollToAyah) return;
    scrollRetryRef.current = 0;
    ayahPositions.current.clear();
    const target = Number(scrollToAyah);
    setTimeout(() => doScrollToAyah(target), 400);
  }, [arabicData, scrollToAyah]);

  const ayahs: AyahData[] = useMemo(
    () =>
      (arabicData?.ayahs ?? []).map((ayah, i) => ({
        number: ayah.number,
        numberInSurah: ayah.numberInSurah,
        text: ayah.text,
        translation: translationData?.ayahs[i]?.text,
        surahNumber: surahId,
        surahName: arabicData?.name ?? "",
        surahEnglishName: arabicData?.englishName ?? "",
      })),
    [arabicData, translationData, surahId]
  );

  const loadTafseer = useCallback(
    async (ayahNum: number) => {
      if (tafseerCache.has(ayahNum) || loadingTafseers.has(ayahNum)) return;
      setLoadingTafseers((prev) => new Set([...prev, ayahNum]));
      try {
        const text = await fetchAyahTafseer(
          surahId,
          ayahNum,
          settings.tafseerSource
        );
        setTafseerCache(
          (prev) => new Map([...prev, [ayahNum, text || null]])
        );
      } catch {
        setTafseerCache((prev) => new Map([...prev, [ayahNum, null]]));
      } finally {
        setLoadingTafseers((prev) => {
          const n = new Set(prev);
          n.delete(ayahNum);
          return n;
        });
      }
    },
    [surahId, settings.tafseerSource, tafseerCache, loadingTafseers]
  );

  const toggleTafseer = useCallback(
    (ayahNum: number) => {
      setExpandedTafseers((prev) => {
        const next = new Set(prev);
        if (next.has(ayahNum)) {
          next.delete(ayahNum);
        } else {
          next.add(ayahNum);
          loadTafseer(ayahNum);
        }
        return next;
      });
    },
    [loadTafseer]
  );

  const handleTap = useCallback((ayah: AyahData) => {
    Haptics.selectionAsync();
    setActionAyah(ayah);
  }, []);

  const handleShare = useCallback(
    async (ayah: AyahData) => {
      const arabic = settings.showTajweed
        ? stripTajweedTags(ayah.text)
        : ayah.text;
      const lines = [arabic];
      if (ayah.translation) lines.push(`\n"${ayah.translation}"`);
      lines.push(
        `\n— ${ayah.surahEnglishName} (${ayah.surahName}), Ayah ${ayah.numberInSurah}`
      );
      setActionAyah(null);
      await Share.share({ message: lines.join("") });
    },
    [settings.showTajweed]
  );

  const handleCopy = useCallback(
    async (ayah: AyahData) => {
      const arabic = settings.showTajweed
        ? stripTajweedTags(ayah.text)
        : ayah.text;
      const text = [
        arabic,
        ayah.translation ? `\n"${ayah.translation}"` : "",
        `\n— ${ayah.surahEnglishName}, Ayah ${ayah.numberInSurah}`,
      ].join("");
      await Clipboard.setStringAsync(text);
      setActionAyah(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Copied", "Ayah copied to clipboard");
    },
    [settings.showTajweed]
  );

  const showBismillah = surahId !== 1 && surahId !== 9;

  const highlightBg = highlightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["transparent", colors.primary + "28"],
  });

  const swipeGesture = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetX([-40, 40])
    .failOffsetY([-25, 25])
    .onEnd((e) => {
      if (e.translationX < -80 && e.velocityX < -100 && surahId < 114) {
        router.replace({
          pathname: "/surah/[id]",
          params: { id: (surahId + 1).toString() },
        });
      } else if (e.translationX > 80 && e.velocityX > 100 && surahId > 1) {
        router.replace({
          pathname: "/surah/[id]",
          params: { id: (surahId - 1).toString() },
        });
      }
    });

  if (arabicLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, flex: 1 }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const surahHeader = arabicData ? (
    <View style={[styles.surahInfoCard, { backgroundColor: colors.primary }]}>
      <Text
        style={[
          styles.surahInfoArabic,
          { color: colors.primaryForeground, fontFamily },
        ]}
      >
        {arabicData.name}
      </Text>
      <Text
        style={[styles.surahInfoEnglish, { color: colors.primaryForeground }]}
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
      <Text
        style={[
          styles.surahMetaText,
          { color: colors.primaryForeground, opacity: 0.65 },
        ]}
      >
        {arabicData.numberOfAyahs} verses · {arabicData.revelationType}
      </Text>
    </View>
  ) : null;

  const bismillahBlock = showBismillah ? (
    <View
      style={[
        styles.bismillahCard,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Text
        style={[
          styles.bismillahText,
          {
            color: colors.foreground,
            fontFamily,
            fontSize: settings.arabicFontSize,
            lineHeight: settings.arabicFontSize * 2,
          },
        ]}
      >
        {BISMILLAH}
      </Text>
    </View>
  ) : null;

  const swipeHint =
    surahId > 1 || surahId < 114 ? (
      <View
        style={[
          styles.swipeHint,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Ionicons name="chevron-back" size={13} color={colors.mutedForeground} />
        <Text style={[styles.swipeHintText, { color: colors.mutedForeground }]}>
          Swipe to navigate between surahs
        </Text>
        <Ionicons
          name="chevron-forward"
          size={13}
          color={colors.mutedForeground}
        />
      </View>
    ) : null;

  return (
    <GestureDetector gesture={swipeGesture}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{
            paddingBottom: Platform.OS === "web" ? 84 + 34 : 100,
          }}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
        >
          {surahHeader}
          {bismillahBlock}

          {effectiveContinuous ? (
            <>
              <View
                style={[
                  styles.contModeHint,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="hand-left-outline"
                  size={13}
                  color={colors.mutedForeground}
                />
                <Text
                  style={[
                    styles.contHintText,
                    { color: colors.mutedForeground },
                  ]}
                >
                  Continuous mode — tap any ayah for options
                </Text>
              </View>

              <View style={styles.pageContainer}>
                {ayahs.map((ayah) => {
                  const isHighlighted = highlightedAyah === ayah.numberInSurah;
                  const bookmarked = isBookmarked(
                    ayah.surahNumber,
                    ayah.numberInSurah
                  );
                  return (
                    <Pressable
                      key={ayah.numberInSurah}
                      onPress={() => handleTap(ayah)}
                      onLayout={(e) => {
                        ayahPositions.current.set(
                          ayah.numberInSurah,
                          e.nativeEvent.layout.y +
                            (e.nativeEvent.layout.height === 0
                              ? 0
                              : 0)
                        );
                      }}
                    >
                      {isHighlighted ? (
                        <Animated.View
                          style={[
                            styles.pageAyah,
                            { backgroundColor: highlightBg },
                          ]}
                        >
                          <PageAyahContent
                            ayah={ayah}
                            bookmarked={bookmarked}
                            settings={settings}
                            fontFamily={fontFamily}
                            accentColor={colors.accent}
                            foregroundColor={colors.foreground}
                          />
                        </Animated.View>
                      ) : (
                        <View style={styles.pageAyah}>
                          <PageAyahContent
                            ayah={ayah}
                            bookmarked={bookmarked}
                            settings={settings}
                            fontFamily={fontFamily}
                            accentColor={colors.accent}
                            foregroundColor={colors.foreground}
                          />
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : (
            <>
              {swipeHint}
              <View
                style={[
                  styles.tapHint,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Ionicons
                  name="hand-left-outline"
                  size={13}
                  color={colors.mutedForeground}
                />
                <Text
                  style={[
                    styles.contHintText,
                    { color: colors.mutedForeground },
                  ]}
                >
                  Tap any ayah for share, copy, bookmark & more
                </Text>
              </View>
              {ayahs.map((ayah) => {
                const bookmarked = isBookmarked(
                  ayah.surahNumber,
                  ayah.numberInSurah
                );
                const tafseerExpanded = expandedTafseers.has(
                  ayah.numberInSurah
                );
                const tafseerText =
                  tafseerCache.get(ayah.numberInSurah) ?? null;
                const tafseerLoading = loadingTafseers.has(
                  ayah.numberInSurah
                );
                const isHighlighted = highlightedAyah === ayah.numberInSurah;

                const cardContent = (
                  <Pressable
                    onPress={() => handleTap(ayah)}
                    onLayout={(e) => {
                      ayahPositions.current.set(
                        ayah.numberInSurah,
                        e.nativeEvent.layout.y
                      );
                    }}
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
                          style={[styles.ayahNumber, { color: colors.accent }]}
                        >
                          {ayah.numberInSurah}
                        </Text>
                      </View>
                      <View style={styles.ayahHeaderRight}>
                        {bookmarked && (
                          <Ionicons
                            name="bookmark"
                            size={16}
                            color={colors.accent}
                          />
                        )}
                      </View>
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
                            lineHeight: settings.arabicFontSize * 2,
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
                            lineHeight: settings.translationFontSize * 1.7,
                          },
                        ]}
                      >
                        {ayah.translation}
                      </Text>
                    ) : null}

                    {settings.showTafseer && (
                      <View>
                        <TouchableOpacity
                          style={styles.tafseerToggle}
                          onPress={() => toggleTafseer(ayah.numberInSurah)}
                        >
                          <Text
                            style={[
                              styles.tafseerLabel,
                              { color: colors.primary },
                            ]}
                          >
                            Tafseer
                          </Text>
                          <Ionicons
                            name={
                              tafseerExpanded ? "chevron-up" : "chevron-down"
                            }
                            size={14}
                            color={colors.primary}
                          />
                        </TouchableOpacity>
                        {tafseerExpanded && (
                          <View
                            style={[
                              styles.tafseerBlock,
                              { borderLeftColor: colors.primary },
                            ]}
                          >
                            {tafseerLoading ? (
                              <ActivityIndicator
                                size="small"
                                color={colors.primary}
                              />
                            ) : tafseerText ? (
                              <Text
                                style={[
                                  styles.tafseerText,
                                  {
                                    color: colors.mutedForeground,
                                    fontSize: settings.tafseerFontSize,
                                    lineHeight:
                                      settings.tafseerFontSize * 1.75,
                                  },
                                ]}
                              >
                                {tafseerText}
                              </Text>
                            ) : (
                              <Text
                                style={[
                                  styles.tafseerText,
                                  { color: colors.mutedForeground },
                                ]}
                              >
                                Tafseer not available for this ayah.
                              </Text>
                            )}
                          </View>
                        )}
                      </View>
                    )}
                  </Pressable>
                );

                return isHighlighted ? (
                  <Animated.View
                    key={ayah.numberInSurah}
                    style={{
                      backgroundColor: highlightBg,
                      marginHorizontal: 16,
                      marginVertical: 5,
                      borderRadius: 14,
                    }}
                  >
                    {cardContent}
                  </Animated.View>
                ) : (
                  <View key={ayah.numberInSurah}>{cardContent}</View>
                );
              })}
            </>
          )}
        </ScrollView>

        {actionAyah && (
          <Modal
            visible
            transparent
            animationType="slide"
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
                <View
                  style={[
                    styles.sheetHandle,
                    { backgroundColor: colors.border },
                  ]}
                />
                <Text
                  style={[
                    styles.actionTitle,
                    { color: colors.mutedForeground },
                  ]}
                >
                  {actionAyah.surahEnglishName} · Ayah{" "}
                  {actionAyah.numberInSurah}
                </Text>

                <TouchableOpacity
                  style={styles.actionItem}
                  onPress={() => handleShare(actionAyah)}
                >
                  <Ionicons
                    name="share-social-outline"
                    size={22}
                    color={colors.primary}
                  />
                  <Text
                    style={[styles.actionText, { color: colors.foreground }]}
                  >
                    Share Ayah
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionItem}
                  onPress={() => handleCopy(actionAyah)}
                >
                  <Ionicons
                    name="copy-outline"
                    size={22}
                    color={colors.primary}
                  />
                  <Text
                    style={[styles.actionText, { color: colors.foreground }]}
                  >
                    Copy Ayah
                  </Text>
                </TouchableOpacity>

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
                        color={colors.primary}
                      />
                      <Text
                        style={[
                          styles.actionText,
                          { color: colors.foreground },
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
                    Alert.alert(
                      "Last Read Saved",
                      `Marked Ayah ${actionAyah.numberInSurah} as your last read position.`
                    );
                  }}
                >
                  <Ionicons
                    name="bookmark-outline"
                    size={22}
                    color={colors.accent}
                  />
                  <Text
                    style={[styles.actionText, { color: colors.foreground }]}
                  >
                    Mark as Last Read
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionItem, styles.actionItemLast]}
                  onPress={() => setActionAyah(null)}
                >
                  <Text
                    style={[
                      styles.actionText,
                      {
                        color: colors.mutedForeground,
                        textAlign: "center",
                        flex: 1,
                      },
                    ]}
                  >
                    Close
                  </Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Modal>
        )}
      </View>
    </GestureDetector>
  );
}

function PageAyahContent({
  ayah,
  bookmarked,
  settings,
  fontFamily,
  accentColor,
  foregroundColor,
}: {
  ayah: AyahData;
  bookmarked: boolean;
  settings: QuranSettings;
  fontFamily: string;
  accentColor: string;
  foregroundColor: string;
}) {
  return (
    <>
      {bookmarked && (
        <View style={styles.pageBookmarkDot}>
          <Ionicons name="bookmark" size={11} color={accentColor} />
        </View>
      )}
      {settings.showTajweed ? (
        <TajweedText
          text={ayah.text}
          fontSize={settings.arabicFontSize}
          fontFamily={fontFamily}
          color={foregroundColor}
          style={{
            textAlign: "right",
            writingDirection: "rtl",
            lineHeight: settings.arabicFontSize * 2.2,
          }}
          suffix={<Text style={{ color: accentColor, fontSize: settings.arabicFontSize * 0.72 }}>{" "}﴿{ayah.numberInSurah}﴾</Text>}
        />
      ) : (
        <Text
          style={{
            fontFamily,
            fontSize: settings.arabicFontSize,
            color: foregroundColor,
            textAlign: "right",
            writingDirection: "rtl",
            lineHeight: settings.arabicFontSize * 2.2,
          }}
        >
          {ayah.text}
          <Text
            style={{
              color: accentColor,
              fontSize: settings.arabicFontSize * 0.72,
            }}
          >
            {" "}﴿{ayah.numberInSurah}﴾
          </Text>
        </Text>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  surahInfoCard: {
    margin: 16,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    gap: 4,
  },
  surahInfoArabic: {
    fontSize: 32,
    textAlign: "center",
    writingDirection: "rtl",
  },
  surahInfoEnglish: {
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
    marginTop: 4,
  },
  surahInfoTranslation: { fontSize: 14, fontFamily: "Inter_400Regular" },
  surahMetaText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
  },
  bismillahCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    alignItems: "center",
  },
  bismillahText: { textAlign: "center", writingDirection: "rtl" },
  swipeHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
    justifyContent: "center",
  },
  tapHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
    justifyContent: "center",
  },
  contModeHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 4,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
    justifyContent: "center",
  },
  contHintText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  swipeHintText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  pageContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  pageAyah: {
    paddingVertical: 6,
    borderRadius: 8,
    position: "relative",
  },
  pageBookmarkDot: {
    position: "absolute",
    top: 4,
    right: 0,
  },
  ayahCard: {
    marginHorizontal: 16,
    marginVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 10,
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
  ayahNumber: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  ayahHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  arabicText: {
    textAlign: "right",
    writingDirection: "rtl",
  },
  translation: {
    fontFamily: "Inter_400Regular",
  },
  tafseerToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#ccc",
  },
  tafseerLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  tafseerBlock: {
    marginTop: 8,
    paddingLeft: 12,
    borderLeftWidth: 3,
  },
  tafseerText: {
    fontFamily: "Inter_400Regular",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  actionSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingBottom: 34,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    paddingBottom: 12,
    paddingHorizontal: 20,
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(128,128,128,0.2)",
  },
  actionItemLast: {},
  actionText: { fontSize: 16, fontFamily: "Inter_400Regular" },
  listHeader: { gap: 0 },
});
