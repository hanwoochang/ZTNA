//자동으로 만들어진 app/(tabs)/index.tsx 경로의 파일을 수정
import axios from 'axios';
import * as Device from 'expo-device';
import * as Network from 'expo-network';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import { Alert, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';


const SERVER_IP = '192.168.123.116'; // <--- 이 부분 수정!!! 진짜 IP 주소
const POLICY_SERVER_URL = `http://${SERVER_IP}:3000`;
const GATEWAY_URL = `http://${SERVER_IP}:4000`;

export default function HomeScreen() {
  const [email, setEmail] = useState('test@kangnam.ac.kr');
  const [password, setPassword] = useState('mypassword123');
  const [deviceId, setDeviceId] = useState('수집 중...');
  const [ipAddress, setIpAddress] = useState('수집 중...');

  //화면을 바꿔치기 할 스위치 역할을 하는 '상태(State)'
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [secretData, setSecretData] = useState('');

  useEffect(() => {
    async function collectContext() {
      const model = Device.modelName || 'Unknown Device';
      setDeviceId(model);
      try {
        const ip = await Network.getIpAddressAsync();
        setIpAddress(ip);
      } catch (error) {
        setIpAddress('IP 추적 불가');
      }
    }
    collectContext();
  }, []);

  const handleLogin = async () => {
    try {
      const loginResponse = await axios.post(`${POLICY_SERVER_URL}/api/login`, {
        email, password, deviceId, ipAddress
      });
      const { token } = loginResponse.data;

      if (token) {
        // 출입증 발급받으면 팝업 띄우지 않고, 바로 조용히 게이트웨이로 돌격!
        await SecureStore.setItemAsync('jwt_token', token);
        testGatewayAccess(token); 
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || '서버 통신 실패';
      Alert.alert('🚨 접근 차단', errorMsg);
    }
  };

  const testGatewayAccess = async (token: string) => {
    try {
      const gatewayResponse = await axios.get(`${GATEWAY_URL}/private`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // 🎉 [성공] 문지기 통과! 기밀 데이터를 저장하고 스위치를 켬!
      setSecretData(gatewayResponse.data.secretData);
      setIsLoggedIn(true); // <--- 이 순간, 앱 화면이 인트라넷으로 싹 바뀜!

    } catch (error) {
      Alert.alert('🚨 기밀망 진입 실패', '문지기에게 차단당했습니다.');
    }
  };

  // 🔒 로그아웃 (출입증 파기 및 화면 복귀)
  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('jwt_token');
    setIsLoggedIn(false); // 다시 로그인 화면으로 스위치 끔
    setSecretData('');
  };

  // ==============================================================
  // 🏢 화면 A: 로그인 성공 후 보이는 [사내 기밀망 인트라넷 화면]
  // ==============================================================
  if (isLoggedIn) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.headerBox}>
            <Text style={styles.intranetTitle}>🏢 사내 기밀 인트라넷</Text>
            <Text style={styles.intranetSub}>ZTNA 보안 터널 연결됨 🟢</Text>
          </View>

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

  // ==============================================================
  // 🛡️ 화면 B: 맨 처음 보이는 [ZTNA 에이전트 로그인 화면]
  // ==============================================================
  return (
    <SafeAreaView style={styles.safeArea}>
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
    </SafeAreaView>
  );
}

//디자인 스타일
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f0f4f8' },
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 30, color: '#1a365d' },
  dashboard: { backgroundColor: '#ffffff', padding: 15, borderRadius: 10, marginBottom: 30, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
  infoText: { fontSize: 16, marginBottom: 5, color: '#4a5568' },
  highlight: { fontWeight: 'bold', color: '#2b6cb0' },
  statusText: { fontSize: 14, color: '#38a169', marginTop: 10, fontWeight: 'bold' },
  input: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: '#e2e8f0' },
  button: { backgroundColor: '#3182ce', padding: 15, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  // 인트라넷 화면 전용 스타일
  headerBox: { alignItems: 'center', marginBottom: 40 },
  intranetTitle: { fontSize: 28, fontWeight: 'bold', color: '#2d3748', marginBottom: 5 },
  intranetSub: { fontSize: 14, color: '#38a169', fontWeight: 'bold' },
  secretCard: { backgroundColor: '#ebf8ff', padding: 30, borderRadius: 15, borderWidth: 2, borderColor: '#90cdf4', marginBottom: 20, alignItems: 'center' },
  secretLabel: { fontSize: 14, color: '#2b6cb0', fontWeight: 'bold', marginBottom: 10 },
  secretText: { fontSize: 22, color: '#2c5282', fontWeight: '900', textAlign: 'center' },
  infoCard: { backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 30, borderWidth: 1, borderColor: '#e2e8f0' },
  infoLine: { fontSize: 14, color: '#718096', marginBottom: 5, fontWeight: '500' },
  logoutButton: { backgroundColor: '#e53e3e', padding: 15, borderRadius: 8, alignItems: 'center' }
});
