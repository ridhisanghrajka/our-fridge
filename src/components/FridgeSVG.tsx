import React from 'react';
import Svg, { Rect, G, Defs, LinearGradient, Stop, Filter, FeDropShadow, Line, Path } from 'react-native-svg';
import { Dimensions } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const FridgeSVG: React.FC = () => {
    // Original SVG dimensions
    // Original SVG dimensions - Increased width to center the 3D body
    const originalWidth = 1250;
    const originalHeight = 2532;

    // Calculate scale to fit screen
    const scale = Math.min(screenWidth / originalWidth, screenHeight / originalHeight);
    const scaledWidth = originalWidth * scale;
    const scaledHeight = originalHeight * scale;

    return (
        <Svg width={scaledWidth} height={scaledHeight} viewBox={`0 0 ${originalWidth} ${originalHeight}`}>
            <Defs>
                <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor="#DDF3FF" />
                    <Stop offset="100%" stopColor="#FFF6EA" />
                </LinearGradient>

                <LinearGradient id="fridgeFill" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor="#CFEAF2" />
                    <Stop offset="100%" stopColor="#B9DDE9" />
                </LinearGradient>

                <LinearGradient id="legFill" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor="#C9CED2" />
                    <Stop offset="100%" stopColor="#B6BBC0" />
                </LinearGradient>

                <LinearGradient id="legShade" x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0%" stopColor="#000000" stopOpacity="0.00" />
                    <Stop offset="100%" stopColor="#000000" stopOpacity={0.10} />
                </LinearGradient>

                <LinearGradient id="legHighlight" x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.28} />
                    <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0.00} />
                </LinearGradient>

                <Filter id="softShadow" x="-25%" y="-25%" width="150%" height="150%">
                    <FeDropShadow dx="0" dy="18" stdDeviation="22" floodColor="#000000" floodOpacity={0.12} />
                </Filter>
            </Defs>

            {/* Sky background */}
            <Rect width="1250" height="2532" fill="url(#sky)" />

            {/* Fridge legs */}
            <G opacity={0.95}>
                <G>
                    <Rect x="318" y="2138" width="120" height="105" rx="36" fill="url(#legFill)" stroke="#6B4B3E" strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" />
                    <Rect x="332" y="2152" width="34" height="77" rx="17" fill="url(#legHighlight)" />
                    <Rect x="382" y="2148" width="44" height="85" rx="22" fill="url(#legShade)" />
                </G>

                <G>
                    <Rect x="732" y="2138" width="120" height="105" rx="36" fill="url(#legFill)" stroke="#6B4B3E" strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" />
                    <Rect x="746" y="2152" width="34" height="77" rx="17" fill="url(#legHighlight)" />
                    <Rect x="796" y="2148" width="44" height="85" rx="22" fill="url(#legShade)" />
                </G>
            </G>

            {/* Fridge body */}
            <G filter="url(#softShadow)">
                {/* 3D Depth Body - Right side only */}
                <Rect x="220" y="300" width="890" height="1860" rx="160" fill="#7A9CA7" stroke="#6B4B3E" strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" />

                <Rect x="140" y="300" width="890" height="1860" rx="160" fill="url(#fridgeFill)" stroke="#6B4B3E" strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" />

                {/* Divider line */}
                <Line x1="210" y1="1899.0" x2="960" y2="1899.0" stroke="#9FC7D5" strokeWidth={12} strokeLinecap="round" opacity={0.65} />

                {/* Handle */}
                <G transform="scale(0.75)">
                    <Rect x="162" y="950" width="240" height="190" rx="78" fill="#D6EEF7" stroke="#6B4B3E" strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" />
                    <Rect x="260" y="1016" width="260" height="78" rx="39" fill="#C6E6F2" stroke="#6B4B3E" strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" />
                    <Path d="M300 1036 L444 1036" fill="none" stroke="#FFFFFF" strokeWidth={14} strokeLinecap="round" opacity={0.35} />
                </G>

                <Path d="M265 460 C265 410, 306 370, 356 370 L420 370" fill="none" stroke="#FFFFFF" strokeWidth={20} strokeLinecap="round" opacity={0.55} />
            </G>

            {/* Bottom safe area */}
            <Rect x="0" y="2300" width="1250" height="232" fill="transparent" />
        </Svg>
    );
};
