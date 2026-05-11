//세션 유지

import { useEffect } from 'react';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';
import { POLICY_SERVER_URL } from '../constants/config';
import { checkDeviceSecurity } from '../utils/deviceSecurity';

export const useHeartbeat = (isLoggedIn: boolean, deviceId: string, handleLogout: () => void) => {
    useEffect(() => {
        let heartbeatInterval: ReturnType<typeof setInterval>;

        if (isLoggedIn) {
            heartbeatInterval = setInterval(async () => {
                const security = await checkDeviceSecurity();
                if (!security.isSafe) {
                    Alert.alert('🚨 보안 위협 감지', '루팅이 감지되어 연결을 종료합니다.');
                    handleLogout();
                    return;
                }

                try {
                    const token = await SecureStore.getItemAsync('jwt_token');
                    if (!token) return;

                    const response = await axios.post(`${POLICY_SERVER_URL}/api/verify-context`,
                        { deviceId },
                        { headers: { Authorization: `Bearer ${token}` } }
                    );

                    if (response.data.token) {
                        await SecureStore.setItemAsync('jwt_token', response.data.token);
                    }
                    if (response.data.action === 'TERMINATE') {
                        Alert.alert('🛡️ 보안 경고', response.data.message);
                        handleLogout();
                    }
                } catch (error: any) {
                    if (error.response?.data?.action === 'TERMINATE') {
                        Alert.alert('🛡️ 보안 경고', error.response.data.message);
                        handleLogout();
                    }
                }
            }, 60000);
        }

        return () => { if (heartbeatInterval) clearInterval(heartbeatInterval); };
    }, [isLoggedIn, deviceId]);
};
