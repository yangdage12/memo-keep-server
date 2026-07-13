import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  Alert,
} from 'react-native';
import { Screen } from '@/components/Screen';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome6 } from '@expo/vector-icons';
import {
  fetchEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  type EventItem,
} from '@/utils/api';
import { initNotifications, scheduleEventReminder, cancelEventReminder } from '@/utils/notifications';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import VoiceInputModal from '@/components/VoiceInputModal';

const CATEGORIES = [
  { key: 'all', label: '全部', color: '#6C63FF' },
  { key: 'work', label: '工作', color: '#6C63FF' },
  { key: 'life', label: '生活', color: '#00B894' },
  { key: 'family', label: '家庭', color: '#FDCB6E' },
];

const PRIORITIES = [
  { key: 'high', label: '高', color: '#FF6B6B' },
  { key: 'medium', label: '中', color: '#FDCB6E' },
  { key: 'low', label: '低', color: '#00B894' },
];

const CATEGORY_MAP: Record<string, { label: string; color: string }> = {
  work: { label: '工作', color: '#6C63FF' },
  life: { label: '生活', color: '#00B894' },
  family: { label: '家庭', color: '#FDCB6E' },
};

const PRIORITY_MAP: Record<string, { label: string; color: string }> = {
  high: { label: '高', color: '#FF6B6B' },
  medium: { label: '中', color: '#FDCB6E' },
  low: { label: '低', color: '#00B894' },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '未设置';
  const d = new Date(dateStr);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${month}月${day}日 ${hours}:${minutes}`;
}

function isOverdue(dateStr: string | null, isCompleted: boolean): boolean {
  if (!dateStr || isCompleted) return false;
  return new Date(dateStr) < new Date();
}

interface EventCardProps {
  item: EventItem;
  onToggleComplete: (item: EventItem) => void;
  onEdit: (item: EventItem) => void;
  onPress: (item: EventItem) => void;
}

function EventCard({ item, onToggleComplete, onEdit, onPress }: EventCardProps) {
  const catInfo = CATEGORY_MAP[item.category] || CATEGORY_MAP.work;
  const priInfo = PRIORITY_MAP[item.priority] || PRIORITY_MAP.medium;
  const overdue = isOverdue(item.remind_time, item.is_completed);

  return (
    <TouchableOpacity
      style={styles.cardOuter}
      onPress={() => onPress(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.cardInner, item.is_completed && styles.cardCompleted]}>
        <View style={styles.cardTop}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <TouchableOpacity
              onPress={() => onToggleComplete(item)}
              style={[
                styles.checkboxOuter,
                { borderColor: item.is_completed ? '#00B894' : '#D1D9E6' },
              ]}
            >
              {item.is_completed && (
                <FontAwesome6 name="check" size={14} color="#00B894" />
              )}
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text
                style={[
                  styles.cardTitle,
                  item.is_completed && styles.cardTitleCompleted,
                ]}
                numberOfLines={1}
              >
                {item.title}
              </Text>
              {item.person ? (
                <Text style={styles.cardPerson} numberOfLines={1}>
                  <FontAwesome6 name="user" size={10} color="#636E72" /> {item.person}
                </Text>
              ) : null}
            </View>
          </View>
          <TouchableOpacity onPress={() => onEdit(item)} style={styles.editBtn}>
            <FontAwesome6 name="pen" size={14} color="#636E72" />
          </TouchableOpacity>
        </View>
        <View style={styles.cardBottom}>
          <View style={[styles.tag, { backgroundColor: `${catInfo.color}15` }]}>
            <Text style={[styles.tagText, { color: catInfo.color }]}>{catInfo.label}</Text>
          </View>
          <View style={[styles.tag, { backgroundColor: `${priInfo.color}15` }]}>
            <Text style={[styles.tagText, { color: priInfo.color }]}>{priInfo.label}优先</Text>
          </View>
          <View style={styles.cardTime}>
            <FontAwesome6
              name="clock"
              size={10}
              color={overdue ? '#FF6B6B' : '#636E72'}
            />
            <Text
              style={[styles.timeText, overdue && styles.timeTextOverdue]}
            >
              {overdue ? '已过期 · ' : ''}{formatDate(item.remind_time)}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useSafeRouter();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCategory, setFormCategory] = useState('work');
  const [formPriority, setFormPriority] = useState('medium');
  const [formPerson, setFormPerson] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formTime, setFormTime] = useState('');

  useEffect(() => {
    initNotifications();
  }, []);

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      const params = activeCategory !== 'all' ? { category: activeCategory } : undefined;
      const data = await fetchEvents(params);
      setEvents(data);
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setLoading(false);
    }
  }, [activeCategory]);

  useFocusEffect(
    useCallback(() => {
      loadEvents();
    }, [loadEvents])
  );

  const resetForm = () => {
    setFormTitle('');
    setFormDesc('');
    setFormCategory('work');
    setFormPriority('medium');
    setFormPerson('');
    setFormDate('');
    setFormTime('');
  };

  const openAddModal = () => {
    setEditingEvent(null);
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (item: EventItem) => {
    setEditingEvent(item);
    setFormTitle(item.title);
    setFormDesc(item.description || '');
    setFormCategory(item.category);
    setFormPriority(item.priority);
    setFormPerson(item.person || '');
    if (item.remind_time) {
      const d = new Date(item.remind_time);
      setFormDate(d.toISOString().split('T')[0]);
      setFormTime(
        `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
      );
    } else {
      setFormDate('');
      setFormTime('');
    }
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formTitle.trim()) {
      Alert.alert('提示', '请输入事件标题');
      return;
    }

    let remindTime: string | undefined;
    if (formDate && formTime) {
      remindTime = new Date(`${formDate}T${formTime}`).toISOString();
    }

    try {
      if (editingEvent) {
        await updateEvent(editingEvent.id, {
          title: formTitle.trim(),
          description: formDesc.trim() || undefined,
          category: formCategory,
          priority: formPriority,
          person: formPerson.trim() || undefined,
          remind_time: remindTime,
        });
        if (remindTime) {
          await scheduleEventReminder(
            editingEvent.id,
            formTitle.trim(),
            formDesc.trim() || null,
            new Date(remindTime)
          );
        }
      } else {
        const newEvent = await createEvent({
          title: formTitle.trim(),
          description: formDesc.trim() || undefined,
          category: formCategory,
          priority: formPriority,
          person: formPerson.trim() || undefined,
          remind_time: remindTime,
        });
        if (remindTime) {
          await scheduleEventReminder(
            newEvent.id,
            formTitle.trim(),
            formDesc.trim() || null,
            new Date(remindTime)
          );
        }
      }
      setModalVisible(false);
      resetForm();
      loadEvents();
    } catch (err) {
      Alert.alert('错误', err instanceof Error ? err.message : '操作失败');
    }
  };

  const handleToggleComplete = async (item: EventItem) => {
    try {
      await updateEvent(item.id, { is_completed: !item.is_completed });
      loadEvents();
    } catch (err) {
      Alert.alert('错误', err instanceof Error ? err.message : '操作失败');
    }
  };

  const handleDelete = (item: EventItem) => {
    Alert.alert('确认删除', `确定要删除"${item.title}"吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteEvent(item.id);
            loadEvents();
          } catch (err) {
            Alert.alert('错误', err instanceof Error ? err.message : '删除失败');
          }
        },
      },
    ]);
  };

  const handlePress = (item: EventItem) => {
    router.push('/detail', { eventId: item.id });
  };

  const pendingEvents = events.filter(e => !e.is_completed);
  const completedEvents = events.filter(e => e.is_completed);

  return (
    <Screen safeAreaEdges={['left', 'right']} backgroundColor="#F0F0F3">
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>MemoKeep</Text>
        <Text style={styles.headerSubtitle}>记录每一个重要时刻</Text>
      </View>

      <View style={styles.filterRow}>
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat.key}
            style={[
              styles.filterChip,
              activeCategory === cat.key && { backgroundColor: `${cat.color}20` },
            ]}
            onPress={() => setActiveCategory(cat.key)}
          >
            <Text
              style={[
                styles.filterChipText,
                activeCategory === cat.key && { color: cat.color, fontWeight: '700' },
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={pendingEvents}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => (
          <EventCard
            item={item}
            onToggleComplete={handleToggleComplete}
            onEdit={openEditModal}
            onPress={handlePress}
          />
        )}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 120 }}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <FontAwesome6 name="clipboard-list" size={48} color="#B2BEC3" />
              <Text style={styles.emptyText}>暂无事件</Text>
              <Text style={styles.emptySubText}>点击下方按钮添加新事件</Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          completedEvents.length > 0 ? (
            <View style={{ marginTop: 24 }}>
              <Text style={styles.sectionTitle}>已完成</Text>
              {completedEvents.map(item => (
                <EventCard
                  key={item.id}
                  item={item}
                  onToggleComplete={handleToggleComplete}
                  onEdit={openEditModal}
                  onPress={handlePress}
                />
              ))}
            </View>
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />

      {/* FAB Button */}
      <TouchableOpacity style={styles.fab} onPress={openAddModal} activeOpacity={0.8}>
        <View style={styles.fabInner}>
          <FontAwesome6 name="plus" size={24} color="#FFFFFF" />
        </View>
      </TouchableOpacity>

      {/* Voice Input Button */}
      <TouchableOpacity
        style={styles.voiceFab}
        onPress={() => setVoiceModalVisible(true)}
        activeOpacity={0.8}
      >
        <View style={styles.voiceFabInner}>
          <FontAwesome6 name="microphone" size={22} color="#FFFFFF" />
        </View>
      </TouchableOpacity>

      {/* Voice Input Modal */}
      <VoiceInputModal
        visible={voiceModalVisible}
        onClose={() => setVoiceModalVisible(false)}
        onEventCreated={() => {
          setVoiceModalVisible(false);
          loadEvents();
        }}
      />

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)} disabled={Platform.OS === 'web'}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={Keyboard.dismiss} disabled={Platform.OS === 'web'}>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>
                      {editingEvent ? '编辑事件' : '新增事件'}
                    </Text>
                    <TouchableOpacity onPress={() => setModalVisible(false)}>
                      <FontAwesome6 name="xmark" size={20} color="#636E72" />
                    </TouchableOpacity>
                  </View>

                  <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                    <Text style={styles.inputLabel}>事件标题 *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="输入事件标题"
                      placeholderTextColor="#B2BEC3"
                      value={formTitle}
                      onChangeText={setFormTitle}
                    />

                    <Text style={styles.inputLabel}>事件描述</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      placeholder="输入事件描述（可选）"
                      placeholderTextColor="#B2BEC3"
                      value={formDesc}
                      onChangeText={setFormDesc}
                      multiline
                      numberOfLines={3}
                    />

                    <Text style={styles.inputLabel}>性质分类</Text>
                    <View style={styles.segmentRow}>
                      {CATEGORIES.filter(c => c.key !== 'all').map(cat => (
                        <TouchableOpacity
                          key={cat.key}
                          style={[
                            styles.segmentBtn,
                            formCategory === cat.key && { backgroundColor: `${cat.color}20` },
                          ]}
                          onPress={() => setFormCategory(cat.key)}
                        >
                          <Text
                            style={[
                              styles.segmentText,
                              formCategory === cat.key && { color: cat.color, fontWeight: '700' },
                            ]}
                          >
                            {cat.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={styles.inputLabel}>重要等级</Text>
                    <View style={styles.segmentRow}>
                      {PRIORITIES.map(pri => (
                        <TouchableOpacity
                          key={pri.key}
                          style={[
                            styles.segmentBtn,
                            formPriority === pri.key && { backgroundColor: `${pri.color}20` },
                          ]}
                          onPress={() => setFormPriority(pri.key)}
                        >
                          <Text
                            style={[
                              styles.segmentText,
                              formPriority === pri.key && { color: pri.color, fontWeight: '700' },
                            ]}
                          >
                            {pri.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={styles.inputLabel}>相关人员</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="输入相关人员（可选）"
                      placeholderTextColor="#B2BEC3"
                      value={formPerson}
                      onChangeText={setFormPerson}
                    />

                    <Text style={styles.inputLabel}>提醒时间</Text>
                    <View style={styles.dateRow}>
                      <TextInput
                        style={[styles.input, { flex: 1 }]}
                        placeholder="日期 YYYY-MM-DD"
                        placeholderTextColor="#B2BEC3"
                        value={formDate}
                        onChangeText={setFormDate}
                      />
                      <TextInput
                        style={[styles.input, { flex: 1 }]}
                        placeholder="时间 HH:MM"
                        placeholderTextColor="#B2BEC3"
                        value={formTime}
                        onChangeText={setFormTime}
                      />
                    </View>

                    {editingEvent && (
                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => {
                          setModalVisible(false);
                          handleDelete(editingEvent);
                        }}
                      >
                        <FontAwesome6 name="trash" size={14} color="#FF6B6B" />
                        <Text style={styles.deleteBtnText}>删除此事件</Text>
                      </TouchableOpacity>
                    )}
                  </ScrollView>

                  <View style={styles.modalFooter}>
                    <TouchableOpacity
                      style={[styles.modalBtn, styles.cancelBtn]}
                      onPress={() => setModalVisible(false)}
                    >
                      <Text style={styles.cancelBtnText}>取消</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalBtn, styles.saveBtn]}
                      onPress={handleSave}
                    >
                      <Text style={styles.saveBtnText}>保存</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    backgroundColor: '#F0F0F3',
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
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9999,
    backgroundColor: '#E8E8EB',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#636E72',
  },
  cardOuter: {
    marginBottom: 12,
    borderRadius: 20,
    shadowColor: '#D1D9E6',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  cardInner: {
    backgroundColor: '#F0F0F3',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#FFFFFF',
    shadowOffset: { width: -4, height: -4 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  cardCompleted: {
    opacity: 0.6,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D3436',
    flex: 1,
  },
  cardTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#B2BEC3',
  },
  cardPerson: {
    fontSize: 12,
    color: '#636E72',
    marginTop: 4,
  },
  checkboxOuter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E8E8EB',
  },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E8E8EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
    flexWrap: 'wrap',
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
  },
  timeText: {
    fontSize: 11,
    color: '#636E72',
  },
  timeTextOverdue: {
    color: '#FF6B6B',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#636E72',
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 13,
    color: '#B2BEC3',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3436',
    marginBottom: 12,
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 80,
  },
  fabInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6C63FF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  voiceFab: {
    position: 'absolute',
    right: 24,
    bottom: 148,
  },
  voiceFabInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#00B894',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00B894',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  modalContent: {
    backgroundColor: '#F0F0F3',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2D3436',
  },
  modalBody: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#636E72',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#E8E8EB',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#2D3436',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#E8E8EB',
    alignItems: 'center',
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#636E72',
  },
  dateRow: {
    flexDirection: 'row',
    gap: 8,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,107,107,0.1)',
  },
  deleteBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B6B',
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 12,
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 9999,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#E8E8EB',
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#636E72',
  },
  saveBtn: {
    backgroundColor: '#6C63FF',
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
