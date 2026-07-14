import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Alert,
  Platform,
  StyleSheet,
  Modal,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { fetchEvents, deleteEvent, toggleEventComplete, type EventItem } from '@/utils/api';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { format, parseISO, isToday, isTomorrow, isThisWeek, isThisMonth } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { initNotifications, sendTestNotification, setInAppReminderCallback } from '@/utils/notifications';

type Event = EventItem;

const CATEGORY_CONFIG = {
  work: { label: '工作', icon: 'briefcase' as const, color: '#6366f1', bg: '#eef2ff' },
  life: { label: '生活', icon: 'heart' as const, color: '#10b981', bg: '#ecfdf5' },
  family: { label: '家庭', icon: 'house' as const, color: '#f59e0b', bg: '#fffbeb' },
};

const PRIORITY_CONFIG = {
  high: { label: '高', color: '#ef4444' },
  medium: { label: '中', color: '#f59e0b' },
  low: { label: '低', color: '#6b7280' },
};

// 按日期分组事件
function groupEventsByDate(events: Event[]) {
  const groups: { [key: string]: Event[] } = {};
  
  events.forEach(event => {
    const date = event.remind_time || event.created_at;
    const dateKey = format(parseISO(date), 'yyyy-MM-dd');
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(event);
  });

  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, events]) => ({ date, events }));
}

function getDateLabel(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return '今天';
  if (isTomorrow(date)) return '明天';
  return format(date, 'M月d日 EEE', { locale: zhCN });
}

export default function HomeScreen() {
  const router = useSafeRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [notifStatus, setNotifStatus] = useState<string>('检查中...');
  const [reminderModal, setReminderModal] = useState<{visible: boolean; title: string; description: string; eventId: number}>({
    visible: false,
    title: '',
    description: '',
    eventId: 0,
  });

  // 初始化通知并检查权限
  useEffect(() => {
    const checkNotif = async () => {
      const status = await initNotifications();
      setNotifStatus(status);
      console.log('[Home] Notification status:', status);
      
      // 注册页面内提醒回调
      setInAppReminderCallback((eventId, title, description) => {
        console.log('[Home] In-app reminder triggered:', title);
        setReminderModal({visible: true, title, description, eventId});
        // 播放提示音
        if (Platform.OS === 'web') {
          // Web 平台使用 Audio API
          try {
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBDGH0fPTgjMGHm7A7+OZSA0PVqzn77BdGAg+ltryxnkpBSl+zPDajzsKElyx6emxYBcJP5Xh8blmHAU2jNn1yHkpBSh+zPDZjzoMEFqx6OyrWBUIQ5Pf8sFyIgUuhM/z2Yk2CBFcsunpr1sWB0KR4PLBciMFLoLP8tiINQgRXLDp6K9bFgZCkeDyvnIiBSuBzvLZiDUIEVyw6eivWxYGQpHg8r5yIgUrgc7y2Yg1CBFcsunpr1sWBkKR4PK+ciIFK4HO8tmINQgRXLDp6K9bFgZCkeDyvnIiBSuBzvLZiDUIEVyw6eivWxYGQpHg8r5yIgUrgc7y2Yg1CBFcsunpr1sWBkKR4PK+ciIF');
            audio.play();
          } catch (e) {
            console.log('[Home] Failed to play sound:', e);
          }
        }
      });
    };
    checkNotif();
  }, []);

  const loadEvents = useCallback(async () => {
    try {
      const data = await fetchEvents();
      setEvents(data);
    } catch (error) {
      console.error('Load events error:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadEvents();
    }, [loadEvents])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  }, [loadEvents]);

  const handleToggleComplete = async (event: Event) => {
    try {
      await toggleEventComplete(event.id, !event.is_completed);
      await loadEvents();
    } catch (error) {
      Alert.alert('错误', '操作失败');
    }
  };

  const handleDelete = (event: Event) => {
    Alert.alert(
      '确认删除',
      `确定要删除"${event.title}"吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEvent(event.id);
              await loadEvents();
            } catch (error) {
              Alert.alert('错误', '删除失败');
            }
          },
        },
      ]
    );
  };

  const handleTestNotification = async () => {
    console.log('[Home] Testing notification...');
    await sendTestNotification();
    Alert.alert('测试通知已发送', '请检查是否收到通知提示');
  };

  const groupedEvents = groupEventsByDate(events);

  const renderEvent = ({ item }: { item: Event }) => {
    const category = CATEGORY_CONFIG[item.category];
    const priority = PRIORITY_CONFIG[item.priority];

    return (
      <TouchableOpacity
        style={[
          styles.eventCard,
          item.is_completed && styles.eventCardCompleted,
        ]}
        onPress={() => router.push('/detail', { eventId: item.id })}
        onLongPress={() => handleDelete(item)}
      >
        <View style={styles.eventHeader}>
          <View style={styles.eventTitleRow}>
            <View style={[styles.categoryBadge, { backgroundColor: category.bg }]}>
              <FontAwesome6 name={category.icon} size={12} color={category.color} />
              <Text style={[styles.categoryText, { color: category.color }]}>
                {category.label}
              </Text>
            </View>
            {item.priority === 'high' && (
              <View style={[styles.priorityBadge, { backgroundColor: '#fee2e2' }]}>
                <Text style={[styles.priorityText, { color: '#ef4444' }]}>
                  紧急
                </Text>
              </View>
            )}
          </View>
          {item.person && (
            <Text style={styles.personText}>@{item.person}</Text>
          )}
        </View>

        <Text
          style={[
            styles.eventTitle,
            item.is_completed && styles.eventTitleCompleted,
          ]}
          numberOfLines={2}
        >
          {item.title}
        </Text>

        {item.description && (
          <Text style={styles.eventDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        {item.remind_time && (
          <View style={styles.remindRow}>
            <FontAwesome6 name="clock" size={12} color="#9ca3af" />
            <Text style={styles.remindText}>
              {format(parseISO(item.remind_time), 'MM-dd HH:mm')}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.completeButton,
            item.is_completed && styles.completeButtonActive,
          ]}
          onPress={() => handleToggleComplete(item)}
        >
          <FontAwesome6
            name={item.is_completed ? 'check-circle' : 'circle'}
            size={20}
            color={item.is_completed ? '#10b981' : '#d1d5db'}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <Screen>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>MemoKeep</Text>
            <Text style={styles.headerSubtitle}>记录每一个重要时刻</Text>
            {Platform.OS === 'web' && (
              <Text style={styles.notifStatus}>通知：{notifStatus}</Text>
            )}
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.testButton}
              onPress={handleTestNotification}
            >
              <FontAwesome6 name="bell" size={18} color="#6366f1" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push('/add-event')}
            >
              <FontAwesome6 name="plus" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Event List */}
        <FlatList
          data={groupedEvents}
          keyExtractor={(item) => item.date}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContent}
          renderItem={({ item: group }) => (
            <View style={styles.dateGroup}>
              <View style={styles.dateHeader}>
                <Text style={styles.dateLabel}>{getDateLabel(group.date)}</Text>
                <Text style={styles.dateCount}>{group.events.length} 条</Text>
              </View>
              {group.events.map((event) => (
                <View key={event.id}>{renderEvent({ item: event })}</View>
              ))}
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <FontAwesome6 name="calendar-xmark" size={48} color="#d1d5db" />
              <Text style={styles.emptyText}>暂无事件记录</Text>
              <Text style={styles.emptySubtext}>点击右上角 + 添加新事件</Text>
            </View>
          }
        />

        {/* 页面内提醒 Modal */}
        <Modal
          visible={reminderModal.visible}
          transparent
          animationType="fade"
          onRequestClose={() => setReminderModal({...reminderModal, visible: false})}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalIcon}>
                <FontAwesome6 name="bell" size={40} color="#6C63FF" />
              </View>
              <Text style={styles.modalTitle}>{reminderModal.title}</Text>
              <Text style={styles.modalDescription}>{reminderModal.description || '您有一个重要事件即将开始'}</Text>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => {
                  setReminderModal({...reminderModal, visible: false});
                  router.push('/detail', { id: reminderModal.eventId });
                }}
              >
                <Text style={styles.modalButtonText}>查看详情</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  testButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#eef2ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  notifStatus: {
    fontSize: 12,
    color: '#10b981',
    marginTop: 4,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  listContent: {
    padding: 16,
  },
  dateGroup: {
    marginBottom: 20,
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  dateLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  dateCount: {
    fontSize: 13,
    color: '#9ca3af',
  },
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  eventCardCompleted: {
    opacity: 0.6,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  eventTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '600',
  },
  personText: {
    fontSize: 13,
    color: '#6b7280',
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
    lineHeight: 22,
  },
  eventTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#9ca3af',
  },
  eventDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 8,
  },
  remindRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  remindText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  completeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  completeButtonActive: {
    top: 16,
    right: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  modalIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 12,
  },
  modalDescription: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
