import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import {
  requestNotificationPermissions,
  schedulePrayerNotifications,
  cancelPrayerNotifications,
} from "@/utils/notifications";

const LOCATION_STORAGE_KEY = "prayer_location";
const NOTIF_PREF_KEY = "prayer_notif_enabled";

interface PrayerTimes {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
  Midnight: string;
}

interface StoredLocation {
  lat: number;
  lng: number;
  city: string;
}

interface PrayerInfo {
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  time: string;
  key: keyof PrayerTimes;
}

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    country?: string;
  };
}

function getNextPrayer(times: PrayerTimes): string {
  const now = new Date();
  const currentMins = now.getHours() * 60 + now.getMinutes();
  const prayers: [keyof PrayerTimes][] = [
    ["Fajr"],
    ["Sunrise"],
    ["Dhuhr"],
    ["Asr"],
    ["Maghrib"],
    ["Isha"],
  ];
  for (const [key] of prayers) {
    const [h, m] = times[key].split(":").map(Number);
    if (h * 60 + m > currentMins) return key;
  }
  return "Fajr";
}

async function fetchPrayerTimesForCoords(
  lat: number,
  lng: number
): Promise<PrayerTimes> {
  const timestamp = Math.floor(Date.now() / 1000);
  const res = await fetch(
    `https://api.aladhan.com/v1/timings/${timestamp}?latitude=${lat}&longitude=${lng}&method=3`
  );
  const json = await res.json();
  return json.data.timings as PrayerTimes;
}

function formatSuggestionCity(item: NominatimResult): string {
  const a = item.address;
  const city = a?.city || a?.town || a?.village || a?.county;
  const state = a?.state;
  const country = a?.country;
  const parts = [city, state, country].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : item.display_name.split(",")[0].trim();
}

export default function PrayerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes | null>(null);
  const [city, setCity] = useState<string>("");
  const [nextPrayer, setNextPrayer] = useState<string>("");
  const [notifsEnabled, setNotifsEnabled] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [manualLoading, setManualLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const autocompleteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const topPad = Platform.OS === "web" ? 20 : insets.top;
  const bottomPad = Platform.OS === "web" ? 84 + 34 : 100;

  useEffect(() => {
    AsyncStorage.getItem(NOTIF_PREF_KEY).then((v) => {
      setNotifsEnabled(v === "true");
    });
    loadFromStoredOrFresh();
  }, []);

  const loadFromStoredOrFresh = async () => {
    try {
      const stored = await AsyncStorage.getItem(LOCATION_STORAGE_KEY);
      if (stored) {
        const loc: StoredLocation = JSON.parse(stored);
        await loadTimes(loc.lat, loc.lng, loc.city);
        return;
      }
    } catch {}
    await detectLocation();
  };

  const detectLocation = async () => {
    setLoading(true);
    setError(null);
    try {
      let lat: number, lng: number, detectedCity: string;

      if (Platform.OS !== "web") {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setError(
            "Location permission denied. Please enable location access or enter a city manually."
          );
          setLoading(false);
          return;
        }
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        lat = loc.coords.latitude;
        lng = loc.coords.longitude;

        const addrs = await Location.reverseGeocodeAsync({
          latitude: lat,
          longitude: lng,
        });
        const a = addrs[0];
        detectedCity =
          a?.city ||
          a?.district ||
          a?.subregion ||
          a?.region ||
          "Your Location";
      } else {
        const pos = await new Promise<GeolocationPosition>((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 10000 })
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
        detectedCity = "Your Location";
      }

      await AsyncStorage.setItem(
        LOCATION_STORAGE_KEY,
        JSON.stringify({ lat, lng, city: detectedCity })
      );
      await loadTimes(lat, lng, detectedCity);
    } catch {
      setError("Could not detect location. Please enter your city manually.");
      setLoading(false);
    }
  };

  const loadTimes = async (lat: number, lng: number, cityName: string) => {
    setLoading(true);
    setError(null);
    try {
      const times = await fetchPrayerTimesForCoords(lat, lng);
      setPrayerTimes(times);
      setCity(cityName);
      setNextPrayer(getNextPrayer(times));

      const notifOn = (await AsyncStorage.getItem(NOTIF_PREF_KEY)) === "true";
      if (notifOn && Platform.OS !== "web") {
        const prayerList = [
          { name: "Fajr", time: times.Fajr },
          { name: "Dhuhr", time: times.Dhuhr },
          { name: "Asr", time: times.Asr },
          { name: "Maghrib", time: times.Maghrib },
          { name: "Isha", time: times.Isha },
        ];
        await schedulePrayerNotifications(prayerList, cityName);
      }
    } catch {
      setError("Failed to fetch prayer times. Check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleManualInputChange = (text: string) => {
    setManualInput(text);
    setSuggestions([]);
    if (autocompleteTimer.current) clearTimeout(autocompleteTimer.current);
    if (text.trim().length < 2) {
      setSuggestionsLoading(false);
      return;
    }
    setSuggestionsLoading(true);
    autocompleteTimer.current = setTimeout(async () => {
      try {
        const encoded = encodeURIComponent(text.trim());
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=6&addressdetails=1`,
          { headers: { "User-Agent": "QuranApp/1.0" } }
        );
        const json: NominatimResult[] = await res.json();
        setSuggestions(json);
      } catch {
        setSuggestions([]);
      } finally {
        setSuggestionsLoading(false);
      }
    }, 350);
  };

  const selectSuggestion = async (item: NominatimResult) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    const cityName = formatSuggestionCity(item);
    setSuggestions([]);
    setManualInput("");
    setShowManualModal(false);
    await AsyncStorage.setItem(
      LOCATION_STORAGE_KEY,
      JSON.stringify({ lat, lng, city: cityName })
    );
    await loadTimes(lat, lng, cityName);
  };

  const handleManualSearch = async () => {
    if (!manualInput.trim()) return;
    setManualLoading(true);
    try {
      const encoded = encodeURIComponent(manualInput.trim());
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1&addressdetails=1`,
        { headers: { "User-Agent": "QuranApp/1.0" } }
      );
      const json: NominatimResult[] = await res.json();
      if (!json.length) {
        Alert.alert("Not Found", "Could not find that location. Try a different spelling.");
        setManualLoading(false);
        return;
      }
      await selectSuggestion(json[0]);
    } catch {
      Alert.alert("Error", "Failed to search. Check your connection.");
    } finally {
      setManualLoading(false);
    }
  };

  const handleDetectLocation = async () => {
    await AsyncStorage.removeItem(LOCATION_STORAGE_KEY);
    setPrayerTimes(null);
    setCity("");
    await detectLocation();
  };

  const toggleNotifications = async (val: boolean) => {
    if (Platform.OS === "web") {
      Alert.alert("Not available", "Notifications require the mobile app.");
      return;
    }
    if (val) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        Alert.alert(
          "Permission Needed",
          "Please allow notifications in your device settings."
        );
        return;
      }
      setNotifsEnabled(true);
      await AsyncStorage.setItem(NOTIF_PREF_KEY, "true");
      if (prayerTimes && city) {
        const prayerList = [
          { name: "Fajr", time: prayerTimes.Fajr },
          { name: "Dhuhr", time: prayerTimes.Dhuhr },
          { name: "Asr", time: prayerTimes.Asr },
          { name: "Maghrib", time: prayerTimes.Maghrib },
          { name: "Isha", time: prayerTimes.Isha },
        ];
        await schedulePrayerNotifications(prayerList, city);
        Alert.alert(
          "Notifications On",
          "You'll receive reminders for each prayer time. 🕌"
        );
      }
    } else {
      setNotifsEnabled(false);
      await AsyncStorage.setItem(NOTIF_PREF_KEY, "false");
      await cancelPrayerNotifications();
    }
  };

  const prayers: PrayerInfo[] = prayerTimes
    ? [
        { name: "Fajr", icon: "partly-sunny-outline", time: prayerTimes.Fajr, key: "Fajr" },
        { name: "Sunrise", icon: "sunny-outline", time: prayerTimes.Sunrise, key: "Sunrise" },
        { name: "Dhuhr", icon: "sunny", time: prayerTimes.Dhuhr, key: "Dhuhr" },
        { name: "Asr", icon: "cloudy-outline", time: prayerTimes.Asr, key: "Asr" },
        { name: "Maghrib", icon: "partly-sunny-outline", time: prayerTimes.Maghrib, key: "Maghrib" },
        { name: "Isha", icon: "moon-outline", time: prayerTimes.Isha, key: "Isha" },
      ]
    : [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topPad + 8, paddingBottom: bottomPad },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Prayer Times
          </Text>
          <View style={styles.titleActions}>
            <TouchableOpacity
              onPress={() => setShowManualModal(true)}
              style={[styles.iconBtn, { backgroundColor: colors.secondary }]}
            >
              <Ionicons name="search-outline" size={18} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDetectLocation}
              style={[styles.iconBtn, { backgroundColor: colors.secondary }]}
            >
              <Ionicons name="locate-outline" size={18} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={loadFromStoredOrFresh}
              style={[styles.iconBtn, { backgroundColor: colors.secondary }]}
            >
              <Ionicons name="refresh" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {city ? (
          <View style={styles.locationRow}>
            <Ionicons name="location" size={16} color={colors.accent} />
            <Text style={[styles.locationText, { color: colors.mutedForeground }]}>
              {city}
            </Text>
            <TouchableOpacity onPress={() => setShowManualModal(true)}>
              <Text style={[styles.changeText, { color: colors.primary }]}>
                Change
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {loading && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
              Getting prayer times...
            </Text>
          </View>
        )}

        {error && !loading && (
          <View style={styles.center}>
            <Ionicons
              name="location-outline"
              size={44}
              color={colors.mutedForeground}
            />
            <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
              {error}
            </Text>
            <TouchableOpacity
              style={[styles.retryBtn, { backgroundColor: colors.primary }]}
              onPress={detectLocation}
            >
              <Text style={[styles.retryText, { color: colors.primaryForeground }]}>
                Detect Location
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryBtn, { borderColor: colors.primary }]}
              onPress={() => setShowManualModal(true)}
            >
              <Text style={[styles.secondaryBtnText, { color: colors.primary }]}>
                Enter City Manually
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && !error && prayerTimes && (
          <>
            <View style={styles.timesContainer}>
              {prayers.map((prayer) => {
                const isNext = prayer.key === nextPrayer;
                return (
                  <View
                    key={prayer.name}
                    style={[
                      styles.prayerRow,
                      {
                        backgroundColor: isNext ? colors.primary : colors.card,
                        borderColor: isNext ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <View style={styles.prayerLeft}>
                      <Ionicons
                        name={prayer.icon}
                        size={22}
                        color={isNext ? colors.primaryForeground : colors.accent}
                      />
                      <Text
                        style={[
                          styles.prayerName,
                          { color: isNext ? colors.primaryForeground : colors.foreground },
                        ]}
                      >
                        {prayer.name}
                      </Text>
                      {isNext && (
                        <View
                          style={[styles.nextBadge, { backgroundColor: colors.accent }]}
                        >
                          <Text style={[styles.nextText, { color: colors.accentForeground }]}>
                            Next
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.prayerTime,
                        { color: isNext ? colors.primaryForeground : colors.foreground },
                      ]}
                    >
                      {prayer.time}
                    </Text>
                  </View>
                );
              })}
            </View>

            <View
              style={[
                styles.notifCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={styles.notifLeft}>
                <Ionicons
                  name={notifsEnabled ? "notifications" : "notifications-outline"}
                  size={22}
                  color={notifsEnabled ? colors.primary : colors.mutedForeground}
                />
                <View>
                  <Text style={[styles.notifLabel, { color: colors.foreground }]}>
                    Prayer Reminders
                  </Text>
                  <Text style={[styles.notifDesc, { color: colors.mutedForeground }]}>
                    {notifsEnabled
                      ? "You'll be notified at each prayer time"
                      : "Get notified at each prayer time"}
                  </Text>
                </View>
              </View>
              <Switch
                value={notifsEnabled}
                onValueChange={toggleNotifications}
                trackColor={{ false: colors.muted, true: colors.primary }}
                thumbColor={colors.card}
              />
            </View>

            <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>
              Times calculated using the Muslim World League method. Verify
              with your local mosque for Friday prayers.
            </Text>
          </>
        )}
      </ScrollView>

      <Modal
        visible={showManualModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowManualModal(false);
          setSuggestions([]);
          setManualInput("");
        }}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            setShowManualModal(false);
            setSuggestions([]);
            setManualInput("");
          }}
        >
          <Pressable
            style={[
              styles.modalSheet,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={() => {}}
          >
            <View
              style={[styles.sheetHandle, { backgroundColor: colors.border }]}
            />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              Search Location
            </Text>
            <Text
              style={[styles.modalDesc, { color: colors.mutedForeground }]}
            >
              Type your city name to get accurate prayer times.
            </Text>
            <View
              style={[
                styles.searchBar,
                { backgroundColor: colors.background, borderColor: colors.border },
              ]}
            >
              <Ionicons name="search" size={18} color={colors.mutedForeground} />
              <TextInput
                style={[styles.searchInput, { color: colors.foreground }]}
                placeholder="e.g. Glasgow, Cairo, Karachi..."
                placeholderTextColor={colors.mutedForeground}
                value={manualInput}
                onChangeText={handleManualInputChange}
                onSubmitEditing={handleManualSearch}
                returnKeyType="search"
                autoFocus
              />
              {suggestionsLoading && (
                <ActivityIndicator size="small" color={colors.mutedForeground} />
              )}
              {manualInput.length > 0 && (
                <TouchableOpacity onPress={() => { setManualInput(""); setSuggestions([]); }}>
                  <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
                </TouchableOpacity>
              )}
            </View>

            {suggestions.length > 0 && (
              <View
                style={[
                  styles.suggestionList,
                  { backgroundColor: colors.background, borderColor: colors.border },
                ]}
              >
                <FlatList
                  data={suggestions}
                  keyExtractor={(_, i) => i.toString()}
                  scrollEnabled={false}
                  renderItem={({ item, index }) => (
                    <TouchableOpacity
                      style={[
                        styles.suggestionItem,
                        {
                          borderBottomColor: colors.border,
                          borderBottomWidth: index < suggestions.length - 1
                            ? StyleSheet.hairlineWidth
                            : 0,
                        },
                      ]}
                      onPress={() => selectSuggestion(item)}
                    >
                      <Ionicons name="location-outline" size={14} color={colors.accent} />
                      <Text
                        style={[styles.suggestionText, { color: colors.foreground }]}
                        numberOfLines={1}
                      >
                        {formatSuggestionCity(item)}
                      </Text>
                      <Text
                        style={[styles.suggestionCountry, { color: colors.mutedForeground }]}
                        numberOfLines={1}
                      >
                        {item.address?.country ?? ""}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.searchBtn,
                {
                  backgroundColor: colors.primary,
                  opacity: manualInput.trim() ? 1 : 0.5,
                },
              ]}
              onPress={handleManualSearch}
              disabled={!manualInput.trim() || manualLoading}
            >
              {manualLoading ? (
                <ActivityIndicator size="small" color={colors.primaryForeground} />
              ) : (
                <Text
                  style={[styles.searchBtnText, { color: colors.primaryForeground }]}
                >
                  Find Prayer Times
                </Text>
              )}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20, gap: 12 },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { fontSize: 28, fontFamily: "Inter_700Bold" },
  titleActions: { flexDirection: "row", gap: 8 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  locationText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  changeText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  center: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 14,
  },
  loadingText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  errorText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  retryBtn: {
    borderRadius: 10,
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  retryText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  secondaryBtn: {
    borderRadius: 10,
    borderWidth: 1.5,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  secondaryBtnText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  timesContainer: { gap: 8 },
  prayerRow: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  prayerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  prayerName: { fontSize: 16, fontFamily: "Inter_500Medium" },
  nextBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  nextText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
  },
  prayerTime: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  notifCard: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  notifLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  notifLabel: { fontSize: 15, fontFamily: "Inter_500Medium" },
  notifDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  disclaimer: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 24,
    paddingBottom: 44,
    gap: 12,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 8,
  },
  modalTitle: { fontSize: 20, fontFamily: "Inter_600SemiBold" },
  modalDesc: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    padding: 0,
  },
  suggestionList: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  suggestionText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  suggestionCountry: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    flexShrink: 0,
  },
  searchBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
  },
  searchBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
