import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import { Provider } from '@/components/Provider';
import { LinkPreviewContextProvider } from 'expo-router/build/link/preview/LinkPreviewContext';

import '../global.css';

LogBox.ignoreLogs([
  "TurboModuleRegistry.getEnforcing(...): 'RNMapsAirModule' could not be found",
]);

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
