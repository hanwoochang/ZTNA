//위치 수집

import * as Location from 'expo-location';

const GPS_TIMEOUT_MS = 2500;
const MAX_CACHE_AGE_MS = 5 * 60 * 1000; // 최근 5분 이내 좌표만 유효 캐시로 인정

let recentCoordsCache: { latitude: number; longitude: number; timestamp: number } | null = null;

export const getLocation = async (): Promise<{ latitude: number; longitude: number } | null> => {
    try {
        const perm = await Location.getForegroundPermissionsAsync();
        const status = perm.status === 'granted'
            ? 'granted'
            : (await Location.requestForegroundPermissionsAsync()).status;

        if (status !== 'granted') {
            console.log('[위치] 권한 거부됨');
            return null;
        }

        // 1순위: 실시간 위치 측정 시도 (최대 2.5초 대기하여 실내 20초 멈춤 방지)
        // 백그라운드에서 측정이 완료되면 recentCoordsCache를 최신화함
        const freshPromise = Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced
        }).then((loc) => {
            const coords = {
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude
            };
            recentCoordsCache = { ...coords, timestamp: Date.now() };
            return coords;
        });

        const timeoutPromise = new Promise<null>((resolve) =>
            setTimeout(() => resolve(null), GPS_TIMEOUT_MS)
        );

        const freshCoords = await Promise.race([freshPromise, timeoutPromise]);
        if (freshCoords) {
            return freshCoords;
        }

        // 2순위: 실내 수신 지연으로 2.5초 초과 시, 최근 5분 이내 OS 캐시 좌표 조회
        const lastKnown = await Location.getLastKnownPositionAsync({
            maxAge: MAX_CACHE_AGE_MS
        });
        if (lastKnown?.coords) {
            const coords = {
                latitude: lastKnown.coords.latitude,
                longitude: lastKnown.coords.longitude
            };
            recentCoordsCache = { ...coords, timestamp: Date.now() };
            return coords;
        }

        // 3순위: 앱 구동 중 최근 5분 이내에 측정 성공했던 메모리 캐시 폴백
        if (recentCoordsCache && Date.now() - recentCoordsCache.timestamp <= MAX_CACHE_AGE_MS) {
            return {
                latitude: recentCoordsCache.latitude,
                longitude: recentCoordsCache.longitude
            };
        }

        return null;
    } catch (error) {
        console.log('[위치] 수집 실패:', error);
        return null;
    }
};
