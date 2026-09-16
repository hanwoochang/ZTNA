//배터리, 네트워크

import * as Battery from 'expo-battery';
import * as Network from 'expo-network';
import * as Storage from './storage';

export type DeviceContext = {
    isWifi: boolean;
    batteryLevel: number;
    previousBatteryLevel: number | null;
};

export const getDeviceContext = async (): Promise<DeviceContext> => {
    const networkState = await Network.getNetworkStateAsync();
    const isWifi = networkState.type === Network.NetworkStateType.WIFI;
    const batteryLevel = await Battery.getBatteryLevelAsync();

    let previousBatteryLevel: number | null = null;
    try {
        const stored = await Storage.getItemAsync('battery_level');
        if (stored) previousBatteryLevel = parseFloat(stored);
    } catch {}

    await Storage.setItemAsync('battery_level', batteryLevel.toString());
    return { isWifi, batteryLevel, previousBatteryLevel };
};