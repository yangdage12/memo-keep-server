import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import { createContext, PropsWithChildren, use, useState } from 'react';
import { Provider } from '@/components/Provider';

import '../global.css';

LogBox.ignoreLogs([
  "TurboModuleRegistry.getEnforcing(...): 'RNMapsAirModule' could not be found",
]);

// 手动提供 LinkPreviewContext 以修复 Expo Router 6.x 的已知问题
const LinkPreviewContext = createContext<{
  isStackAnimationDisabled: boolean;
  openPreviewKey: string | undefined;
  setOpenPreviewKey: (openPreviewKey: string | undefined) => void;
} | undefined>(undefined);

function LinkPreviewContextProvider({ children }: PropsWithChildren) {
  const [openPreviewKey, setOpenPreviewKey] = useState<string | undefined>(undefined);
  const isStackAnimationDisabled = openPreviewKey !== undefined;
  return (
    <LinkPreviewContext.Provider
      value={{ isStackAnimationDisabled, openPreviewKey, setOpenPreviewKey }}>
      {children}
    </LinkPreviewContext.Provider>
  );
}

export default function RootLayout() {
  return (
    <LinkPreviewContextProvider>
      <Provider>
        <Stack
          screenOptions={{
            animation: 'slide_from_right',
            gestureEnabled: true,
            gestureDirection: 'horizontal',
            headerShown: false
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="detail" />
        </Stack>
      </Provider>
    </LinkPreviewContextProvider>
  );
}
