import { Ionicons } from "@expo/vector-icons";
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
  FONT_TYPE_LABELS,
  TAFSEER_OPTIONS,
  TRANSLATION_OPTIONS,
  useQuranSettings,
  type QuranSettings,
} from "@/context/QuranContext";

function SettingRow({
  label,
  children,
  last,
}: {
  label: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.settingRow,
        { borderBottomColor: last ? "transparent" : colors.border },
      ]}
    >
      <Text style={[styles.settingLabel, { color: colors.foreground }]}>
        {label}
      </Text>
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
          color={value <= min ? colors.mutedForeground : colors.foreground}
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
          color={value >= max ? colors.mutedForeground : colors.foreground}
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

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 84 + 34 : 100;

  const pickerOptions =
    pickerMode === "translation" ? TRANSLATION_OPTIONS : TAFSEER_OPTIONS;
  const pickerValue =
    pickerMode === "translation"
      ? settings.translationEdition
      : settings.tafseerEdition;
  const pickerKey: keyof QuranSettings =
    pickerMode === "translation" ? "translationEdition" : "tafseerEdition";

  const fontTypes: QuranSettings["fontType"][] = ["uthmani", "indopak"];

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

        <View
          style={[
            styles.section,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
            DISPLAY
          </Text>

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

          <SettingRow label="Tajweed Colors" last>
            <Switch
              value={settings.showTajweed}
              onValueChange={(v) => updateSetting("showTajweed", v)}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor={colors.card}
            />
          </SettingRow>
        </View>

        <View
          style={[
            styles.section,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
            ARABIC FONT
          </Text>

          <SettingRow label="Font Style">
            <View style={styles.fontToggle}>
              {fontTypes.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.fontOption,
                    {
                      backgroundColor:
                        settings.fontType === type
                          ? colors.primary
                          : colors.secondary,
                    },
                  ]}
                  onPress={() => updateSetting("fontType", type)}
                >
                  <Text
                    style={[
                      styles.fontOptionText,
                      {
                        color:
                          settings.fontType === type
                            ? colors.primaryForeground
                            : colors.foreground,
                      },
                    ]}
                  >
                    {FONT_TYPE_LABELS[type]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </SettingRow>

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

          <View
            style={[
              styles.arabicPreview,
              { backgroundColor: colors.secondary, borderColor: colors.border },
            ]}
          >
            <Text
              style={[
                {
                  color: colors.foreground,
                  fontSize: settings.arabicFontSize,
                  fontFamily: ARABIC_FONT_FAMILIES[settings.fontType],
                  textAlign: "right",
                  writingDirection: "rtl",
                  lineHeight: settings.arabicFontSize * 1.9,
                },
              ]}
            >
              بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
            </Text>
            <Text
              style={[
                styles.fontLabel,
                { color: colors.mutedForeground },
              ]}
            >
              {FONT_TYPE_LABELS[settings.fontType]}
            </Text>
          </View>

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

        <View
          style={[
            styles.section,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
            CONTENT
          </Text>

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
            style={[styles.settingRow, { borderBottomColor: "transparent" }]}
            onPress={() => setPickerMode("tafseer")}
          >
            <Text style={[styles.settingLabel, { color: colors.foreground }]}>
              Tafseer
            </Text>
            <View style={styles.pickerValue}>
              <Text
                style={[
                  styles.pickerValueText,
                  { color: colors.mutedForeground },
                ]}
              >
                {TAFSEER_OPTIONS.find((t) => t.id === settings.tafseerEdition)
                  ?.label ?? settings.tafseerEdition}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.mutedForeground}
              />
            </View>
          </TouchableOpacity>
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
              style={[
                styles.pickerHandle,
                { backgroundColor: colors.border },
              ]}
            />
            <Text style={[styles.pickerTitle, { color: colors.foreground }]}>
              Select{" "}
              {pickerMode === "translation" ? "Translation" : "Tafseer"}
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
                  <Ionicons
                    name="checkmark"
                    size={20}
                    color={colors.primary}
                  />
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
  settingLabel: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  fontToggle: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  fontOption: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  fontOptionText: { fontSize: 12, fontFamily: "Inter_500Medium" },
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
  arabicPreview: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 16,
    marginVertical: 10,
    alignItems: "flex-end",
    gap: 6,
  },
  fontLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    alignSelf: "flex-start",
  },
  pickerValue: { flexDirection: "row", alignItems: "center", gap: 6 },
  pickerValueText: { fontSize: 14, fontFamily: "Inter_400Regular" },
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
    paddingBottom: 40,
  },
  pickerHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  pickerTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", marginBottom: 12 },
  pickerOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  pickerOptLabel: { fontSize: 15, fontFamily: "Inter_500Medium" },
  pickerOptLang: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
});
