import React from 'react';
import Svg, { Rect, Path, G } from 'react-native-svg';

interface FridgeHandleSVGProps {
    width?: number;
    height?: number;
}

/**
 * FridgeHandleSVG - Standalone handle component
 * Normalized to internal viewBox 0 0 520 200
 */
export const FridgeHandleSVG: React.FC<FridgeHandleSVGProps> = ({ width = 390, height = 150 }) => {
    return (
        <Svg width={width} height={height} viewBox="0 0 520 200">
            <G>
                {/* Base handle piece */}
                <Rect x="10" y="5" width="200" height="190" rx="78" fill="#D6EEF7" stroke="#6B4B3E" strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" />
                {/* Long handle piece */}
                <Rect x="88" y="65" width="150" height="78" rx="39" fill="#C6E6F2" stroke="#6B4B3E" strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" />
                {/* Highlight line */}
                <Path d="M118 91 L200 91" fill="none" stroke="#FFFFFF" strokeWidth={14} strokeLinecap="round" opacity={0.35} />
            </G>
        </Svg>
    );
};
