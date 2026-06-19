import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { Magnetometer } from "expo-sensors";
import SettingsGearButton from "@/components/SettingsGearButton";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

const MECCA_LAT = 21.4225;
const MECCA_LNG = 39.8262;

function calculateQiblahBearing(lat: number, lng: number): number {
  const φ1 = (lat * Math.PI) / 180;
  const φ2 = (MECCA_LAT * Math.PI) / 180;
  const Δλ = ((MECCA_LNG - lng) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
}

function getMagneticHeading(x: number, y: number): number {
  let angle = Math.atan2(y, x) * (180 / Math.PI);
  return (angle + 360) % 360;
}

function degreesToDirection(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}

function CompassRose({
  size,
  colors,
  arrowDeg,
  compassDeg,
}: {
  size: number;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
  arrowDeg: number;
  compassDeg: number;
}) {
  const arrowAnim = useRef(new Animated.Value(arrowDeg)).current;
  const compassAnim = useRef(new Animated.Value(compassDeg)).current;
  const prevArrow = useRef(arrowDeg);
  const prevCompass = useRef(compassDeg);

  useEffect(() => {
    const diff = ((arrowDeg - prevArrow.current + 540) % 360) - 180;
    const newVal = prevArrow.current + diff;
    prevArrow.current = newVal;
    Animated.timing(arrowAnim, {
      toValue: newVal,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [arrowDeg]);

  useEffect(() => {
    const diff = ((compassDeg - prevCompass.current + 540) % 360) - 180;
    const newVal = prevCompass.current + diff;
    prevCompass.current = newVal;
    Animated.timing(compassAnim, {
      toValue: newVal,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [compassDeg]);

  const compassRotate = compassAnim.interpolate({
    inputRange: [-360, 360],
    outputRange: ["-360deg", "360deg"],
  });
  const arrowRotate = arrowAnim.interpolate({
    inputRange: [-360, 360],
    outputRange: ["-360deg", "360deg"],
  });

  const r = size / 2;
  const tickLen = 8;
  const cardinals = ["N", "E", "S", "W"];
  const cardinalAngles = [0, 90, 180, 270];

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      {/* Outer ring */}
      <View
        style={{
          position: "absolute",
          width: size,
          height: size,
          borderRadius: r,
          borderWidth: 2,
          borderColor: colors.border,
          backgroundColor: colors.card,
        }}
      />

      {/* Rotating compass - cardinal directions rotate with device */}
      <Animated.View
        style={{
          position: "absolute",
          width: size,
          height: size,
          alignItems: "center",
          justifyContent: "center",
          transform: [{ rotate: compassRotate }],
        }}
      >
        {cardinals.map((label, i) => {
          const angle = (cardinalAngles[i] * Math.PI) / 180;
          const labelR = r - 22;
          const lx = Math.sin(angle) * labelR;
          const ly = -Math.cos(angle) * labelR;
          const isNorth = label === "N";
          return (
            <Text
              key={label}
              style={{
                position: "absolute",
                fontFamily: "Inter_700Bold",
                fontSize: isNorth ? 18 : 14,
                color: isNorth ? colors.primary : colors.foreground,
                transform: [{ translateX: lx }, { translateY: ly }],
              }}
            >
              {label}
            </Text>
          );
        })}

        {/* Degree tick marks */}
        {Array.from({ length: 36 }).map((_, i) => {
          const deg = i * 10;
          const angle = (deg * Math.PI) / 180;
          const isMajor = deg % 30 === 0;
          const outerR = r - 4;
          const innerR = r - (isMajor ? 14 : 9);
          const x1 = Math.sin(angle) * outerR;
          const y1 = -Math.cos(angle) * outerR;
          const x2 = Math.sin(angle) * innerR;
          const y2 = -Math.cos(angle) * innerR;
          return (
            <View
              key={i}
              style={{
                position: "absolute",
                width: isMajor ? 2 : 1,
                height: isMajor ? 10 : 6,
                backgroundColor: isMajor ? colors.foreground : colors.border,
                transform: [
                  { translateX: (x1 + x2) / 2 - 0.5 },
                  { translateY: (y1 + y2) / 2 - (isMajor ? 5 : 3) },
                  { rotate: `${deg}deg` },
                ],
              }}
            />
          );
        })}
      </Animated.View>

      {/* Inner circle */}
      <View
        style={{
          width: size * 0.55,
          height: size * 0.55,
          borderRadius: (size * 0.55) / 2,
          backgroundColor: colors.background,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: "center",
          justifyContent: "center",
          zIndex: 2,
        }}
      />

      {/* Qiblah arrow - rotates to point toward Mecca */}
      <Animated.View
        style={{
          position: "absolute",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 3,
          transform: [{ rotate: arrowRotate }],
        }}
      >
        {/* Arrow shaft */}
        <View
          style={{
            width: 3,
            height: size * 0.3,
            backgroundColor: colors.primary,
            borderRadius: 2,
            marginBottom: -2,
          }}
        />
        {/* Arrowhead (triangle) */}
        <View
          style={{
            width: 0,
            height: 0,
            borderLeftWidth: 10,
            borderRightWidth: 10,
            borderBottomWidth: 18,
            borderLeftColor: "transparent",
            borderRightColor: "transparent",
            borderBottomColor: colors.primary,
            transform: [{ rotate: "180deg" }],
          }}
        />
        {/* Kaaba dot at tip */}
        <View
          style={{
            position: "absolute",
            top: -8,
            width: 22,
            height: 22,
            borderRadius: 11,
            backgroundColor: colors.primary,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 12 }}>🕋</Text>
        </View>
      </Animated.View>
    </View>
  );
}

export default function QiblahScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [locationState, setLocationState] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [city, setCity] = useState<string>("");
  const [qiblahBearing, setQiblahBearing] = useState<number>(0);
  const [heading, setHeading] = useState<number>(0);
  const [sensorAvail, setSensorAvail] = useState(true);
  const magSub = useRef<ReturnType<typeof Magnetometer.addListener> | null>(null);

  const topPad = Platform.OS === "web" ? 20 : insets.top;

  const getLocation = async () => {
    setLocationState("loading");
    try {
      let lat: number, lng: number;

      if (Platform.OS !== "web") {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setLocationState("error");
          return;
        }
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        lat = loc.coords.latitude;
        lng = loc.coords.longitude;

        const addr = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
        const a = addr[0];
        setCity(a?.city || a?.district || a?.subregion || a?.region || "Your Location");
      } else {
        const pos = await new Promise<GeolocationPosition>((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 10000 })
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
        setCity("Your Location");
      }

      setCoords({ lat, lng });
      setQiblahBearing(calculateQiblahBearing(lat, lng));
      setLocationState("ready");
    } catch {
      setLocationState("error");
    }
  };

  useEffect(() => {
    getLocation();
    return () => {
      magSub.current?.remove();
    };
  }, []);

  useEffect(() => {
    if (locationState !== "ready") return;

    if (Platform.OS === "web") {
      setSensorAvail(false);
      return;
    }

    let didReceiveData = false;
    const noDataTimer = setTimeout(() => {
      if (!didReceiveData) setSensorAvail(false);
    }, 4000);

    try {
      Magnetometer.setUpdateInterval(100);
      magSub.current = Magnetometer.addListener(({ x, y }) => {
        if (!didReceiveData) {
          didReceiveData = true;
          clearTimeout(noDataTimer);
          setSensorAvail(true);
        }
        const h = getMagneticHeading(x, y);
        setHeading(h);
      });
    } catch {
      clearTimeout(noDataTimer);
      setSensorAvail(false);
    }

    return () => {
      clearTimeout(noDataTimer);
      magSub.current?.remove();
    };
  }, [locationState]);

  const arrowDeg = (qiblahBearing - heading + 360) % 360;
  const compassDeg = (-heading + 360) % 360;

  const compassSize = 280;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 4,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>
          Qiblah
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <TouchableOpacity onPress={getLocation}>
            <Ionicons name="refresh" size={22} color={colors.primary} />
          </TouchableOpacity>
          <SettingsGearButton />
        </View>
      </View>

      <View style={styles.content}>
        {locationState === "loading" && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.stateText, { color: colors.mutedForeground }]}>
              Getting your location...
            </Text>
          </View>
        )}

        {locationState === "error" && (
          <View style={styles.center}>
            <Ionicons
              name="location-outline"
              size={44}
              color={colors.mutedForeground}
            />
            <Text style={[styles.stateText, { color: colors.mutedForeground }]}>
              Location access needed for Qiblah direction.
            </Text>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: colors.primary }]}
              onPress={getLocation}
            >
              <Text style={[styles.btnText, { color: colors.primaryForeground }]}>
                Enable Location
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {locationState === "idle" && (
          <View style={styles.center}>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: colors.primary }]}
              onPress={getLocation}
            >
              <Text style={[styles.btnText, { color: colors.primaryForeground }]}>
                Find Qiblah Direction
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {locationState === "ready" && (
          <View style={styles.compassContainer}>
            {city ? (
              <View style={styles.locationRow}>
                <Ionicons name="location" size={16} color={colors.accent} />
                <Text
                  style={[styles.cityText, { color: colors.mutedForeground }]}
                >
                  {city}
                </Text>
              </View>
            ) : null}

            <View style={styles.compassWrap}>
              <CompassRose
                size={compassSize}
                colors={colors}
                arrowDeg={arrowDeg}
                compassDeg={compassDeg}
              />
            </View>

            <View
              style={[
                styles.infoCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={styles.infoRow}>
                <Text
                  style={[styles.infoLabel, { color: colors.mutedForeground }]}
                >
                  Qiblah Direction
                </Text>
                <Text style={[styles.infoValue, { color: colors.foreground }]}>
                  {Math.round(qiblahBearing)}°{" "}
                  {degreesToDirection(qiblahBearing)}
                </Text>
              </View>
              {!sensorAvail && (
                <View style={styles.infoRow}>
                  <Ionicons
                    name="information-circle-outline"
                    size={16}
                    color={colors.mutedForeground}
                  />
                  <Text
                    style={[styles.calibNote, { color: colors.mutedForeground }]}
                  >
                    Compass sensor not available — showing bearing from North
                  </Text>
                </View>
              )}
              {sensorAvail && (
                <Text
                  style={[styles.calibNote, { color: colors.mutedForeground }]}
                >
                  Hold device flat and face the direction the 🕋 arrow points.
                  Move in a figure-8 to calibrate.
                </Text>
              )}
            </View>

            <View
              style={[
                styles.meccaCard,
                { backgroundColor: colors.primary },
              ]}
            >
              <Text style={[styles.meccaLabel, { color: colors.primaryForeground, opacity: 0.75 }]}>
                Direction to Mecca (Al-Masjid Al-Haram)
              </Text>
              <Text style={[styles.meccaBearing, { color: colors.primaryForeground }]}>
                {Math.round(qiblahBearing)}° from North
              </Text>
            </View>
          </View>
        )}
      </View>
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
    justifyContent: "space-between",
  },
  title: { fontSize: 26, fontFamily: "Inter_700Bold" },
  content: { flex: 1 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 40,
  },
  stateText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  btn: {
    borderRadius: 12,
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  btnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  compassContainer: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 16,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cityText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  compassWrap: {
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
  },
  infoCard: {
    width: "100%",
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  infoLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  infoValue: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  calibNote: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
    flex: 1,
  },
  meccaCard: {
    width: "100%",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    gap: 4,
  },
  meccaLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  meccaBearing: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
});
