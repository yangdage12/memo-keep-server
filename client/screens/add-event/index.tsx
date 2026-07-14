import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  StyleSheet,
} from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { createFormDataFile } from '@/utils';
import { Audio } from 'expo-av';
import { scheduleEventReminder } from '@/utils/notifications';

export default function AddEventScreen() {
  const router = useSafeRouter();
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('错误', '需要麦克风权限才能录音');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsRecording(true);
    } catch (error) {
      console.error('Start recording error:', error);
      Alert.alert('错误', '录音启动失败');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setIsRecording(false);
      setRecording(null);

      if (uri) {
        await processAudio(uri);
      }
    } catch (error) {
      console.error('Stop recording error:', error);
      Alert.alert('错误', '录音处理失败');
    }
  };

  const processAudio = async (audioUri: string) => {
    setIsProcessing(true);
    try {
      const file = await createFormDataFile(audioUri, 'audio.m4a', 'audio/m4a');
      const formData = new FormData();
      formData.append('audio', file as any);

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/ai/smart-create`,
        {
          method: 'POST',
          body: formData as any,
        }
      );

      const json = await response.json();
      if (!response.ok) throw new Error(json.error);

      // 调度通知
      if (json.event.remind_time) {
        console.log('[AddEvent] Event created with remind_time:', json.event.remind_time);
        console.log('[AddEvent] Parsing date:', new Date(json.event.remind_time));
        
        try {
          const remindDate = new Date(json.event.remind_time);
          
          if (isNaN(remindDate.getTime())) {
            console.error('[AddEvent] Invalid remind_time date:', json.event.remind_time);
          } else {
            console.log('[AddEvent] Scheduling notification for:', remindDate.toISOString());
            const notificationId = await scheduleEventReminder(
              json.event.id,
              json.event.title,
              json.event.description,
              remindDate
            );
            console.log('[AddEvent] Notification scheduled, id:', notificationId);
          }
        } catch (notifyErr) {
          console.error('[AddEvent] Schedule notification error:', notifyErr);
        }
      } else {
        console.log('[AddEvent] No remind_time in event, skipping notification');
      }

      Alert.alert('成功', `已创建事件：${json.event.title}`, [
        { text: '确定', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error('Process audio error:', error);
      Alert.alert('错误', error.message || '语音识别失败');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTextSubmit = async () => {
    if (!text.trim()) {
      Alert.alert('提示', '请输入事件内容');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/ai/smart-create`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: text.trim() }),
        }
      );

      const json = await response.json();
      if (!response.ok) throw new Error(json.error);

      // 调度通知
      if (json.event.remind_time) {
        try {
          await scheduleEventReminder(
            json.event.id,
            json.event.title,
            json.event.description,
            new Date(json.event.remind_time)
          );
        } catch (notifyErr) {
          console.error('Schedule notification error:', notifyErr);
        }
      }

      Alert.alert('成功', `已创建事件：${json.event.title}`, [
        { text: '确定', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error('Text submit error:', error);
      Alert.alert('错误', error.message || '创建失败');
    } finally {
      setIsProcessing(false);
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
            placeholder="描述你的事件，AI 会自动分类..."
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={4}
            value={text}
            onChangeText={setText}
            editable={!isProcessing}
          />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>或</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Voice Input */}
          <View style={styles.voiceSection}>
            <Text style={styles.voiceHint}>
              {isRecording ? '正在录音...' : '点击下方按钮开始语音输入'}
            </Text>

            <TouchableOpacity
              style={[
                styles.voiceButton,
                isRecording && styles.voiceButtonRecording,
              ]}
              onPress={isRecording ? stopRecording : startRecording}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <FontAwesome6
                  name={isRecording ? 'stop' : 'microphone'}
                  size={32}
                  color="#fff"
                />
              )}
            </TouchableOpacity>

            {isRecording && (
              <Text style={styles.recordingHint}>再次点击停止录音</Text>
            )}
          </View>
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
              <Text style={styles.submitButtonText}>智能创建</Text>
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
