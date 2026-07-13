import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { FontAwesome6 } from '@expo/vector-icons';
import { useCSSVariable } from 'uniwind';
import { Screen } from '@/components/Screen';
import { fetchReports, deleteReport, generateReport, type ReportItem } from '@/utils/api';

export default function ReportsScreen() {
  const [primary, success, warning, danger, textPrimary, textSecondary, bgSecondary, border, cardBg] = useCSSVariable([
    '--color-primary',
    '--color-success',
    '--color-warning',
    '--color-danger',
    '--color-text-primary',
    '--color-text-secondary',
    '--color-bg-secondary',
    '--color-border',
    '--color-card',
  ]) as string[];

  const [reports, setReports] = useState<ReportItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  const loadReports = useCallback(async () => {
    try {
      const data = await fetchReports();
      setReports(data);
    } catch (error: any) {
      console.error('Failed to load reports:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadReports();
    }, [loadReports])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadReports();
    setRefreshing(false);
  }, [loadReports]);

  const handleGenerateReport = async (type: string, period: string) => {
    setGenerating(true);
    try {
      await generateReport(type, period);
      setShowGenerateModal(false);
      await loadReports();
      Alert.alert('成功', '报告已生成');
    } catch (error: any) {
      Alert.alert('错误', error.message || '报告生成失败');
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteReport = (id: number) => {
    Alert.alert('确认删除', '确定要删除这份报告吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteReport(id);
            await loadReports();
          } catch (error: any) {
            Alert.alert('错误', error.message || '删除失败');
          }
        },
      },
    ]);
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'monthly': return '月度';
      case 'quarterly': return '季度';
      case 'yearly': return '年度';
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'monthly': return primary;
      case 'quarterly': return warning;
      case 'yearly': return success;
      default: return textSecondary;
    }
  };

  const renderReportItem = ({ item }: { item: ReportItem }) => (
    <TouchableOpacity
      style={[styles.reportCard, { backgroundColor: cardBg, borderColor: border }]}
      onLongPress={() => handleDeleteReport(item.id)}
    >
      <View style={styles.reportHeader}>
        <View style={[styles.typeBadge, { backgroundColor: getTypeColor(item.type) + '15' }]}>
          <Text style={[styles.typeText, { color: getTypeColor(item.type) }]}>
            {getTypeLabel(item.type)}
          </Text>
        </View>
        <Text style={[styles.period, { color: textSecondary }]}>{item.period}</Text>
      </View>

      <Text style={[styles.reportTitle, { color: textPrimary }]} numberOfLines={2}>
        {item.title}
      </Text>

      {item.summary && (
        <Text style={[styles.summary, { color: textSecondary }]} numberOfLines={2}>
          {item.summary}
        </Text>
      )}

      <View style={styles.reportFooter}>
        <View style={styles.eventCount}>
          <FontAwesome6 name="list-check" size={14} color={textSecondary} />
          <Text style={[styles.eventCountText, { color: textSecondary }]}>
            {item.event_count} 件事件
          </Text>
        </View>
        <Text style={[styles.date, { color: textSecondary }]}>
          {new Date(item.created_at).toLocaleDateString('zh-CN')}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const getCurrentPeriod = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const quarter = Math.ceil(month / 3);
    return {
      monthly: `${year}-${String(month).padStart(2, '0')}`,
      quarterly: `${year}-Q${quarter}`,
      yearly: `${year}`,
    };
  };

  const periods = getCurrentPeriod();

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: textPrimary }]}>报告中心</Text>
          <TouchableOpacity
            style={[styles.generateButton, { backgroundColor: primary }]}
            onPress={() => setShowGenerateModal(true)}
          >
            <FontAwesome6 name="plus" size={16} color="#FFFFFF" />
            <Text style={styles.generateButtonText}>生成报告</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={reports}
          renderItem={renderReportItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <FontAwesome6 name="file-lines" size={48} color={textSecondary} />
              <Text style={[styles.emptyText, { color: textSecondary }]}>
                暂无报告，点击上方按钮生成
              </Text>
            </View>
          }
        />

        {/* Generate Report Modal */}
        <Modal
          visible={showGenerateModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowGenerateModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: textPrimary }]}>生成报告</Text>
                <TouchableOpacity onPress={() => setShowGenerateModal(false)}>
                  <FontAwesome6 name="xmark" size={20} color={textSecondary} />
                </TouchableOpacity>
              </View>

              {generating ? (
                <View style={styles.generatingContainer}>
                  <ActivityIndicator size="large" color={primary} />
                  <Text style={[styles.generatingText, { color: textSecondary }]}>
                    AI 正在分析数据并生成报告...
                  </Text>
                </View>
              ) : (
                <View style={styles.modalBody}>
                  <TouchableOpacity
                    style={[styles.optionButton, { borderColor: border }]}
                    onPress={() => handleGenerateReport('monthly', periods.monthly)}
                  >
                    <View style={[styles.optionIcon, { backgroundColor: primary + '15' }]}>
                      <FontAwesome6 name="calendar-day" size={20} color={primary} />
                    </View>
                    <View style={styles.optionText}>
                      <Text style={[styles.optionTitle, { color: textPrimary }]}>月度报告</Text>
                      <Text style={[styles.optionDesc, { color: textSecondary }]}>
                        {periods.monthly}
                      </Text>
                    </View>
                    <FontAwesome6 name="chevron-right" size={16} color={textSecondary} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.optionButton, { borderColor: border }]}
                    onPress={() => handleGenerateReport('quarterly', periods.quarterly)}
                  >
                    <View style={[styles.optionIcon, { backgroundColor: warning + '15' }]}>
                      <FontAwesome6 name="calendar-week" size={20} color={warning} />
                    </View>
                    <View style={styles.optionText}>
                      <Text style={[styles.optionTitle, { color: textPrimary }]}>季度报告</Text>
                      <Text style={[styles.optionDesc, { color: textSecondary }]}>
                        {periods.quarterly}
                      </Text>
                    </View>
                    <FontAwesome6 name="chevron-right" size={16} color={textSecondary} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.optionButton, { borderColor: border }]}
                    onPress={() => handleGenerateReport('yearly', periods.yearly)}
                  >
                    <View style={[styles.optionIcon, { backgroundColor: success + '15' }]}>
                      <FontAwesome6 name="calendar" size={20} color={success} />
                    </View>
                    <View style={styles.optionText}>
                      <Text style={[styles.optionTitle, { color: textPrimary }]}>年度报告</Text>
                      <Text style={[styles.optionDesc, { color: textSecondary }]}>
                        {periods.yearly}
                      </Text>
                    </View>
                    <FontAwesome6 name="chevron-right" size={16} color={textSecondary} />
                  </TouchableOpacity>
                </View>
              )}
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  list: {
    padding: 20,
    paddingTop: 10,
    gap: 16,
  },
  reportCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  period: {
    fontSize: 14,
    fontWeight: '500',
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    lineHeight: 22,
  },
  summary: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  reportFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  eventCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eventCountText: {
    fontSize: 13,
  },
  date: {
    fontSize: 13,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    minHeight: 300,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  generatingContainer: {
    alignItems: 'center',
    padding: 60,
    gap: 20,
  },
  generatingText: {
    fontSize: 16,
    textAlign: 'center',
  },
  modalBody: {
    padding: 20,
    gap: 12,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 16,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  optionDesc: {
    fontSize: 14,
  },
});
