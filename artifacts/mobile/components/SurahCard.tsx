import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";

export interface SurahMeta {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: "Meccan" | "Medinan";
}

interface SurahCardProps {
  surah: SurahMeta;
  onPress: () => void;
}

export default function SurahCard({ surah, onPress }: SurahCardProps) {
  const colors = useColors();

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.numberBadge, { backgroundColor: colors.primary }]}>
        <Text style={[styles.numberText, { color: colors.primaryForeground }]}>
          {surah.number}
        </Text>
      </View>

      <View style={styles.info}>
        <Text style={[styles.englishName, { color: colors.foreground }]}>
          {surah.englishName}
        </Text>
        <Text style={[styles.translation, { color: colors.mutedForeground }]}>
          {surah.englishNameTranslation}
        </Text>
        <View style={styles.meta}>
          <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
            {surah.numberOfAyahs} verses
          </Text>
          <View style={[styles.dot, { backgroundColor: colors.mutedForeground }]} />
          <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
            {surah.revelationType}
          </Text>
        </View>
      </View>

      <Text style={[styles.arabicName, { color: colors.accent }]}>
        {surah.name}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  numberBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  numberText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  info: {
    flex: 1,
    gap: 2,
  },
  englishName: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  translation: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  metaText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  arabicName: {
    fontSize: 20,
    fontFamily: "Amiri_400Regular",
    textAlign: "right",
  },
});
