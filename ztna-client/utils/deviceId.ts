//기기 식별

import * as Application from 'expo-application';
import * as SecureStore from 'expo-secure-store';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { randomUUID } from 'expo-crypto';

export const getDeviceId = async (): Promise<string> => {
    if (Platform.OS === 'ios') {
        const vendorId = await Application.getIosIdForVendorAsync();
        return vendorId ?? 'ios-unknown';
    }
    if (Platform.OS === 'android') {
        const androidId = await Application.getAndroidId();
        return androidId ?? 'android-unknown';
    }
    if (Platform.OS === 'web') {
        try {
            const stored = localStorage.getItem('web_device_id');
            if (stored) return stored;
            const newId = `web-${randomUUID()}`;
            localStorage.setItem('web_device_id', newId);
            return newId;
        } catch {
            return `web-${randomUUID()}`;
        }
    }
    return `unknown-${Device.modelName ?? 'device'}`;
};