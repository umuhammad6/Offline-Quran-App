import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React from "react";
import {
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import {
  TAJWEED_RULE_COLORS,
  TAJWEED_RULE_DESCRIPTIONS,
  TAJWEED_RULE_LABELS,
} from "@/constants/tajweed";
import { useTajweedRules } from "@/context/TajweedContext";

const RULES = Object.keys(TAJWEED_RULE_LABELS).map((code) => ({
  code,
  label: TAJWEED_RULE_LABELS[code],
  description: TAJWEED_RULE_DESCRIPTIONS[code],
  color: TAJWEED_RULE_COLORS[code],
}));

export default function TajweedRulesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isRuleEnabled, toggleRule, resetToDefaults, enabledRules } =
    useTajweedRules();

  const enabledCount = Object.values(enabledRules).filter(Boolean).length;

  const handleReset = () => {
    Alert.alert(
      "Reset Tajweed Rules",
      "Enable all tajweed rules?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          onPress: resetToDefaults,
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: "Tajweed Rules",
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.foreground,
          headerTitleStyle: { fontFamily: "Inter_600SemiBold" },
          headerRight: () => (
            <TouchableOpacity onPress={handleReset} style={{ marginRight: 4 }}>
              <Text style={[styles.resetBtn, { color: colors.primary }]}>
                Reset All
              </Text>
            </TouchableOpacity>
          ),
        }}
      />

      <View
        style={[
          styles.countBanner,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Ionicons name="color-palette-outline" size={18} color={colors.primary} />
        <Text style={[styles.countText, { color: colors.mutedForeground }]}>
          {enabledCount} of {RULES.length} rules showing colour
        </Text>
      </View>

      <FlatList
        data={RULES}
        keyExtractor={(r) => r.code}
        contentContainerStyle={{
          paddingBottom: Platform.OS === "web" ? 84 + 34 : 60,
          paddingTop: 8,
        }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => {
          const enabled = isRuleEnabled(item.code);
          const isLast = index === RULES.length - 1;
          return (
            <View
              style={[
                styles.ruleCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  opacity: enabled ? 1 : 0.5,
                },
              ]}
            >
              <View style={styles.ruleLeft}>
                <View
                  style={[
                    styles.colorDot,
                    { backgroundColor: item.color },
                  ]}
                />
                <View style={styles.ruleText}>
                  <Text
                    style={[styles.ruleLabel, { color: colors.foreground }]}
                  >
                    {item.label}
                  </Text>
                  <Text
                    style={[
                      styles.ruleDesc,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    {item.description}
                  </Text>
                </View>
              </View>
              <Switch
                value={enabled}
                onValueChange={() => toggleRule(item.code)}
                trackColor={{ false: colors.muted, true: item.color + "99" }}
                thumbColor={enabled ? item.color : colors.card}
              />
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  resetBtn: { fontSize: 15, fontFamily: "Inter_500Medium" },
  countBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  countText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  ruleCard: {
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  ruleLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginTop: 3,
    flexShrink: 0,
  },
  ruleText: { flex: 1, gap: 4 },
  ruleLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  ruleDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
});
