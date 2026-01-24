import React from 'react';
import { Image } from 'react-native';
import { Image as SvgImage } from 'react-native-svg';

interface CountryMagnetProps {
    country: string;
    x: number;
    y: number;
    scale?: number;
}

/**
 * CountryMagnet Component
 * Renders a country-themed magnet from PNG assets within the canvas coordinate system.
 */
export const CountryMagnet: React.FC<CountryMagnetProps> = ({ country, x, y, scale = 1 }) => {
    // Determine image and aspect ratio based on country
    let imageSource;
    let baseWidth = 1000;
    let baseHeight = 600;

    switch (country) {
        case 'uk':
            imageSource = require('../assets/uk_magnet.png');
            baseWidth = 320;
            baseHeight = 420;
            break;
        case 'germany':
            imageSource = require('../assets/germany_magnet.png');
            baseWidth = 350;
            baseHeight = 440;
            break;
        case 'canada':
            imageSource = require('../assets/canada_magnet.png');
            baseWidth = 450;
            baseHeight = 300;
            break;
        case 'australia':
            imageSource = require('../assets/australia_magnet.png');
            baseWidth = 420;
            baseHeight = 300;
            break;
        case 'usa':
        default:
            imageSource = require('../assets/usa_magnet.png');
            baseWidth = 500;
            baseHeight = 300;
            break;
    }

    const width = baseWidth * scale;
    const height = baseHeight * scale;

    // Center the image at x,y
    const xPos = x - (width / 2);
    const yPos = y - (height / 2);

    const uri = Image.resolveAssetSource(imageSource).uri;

    return (
        <SvgImage
            x={xPos}
            y={yPos}
            width={width}
            height={height}
            href={uri}
            preserveAspectRatio="xMidYMid meet"
        />
    );
};
