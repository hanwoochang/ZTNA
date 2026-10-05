import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Animated, ScrollView, Modal, TextInput, RefreshControl, Platform, useWindowDimensions, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import { Swipeable } from 'react-native-gesture-handler';
import { Calendar } from 'react-native-calendars';
import { Image } from 'expo-image';
import { useAppStyles } from '../styles/styles';
import { useIntranet } from '../hooks/useIntranet';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { useTheme } from '../hooks/useTheme';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Storage from '../utils/storage';
import { NavigationContainer, NavigationIndependentTree, useNavigationContainerRef } from '@react-navigation/native';
import * as ScreenCapture from 'expo-screen-capture';

const Tab = createBottomTabNavigator();

import { Feather } from '@expo/vector-icons';

import { Icon } from '../components/ui/Icon';
import { AttendanceTab } from '../components/tabs/AttendanceTab';
import { DocumentsTab } from '../components/tabs/DocumentsTab';
import { ScheduleTab } from '../components/tabs/ScheduleTab';
import { SettingsTab } from '../components/tabs/SettingsTab';

type Props = {
    email: string;
    deviceId: string;
    ipAddress: string;
    secretData: string;
    handleLogout: (isRevoked?: boolean) => void;
};

// 1. 근태 관리 탭
export const IntranetScreen = (props: Props) => {
    const { styles, colors } = useAppStyles();
    const [allowDownload, setAllowDownload] = useState(true);
    const intranet = useIntranet(props.handleLogout, setAllowDownload);
    const { isDark } = useTheme();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    
    // Responsive dashboard
    const { width } = useWindowDimensions();
    const isDesktop = width > 768;
    const navigationRef = useNavigationContainerRef();
    const [currentRoute, setCurrentRoute] = useState('Attendance');

    // 사내망(기밀) 진입 시 화면 캡처 원천 차단 (iOS/Android 지원) 및 설정 로드
    useEffect(() => {
        const loadSettings = async () => {
            const storedAllow = await Storage.getItemAsync('allowDownload');
            if (storedAllow === 'false') {
                setAllowDownload(false);
            } else {
                setAllowDownload(true);
            }
        };
        loadSettings();

        // 실시간 튕김 폴링 - Gateway 경유 호출로 기기 차단/권한 변경을 감지 (30초 주기, 접근 로그 폭증 방지)
        const heartbeatInterval = setInterval(() => {
            intranet.fetchTodayAttendance();
        }, 30000);

        if (Platform.OS !== 'web') {
            // ScreenCapture.preventScreenCaptureAsync(); // 캡처 허용을 위해 임시 주석 처리
            return () => {
                clearInterval(heartbeatInterval);
                // ScreenCapture.allowScreenCaptureAsync();
            };
        }

        return () => clearInterval(heartbeatInterval);
    }, []);

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: Platform.OS !== 'web',
        }).start();
    }, [fadeAnim]);

    const navigateTo = (routeName: string) => {
        if (navigationRef.isReady()) {
            navigationRef.navigate(routeName as never);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <Animated.View style={[{ flex: 1, flexDirection: isDesktop ? 'row' : 'column', opacity: fadeAnim }]}>
                
                {isDesktop && (
                    <View style={{ width: 260, backgroundColor: colors.cardBackground, borderRightWidth: 1, borderRightColor: colors.borderSoft, padding: 24, justifyContent: 'space-between' }}>
                        <View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 40 }}>
                                <Icon name="shield" size={28} color={colors.text} style={{ marginRight: 12 }} />
                                <Text style={[styles.heading2, { marginBottom: 0 }]}>ZTNA</Text>
                            </View>

                            <View style={{ gap: 8 }}>
                                {['Attendance', 'Documents', 'Schedule', 'Settings']
                                    .filter(route => allowDownload || route !== 'Schedule')
                                    .map(route => {
                                    const isActive = currentRoute === route;
                                    let iconName = 'check';
                                    if (route === 'Attendance') iconName = 'clock';
                                    else if (route === 'Documents') iconName = 'file-text';
                                    else if (route === 'Schedule') iconName = 'calendar';
                                    else if (route === 'Settings') iconName = 'settings';

                                    return (
                                        <Pressable 
                                            key={route} 
                                            onPress={() => navigateTo(route)}
                                            style={({ hovered }) => [
                                                { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12 },
                                                isActive ? { backgroundColor: colors.borderSoft } : (hovered ? { backgroundColor: colors.background } : {})
                                            ]}
                                        >
                                            <Icon name={iconName} size={20} color={isActive ? colors.text : colors.subText} style={{ marginRight: 12 }} />
                                            <Text style={[styles.infoText, { marginBottom: 0 }, isActive ? { color: colors.text, fontWeight: '600' } : { color: colors.subText }]}>{route}</Text>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        </View>
                        
                        <View>
                            <View style={{ padding: 16, backgroundColor: colors.background, borderRadius: 12, marginBottom: 16 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                                        <Text style={{ color: colors.onPrimary, fontWeight: 'bold' }}>{props.email ? props.email[0].toUpperCase() : '?'}</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.infoText, { marginBottom: 0, fontWeight: '600', fontSize: 18 }]} numberOfLines={1}>{props.email}</Text>
                                    </View>
                                </View>
                            </View>

                            <Pressable 
                                onPress={() => props.handleLogout()}
                                style={({ hovered }) => [
                                    { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12 },
                                    hovered ? { backgroundColor: colors.background } : {}
                                ]}
                            >
                                <Icon name="x" size={20} color={colors.danger} style={{ marginRight: 12 }} />
                                <Text style={[styles.infoText, { marginBottom: 0, color: colors.danger, fontWeight: '600' }]}>Logout</Text>
                            </Pressable>
                        </View>
                    </View>
                )}

                <View style={{ flex: 1, backgroundColor: colors.background }}>
                    <NavigationIndependentTree>
                        {!allowDownload && (
                            <View style={{ backgroundColor: '#FFEDD5', padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                                <Icon name="alert-triangle" size={16} color="#C2410C" style={{ marginRight: 8 }} />
                                <Text style={{ color: '#C2410C', fontWeight: 'bold', fontSize: 17 }}>
                                    BYOD / 외부 접속 모드: 기밀 문서 다운로드가 제한됩니다.
                                </Text>
                            </View>
                        )}
                        <NavigationContainer 
                            ref={navigationRef}
                            onStateChange={(state) => {
                                if (state) {
                                    const current = state.routes[state.index].name;
                                    setCurrentRoute(current);
                                }
                            }}
                            theme={{
                        dark: isDark,
                        colors: {
                            primary: colors.primary,
                            background: colors.background,
                            card: colors.cardBackground,
                            text: colors.text,
                            border: colors.borderSoft,
                            notification: colors.danger,
                        },
                        fonts: {} as any,
                    }}>
                        <Tab.Navigator
                            screenOptions={({ route }) => ({
                                headerShown: false,
                                tabBarStyle: {
                                    display: isDesktop ? 'none' : 'flex',
                                    backgroundColor: colors.background,
                                    borderTopColor: colors.borderSoft,
                                    height: 64,
                                    paddingBottom: 12,
                                    paddingTop: 8,
                                },
                                tabBarActiveTintColor: colors.text,
                                tabBarInactiveTintColor: colors.subText,
                                sceneStyle: { backgroundColor: colors.background },
                                tabBarIcon: ({ color, size }) => {
                                    let iconName;
                                    if (route.name === 'Attendance') iconName = 'clock';
                                    else if (route.name === 'Documents') iconName = 'file-text';
                                    else if (route.name === 'Schedule') iconName = 'calendar';
                                    else if (route.name === 'Settings') iconName = 'settings';
                                    
                                    return <Icon name={iconName as string} size={size} color={color} />;
                                },
                            })}
                        >
                            <Tab.Screen name="Attendance">
                                {() => <AttendanceTab {...props} {...intranet} styles={styles} colors={colors} />}
                            </Tab.Screen>
                            <Tab.Screen name="Documents">
                                {() => <DocumentsTab {...props} {...intranet} allowDownload={allowDownload} styles={styles} colors={colors} />}
                            </Tab.Screen>
                            {allowDownload && (
                                <Tab.Screen name="Schedule">
                                    {() => <ScheduleTab {...props} {...intranet} styles={styles} colors={colors} />}
                                </Tab.Screen>
                            )}
                            <Tab.Screen name="Settings">
                                {() => <SettingsTab {...props} styles={styles} colors={colors} />}
                            </Tab.Screen>
                        </Tab.Navigator>
                    </NavigationContainer>
                </NavigationIndependentTree>
                </View>
            </Animated.View>
        </SafeAreaView>
    );
};