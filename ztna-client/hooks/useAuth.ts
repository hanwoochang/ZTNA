//인증 로직

import { useState } from 'react';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { Alert } from 'react-native';
import { POLICY_SERVER_URL, GATEWAY_URL } from '../constants/config';
import { checkDeviceSecurity } from '../utils/deviceSecurity';

export const useAuth = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [secretData, setSecretData] = useState('');
    const [showOtpInput, setShowOtpInput] = useState(false);
    const [otp, setOtp] = useState('');

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

    const handleLogin = async (email: string, password: string, deviceId: string, location: any, deviceContext: any) => {
        const security = await checkDeviceSecurity();
        if (!security.isSafe) {
            Alert.alert('🚨 보안 위협 감지', `${security.reason}로 인해 로그인이 차단됩니다.`);
            return;
        }

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

            if (loginResponse.data.requiresOtp) {
                const authMethod = await AsyncStorage.getItem('authMethod');
                
                if (authMethod === 'bio') {
                    if (!loginResponse.data.isTrustedDevice) {
                        Alert.alert('🛡️ 새로운 기기 감지', '아직 신뢰할 수 없는 기기입니다.\n최초 1회는 무조건 이메일 OTP로 인증해야 생체 인증 기기로 등록됩니다.');
                        setOtp('');
                        setShowOtpInput(true);
                        return;
                    }

                    const hasHardware = await LocalAuthentication.hasHardwareAsync();
                    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
                    
                    if (hasHardware && isEnrolled) {
                        const bioResult = await LocalAuthentication.authenticateAsync({
                            promptMessage: 'ZTNA 생체 인증 (2차 보안)',
                            cancelLabel: '취소',
                            fallbackLabel: '비밀번호 사용',
                        });

                        if (bioResult.success) {
                            try {
                                const bioVerifyResponse = await axios.post(`${POLICY_SERVER_URL}/api/verify-bio`, {
                                    email,
                                    deviceId,
                                    latitude: location?.latitude || null,
                                    longitude: location?.longitude || null,
                                });
                                await SecureStore.setItemAsync('jwt_token', bioVerifyResponse.data.token);
                                testGatewayAccess(bioVerifyResponse.data.token);
                                return; // 성공시 종료
                            } catch (bioError: any) {
                                Alert.alert('❌ 생체 인증 서버 검증 실패', bioError.response?.data?.message || '알 수 없는 오류');
                            }
                        } else {
                            Alert.alert('⚠️ 생체 인증 취소', 'OTP 인증으로 대체합니다.');
                        }
                    } else {
                        Alert.alert('⚠️ 생체 인증 불가', '기기에 등록된 생체 정보가 없습니다. OTP 인증으로 대체합니다.');
                    }
                }

                // bio가 아니거나, bio를 취소/실패했을 경우 OTP 창 띄움
                Alert.alert('📧 2차 인증', '등록된 이메일로 발송된 6자리 인증번호를 입력하거나, OTP 인증을 진행해주세요.');
                setOtp('');
                setShowOtpInput(true);
                return;
            }

            if (loginResponse.data.token) {
                await SecureStore.setItemAsync('jwt_token', loginResponse.data.token);
                testGatewayAccess(loginResponse.data.token);
            }
        } catch (error: any) {
            if (error.response?.status === 429) {
                Alert.alert('⏳ 잠시 후 시도하세요', error.response.data.message);
                return;
            }
            Alert.alert('🚨 접근 차단', error.response?.data?.message || '서버 통신 실패');
        }
    };

    const handleResendOtp = async (email: string, password: string, deviceId: string, location: any, deviceContext: any) => {
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

            if (loginResponse.data.requiresOtp) {
                Alert.alert('🔄 재발송 완료', '인증번호가 이메일로 다시 전송되었습니다.');
                setOtp('');
            }
        } catch (error: any) {
            Alert.alert('🚨 재발송 실패', error.response?.data?.message || '서버 통신 실패');
        }
    };

    const handleVerifyOtp = async (email: string, deviceId: string, location: any) => {
        if (otp.length !== 6) {
            Alert.alert('안내', '인증번호 6자리를 모두 입력해주세요.');
            return;
        }

        try {
            const verifyResponse = await axios.post(`${POLICY_SERVER_URL}/api/verify-otp`, {
                email, otp, deviceId,
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
            Alert.alert('❌ OTP 오류', error.response?.data?.message || '인증 실패');
            if (error.response?.status === 401) {
                const msg = error.response?.data?.message || '';
                if (msg.includes('무효화') || msg.includes('만료')) setShowOtpInput(false);
            }
        }
    };

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

    return {
        isLoggedIn, secretData, showOtpInput, setShowOtpInput, otp, setOtp,
        testGatewayAccess, handleLogin, handleResendOtp, handleVerifyOtp, handleLogout
    };
};