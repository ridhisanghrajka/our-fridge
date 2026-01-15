import React, { useRef, useState, useEffect } from 'react';
import { View, PanResponder, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface Point {
    x: number;
    y: number;
}

interface DrawingCanvasProps {
    width: number;
    height: number;
    initialPaths?: string[]; // Array of SVG paths
    onDrawingUpdate?: (paths: string[]) => void;
    readOnly?: boolean;
    strokeColor?: string;
    strokeWidth?: number;
    scale?: number;
}

const VIRTUAL_SIZE = 1000;

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
    width,
    height,
    initialPaths = [],
    onDrawingUpdate,
    readOnly = false,
    strokeColor = '#6B4B3E',
    strokeWidth = 15, // Increased for better visibility
}) => {
    const [paths, setPaths] = useState<string[]>([]);
    const [currentPath, setCurrentPath] = useState<string>('');
    const pathsRef = useRef<string[]>([]);
    const currentPathRef = useRef<string>('');
    const containerRef = useRef<View>(null);
    const sizeRef = useRef({ width, height });

    // Keep sizeRef in sync with props
    useEffect(() => {
        sizeRef.current = { width, height };
    }, [width, height]);

    useEffect(() => {
        if (initialPaths && initialPaths.length > 0) {
            setPaths(initialPaths);
            pathsRef.current = initialPaths;
        } else {
            setPaths([]);
            pathsRef.current = [];
        }
    }, [initialPaths]);

    // Map pixel coordinates to virtual coordinates
    const toVirtual = (pixelX: number, pixelY: number) => {
        return {
            x: (pixelX / sizeRef.current.width) * VIRTUAL_SIZE,
            y: (pixelY / sizeRef.current.height) * VIRTUAL_SIZE
        };
    };

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => !readOnly,
            onMoveShouldSetPanResponder: () => !readOnly,
            onPanResponderGrant: (evt) => {
                if (readOnly) return;
                const { locationX, locationY } = evt.nativeEvent;
                const v = toVirtual(locationX, locationY);
                const path = `M ${v.x.toFixed(1)} ${v.y.toFixed(1)} L ${v.x.toFixed(1)} ${v.y.toFixed(1)}`;
                currentPathRef.current = path;
                setCurrentPath(path);
            },
            onPanResponderMove: (evt) => {
                if (readOnly) return;
                const { locationX, locationY } = evt.nativeEvent;
                const v = toVirtual(locationX, locationY);
                const newPath = `${currentPathRef.current} L ${v.x.toFixed(1)} ${v.y.toFixed(1)}`;
                currentPathRef.current = newPath;
                setCurrentPath(newPath);
            },
            onPanResponderRelease: () => {
                if (readOnly) return;
                if (currentPathRef.current) {
                    const updatedPaths = [...pathsRef.current, currentPathRef.current];
                    pathsRef.current = updatedPaths;
                    setPaths(updatedPaths);
                    currentPathRef.current = '';
                    setCurrentPath('');
                    onDrawingUpdate?.(updatedPaths);
                }
            },
        })
    ).current;

    return (
        <View
            ref={containerRef}
            style={[styles.container, { width, height }]}
            {...(readOnly ? {} : panResponder.panHandlers)}
            pointerEvents={readOnly ? 'none' : 'auto'}
        >
            <Svg
                width={width}
                height={height}
                viewBox={`0 0 ${VIRTUAL_SIZE} ${VIRTUAL_SIZE}`}
                pointerEvents="none"
            >
                {paths.map((path, index) => (
                    <Path
                        key={index}
                        d={path}
                        stroke={strokeColor}
                        strokeWidth={strokeWidth}
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                ))}
                {currentPath ? (
                    <Path
                        d={currentPath}
                        stroke={strokeColor}
                        strokeWidth={strokeWidth}
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                ) : null}
            </Svg>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'transparent',
    },
});
