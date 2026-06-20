import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Coordinates, PrayerTimes as AdhanPrayerTimes, CalculationMethod } from "adhan";
import * as Location from "expo-location";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Keyboard,
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
import SettingsGearButton from "@/components/SettingsGearButton";
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

function fmt(d: Date): string {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

function getAdhanParams(lat: number, lng: number): { params: ReturnType<typeof CalculationMethod.MuslimWorldLeague>; name: string } {
  if (lat >= 15 && lat <= 83 && lng >= -170 && lng <= -52)
    return { params: CalculationMethod.NorthAmerica(), name: "ISNA (North America)" };
  if (lat >= 12 && lat <= 32 && lng >= 32 && lng <= 60)
    return { params: CalculationMethod.UmmAlQura(), name: "Umm Al-Qura, Mecca" };
  if (lat >= 25 && lat <= 40 && lng >= 44 && lng <= 64)
    return { params: CalculationMethod.Tehran(), name: "Institute of Geophysics, Tehran" };
  if (lat >= 6 && lat <= 38 && lng >= 60 && lng <= 98)
    return { params: CalculationMethod.Karachi(), name: "University of Islamic Sciences, Karachi" };
  if (lat >= -10 && lat <= 25 && lng >= 95 && lng <= 141)
    return { params: CalculationMethod.Singapore(), name: "MUIS (Singapore)" };
  if (lat >= 36 && lat <= 42 && lng >= 26 && lng <= 45)
    return { params: CalculationMethod.Turkey(), name: "Diyanet İşleri Başkanlığı" };
  if (lat >= 20 && lat <= 35 && lng >= 15 && lng <= 38)
    return { params: CalculationMethod.Egyptian(), name: "Egyptian General Authority" };
  if (lat >= 27 && lat <= 36 && lng >= -17 && lng <= -1)
    return { params: CalculationMethod.MuslimWorldLeague(), name: "Muslim World League" };
  return { params: CalculationMethod.MuslimWorldLeague(), name: "Muslim World League" };
}

function calculatePrayerTimesLocal(lat: number, lng: number): { times: PrayerTimes; methodName: string } {
  const coordinates = new Coordinates(lat, lng);
  const { params, name: methodName } = getAdhanParams(lat, lng);
  const date = new Date();
  const pt = new AdhanPrayerTimes(coordinates, date, params);
  return {
    times: {
      Fajr: fmt(pt.fajr),
      Sunrise: fmt(pt.sunrise),
      Dhuhr: fmt(pt.dhuhr),
      Asr: fmt(pt.asr),
      Maghrib: fmt(pt.maghrib),
      Isha: fmt(pt.isha),
    },
    methodName,
  };
}

function getNextPrayer(times: PrayerTimes): string {
  const now = new Date();
  const currentMins = now.getHours() * 60 + now.getMinutes();
  const prayers: (keyof PrayerTimes)[] = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"];
  for (const key of prayers) {
    const [h, m] = times[key].split(":").map(Number);
    if (h * 60 + m > currentMins) return key;
  }
  return "Fajr";
}

export default function PrayerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes | null>(null);
  const [city, setCity] = useState<string>("");
  const [calcMethodName, setCalcMethodName] = useState<string>("Muslim World League");
  const [nextPrayer, setNextPrayer] = useState<string>("");
  const [notifsEnabled, setNotifsEnabled] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [latInput, setLatInput] = useState("");
  const [lngInput, setLngInput] = useState("");
  const [cityInput, setCityInput] = useState("");
  const [manualLoading, setManualLoading] = useState(false);
  const [webToast, setWebToast] = useState<string | null>(null);
  const webToastAnim = useRef(new Animated.Value(0)).current;

  const showWebToast = (msg: string) => {
    setWebToast(msg);
    Animated.sequence([
      Animated.timing(webToastAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(1600),
      Animated.timing(webToastAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setWebToast(null));
  };

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
          setError("Location permission denied. Please enable location access or enter coordinates manually.");
          setLoading(false);
          return;
        }
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        lat = loc.coords.latitude;
        lng = loc.coords.longitude;

        try {
          const addrs = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
          const a = addrs[0];
          detectedCity = a?.city || a?.district || a?.subregion || a?.region || "Your Location";
        } catch {
          detectedCity = "Your Location";
        }
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
      setError("Could not detect location. Please enter your coordinates manually.");
      setLoading(false);
    }
  };

  const loadTimes = async (lat: number, lng: number, cityName: string) => {
    setLoading(true);
    setError(null);
    try {
      const { times, methodName } = calculatePrayerTimesLocal(lat, lng);
      setPrayerTimes(times);
      setCity(cityName);
      setCalcMethodName(methodName);
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
      setError("Failed to calculate prayer times. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDetectLocation = async () => {
    await AsyncStorage.removeItem(LOCATION_STORAGE_KEY);
    setPrayerTimes(null);
    setCity("");
    await detectLocation();
  };

  const handleManualCoords = async () => {
    const lat = parseFloat(latInput.trim());
    const lng = parseFloat(lngInput.trim());
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      Alert.alert("Invalid Coordinates", "Please enter valid latitude (-90 to 90) and longitude (-180 to 180).");
      return;
    }
    const cityName = cityInput.trim() || `${lat.toFixed(2)}, ${lng.toFixed(2)}`;
    setManualLoading(true);
    Keyboard.dismiss();
    try {
      await AsyncStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify({ lat, lng, city: cityName }));
      setShowManualModal(false);
      setLatInput("");
      setLngInput("");
      setCityInput("");
      await loadTimes(lat, lng, cityName);
    } catch {
      Alert.alert("Error", "Failed to set location. Please try again.");
    } finally {
      setManualLoading(false);
    }
  };

  const toggleNotifications = async (val: boolean) => {
    if (Platform.OS === "web") {
      showWebToast("Prayer reminders require the mobile app");
      return;
    }
    if (val) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        Alert.alert("Permission Needed", "Please allow notifications in your device settings.");
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
        Alert.alert("Notifications On", "You'll receive reminders for each prayer time. 🕌");
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
              <Ionicons name="location-outline" size={18} color={colors.primary} />
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
            <SettingsGearButton />
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
              Calculating prayer times...
            </Text>
          </View>
        )}

        {error && !loading && (
          <View style={styles.center}>
            <Ionicons name="location-outline" size={44} color={colors.mutedForeground} />
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
                Enter Coordinates
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
                        <View style={[styles.nextBadge, { backgroundColor: colors.accent }]}>
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
              Times calculated locally using {calcMethodName}. Verify with your
              local mosque for Friday prayers.
            </Text>
          </>
        )}
      </ScrollView>

      {webToast && (
        <Animated.View
          style={[
            styles.webToast,
            {
              backgroundColor: colors.foreground,
              opacity: webToastAnim,
              transform: [{ translateY: webToastAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
            },
          ]}
          pointerEvents="none"
        >
          <Ionicons name="information-circle" size={16} color={colors.background} />
          <Text style={[styles.webToastText, { color: colors.background }]}>
            {webToast}
          </Text>
        </Animated.View>
      )}

      <Modal
        visible={showManualModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowManualModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowManualModal(false)}
        >
          <Pressable
            style={[
              styles.modalSheet,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={() => {}}
          >
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              Change Location
            </Text>
            <Text style={[styles.modalDesc, { color: colors.mutedForeground }]}>
              Use GPS for automatic detection, or enter your coordinates manually.
            </Text>

            <TouchableOpacity
              style={[styles.gpsBtn, { backgroundColor: colors.primary }]}
              onPress={() => {
                setShowManualModal(false);
                handleDetectLocation();
              }}
            >
              <Ionicons name="locate" size={18} color={colors.primaryForeground} />
              <Text style={[styles.gpsBtnText, { color: colors.primaryForeground }]}>
                Use My GPS Location
              </Text>
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>or enter manually</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            <View
              style={[
                styles.inputField,
                { backgroundColor: colors.background, borderColor: colors.border },
              ]}
            >
              <TextInput
                style={[styles.inputText, { color: colors.foreground }]}
                placeholder="Latitude (e.g. 51.5074)"
                placeholderTextColor={colors.mutedForeground}
                value={latInput}
                onChangeText={setLatInput}
                keyboardType="numeric"
              />
            </View>

            <View
              style={[
                styles.inputField,
                { backgroundColor: colors.background, borderColor: colors.border },
              ]}
            >
              <TextInput
                style={[styles.inputText, { color: colors.foreground }]}
                placeholder="Longitude (e.g. -0.1278)"
                placeholderTextColor={colors.mutedForeground}
                value={lngInput}
                onChangeText={setLngInput}
                keyboardType="numeric"
              />
            </View>

            <View
              style={[
                styles.inputField,
                { backgroundColor: colors.background, borderColor: colors.border },
              ]}
            >
              <TextInput
                style={[styles.inputText, { color: colors.foreground }]}
                placeholder="City name (optional)"
                placeholderTextColor={colors.mutedForeground}
                value={cityInput}
                onChangeText={setCityInput}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.searchBtn,
                {
                  backgroundColor: colors.primary,
                  opacity: latInput.trim() && lngInput.trim() ? 1 : 0.5,
                },
              ]}
              onPress={handleManualCoords}
              disabled={!latInput.trim() || !lngInput.trim() || manualLoading}
            >
              {manualLoading ? (
                <ActivityIndicator size="small" color={colors.primaryForeground} />
              ) : (
                <Text style={[styles.searchBtnText, { color: colors.primaryForeground }]}>
                  Calculate Prayer Times
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
  nextText: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 },
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
  webToast: {
    position: "absolute",
    bottom: 100,
    left: 20,
    right: 20,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  webToastText: { fontSize: 14, fontFamily: "Inter_500Medium", flex: 1 },
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
  gpsBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  gpsBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 4,
  },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  inputField: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    padding: 0,
  },
  searchBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
    marginTop: 4,
  },
  searchBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
