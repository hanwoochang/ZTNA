//루팅 감지

import * as Device from 'expo-device';
import { Platform } from 'react-native';

export const checkDeviceSecurity = async (): Promise<{ isSafe: boolean; reason: string }> => {
    if (Platform.OS === 'web') {
        return { isSafe: true, reason: '' };
    }
    try {
        const isRooted = await Device.isRootedExperimentalAsync();
        if (isRooted) {
            return { isSafe: false, reason: Platform.OS === 'ios' ? '탈옥된 기기' : '루팅된 기기' };
        }
    } catch {
        // 루팅 감지 API 미지원 환경 예외 방어
    }
    return { isSafe: true, reason: '' };
};