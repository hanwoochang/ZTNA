import { useState } from 'react';
import { Alert, Platform } from 'react-native';
import axios from 'axios';
import * as Storage from '../utils/storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { GATEWAY_URL } from '../constants/config';

export const useIntranet = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [attendanceData, setAttendanceData] = useState<{ check_in_time: string | null, check_out_time: string | null }>({ check_in_time: null, check_out_time: null });

    const getAuthHeader = async () => {
        const token = await Storage.getItemAsync('jwt_token');
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
            Alert.alert('통신 실패', error.response?.data?.message || '사내망 접근에 실패했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    const downloadSecretPdf = async () => {
        setIsLoading(true);
        try {
            const token = await Storage.getItemAsync('jwt_token');
            if (!token) throw new Error('인증 토큰이 없습니다.');

            if (Platform.OS === 'web') {
                const response = await fetch(`${GATEWAY_URL}/private/api/documents/secret.pdf`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (!response.ok) throw new Error('문서 다운로드 권한이 없습니다.');
                const blob = await response.blob();
                const blobUrl = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = 'secret_document.pdf';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(blobUrl);
            } else {
                const fileUri = `${(FileSystem as any).documentDirectory}secret_document.pdf`;
                const downloadRes = await FileSystem.downloadAsync(
                    `${GATEWAY_URL}/private/api/documents/secret.pdf`,
                    fileUri,
                    { headers: { Authorization: `Bearer ${token}` } }
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
            }
        } catch (error: any) {
            Alert.alert('다운로드 실패', `이유: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const [notices, setNotices] = useState<any[]>([]);

    const fetchNotices = async () => {
        try {
            const headers = await getAuthHeader();
            const response = await axios.get(`${GATEWAY_URL}/private/api/notices`, { headers });
            setNotices(response.data);
        } catch (error) {
            console.error('[게시글 목록 조회 실패]', error);
        }
    };

    const createNotice = async (title: string, content: string) => {
        setIsLoading(true);
        try {
            const headers = await getAuthHeader();
            const response = await axios.post(`${GATEWAY_URL}/private/api/notices`, { title, content }, { headers });
            Alert.alert('등록 완료', response.data.message);
            await fetchNotices();
            return true;
        } catch (error: any) {
            Alert.alert('등록 실패', error.response?.data?.message || '게시글 등록에 실패했습니다.');
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const deleteNotice = async (id: number) => {
        setIsLoading(true);
        try {
            const headers = await getAuthHeader();
            const response = await axios.delete(`${GATEWAY_URL}/private/api/notices/${id}`, { headers });
            Alert.alert('삭제 완료', response.data.message);
            await fetchNotices();
            return true;
        } catch (error: any) {
            Alert.alert('삭제 실패', error.response?.data?.message || '게시글 삭제에 실패했습니다.');
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const updateNotice = async (id: number, title: string, content: string) => {
        setIsLoading(true);
        try {
            const headers = await getAuthHeader();
            const response = await axios.put(`${GATEWAY_URL}/private/api/notices/${id}`, { title, content }, { headers });
            Alert.alert('수정 완료', response.data.message);
            await fetchNotices();
            return true;
        } catch (error: any) {
            Alert.alert('수정 실패', error.response?.data?.message || '게시글 수정 권한이 없습니다.');
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const [events, setEvents] = useState<any[]>([]);

    const fetchEvents = async () => {
        try {
            const headers = await getAuthHeader();
            const response = await axios.get(`${GATEWAY_URL}/private/api/events`, { headers });
            setEvents(response.data);
        } catch (error: any) {
            console.error('fetchEvents Error:', error.response?.data || error.message);
        }
    };

    const createEvent = async (title: string, date: string) => {
        try {
            const headers = await getAuthHeader();
            await axios.post(`${GATEWAY_URL}/private/api/events`, { title, date }, { headers });
            await fetchEvents();
            return true;
        } catch (error: any) {
            Alert.alert('등록 실패', error.response?.data?.message || '오류가 발생했습니다.');
            return false;
        }
    };

    const deleteEvent = async (id: number) => {
        try {
            const headers = await getAuthHeader();
            await axios.delete(`${GATEWAY_URL}/private/api/events/${id}`, { headers });
            await fetchEvents();
            return true;
        } catch (error: any) {
            Alert.alert('삭제 실패', error.response?.data?.message || '오류가 발생했습니다.');
            return false;
        }
    };

    const [employees, setEmployees] = useState<any[]>([]);

    const fetchEmployees = async () => {
        try {
            const headers = await getAuthHeader();
            const response = await axios.get(`${GATEWAY_URL}/private/api/employees`, { headers });
            setEmployees(response.data);
        } catch (error) {
            console.error('[임직원 목록 조회 실패]', error);
        }
    };

    return { 
        isLoading, 
        attendanceData, handleAttendance, fetchTodayAttendance,
        downloadSecretPdf,
        notices, fetchNotices, createNotice, deleteNotice, updateNotice,
        events, fetchEvents, createEvent, deleteEvent,
        employees, fetchEmployees
    };
};
