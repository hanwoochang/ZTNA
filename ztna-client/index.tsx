import { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  SafeAreaView, 
  TouchableWithoutFeedback,
  Keyboard,
  Platform 
} from 'react-native';
import * as Device from 'expo-device';
import * as Battery from 'expo-battery';
import * as Network from 'expo-network';
import * as SecureStore from 'expo-secure-store';
import * as Application from 'expo-application';
import * as Location from 'expo-location';
import { randomUUID } from 'expo-crypto';
import axios from 'axios';

const SERVER_IP = '192.168.123.104';
const POLICY_SERVER_URL = `http://${SERVER_IP}:3000`;
const GATEWAY_URL = `http://${SERVER_IP}:4000`;

// 기기 보안 상태 체크 함수
const checkDeviceSecurity = async (): Promise<{ isSafe: boolean; reason: string }> => {
  
    // 1. 루팅/탈옥 감지
    const isRooted = await Device.isRootedExperimentalAsync();

    //console.log('[보안 체크] isRooted:', isRooted);
    //console.log('[보안 체크] isDevice:', Device.isDevice);
    //console.log('[보안 체크] Platform:', Platform.OS);

    if (isRooted) {
        return { 
            isSafe: false, 
            reason: Platform.OS === 'ios' ? '탈옥된 기기' : '루팅된 기기' 
        };
    }

    // 2. 에뮬레이터 감지
    if (!Device.isDevice) {
        return { 
            isSafe: false, 
            reason: '실제 기기가 아닙니다 (에뮬레이터)' 
        };
    }

    return { isSafe: true, reason: '' };
};

// 위치 수집 함수
const getLocation = async (): Promise<{ latitude: number; longitude: number } | null> => {
    try {
        // 위치 권한 요청
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            console.log('[위치] 권한 거부됨');
            return null;
        }

        // 위치 수집
        const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced
        });

        return {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude
        };
    } catch (error) {
        console.log('[위치] 수집 실패:', error);
        return null;
    }
};

// 배터리 및 네트워크 상태 수집
const getDeviceContext = async (): Promise<{ 
    isWifi: boolean; 
    batteryLevel: number;
    previousBatteryLevel: number | null;
}> => {
    // 네트워크 타입 확인
    const networkState = await Network.getNetworkStateAsync();
    const isWifi = networkState.type === Network.NetworkStateType.WIFI;

    // 현재 배터리 잔량
    const batteryLevel = await Battery.getBatteryLevelAsync();

    // 이전 배터리 잔량 (SecureStore에서 불러옴)
    let previousBatteryLevel: number | null = null;
    try {
        const stored = await SecureStore.getItemAsync('battery_level');
        if (stored) previousBatteryLevel = parseFloat(stored);
    } catch {}

    // 현재 배터리 저장 (다음 로그인 때 비교용)
    await SecureStore.setItemAsync('battery_level', batteryLevel.toString());

    return { isWifi, batteryLevel, previousBatteryLevel };
};

const getDeviceId = async (): Promise<string> => {
  if (Platform.OS === 'ios') {
    const vendorId = await Application.getIosIdForVendorAsync();
    return vendorId ?? 'ios-unknown';
  }
  if (Platform.OS === 'android') {
    const androidId = await Application.getAndroidId();
    return androidId ?? 'android-unknown';
  }
  if (Platform.OS === 'web') {
    try {
      const stored = localStorage.getItem('web_device_id');
      if (stored) return stored;
      const newId = `web-${randomUUID()}`;
      localStorage.setItem('web_device_id', newId);
      return newId;
    } catch {
      return `web-${randomUUID()}`;
    }
  }
  return `unknown-${Device.modelName ?? 'device'}`;
};

export default function HomeScreen() {
  const [email, setEmail] = useState('043kws@gmail.com');
  const [password, setPassword] = useState('mypassword123');
  const [deviceId, setDeviceId] = useState('수집 중...');
  const [ipAddress, setIpAddress] = useState('수집 중...');
  const [isLoggedIn, setIsLoggedIn] = useState(false); 
  const [secretData, setSecretData] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false); 
  const [otp, setOtp] = useState('');
  const [isDeviceSafe, setIsDeviceSafe] = useState(true); // 기기 안전 상태
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [deviceContext, setDeviceContext] = useState<{ isWifi: boolean; batteryLevel: number; previousBatteryLevel: number | null; } | null>(null);

  // 앱 시작 시 정보 수집
  useEffect(() => {
    async function collectContext() {

        //0단계: 기기 보안 상태 먼저 체크
        const security = await checkDeviceSecurity();
        if (!security.isSafe) {
            setIsDeviceSafe(false); // 위험 상태로 표시
            Alert.alert(
                '🚨 보안 위협 감지',
                `${security.reason}입니다.\n보안 정책에 의해 앱 사용이 차단됩니다.`,
                [{ text: '확인' }]
            );
            return; // 이후 모든 로직 중단
        }

        // 기존: 기기 정보 수집
        const id = await getDeviceId();
        setDeviceId(id);

        // 위치 수집 추가
        const currentLocation = await getLocation();
        setLocation(currentLocation);

        // 배터리 및 네트워크 수집 추가
        const context = await getDeviceContext();
        setDeviceContext(context);

        try {
            const ip = await Network.getIpAddressAsync();
            setIpAddress(ip);
        } catch (error) {
            setIpAddress('IP 추적 불가');
        }

        // 토큰 자동 복구
        try {
            const savedToken = await SecureStore.getItemAsync('jwt_token');
            if (savedToken) {
                console.log('[자동 복구 시도] 저장된 토큰 발견');
                await testGatewayAccess(savedToken, true);
            }
        } catch (error) {
            console.log('[자동 복구 실패] 로그인 화면으로 이동');
        }
    }
    collectContext();
  }, []);

  // Heartbeat
  useEffect(() => {
    let heartbeatInterval: ReturnType<typeof setInterval>;

    if (isLoggedIn) {
      heartbeatInterval = setInterval(async () => {
        // 매 heartbeat마다 루팅 재확인
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

    return () => {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
    };
  }, [isLoggedIn, deviceId]);

  // 로그인 요청
  const handleLogin = async () => {
    Keyboard.dismiss();

    // 로그인 시도 전 보안 재확인
    const security = await checkDeviceSecurity();
    if (!security.isSafe) {
        Alert.alert('🚨 보안 위협 감지', `${security.reason}로 인해 로그인이 차단됩니다.`);
        return;
    }

    try {
      //console.log('[로그인 시도] 서버:', POLICY_SERVER_URL);
      //console.log('[로그인 시도] 위치:', location);
      //console.log('[로그인 시도] deviceId:', deviceId);

      const loginResponse = await axios.post(`${POLICY_SERVER_URL}/api/login`, {
        email, 
        password, 
        deviceId,
        isRooted: false, // 서버에 안전한 기기임을 알림
        latitude: location?.latitude || null,
        longitude: location?.longitude || null,
        //latitude: 35.1795,  // 📍 테스트용: 부산 위도 강제 주입
        //longitude: 129.0756, // 📍 테스트용: 부산 경도 강제 주입
        isWifi: deviceContext?.isWifi ?? true,
        batteryLevel: deviceContext?.batteryLevel ?? 1,
        previousBatteryLevel: deviceContext?.previousBatteryLevel ?? null
      });

      if (loginResponse.data.requiresOtp) {
        Alert.alert('📧 메일 발송 완료', '등록된 이메일로 6자리 인증번호가 발송되었습니다.');
        setOtp('');
        setShowOtpInput(true);
        return;
      }

      if (loginResponse.data.token) {
        await SecureStore.setItemAsync('jwt_token', loginResponse.data.token);
        testGatewayAccess(loginResponse.data.token); 
      }
    } catch (error: any) {
      //console.log('[에러 상태코드]:', error.response?.status);
      //console.log('[에러 메시지]:', error.response?.data);
      //console.log('[에러 전체]:', error.message);

      // Rate Limit 초과 시 (429)
      if (error.response?.status === 429) {
        Alert.alert('⏳ 잠시 후 시도하세요', error.response.data.message);
        return;
      }

      const errorMsg = error.response?.data?.message || '서버 통신 실패';
      Alert.alert('🚨 접근 차단', errorMsg);
    }
  };

  // OTP 인증
  const handleVerifyOtp = async () => {
    Keyboard.dismiss();
    if (otp.length !== 6) {
      Alert.alert('안내', '인증번호 6자리를 모두 입력해주세요.');
      return;
    }

    try {
      const verifyResponse = await axios.post(`${POLICY_SERVER_URL}/api/verify-otp`, {
        email, 
        otp, 
        deviceId,
        latitude: location?.latitude || null,
        longitude: location?.longitude || null
      });

      if (verifyResponse.data.token) {
        Alert.alert('✅ 인증 성공!', '출입증이 발급되었습니다.');
        setShowOtpInput(false);
        await SecureStore.setItemAsync('jwt_token', verifyResponse.data.token);
        testGatewayAccess(verifyResponse.data.token);
      }
    } catch (error: any) {
      if (error.response?.status === 429) {
        Alert.alert('⏳ 잠시 후 시도하세요', error.response.data.message);
        setShowOtpInput(false);
        return;
      }
      
      const errorMsg = error.response?.data?.message || '인증 실패';
      Alert.alert('❌ OTP 오류', errorMsg);

      if (error.response?.status === 401) {
        const msg = error.response?.data?.message || '';
        if (msg.includes('무효화') || msg.includes('만료')) {
            setShowOtpInput(false);
        }
      }
    }
  };

  // 게이트웨이 접근
  const testGatewayAccess = async (token: string, isAutoRecover: boolean = false) => {
      try {
          const gatewayResponse = await axios.get(`${GATEWAY_URL}/private`, {
              headers: { Authorization: `Bearer ${token}` }
          });
          
          setSecretData(gatewayResponse.data.secretData);
          setIsLoggedIn(true);

      } catch (error) {
          await SecureStore.deleteItemAsync('jwt_token');
          if (!isAutoRecover) {
              Alert.alert('🚨 기밀망 진입 실패', '문지기에게 차단당했습니다.');
          }
      }
  };

  // 로그아웃
  const handleLogout = async () => {
    try {
        const token = await SecureStore.getItemAsync('jwt_token');
        if (token) {
            await axios.post(`${POLICY_SERVER_URL}/api/logout`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
        }
    } catch (error) {
        console.log('토큰 폐기 요청 실패:', error);
    } finally {
        await SecureStore.deleteItemAsync('jwt_token');
        setIsLoggedIn(false);
        setShowOtpInput(false);
        setSecretData('');
        setOtp('');
    }
  };

  // 기기가 안전하지 않으면 차단 화면 표시
  if (!isDeviceSafe) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.blockedTitle}>🚨 접근 차단</Text>
          <View style={styles.blockedCard}>
            <Text style={styles.blockedText}>보안 위협이 감지된 기기입니다.</Text>
            <Text style={styles.blockedSub}>루팅/탈옥된 기기는{'\n'}보안 정책에 의해 차단됩니다.</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // 화면 A: 인트라넷
  if (isLoggedIn) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.intranetTitle}>🏢 사내 기밀 인트라넷</Text>
          <Text style={styles.intranetSub}>ZTNA 보안 터널 연결됨 🟢</Text>
          <View style={styles.secretCard}>
            <Text style={styles.secretLabel}>최고 기밀 문서 (Top Secret)</Text>
            <Text style={styles.secretText}>"{secretData}"</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLine}>접속자: {email}</Text>
            <Text style={styles.infoLine}>인가 기기: {deviceId}</Text>
            <Text style={styles.infoLine}>인가 IP: {ipAddress}</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.buttonText}>🔒 안전하게 연결 종료 (Logout)</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // 화면 B: OTP
  if (showOtpInput) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.container}>
            <Text style={styles.title}>🔐 2차 보안 인증</Text>
            <View style={styles.otpBox}>
              <Text style={styles.otpAlert}>⚠️ 새로운 기기 접속 감지됨</Text>
              <Text style={styles.infoText}>이메일로 전송된 인증번호 6자리를 입력하세요.</Text>
              <Text style={styles.hintText}>(제한시간 3분)</Text>
            </View>
            <TextInput 
              style={styles.input} 
              value={otp} 
              onChangeText={setOtp} 
              placeholder="인증번호 6자리" 
              keyboardType="number-pad" 
              maxLength={6}
            />
            <TouchableOpacity style={styles.button} onPress={handleVerifyOtp}>
              <Text style={styles.buttonText}>인증하고 출입증 받기</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setShowOtpInput(false); setOtp(''); }}>
              <Text style={styles.linkText}>로그인 화면으로 돌아가기</Text>
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>
      </SafeAreaView>
    );
  }

  // 화면 C: 로그인
  return (
    <SafeAreaView style={styles.safeArea}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <Text style={styles.title}>🛡️ ZTNA 보안 에이전트</Text>
          <View style={styles.dashboard}>
            <Text style={styles.infoText}>📍 현재 IP: <Text style={styles.highlight}>{ipAddress}</Text></Text>
            <Text style={styles.infoText}>📱 내 기기: <Text style={styles.highlight}>{deviceId}</Text></Text>
            <Text style={styles.statusText}>🟢 상태: 컨텍스트 수집 완료</Text>
          </View>
          <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="이메일" autoCapitalize="none" />
          <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="비밀번호" secureTextEntry />
          <TouchableOpacity style={styles.button} onPress={handleLogin}>
            <Text style={styles.buttonText}>안전하게 로그인 및 기밀망 접속</Text>
          </TouchableOpacity>
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f0f4f8' },
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 30, color: '#1a365d' },
  intranetTitle: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', color: '#2d3748', marginBottom: 5 },
  intranetSub: { fontSize: 14, fontWeight: 'bold', textAlign: 'center', color: '#38a169', marginBottom: 40 },
  dashboard: { backgroundColor: '#ffffff', padding: 15, borderRadius: 10, marginBottom: 30, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
  infoText: { fontSize: 16, marginBottom: 5, color: '#4a5568' },
  highlight: { fontWeight: 'bold', color: '#2b6cb0' },
  statusText: { fontSize: 14, color: '#38a169', marginTop: 10, fontWeight: 'bold' },
  input: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: '#e2e8f0', fontSize: 16, letterSpacing: 2 },
  button: { backgroundColor: '#3182ce', padding: 15, borderRadius: 8, alignItems: 'center' },
  logoutButton: { backgroundColor: '#e53e3e', padding: 15, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  linkText: { textAlign: 'center', color: '#718096', marginTop: 20 },
  secretCard: { backgroundColor: '#ebf8ff', padding: 30, borderRadius: 15, borderWidth: 2, borderColor: '#90cdf4', marginBottom: 20 },
  secretLabel: { fontSize: 14, color: '#2b6cb0', fontWeight: 'bold', marginBottom: 10 },
  secretText: { fontSize: 22, color: '#2c5282', fontWeight: '900' },
  infoCard: { backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 30, borderWidth: 1, borderColor: '#e2e8f0' },
  infoLine: { fontSize: 14, color: '#718096', marginBottom: 5, fontWeight: '500' },
  otpBox: { backgroundColor: '#fff5f5', padding: 20, borderRadius: 10, marginBottom: 30, borderWidth: 1, borderColor: '#feb2b2' },
  otpAlert: { fontSize: 18, fontWeight: 'bold', color: '#c53030', marginBottom: 10 },
  hintText: { fontSize: 14, color: '#e53e3e', marginTop: 10, fontWeight: 'bold' },

  blockedTitle: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', color: '#c53030', marginBottom: 30 },
  blockedCard: { backgroundColor: '#fff5f5', padding: 30, borderRadius: 15, borderWidth: 2, borderColor: '#feb2b2', alignItems: 'center' },
  blockedText: { fontSize: 18, fontWeight: 'bold', color: '#c53030', marginBottom: 15, textAlign: 'center' },
  blockedSub: { fontSize: 14, color: '#718096', textAlign: 'center', lineHeight: 22 },
});
