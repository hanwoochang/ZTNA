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

export const SettingsTab = ({ email, deviceId, ipAddress, handleLogout, styles, colors }: any) => {
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

