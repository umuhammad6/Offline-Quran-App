import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const PRAYER_ID_PREFIX = "prayer-";
const AYAH_OF_DAY_ID = "ayah-of-day";
const PRAYER_CHANNEL = "prayer-times";
const GENERAL_CHANNEL = "general";

export function setupNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function setupAndroidChannels() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(PRAYER_CHANNEL, {
    name: "Prayer Times",
    description: "Adhan reminders for each daily prayer",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 400, 200, 400],
    lightColor: "#2D6A4F",
    sound: "default",
    enableVibrate: true,
  });
  await Notifications.setNotificationChannelAsync(GENERAL_CHANNEL, {
    name: "General",
    description: "Ayah of the Day and other reminders",
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: "default",
  });
}

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();
  if (existingStatus === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: false,
      allowSound: true,
    },
  });
  return status === "granted";
}

export interface PrayerScheduleItem {
  name: string;
  time: string;
}

export async function schedulePrayerNotifications(
  prayers: PrayerScheduleItem[],
  cityName: string
) {
  const existing = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of existing) {
    if (n.identifier.startsWith(PRAYER_ID_PREFIX)) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }

  for (const prayer of prayers) {
    const parts = prayer.time.split(":");
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) continue;

    await Notifications.scheduleNotificationAsync({
      identifier: `${PRAYER_ID_PREFIX}${prayer.name.toLowerCase()}`,
      content: {
        title: `🕌 ${prayer.name} Prayer Time`,
        body: `It's time for ${prayer.name} in ${cityName}. Allahu Akbar!`,
        sound: true,
        data: { prayer: prayer.name },
        ...(Platform.OS === "android" && { channelId: PRAYER_CHANNEL }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: h,
        minute: m,
      } as Notifications.DailyTriggerInput,
    });
  }
}

export async function scheduleAyahOfDayNotification() {
  await Notifications.cancelScheduledNotificationAsync(AYAH_OF_DAY_ID).catch(
    () => {}
  );
  await Notifications.scheduleNotificationAsync({
    identifier: AYAH_OF_DAY_ID,
    content: {
      title: "📖 Ayah of the Day",
      body: "A new ayah is waiting for you. Open the app to read it.",
      sound: true,
      ...(Platform.OS === "android" && { channelId: GENERAL_CHANNEL }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 8,
      minute: 0,
    } as Notifications.DailyTriggerInput,
  });
}

export async function cancelPrayerNotifications() {
  const existing = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of existing) {
    if (n.identifier.startsWith(PRAYER_ID_PREFIX)) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }
}

export async function cancelAyahOfDayNotification() {
  await Notifications.cancelScheduledNotificationAsync(AYAH_OF_DAY_ID).catch(
    () => {}
  );
}
