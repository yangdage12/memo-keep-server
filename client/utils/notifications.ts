import * as Notifications from 'expo-notifications';
import { Platform, Alert } from 'react-native';

let isInitialized = false;
let webNotificationPermission: NotificationPermission | null = null;

export async function initNotifications(): Promise<void> {
  if (isInitialized) return;

  console.log('[Notifications] Initializing notifications...');

  // Web 平台使用 Web Notification API
  if (Platform.OS === 'web') {
    if ('Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        webNotificationPermission = permission;
        console.log('[Notifications] Web notification permission:', permission);
        
        if (permission === 'granted') {
          console.log('[Notifications] Web notifications enabled');
        } else {
          console.warn('[Notifications] Web notification permission denied');
        }
      } catch (error) {
        console.error('[Notifications] Failed to request web notification permission:', error);
      }
    } else {
      console.warn('[Notifications] Web Notification API not supported');
    }
    isInitialized = true;
    return;
  }

  // 原生平台使用 expo-notifications
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
  console.log('[Notifications] Native permission status:', status);
  
  if (status !== 'granted') {
    console.warn('[Notifications] Native notification permission not granted');
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

  // Web 平台使用 setTimeout + Web Notification API
  if (Platform.OS === 'web') {
    if (webNotificationPermission !== 'granted') {
      console.warn('[Notifications] Web notification permission not granted');
      return null;
    }

    console.log('[Notifications] Web platform: scheduling with setTimeout, delay:', timeDiff, 'ms');
    
    const timeoutId = setTimeout(() => {
      console.log('[Notifications] Web notification triggered at:', new Date().toISOString());
      console.log('[Notifications] Notification content:', { title, description, eventId });
      
      try {
        const notification = new Notification(`事件提醒：${title}`, {
          body: description || '您有一个重要事件即将开始',
          icon: '/favicon.png',
          badge: '/favicon.png',
          tag: `event-${eventId}`,
          requireInteraction: true,
          silent: false,
        });

        notification.onclick = () => {
          console.log('[Notifications] Notification clicked');
          window.focus();
          notification.close();
        };

        notification.onshow = () => {
          console.log('[Notifications] Notification shown');
        };

        notification.onerror = (error) => {
          console.error('[Notifications] Notification error:', error);
        };

        console.log('[Notifications] Web notification created successfully');
      } catch (error) {
        console.error('[Notifications] Failed to show web notification:', error);
      }
    }, timeDiff);

    console.log('[Notifications] Web notification scheduled, timeoutId:', timeoutId);
    return `web-${timeoutId}`;
  }

  // 原生平台使用 expo-notifications
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

    console.log('[Notifications] Native notification scheduled, id:', id);
    return id;
  } catch (error) {
    console.error('[Notifications] Failed to schedule native notification:', error);
    return null;
  }
}

export async function sendTestNotification(): Promise<void> {
  console.log('[Notifications] Sending test notification...');
  
  if (Platform.OS === 'web') {
    if (webNotificationPermission !== 'granted') {
      console.warn('[Notifications] Web notification permission not granted');
      Alert.alert('权限未授予', '请在浏览器中允许通知权限');
      return;
    }

    try {
      const notification = new Notification('测试通知', {
        body: '如果你看到这条通知，说明通知功能正常工作！',
        icon: '/favicon.png',
        badge: '/favicon.png',
        requireInteraction: true,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      console.log('[Notifications] Web test notification sent');
    } catch (error) {
      console.error('[Notifications] Failed to send web test notification:', error);
    }
    return;
  }

  // 原生平台
  try {
    const channelId = Platform.OS === 'android' ? 'event-reminders' : undefined;
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '测试通知',
        body: '如果你看到这条通知，说明通知功能正常工作！',
        sound: 'default',
        ...(channelId ? { channelId } : {}),
      },
      trigger: null,
    } as any);
    
    console.log('[Notifications] Native test notification sent');
  } catch (error) {
    console.error('[Notifications] Failed to send native test notification:', error);
  }
}

export async function cancelEventReminder(notificationId: string): Promise<void> {
  if (notificationId.startsWith('web-')) {
    const timeoutId = parseInt(notificationId.replace('web-', ''));
    clearTimeout(timeoutId);
    console.log('[Notifications] Web notification cancelled, timeoutId:', timeoutId);
    return;
  }

  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

export async function cancelAllReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  return await Notifications.getAllScheduledNotificationsAsync();
}
