import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

let isInitialized = false;

export async function initNotifications(): Promise<void> {
  if (isInitialized) return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('event-reminders', {
      name: '事件提醒',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6C63FF',
      sound: 'default',
    });
  }

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    console.warn('Notification permission not granted');
  }

  isInitialized = true;
}

export async function scheduleEventReminder(
  eventId: number,
  title: string,
  description: string | null,
  remindTime: Date
): Promise<string | null> {
  const now = new Date();
  if (remindTime <= now) return null;

  const channelId = Platform.OS === 'android' ? 'event-reminders' : undefined;

  const timestamp = remindTime.getTime();

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: `事件提醒: ${title}`,
      body: description || '您有一个重要事件即将开始',
      data: { eventId },
      sound: 'default',
      ...(channelId ? { channelId } : {}),
    },
    trigger: {
      timestamp,
      type: 'date',
    } as any,
  });

  return id;
}

export async function cancelEventReminder(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

export async function cancelAllReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  return await Notifications.getAllScheduledNotificationsAsync();
}
