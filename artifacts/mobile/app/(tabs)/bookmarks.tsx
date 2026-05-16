import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useBookmarks } from "@/context/BookmarkContext";
import { getArabicFontFamily, useQuranSettings } from "@/context/QuranContext";

export default function BookmarksScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { bookmarks, removeBookmark } = useBookmarks();
  const { settings } = useQuranSettings();
  const arabicFont = getArabicFontFamily(settings.fontType);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const handleRemove = (id: string, surahName: string) => {
    Alert.alert(
      "Remove Bookmark",
      `Remove bookmark from ${surahName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            removeBookmark(id);
            Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Warning
            );
          },
        },
      ]
    );
  };

  const handleNavigate = (surahNumber: number, ayahNumber: number) => {
    router.push({
      pathname: "/surah/[id]",
      params: {
        id: surahNumber.toString(),
        scrollToAyah: ayahNumber.toString(),
      },
    });
  };

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
        <Text style={[styles.title, { color: colors.foreground }]}>
          Bookmarks
        </Text>
        {bookmarks.length > 0 && (
          <View
            style={[styles.countBadge, { backgroundColor: colors.primary }]}
          >
            <Text
              style={[styles.countText, { color: colors.primaryForeground }]}
            >
              {bookmarks.length}
            </Text>
          </View>
        )}
      </View>

      {bookmarks.length === 0 ? (
        <View style={styles.empty}>
          <View
            style={[
              styles.emptyIconWrap,
              { backgroundColor: colors.secondary },
            ]}
          >
            <Ionicons name="bookmark-outline" size={40} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            No bookmarks yet
          </Text>
          <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
            Tap an ayah while reading and select "Bookmark Ayah" to save it
            here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={[...bookmarks].reverse()}
          keyExtractor={(b) => b.id}
          contentContainerStyle={{
            paddingBottom: Platform.OS === "web" ? 84 + 34 : 100,
            paddingTop: 8,
          }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.bookmarkCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={() =>
                handleNavigate(item.surahNumber, item.ayahNumber)
              }
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.ayahBadge,
                  { backgroundColor: colors.primary },
                ]}
              >
                <Text
                  style={[
                    styles.ayahBadgeText,
                    { color: colors.primaryForeground },
                  ]}
                >
                  {item.surahNumber}
                </Text>
              </View>

              <View style={styles.bookmarkInfo}>
                <View style={styles.bookmarkNameRow}>
                  <Text
                    style={[styles.surahEnglish, { color: colors.foreground }]}
                  >
                    {item.surahEnglishName}
                  </Text>
                  <Text
                    style={[
                      styles.surahArabic,
                      { color: colors.accent, fontFamily: arabicFont },
                    ]}
                  >
                    {item.surahName}
                  </Text>
                </View>
                <Text
                  style={[styles.ayahRef, { color: colors.mutedForeground }]}
                >
                  Ayah {item.ayahNumber}
                </Text>
                <Text
                  style={[styles.timestamp, { color: colors.mutedForeground }]}
                >
                  {new Date(item.timestamp).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() =>
                  handleRemove(item.id, item.surahEnglishName)
                }
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name="trash-outline"
                  size={18}
                  color={colors.mutedForeground}
                />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  title: { fontSize: 26, fontFamily: "Inter_700Bold" },
  countBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    paddingHorizontal: 40,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  emptyDesc: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },
  bookmarkCard: {
    marginHorizontal: 16,
    marginVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  ayahBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  ayahBadgeText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  bookmarkInfo: { flex: 1, gap: 2 },
  bookmarkNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  surahEnglish: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  surahArabic: { fontSize: 16 },
  ayahRef: { fontSize: 13, fontFamily: "Inter_400Regular" },
  timestamp: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  removeBtn: { padding: 4 },
});
