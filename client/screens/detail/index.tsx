import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Screen } from '@/components/Screen';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome6 } from '@expo/vector-icons';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { fetchEventById, updateEvent, deleteEvent, type EventItem } from '@/utils/api';

const CATEGORY_MAP: Record<string, { label: string; color: string; icon: string }> = {
  work: { label: '工作', color: '#6C63FF', icon: 'briefcase' },
  life: { label: '生活', color: '#00B894', icon: 'mug-hot' },
  family: { label: '家庭', color: '#FDCB6E', icon: 'house-chimney' },
};

const PRIORITY_MAP: Record<string, { label: string; color: string }> = {
  high: { label: '高优先级', color: '#FF6B6B' },
  medium: { label: '中优先级', color: '#FDCB6E' },
  low: { label: '低优先级', color: '#00B894' },
};

export default function DetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useSafeRouter();
  const { eventId } = useSafeSearchParams<{ eventId: number }>();
  const [event, setEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);

  const loadEvent = useCallback(async () => {
    if (!eventId) return;
    try {
      setLoading(true);
      const data = await fetchEventById(eventId);
      setEvent(data);
    } catch (err) {
      console.error('Failed to load event:', err);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useFocusEffect(
    useCallback(() => {
      loadEvent();
    }, [loadEvent])
  );

  const handleToggleComplete = async () => {
    if (!event) return;
    try {
      const updated = await updateEvent(event.id, { is_completed: !event.is_completed });
      setEvent(updated);
    } catch (err) {
      Alert.alert('错误', err instanceof Error ? err.message : '操作失败');
    }
  };

  const handleDelete = () => {
    if (!event) return;
    Alert.alert('确认删除', `确定要删除"${event.title}"吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteEvent(event.id);
            router.back();
          } catch (err) {
            Alert.alert('错误', err instanceof Error ? err.message : '删除失败');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <Screen backgroundColor="#F0F0F3">
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>加载中...</Text>
        </View>
      </Screen>
    );
  }

  if (!event) {
    return (
      <Screen backgroundColor="#F0F0F3">
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>事件不存在</Text>
        </View>
      </Screen>
    );
  }

  const catInfo = CATEGORY_MAP[event.category] || CATEGORY_MAP.work;
  const priInfo = PRIORITY_MAP[event.priority] || PRIORITY_MAP.medium;

  const formatFullDate = (dateStr: string | null): string => {
    if (!dateStr) return '未设置';
    const d = new Date(dateStr);
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${year}年${month}月${day}日 ${hours}:${minutes}`;
  };

  return (
    <Screen safeAreaEdges={['left', 'right']} backgroundColor="#F0F0F3">
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <FontAwesome6 name="chevron-left" size={18} color="#2D3436" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>事件详情</Text>
        <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
          <FontAwesome6 name="trash" size={16} color="#FF6B6B" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Card */}
        <View style={styles.mainCard}>
          <View style={styles.titleRow}>
            <TouchableOpacity
              onPress={handleToggleComplete}
              style={[
                styles.checkbox,
                {
                  borderColor: event.is_completed ? '#00B894' : '#D1D9E6',
                  backgroundColor: event.is_completed ? 'rgba(0,184,148,0.1)' : '#E8E8EB',
                },
              ]}
            >
              {event.is_completed && (
                <FontAwesome6 name="check" size={18} color="#00B894" />
              )}
            </TouchableOpacity>
            <Text
              style={[
                styles.title,
                event.is_completed && styles.titleCompleted,
              ]}
            >
              {event.title}
            </Text>
          </View>

          {event.description ? (
            <Text style={styles.description}>{event.description}</Text>
          ) : null}

          <View style={styles.tagRow}>
            <View style={[styles.tag, { backgroundColor: `${catInfo.color}15` }]}>
              <FontAwesome6
                name={catInfo.icon as any}
                size={12}
                color={catInfo.color}
              />
              <Text style={[styles.tagText, { color: catInfo.color }]}>
                {catInfo.label}
              </Text>
            </View>
            <View style={[styles.tag, { backgroundColor: `${priInfo.color}15` }]}>
              <Text style={[styles.tagText, { color: priInfo.color }]}>
                {priInfo.label}
              </Text>
            </View>
            {event.is_completed && (
              <View style={[styles.tag, { backgroundColor: 'rgba(0,184,148,0.1)' }]}>
                <Text style={[styles.tagText, { color: '#00B894' }]}>已完成</Text>
              </View>
            )}
          </View>
        </View>

        {/* Info Cards */}
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <View style={[styles.infoIconWrap, { backgroundColor: 'rgba(108,99,255,0.1)' }]}>
              <FontAwesome6 name="clock" size={16} color="#6C63FF" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>提醒时间</Text>
              <Text style={styles.infoValue}>{formatFullDate(event.remind_time)}</Text>
            </View>
          </View>

          <View style={styles.infoDivider} />

          <View style={styles.infoRow}>
            <View style={[styles.infoIconWrap, { backgroundColor: 'rgba(0,184,148,0.1)' }]}>
              <FontAwesome6 name="user" size={16} color="#00B894" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>相关人员</Text>
              <Text style={styles.infoValue}>{event.person || '未指定'}</Text>
            </View>
          </View>

          <View style={styles.infoDivider} />

          <View style={styles.infoRow}>
            <View style={[styles.infoIconWrap, { backgroundColor: 'rgba(253,203,110,0.15)' }]}>
              <FontAwesome6 name="calendar" size={16} color="#FDCB6E" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>创建时间</Text>
              <Text style={styles.infoValue}>{formatFullDate(event.created_at)}</Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={[
              styles.actionBtn,
              event.is_completed ? styles.actionBtnUndo : styles.actionBtnComplete,
            ]}
            onPress={handleToggleComplete}
          >
            <FontAwesome6
              name={event.is_completed ? 'rotate-left' : 'circle-check'}
              size={16}
              color={event.is_completed ? '#6C63FF' : '#00B894'}
            />
            <Text
              style={[
                styles.actionBtnText,
                { color: event.is_completed ? '#6C63FF' : '#00B894' },
              ]}
            >
              {event.is_completed ? '标记为未完成' : '标记为已完成'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#636E72',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8E8EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3436',
  },
  deleteBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,107,107,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainCard: {
    marginHorizontal: 16,
    backgroundColor: '#F0F0F3',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#D1D9E6',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkbox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  title: {
    flex: 1,
    fontSize: 22,
    fontWeight: '800',
    color: '#2D3436',
    lineHeight: 32,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    color: '#B2BEC3',
  },
  description: {
    fontSize: 15,
    color: '#636E72',
    lineHeight: 22,
    marginTop: 12,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    flexWrap: 'wrap',
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  infoSection: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#F0F0F3',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#D1D9E6',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 4,
  },
  infoIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#B2BEC3',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 15,
    color: '#2D3436',
    fontWeight: '600',
    marginTop: 2,
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#E8E8EB',
    marginVertical: 12,
  },
  actionsSection: {
    marginHorizontal: 16,
    marginTop: 20,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 9999,
    backgroundColor: '#F0F0F3',
    shadowColor: '#D1D9E6',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 3,
  },
  actionBtnComplete: {
    backgroundColor: 'rgba(0,184,148,0.08)',
  },
  actionBtnUndo: {
    backgroundColor: 'rgba(108,99,255,0.08)',
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
