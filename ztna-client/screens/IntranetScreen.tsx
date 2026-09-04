import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, ScrollView } from 'react-native';
import { useAppStyles } from '../styles/styles';
import { useIntranet } from '../hooks/useIntranet';
import { SkeletonLoader } from '../components/SkeletonLoader';

type Props = {
    email: string;
    deviceId: string;
    ipAddress: string;
    secretData: string;
    handleLogout: () => void;
};

export const IntranetScreen = ({ email, deviceId, ipAddress, secretData, handleLogout }: Props) => {
    const { styles } = useAppStyles();
    const { isLoading, handleAttendance, downloadSecretPdf } = useIntranet();
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
        }).start();
    }, [fadeAnim]);

    return (
        <Animated.View style={[styles.container, { opacity: fadeAnim, padding: 0 }]}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, flexGrow: 1, justifyContent: 'center' }}>
                <Text style={styles.intranetTitle}>🏢 사내 기밀 인트라넷</Text>
                <Text style={styles.intranetSub}>ZTNA 보안 터널 연결됨 🟢</Text>
                
                <View style={styles.secretCard}>
                    <Text style={styles.secretLabel}>최고 기밀 문서 (Top Secret)</Text>
                    {isLoading ? (
                        <View style={{ marginTop: 10 }}>
                            <SkeletonLoader height={24} width="100%" style={{ marginBottom: 10 }} />
                            <SkeletonLoader height={24} width="70%" />
                        </View>
                    ) : (
                        <Text style={styles.secretText}>"{secretData}"</Text>
                    )}
                </View>

                <View style={styles.infoCard}>
                    <Text style={styles.infoLine}>접속자: {email}</Text>
                    <Text style={styles.infoLine}>인가 기기: {deviceId}</Text>
                    <Text style={styles.infoLine}>인가 IP: {ipAddress}</Text>
                </View>

                <TouchableOpacity style={styles.actionButtonSecondary} onPress={() => handleAttendance('check-in')} disabled={isLoading}>
                    <Text style={styles.buttonText}>🏢 출근하기 (모바일 사원증)</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButtonSecondary} onPress={() => handleAttendance('check-out')} disabled={isLoading}>
                    <Text style={styles.buttonText}>🏠 퇴근하기 (모바일 사원증)</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButton} onPress={downloadSecretPdf} disabled={isLoading}>
                    <Text style={styles.buttonText}>📄 기밀 PDF 다운로드</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.logoutButton, { marginTop: 20 }]} onPress={handleLogout}>
                    <Text style={styles.buttonText}>🔒 안전하게 연결 종료 (Logout)</Text>
                </TouchableOpacity>
            </ScrollView>
        </Animated.View>
    );
};