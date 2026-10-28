//조립

import { useState, useEffect, useCallback } from 'react';
import { Alert, Keyboard, AppState } from 'react-native';
import * as Network from 'expo-network';
import * as Storage from '../utils/storage';

import { POLICY_SERVER_URL } from '../constants/config';
import { checkDeviceSecurity } from '../utils/deviceSecurity';
import { getDeviceId } from '../utils/deviceId';
import { getLocation } from '../utils/location';
import { useAuth } from '../hooks/useAuth';
import { useHeartbeat } from '../hooks/useHeartbeat';

import { BlockedScreen } from '../screens/BlockedScreen';
import { IntranetScreen } from '../screens/IntranetScreen';
import { OtpScreen } from '../screens/OtpScreen';
import { LoginScreen } from '../screens/LoginScreen';

export default function HomeScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [deviceId, setDeviceId] = useState('수집 중...');
    const [ipAddress, setIpAddress] = useState('수집 중...');
    const [isDeviceSafe, setIsDeviceSafe] = useState(true);
    const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);

    const {
        isLoggedIn, secretData, showOtpInput, otp, setShowOtpInput, setOtp, otpError, loginError, isLoading,
        isBlockedByGateway, setIsBlockedByGateway,
        testGatewayAccess, handleLogin, handleResendOtp, handleVerifyOtp, handleLogout
    } = useAuth();

    useHeartbeat(isLoggedIn, deviceId, handleLogout);

    // IP 주소 및 GPS 위치를 최신 상태로 새로 수집하는 함수 (포그라운드 복귀 및 로그인 직전 호출)
    const refreshNetworkAndLocation = useCallback(async () => {
        const currentLocationPromise = getLocation();
        const ipPromise = (async () => {
            try {
                let ip = '';
                try {
                    const res = await fetch(`${POLICY_SERVER_URL}/api/my-ip`, { cache: 'no-store' });
                    const data = await res.json();
                    if (data?.ip && data.ip !== '0.0.0.0') ip = data.ip;
                } catch {
                    // 정책 서버 조회 실패 시 외부 IP 조회 폴백
                }
                if (!ip || ip === '0.0.0.0') {
                    try {
                        const res = await fetch('https://api.ipify.org?format=json', { cache: 'no-store' });
                        const data = await res.json();
                        if (data?.ip) ip = data.ip;
                    } catch {
                        // 공인 IP 조회 실패 시 로컬 인터페이스 조회로 폴백
                    }
                }
                if (!ip || ip === '0.0.0.0') {
                    const localIp = await Network.getIpAddressAsync();
                    if (localIp && localIp !== '0.0.0.0') {
                        ip = localIp;
                    }
                }
                return ip || 'IP 추적 불가';
            } catch {
                return 'IP 추적 불가';
            }
        })();

        const [freshIp, freshLocation] = await Promise.all([ipPromise, currentLocationPromise]);
        setIpAddress(freshIp);
        if (freshLocation) {
            setLocation(freshLocation);
        }
        return { freshIp, freshLocation };
    }, []);

    useEffect(() => {
        async function collectContext() {
            const security = await checkDeviceSecurity();
            if (!security.isSafe) {
                setIsDeviceSafe(false);
                Alert.alert('보안 위협 감지', `${security.reason}입니다.\n보안 정책에 의해 앱 사용이 차단됩니다.`, [{ text: '확인' }]);
                return;
            }

            const id = await getDeviceId();
            setDeviceId(id);

            await refreshNetworkAndLocation();

            try {
                // ZTNA 보안 정책: 앱 구동 시 자동 로그인 금지 및 기존 토큰 초기화
                await Storage.deleteItemAsync('jwt_token');
            } catch {
                console.log('기존 토큰 삭제 실패');
            }
        }
        collectContext();
    }, [refreshNetworkAndLocation]);

    // 앱이 백그라운드에서 다시 켜질 때(active) 또는 로그아웃 상태로 돌아올 때마다 최신 IP/GPS 자동 갱신
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextAppState) => {
            if (nextAppState === 'active') {
                refreshNetworkAndLocation();
            }
        });
        return () => subscription.remove();
    }, [refreshNetworkAndLocation]);

    useEffect(() => {
        if (!isLoggedIn && deviceId !== '수집 중...') {
            refreshNetworkAndLocation();
        }
    }, [isLoggedIn, deviceId, refreshNetworkAndLocation]);

    if (!isDeviceSafe || isBlockedByGateway) return <BlockedScreen handleLogout={() => setIsBlockedByGateway(false)} />;
    if (isLoggedIn) return (
        <IntranetScreen
            email={email}
            deviceId={deviceId}
            ipAddress={ipAddress}
            secretData={secretData}
            handleLogout={handleLogout}
        />
    );
    if (showOtpInput) return (
        <OtpScreen
            otp={otp}
            setOtp={setOtp}
            otpError={otpError}
            isLoading={isLoading}
            handleVerifyOtp={() => { Keyboard.dismiss(); handleVerifyOtp(email, deviceId, location); }}
            handleResendOtp={() => handleResendOtp(email, password, deviceId, location)}
            onBack={() => { 
                setShowOtpInput(false);
                setOtp(''); }}
        />
    );
    return (
        <LoginScreen
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            ipAddress={ipAddress}
            deviceId={deviceId}
            loginError={loginError}
            isLoading={isLoading}
            handleLogin={async () => { 
                Keyboard.dismiss(); 
                if (ipAddress === '수집 중...' || deviceId === '수집 중...') {
                    Alert.alert('보안 컨텍스트 수집 중', '네트워크 및 기기 보안 정보를 수집하는 중입니다. 잠시만 기다려주세요.', [{ text: '확인' }]);
                    return;
                }
                const { freshLocation } = await refreshNetworkAndLocation();
                handleLogin(email, password, deviceId, freshLocation || location); 
            }}
        />
    );
}
