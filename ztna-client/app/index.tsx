//조립

import { useState, useEffect } from 'react';
import { Alert, Keyboard } from 'react-native';
import * as Network from 'expo-network';
import * as Storage from '../utils/storage';

import { POLICY_SERVER_URL } from '../constants/config';
import { checkDeviceSecurity } from '../utils/deviceSecurity';
import { getDeviceId } from '../utils/deviceId';
import { getLocation } from '../utils/location';
import { getDeviceContext, DeviceContext } from '../utils/deviceContext';
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
    const [deviceContext, setDeviceContext] = useState<DeviceContext | null>(null);

    const {
        isLoggedIn, secretData, showOtpInput, otp, setShowOtpInput, setOtp, otpError, loginError, isLoading,
        isBlockedByGateway, setIsBlockedByGateway,
        testGatewayAccess, handleLogin, handleResendOtp, handleVerifyOtp, handleLogout
    } = useAuth();

    useHeartbeat(isLoggedIn, deviceId, handleLogout);

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

            const currentLocation = await getLocation();
            setLocation(currentLocation);

            const context = await getDeviceContext();
            setDeviceContext(context);

            try {
                let ip = '';
                try {
                    const res = await fetch(`${POLICY_SERVER_URL}/api/my-ip`);
                    const data = await res.json();
                    if (data?.ip && data.ip !== '0.0.0.0') ip = data.ip;
                } catch {
                    // 정책 서버 조회 실패 시 외부 IP 조회 폴백
                }
                if (!ip || ip === '0.0.0.0') {
                    try {
                        const res = await fetch('https://api.ipify.org?format=json');
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
                setIpAddress(ip || 'IP 추적 불가');
            } catch {
                setIpAddress('IP 추적 불가');
            }

            try {
                // ZTNA 보안 정책: 앱 구동 시 자동 로그인 금지 및 기존 토큰 초기화
                await Storage.deleteItemAsync('jwt_token');
            } catch {
                console.log('기존 토큰 삭제 실패');
            }
        }
        collectContext();
    }, []);


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
            handleResendOtp={() => handleResendOtp(email, password, deviceId, location, deviceContext)}
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
            handleLogin={() => { 
                Keyboard.dismiss(); 
                if (ipAddress === '수집 중...' || deviceId === '수집 중...') {
                    Alert.alert('보안 컨텍스트 수집 중', '네트워크 및 기기 보안 정보를 수집하는 중입니다. 잠시만 기다려주세요.', [{ text: '확인' }]);
                    return;
                }
                handleLogin(email, password, deviceId, location, deviceContext); 
            }}
        />
    );
}