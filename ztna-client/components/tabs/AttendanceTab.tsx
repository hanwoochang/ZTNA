import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, TextInput, RefreshControl, Platform, useWindowDimensions, Pressable } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Icon } from '../ui/Icon';

export const AttendanceTab = ({ isLoading, attendanceData, fetchTodayAttendance, handleAttendance, employees, fetchEmployees, styles, colors }: any) => {
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
                                <Text style={{ fontSize: Platform.OS === 'web' ? 18 : 14, fontWeight: '600', color: colors.text }}>
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
                                                <Text style={{ fontSize: Platform.OS === 'web' ? 18 : 14, fontWeight: '600', color: colors.text, marginBottom: 2 }}>{emp.name || '이름 미상'} <Text style={{fontSize: Platform.OS === 'web' ? 16 : 12, fontWeight: 'normal', color: '#888'}}>({emp.role})</Text></Text>
                                                <Text style={{ fontSize: Platform.OS === 'web' ? 16 : 12, color: colors.subText }}>{emp.department || '미배정'} / {emp.position || '사원'} · {emp.email}</Text>
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
                                <Text style={[styles.heading3, { marginBottom: 4 }]}>{emp.name || '이름 미상'} <Text style={{fontSize: Platform.OS === 'web' ? 16 : 12, fontWeight: 'normal', color: '#888'}}>({emp.role})</Text></Text>
                                <Text style={[styles.noticeMeta, { marginBottom: 2 }]}>부서/직급: {emp.department || '미배정'} / {emp.position || '사원'}</Text>
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

