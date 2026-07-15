import * as Notifications from 'expo-notifications';
import { Platform, Alert } from 'react-native';

let isInitialized = false;
let webNotificationPermission: NotificationPermission | null = null;
const pendingNotifications: Array<{
  id: string;
  eventId: number;
  title: string;
  description: string;
  remindTime: Date;
  timeoutId?: ReturnType<typeof setTimeout>;
}> = [];
let checkInterval: ReturnType<typeof setInterval> | null = null;

// 页面内提醒回调（当系统通知不可用时使用）
let onInAppReminder: ((eventId: number, title: string, description: string) => void) | null = null;

export function setInAppReminderCallback(callback: (eventId: number, title: string, description: string) => void) {
  onInAppReminder = callback;
  console.log('[Notifications] In-app reminder callback registered');
}

// 启动后台检查（每 10 秒检查一次）
function startBackgroundCheck() {
  if (checkInterval) return;
  
  console.log('[Notifications] Starting background check (every 10 seconds)');
  checkInterval = setInterval(() => {
    const now = new Date();
    pendingNotifications.forEach((notif) => {
      if (notif.remindTime <= now) {
        console.log('[Notifications] Background check: triggering notification for event', notif.eventId);
        triggerWebNotification(notif);
        removePendingNotification(notif.id);
      }
    });
  }, 10000); // 每 10 秒检查一次
}

// 停止后台检查
function stopBackgroundCheck() {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
    console.log('[Notifications] Stopped background check');
  }
}

// 监听页面可见性变化
function setupVisibilityListener() {
  if (typeof document === 'undefined') return;
  
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      console.log('[Notifications] Page became visible, checking pending notifications');
      const now = new Date();
      pendingNotifications.forEach((notif) => {
        if (notif.remindTime <= now) {
          console.log('[Notifications] Triggering overdue notification for event', notif.eventId);
          triggerWebNotification(notif);
          removePendingNotification(notif.id);
        }
      });
    }
  });
}

// 触发 Web 通知
function triggerWebNotification(notif: {
  id: string;
  eventId: number;
  title: string;
  description: string;
  remindTime: Date;
}) {
  console.log('[Notifications] Triggering notification for event:', notif.eventId, notif.title);
  
  // 优先使用页面内提醒（兼容所有环境）
  if (onInAppReminder) {
    console.log('[Notifications] Using in-app reminder callback');
    onInAppReminder(notif.eventId, notif.title, notif.description);
    return;
  }
  
  // 降级使用系统通知
  try {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const notification = new Notification(notif.title, {
        body: notif.description || '事件提醒',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: `event-${notif.eventId}`,
        requireInteraction: true,
      });

      notification.onclick = () => {
        console.log('[Notifications] Notification clicked, focusing window');
        window.focus();
        window.dispatchEvent(new CustomEvent('notification-clicked', {
          detail: { eventId: notif.eventId }
        }));
        notification.close();
      };

      notification.onerror = (error) => {
        console.error('[Notifications] Notification error:', error);
      };

      console.log('[Notifications] Web notification triggered successfully');
    } else {
      console.warn('[Notifications] Notification API not available, using alert');
      Alert.alert('事件提醒', `${notif.title}\n${notif.description || '您有一个重要事件即将开始'}`, [{ text: '知道了' }]);
    }
  } catch (error) {
    console.error('[Notifications] Failed to trigger notification:', error);
    // 最后的降级方案
    Alert.alert('事件提醒', `${notif.title}\n${notif.description || '您有一个重要事件即将开始'}`, [{ text: '知道了' }]);
  }
}

// 移除待处理的通知
function removePendingNotification(id: string) {
  const index = pendingNotifications.findIndex(n => n.id === id);
  if (index > -1) {
    if (pendingNotifications[index].timeoutId) {
      clearTimeout(pendingNotifications[index].timeoutId);
    }
    pendingNotifications.splice(index, 1);
    console.log('[Notifications] Removed pending notification:', id);
  }
}

export async function initNotifications(): Promise<string> {
  if (isInitialized) return webNotificationPermission === 'granted' ? '已启用 ✓' : '未授权 ✗';

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
          // 启动后台检查和可见性监听
          startBackgroundCheck();
          setupVisibilityListener();
          isInitialized = true;
          return '已启用 ✓';
        } else {
          console.warn('[Notifications] Web notification permission denied');
          Alert.alert(
            '通知权限未授予',
            '请在浏览器设置中允许通知权限，否则无法收到提醒'
          );
          isInitialized = true;
          return '未授权 ✗';
        }
      } catch (error) {
        console.error('[Notifications] Failed to request web notification permission:', error);
        isInitialized = true;
        return '授权失败';
      }
    } else {
      console.warn('[Notifications] Web Notification API not supported');
      Alert.alert('不支持', '当前浏览器不支持通知功能');
      isInitialized = true;
      return '不支持';
    }
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
    isInitialized = true;
    return '未授权 ✗';
  }

  isInitialized = true;
  console.log('[Notifications] Notifications initialized successfully');
  return '已启用 ✓';
}

export async function scheduleEventReminder(
  eventId: number,
  title: string,
  description: string | null,
  remindTime: Date
): Promise<string | null> {
  const now = new Date();
  const timeDiff = remindTime.getTime() - now.getTime();
  
  console.log('[Notifications] === Scheduling reminder ===');
  console.log('[Notifications] eventId:', eventId);
  console.log('[Notifications] title:', title);
  console.log('[Notifications] remindTime:', remindTime.toISOString());
  console.log('[Notifications] now:', now.toISOString());
  console.log('[Notifications] timeDiff:', timeDiff, 'ms');
  console.log('[Notifications] timeDiff:', Math.round(timeDiff / 1000), 'seconds');
  console.log('[Notifications] timeDiff:', Math.round(timeDiff / 60000), 'minutes');

  if (remindTime <= now) {
    console.log('[Notifications] [WARN] Reminder time is in the past or now, skipping');
    console.log('[Notifications] remindTime <= now:', remindTime <= now);
    return null;
  }

  // Web 平台使用 setTimeout + 后台检查机制
  if (Platform.OS === 'web') {
    // 即使系统通知权限未授予，也要调度页面内提醒
    if (webNotificationPermission !== 'granted') {
      console.log('[Notifications] Web notification permission not granted, but will use in-app reminder');
    }

    console.log('[Notifications] Web platform: scheduling with setTimeout + background check');
    console.log('[Notifications] Delay:', timeDiff, 'ms');
    
    const notifId = `web-${eventId}-${Date.now()}`;
    const notifData: {
      id: string;
      eventId: number;
      title: string;
      description: string;
      remindTime: Date;
      timeoutId?: ReturnType<typeof setTimeout>;
    } = {
      id: notifId,
      eventId,
      title,
      description: description || '您有一个重要事件即将开始',
      remindTime,
    };

    // 添加 setTimeout 作为主要触发方式
    const timeoutId = setTimeout(() => {
      console.log('[Notifications] setTimeout triggered for event:', eventId);
      triggerWebNotification(notifData);
      removePendingNotification(notifId);
    }, timeDiff);

    // 同时添加到待处理列表，供后台检查使用
    notifData.timeoutId = timeoutId;
    pendingNotifications.push(notifData);
    
    console.log('[Notifications] Web notification scheduled, id:', notifId);
    console.log('[Notifications] Pending notifications count:', pendingNotifications.length);
    
    return notifId;
  }

  // 原生平台使用 expo-notifications
  console.log('[Notifications] Native platform: scheduling with expo-notifications');
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
  console.log('[Notifications] === Sending test notification ===');
  
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
        silent: false,
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
