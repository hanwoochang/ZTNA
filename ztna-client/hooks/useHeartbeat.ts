//세션 유지

import { useEffect } from 'react';
import axios from 'axios';
import * as Storage from '../utils/storage';
import { Alert } from 'react-native';
import { POLICY_SERVER_URL } from '../constants/config';
import { checkDeviceSecurity } from '../utils/deviceSecurity';

export const useHeartbeat = (isLoggedIn: boolean, deviceId: string, handleLogout: (isRevoked?: boolean) => void) => {
    useEffect(() => {
        let heartbeatInterval: ReturnType<typeof setInterval>;

        if (isLoggedIn) {
            heartbeatInterval = setInterval(async () => {
                const security = await checkDeviceSecurity();
                if (!security.isSafe) {
                    handleLogout(true);
                    return;
                }

                try {
                    const token = await Storage.getItemAsync('jwt_token');
                    if (!token) return;

                    const response = await axios.post(`${POLICY_SERVER_URL}/api/verify-context`,
                        { deviceId },
                        { headers: { Authorization: `Bearer ${token}` } }
                    );

                    if (response.data.token) {
                        await Storage.setItemAsync('jwt_token', response.data.token);
                    }
                    if (typeof response.data.allowDownload === 'boolean') {
                        await Storage.setItemAsync('allowDownload', String(response.data.allowDownload));
                    }
                    // IP_CHANGED: 네트워크 환경 변화(Wi-Fi ↔ LTE 등) 감지 — 세션 유지
                    // 서버가 새 IP를 DB에 갱신했으므로 다음 Heartbeat는 정상 동작
                    if (response.data.status === 'IP_CHANGED') {
                        console.log('[Heartbeat] 네트워크 환경 변화 감지 (IP 갱신됨). 세션 유지.');
                    }
                    if (response.data.action === 'TERMINATE') {
                        handleLogout(true);
                    }
                } catch (error: any) {
                    if (error.response?.data?.action === 'TERMINATE') {
                        handleLogout(true);
                    }
                }
            }, 30000); // 30초마다 보안 컨텍스트 검증 (AWS 배포 환경 고려)
        }

        return () => { if (heartbeatInterval) clearInterval(heartbeatInterval); };
    }, [isLoggedIn, deviceId]);
};