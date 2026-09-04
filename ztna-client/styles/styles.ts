import { StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';

export const Colors = {
  light: {
    background: '#f0f4f8',
    cardBackground: '#ffffff',
    text: '#1a365d',
    subText: '#4a5568',
    border: '#e2e8f0',
    primary: '#3182ce',
    danger: '#e53e3e',
    dangerBackground: '#fff5f5',
    dangerBorder: '#feb2b2',
    success: '#38a169',
    intranetBg: '#ebf8ff',
    intranetBorder: '#90cdf4',
    intranetText: '#2c5282',
  },
  dark: {
    background: '#121212',
    cardBackground: '#1e1e1e',
    text: '#e2e8f0',
    subText: '#a0aec0',
    border: '#333333',
    primary: '#63b3ed',
    danger: '#fc8181',
    dangerBackground: '#3b1212',
    dangerBorder: '#9b2c2c',
    success: '#68d391',
    intranetBg: '#1a365d',
    intranetBorder: '#2b6cb0',
    intranetText: '#90cdf4',
  }
};

export const useAppStyles = () => {
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;

  return {
    colors, // 컴포넌트에서 직접 색상을 쓸 수 있도록 반환
    styles: StyleSheet.create({
      // ==========================================
      // 1. 공통 레이아웃 및 뼈대 (Common Layout)
      // ==========================================
      container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: colors.background },
      title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 30, color: colors.text },

      // ==========================================
      // 2. 공통 폼 컴포넌트 (Inputs & Buttons)
      // ==========================================
      input: { backgroundColor: colors.cardBackground, padding: 15, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: colors.border, fontSize: 16, letterSpacing: 2, color: colors.text },
      button: { backgroundColor: colors.primary, padding: 15, borderRadius: 8, alignItems: 'center' },
      logoutButton: { backgroundColor: colors.danger, padding: 15, borderRadius: 8, alignItems: 'center' },
      buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
      linkText: { textAlign: 'center', color: colors.subText, marginTop: 20 },
      
      // ==========================================
      // 3. 로그인 화면 전용 (Login Screen)
      // ==========================================
      dashboard: { backgroundColor: colors.cardBackground, padding: 15, borderRadius: 10, marginBottom: 30, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 3, borderWidth: isDark ? 1 : 0, borderColor: colors.border },
      infoText: { fontSize: 16, marginBottom: 5, color: colors.subText },
      highlight: { fontWeight: 'bold', color: colors.primary },
      statusText: { fontSize: 14, color: colors.success, marginTop: 10, fontWeight: 'bold' },

      // ==========================================
      // 4. OTP 인증 화면 전용 (OTP Screen)
      // ==========================================
      otpBox: { backgroundColor: colors.dangerBackground, padding: 20, borderRadius: 10, marginBottom: 30, borderWidth: 1, borderColor: colors.dangerBorder },
      otpAlert: { fontSize: 18, fontWeight: 'bold', color: colors.danger, marginBottom: 10 },
      hintText: { fontSize: 14, color: colors.danger, marginTop: 10, fontWeight: 'bold' },
      
      // ==========================================
      // 5. 기밀망 진입 화면 전용 (Intranet Screen)
      // ==========================================
      intranetTitle: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', color: colors.text, marginBottom: 5 },
      intranetSub: { fontSize: 14, fontWeight: 'bold', textAlign: 'center', color: colors.success, marginBottom: 40 },
      secretCard: { backgroundColor: colors.intranetBg, padding: 30, borderRadius: 15, borderWidth: 2, borderColor: colors.intranetBorder, marginBottom: 20 },
      secretLabel: { fontSize: 14, color: colors.primary, fontWeight: 'bold', marginBottom: 10 },
      secretText: { fontSize: 22, color: colors.intranetText, fontWeight: '900' },
      infoCard: { backgroundColor: colors.cardBackground, padding: 15, borderRadius: 10, marginBottom: 30, borderWidth: 1, borderColor: colors.border },
      infoLine: { fontSize: 14, color: colors.subText, marginBottom: 5, fontWeight: '500' },
      actionButton: { backgroundColor: colors.primary, padding: 15, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
      actionButtonSecondary: { backgroundColor: colors.success, padding: 15, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
      
      // ==========================================
      // 6. 보안 차단 화면 전용 (Blocked Screen)
      // ==========================================
      blockedTitle: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', color: colors.danger, marginBottom: 30 },
      blockedCard: { backgroundColor: colors.dangerBackground, padding: 30, borderRadius: 15, borderWidth: 2, borderColor: colors.dangerBorder, alignItems: 'center' },
      blockedText: { fontSize: 18, fontWeight: 'bold', color: colors.danger, marginBottom: 15, textAlign: 'center' },
      blockedSub: { fontSize: 14, color: colors.subText, textAlign: 'center', lineHeight: 22 },
    })
  };
};