//루팅 감지

import * as Device from 'expo-device';
import { Platform } from 'react-native';

export const checkDeviceSecurity = async (): Promise<{ isSafe: boolean; reason: string }> => {
    // [테스트 임시 허용] 모든 기기/에뮬레이터 완벽 차단 해제
    return { isSafe: true, reason: '' };
};