//자동으로 만들어진 app/(tabs)/index.tsx 경로의 파일을 수정

import axios from 'axios'; // 통신 택배 기사
import * as Device from 'expo-device';
import * as Network from 'expo-network';
import * as SecureStore from 'expo-secure-store'; // 토큰 숨길 비밀 금고
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

//여기에 네 컴퓨터(PC)의 진짜 IP 주소(localhost 절대 금지!)
const SERVER_IP = '192.168.123.116'; // <--- 이 부분 수정!!!
const POLICY_SERVER_URL = `http://${SERVER_IP}:3000`;
const GATEWAY_URL = `http://${SERVER_IP}:4000`;

export default function HomeScreen() {
  const [email, setEmail] = useState('test@kangnam.ac.kr');
  const [password, setPassword] = useState('mypassword123');
  const [deviceId, setDeviceId] = useState('수집 중...');
  const [ipAddress, setIpAddress] = useState('수집 중...');

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

  // [핵심 로직] 로그인 및 ZTNA 통과 테스트
  const handleLogin = async () => {
    try {
      // 1. 정책 서버로 로그인 요청 (Context Data 함께 전송)
      const loginResponse = await axios.post(`${POLICY_SERVER_URL}/api/login`, {
        email,
        password,
        deviceId,
        ipAddress
      });

      const { message, 위험도점수, token } = loginResponse.data;
      
      // 2. 발급받은 출입증(JWT)을 안전 금고에 조용히 저장
      if (token) {
        await SecureStore.setItemAsync('jwt_token', token);
        Alert.alert(`로그인 성공 (위험도: ${위험도점수}점)`, '출입증 발급 완료! 기밀망으로 이동합니다.');
        
        // 3. 방금 받은 토큰으로 게이트웨이(문지기) 뚫기 시도!
        testGatewayAccess(token);
      }
      
    } catch (error: any) {
      // 차단당했을 때의 에러 처리 (401, 403 등)
      const errorMsg = error.response?.data?.message || '서버 통신 실패';
      const score = error.response?.data?.위험도점수 || 'N/A';
      Alert.alert(`접근 차단 (위험도: ${score}점)`, errorMsg);
    }
  };

  // 🚪 게이트웨이 돌파 함수
  const testGatewayAccess = async (token: string) => {
    try {
      // 헤더에 토큰을 예쁘게 포장해서 게이트웨이(4000번)로 전송
      const gatewayResponse = await axios.get(`${GATEWAY_URL}/private`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // 성공하면 타겟 서버(5000번)의 A+ 기밀 메시지가 팝업으로 뜸!
      Alert.alert('[기밀망 진입 성공!]', gatewayResponse.data.secretData);
      
    } catch (error) {
      Alert.alert('[기밀망 진입 실패]', '문지기에게 차단당했습니다.');
    }
  }

  return (
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#f0f4f8' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 30, color: '#1a365d' },
  dashboard: { backgroundColor: '#ffffff', padding: 15, borderRadius: 10, marginBottom: 30, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
  infoText: { fontSize: 16, marginBottom: 5, color: '#4a5568' },
  highlight: { fontWeight: 'bold', color: '#2b6cb0' },
  statusText: { fontSize: 14, color: '#38a169', marginTop: 10, fontWeight: 'bold' },
  input: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: '#e2e8f0' },
  button: { backgroundColor: '#3182ce', padding: 15, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
