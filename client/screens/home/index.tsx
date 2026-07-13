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
  SectionList,
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
  { key: 'work', label: '工作', color: '#6C63FF', icon: 'briefcase' },
  { key: 'life', label: '生活', color: '#00B894', icon: 'heart' },
  { key: 'family', label: '家庭', color: '#FDCB6E', icon: 'house-user' },
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

function formatDateOnly(dateStr: string): string {
  const d = new Date(dateStr);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const weekday = weekdays[d.getDay()];
  return `${month}月${day}日 ${weekday}`;
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
                <FontAwesome6 name="check" size={12} color="#00B894" />
              )}
            </TouchableOpacity>
            <Text
              style={[
                styles.cardTitle,
                item.is_completed && styles.cardTitleCompleted,
              ]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
          </View>
          <TouchableOpacity onPress={() => onEdit(item)} style={styles.editBtn}>
            <FontAwesome6 name="pen" size={14} color="#B2BEC3" />
          </TouchableOpacity>
        </View>

        {item.description ? (
          <Text style={styles.cardDesc} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}

        <View style={styles.cardMeta}>
          <View style={[styles.tag, { backgroundColor: `${catInfo.color}15` }]}>
            <Text style={[styles.tagText, { color: catInfo.color }]}>
              {catInfo.label}
            </Text>
          </View>
          <View style={[styles.tag, { backgroundColor: `${priInfo.color}15` }]}>
            <Text style={[styles.tagText, { color: priInfo.color }]}>
              {priInfo.label}
            </Text>
          </View>
          {item.person ? (
            <View style={styles.personTag}>
              <FontAwesome6 name="user" size={10} color="#636E72" />
              <Text style={styles.personText}>{item.person}</Text>
            </View>
          ) : null}
        </View>

        {item.remind_time ? (
          <View style={[styles.remindRow, overdue && styles.remindOverdue]}>
            <FontAwesome6
              name="clock"
              size={12}
              color={overdue ? '#FF6B6B' : '#B2BEC3'}
            />
            <Text
              style={[
                styles.remindText,
                overdue && styles.remindTextOverdue,
              ]}
            >
              {formatDate(item.remind_time)}
              {overdue ? ' (已逾期)' : ''}
            </Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

interface DateSection {
  title: string;
  date: string;
  data: EventItem[];
}

function CategorySection({
  category,
  events,
  onToggleComplete,
  onEdit,
  onPress,
}: {
  category: typeof CATEGORIES[0];
  events: EventItem[];
  onToggleComplete: (item: EventItem) => void;
  onEdit: (item: EventItem) => void;
  onPress: (item: EventItem) => void;
}) {
  const [expandedDates, setExpandedDates] = useState<Set<string>>(() => {
    // 按日期分组
    const dateGroups = events.reduce<Record<string, EventItem[]>>((acc, event) => {
      const dateKey = event.remind_time
        ? new Date(event.remind_time).toISOString().split('T')[0]
        : 'no-date';
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(event);
      return acc;
    }, {});

    const sections: DateSection[] = Object.entries(dateGroups)
      .map(([date, items]) => ({
        title: date === 'no-date' ? '未设置日期' : formatDateOnly(date),
        date,
        data: items.sort(
          (a, b) =>
            new Date(a.remind_time || 0).getTime() -
            new Date(b.remind_time || 0).getTime()
        ),
      }))
      .sort((a, b) => {
        if (a.date === 'no-date') return 1;
        if (b.date === 'no-date') return -1;
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });

    return new Set(sections.map(s => s.date));
  });

  // 按日期分组
  const dateGroups = events.reduce<Record<string, EventItem[]>>((acc, event) => {
    const dateKey = event.remind_time
      ? new Date(event.remind_time).toISOString().split('T')[0]
      : 'no-date';
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(event);
    return acc;
  }, {});

  const sections: DateSection[] = Object.entries(dateGroups)
    .map(([date, items]) => ({
      title: date === 'no-date' ? '未设置日期' : formatDateOnly(date),
      date,
      data: items.sort(
        (a, b) =>
          new Date(a.remind_time || 0).getTime() -
          new Date(b.remind_time || 0).getTime()
      ),
    }))
    .sort((a, b) => {
      if (a.date === 'no-date') return 1;
      if (b.date === 'no-date') return -1;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

  const toggleDate = (date: string) => {
    setExpandedDates(prev => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  };

  if (events.length === 0) {
    return (
      <View style={styles.categorySection}>
        <View style={[styles.categoryHeader, { backgroundColor: `${category.color}10` }]}>
          <View style={styles.categoryHeaderLeft}>
            <FontAwesome6 name={category.icon as any} size={18} color={category.color} />
            <Text style={[styles.categoryTitle, { color: category.color }]}>
              {category.label}
            </Text>
            <View style={styles.categoryCount}>
              <Text style={styles.categoryCountText}>{events.length}</Text>
            </View>
          </View>
        </View>
        <View style={styles.emptyCategory}>
          <Text style={styles.emptyCategoryText}>暂无{category.label}事件</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.categorySection}>
      <View style={[styles.categoryHeader, { backgroundColor: `${category.color}10` }]}>
        <View style={styles.categoryHeaderLeft}>
          <FontAwesome6 name={category.icon as any} size={18} color={category.color} />
          <Text style={[styles.categoryTitle, { color: category.color }]}>
            {category.label}
          </Text>
          <View style={styles.categoryCount}>
            <Text style={styles.categoryCountText}>{events.length}</Text>
          </View>
        </View>
      </View>

      {sections.map(section => (
        <View key={section.date} style={styles.dateSection}>
          <TouchableOpacity
            style={styles.dateHeader}
            onPress={() => toggleDate(section.date)}
            activeOpacity={0.7}
          >
            <Text style={styles.dateTitle}>{section.title}</Text>
            <View style={styles.dateCount}>
              <Text style={styles.dateCountText}>{section.data.length}</Text>
            </View>
            <FontAwesome6
              name={expandedDates.has(section.date) ? 'chevron-up' : 'chevron-down'}
              size={14}
              color="#B2BEC3"
            />
          </TouchableOpacity>

          {expandedDates.has(section.date) && (
            <View style={styles.dateContent}>
              {section.data.map(item => (
                <EventCard
                  key={item.id}
                  item={item}
                  onToggleComplete={onToggleComplete}
                  onEdit={onEdit}
                  onPress={onPress}
                />
              ))}
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useSafeRouter();

  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCategory, setFormCategory] = useState<'work' | 'life' | 'family'>('work');
  const [formPriority, setFormPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [formPerson, setFormPerson] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formTime, setFormTime] = useState('');

  // Voice input
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchEvents();
      setEvents(data);
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadEvents();
    }, [loadEvents])
  );

  useEffect(() => {
    initNotifications();
  }, []);

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
      // 验证日期时间格式
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      const timeRegex = /^\d{2}:\d{2}$/;
      if (!dateRegex.test(formDate) || !timeRegex.test(formTime)) {
        Alert.alert('提示', '请输入正确的日期时间格式（日期：YYYY-MM-DD，时间：HH:MM）');
        return;
      }
      const dateObj = new Date(`${formDate}T${formTime}`);
      if (isNaN(dateObj.getTime())) {
        Alert.alert('提示', '无效的日期时间');
        return;
      }
      remindTime = dateObj.toISOString();
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

  const handleEventCreated = (event: EventItem) => {
    setVoiceModalVisible(false);
    loadEvents();
  };

  const workEvents = events.filter(e => e.category === 'work' && !e.is_completed);
  const lifeEvents = events.filter(e => e.category === 'life' && !e.is_completed);
  const familyEvents = events.filter(e => e.category === 'family' && !e.is_completed);
  const completedEvents = events.filter(e => e.is_completed);

  return (
    <Screen safeAreaEdges={['left', 'right']} backgroundColor="#F0F0F3">
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>MemoKeep</Text>
        <Text style={styles.headerSubtitle}>记录每一个重要时刻</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        {/* 工作 */}
        <CategorySection
          category={CATEGORIES[0]}
          events={workEvents}
          onToggleComplete={handleToggleComplete}
          onEdit={openEditModal}
          onPress={handlePress}
        />

        {/* 生活 */}
        <CategorySection
          category={CATEGORIES[1]}
          events={lifeEvents}
          onToggleComplete={handleToggleComplete}
          onEdit={openEditModal}
          onPress={handlePress}
        />

        {/* 家庭 */}
        <CategorySection
          category={CATEGORIES[2]}
          events={familyEvents}
          onToggleComplete={handleToggleComplete}
          onEdit={openEditModal}
          onPress={handlePress}
        />

        {/* 已完成 */}
        {completedEvents.length > 0 && (
          <View style={styles.completedSection}>
            <View style={styles.completedHeader}>
              <FontAwesome6 name="circle-check" size={18} color="#00B894" />
              <Text style={styles.completedTitle}>已完成</Text>
              <View style={styles.completedCount}>
                <Text style={styles.completedCountText}>{completedEvents.length}</Text>
              </View>
            </View>
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
        )}
      </ScrollView>

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

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} disabled={Platform.OS === 'web'}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {editingEvent ? '编辑事件' : '新建事件'}
                  </Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <FontAwesome6 name="xmark" size={20} color="#636E72" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                  <Text style={styles.label}>标题 *</Text>
                  <TextInput
                    style={styles.input}
                    value={formTitle}
                    onChangeText={setFormTitle}
                    placeholder="输入事件标题"
                    placeholderTextColor="#B2BEC3"
                  />

                  <Text style={styles.label}>描述</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={formDesc}
                    onChangeText={setFormDesc}
                    placeholder="输入事件描述（可选）"
                    placeholderTextColor="#B2BEC3"
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />

                  <Text style={styles.label}>分类</Text>
                  <View style={styles.categoryRow}>
                    {CATEGORIES.map(cat => (
                      <TouchableOpacity
                        key={cat.key}
                        style={[
                          styles.categoryOption,
                          formCategory === cat.key && {
                            backgroundColor: `${cat.color}20`,
                            borderColor: cat.color,
                          },
                        ]}
                        onPress={() => setFormCategory(cat.key as any)}
                      >
                        <FontAwesome6
                          name={cat.icon as any}
                          size={16}
                          color={formCategory === cat.key ? cat.color : '#B2BEC3'}
                        />
                        <Text
                          style={[
                            styles.categoryOptionText,
                            formCategory === cat.key && { color: cat.color },
                          ]}
                        >
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.label}>优先级</Text>
                  <View style={styles.priorityRow}>
                    {PRIORITIES.map(pri => (
                      <TouchableOpacity
                        key={pri.key}
                        style={[
                          styles.priorityOption,
                          formPriority === pri.key && {
                            backgroundColor: `${pri.color}20`,
                            borderColor: pri.color,
                          },
                        ]}
                        onPress={() => setFormPriority(pri.key as any)}
                      >
                        <Text
                          style={[
                            styles.priorityOptionText,
                            formPriority === pri.key && { color: pri.color },
                          ]}
                        >
                          {pri.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.label}>相关人员</Text>
                  <TextInput
                    style={styles.input}
                    value={formPerson}
                    onChangeText={setFormPerson}
                    placeholder="输入相关人员（可选）"
                    placeholderTextColor="#B2BEC3"
                  />

                  <Text style={styles.label}>提醒时间</Text>
                  <View style={styles.datetimeRow}>
                    <TextInput
                      style={[styles.input, styles.dateInput]}
                      value={formDate}
                      onChangeText={setFormDate}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="#B2BEC3"
                    />
                    <TextInput
                      style={[styles.input, styles.timeInput]}
                      value={formTime}
                      onChangeText={setFormTime}
                      placeholder="HH:MM"
                      placeholderTextColor="#B2BEC3"
                    />
                  </View>
                </ScrollView>

                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.cancelButtonText}>取消</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.submitButton]}
                    onPress={handleSave}
                  >
                    <Text style={styles.submitButtonText}>保存</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Voice Input Modal */}
      <VoiceInputModal
        visible={voiceModalVisible}
        onClose={() => setVoiceModalVisible(false)}
        onEventCreated={handleEventCreated}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#2D3436',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#636E72',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  categorySection: {
    marginBottom: 16,
    marginHorizontal: 20,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  categoryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  categoryCount: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  categoryCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#636E72',
  },
  emptyCategory: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyCategoryText: {
    fontSize: 14,
    color: '#B2BEC3',
  },
  dateSection: {
    marginBottom: 12,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  dateTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#636E72',
    flex: 1,
  },
  dateCount: {
    backgroundColor: '#DFE6E9',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 8,
  },
  dateCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#636E72',
  },
  dateContent: {
    gap: 10,
  },
  completedSection: {
    marginHorizontal: 20,
    marginTop: 8,
  },
  completedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 10,
  },
  completedTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#00B894',
    flex: 1,
  },
  completedCount: {
    backgroundColor: '#00B89420',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  completedCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#00B894',
  },
  cardOuter: {
    marginBottom: 10,
  },
  cardInner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardCompleted: {
    opacity: 0.6,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkboxOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3436',
    flex: 1,
  },
  cardTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#B2BEC3',
  },
  editBtn: {
    padding: 8,
  },
  cardDesc: {
    fontSize: 13,
    color: '#636E72',
    lineHeight: 20,
    marginBottom: 12,
  },
  cardMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  personTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#F0F0F3',
    borderRadius: 8,
  },
  personText: {
    fontSize: 11,
    color: '#636E72',
  },
  remindRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F3',
  },
  remindOverdue: {
    borderTopColor: '#FF6B6B30',
  },
  remindText: {
    fontSize: 12,
    color: '#B2BEC3',
  },
  remindTextOverdue: {
    color: '#FF6B6B',
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 40,
    width: 56,
    height: 56,
    borderRadius: 28,
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  fabInner: {
    flex: 1,
    backgroundColor: '#6C63FF',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceFab: {
    position: 'absolute',
    right: 20,
    bottom: 110,
    width: 56,
    height: 56,
    borderRadius: 28,
    shadowColor: '#00B894',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  voiceFabInner: {
    flex: 1,
    backgroundColor: '#00B894',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F3',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3436',
  },
  modalBody: {
    padding: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#636E72',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#F0F0F3',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#2D3436',
  },
  textArea: {
    minHeight: 80,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  categoryOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#DFE6E9',
    backgroundColor: '#F0F0F3',
  },
  categoryOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#B2BEC3',
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 10,
  },
  priorityOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#DFE6E9',
    backgroundColor: '#F0F0F3',
  },
  priorityOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#B2BEC3',
  },
  datetimeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dateInput: {
    flex: 2,
  },
  timeInput: {
    flex: 1,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F3',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F0F0F3',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#636E72',
  },
  submitButton: {
    backgroundColor: '#6C63FF',
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
