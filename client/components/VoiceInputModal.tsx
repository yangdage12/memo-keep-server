import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Audio } from 'expo-av';
import { FontAwesome6 } from '@expo/vector-icons';
import { useCSSVariable } from 'uniwind';
import { smartCreateEvent } from '@/utils/api';
import { createFormDataFile } from '@/utils';
import type { EventItem } from '@/utils/api';

interface VoiceInputModalProps {
  visible: boolean;
  onClose: () => void;
  onEventCreated: (event: EventItem) => void;
}

export default function VoiceInputModal({ visible, onClose, onEventCreated }: VoiceInputModalProps) {
  const [primary, danger, success, textPrimary, textSecondary, border] = useCSSVariable([
    '--color-primary',
    '--color-danger',
    '--color-success',
    '--color-text-primary',
    '--color-text-secondary',
    '--color-border',
  ]) as string[];

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('权限不足', '需要麦克风权限才能录音');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recordingRef.current = recording;
      setIsRecording(true);
      setRecordingDuration(0);

      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('错误', '无法开始录音');
    }
  }, []);

  const stopRecording = useCallback(async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
        const uri = recordingRef.current.getURI();
        recordingRef.current = null;
        setIsRecording(false);

        if (uri) {
          await processRecording(uri);
        }
      } catch (error) {
        console.error('Failed to stop recording:', error);
        Alert.alert('错误', '录音处理失败');
      }
    }
  }, []);

  const processRecording = async (uri: string) => {
    setIsProcessing(true);
    try {
      const audioFile = await createFormDataFile(uri, 'recording.m4a', 'audio/m4a');
      const formData = new FormData();
      formData.append('audio', audioFile as any);

      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/ai/smart-create`, {
        method: 'POST',
        body: formData,
      });

      const json = await response.json();
      if (!response.ok) throw new Error(json.error);

      onEventCreated(json.event);
      onClose();
      Alert.alert('成功', `已创建事件：${json.event.title}`);
    } catch (error: any) {
      console.error('Smart create error:', error);
      Alert.alert('错误', error.message || '智能创建失败');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: textPrimary }]}>语音输入</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <FontAwesome6 name="xmark" size={20} color={textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.body}>
            {isProcessing ? (
              <View style={styles.processingContainer}>
                <ActivityIndicator size="large" color={primary} />
                <Text style={[styles.processingText, { color: textSecondary }]}>
                  AI 正在识别语音并分类...
                </Text>
              </View>
            ) : (
              <View style={styles.recordingContainer}>
                <Text style={[styles.instruction, { color: textSecondary }]}>
                  点击下方按钮开始录音，说出你的事件
                </Text>

                {isRecording && (
                  <View style={styles.durationContainer}>
                    <View style={[styles.recordingDot, { backgroundColor: danger }]} />
                    <Text style={[styles.durationText, { color: danger }]}>
                      {formatDuration(recordingDuration)}
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[
                    styles.recordButton,
                    {
                      backgroundColor: isRecording ? danger : primary,
                      shadowColor: isRecording ? danger : primary,
                    },
                  ]}
                  onPress={isRecording ? stopRecording : startRecording}
                  disabled={isProcessing}
                >
                  <FontAwesome6
                    name={isRecording ? 'stop' : 'microphone'}
                    size={32}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>

                <Text style={[styles.hint, { color: textSecondary }]}>
                  {isRecording ? '点击停止录音' : '点击开始录音'}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    minHeight: 400,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 8,
  },
  body: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
  },
  instruction: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
  },
  recordingContainer: {
    alignItems: 'center',
    width: '100%',
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  durationText: {
    fontSize: 24,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 20,
  },
  hint: {
    fontSize: 14,
  },
  processingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  processingText: {
    fontSize: 16,
    marginTop: 20,
    textAlign: 'center',
  },
});
