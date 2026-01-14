import React from 'react';
import Svg, { Rect, G, Defs, LinearGradient, Stop, Filter, FeDropShadow, Path, Circle, Line } from 'react-native-svg';

interface NotepadSVGProps {
    width?: number;
    height?: number;
}

export const NotepadSVG: React.FC<NotepadSVGProps> = ({ width = 820, height = 1600 }) => {
    return (
        <Svg width={width} height={height} viewBox="0 0 820 1600">
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
                <Path d="M115 120 Q410 40 705 120 Q740 125 740 160 V1450 Q740 1515 675 1530 Q410 1585 145 1530 Q80 1515 80 1450 V160 Q80 125 115 120 Z"
                    fill="url(#paperFill)" stroke="#6B4B3E" strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" />

                <Path d="M115 120 Q410 40 705 120 Q740 125 740 160 V1450 Q740 1515 675 1530 Q410 1585 145 1530 Q80 1515 80 1450 V160 Q80 125 115 120 Z"
                    fill="url(#paperInner)" opacity={0.40} />
            </G>

            {/* Clip */}
            <G filter="url(#clipShadow)">
                <Path d="M325 55 Q410 10 495 55 Q520 70 520 95 V155 Q520 185 490 185 H330 Q300 185 300 155 V95 Q300 70 325 55 Z"
                    fill="url(#clipFill)" stroke="#6B4B3E" strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" />
                <Circle cx="410" cy="112" r="18" fill="#F7E7DC" stroke="#6B4B3E" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
                <Circle cx="410" cy="112" r="6" fill="#6B4B3E" opacity={0.45} />
            </G>

            {/* Header panel */}
            <G transform="translate(140 155)">
                <Path d="M40 0 H500 Q540 0 540 40 V150 Q540 185 505 185 H35 Q0 185 0 150 V40 Q0 0 40 0 Z"
                    fill="#F3E3D7" stroke="#6B4B3E" strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" />
                <Path d="M0 150 Q35 178 70 150 Q105 178 140 150 Q175 178 210 150 Q245 178 280 150 Q315 178 350 150 Q385 178 420 150 Q455 178 490 150 Q515 170 540 150"
                    fill="none" stroke="#6B4B3E" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
            </G>

            {/* Checkbox + line rows - Removed to allow dynamic list items to render their own lines */}
            <G transform="translate(130 380)" />

            {/* Notes area */}
            <G transform="translate(150 1100)">
                <Rect x="0" y="0" width="520" height="260" rx="26"
                    fill="none" stroke="#C9B2A3" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="14 18" opacity={0.75} />
                <Path d="M40 70 Q120 40 220 70 T420 70"
                    fill="none" stroke="#DCC8B9" strokeWidth={16}
                    opacity={0.12} strokeLinecap="round" />
                <Path d="M60 150 Q170 120 280 150 T460 150"
                    fill="none" stroke="#DCC8B9" strokeWidth={14}
                    opacity={0.10} strokeLinecap="round" />
            </G>
        </Svg>
    );
};
