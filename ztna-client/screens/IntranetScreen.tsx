import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Animated, ScrollView, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Swipeable } from 'react-native-gesture-handler';
import { Calendar } from 'react-native-calendars';
import { Image } from 'expo-image';
import { useAppStyles } from '../styles/styles';
import { useIntranet } from '../hooks/useIntranet';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { useTheme } from '../hooks/useTheme';

const Tab = createBottomTabNavigator();

const Icon = ({ name, size = 20, color, style }: { name: string, size?: number, color?: string, style?: any }) => {
    let source;
    switch(name) {
        case 'clock': source = require('../assets/img/clock.svg'); break;
        case 'check-circle': source = require('../assets/img/check-circle.svg'); break;
        case 'file-text': source = require('../assets/img/file-text.svg'); break;
        case 'download': source = require('../assets/img/download.svg'); break;
        case 'plus': source = require('../assets/img/plus.svg'); break;
        case 'user': source = require('../assets/img/user.svg'); break;
        case 'settings': source = require('../assets/img/settings.svg'); break;
        case 'sun': source = require('../assets/img/sun.svg'); break;
        case 'moon': source = require('../assets/img/moon.svg'); break;
        case 'monitor': source = require('../assets/img/monitor.svg'); break;
        case 'shield': source = require('../assets/img/shield.svg'); break;
        case 'x': source = require('../assets/img/x.svg'); break;
        case 'trash-2': source = require('../assets/img/trash-2.svg'); break;
        case 'edit-2': source = require('../assets/img/edit-2.svg'); break;
        case 'calendar': source = require('../assets/img/calendar.svg'); break;
        default: source = require('../assets/img/check.svg'); break;
    }
    return <Image source={source} style={[{ width: size, height: size, tintColor: color }, style]} />;
};

type Props = {
    email: string;
    deviceId: string;
    ipAddress: string;
    secretData: string;
    handleLogout: () => void;
};

// 1. 근태 관리 탭
const AttendanceTab = ({ isLoading, attendanceData, fetchTodayAttendance, handleAttendance, styles, colors }: any) => {
    useEffect(() => {
        fetchTodayAttendance();
    }, []);

    const formatTime = (isoString: string | null) => {
        if (!isoString) return '미기록';
        const date = new Date(isoString);
        return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    return (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 24, flexGrow: 1, justifyContent: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 32, justifyContent: 'center' }}>
                <Icon name="clock" size={28} color={colors.text} style={{ marginRight: 12 }} />
                <Text style={[styles.title, { marginBottom: 0 }]}>Attendance</Text>
            </View>
            
            <View style={[styles.cardFeatured, { alignItems: 'center', paddingVertical: 48 }]}>
                <Text style={styles.heading3}>Today's Record</Text>
                <Text style={styles.infoText}>In: {formatTime(attendanceData.check_in_time)}</Text>
                <Text style={styles.infoText}>Out: {formatTime(attendanceData.check_out_time)}</Text>
            </View>

            <TouchableOpacity style={[styles.button, { flexDirection: 'row', justifyContent: 'center' }]} onPress={() => handleAttendance('check-in')} disabled={isLoading}>
                <Icon name="check-circle" size={20} color={colors.onPrimary} style={{ marginRight: 8 }} />
                <Text style={styles.buttonText}>Check In (ID Card)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.buttonOutline, { flexDirection: 'row', justifyContent: 'center' }]} onPress={() => handleAttendance('check-out')} disabled={isLoading}>
                <Icon name="clock" size={20} color={colors.text} style={{ marginRight: 8 }} />
                <Text style={styles.buttonOutlineText}>Check Out</Text>
            </TouchableOpacity>
        </ScrollView>
    );
};

// 2. 기밀 문서 및 게시판 탭
const DocumentsTab = ({ email, secretData, isLoading, downloadSecretPdf, notices, fetchNotices, createNotice, deleteNotice, updateNotice, styles, colors }: any) => {
    useEffect(() => {
        fetchNotices();
    }, []);

    const [modalVisible, setModalVisible] = useState(false);
    const [detailVisible, setDetailVisible] = useState(false);
    const [selectedNotice, setSelectedNotice] = useState<any>(null);
    const [newTitle, setNewTitle] = useState('');
    const [newContent, setNewContent] = useState('');

    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState('');
    const [editContent, setEditContent] = useState('');

    const currentUserHandle = email?.split('@')[0] || '';

    const handleCreate = async () => {
        const success = await createNotice(newTitle, newContent);
        if (success) {
            setModalVisible(false);
            setNewTitle('');
            setNewContent('');
        }
    };

    const handleUpdate = async () => {
        if (!selectedNotice) return;
        const success = await updateNotice(selectedNotice.id, editTitle, editContent);
        if (success) {
            setSelectedNotice({ ...selectedNotice, title: editTitle, content: editContent, date: new Date().toISOString().split('T')[0] + ' (수정됨)' });
            setIsEditing(false);
        }
    };

    const renderRightActions = (id: number) => {
        return (
            <TouchableOpacity 
                style={{ backgroundColor: colors.danger, justifyContent: 'center', alignItems: 'center', width: 80, height: '100%', borderRadius: 24, marginLeft: 12 }} 
                onPress={() => deleteNotice(id)}
            >
                <Icon name="trash-2" size={24} color={colors.onPrimary} />
            </TouchableOpacity>
        );
    };

    return (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 32 }}>
                <Icon name="shield" size={28} color={colors.text} style={{ marginRight: 12 }} />
                <Text style={[styles.title, { textAlign: 'left', marginBottom: 0 }]}>Intelligence</Text>
            </View>
            
            <View style={styles.cardFeatured}>
                <Text style={styles.heading3}>Top Secret</Text>
                {isLoading ? (
                    <View style={{ marginTop: 12 }}>
                        <SkeletonLoader height={24} width="100%" style={{ marginBottom: 12 }} />
                        <SkeletonLoader height={24} width="70%" />
                    </View>
                ) : (
                    <Text style={[styles.infoText, { fontWeight: '700', fontSize: 20 }]}>"{secretData}"</Text>
                )}
                <TouchableOpacity style={[styles.buttonOutline, { marginTop: 24, marginBottom: 0, flexDirection: 'row', justifyContent: 'center' }]} onPress={downloadSecretPdf} disabled={isLoading}>
                    <Icon name="download" size={20} color={colors.text} style={{ marginRight: 8 }} />
                    <Text style={styles.buttonOutlineText}>Download PDF</Text>
                </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 32, marginBottom: 16 }}>
                <Text style={[styles.heading3, { marginBottom: 0 }]}>Notice Board</Text>
                <TouchableOpacity onPress={() => setModalVisible(true)} style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Icon name="plus" size={18} color={colors.accent} style={{ marginRight: 4 }} />
                    <Text style={[styles.buttonOutlineText, { color: colors.accent }]}>New</Text>
                </TouchableOpacity>
            </View>

            {notices.map((notice: any) => (
                <View key={notice.id} style={{ marginBottom: 12 }}>
                    <Swipeable renderRightActions={() => renderRightActions(notice.id)}>
                        <TouchableOpacity style={[styles.card, { flexDirection: 'row', alignItems: 'center', marginBottom: 0 }]} onPress={() => { 
                            setSelectedNotice(notice); 
                            setEditTitle(notice.title);
                            setEditContent(notice.content);
                            setIsEditing(false);
                            setDetailVisible(true); 
                        }}>
                            <Icon name="file-text" size={24} color={colors.subText} style={{ marginRight: 16 }} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.noticeTitle}>{notice.title}</Text>
                                <Text style={styles.noticeMeta}>{notice.author} • {notice.date}</Text>
                            </View>
                        </TouchableOpacity>
                    </Swipeable>
                </View>
            ))}

            {/* 새 글 작성 모달 */}
            <Modal visible={modalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.heading2}>New Notice</Text>
                        <TextInput style={styles.input} placeholder="Title" placeholderTextColor={colors.subText} value={newTitle} onChangeText={setNewTitle} />
                        <TextInput style={[styles.input, { height: 120, textAlignVertical: 'top' }]} placeholder="Content" placeholderTextColor={colors.subText} multiline value={newContent} onChangeText={setNewContent} />
                        <TouchableOpacity style={[styles.button, { flexDirection: 'row', justifyContent: 'center' }]} onPress={handleCreate}>
                            <Icon name="check-circle" size={20} color={colors.onPrimary} style={{ marginRight: 8 }} />
                            <Text style={styles.buttonText}>Post</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.buttonOutline, { flexDirection: 'row', justifyContent: 'center' }]} onPress={() => setModalVisible(false)}>
                            <Icon name="x" size={20} color={colors.text} style={{ marginRight: 8 }} />
                            <Text style={styles.buttonOutlineText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* 상세 보기 / 수정 모달 */}
            <Modal visible={detailVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        {!isEditing ? (
                            <>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.heading2}>{selectedNotice?.title}</Text>
                                    </View>
                                    {(selectedNotice?.author === currentUserHandle || selectedNotice?.author === '보안팀' || selectedNotice?.author === '인사팀') && (
                                        <TouchableOpacity onPress={() => setIsEditing(true)} style={{ padding: 4, marginLeft: 8 }}>
                                            <Icon name="edit-2" size={20} color={colors.accent} />
                                        </TouchableOpacity>
                                    )}
                                </View>
                                <Text style={[styles.noticeMeta, { marginBottom: 24 }]}>{selectedNotice?.author} • {selectedNotice?.date}</Text>
                                <Text style={styles.infoText}>{selectedNotice?.content}</Text>
                                <View style={{ marginTop: 32 }}>
                                    <TouchableOpacity style={[styles.buttonOutline, { flexDirection: 'row', justifyContent: 'center' }]} onPress={() => setDetailVisible(false)}>
                                        <Icon name="x" size={20} color={colors.text} style={{ marginRight: 8 }} />
                                        <Text style={styles.buttonOutlineText}>Close</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        ) : (
                            <>
                                <Text style={styles.heading2}>Edit Notice</Text>
                                <TextInput style={styles.input} placeholder="Title" placeholderTextColor={colors.subText} value={editTitle} onChangeText={setEditTitle} />
                                <TextInput style={[styles.input, { height: 120, textAlignVertical: 'top' }]} placeholder="Content" placeholderTextColor={colors.subText} multiline value={editContent} onChangeText={setEditContent} />
                                <TouchableOpacity style={[styles.button, { flexDirection: 'row', justifyContent: 'center' }]} onPress={handleUpdate}>
                                    <Icon name="check-circle" size={20} color={colors.onPrimary} style={{ marginRight: 8 }} />
                                    <Text style={styles.buttonText}>Save Changes</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.buttonOutline, { flexDirection: 'row', justifyContent: 'center' }]} onPress={() => setIsEditing(false)}>
                                    <Icon name="x" size={20} color={colors.text} style={{ marginRight: 8 }} />
                                    <Text style={styles.buttonOutlineText}>Cancel</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
};

// 4. 일정 탭
const ScheduleTab = ({ styles, colors }: any) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const [events, setEvents] = useState<any>({
        '2026-09-14': [{ id: '1', title: '임원진 세미나' }],
        '2026-09-15': [{ id: '2', title: '보안 점검회의' }],
        '2026-09-20': [{ id: '3', title: '서버 정기 유지보수' }]
    });
    const [selectedDate, setSelectedDate] = useState<string>(todayStr);
    const [newEventTitle, setNewEventTitle] = useState('');

    const markedDates = Object.keys(events).reduce((acc: any, date) => {
        if (events[date] && events[date].length > 0) {
            acc[date] = { marked: true, dotColor: colors.accent };
        }
        return acc;
    }, {});
    
    if (selectedDate) {
        markedDates[selectedDate] = { ...markedDates[selectedDate], selected: true, selectedColor: colors.primary };
    }

    const handleDayPress = (day: any) => {
        setSelectedDate(day.dateString);
    };

    const addEvent = () => {
        if (!newEventTitle.trim()) return;
        const newEvent = { id: Date.now().toString(), title: newEventTitle };
        setEvents((prev: any) => ({
            ...prev,
            [selectedDate]: [...(prev[selectedDate] || []), newEvent]
        }));
        setNewEventTitle('');
    };

    const deleteEvent = (id: string) => {
        setEvents((prev: any) => ({
            ...prev,
            [selectedDate]: prev[selectedDate].filter((e: any) => e.id !== id)
        }));
    };

    return (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24, marginTop: 8 }}>
                <Icon name="calendar" size={28} color={colors.text} style={{ marginRight: 12 }} />
                <Text style={[styles.title, { textAlign: 'left', marginBottom: 0 }]}>Schedule</Text>
            </View>
            
            <View style={{ borderRadius: 24, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
                <Calendar
                    monthFormat={'yyyy년 MM월'}
                    onDayPress={handleDayPress}
                    markedDates={markedDates}
                    style={{
                        paddingBottom: 16,
                        paddingTop: 16,
                    }}
                    theme={{
                        backgroundColor: colors.cardBackground,
                        calendarBackground: colors.cardBackground,
                        textSectionTitleColor: colors.subText,
                        selectedDayBackgroundColor: colors.primary,
                        selectedDayTextColor: colors.onPrimary,
                        todayTextColor: colors.accent,
                        dayTextColor: colors.text,
                        textDisabledColor: colors.border,
                        dotColor: colors.accent,
                        selectedDotColor: colors.onPrimary,
                        arrowColor: colors.text,
                        disabledArrowColor: colors.border,
                        monthTextColor: colors.text,
                        textDayFontWeight: '500',
                        textMonthFontWeight: 'bold',
                        textDayHeaderFontWeight: '600'
                    }}
                />
            </View>

            {selectedDate && (
                <View style={[styles.card, { marginTop: 24 }]}>
                    <Text style={[styles.heading3, { marginBottom: 16 }]}>{selectedDate} 일정</Text>
                    
                    <View style={{ marginBottom: 16 }}>
                        {events[selectedDate]?.length > 0 ? (
                            events[selectedDate].map((ev: any) => (
                                <View key={ev.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.borderSoft }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent, marginRight: 12 }} />
                                        <Text style={styles.infoText}>{ev.title}</Text>
                                    </View>
                                    <TouchableOpacity onPress={() => deleteEvent(ev.id)} style={{ padding: 8 }}>
                                        <Icon name="trash-2" size={18} color={colors.danger} />
                                    </TouchableOpacity>
                                </View>
                            ))
                        ) : (
                            <Text style={[styles.infoText, { textAlign: 'center', color: colors.subText, marginVertical: 16 }]}>등록된 일정이 없습니다.</Text>
                        )}
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TextInput 
                            style={[styles.input, { flex: 1, marginBottom: 0, marginRight: 12 }]} 
                            placeholder="새로운 일정 추가..." 
                            placeholderTextColor={colors.subText}
                            value={newEventTitle} 
                            onChangeText={setNewEventTitle} 
                        />
                        <TouchableOpacity style={[styles.button, { width: 48, height: 48, paddingHorizontal: 0, justifyContent: 'center', alignItems: 'center', marginBottom: 0 }]} onPress={addEvent}>
                            <Icon name="plus" size={24} color={colors.onPrimary} />
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </ScrollView>
    );
};

// 3. 설정 탭
const SettingsTab = ({ email, deviceId, ipAddress, handleLogout, styles, colors }: any) => {
    const { themeMode, setThemeMode } = useTheme();

    return (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 32 }}>
                <Icon name="settings" size={28} color={colors.text} style={{ marginRight: 12 }} />
                <Text style={[styles.title, { textAlign: 'left', marginBottom: 0 }]}>Settings</Text>
            </View>
            
            <View style={styles.card}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Icon name="user" size={20} color={colors.text} style={{ marginRight: 8 }} />
                    <Text style={[styles.heading3, { marginBottom: 0 }]}>Identity</Text>
                </View>
                <Text style={styles.infoText}>Email: {email}</Text>
                <Text style={styles.infoText}>Device ID: {deviceId}</Text>
                <Text style={styles.infoText}>IP Address: {ipAddress}</Text>
                
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
                    <Icon name="shield" size={16} color={colors.accent} style={{ marginRight: 6 }} />
                    <Text style={[styles.statusText, { marginTop: 0 }]}>ZTNA Secure Connection</Text>
                </View>
            </View>

            <View style={styles.cardFeatured}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Icon name="monitor" size={20} color={colors.text} style={{ marginRight: 8 }} />
                    <Text style={[styles.heading3, { marginBottom: 0 }]}>Appearance</Text>
                </View>
                <TouchableOpacity onPress={() => setThemeMode('auto')} style={{ paddingVertical: 12, flexDirection: 'row', alignItems: 'center' }}>
                    <Icon name="monitor" size={18} color={themeMode === 'auto' ? colors.text : colors.subText} style={{ marginRight: 12 }} />
                    <Text style={[styles.infoText, themeMode === 'auto' && styles.highlight, { marginBottom: 0 }]}>
                        System {themeMode === 'auto' ? '✓' : ''}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setThemeMode('light')} style={{ paddingVertical: 12, flexDirection: 'row', alignItems: 'center' }}>
                    <Icon name="sun" size={18} color={themeMode === 'light' ? colors.text : colors.subText} style={{ marginRight: 12 }} />
                    <Text style={[styles.infoText, themeMode === 'light' && styles.highlight, { marginBottom: 0 }]}>
                        Light {themeMode === 'light' ? '✓' : ''}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setThemeMode('dark')} style={{ paddingVertical: 12, flexDirection: 'row', alignItems: 'center' }}>
                    <Icon name="moon" size={18} color={themeMode === 'dark' ? colors.text : colors.subText} style={{ marginRight: 12 }} />
                    <Text style={[styles.infoText, themeMode === 'dark' && styles.highlight, { marginBottom: 0 }]}>
                        Dark {themeMode === 'dark' ? '✓' : ''}
                    </Text>
                </TouchableOpacity>
            </View>

            <TouchableOpacity style={[styles.logoutButton, { marginTop: 24, flexDirection: 'row', justifyContent: 'center' }]} onPress={handleLogout}>
                <Icon name="x" size={20} color={colors.danger} style={{ marginRight: 8 }} />
                <Text style={styles.logoutButtonText}>Log out</Text>
            </TouchableOpacity>
        </ScrollView>
    );
};

import { NavigationContainer, NavigationIndependentTree } from '@react-navigation/native';

export const IntranetScreen = (props: Props) => {
    const { styles, colors } = useAppStyles();
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
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <Animated.View style={[{ flex: 1, opacity: fadeAnim }]}>
                <NavigationIndependentTree>
                    <NavigationContainer theme={{
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
                                    let iconSource;
                                    if (route.name === 'Attendance') iconSource = require('../assets/img/clock.svg');
                                    else if (route.name === 'Documents') iconSource = require('../assets/img/file-text.svg');
                                    else if (route.name === 'Schedule') iconSource = require('../assets/img/calendar.svg');
                                    else if (route.name === 'Settings') iconSource = require('../assets/img/settings.svg');
                                    
                                    return <Image source={iconSource} style={{ width: size, height: size, tintColor: color }} />;
                                },
                            })}
                        >
                            <Tab.Screen name="Attendance">
                                {() => <AttendanceTab {...props} {...intranet} styles={styles} colors={colors} />}
                            </Tab.Screen>
                            <Tab.Screen name="Documents">
                                {() => <DocumentsTab {...props} {...intranet} styles={styles} colors={colors} />}
                            </Tab.Screen>
                            <Tab.Screen name="Schedule">
                                {() => <ScheduleTab styles={styles} colors={colors} />}
                            </Tab.Screen>
                            <Tab.Screen name="Settings">
                                {() => <SettingsTab {...props} styles={styles} colors={colors} />}
                            </Tab.Screen>
                        </Tab.Navigator>
                    </NavigationContainer>
                </NavigationIndependentTree>
            </Animated.View>
        </SafeAreaView>
    );
};