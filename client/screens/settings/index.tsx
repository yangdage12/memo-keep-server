import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { Screen } from '@/components/Screen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome6 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND_URL_KEY = '@backend_url';
const DEFAULT_URL = 'https://silly-crews-appear.loca.lt';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const [backendUrl, setBackendUrl] = useState(DEFAULT_URL);
  const [savedUrl, setSavedUrl] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    loadSavedUrl();
  }, []);

  const loadSavedUrl = async () => {
    try {
      const saved = await AsyncStorage.getItem(BACKEND_URL_KEY);
      if (saved) {
        setBackendUrl(saved);
        setSavedUrl(saved);
      }
    } catch (err) {
      console.error('Failed to load backend URL:', err);
    }
  };

  const handleSave = async () => {
    if (!backendUrl.trim()) {
      Alert.alert('错误', '请输入后端 URL');
      return;
    }

    // 移除末尾的斜杠
    const url = backendUrl.trim().replace(/\/$/, '');
    setBackendUrl(url);

    try {
      await AsyncStorage.setItem(BACKEND_URL_KEY, url);
      setSavedUrl(url);
      Alert.alert('成功', '后端 URL 已保存');
    } catch (err) {
      Alert.alert('错误', '保存失败');
    }
  };

  const handleTest = async () => {
    const url = backendUrl.trim().replace(/\/$/, '');
    setTesting(true);
    setConnectionStatus('idle');

    try {
      const response = await fetch(`${url}/api/v1/health`, {
        method: 'GET',
      });

      if (response.ok) {
        const data = await response.json();
        setConnectionStatus('success');
        Alert.alert('连接成功', `后端服务正常\n状态：${data.status || 'OK'}`);
      } else {
        setConnectionStatus('error');
        Alert.alert('连接失败', `HTTP ${response.status}`);
      }
    } catch (err: any) {
      setConnectionStatus('error');
      Alert.alert('连接失败', err.message || '网络错误');
    } finally {
      setTesting(false);
    }
  };

  const handleReset = async () => {
    Alert.alert(
      '重置',
      '确定要重置为默认 URL 吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定',
          onPress: async () => {
            await AsyncStorage.removeItem(BACKEND_URL_KEY);
            setBackendUrl(DEFAULT_URL);
            setSavedUrl(null);
            Alert.alert('已重置', '已恢复默认 URL');
          },
        },
      ]
    );
  };

  return (
    <Screen safeAreaEdges={['left', 'right']} backgroundColor="#F0F0F3">
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <Text style={styles.headerTitle}>设置</Text>
          <Text style={styles.headerSubtitle}>后端服务配置</Text>
        </View>

        {/* Backend URL Config */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <FontAwesome6 name="server" size={20} color="#6C63FF" />
            <Text style={styles.cardTitle}>后端服务器地址</Text>
          </View>

          <Text style={styles.label}>API Base URL</Text>
          <TextInput
            style={styles.input}
            value={backendUrl}
            onChangeText={setBackendUrl}
            placeholder="https://example.loca.lt"
            placeholderTextColor="#B2BEC3"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />

          {savedUrl && (
            <Text style={styles.savedText}>
              已保存：{savedUrl}
            </Text>
          )}

          {/* Connection Status */}
          {connectionStatus !== 'idle' && (
            <View style={[
              styles.statusBadge,
              connectionStatus === 'success' ? styles.statusSuccess : styles.statusError
            ]}>
              <FontAwesome6
                name={connectionStatus === 'success' ? 'check-circle' : 'times-circle'}
                size={14}
                color={connectionStatus === 'success' ? '#00B894' : '#FF6B6B'}
              />
              <Text style={[
                styles.statusText,
                { color: connectionStatus === 'success' ? '#00B894' : '#FF6B6B' }
              ]}>
                {connectionStatus === 'success' ? '连接正常' : '连接失败'}
              </Text>
            </View>
          )}

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.testButton]}
              onPress={handleTest}
              disabled={testing}
            >
              <FontAwesome6 name="wifi" size={16} color="#00B894" />
              <Text style={[styles.buttonText, { color: '#00B894' }]}>
                {testing ? '测试中...' : '测试连接'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleSave}
            >
              <FontAwesome6 name="floppy-disk" size={16} color="#FFFFFF" />
              <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>保存</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Instructions */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <FontAwesome6 name="circle-info" size={20} color="#6C63FF" />
            <Text style={styles.cardTitle}>使用说明</Text>
          </View>

          <View style={styles.instructionItem}>
            <FontAwesome6 name="circle-dot" size={8} color="#6C63FF" />
            <Text style={styles.instructionText}>
              后端 URL 是应用的 API 服务器地址
            </Text>
          </View>

          <View style={styles.instructionItem}>
            <FontAwesome6 name="circle-dot" size={8} color="#6C63FF" />
            <Text style={styles.instructionText}>
              如果连接失败，可能是隧道已失效，需要重新创建
            </Text>
          </View>

          <View style={styles.instructionItem}>
            <FontAwesome6 name="circle-dot" size={8} color="#6C63FF" />
            <Text style={styles.instructionText}>
              保存后需要重启应用才能生效
            </Text>
          </View>

          <TouchableOpacity
            style={styles.resetButton}
            onPress={handleReset}
          >
            <FontAwesome6 name="rotate-left" size={14} color="#FF6B6B" />
            <Text style={[styles.resetText, { color: '#FF6B6B' }]}>重置为默认值</Text>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>应用版本</Text>
          <Text style={styles.infoValue}>1.0.0</Text>
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
  card: {
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3436',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#636E72',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: '#2D3436',
    borderWidth: 1,
    borderColor: '#E8E8EB',
  },
  savedText: {
    fontSize: 12,
    color: '#00B894',
    marginTop: 8,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    padding: 8,
    borderRadius: 8,
  },
  statusSuccess: {
    backgroundColor: 'rgba(0, 184, 148, 0.1)',
  },
  statusError: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  testButton: {
    backgroundColor: 'rgba(0, 184, 148, 0.1)',
    borderColor: '#00B894',
  },
  saveButton: {
    backgroundColor: '#6C63FF',
    borderColor: '#6C63FF',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  instructionText: {
    flex: 1,
    fontSize: 13,
    color: '#636E72',
    lineHeight: 18,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },
  resetText: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#F0F0F3',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#D1D9E6',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  infoLabel: {
    fontSize: 14,
    color: '#636E72',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 14,
    color: '#2D3436',
    fontWeight: '700',
  },
});
