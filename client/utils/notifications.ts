import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

let isInitialized = false;

export async function initNotifications(): Promise<void> {
  if (isInitialized) return;

  console.log('[Notifications] Initializing notifications...');

  // 设置通知处理器
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  // Android 通知渠道配置
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('event-reminders', {
      name: '事件提醒',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6C63FF',
      sound: 'default',
    });
  }

  // 请求通知权限
  const { status } = await Notifications.requestPermissionsAsync();
  console.log('[Notifications] Permission status:', status);
  
  if (status !== 'granted') {
    console.warn('[Notifications] Notification permission not granted, status:', status);
  } else {
    console.log('[Notifications] Notification permission granted');
  }

  isInitialized = true;
  console.log('[Notifications] Notifications initialized successfully');
}

export async function scheduleEventReminder(
  eventId: number,
  title: string,
  description: string | null,
  remindTime: Date
): Promise<string | null> {
  const now = new Date();
  const timeDiff = remindTime.getTime() - now.getTime();
  
  console.log('[Notifications] Scheduling reminder:', {
    eventId,
    title,
    remindTime: remindTime.toISOString(),
    now: now.toISOString(),
    timeDiffMs: timeDiff,
    timeDiffMin: Math.round(timeDiff / 60000),
  });

  if (remindTime <= now) {
    console.log('[Notifications] Reminder time is in the past, skipping');
    return null;
  }

  const channelId = Platform.OS === 'android' ? 'event-reminders' : undefined;
  const timestamp = remindTime.getTime();

  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `事件提醒：${title}`,
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

    console.log('[Notifications] Notification scheduled successfully, id:', id);
    return id;
  } catch (error) {
    console.error('[Notifications] Failed to schedule notification:', error);
    return null;
  }
}

export async function sendTestNotification(): Promise<void> {
  console.log('[Notifications] Sending test notification...');
  
  try {
    const channelId = Platform.OS === 'android' ? 'event-reminders' : undefined;
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '测试通知',
        body: '如果你看到这条通知，说明通知功能正常工作！',
        sound: 'default',
        ...(channelId ? { channelId } : {}),
      },
      trigger: null, // 立即触发
    } as any);
    
    console.log('[Notifications] Test notification sent');
  } catch (error) {
    console.error('[Notifications] Failed to send test notification:', error);
  }
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
