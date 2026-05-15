import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

interface PrayerTimes {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
  Midnight: string;
}

interface PrayerInfo {
  name: string;
  icon: string;
  time: string;
  key: keyof PrayerTimes;
}

function getNextPrayer(times: PrayerTimes): string {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const prayers: [string, keyof PrayerTimes][] = [
    ["Fajr", "Fajr"],
    ["Sunrise", "Sunrise"],
    ["Dhuhr", "Dhuhr"],
    ["Asr", "Asr"],
    ["Maghrib", "Maghrib"],
    ["Isha", "Isha"],
  ];
  for (const [, key] of prayers) {
    const [h, m] = times[key].split(":").map(Number);
    const prayerMinutes = h * 60 + m;
    if (prayerMinutes > currentMinutes) return key;
  }
  return "Fajr";
}

async function fetchPrayerTimesNative(lat: number, lng: number): Promise<{ times: PrayerTimes; city: string }> {
  const timestamp = Math.floor(Date.now() / 1000);
  const res = await fetch(
    `https://api.aladhan.com/v1/timings/${timestamp}?latitude=${lat}&longitude=${lng}&method=2`
  );
  const json = await res.json();
  const times = json.data.timings as PrayerTimes;
  const meta = json.data.meta;
  const city = meta.timezone?.split("/").pop()?.replace(/_/g, " ") ?? "Your Location";
  return { times, city };
}

async function fetchPrayerTimesWeb(lat: number, lng: number): Promise<{ times: PrayerTimes; city: string }> {
  return fetchPrayerTimesNative(lat, lng);
}

export default function PrayerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes | null>(null);
  const [city, setCity] = useState<string>("");
  const [nextPrayer, setNextPrayer] = useState<string>("");

  const loadPrayerTimes = async () => {
    setLoading(true);
    setError(null);
    try {
      let lat: number, lng: number;

      if (Platform.OS !== "web") {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setError("Location permission denied. Please enable location access.");
          setLoading(false);
          return;
        }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        lat = loc.coords.latitude;
        lng = loc.coords.longitude;
      } else {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      }

      const result = await fetchPrayerTimesNative(lat, lng);
      setPrayerTimes(result.times);
      setCity(result.city);
      setNextPrayer(getNextPrayer(result.times));
    } catch (e) {
      setError("Could not retrieve prayer times. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPrayerTimes();
  }, []);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 84 + 34 : 100;

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
          { paddingTop: topPad + 20, paddingBottom: bottomPad },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Prayer Times
          </Text>
          <TouchableOpacity onPress={loadPrayerTimes}>
            <Ionicons name="refresh" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {city ? (
          <View style={styles.locationRow}>
            <Ionicons name="location" size={16} color={colors.accent} />
            <Text style={[styles.locationText, { color: colors.mutedForeground }]}>
              {city}
            </Text>
          </View>
        ) : null}

        {loading && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
              Getting your location...
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
              onPress={loadPrayerTimes}
            >
              <Text style={[styles.retryText, { color: colors.primaryForeground }]}>
                Try Again
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && !error && prayerTimes && (
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
                      name={prayer.icon as any}
                      size={22}
                      color={isNext ? colors.primaryForeground : colors.accent}
                    />
                    <Text
                      style={[
                        styles.prayerName,
                        {
                          color: isNext
                            ? colors.primaryForeground
                            : colors.foreground,
                        },
                      ]}
                    >
                      {prayer.name}
                    </Text>
                    {isNext && (
                      <View
                        style={[
                          styles.nextBadge,
                          { backgroundColor: colors.accent },
                        ]}
                      >
                        <Text
                          style={[
                            styles.nextText,
                            { color: colors.accentForeground },
                          ]}
                        >
                          Next
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.prayerTime,
                      {
                        color: isNext
                          ? colors.primaryForeground
                          : colors.foreground,
                      },
                    ]}
                  >
                    {prayer.time}
                  </Text>
                </View>
              );
            })}

            <Text
              style={[styles.disclaimer, { color: colors.mutedForeground }]}
            >
              Times calculated using the ISNA method. Verify with your local mosque for Friday prayers.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 20,
    gap: 12,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  locationText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 14,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
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
  retryText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  timesContainer: {
    gap: 8,
  },
  prayerRow: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  prayerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  prayerName: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
  },
  nextBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  nextText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
  },
  prayerTime: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
  },
  disclaimer: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 18,
    marginTop: 8,
  },
});
