import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { CustomSplashScreen } from '@/components/SplashScreen';

// Prevent auto-hide of native splash screen
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [showCustomSplash, setShowCustomSplash] = useState(true);

  useEffect(() => {
    // Hide native splash screen after a short delay
    const hideSplash = async () => {
      await SplashScreen.hideAsync();
    };

    setTimeout(hideSplash, 500);

    // Hide custom splash screen after animation (3 seconds)
    const timer = setTimeout(() => {
      setShowCustomSplash(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  if (showCustomSplash) {
    return <CustomSplashScreen />;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar hidden={true} />
    </ThemeProvider>
  );
}
