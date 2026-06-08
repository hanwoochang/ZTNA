import { View, Text } from 'react-native';
import { styles } from '../styles/styles';

export const BlockedScreen = () => (
    <View style={styles.container}>
        <Text style={styles.blockedTitle}>🚨 접근 차단</Text>
        <View style={styles.blockedCard}>
            <Text style={styles.blockedText}>보안 위협이 감지된 기기입니다.</Text>
            <Text style={styles.blockedSub}>루팅/탈옥된 기기는{'\n'}보안 정책에 의해 차단됩니다.</Text>
        </View>
    </View>
);