import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'auto' | 'light' | 'dark';

interface ThemeContextProps {
  themeMode: ThemeMode;
  isDark: boolean;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextProps>({
  themeMode: 'auto',
  isDark: false,
  setThemeMode: () => {},
});

export const AppThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('auto');

  useEffect(() => {
    // 앱 로드 시 저장된 테마 불러오기
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('ztna_theme_mode');
        if (savedTheme) {
          setThemeModeState(savedTheme as ThemeMode);
        }
      } catch (e) {
        console.error('Failed to load theme mode', e);
      }
    };
    loadTheme();
  }, []);

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      await AsyncStorage.setItem('ztna_theme_mode', mode);
    } catch (e) {
      console.error('Failed to save theme mode', e);
    }
  };

  const isDark = themeMode === 'auto' ? systemColorScheme === 'dark' : themeMode === 'dark';

  return (
    <ThemeContext.Provider value={{ themeMode, isDark, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
