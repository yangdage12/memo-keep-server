import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { createEvent } from '@/utils/api';
import { scheduleEventReminder } from '@/utils/notifications';
import SmartDateInput from '@/components/SmartDateInput';
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
          new Date(remindTime)
        );
      } catch (notifyErr) {
        console.error('Schedule notification error:', notifyErr);
      }

      Alert.alert('成功', '事件已创建', [
        { text: '确定', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error('Save event error:', error);
      Alert.alert('错误', error.message || '创建失败');
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

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.label}>输入事件内容</Text>
          <TextInput
            style={styles.input}
            placeholder="描述你的事件..."
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={4}
            value={text}
            onChangeText={setText}
            editable={!isProcessing}
          />
        </View>

        {/* Submit Button */}
        {text.trim() && (
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleTextSubmit}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>创建事件</Text>
            )}
          </TouchableOpacity>
        )}
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
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: '#111827',
    minHeight: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  dividerText: {
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#9ca3af',
  },
  voiceSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  voiceHint: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
  },
  voiceButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  voiceButtonRecording: {
    backgroundColor: '#ef4444',
    shadowColor: '#ef4444',
  },
  recordingHint: {
    fontSize: 13,
    color: '#ef4444',
    marginTop: 12,
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
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
