import { Stack } from 'expo-router';
import { AppThemeProvider, useTheme } from '@/hooks/useTheme';

function RootLayoutNav() {
  const { isDark } = useTheme();

  return (
    <Stack screenOptions={{
      headerStyle: { backgroundColor: isDark ? '#121212' : '#ffffff' },
      headerTintColor: isDark ? '#ffffff' : '#000000',
      contentStyle: { backgroundColor: isDark ? '#121212' : '#f0f4f8' }
    }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <RootLayoutNav />
    </AppThemeProvider>
  );
}