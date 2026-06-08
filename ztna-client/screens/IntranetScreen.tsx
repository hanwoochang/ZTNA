import { View, Text, TouchableOpacity } from 'react-native';
import { styles } from '../styles/styles';

type Props = {
    email: string;
    deviceId: string;
    ipAddress: string;
    secretData: string;
    handleLogout: () => void;
};

export const IntranetScreen = ({ email, deviceId, ipAddress, secretData, handleLogout }: Props) => (
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
);