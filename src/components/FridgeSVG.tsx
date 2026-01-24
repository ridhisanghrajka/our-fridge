import React from 'react';
import Svg, { Rect, G, Defs, LinearGradient, Stop, Filter, FeDropShadow, Line, Path } from 'react-native-svg';
import { Dimensions } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface FridgeSVGProps {
    scale?: number;
}

export const FridgeSVG: React.FC<FridgeSVGProps> = ({ scale: manualScale }) => {
    // Original SVG dimensions
    // Original SVG dimensions - Increased width to center the 3D body
    const originalWidth = 1280;
    const originalHeight = 2532;

    // Calculate scale to fit screen
    const scale = manualScale || Math.min(screenWidth / originalWidth, screenHeight / originalHeight);
    const scaledWidth = originalWidth * scale;
    const scaledHeight = originalHeight * scale;

    return (
        <Svg width={scaledWidth} height={scaledHeight} viewBox={`0 0 1280 2532`}>
            <Defs>
                <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor="#DDF3FF" />
                    <Stop offset="100%" stopColor="#FFF6EA" />
                </LinearGradient>

                <LinearGradient id="fridgeFill" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor="#CFEAF2" />
                    <Stop offset="100%" stopColor="#b9dde9ff" />
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


            </Defs>

            {/* Sky background */}
            <Rect width="1280" height="2532" fill="url(#sky)" />

            {/* Fridge legs */}
            <G opacity={0.95}>
                <G>
                    <Rect x="260" y="2138" width="120" height="105" rx="36" fill="url(#legFill)" stroke="#6B4B3E" strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" />
                    <Rect x="274" y="2152" width="34" height="77" rx="17" fill="url(#legHighlight)" />
                    <Rect x="324" y="2148" width="44" height="85" rx="22" fill="url(#legShade)" />
                </G>

                <G>
                    <Rect x="820" y="2138" width="120" height="105" rx="36" fill="url(#legFill)" stroke="#6B4B3E" strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" />
                    <Rect x="834" y="2152" width="34" height="77" rx="17" fill="url(#legHighlight)" />
                    <Rect x="884" y="2148" width="44" height="85" rx="22" fill="url(#legShade)" />
                </G>
            </G>

            {/* Fridge body */}
            <G>
                {/* 3D Depth Body - Right side only */}
                <Rect x="130" y="300" width="1100" height="1860" rx="160" fill="#8FBFCCFF" stroke="#6B4B3E" strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" />

                <Rect x="50" y="300" width="1100" height="1860" rx="160" fill="url(#fridgeFill)" stroke="#6B4B3E" strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" />

                {/* Divider line */}
                <Line x1="64" y1="1899.0" x2="1136" y2="1899.0" stroke="#6B4B3E" strokeWidth={12} strokeLinecap="round" opacity={0.65} />
                <Line x1="1154" y1="1899.0" x2="1222" y2="1865.0" stroke="#6B4B3E" strokeWidth={12} strokeLinecap="round" opacity={0.65} />

                <Path d="M175 460 C175 410, 216 370, 266 370 L330 370" fill="none" stroke="#FFFFFF" strokeWidth={20} strokeLinecap="round" opacity={0.55} />
            </G>

            {/* Bottom safe area */}
            <Rect x="0" y="2300" width="1280" height="232" fill="transparent" />
        </Svg>
    );
};
