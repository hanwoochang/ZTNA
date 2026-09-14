import React, { useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, Keyboard, Animated, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useAppStyles } from '../styles/styles';

const Icon = ({ name, size = 20, color, style }: { name: string, size?: number, color?: string, style?: any }) => {
    let source;
    switch(name) {
        case 'shield': source = require('../assets/img/shield.svg'); break;
        case 'map-pin': source = require('../assets/img/map-pin.svg'); break;
        case 'smartphone': source = require('../assets/img/smartphone.svg'); break;
        case 'check-circle': source = require('../assets/img/check-circle.svg'); break;
        case 'log-in': source = require('../assets/img/log-in.svg'); break;
        default: source = require('../assets/img/check.svg'); break;
    }
    return <Image source={source} style={[{ width: size, height: size, tintColor: color }, style]} />;
};

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
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <KeyboardAvoidingView 
                style={{ flex: 1 }} 
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <Animated.View style={[styles.centerContainer, { opacity: fadeAnim }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 32, justifyContent: 'center' }}>
                            <Icon name="shield" size={32} color={colors.text} style={{ marginRight: 12 }} />
                            <Text style={[styles.title, { marginBottom: 0 }]}>Sign In</Text>
                        </View>
                        
                        <View style={styles.cardFeatured}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                <Icon name="map-pin" size={16} color={colors.subText} style={{ marginRight: 8 }} />
                                <Text style={styles.infoText}>IP: <Text style={styles.highlight}>{ipAddress}</Text></Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                <Icon name="smartphone" size={16} color={colors.subText} style={{ marginRight: 8 }} />
                                <Text style={styles.infoText}>Device: <Text style={styles.highlight}>{deviceId}</Text></Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
                                <Icon name="check-circle" size={16} color={colors.accent} style={{ marginRight: 6 }} />
                                <Text style={[styles.statusText, { marginTop: 0 }]}>Context Collected</Text>
                            </View>
                        </View>
                        
                        <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Email" placeholderTextColor={colors.subText} autoCapitalize="none" keyboardType="email-address" />
                        <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Password" placeholderTextColor={colors.subText} secureTextEntry />
                        
                        <TouchableOpacity style={[styles.button, { marginTop: 16, flexDirection: 'row', justifyContent: 'center' }]} onPress={handleLogin}>
                            <Icon name="log-in" size={20} color={colors.onPrimary} style={{ marginRight: 8 }} />
                            <Text style={styles.buttonText}>Continue</Text>
                        </TouchableOpacity>
                    </Animated.View>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};