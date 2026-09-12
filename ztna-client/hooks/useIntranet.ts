import { useState } from 'react';
import { Alert } from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { GATEWAY_URL } from '../constants/config';

export const useIntranet = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [attendanceData, setAttendanceData] = useState<{ check_in_time: string | null, check_out_time: string | null }>({ check_in_time: null, check_out_time: null });

    const getAuthHeader = async () => {
        const token = await SecureStore.getItemAsync('jwt_token');
        return { Authorization: `Bearer ${token}` };
    };

    const fetchTodayAttendance = async () => {
        try {
            const headers = await getAuthHeader();
            const response = await axios.get(`${GATEWAY_URL}/private/api/attendance/today`, { headers });
            setAttendanceData({
                check_in_time: response.data.check_in_time,
                check_out_time: response.data.check_out_time
            });
        } catch (error) {
            console.error('[근태 조회 실패]', error);
        }
    };

    const handleAttendance = async (type: 'check-in' | 'check-out') => {
        setIsLoading(true);
        try {
            const headers = await getAuthHeader();
            const response = await axios.post(`${GATEWAY_URL}/private/api/attendance/${type}`, {}, { headers });
            Alert.alert(type === 'check-in' ? '🏢 출근 완료' : '🏠 퇴근 완료', response.data.message || '정상 처리되었습니다.');
            // 처리 후 화면 갱신
            await fetchTodayAttendance();
        } catch (error: any) {
            Alert.alert('🚨 통신 실패', error.response?.data?.message || '사내망 접근에 실패했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    const downloadSecretPdf = async () => {
        setIsLoading(true);
        try {
            const token = await SecureStore.getItemAsync('jwt_token');
            if (!token) throw new Error('인증 토큰이 없습니다.');

            const fileUri = `${FileSystem.documentDirectory}secret_document.pdf`;
            
            // expo-file-system을 사용하여 바이너리(PDF) 다운로드
            const downloadRes = await FileSystem.downloadAsync(
                `${GATEWAY_URL}/private/api/documents/secret.pdf`,
                fileUri,
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            if (downloadRes.status !== 200) {
                throw new Error('문서 다운로드 권한이 없습니다.');
            }

            const isAvailable = await Sharing.isAvailableAsync();
            if (isAvailable) {
                await Sharing.shareAsync(downloadRes.uri);
            } else {
                Alert.alert('완료', '문서가 기기에 저장되었습니다.');
            }
        } catch (error: any) {
            Alert.alert('🚨 다운로드 실패', error.message || '문서 유출 방지 시스템에 의해 차단되었습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    return {
        isLoading,
        attendanceData,
        fetchTodayAttendance,
        handleAttendance,
        downloadSecretPdf
    };
};
