import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Storage from '../utils/storage';

type Props = {
    handleLogout: () => void;
};

export const BlockedScreen = ({ handleLogout }: Props) => {
    const doLogout = async () => {
        try {
            await Storage.deleteItemAsync('jwt_token');
            await Storage.deleteItemAsync('allowDownload');
        } catch (e) {
            console.log(e);
        }
        handleLogout();
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#e53e3e', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
            
            <View style={{ marginBottom: 24, padding: 20, backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 100, width: 120, height: 120, justifyContent: 'center', alignItems: 'center' }}>
                <Feather name="shield" size={60} color="#ffffff" />
            </View>
            
            <Text style={{ fontSize: Platform.OS === 'web' ? 36 : 26, fontWeight: 'bold', marginBottom: 16, textAlign: 'center', color: '#ffffff' }}>
                기기 접근이 차단되었습니다
            </Text>
            
            <Text style={{ fontSize: Platform.OS === 'web' ? 20 : 16, textAlign: 'center', marginBottom: 40, lineHeight: 24, color: '#ffffff', opacity: 0.9 }}>
                보안 정책 위반 또는 무결성 검증 실패로 인해{'\n'}
                사내망 접근이 즉시 차단되었습니다.
            </Text>

            <TouchableOpacity 
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 12, width: '100%', maxWidth: 400, backgroundColor: '#ffffff', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 }} 
                onPress={doLogout}
                activeOpacity={0.8}
            >
                <Text style={{ fontSize: Platform.OS === 'web' ? 22 : 18, fontWeight: 'bold', color: '#e53e3e' }}>안전하게 로그아웃</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
};