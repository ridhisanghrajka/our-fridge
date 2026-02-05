import React from 'react';
import Svg, { Rect, G, Defs, LinearGradient, Stop, Filter, FeDropShadow, Path, Circle, Line, Text } from 'react-native-svg';

interface NotepadSVGProps {
    width?: number;
    height?: number;
    title?: string;
}

export const NotepadSVG: React.FC<NotepadSVGProps> = ({ width = 1000, height = 1600, title }) => {
    return (
        <Svg width={width} height={height} viewBox="0 0 1000 1600">
            <Defs>
                <Filter id="paperShadow" x="-20%" y="-20%" width="140%" height="140%">
                    <FeDropShadow dx="0" dy="14" stdDeviation="16" floodColor="#000000" floodOpacity={0.10} />
                </Filter>

                <LinearGradient id="paperFill" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor="#FFF7EE" />
                    <Stop offset="100%" stopColor="#F6EDE3" />
                </LinearGradient>

                <LinearGradient id="paperInner" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.55} />
                    <Stop offset="100%" stopColor="#000000" stopOpacity={0.05} />
                </LinearGradient>

                <LinearGradient id="clipFill" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor="#F1B08B" />
                    <Stop offset="100%" stopColor="#E79B74" />
                </LinearGradient>

                <Filter id="clipShadow" x="-30%" y="-30%" width="160%" height="160%">
                    <FeDropShadow dx="0" dy="10" stdDeviation="10" floodColor="#000000" floodOpacity={0.12} />
                </Filter>
            </Defs>

            {/* Paper */}
            <G>
                <Path d="M74.5 80 Q500 0 925.5 80 Q970 85 970 120 V1450 Q970 1515 887.5 1530 Q500 1585 112.5 1530 Q30 1515 30 1450 V120 Q30 85 74.5 80 Z"
                    fill="url(#paperFill)" stroke="#6B4B3E" strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" />

                <Path d="M74.5 80 Q500 0 925.5 80 Q970 85 970 120 V1450 Q970 1515 887.5 1530 Q500 1585 112.5 1530 Q30 1515 30 1450 V120 Q30 85 74.5 80 Z"
                    fill="url(#paperInner)" opacity={0.40} />
            </G>

            {/* Clip */}
            <G filter="url(#clipShadow)" transform="translate(0 -30)">
                <Path d="M415 55 Q500 10 585 55 Q610 70 610 95 V155 Q610 185 580 185 H420 Q390 185 390 155 V95 Q390 70 415 55 Z"
                    fill="url(#clipFill)" stroke="#6B4B3E" strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" />
                <Circle cx="500" cy="112" r="18" fill="#F7E7DC" stroke="#6B4B3E" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
                <Circle cx="500" cy="112" r="6" fill="#6B4B3E" opacity={0.45} />
            </G>

            {/* Header panel */}
            <G transform="translate(100 115)">
                <Path d="M40 0 H760 Q800 0 800 40 V150 Q800 185 765 185 H35 Q0 185 0 150 V40 Q0 0 40 0 Z"
                    fill="#F3E3D7" stroke="#6B4B3E" strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" />
                {title && (
                    <Text
                        x="400"
                        y="95"
                        fill="#6B4B3E"
                        fontSize="42"
                        fontFamily="Poppins-SemiBold"
                        textAnchor="middle"
                    >
                        {title}
                    </Text>
                )}
                <Path d="M0 150 Q50 185 100 150 Q150 185 200 150 Q250 185 300 150 Q350 185 400 150 Q450 185 500 150 Q550 185 600 150 Q650 185 700 150 Q750 185 800 150"
                    fill="none" stroke="#6B4B3E" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
            </G>

            {/* Checkbox + line rows - Removed to allow dynamic list items to render their own lines */}
            <G transform="translate(130 380)" />

            {/* Notes area */}
            <G transform="translate(100 1030)">
                <Rect x="0" y="0" width="800" height="480" rx="26"
                    fill="none" stroke="#C9B2A3" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="14 18" opacity={0.75} />
            </G>
        </Svg>
    );
};
