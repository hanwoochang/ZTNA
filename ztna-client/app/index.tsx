//조립

import { useState, useEffect } from 'react';
import { Alert, Keyboard } from 'react-native';
import * as Network from 'expo-network';
import * as SecureStore from 'expo-secure-store';

import { checkDeviceSecurity } from './utils/deviceSecurity';
import { getDeviceId } from './utils/deviceId';
import { getLocation } from './utils/location';
import { getDeviceContext, DeviceContext } from './utils/deviceContext';
import { useAuth } from './hooks/useAuth';
import { useHeartbeat } from './hooks/useHeartbeat';

import { BlockedScreen } from './screens/BlockedScreen';
import { IntranetScreen } from './screens/IntranetScreen';
import { OtpScreen } from './screens/OtpScreen';
import { LoginScreen } from './screens/LoginScreen';

export default function HomeScreen() {
    const [email, setEmail] = useState('043kws@gmail.com');
    const [password, setPassword] = useState('mypassword123');
    const [deviceId, setDeviceId] = useState('수집 중...');
    const [ipAddress, setIpAddress] = useState('수집 중...');
    const [isDeviceSafe, setIsDeviceSafe] = useState(true);
    const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [deviceContext, setDeviceContext] = useState<DeviceContext | null>(null);

    const {
        isLoggedIn, secretData, showOtpInput, otp, setOtp,
        testGatewayAccess, handleLogin, handleVerifyOtp, handleLogout
    } = useAuth();

    useHeartbeat(isLoggedIn, deviceId, handleLogout);

    useEffect(() => {
        async function collectContext() {
            const security = await checkDeviceSecurity();
            if (!security.isSafe) {
                setIsDeviceSafe(false);
                Alert.alert('🚨 보안 위협 감지', `${security.reason}입니다.\n보안 정책에 의해 앱 사용이 차단됩니다.`, [{ text: '확인' }]);
                return;
            }

            const id = await getDeviceId();
            setDeviceId(id);

            const currentLocation = await getLocation();
            setLocation(currentLocation);

            const context = await getDeviceContext();
            setDeviceContext(context);

            try {
                const ip = await Network.getIpAddressAsync();
                setIpAddress(ip);
            } catch {
                setIpAddress('IP 추적 불가');
            }

            try {
                const savedToken = await SecureStore.getItemAsync('jwt_token');
                if (savedToken) await testGatewayAccess(savedToken, true);
            } catch {
                console.log('[자동 복구 실패] 로그인 화면으로 이동');
            }
        }
        collectContext();
    }, []);

    if (!isDeviceSafe) return <BlockedScreen />;
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
            handleVerifyOtp={() => { Keyboard.dismiss(); handleVerifyOtp(email, deviceId, location); }}
            onBack={() => { setOtp(''); }}
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
            handleLogin={() => { Keyboard.dismiss(); handleLogin(email, password, deviceId, location, deviceContext); }}
        />
    );
}
