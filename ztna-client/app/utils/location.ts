//위치 수집

import * as Location from 'expo-location';

export const getLocation = async (): Promise<{ latitude: number; longitude: number } | null> => {
    try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            console.log('[위치] 권한 거부됨');
            return null;
        }
        const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced
        });
        return { latitude: location.coords.latitude, longitude: location.coords.longitude };
    } catch (error) {
        console.log('[위치] 수집 실패:', error);
        return null;
    }
};