import { useState } from 'react';
import { Alert, Platform } from 'react-native';
import axios from 'axios';
import * as Storage from '../utils/storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { GATEWAY_URL } from '../constants/config';

export const useIntranet = (onForceLogout?: (isRevoked?: boolean) => void, syncAllowDownload?: (val: boolean) => void) => {
    const [isLoading, setIsLoading] = useState(false);
    const [attendanceData, setAttendanceData] = useState<{ check_in_time: string | null, check_out_time: string | null }>({ check_in_time: null, check_out_time: null });

    // API 응답 에러를 전역적으로 처리하는 헬퍼
    const handleApiError = (error: any, defaultMessage: string, silent: boolean = false) => {
        if (error.response?.status === 401 && error.response?.data?.revoked) {
            if (onForceLogout) onForceLogout(true);
            return;
        }
        if (!silent) {
            Alert.alert('통신 실패', error.response?.data?.message || defaultMessage);
        } else {
            console.error(defaultMessage, error.response?.data || error.message);
        }
    };

    const handleSyncHeader = (response: any) => {
        if (response?.headers && response.headers['x-allow-download-sync']) {
            const isAllowed = response.headers['x-allow-download-sync'] === 'true';
            Storage.setItemAsync('allowDownload', String(isAllowed));
            if (syncAllowDownload) syncAllowDownload(isAllowed);
        }
    };

    const getAuthHeader = async () => {
        const token = await Storage.getItemAsync('jwt_token');
        return { 
        isLoading, 
        attendanceData, handleAttendance, fetchTodayAttendance,
        documents, fetchDocuments, uploadDocument, downloadDocument,
        notices, noticePage, noticeTotalPages, fetchNotices, createNotice, deleteNotice, updateNotice,
        events, fetchEvents, createEvent, deleteEvent,
        employees, fetchEmployees
    };
    };

    const fetchTodayAttendance = async () => {
        try {
            const headers = await getAuthHeader();
            const response = await axios.get(`${GATEWAY_URL}/private/api/attendance/today`, { headers });
            handleSyncHeader(response);
            setAttendanceData({
                check_in_time: response.data.check_in_time,
                check_out_time: response.data.check_out_time
            });
        } catch (error: any) {
            handleApiError(error, '[근태 조회 실패]', true);
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
            handleApiError(error, '사내망 접근에 실패했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    const downloadDocument = async (id: number, filename: string) => {
        setIsLoading(true);
        try {
            const token = await Storage.getItemAsync('jwt_token');
            if (!token) throw new Error('인증 토큰이 없습니다.');

            if (Platform.OS === 'web') {
                const response = await fetch(`${GATEWAY_URL}/private/api/documents/${id}/download`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || '문서 다운로드 권한이 없습니다.');
                }
                const blob = await response.blob();
                const blobUrl = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(blobUrl);
            } else {
                const fileUri = `${(FileSystem as any).documentDirectory}${filename}`;
                const downloadRes = await FileSystem.downloadAsync(
                    `${GATEWAY_URL}/private/api/documents/${id}/download`,
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
            handleApiError(error, error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const [notices, setNotices] = useState<any[]>([]);

    const fetchNotices = async () => {
        try {
            const headers = await getAuthHeader();
            const response = await axios.get(`${GATEWAY_URL}/private/api/notices`, { headers });
            handleSyncHeader(response);
            setNotices(response.data);
        } catch (error: any) {
            handleApiError(error, '[게시글 목록 조회 실패]', true);
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
            handleApiError(error, '게시글 등록에 실패했습니다.');
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
            handleApiError(error, '게시글 삭제에 실패했습니다.');
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
            handleApiError(error, '게시글 수정 권한이 없습니다.');
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
            handleApiError(error, '[일정 목록 조회 실패]', true);
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
        } catch (error: any) {
            handleApiError(error, '[임직원 목록 조회 실패]', true);
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
