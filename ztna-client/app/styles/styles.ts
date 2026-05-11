//스타일

import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
    // ==========================================
    // 1. 공통 레이아웃 및 뼈대 (Common Layout)
    // ==========================================
    container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#f0f4f8' },
    title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 30, color: '#1a365d' },

    // ==========================================
    // 2. 공통 폼 컴포넌트 (Inputs & Buttons)
    // ==========================================
    input: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: '#e2e8f0', fontSize: 16, letterSpacing: 2 },
    button: { backgroundColor: '#3182ce', padding: 15, borderRadius: 8, alignItems: 'center' },
    logoutButton: { backgroundColor: '#e53e3e', padding: 15, borderRadius: 8, alignItems: 'center' },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    linkText: { textAlign: 'center', color: '#718096', marginTop: 20 },
    
    // ==========================================
    // 3. 로그인 화면 전용 (Login Screen)
    // ==========================================
    dashboard: { backgroundColor: '#ffffff', padding: 15, borderRadius: 10, marginBottom: 30, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
    infoText: { fontSize: 16, marginBottom: 5, color: '#4a5568' },
    highlight: { fontWeight: 'bold', color: '#2b6cb0' },
    statusText: { fontSize: 14, color: '#38a169', marginTop: 10, fontWeight: 'bold' },

    // ==========================================
    // 4. OTP 인증 화면 전용 (OTP Screen)
    // ==========================================
    otpBox: { backgroundColor: '#fff5f5', padding: 20, borderRadius: 10, marginBottom: 30, borderWidth: 1, borderColor: '#feb2b2' },
    otpAlert: { fontSize: 18, fontWeight: 'bold', color: '#c53030', marginBottom: 10 },
    hintText: { fontSize: 14, color: '#e53e3e', marginTop: 10, fontWeight: 'bold' },
    
    // ==========================================
    // 5. 기밀망 진입 화면 전용 (Intranet Screen)
    // ==========================================
    intranetTitle: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', color: '#2d3748', marginBottom: 5 },
    intranetSub: { fontSize: 14, fontWeight: 'bold', textAlign: 'center', color: '#38a169', marginBottom: 40 },
    secretCard: { backgroundColor: '#ebf8ff', padding: 30, borderRadius: 15, borderWidth: 2, borderColor: '#90cdf4', marginBottom: 20 },
    secretLabel: { fontSize: 14, color: '#2b6cb0', fontWeight: 'bold', marginBottom: 10 },
    secretText: { fontSize: 22, color: '#2c5282', fontWeight: '900' },
    infoCard: { backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 30, borderWidth: 1, borderColor: '#e2e8f0' },
    infoLine: { fontSize: 14, color: '#718096', marginBottom: 5, fontWeight: '500' },
    
    // ==========================================
    // 6. 보안 차단 화면 전용 (Blocked Screen)
    // ==========================================
    blockedTitle: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', color: '#c53030', marginBottom: 30 },
    blockedCard: { backgroundColor: '#fff5f5', padding: 30, borderRadius: 15, borderWidth: 2, borderColor: '#feb2b2', alignItems: 'center' },
    blockedText: { fontSize: 18, fontWeight: 'bold', color: '#c53030', marginBottom: 15, textAlign: 'center' },
    blockedSub: { fontSize: 14, color: '#718096', textAlign: 'center', lineHeight: 22 },
});