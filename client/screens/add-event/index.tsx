import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { createEvent } from '@/utils/api';
import { scheduleEventReminder } from '@/utils/notifications';
import { SmartDateInput } from '@/components/SmartDateInput';
import { getBackendUrl } from '@/utils/backendUrl';
import { format } from 'date-fns';

const CATEGORIES = [
  { id: 'work', label: '工作', icon: 'briefcase', color: '#6366F1' },
  { id: 'life', label: '生活', icon: 'heart', color: '#10B981' },
  { id: 'family', label: '家庭', icon: 'home', color: '#F59E0B' },
];

const PRIORITIES = [
  { id: 'high', label: '紧急', color: '#EF4444' },
  { id: 'medium', label: '重要', color: '#F59E0B' },
  { id: 'low', label: '普通', color: '#6B7280' },
];

export default function AddEventScreen() {
  const router = useSafeRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('life');
  const [priority, setPriority] = useState('medium');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('提示', '请输入事件标题');
      return;
    }

    if (!selectedDate) {
      Alert.alert('提示', '请选择提醒时间');
      return;
    }

    setIsSaving(true);
    try {
      // 使用完整的 ISO 格式，包含时间和时区
      const remindTime = format(selectedDate, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");

      const event = await createEvent({
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        priority,
        remind_time: remindTime,
      });

      // 调度通知
      try {
        await scheduleEventReminder(
          event.id,
          event.title,
          event.description,
          new Date(remindTime),
          priority as 'high' | 'medium' | 'low'
        );
      } catch (notifyErr) {
        console.error('Schedule notification error:', notifyErr);
      }
      try {
        await scheduleEventReminder(
          event.id,
          event.title,
          event.description,
          new Date(remindTime),
          priority as 'high' | 'medium' | 'low'
        );
      } catch (notifyErr) {
        console.error('Schedule notification error:', notifyErr);
      }

      Alert.alert('成功', '事件已创建', [
        { text: '确定', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error('Save event error:', error);
      // 显示调试信息
      const currentUrl = getBackendUrl();
      Alert.alert('错误', `创建失败\n\n后端地址：${currentUrl}\n\n错误：${error.message || 'Network request failed'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Screen>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <FontAwesome6 name="arrow-left" size={20} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>新建事件</Text>
          <View style={styles.backButton} />
        </View>

        {/* Form */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Title Input */}
          <View style={styles.field}>
            <Text style={styles.label}>事件标题 *</Text>
            <TextInput
              style={styles.input}
              placeholder="输入事件标题..."
              placeholderTextColor="#9ca3af"
              value={title}
              onChangeText={setTitle}
            />
          </View>

          {/* Description Input */}
          <View style={styles.field}>
            <Text style={styles.label}>事件描述</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="描述你的事件..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={4}
              value={description}
              onChangeText={setDescription}
            />
          </View>

          {/* Category Selection */}
          <View style={styles.field}>
            <Text style={styles.label}>分类</Text>
            <View style={styles.optionsRow}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.optionButton,
                    category === cat.id && { backgroundColor: cat.color },
                  ]}
                  onPress={() => setCategory(cat.id)}
                >
                  <FontAwesome6
                    name={cat.icon as any}
                    size={16}
                    color={category === cat.id ? '#fff' : '#6b7280'}
                  />
                  <Text
                    style={[
                      styles.optionText,
                      category === cat.id && { color: '#fff' },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Priority Selection */}
          <View style={styles.field}>
            <Text style={styles.label}>优先级</Text>
            <View style={styles.optionsRow}>
              {PRIORITIES.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[
                    styles.optionButton,
                    priority === p.id && { backgroundColor: p.color },
                  ]}
                  onPress={() => setPriority(p.id)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      priority === p.id && { color: '#fff' },
                    ]}
                  >
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Date Selection */}
          <View style={styles.field}>
            <SmartDateInput
              label="提醒时间 *"
              mode="datetime"
              value={selectedDate ? selectedDate.toISOString() : null}
              onChange={(isoDate) => setSelectedDate(new Date(isoDate))}
              placeholder="选择提醒时间"
            />
          </View>
        </ScrollView>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, isSaving && styles.submitButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>创建事件</Text>
          )}
        </TouchableOpacity>
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
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  optionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  submitButton: {
    marginHorizontal: 20,
    marginBottom: 20,
    paddingVertical: 16,
    backgroundColor: '#6366f1',
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
