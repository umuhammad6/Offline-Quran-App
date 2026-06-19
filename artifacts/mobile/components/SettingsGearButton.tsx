import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { TouchableOpacity } from "react-native";
import { useColors } from "@/hooks/useColors";

export default function SettingsGearButton() {
  const router = useRouter();
  const colors = useColors();
  return (
    <TouchableOpacity
      onPress={() => router.push("/(tabs)/settings" as any)}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
    >
      <Ionicons name="settings-outline" size={22} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}
