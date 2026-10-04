import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Animated, ScrollView, Modal, TextInput, RefreshControl, Platform, useWindowDimensions, Pressable } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Swipeable } from 'react-native-gesture-handler';
import { Calendar } from 'react-native-calendars';
import { SkeletonLoader } from '../SkeletonLoader';
import { useTheme } from '../../hooks/useTheme';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Icon } from '../ui/Icon';

export const ScheduleTab = ({ email, events, fetchEvents, createEvent, deleteEvent, styles, colors }: any) => {
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


