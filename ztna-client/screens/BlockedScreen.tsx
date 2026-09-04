import React, { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import { useAppStyles } from '../styles/styles';

export const BlockedScreen = () => {
    const { styles } = useAppStyles();
    const scaleAnim = useRef(new Animated.Value(0.8)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 5,
                useNativeDriver: true,
            })
        ]).start();
    }, [fadeAnim, scaleAnim]);

    return (
        <View style={styles.container}>
            <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
                <Text style={styles.blockedTitle}>🚨 접근 차단</Text>
                <View style={styles.blockedCard}>
                    <Text style={styles.blockedText}>보안 위협이 감지된 기기입니다.</Text>
                    <Text style={styles.blockedSub}>루팅/탈옥된 기기는{'\n'}보안 정책에 의해 차단됩니다.</Text>
                </View>
            </Animated.View>
        </View>
    );
};