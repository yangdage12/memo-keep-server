import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND_URL_KEY = '@backend_url';
const DEFAULT_URL = 'https://memo-keep-server-production.up.railway.app';

let cachedUrl: string | null = null;

// 初始化时加载
export async function initBackendUrl(): Promise<string> {
  try {
    const saved = await AsyncStorage.getItem(BACKEND_URL_KEY);
    cachedUrl = saved || DEFAULT_URL;
    return cachedUrl;
  } catch {
    cachedUrl = DEFAULT_URL;
    return DEFAULT_URL;
  }
}

// 同步获取（用于 API 调用）
export function getBackendUrl(): string {
  return cachedUrl || DEFAULT_URL;
}

// 保存 URL
export async function saveBackendUrl(url: string): Promise<void> {
  const cleanUrl = url.trim().replace(/\/$/, '');
  await AsyncStorage.setItem(BACKEND_URL_KEY, cleanUrl);
  cachedUrl = cleanUrl;
}

// 重置 URL
export async function resetBackendUrl(): Promise<void> {
  await AsyncStorage.removeItem(BACKEND_URL_KEY);
  cachedUrl = DEFAULT_URL;
}
