import React, { useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, Keyboard, Animated, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useAppStyles } from '../styles/styles';

import { Feather } from '@expo/vector-icons';

const Icon = ({ name, size = 20, color, style }: { name: string, size?: number, color?: string, style?: any }) => {
    return <Feather name={name as any} size={size} color={color} style={style} />;
};

type Props = {
    otp: string;
    setOtp: (otp: string) => void;
    otpError?: string;
    isLoading?: boolean;
    handleVerifyOtp: () => void;
    handleResendOtp: () => void;
    onBack: () => void;
};

export const OtpScreen = ({ otp, setOtp, otpError, isLoading, handleVerifyOtp, handleResendOtp, onBack }: Props) => {
    const { styles, colors } = useAppStyles();
    const slideAnim = useRef(new Animated.Value(50)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.spring(slideAnim, {
                toValue: 0,
                friction: 6,
                tension: 40,
                useNativeDriver: true,
            })
        ]).start();
    }, [fadeAnim, slideAnim]);

    const formContent = (
        <Animated.View style={[styles.centerContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 32, justifyContent: 'center' }}>
                <Icon name="key" size={32} color={colors.text} style={{ marginRight: 12 }} />
                <Text style={[styles.title, { marginBottom: 0 }]}>Verification</Text>
            </View>
            
            <View style={styles.otpBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                    <Icon name="shield" size={24} color={colors.danger} style={{ marginRight: 8 }} />
                    <Text style={[styles.otpAlert, { marginBottom: 0 }]}>New Device Detected</Text>
                </View>
                <Text style={[styles.infoText, { color: colors.text }]}>Please enter the 6-digit code sent to your email.</Text>
                <Text style={styles.hintText}>(Expires in 3 minutes)</Text>
            </View>
            
            {!!otpError && (
                <Text style={{ color: colors.danger, marginBottom: 8, fontSize: 13, alignSelf: 'flex-start' }}>
                    {otpError}
                </Text>
            )}

            <TextInput
                style={[styles.input, !!otpError && { borderColor: colors.danger, borderWidth: 1 }]}
                value={otp}
                onChangeText={setOtp}
                placeholder="6-digit code"
                placeholderTextColor={colors.subText}
                keyboardType="number-pad"
                maxLength={6} 
            />
            
            <TouchableOpacity 
                style={[styles.button, { marginTop: 16, flexDirection: 'row', justifyContent: 'center', opacity: isLoading ? 0.7 : 1 }]} 
                onPress={handleVerifyOtp}
                disabled={isLoading}
            >
                <Icon name="key" size={20} color={colors.onPrimary} style={{ marginRight: 8 }} />
                <Text style={styles.buttonText}>{isLoading ? 'Verifying...' : 'Verify & Proceed'}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
                style={{ marginTop: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', opacity: isLoading ? 0.5 : 1 }} 
                onPress={handleResendOtp}
                disabled={isLoading}
            >
                <Icon name="refresh-cw" size={16} color={colors.subText} style={{ marginRight: 8 }} />
                <Text style={[styles.linkText, { marginTop: 0 }]}>Resend Code</Text>
            </TouchableOpacity>

            <TouchableOpacity 
                style={{ marginTop: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }} 
                onPress={() => { Keyboard.dismiss(); onBack(); }}
            >
                <Icon name="arrow-left" size={16} color={colors.subText} style={{ marginRight: 8 }} />
                <Text style={[styles.linkText, { marginTop: 0 }]}>Back to Login</Text>
            </TouchableOpacity>
        </Animated.View>
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <KeyboardAvoidingView 
                style={{ flex: 1 }} 
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                {Platform.OS === 'web' ? (
                    formContent
                ) : (
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        {formContent}
                    </TouchableWithoutFeedback>
                )}
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};