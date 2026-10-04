import React from 'react';
import { Feather } from '@expo/vector-icons';
export const Icon = ({ name, size = 20, color, style }: { name: string, size?: number, color?: string, style?: any }) => {
    return <Feather name={name as any} size={size} color={color} style={style} />;
};

