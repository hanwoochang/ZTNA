import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppStyles } from '../styles/styles';
import { useIntranet } from '../hooks/useIntranet';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { useTheme } from '../hooks/useTheme';

const Tab = createBottomTabNavigator();

type Props = {
    email: string;
    deviceId: string;
    ipAddress: string;
    secretData: string;
    handleLogout: () => void;
};

// 1. 근태 관리 탭
const AttendanceTab = ({ isLoading, attendanceData, fetchTodayAttendance, handleAttendance, styles }: any) => {
    useEffect(() => {
        fetchTodayAttendance();
    }, []);

    const formatTime = (isoString: string | null) => {
        if (!isoString) return '미기록';
        const date = new Date(isoString);
        return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    return (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, flexGrow: 1, justifyContent: 'center' }}>
            <Text style={styles.intranetTitle}>🏢 나의 근태 현황</Text>
            
            <View style={[styles.infoCard, { marginBottom: 30, alignItems: 'center' }]}>
                <Text style={[styles.infoLine, { fontSize: 18, marginBottom: 10 }]}>
                    출근 시간: {formatTime(attendanceData.check_in_time)}
                </Text>
                <Text style={[styles.infoLine, { fontSize: 18 }]}>
                    퇴근 시간: {formatTime(attendanceData.check_out_time)}
                </Text>
            </View>

            <TouchableOpacity style={styles.actionButtonSecondary} onPress={() => handleAttendance('check-in')} disabled={isLoading}>
                <Text style={styles.buttonText}>🏢 출근하기 (모바일 사원증)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButtonSecondary, { marginTop: 15 }]} onPress={() => handleAttendance('check-out')} disabled={isLoading}>
                <Text style={styles.buttonText}>🏠 퇴근하기 (모바일 사원증)</Text>
            </TouchableOpacity>
        </ScrollView>
    );
};

// 2. 기밀 문서 및 게시판 탭
const DocumentsTab = ({ secretData, isLoading, downloadSecretPdf, styles }: any) => {
    const notices = [
        { id: 1, title: '[필독] ZTNA v2.0 보안 정책 업데이트 안내', date: '2026-09-04' },
        { id: 2, title: '2분기 부서별 기밀문서 열람 권한 심사 결과', date: '2026-09-02' },
        { id: 3, title: '비인가 IP 접근 시도 계정 차단 내역 보고', date: '2026-09-01' },
    ];

    return (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
            <Text style={styles.intranetTitle}>🔒 기밀 데이터 및 공지</Text>
            
            <View style={styles.secretCard}>
                <Text style={styles.secretLabel}>최고 기밀 문서 (Top Secret)</Text>
                {isLoading ? (
                    <View style={{ marginTop: 10 }}>
                        <SkeletonLoader height={24} width="100%" style={{ marginBottom: 10 }} />
                        <SkeletonLoader height={24} width="70%" />
                    </View>
                ) : (
                    <Text style={styles.secretText}>"{secretData}"</Text>
                )}
                <TouchableOpacity style={[styles.actionButton, { marginTop: 20 }]} onPress={downloadSecretPdf} disabled={isLoading}>
                    <Text style={styles.buttonText}>📄 문서 PDF로 다운로드</Text>
                </TouchableOpacity>
            </View>

            <Text style={[styles.intranetSub, { marginTop: 30 }]}>📌 사내 보안 게시판</Text>
            {notices.map(notice => (
                <View key={notice.id} style={[styles.infoCard, { paddingVertical: 15, marginBottom: 10 }]}>
                    <Text style={[styles.infoLine, { fontSize: 15, fontWeight: 'bold' }]}>{notice.title}</Text>
                    <Text style={[styles.infoLine, { fontSize: 12, opacity: 0.6, marginTop: 5 }]}>{notice.date}</Text>
                </View>
            ))}
        </ScrollView>
    );
};

// 3. 설정 탭
const SettingsTab = ({ email, deviceId, ipAddress, handleLogout, styles }: any) => {
    const { themeMode, setThemeMode } = useTheme();

    return (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
            <Text style={styles.intranetTitle}>⚙️ 환경 설정</Text>
            
            <View style={styles.infoCard}>
                <Text style={[styles.secretLabel, { color: styles.intranetTitle.color }]}>내 정보 및 인가 기기</Text>
                <Text style={styles.infoLine}>접속자 이메일: {email}</Text>
                <Text style={styles.infoLine}>인가 기기 ID: {deviceId}</Text>
                <Text style={styles.infoLine}>인가 IP 주소: {ipAddress}</Text>
                <Text style={[styles.infoLine, { color: '#4CD964', fontWeight: 'bold' }]}>ZTNA 연결 상태: 안전함 🟢</Text>
            </View>

            <View style={[styles.infoCard, { marginTop: 20 }]}>
                <Text style={[styles.secretLabel, { color: styles.intranetTitle.color }]}>테마 설정</Text>
                
                <TouchableOpacity onPress={() => setThemeMode('auto')} style={{ paddingVertical: 10, borderBottomWidth: 1, borderColor: 'rgba(150,150,150,0.2)' }}>
                    <Text style={[styles.infoLine, themeMode === 'auto' && { fontWeight: 'bold', color: '#007AFF' }]}>
                        {themeMode === 'auto' ? '✓ ' : ''}시스템 자동
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setThemeMode('light')} style={{ paddingVertical: 10, borderBottomWidth: 1, borderColor: 'rgba(150,150,150,0.2)' }}>
                    <Text style={[styles.infoLine, themeMode === 'light' && { fontWeight: 'bold', color: '#007AFF' }]}>
                        {themeMode === 'light' ? '✓ ' : ''}라이트 모드
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setThemeMode('dark')} style={{ paddingVertical: 10 }}>
                    <Text style={[styles.infoLine, themeMode === 'dark' && { fontWeight: 'bold', color: '#007AFF' }]}>
                        {themeMode === 'dark' ? '✓ ' : ''}다크 모드
                    </Text>
                </TouchableOpacity>
            </View>

            <TouchableOpacity style={[styles.logoutButton, { marginTop: 40 }]} onPress={handleLogout}>
                <Text style={styles.buttonText}>🔒 안전하게 연결 종료 (Logout)</Text>
            </TouchableOpacity>
        </ScrollView>
    );
};

import { NavigationContainer, NavigationIndependentTree } from '@react-navigation/native';

export const IntranetScreen = (props: Props) => {
    const { styles } = useAppStyles();
    const intranet = useIntranet();
    const { isDark } = useTheme();
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
        }).start();
    }, [fadeAnim]);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#121212' : '#f0f4f8' }}>
            <Animated.View style={[{ flex: 1, opacity: fadeAnim }]}>
                <NavigationIndependentTree>
                    <NavigationContainer theme={{
                        dark: isDark,
                        colors: {
                            primary: '#007AFF',
                            background: isDark ? '#121212' : '#f0f4f8',
                            card: isDark ? '#1E1E1E' : '#FFFFFF',
                            text: isDark ? '#FFFFFF' : '#000000',
                            border: isDark ? '#333' : '#E5E5E5',
                            notification: '#FF3B30',
                        },
                        fonts: {} as any,
                    }}>
                        <Tab.Navigator
                            screenOptions={({ route }) => ({
                                headerShown: false,
                                tabBarStyle: {
                                    backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
                                    borderTopColor: isDark ? '#333' : '#E5E5E5',
                                    height: 60,
                                    paddingBottom: 10,
                                },
                                tabBarActiveTintColor: '#007AFF',
                                tabBarInactiveTintColor: isDark ? '#888' : '#8E8E93',
                                sceneStyle: { backgroundColor: isDark ? '#121212' : '#f0f4f8' },
                                tabBarIcon: ({ color, size }) => {
                                    let iconName: any = 'home';
                                    if (route.name === '근태 관리') iconName = 'clock-outline';
                                    else if (route.name === '기밀 문서') iconName = 'file-document-outline';
                                    else if (route.name === '설정') iconName = 'cog-outline';
                                    return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
                                },
                            })}
                        >
                            <Tab.Screen name="근태 관리">
                                {() => <AttendanceTab {...props} {...intranet} styles={styles} />}
                            </Tab.Screen>
                            <Tab.Screen name="기밀 문서">
                                {() => <DocumentsTab {...props} {...intranet} styles={styles} />}
                            </Tab.Screen>
                            <Tab.Screen name="설정">
                                {() => <SettingsTab {...props} styles={styles} />}
                            </Tab.Screen>
                        </Tab.Navigator>
                    </NavigationContainer>
                </NavigationIndependentTree>
            </Animated.View>
        </SafeAreaView>
    );
};