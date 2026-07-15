import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Screen } from '@/components/Screen';
import { useFocusEffect } from 'expo-router';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome6 } from '@expo/vector-icons';
import { fetchEventStats, type EventStats } from '@/utils/api';

const CATEGORY_CONFIG = [
  { key: 'work', label: '工作', color: '#6C63FF', icon: 'briefcase' as const },
  { key: 'life', label: '生活', color: '#00B894', icon: 'mug-hot' as const },
  { key: 'family', label: '家庭', color: '#FDCB6E', icon: 'house-chimney' as const },
];

const PRIORITY_CONFIG = [
  { key: 'high', label: '高优先', color: '#FF6B6B' },
  { key: 'medium', label: '中优先', color: '#FDCB6E' },
  { key: 'low', label: '低优先', color: '#00B894' },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useSafeRouter();
  const [stats, setStats] = useState<EventStats | null>(null);

  const loadStats = useCallback(async () => {
    try {
      const data = await fetchEventStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats])
  );

  return (
    <Screen safeAreaEdges={['left', 'right']} backgroundColor="#F0F0F3">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerTitle}>我的</Text>
              <Text style={styles.headerSubtitle}>事件统计概览</Text>
            </View>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => router.push('/settings')}
            >
              <FontAwesome6 name="gear" size={22} color="#636E72" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Overview */}
        <View style={styles.statsCard}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats?.total ?? 0}</Text>
              <Text style={styles.statLabel}>全部事件</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#6C63FF' }]}>{stats?.pending ?? 0}</Text>
              <Text style={styles.statLabel}>待处理</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#00B894' }]}>{stats?.completed ?? 0}</Text>
              <Text style={styles.statLabel}>已完成</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#FF6B6B' }]}>{stats?.upcoming ?? 0}</Text>
              <Text style={styles.statLabel}>即将到期</Text>
            </View>
          </View>
        </View>

        {/* Category Breakdown */}
        <Text style={styles.sectionTitle}>按分类统计</Text>
        <View style={styles.categoryGrid}>
          {CATEGORY_CONFIG.map(cat => {
            const count = stats?.byCategory[cat.key as keyof typeof stats.byCategory] ?? 0;
            const total = stats?.total ?? 1;
            const percentage = Math.round((count / total) * 100);
            return (
              <View key={cat.key} style={styles.categoryCard}>
                <View style={[styles.catIconWrap, { backgroundColor: `${cat.color}15` }]}>
                  <FontAwesome6 name={cat.icon} size={22} color={cat.color} />
                </View>
                <Text style={styles.catCount}>{count}</Text>
                <Text style={styles.catLabel}>{cat.label}</Text>
                <View style={styles.progressBg}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${percentage}%`,
                        backgroundColor: cat.color,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.catPercent}>{percentage}%</Text>
              </View>
            );
          })}
        </View>

        {/* Priority Breakdown */}
        <Text style={styles.sectionTitle}>按优先级统计</Text>
        <View style={styles.priorityCard}>
          {PRIORITY_CONFIG.map(pri => {
            const count = stats?.byPriority[pri.key as keyof typeof stats.byPriority] ?? 0;
            const total = stats?.total ?? 1;
            const percentage = Math.round((count / total) * 100);
            return (
              <View key={pri.key} style={styles.priorityRow}>
                <View style={[styles.priorityDot, { backgroundColor: pri.color }]} />
                <Text style={styles.priorityLabel}>{pri.label}</Text>
                <Text style={styles.priorityCount}>{count}</Text>
                <View style={styles.priorityBarBg}>
                  <View
                    style={[
                      styles.priorityBarFill,
                      { width: `${percentage}%`, backgroundColor: pri.color },
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </View>

        {/* App Info */}
        <View style={styles.infoCard}>
          <FontAwesome6 name="bell" size={18} color="#6C63FF" />
          <Text style={styles.infoText}>提醒功能已开启，到时间将自动弹出通知</Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0F0F3',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#D1D9E6',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#2D3436',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#636E72',
    marginTop: 4,
  },
  statsCard: {
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
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#2D3436',
  },
  statLabel: {
    fontSize: 11,
    color: '#636E72',
    marginTop: 4,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#E8E8EB',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3436',
    marginTop: 24,
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  categoryGrid: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
  },
  categoryCard: {
    flex: 1,
    backgroundColor: '#F0F0F3',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#D1D9E6',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 3,
  },
  catIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  catCount: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2D3436',
  },
  catLabel: {
    fontSize: 12,
    color: '#636E72',
    fontWeight: '600',
    marginTop: 2,
  },
  progressBg: {
    width: '100%',
    height: 4,
    backgroundColor: '#E8E8EB',
    borderRadius: 2,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  catPercent: {
    fontSize: 11,
    color: '#B2BEC3',
    marginTop: 4,
    fontWeight: '600',
  },
  priorityCard: {
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
  priorityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  priorityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  priorityLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2D3436',
    width: 50,
  },
  priorityCount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2D3436',
    width: 24,
    textAlign: 'center',
  },
  priorityBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: '#E8E8EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  priorityBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  infoCard: {
    marginHorizontal: 16,
    marginTop: 24,
    backgroundColor: 'rgba(108,99,255,0.08)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#6C63FF',
    fontWeight: '600',
  },
});
