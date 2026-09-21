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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer, NavigationIndependentTree, useNavigationContainerRef } from '@react-navigation/native';
import * as ScreenCapture from 'expo-screen-capture';

const Tab = createBottomTabNavigator();

import { Feather } from '@expo/vector-icons';

const Icon = ({ name, size = 20, color, style }: { name: string, size?: number, color?: string, style?: any }) => {
    return <Feather name={name as any} size={size} color={color} style={style} />;
};

type Props = {
    email: string;
    deviceId: string;
    ipAddress: string;
    secretData: string;
    handleLogout: () => void;
};

// 1. 근태 관리 탭
const AttendanceTab = ({ isLoading, attendanceData, fetchTodayAttendance, handleAttendance, employees, fetchEmployees, styles, colors }: any) => {
    const { width } = useWindowDimensions();
    const scrollViewRef = useRef<ScrollView>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [refreshing, setRefreshing] = useState(false);
    const [isDirectoryOpen, setIsDirectoryOpen] = useState(false);

    useEffect(() => {
        fetchEmployees();
        setTimeout(() => {
            scrollViewRef.current?.scrollTo({ x: width, animated: false });
        }, 0);
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchTodayAttendance();
        }, [])
    );

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchEmployees();
        setRefreshing(false);
    }, []);

    const formatTime = (isoString: string | null) => {
        if (!isoString) return '미기록';
        const date = new Date(isoString);
        return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    const handleScroll = (event: any) => {
        const x = event.nativeEvent.contentOffset.x;
        const page = Math.round(x / width);
        if (currentPage !== page) setCurrentPage(page);
    };

    const isDesktop = width > 768;

    if (isDesktop) {
        return (
            <View style={{ flex: 1, flexDirection: 'row' }}>
                {/* 메인: 출퇴근 관리 */}
                <View style={{ flex: 1 }}>
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 40, flexGrow: 1, justifyContent: 'center' }}>
                        
                        <View style={{ position: 'absolute', top: 40, right: 40, zIndex: 10 }}>
                            <Pressable 
                                onPress={() => setIsDirectoryOpen(!isDirectoryOpen)}
                                style={({ hovered }) => [
                                    { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, backgroundColor: colors.cardBackground, borderWidth: 1, borderColor: colors.borderSoft },
                                    hovered ? { backgroundColor: colors.background } : {}
                                ]}
                            >
                                <Icon name="users" size={18} color={colors.text} style={{ marginRight: 8 }} />
                                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                                    {isDirectoryOpen ? 'Close Directory' : 'Open Directory'}
                                </Text>
                            </Pressable>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 32, justifyContent: 'center' }}>
                            <Icon name="clock" size={28} color={colors.text} style={{ marginRight: 12 }} />
                            <Text style={[styles.title, { marginBottom: 0 }]}>Attendance Tracker</Text>
                        </View>
                        
                        <View style={[styles.cardFeatured, { alignItems: 'center', paddingVertical: 48, alignSelf: 'center', width: '100%', maxWidth: 400 }]}>
                            <Text style={styles.heading3}>Today's Record</Text>
                            <Text style={styles.infoText}>In: {formatTime(attendanceData.check_in_time)}</Text>
                            <Text style={styles.infoText}>Out: {formatTime(attendanceData.check_out_time)}</Text>
                        </View>

                        <View style={{ flexDirection: 'row', gap: 16, justifyContent: 'center', marginTop: 32 }}>
                            <Pressable 
                                style={({ hovered }) => [styles.button, { flex: 1, maxWidth: 200, flexDirection: 'row', justifyContent: 'center' }, hovered ? { opacity: 0.8 } : {}]} 
                                onPress={() => handleAttendance('check-in')} 
                                disabled={isLoading}
                            >
                                <Icon name="check-circle" size={20} color={colors.onPrimary} style={{ marginRight: 8 }} />
                                <Text style={styles.buttonText}>Check In</Text>
                            </Pressable>
                            <Pressable 
                                style={({ hovered }) => [styles.buttonOutline, { flex: 1, maxWidth: 200, flexDirection: 'row', justifyContent: 'center' }, hovered ? { backgroundColor: colors.borderSoft } : {}]} 
                                onPress={() => handleAttendance('check-out')} 
                                disabled={isLoading}
                            >
                                <Icon name="clock" size={20} color={colors.text} style={{ marginRight: 8 }} />
                                <Text style={styles.buttonOutlineText}>Check Out</Text>
                            </Pressable>
                        </View>
                    </ScrollView>
                </View>

                {/* 우측 패널: 직원 리스트 */}
                {isDirectoryOpen && (
                    <View style={{ width: 480, borderLeftWidth: 1, borderLeftColor: colors.borderSoft, backgroundColor: colors.background }}>
                        <ScrollView 
                            showsVerticalScrollIndicator={true} 
                            contentContainerStyle={{ padding: 32 }}
                            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 32 }}>
                                <Icon name="users" size={24} color={colors.text} style={{ marginRight: 12 }} />
                                <Text style={[styles.heading2, { marginBottom: 0 }]}>Employee Directory</Text>
                            </View>
                            <View style={{ flexDirection: 'column', gap: 12 }}>
                                {employees?.map((emp: any) => (
                                    <View key={emp.id} style={{ backgroundColor: colors.cardBackground, padding: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: colors.borderSoft, ...Platform.select({ web: { boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.05)' } as any }) }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.field, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                                                <Icon name="user" size={18} color={colors.subText} />
                                            </View>
                                            <View>
                                                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 2 }}>{emp.name || '이름 미상'} <Text style={{fontSize: 12, fontWeight: 'normal', color: '#888'}}>({emp.role})</Text></Text>
                                                <Text style={{ fontSize: 12, color: colors.subText }}>{emp.department || '미배정'} · {emp.email}</Text>
                                            </View>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </ScrollView>
                    </View>
                )}
            </View>
        );
    }

    return (
        <View style={{ flex: 1 }}>
            {/* Pagination Dots */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', position: 'absolute', bottom: 24, left: 0, right: 0, zIndex: 10 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: currentPage === 0 ? colors.text : colors.borderSoft, marginHorizontal: 4 }} />
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: currentPage === 1 ? colors.text : colors.borderSoft, marginHorizontal: 4 }} />
            </View>

            <ScrollView 
                ref={scrollViewRef} 
                horizontal 
                pagingEnabled 
                showsHorizontalScrollIndicator={false} 
                bounces={false}
                onMomentumScrollEnd={handleScroll}
                scrollEventThrottle={16}
                style={{ flex: 1 }}
                contentContainerStyle={{ flexGrow: 1 }}
            >
                {/* Page 0: Employee Directory (왼쪽 영역) */}
                <View style={{ width, flex: 1 }}>
                    <ScrollView 
                        showsVerticalScrollIndicator={true} 
                        contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 32, justifyContent: 'center' }}>
                            <Icon name="user" size={28} color={colors.text} style={{ marginRight: 12 }} />
                            <Text style={[styles.title, { marginBottom: 0 }]}>Directory</Text>
                        </View>
                        {employees?.map((emp: any) => (
                            <View key={emp.id} style={[styles.card, { marginBottom: 12 }]}>
                                <Text style={[styles.heading3, { marginBottom: 4 }]}>{emp.name || '이름 미상'} <Text style={{fontSize: 12, fontWeight: 'normal', color: '#888'}}>({emp.role})</Text></Text>
                                <Text style={[styles.noticeMeta, { marginBottom: 2 }]}>부서: {emp.department || '미배정'}</Text>
                                <Text style={styles.infoText}>이메일: {emp.email}</Text>
                            </View>
                        ))}
                    </ScrollView>
                </View>

                {/* Page 1: Attendance (기본 화면) */}
                <View style={{ width, flex: 1 }}>
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 24, paddingBottom: 100, flexGrow: 1, justifyContent: 'center' }}>
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
                </View>
            </ScrollView>
        </View>
    );
};

// 2. 기밀 문서 및 게시판 탭
const DocumentsTab = ({ email, secretData, isLoading, downloadSecretPdf, notices, fetchNotices, createNotice, deleteNotice, updateNotice, styles, colors }: any) => {
    useFocusEffect(
        useCallback(() => {
            fetchNotices();
        }, [])
    );

    const [modalVisible, setModalVisible] = useState(false);
    const [detailVisible, setDetailVisible] = useState(false);
    const [selectedNotice, setSelectedNotice] = useState<any>(null);
    const [newTitle, setNewTitle] = useState('');
    const [newContent, setNewContent] = useState('');

    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState('');
    const [editContent, setEditContent] = useState('');

    const currentUserHandle = email?.split('@')[0] || '';
    const { width } = useWindowDimensions();
    const isDesktop = width > 768;

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
            setSelectedNotice({ ...selectedNotice, title: editTitle, content: editContent, date: new Date().toISOString().split('T')[0], is_edited: 1 });
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
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 24, paddingBottom: 100, maxWidth: 800, width: '100%', alignSelf: 'center' }}>
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

            {notices.map((notice: any) => {
                const isAuthor = notice.author === currentUserHandle || currentUserHandle === '보안팀' || currentUserHandle === '인사팀';
                const CardContent = (
                    <TouchableOpacity style={[styles.card, { flexDirection: 'row', alignItems: 'center', marginBottom: 0 }]} onPress={() => { 
                        setSelectedNotice(notice); 
                        setEditTitle(notice.title);
                        setEditContent(notice.content);
                        setIsEditing(false);
                        setDetailVisible(true); 
                    }}>
                        <Icon name="file-text" size={24} color={colors.subText} style={{ marginRight: 16 }} />
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.infoText, { fontWeight: '700', marginBottom: 4 }]} numberOfLines={1}>{notice.title}</Text>
                            <Text style={[styles.infoText, { color: colors.subText, fontSize: 13, marginBottom: 0 }]} numberOfLines={1}>
                                {notice.author} • {notice.date}{notice.is_edited ? ' (수정됨)' : ''}
                            </Text>
                        </View>
                        {isDesktop && isAuthor && (
                            <TouchableOpacity 
                                style={{ padding: 12, backgroundColor: colors.danger + '20', borderRadius: 12, marginLeft: 12 }} 
                                onPress={(e) => { e.stopPropagation(); deleteNotice(notice.id); }}
                            >
                                <Icon name="trash-2" size={18} color={colors.danger} />
                            </TouchableOpacity>
                        )}
                    </TouchableOpacity>
                );
                return (
                    <View key={notice.id} style={{ marginBottom: 12 }}>
                        {!isDesktop && isAuthor ? (
                            <Swipeable renderRightActions={() => renderRightActions(notice.id)}>
                                {CardContent}
                            </Swipeable>
                        ) : (
                            CardContent
                        )}
                    </View>
                );
            })}

            {/* 새 글 작성 모달 */}
            <Modal visible={modalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, isDesktop && { maxWidth: 600, width: '100%', alignSelf: 'center' }]}>
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
                    <View style={[styles.modalContent, isDesktop && { maxWidth: 600, width: '100%', alignSelf: 'center' }]}>
                        {!isEditing ? (
                            <>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.heading2}>{selectedNotice?.title}</Text>
                                    </View>
                                    {(selectedNotice?.author === currentUserHandle || currentUserHandle === '보안팀' || currentUserHandle === '인사팀') && (
                                        <TouchableOpacity onPress={() => setIsEditing(true)} style={{ padding: 4, marginLeft: 8 }}>
                                            <Icon name="edit-2" size={20} color={colors.accent} />
                                        </TouchableOpacity>
                                    )}
                                </View>
                                <Text style={[styles.noticeMeta, { marginBottom: 24 }]}>{selectedNotice?.author} • {selectedNotice?.date}{selectedNotice?.is_edited ? ' (수정됨)' : ''}</Text>
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
const ScheduleTab = ({ email, events, fetchEvents, createEvent, deleteEvent, styles, colors }: any) => {
    useFocusEffect(
        useCallback(() => {
            fetchEvents();
        }, [])
    );

    const todayStr = new Date().toISOString().split('T')[0];
    const [selectedDate, setSelectedDate] = useState<string>(todayStr);
    const [newEventTitle, setNewEventTitle] = useState('');

    const groupedEvents = (events || []).reduce((acc: any, ev: any) => {
        if (!acc[ev.date]) acc[ev.date] = [];
        acc[ev.date].push(ev);
        return acc;
    }, {});

    const markedDates = Object.keys(groupedEvents).reduce((acc: any, date) => {
        if (groupedEvents[date].length > 0) {
            acc[date] = { marked: true, dotColor: colors.accent };
        }
        return acc;
    }, {});
    
    if (selectedDate) {
        markedDates[selectedDate] = { 
            ...markedDates[selectedDate], 
            selected: true, 
            selectedColor: '#141414', // 고정 검은색 배경
            selectedTextColor: '#ffffff' // 고정 흰색 글자
        };
    }

    const handleDayPress = (day: any) => {
        setSelectedDate(day.dateString);
    };

    const handleAddEvent = async () => {
        if (!newEventTitle.trim()) return;
        const success = await createEvent(newEventTitle, selectedDate);
        if (success) setNewEventTitle('');
    };

    return (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 24, paddingBottom: 100, maxWidth: 800, width: '100%', alignSelf: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24, marginTop: 8 }}>
                <Icon name="calendar" size={28} color={colors.text} style={{ marginRight: 12 }} />
                <Text style={[styles.title, { textAlign: 'left', marginBottom: 0 }]}>Schedule</Text>
            </View>
            
            <View style={{ backgroundColor: colors.cardBackground, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: colors.borderSoft, ...Platform.select({ web: { boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' } as any }) }}>
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
                        selectedDayBackgroundColor: '#141414',
                        selectedDayTextColor: '#ffffff',
                        todayTextColor: colors.accent,
                        dayTextColor: colors.text,
                        textDisabledColor: colors.border,
                        dotColor: colors.accent,
                        selectedDotColor: '#ffffff',
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
                        {groupedEvents[selectedDate]?.length > 0 ? (
                            groupedEvents[selectedDate].map((ev: any) => {
                                const currentUserHandle = email?.split('@')[0] || '익명';
                                const isAuthor = ev.author === currentUserHandle || currentUserHandle === '관리자';
                                return (
                                    <View key={ev.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.borderSoft }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent, marginRight: 12 }} />
                                            <Text style={styles.infoText}>{ev.title}</Text>
                                        </View>
                                        {isAuthor && (
                                            <TouchableOpacity onPress={() => deleteEvent(ev.id)} style={{ padding: 8 }}>
                                                <Icon name="trash-2" size={18} color={colors.danger} />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                );
                            })
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
                        <TouchableOpacity style={[styles.button, { width: 48, height: 48, paddingHorizontal: 0, justifyContent: 'center', alignItems: 'center', marginBottom: 0 }]} onPress={handleAddEvent}>
                            <Icon name="plus" size={24} color={colors.onPrimary} />
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </ScrollView>
    );
};


// 5. 설정 탭
const SettingsTab = ({ email, deviceId, ipAddress, handleLogout, styles, colors }: any) => {
    const { themeMode, setThemeMode } = useTheme();
    const [authMethod, setAuthMethod] = useState<'otp' | 'bio'>('otp');

    useEffect(() => {
        const loadAuth = async () => {
            if (Platform.OS === 'web') {
                setAuthMethod('otp');
                return;
            }
            const saved = await AsyncStorage.getItem('authMethod');
            if (saved === 'bio') setAuthMethod('bio');
        };
        loadAuth();
    }, []);

    const changeAuth = async (method: 'otp' | 'bio') => {
        setAuthMethod(method);
        await AsyncStorage.setItem('authMethod', method);
    };

    return (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 24, paddingBottom: 100, maxWidth: 800, width: '100%', alignSelf: 'center' }}>
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

            <View style={[styles.cardFeatured, { marginTop: 24 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Icon name="lock" size={20} color={colors.text} style={{ marginRight: 8 }} />
                    <Text style={[styles.heading3, { marginBottom: 0 }]}>Authentication</Text>
                </View>
                <TouchableOpacity onPress={() => changeAuth('otp')} style={{ paddingVertical: 12, flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: authMethod === 'otp' ? colors.accent : colors.borderSoft, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                        {authMethod === 'otp' && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent }} />}
                    </View>
                    <Text style={[styles.infoText, authMethod === 'otp' && styles.highlight, { marginBottom: 0 }]}>
                        Email OTP
                    </Text>
                </TouchableOpacity>
                {Platform.OS !== 'web' && (
                    <TouchableOpacity onPress={() => changeAuth('bio')} style={{ paddingVertical: 12, flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: authMethod === 'bio' ? colors.accent : colors.borderSoft, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                            {authMethod === 'bio' && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent }} />}
                        </View>
                        <Text style={[styles.infoText, authMethod === 'bio' && styles.highlight, { marginBottom: 0 }]}>
                            FaceID/Fingerprint
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            <View style={[styles.cardFeatured, { marginTop: 24 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Icon name="monitor" size={20} color={colors.text} style={{ marginRight: 8 }} />
                    <Text style={[styles.heading3, { marginBottom: 0 }]}>Appearance</Text>
                </View>
                <TouchableOpacity onPress={() => setThemeMode('auto')} style={{ paddingVertical: 12, flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: themeMode === 'auto' ? colors.accent : colors.borderSoft, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                        {themeMode === 'auto' && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent }} />}
                    </View>
                    <Text style={[styles.infoText, themeMode === 'auto' && styles.highlight, { marginBottom: 0 }]}>
                        System
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setThemeMode('light')} style={{ paddingVertical: 12, flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: themeMode === 'light' ? colors.accent : colors.borderSoft, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                        {themeMode === 'light' && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent }} />}
                    </View>
                    <Text style={[styles.infoText, themeMode === 'light' && styles.highlight, { marginBottom: 0 }]}>
                        Light
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setThemeMode('dark')} style={{ paddingVertical: 12, flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: themeMode === 'dark' ? colors.accent : colors.borderSoft, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                        {themeMode === 'dark' && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent }} />}
                    </View>
                    <Text style={[styles.infoText, themeMode === 'dark' && styles.highlight, { marginBottom: 0 }]}>
                        Dark
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

export const IntranetScreen = (props: Props) => {
    const { styles, colors } = useAppStyles();
    const intranet = useIntranet();
    const { isDark } = useTheme();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    
    // Responsive dashboard
    const { width } = useWindowDimensions();
    const isDesktop = width > 768;
    const navigationRef = useNavigationContainerRef();
    const [currentRoute, setCurrentRoute] = useState('Attendance');

    // 사내망(기밀) 진입 시 화면 캡처 원천 차단 (iOS/Android 지원)
    useEffect(() => {
        if (Platform.OS !== 'web') {
            ScreenCapture.preventScreenCaptureAsync();
            return () => {
                ScreenCapture.allowScreenCaptureAsync();
            };
        }
    }, []);

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
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
                                {['Attendance', 'Documents', 'Schedule', 'Settings'].map(route => {
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
                                        <Text style={[styles.infoText, { marginBottom: 0, fontWeight: '600', fontSize: 14 }]} numberOfLines={1}>{props.email}</Text>
                                    </View>
                                </View>
                            </View>

                            <Pressable 
                                onPress={props.handleLogout}
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
                                {() => <DocumentsTab {...props} {...intranet} styles={styles} colors={colors} />}
                            </Tab.Screen>
                            <Tab.Screen name="Schedule">
                                {() => <ScheduleTab {...props} {...intranet} styles={styles} colors={colors} />}
                            </Tab.Screen>
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