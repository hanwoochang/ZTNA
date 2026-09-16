import { StyleSheet, Platform } from 'react-native';
import { useTheme } from '../hooks/useTheme';

export const Colors = {
  light: {
    background: '#f4f4f5', // canvas
    cardBackground: '#ffffff', // canvas-soft
    text: '#141414', // ink
    subText: '#707070', // text-muted
    border: '#e0e0e0', // hairline
    borderSoft: '#e4e4e7', // hairline-soft
    primary: '#141414', // primary ink
    onPrimary: '#ffffff',
    field: '#ffffff',
    accent: '#0066ff', // electric blue
    danger: '#e53e3e',
    success: '#38a169',
  },
  dark: {
    background: '#09090b',
    cardBackground: '#18181b',
    text: '#ffffff',
    subText: '#a0aec0',
    border: '#333333',
    borderSoft: '#27272a',
    primary: '#ffffff',
    onPrimary: '#141414',
    field: '#262626',
    accent: '#3182ce',
    danger: '#fc8181',
    success: '#68d391',
  }
};

const webStyle = Platform.OS === 'web' ? { maxWidth: 500, width: '100%', alignSelf: 'center' as const } : {};

export const useAppStyles = () => {
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;

  return {
    colors,
    styles: StyleSheet.create({
      // 1. 공통 레이아웃
      container: { flex: 1, padding: 24, backgroundColor: colors.background, ...webStyle },
      centerContainer: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: colors.background, ...webStyle },
      title: { fontSize: 32, fontWeight: '700', textAlign: 'center', marginBottom: 32, color: colors.text, letterSpacing: 0 },
      heading2: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 16 },
      heading3: { fontSize: 20, fontWeight: '600', color: colors.text, marginBottom: 8 },
      
      // 2. Mobbin 스타일 컴포넌트
      input: { backgroundColor: colors.field, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, marginBottom: 16, color: colors.text, fontSize: 16 },
      button: { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 16, borderRadius: 9999, alignItems: 'center', marginBottom: 12 },
      buttonOutline: { backgroundColor: 'transparent', paddingHorizontal: 24, paddingVertical: 16, borderRadius: 9999, alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: colors.border },
      buttonSoft: { backgroundColor: colors.cardBackground, paddingHorizontal: 24, paddingVertical: 16, borderRadius: 9999, alignItems: 'center', marginBottom: 12 },
      buttonText: { color: colors.onPrimary, fontSize: 16, fontWeight: '600' },
      buttonOutlineText: { color: colors.text, fontSize: 16, fontWeight: '600' },
      logoutButton: { backgroundColor: colors.cardBackground, paddingHorizontal: 24, paddingVertical: 16, borderRadius: 9999, alignItems: 'center', marginBottom: 12 },
      logoutButtonText: { color: colors.danger, fontSize: 16, fontWeight: '600' },
      linkText: { textAlign: 'center', color: colors.subText, marginTop: 24, fontSize: 14 },
      
      // 3. 카드 (그림자 제거, 테두리 반경 24px)
      card: { backgroundColor: colors.cardBackground, padding: 24, borderRadius: 24, marginBottom: 24, borderWidth: 1, borderColor: colors.borderSoft, ...Platform.select({ web: { boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' } as any }) },
      cardFeatured: { backgroundColor: colors.cardBackground, padding: 24, borderRadius: 24, marginBottom: 24, borderWidth: 1, borderColor: colors.borderSoft, ...Platform.select({ web: { boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' } as any }) },
      infoText: { fontSize: 16, marginBottom: 8, color: colors.subText, lineHeight: 22 },
      highlight: { fontWeight: '700', color: colors.text },
      statusText: { fontSize: 14, color: colors.accent, marginTop: 12, fontWeight: '600' },

      // 4. 모달 / 게시판 전용
      modalOverlay: { flex: 1, backgroundColor: 'rgba(20, 20, 20, 0.56)', justifyContent: 'center', padding: 24 },
      modalContent: { backgroundColor: colors.background, padding: 32, borderRadius: 24 },
      noticeRow: { backgroundColor: colors.cardBackground, padding: 16, borderRadius: 16, marginBottom: 12 },
      noticeTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 4 },
      noticeMeta: { fontSize: 12, color: colors.subText },
      
      // 5. 이전 호환성용 (차단, OTP)
      otpBox: { backgroundColor: colors.cardBackground, padding: 24, borderRadius: 24, marginBottom: 32, borderWidth: 1, borderColor: colors.danger },
      otpAlert: { fontSize: 20, fontWeight: '700', color: colors.danger, marginBottom: 12 },
      hintText: { fontSize: 14, color: colors.danger, marginTop: 12, fontWeight: '600' },
      blockedTitle: { fontSize: 32, fontWeight: '700', textAlign: 'center', color: colors.danger, marginBottom: 32 },
      blockedCard: { backgroundColor: colors.cardBackground, padding: 32, borderRadius: 24, borderWidth: 1, borderColor: colors.danger, alignItems: 'center' },
      blockedText: { fontSize: 20, fontWeight: '700', color: colors.danger, marginBottom: 16, textAlign: 'center' },
      blockedSub: { fontSize: 16, color: colors.subText, textAlign: 'center', lineHeight: 24 },
    })
  };
};