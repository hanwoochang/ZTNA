//인증 로직

import { useState } from 'react';
import axios from 'axios';
import * as Storage from '../utils/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { Alert, Platform } from 'react-native';
import { POLICY_SERVER_URL, GATEWAY_URL } from '../constants/config';
import { checkDeviceSecurity } from '../utils/deviceSecurity';

export const useAuth = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [secretData, setSecretData] = useState('');
    const [showOtpInput, setShowOtpInput] = useState(false);
    const [otp, setOtp] = useState('');
    const [otpError, setOtpError] = useState('');
    const [loginError, setLoginError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const testGatewayAccess = async (token: string, isAutoRecover: boolean = false) => {
        try {
            const gatewayResponse = await axios.get(`${GATEWAY_URL}/private`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSecretData(gatewayResponse.data.secretData);
            setIsLoggedIn(true);
        } catch (error) {
            await Storage.deleteItemAsync('jwt_token');
            if (!isAutoRecover) {
                Alert.alert('기밀망 진입 실패', '문지기에게 차단당했습니다.');
            }
        }
    };

    const handleLogin = async (email: string, password: string, deviceId: string, location: any, deviceContext: any) => {
        setIsLoading(true);
        const security = await checkDeviceSecurity();
        if (!security.isSafe) {
            if (Platform.OS === 'web') setLoginError(`${security.reason}로 인해 로그인이 차단됩니다.`);
            else Alert.alert('보안 위협 감지', `${security.reason}로 인해 로그인이 차단됩니다.`);
            setIsLoading(false);
            return;
        }
        setLoginError('');

        try {
            const loginResponse = await axios.post(`${POLICY_SERVER_URL}/api/login`, {
                email, password, deviceId,
                isRooted: false,
                latitude: location?.latitude || null,
                longitude: location?.longitude || null,
                isWifi: deviceContext?.isWifi ?? true,
                batteryLevel: deviceContext?.batteryLevel ?? 1,
                previousBatteryLevel: deviceContext?.previousBatteryLevel ?? null
            });

            if (loginResponse.data.requiresApproval) {
                // is_trusted=0 기기 → 어드민 승인 대기
                const msg = loginResponse.data.message;
                if (Platform.OS === 'web') setLoginError(msg);
                else Alert.alert('승인 대기', msg);
                setIsLoading(false);
                return;
            }

            if (loginResponse.data.requiresOtp) {
                const authMethod = await AsyncStorage.getItem('authMethod');
                
                if (authMethod === 'bio') {
                    if (!loginResponse.data.isTrustedDevice) {
                        if (Platform.OS === 'web') setLoginError('아직 신뢰할 수 없는 기기입니다.\n최초 1회는 이메일 OTP로 인증해야 합니다.');
                        else Alert.alert('새로운 기기 감지', '아직 신뢰할 수 없는 기기입니다.\n최초 1회는 무조건 이메일 OTP로 인증해야 생체 인증 기기로 등록됩니다.');
                        setOtp('');
                        setOtpError('');
                        setShowOtpInput(true);
                        setIsLoading(false);
                        return;
                    }

                    const hasHardware = await LocalAuthentication.hasHardwareAsync();
                    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
                    
                    if (hasHardware && isEnrolled) {
                        const bioAuth = await LocalAuthentication.authenticateAsync({
                            promptMessage: '안전한 사내망 접속을 위해 생체 인증을 진행합니다.',
                            cancelLabel: '취소',
                            fallbackLabel: '비밀번호 사용'
                        });

                        if (bioAuth.success) {
                            try {
                                const bioVerifyResponse = await axios.post(`${POLICY_SERVER_URL}/api/verify-bio`, {
                                    email,
                                    deviceId,
                                    latitude: location?.latitude || null,
                                    longitude: location?.longitude || null,
                                });
                                if (bioVerifyResponse.data.token) {
                                    await Storage.setItemAsync('jwt_token', bioVerifyResponse.data.token);
                                    testGatewayAccess(bioVerifyResponse.data.token);
                                    setIsLoading(false);
                                    return; // 성공시 종료
                                }
                            } catch (error: any) {
                                if (Platform.OS === 'web') setLoginError(error.response?.data?.message || '생체 인증 실패');
                                else Alert.alert('생체 인증 검증 실패', error.response?.data?.message || '인증 실패');
                            }
                        } else {
                            Alert.alert('인증 취소', '생체 인증이 취소되었습니다. 이메일 OTP로 인증합니다.');
                        }
                    } else {
                        Alert.alert('안내', '기기에 등록된 생체 정보가 없습니다. 이메일 OTP로 인증합니다.');
                    }
                }

                setOtp('');
                setOtpError('');
                setShowOtpInput(true);
            } else {
                await Storage.setItemAsync('jwt_token', loginResponse.data.token);
                testGatewayAccess(loginResponse.data.token);
            }
        } catch (error: any) {
            const msg = error.response?.data?.message || '서버 통신 실패';
            if (error.response?.status === 429) {
                if (Platform.OS === 'web') setLoginError(msg);
                else Alert.alert('잠시 후 시도하세요', msg);
                setIsLoading(false);
                return;
            }
            if (Platform.OS === 'web') setLoginError(msg);
            else Alert.alert('접근 차단', msg);
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendOtp = async (email: string, password: string, deviceId: string, location: any, deviceContext: any) => {
        setIsLoading(true);
        try {
            const res = await axios.post(`${POLICY_SERVER_URL}/api/login`, {
                email, password, deviceId,
                isRooted: false,
                latitude: location?.latitude || null,
                longitude: location?.longitude || null,
                isWifi: deviceContext?.isWifi ?? true,
                batteryLevel: deviceContext?.batteryLevel ?? 1,
                previousBatteryLevel: deviceContext?.previousBatteryLevel ?? null
            });

            if (res.data.requiresOtp) {
                // 서버가 OTP를 정상 발송한 경우에만 성공 알림
                Alert.alert('인증번호 재발송', '새로운 인증번호가 이메일로 발송되었습니다.');
                setOtp('');
                setOtpError('');
            } else {
                // 재시도 사이에 위험도가 낮아져 OTP가 불필요해진 경우
                Alert.alert('안내', '보안 상태가 변경되었습니다. 다시 로그인해주세요.');
                setShowOtpInput(false);
            }
        } catch (error: any) {
            Alert.alert('재발송 실패', error.response?.data?.message || '서버 통신 실패');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOtp = async (email: string, deviceId: string, location: any) => {
        setIsLoading(true);
        if (otp.length !== 6) {
            if (Platform.OS === 'web') setOtpError('인증번호 6자리를 모두 입력해주세요.');
            else Alert.alert('안내', '인증번호 6자리를 모두 입력해주세요.');
            setIsLoading(false);
            return;
        }
        setOtpError('');

        try {
            const verifyResponse = await axios.post(`${POLICY_SERVER_URL}/api/verify-otp`, {
                email, otp, deviceId,
                latitude: location?.latitude || null,
                longitude: location?.longitude || null
            });

            if (verifyResponse.data.requiresApproval) {
                // 신규 기기 등록 완료 → 어드민 승인 대기
                const msg = verifyResponse.data.message;
                if (Platform.OS === 'web') setOtpError(msg);
                else Alert.alert('기기 등록 완료', msg);
                setShowOtpInput(false);
            } else if (verifyResponse.data.token) {
                if (Platform.OS !== 'web') Alert.alert('인증 성공!', '출입증이 발급되었습니다.');
                setShowOtpInput(false);
                await Storage.setItemAsync('jwt_token', verifyResponse.data.token);
                testGatewayAccess(verifyResponse.data.token);
            }
        } catch (error: any) {
            const msg = error.response?.data?.message || '인증 실패';
            if (error.response?.status === 429) {
                if (Platform.OS === 'web') setOtpError(msg);
                else Alert.alert('잠시 후 시도하세요', msg);
                setShowOtpInput(false);
                setIsLoading(false);
                return;
            }
            if (Platform.OS === 'web') setOtpError(msg);
            else Alert.alert('OTP 오류', msg);
            
            if (error.response?.status === 401) {
                if (msg.includes('무효화') || msg.includes('만료')) setShowOtpInput(false);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            const token = await Storage.getItemAsync('jwt_token');
            if (token) {
                await axios.post(`${POLICY_SERVER_URL}/api/logout`, {}, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
        } catch (error) {
            console.log('토큰 폐기 요청 실패:', error);
        } finally {
            await Storage.deleteItemAsync('jwt_token');
            setIsLoggedIn(false);
            setShowOtpInput(false);
            setSecretData('');
            setOtp('');
        }
    };

    return {
        isLoggedIn, secretData, showOtpInput, setShowOtpInput, otp, setOtp, otpError, loginError, isLoading,
        testGatewayAccess, handleLogin, handleResendOtp, handleVerifyOtp, handleLogout
    };
};