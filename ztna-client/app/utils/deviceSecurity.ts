//루팅 감지

import * as Device from 'expo-device';
import { Platform } from 'react-native';

export const checkDeviceSecurity = async (): Promise<{ isSafe: boolean; reason: string }> => {
    const isRooted = await Device.isRootedExperimentalAsync();
    if (isRooted) {
        return { isSafe: false, reason: Platform.OS === 'ios' ? '탈옥된 기기' : '루팅된 기기' };
    }
    if (!Device.isDevice) {
        return { isSafe: false, reason: '실제 기기가 아닙니다 (에뮬레이터)' };
    }
    return { isSafe: true, reason: '' };
};