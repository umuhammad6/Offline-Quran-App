import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import {
  ARABIC_FONT_FAMILIES,
  FONT_TYPE_DESCRIPTIONS,
  FONT_TYPE_LABELS,
  TAFSEER_SOURCES,
  TRANSLATION_OPTIONS,
  useQuranSettings,
  type QuranSettings,
} from "@/context/QuranContext";

function SectionHeader({ title }: { title: string }) {
  const colors = useColors();
  return (
    <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
      {title}
    </Text>
  );
}

function SettingRow({
  label,
  children,
  last,
  description,
}: {
  label: string;
  children: React.ReactNode;
  last?: boolean;
  description?: string;
}) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.settingRow,
        { borderBottomColor: last ? "transparent" : colors.border },
      ]}
    >
      <View style={styles.settingLabelGroup}>
        <Text style={[styles.settingLabel, { color: colors.foreground }]}>
          {label}
        </Text>
        {description ? (
          <Text
            style={[styles.settingDesc, { color: colors.mutedForeground }]}
          >
            {description}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function SizeControl({
  value,
  min,
  max,
  onDecrease,
  onIncrease,
}: {
  value: number;
  min: number;
  max: number;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  const colors = useColors();
  return (
    <View style={styles.sizeControl}>
      <TouchableOpacity
        style={[
          styles.sizeBtn,
          { backgroundColor: value <= min ? colors.muted : colors.secondary },
        ]}
        onPress={onDecrease}
        disabled={value <= min}
      >
        <Ionicons
          name="remove"
          size={18}
          color={value <= min ? colors.mutedForeground : colors.primary}
        />
      </TouchableOpacity>
      <Text style={[styles.sizeValue, { color: colors.foreground }]}>
        {value}
      </Text>
      <TouchableOpacity
        style={[
          styles.sizeBtn,
          { backgroundColor: value >= max ? colors.muted : colors.secondary },
        ]}
        onPress={onIncrease}
        disabled={value >= max}
      >
        <Ionicons
          name="add"
          size={18}
          color={value >= max ? colors.mutedForeground : colors.primary}
        />
      </TouchableOpacity>
    </View>
  );
}

type PickerMode = "translation" | "tafseer" | null;

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings, updateSetting } = useQuranSettings();
  const [pickerMode, setPickerMode] = useState<PickerMode>(null);
  const router = useRouter();

  const topPad = Platform.OS === "web" ? 20 : insets.top;
  const bottomPad = Platform.OS === "web" ? 84 + 34 : 100;

  const pickerOptions =
    pickerMode === "translation" ? TRANSLATION_OPTIONS : TAFSEER_SOURCES;
  const pickerValue =
    pickerMode === "translation"
      ? settings.translationEdition
      : settings.tafseerSource;
  const pickerKey: keyof QuranSettings =
    pickerMode === "translation" ? "translationEdition" : "tafseerSource";

  const fontTypes: QuranSettings["fontType"][] = ["uthmani", "indopak"];
  const themes: { id: QuranSettings["theme"]; label: string; icon: string }[] =
    [
      { id: "light", label: "Light", icon: "sunny-outline" },
      { id: "dark", label: "Dark", icon: "moon-outline" },
      { id: "system", label: "System", icon: "phone-portrait-outline" },
    ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topPad + 20, paddingBottom: bottomPad },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>
          Settings
        </Text>

        {/* APPEARANCE */}
        <View
          style={[
            styles.section,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <SectionHeader title="APPEARANCE" />

          <SettingRow label="Theme">
            <View style={styles.themeRow}>
              {themes.map((t) => {
                const active = settings.theme === t.id;
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[
                      styles.themeOption,
                      {
                        backgroundColor: active
                          ? colors.primary
                          : colors.secondary,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => updateSetting("theme", t.id)}
                  >
                    <Ionicons
                      name={t.icon as any}
                      size={15}
                      color={active ? colors.primaryForeground : colors.foreground}
                    />
                    <Text
                      style={[
                        styles.themeLabel,
                        {
                          color: active
                            ? colors.primaryForeground
                            : colors.foreground,
                        },
                      ]}
                    >
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </SettingRow>

          <SettingRow label="Show Translation">
            <Switch
              value={settings.showTranslation}
              onValueChange={(v) => updateSetting("showTranslation", v)}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor={colors.card}
            />
          </SettingRow>

          <SettingRow label="Show Tafseer">
            <Switch
              value={settings.showTafseer}
              onValueChange={(v) => updateSetting("showTafseer", v)}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor={colors.card}
            />
          </SettingRow>

          <SettingRow label="Show Tajweed">
            <Switch
              value={settings.showTajweed}
              onValueChange={(v) => updateSetting("showTajweed", v)}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor={colors.card}
            />
          </SettingRow>

          <TouchableOpacity
            style={[styles.settingRow, { borderBottomColor: colors.border }]}
            onPress={() => router.push("/tajweed-rules" as any)}
          >
            <View style={styles.settingLabelGroup}>
              <Text style={[styles.settingLabel, { color: colors.foreground }]}>
                Tajweed Rules
              </Text>
              <Text style={[styles.settingDesc, { color: colors.mutedForeground }]}>
                Configure which rules show colour highlights
              </Text>
            </View>
            <View style={styles.pickerValue}>
              <Ionicons name="color-palette-outline" size={18} color={colors.primary} />
              <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
            </View>
          </TouchableOpacity>

          <SettingRow
            label="Continuous Mode"
            description="Show entire surah as flowing text instead of individual cards"
            last
          >
            <Switch
              value={settings.continuousMode}
              onValueChange={(v) => updateSetting("continuousMode", v)}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor={colors.card}
            />
          </SettingRow>
        </View>

        {/* ARABIC FONT */}
        <View
          style={[
            styles.section,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <SectionHeader title="ARABIC FONT" />

          <View style={styles.fontTypesContainer}>
            {fontTypes.map((type) => {
              const active = settings.fontType === type;
              return (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.fontTypeCard,
                    {
                      backgroundColor: active ? colors.primary + "18" : colors.secondary,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => updateSetting("fontType", type)}
                >
                  <View style={styles.fontTypeHeader}>
                    <Text
                      style={[
                        styles.fontTypeLabel,
                        { color: active ? colors.primary : colors.foreground },
                      ]}
                    >
                      {FONT_TYPE_LABELS[type]}
                    </Text>
                    {active && (
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color={colors.primary}
                      />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.fontTypeArabic,
                      {
                        fontFamily: ARABIC_FONT_FAMILIES[type],
                        color: colors.foreground,
                      },
                    ]}
                  >
                    بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
                  </Text>
                  <Text
                    style={[
                      styles.fontTypeDesc,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    {FONT_TYPE_DESCRIPTIONS[type]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <SettingRow label="Arabic Size">
            <SizeControl
              value={settings.arabicFontSize}
              min={20}
              max={52}
              onDecrease={() =>
                updateSetting("arabicFontSize", settings.arabicFontSize - 2)
              }
              onIncrease={() =>
                updateSetting("arabicFontSize", settings.arabicFontSize + 2)
              }
            />
          </SettingRow>

          <SettingRow label="Translation Size">
            <SizeControl
              value={settings.translationFontSize}
              min={11}
              max={22}
              onDecrease={() =>
                updateSetting(
                  "translationFontSize",
                  settings.translationFontSize - 1
                )
              }
              onIncrease={() =>
                updateSetting(
                  "translationFontSize",
                  settings.translationFontSize + 1
                )
              }
            />
          </SettingRow>

          <SettingRow label="Tafseer Size" last>
            <SizeControl
              value={settings.tafseerFontSize}
              min={11}
              max={20}
              onDecrease={() =>
                updateSetting("tafseerFontSize", settings.tafseerFontSize - 1)
              }
              onIncrease={() =>
                updateSetting("tafseerFontSize", settings.tafseerFontSize + 1)
              }
            />
          </SettingRow>
        </View>

        {/* CONTENT */}
        <View
          style={[
            styles.section,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <SectionHeader title="CONTENT" />

          <TouchableOpacity
            style={[styles.settingRow, { borderBottomColor: colors.border }]}
            onPress={() => setPickerMode("translation")}
          >
            <Text style={[styles.settingLabel, { color: colors.foreground }]}>
              Translation
            </Text>
            <View style={styles.pickerValue}>
              <Text
                style={[
                  styles.pickerValueText,
                  { color: colors.mutedForeground },
                ]}
              >
                {TRANSLATION_OPTIONS.find(
                  (t) => t.id === settings.translationEdition
                )?.label ?? settings.translationEdition}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.mutedForeground}
              />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.settingRow,
              { borderBottomColor: "transparent" },
            ]}
            onPress={() => setPickerMode("tafseer")}
          >
            <View style={styles.settingLabelGroup}>
              <Text style={[styles.settingLabel, { color: colors.foreground }]}>
                Tafseer Source
              </Text>
              <Text
                style={[styles.settingDesc, { color: colors.mutedForeground }]}
              >
                Used when Tafseer is enabled above
              </Text>
            </View>
            <View style={styles.pickerValue}>
              <Text
                style={[
                  styles.pickerValueText,
                  { color: colors.mutedForeground },
                ]}
              >
                {TAFSEER_SOURCES.find(
                  (t) => t.id === settings.tafseerSource
                )?.label ?? "Ibn Kathir"}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.mutedForeground}
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* ABOUT */}
        <View
          style={[
            styles.section,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <SectionHeader title="ABOUT" />
          <View style={styles.aboutContainer}>
            <Text style={[styles.duaText, { color: colors.foreground }]}>
              May Allah SWT (سُبْحَانَهُ وَتَعَالَى) make us sincere and accept
              our deeds and save us, our parents, grandparents from the fire and
              the punishment of the grave, ameen.
            </Text>
            <Text style={[styles.versionText, { color: colors.mutedForeground }]}>
              The Holy Quran App · v1.0.0
            </Text>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={pickerMode !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerMode(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setPickerMode(null)}
        >
          <View
            style={[
              styles.pickerSheet,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View
              style={[styles.pickerHandle, { backgroundColor: colors.border }]}
            />
            <Text
              style={[styles.pickerTitle, { color: colors.foreground }]}
            >
              Select{" "}
              {pickerMode === "translation" ? "Translation" : "Tafseer Source"}
            </Text>
            {pickerOptions.map((opt) => (
              <TouchableOpacity
                key={opt.id}
                style={[
                  styles.pickerOption,
                  { borderBottomColor: colors.border },
                ]}
                onPress={() => {
                  updateSetting(pickerKey, opt.id);
                  setPickerMode(null);
                }}
              >
                <View>
                  <Text
                    style={[
                      styles.pickerOptLabel,
                      { color: colors.foreground },
                    ]}
                  >
                    {opt.label}
                  </Text>
                  <Text
                    style={[
                      styles.pickerOptLang,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    {opt.language}
                  </Text>
                </View>
                {pickerValue === opt.id && (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20, gap: 16 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold" },
  section: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    overflow: "hidden",
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
    paddingTop: 14,
    paddingBottom: 8,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  settingLabelGroup: { flex: 1, gap: 2 },
  settingLabel: { fontSize: 15, fontFamily: "Inter_400Regular" },
  settingDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 16,
  },
  themeRow: { flexDirection: "row", gap: 6 },
  themeOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  themeLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  fontTypesContainer: {
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "transparent",
  },
  fontTypeCard: {
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 14,
    gap: 8,
  },
  fontTypeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  fontTypeLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  fontTypeArabic: { fontSize: 22, textAlign: "right", writingDirection: "rtl", lineHeight: 44 },
  fontTypeDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  sizeControl: { flexDirection: "row", alignItems: "center", gap: 12 },
  sizeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  sizeValue: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    width: 28,
    textAlign: "center",
  },
  pickerValue: { flexDirection: "row", alignItems: "center", gap: 6 },
  pickerValueText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  pickerSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 20,
    paddingBottom: 44,
  },
  pickerHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  pickerTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 12,
  },
  pickerOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  pickerOptLabel: { fontSize: 15, fontFamily: "Inter_500Medium" },
  pickerOptLang: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  aboutContainer: {
    padding: 18,
    gap: 12,
  },
  duaText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 24,
    textAlign: "center",
  },
  versionText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
});
