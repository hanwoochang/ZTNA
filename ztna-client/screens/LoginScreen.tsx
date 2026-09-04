import React, { useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, Keyboard, Animated } from 'react-native';
import { useAppStyles } from '../styles/styles';

type Props = {
    email: string;
    setEmail: (email: string) => void;
    password: string;
    setPassword: (password: string) => void;
    ipAddress: string;
    deviceId: string;
    handleLogin: () => void;
};

export const LoginScreen = ({ email, setEmail, password, setPassword, ipAddress, deviceId, handleLogin }: Props) => {
    const { styles, colors } = useAppStyles();
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
        }).start();
    }, [fadeAnim]);

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
                <Text style={styles.title}>🛡️ ZTNA 보안 에이전트</Text>
                <View style={styles.dashboard}>
                    <Text style={styles.infoText}>📍 현재 IP: <Text style={styles.highlight}>{ipAddress}</Text></Text>
                    <Text style={styles.infoText}>📱 내 기기: <Text style={styles.highlight}>{deviceId}</Text></Text>
                    <Text style={styles.statusText}>🟢 상태: 컨텍스트 수집 완료</Text>
                </View>
                <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="이메일" placeholderTextColor={colors.subText} autoCapitalize="none" />
                <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="비밀번호" placeholderTextColor={colors.subText} secureTextEntry />
                <TouchableOpacity style={styles.button} onPress={handleLogin}>
                    <Text style={styles.buttonText}>안전하게 로그인 및 기밀망 접속</Text>
                </TouchableOpacity>
            </Animated.View>
        </TouchableWithoutFeedback>
    );
};