import React, { useRef, useState, useEffect } from 'react';
import { View, PanResponder, StyleSheet, TextInput, Platform, TouchableWithoutFeedback, Animated } from 'react-native';
import Svg, { Path, Text as SvgText, G, Circle, Rect } from 'react-native-svg';
import { CanvasElement } from '../types/SharedNote';
import { CountryMagnet } from './CountryMagnet';

const VIRTUAL_WIDTH = 1000;

interface NoteCanvasProps {
    width: number;
    height: number;
    elements: CanvasElement[];
    currentTool: 'pen' | 'text' | 'eraser' | 'magnet';
    onElementsChange: (elements: CanvasElement[]) => void;
    readOnly?: boolean;
    strokeColor?: string;
    strokeWidth?: number;
    selectedMagnetType?: string;
}

export const NoteCanvas: React.FC<NoteCanvasProps> = ({
    width,
    height,
    elements = [],
    currentTool,
    onElementsChange,
    readOnly = false,
    strokeColor = '#6B4B3E',
    strokeWidth = 15,
    selectedMagnetType = 'usa',
}) => {
    // Proportional virtual height
    const virtualHeight = (height / width) * VIRTUAL_WIDTH;

    // Canvas State
    const [currentPath, setCurrentPath] = useState<string>('');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isTyping, setIsTyping] = useState(false);
    const [typingText, setTypingText] = useState('');
    const [typingPos, setTypingPos] = useState({ x: 0, y: 0 });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [animatingMagnetId, setAnimatingMagnetId] = useState<string | null>(null);
    const [snapAnimScale, setSnapAnimScale] = useState<number>(1);
    
    // Animation for snap effect
    const snapAnimValue = useRef(new Animated.Value(1)).current;
    
    // Listen to animation value changes and update state for re-rendering
    useEffect(() => {
        const listenerId = snapAnimValue.addListener(({ value }) => {
            setSnapAnimScale(value);
        });
        return () => {
            snapAnimValue.removeListener(listenerId);
        };
    }, []);

    // Refs for real-time tracking
    const currentPathRef = useRef<string>('');
    const sizeRef = useRef({ width, height });
    const toolRef = useRef(currentTool);
    const elementsRef = useRef(elements);
    const selectedIdRef = useRef<string | null>(null);
    const isTypingRef = useRef(false);
    const editingIdRef = useRef<string | null>(null);
    const selectedMagnetTypeRef = useRef(selectedMagnetType);

    // Tracking for smoother drawing
    const activeTouchId = useRef<number | null>(null);
    const lastPoint = useRef<{x: number, y: number} | null>(null);
    const activePathRef = useRef<any>(null);

    // Transformation refs
    const isDraggingRef = useRef(false);
    const isScalingRef = useRef(false);
    const initialPosRef = useRef({ x: 0, y: 0 });
    const initialElementRef = useRef<CanvasElement | null>(null);
    const wasDeselectedRef = useRef(false);
    const isPinchingRef = useRef(false);
    const initialPinchDistRef = useRef(0);
    const hasMovedRef = useRef(false);
    const initialSelectedIdRef = useRef<string | null>(null);

    useEffect(() => {
        sizeRef.current = { width, height };
    }, [width, height]);

    useEffect(() => {
        selectedMagnetTypeRef.current = selectedMagnetType;
    }, [selectedMagnetType]);

    useEffect(() => {
        toolRef.current = currentTool;
        setSelectedId(null);
        selectedIdRef.current = null;
    }, [currentTool]);

    useEffect(() => {
        elementsRef.current = elements;
    }, [elements]);

    useEffect(() => {
        isTypingRef.current = isTyping;
    }, [isTyping]);

    useEffect(() => {
        editingIdRef.current = editingId;
    }, [editingId]);

    const toVirtual = (pixelX: number, pixelY: number) => {
        const { width: w, height: h } = sizeRef.current;
        return {
            x: (pixelX / w) * VIRTUAL_WIDTH,
            y: (pixelY / h) * virtualHeight
        };
    };

    const calcDist = (t1: any, t2: any) => {
        const dx = t1.locationX - t2.locationX;
        const dy = t1.locationY - t2.locationY;
        return Math.sqrt(dx * dx + dy * dy);
    };

    const getBoxSize = (el: CanvasElement) => {
        if (el.type === 'text') {
            const charWidth = (el.size || 210) * 0.6;
            const w = Math.max(150, (el.data.length * charWidth) + 40);
            const h = Math.max(100, (el.size || 210) + 40);
            return { w: w * (el.scale || 1), h: h * (el.scale || 1) };
        }
        if (el.type === 'magnet') {
            const scale = el.scale || 1;
            // Map aspect ratios to coordinate system (VIRTUAL_SIZE = 1000)
            // We scale these down so the selection box is tight around the visual sticker
            switch (el.data) {
                case 'uk': return { w: 320 * scale, h: 420 * scale };
                case 'germany': return { w: 350 * scale, h: 440 * scale };
                case 'canada': return { w: 450 * scale, h: 300 * scale };
                case 'australia': return { w: 420 * scale, h: 300 * scale };
                case 'usa': return { w: 500 * scale, h: 300 * scale };
                default:
                    const s = (el.size || 60) * scale;
                    return { w: s, h: s };
            }
        }
        if (el.type === 'path') {
            // Parse path for bounding box
            const points = el.data.match(/[-+]?[0-9]*\.?[0-9]+/g);
            if (points && points.length >= 2) {
                let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
                for (let i = 0; i < points.length; i += 2) {
                    const x = parseFloat(points[i]);
                    const y = parseFloat(points[i + 1]);
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
                return { 
                    w: Math.max(20, maxX - minX), 
                    h: Math.max(20, maxY - minY) 
                };
            }
        }
        return { w: 0, h: 0 };
    };

    const getBoxCenter = (el: CanvasElement) => {
        if (el.type === 'path') {
            const points = el.data.match(/[-+]?[0-9]*\.?[0-9]+/g);
            if (points && points.length >= 2) {
                let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
                for (let i = 0; i < points.length; i += 2) {
                    const x = parseFloat(points[i]);
                    const y = parseFloat(points[i + 1]);
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
                return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
            }
        }
        let x = el.x || 0;
        let y = el.y || 0;
        if (el.type === 'text') {
            const scale = el.scale || 1;
            const size = (el.size || 50) * scale;
            // Shift box center slightly up to align with visual text center
            y -= (size * 0.05);
        }
        return { x, y };
    };

    const isHit = (el: CanvasElement, v: { x: number, y: number }, padding = 0) => {
        const { w, h } = getBoxSize(el);
        const { x, y } = getBoxCenter(el);
        return Math.abs(v.x - x) < (w / 2 + padding) && Math.abs(v.y - y) < (h / 2 + padding);
    };

    const finishTyping = () => {
        if (typingText.trim()) {
            if (editingIdRef.current) {
                // Update existing
                const updated = elementsRef.current.map(el =>
                    el.id === editingIdRef.current ? { ...el, data: typingText.trim() } : el
                );
                onElementsChange(updated);
            } else {
                // Create new
                const newId = `text-${Date.now()}`;
                const newElement: CanvasElement = {
                    id: newId,
                    type: 'text',
                    data: typingText.trim(),
                    x: typingPos.x,
                    y: typingPos.y,
                    color: strokeColor,
                    size: 210,
                    scale: 1
                };
                onElementsChange([...elementsRef.current, newElement]);
                setSelectedId(newId);
                selectedIdRef.current = newId;
            }
        }
        setIsTyping(false);
        setTypingText('');
        setEditingId(null);
    };

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => !readOnly && !isTypingRef.current,
            onMoveShouldSetPanResponder: (evt) => {
                if (readOnly || isTypingRef.current) return false;
                // Capture move to allow fluid selection and dragging/scaling/pinching
                return true;
            },
            onPanResponderGrant: (evt) => {
                const { locationX, locationY, touches, identifier } = evt.nativeEvent;
                const v = toVirtual(locationX, locationY);

                // Lock the touch ID to prevent palm interference or multiple finger glitching
                activeTouchId.current = identifier;
                lastPoint.current = v;

                initialPosRef.current = v;
                isDraggingRef.current = false;
                isScalingRef.current = false;
                isPinchingRef.current = false;
                wasDeselectedRef.current = false;
                hasMovedRef.current = false;
                initialSelectedIdRef.current = selectedIdRef.current;

                // 0. Pinch Check
                if (touches.length === 2 && selectedIdRef.current) {
                    const selected = elementsRef.current.find(el => el.id === selectedIdRef.current);
                    if (selected) {
                        isPinchingRef.current = true;
                        initialPinchDistRef.current = calcDist(touches[0], touches[1]);
                        initialElementRef.current = { ...selected };
                        return;
                    }
                }

                // 1. Tool Specific Start
                if (toolRef.current === 'pen') {
                    const path = `M ${v.x.toFixed(1)} ${v.y.toFixed(1)}`;
                    currentPathRef.current = path;
                    setCurrentPath(path);
                    return;
                }

                // 2. Transform Selection / Interaction
                const selected = elementsRef.current.find(el => el.id === selectedIdRef.current);
                if (selected) {
                    const handleSize = 40;
                    const { w, h } = getBoxSize(selected);
                    const { x: elX, y: elY } = getBoxCenter(selected);
                    const halfW = w / 2;
                    const halfH = h / 2;
                    const hOffset = halfW + 5;
                    const vOffset = halfH + 5;

                    // Check all 4 corners
                    const corners = [
                        { x: elX - hOffset, y: elY - vOffset },
                        { x: elX + hOffset, y: elY - vOffset },
                        { x: elX - hOffset, y: elY + vOffset },
                        { x: elX + hOffset, y: elY + vOffset },
                    ];

                    const hitCorner = corners.find(c => Math.abs(v.x - c.x) < handleSize && Math.abs(v.y - c.y) < handleSize);

                    if (hitCorner) {
                        isScalingRef.current = true;
                        initialElementRef.current = { ...selected };
                        return;
                    }

                    // Check if clicking body for dragging
                    if (isHit(selected, v)) {
                        isDraggingRef.current = true;
                        initialElementRef.current = { ...selected };
                        return;
                    }
                }

                // 3. New Selection or Tool Action
                const hit = elementsRef.current.find(el => isHit(el, v, toolRef.current === 'eraser' ? 30 : 0));

                if (hit) {
                    if (toolRef.current === 'eraser') {
                        onElementsChange(elementsRef.current.filter(el => el.id !== hit.id));
                    } else {
                        // Only select text and magnets for transformation
                        if (hit.type !== 'path') {
                            setSelectedId(hit.id);
                            selectedIdRef.current = hit.id;
                            // Allow immediate dragging
                            isDraggingRef.current = true;
                            initialElementRef.current = { ...hit };
                        }
                    }
                } else {
                    if (selectedIdRef.current) {
                        wasDeselectedRef.current = true;
                    }
                    setSelectedId(null);
                    selectedIdRef.current = null;
                }
            },
            onPanResponderMove: (evt) => {
                if (readOnly || isTypingRef.current) return;
                const { touches, locationX, locationY, identifier } = evt.nativeEvent;

                // Only respond to the finger that started the interaction
                if (identifier !== activeTouchId.current) return;

                if (isPinchingRef.current && touches.length === 2 && initialElementRef.current) {
                    hasMovedRef.current = true;
                    const currentDist = calcDist(touches[0], touches[1]);
                    if (initialPinchDistRef.current > 0) {
                        const newScale = Math.max(0.1, (initialElementRef.current.scale || 1) * (currentDist / initialPinchDistRef.current));
                        const updated = elementsRef.current.map(el =>
                            el.id === selectedIdRef.current ? { ...el, scale: newScale } : el
                        );
                        onElementsChange(updated);
                    }
                    return;
                }

                const v = toVirtual(locationX, locationY);
                const dx = v.x - initialPosRef.current.x;
                const dy = v.y - initialPosRef.current.y;

                if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
                    hasMovedRef.current = true;
                }

                if (toolRef.current === 'pen') {
                    // Distance filter to reduce jitter and coordinate jumping
                    if (lastPoint.current) {
                        const dist = Math.sqrt(Math.pow(v.x - lastPoint.current.x, 2) + Math.pow(v.y - lastPoint.current.y, 2));
                        if (dist < 3) return; // Only add points if moved at least 3 virtual pixels
                    }

                    const newPath = `${currentPathRef.current} L ${v.x.toFixed(1)} ${v.y.toFixed(1)}`;
                    currentPathRef.current = newPath;
                    lastPoint.current = v;
                    
                    // Use setNativeProps for direct SVG update without full React re-render
                    activePathRef.current?.setNativeProps({ d: newPath });
                } else if (toolRef.current === 'eraser') {
                    const hit = elementsRef.current.find(el => isHit(el, v, 30));
                    if (hit) {
                        onElementsChange(elementsRef.current.filter(el => el.id !== hit.id));
                    }
                } else if (isDraggingRef.current && initialElementRef.current) {
                    const dx = v.x - initialPosRef.current.x;
                    const dy = v.y - initialPosRef.current.y;
                    const updated = elementsRef.current.map(el =>
                        el.id === selectedIdRef.current
                            ? { ...el, x: initialElementRef.current!.x! + dx, y: initialElementRef.current!.y! + dy }
                            : el
                    );
                    onElementsChange(updated);
                } else if (isScalingRef.current && initialElementRef.current) {
                    hasMovedRef.current = true;
                    const elX = initialElementRef.current.x || 0;
                    const elY = initialElementRef.current.y || 0;

                    // Distance from center
                    const dist0 = Math.sqrt(Math.pow(initialPosRef.current.x - elX, 2) + Math.pow(initialPosRef.current.y - elY, 2));
                    const dist1 = Math.sqrt(Math.pow(v.x - elX, 2) + Math.pow(v.y - elY, 2));

                    if (dist0 > 1) { // Avoid division by zero
                        const newScale = Math.max(0.1, (initialElementRef.current.scale || 1) * (dist1 / dist0));
                        const updated = elementsRef.current.map(el =>
                            el.id === selectedIdRef.current ? { ...el, scale: newScale } : el
                        );
                        onElementsChange(updated);
                    }
                }
            },
            onPanResponderRelease: (evt) => {
                if (readOnly || isTypingRef.current) return;
                const { locationX, locationY } = evt.nativeEvent;
                const v = toVirtual(locationX, locationY);

                const wasInteracting = hasMovedRef.current || isPinchingRef.current;

                if (toolRef.current === 'pen' && currentPathRef.current) {
                    const newElement: CanvasElement = {
                        id: `path-${Date.now()}`,
                        type: 'path',
                        data: currentPathRef.current,
                        color: strokeColor,
                        size: strokeWidth
                    };
                    onElementsChange([...elementsRef.current, newElement]);
                    currentPathRef.current = '';
                    setCurrentPath('');
                } else if (!wasInteracting && !wasDeselectedRef.current) {
                    // It was a tap!
                    // For short taps, we use initialPosRef to ensure we hit what was originally touched
                    const tapPos = initialPosRef.current;

                    if (toolRef.current === 'text') {
                        // Check if we hit an existing text element to edit
                        // Use a very generous padding (100) for easier tapping on mobile
                        const hitText = elementsRef.current.find(el => el.type === 'text' && isHit(el, tapPos, 100));

                        if (hitText) {
                            if (hitText.id === initialSelectedIdRef.current) {
                                // Already selected -> Edit
                                setTypingPos({ x: hitText.x!, y: hitText.y! });
                                setTypingText(hitText.data);
                                setEditingId(hitText.id);
                                setIsTyping(true);
                            }
                        } else if (!selectedIdRef.current) {
                            setTypingPos(tapPos);
                            setIsTyping(true);
                        }
                    } else if (toolRef.current === 'magnet' && !selectedIdRef.current) {
                        const newId = `mag-${Date.now()}`;
                        const newElement: CanvasElement = {
                            id: newId,
                            type: 'magnet',
                            data: selectedMagnetTypeRef.current,
                            x: tapPos.x,
                            y: tapPos.y,
                            size: 60,
                            scale: 1
                        };
                        onElementsChange([...elementsRef.current, newElement]);
                        
                        // Trigger snap animation
                        setAnimatingMagnetId(newId);
                        snapAnimValue.setValue(0);
                        Animated.spring(snapAnimValue, {
                            toValue: 1,
                            friction: 6,
                            tension: 40,
                            useNativeDriver: true,
                        }).start(() => {
                            setAnimatingMagnetId(null);
                        });
                    }
                }

                isDraggingRef.current = false;
                isScalingRef.current = false;
                isPinchingRef.current = false;
                initialElementRef.current = null;
                wasDeselectedRef.current = false;
                activeTouchId.current = null;
                lastPoint.current = null;
            },
        })
    ).current;

    const renderTransformBox = (el: CanvasElement) => {
        const { x, y } = getBoxCenter(el);
        const { w, h } = getBoxSize(el);
        const halfW = w / 2;
        const halfH = h / 2;

        return (
            <G>
                <Rect
                    x={x - halfW - 5}
                    y={y - halfH - 5}
                    width={w + 10}
                    height={h + 10}
                    stroke="#6B4B3E"
                    strokeWidth={2}
                    strokeDasharray="5,5"
                    fill="none"
                />
                {[
                    { cx: x - halfW - 5, cy: y - halfH - 5 },
                    { cx: x + halfW + 5, cy: y - halfH - 5 },
                    { cx: x - halfW - 5, cy: y + halfH + 5 },
                    { cx: x + halfW + 5, cy: y + halfH + 5 },
                ].map((pos, i) => (
                    <Circle key={i} cx={pos.cx} cy={pos.cy} r={8} fill="#6B4B3E" />
                ))}
            </G>
        );
    };

    return (
        <View style={[styles.container, { width, height }]}>
            <View style={StyleSheet.absoluteFill} {...(readOnly || isTyping ? {} : panResponder.panHandlers)}>
                <Svg width={width} height={height} viewBox={`0 0 ${VIRTUAL_WIDTH} ${virtualHeight}`} pointerEvents="none">
                    {elements.map((el) => {
                        const isSelected = el.id === selectedId;
                        if (el.type === 'path') {
                            return (
                                <Path
                                    key={el.id}
                                    d={el.data}
                                    stroke={el.color || strokeColor}
                                    strokeWidth={el.size || strokeWidth}
                                    fill="none"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            );
                        } else if (el.type === 'text') {
                            const scale = el.scale || 1;
                            const size = (el.size || 210) * scale;
                            return (
                                <G key={el.id}>
                                    <SvgText
                                        x={el.x}
                                        y={el.y}
                                        fill={el.color || strokeColor}
                                        fontSize={size}
                                        fontFamily="Poppins-SemiBold"
                                        textAnchor="middle"
                                        alignmentBaseline="central"
                                    >
                                        {el.data}
                                    </SvgText>
                                    {isSelected && renderTransformBox(el)}
                                </G>
                            );
                        } else if (el.type === 'magnet') {
                            const scale = el.scale || 1;
                            const size = (el.size || 60) * scale;
                            
                            // Apply snap animation if this magnet is animating
                            const isAnimating = el.id === animatingMagnetId;
                            // Map animation value (0->1) to scale (0->1.2->1)
                            const animValue = isAnimating ? snapAnimScale : 1;
                            let currentAnimScale = 1;
                            if (isAnimating) {
                                if (animValue < 0.5) {
                                    // 0 -> 0.5 maps to 0 -> 1.2
                                    currentAnimScale = animValue * 2.4;
                                } else {
                                    // 0.5 -> 1 maps to 1.2 -> 1
                                    currentAnimScale = 1.2 - ((animValue - 0.5) * 0.4);
                                }
                            }
                            const finalScale = scale * currentAnimScale;
                            
                            // Render country-specific magnets or default circular magnet
                            const countryIds = ['usa', 'uk', 'germany', 'canada', 'australia'];
                            if (countryIds.includes(el.data)) {
                                return (
                                    <G key={el.id}>
                                        <CountryMagnet country={el.data} x={el.x!} y={el.y!} scale={finalScale} />
                                        {isSelected && renderTransformBox(el)}
                                    </G>
                                );
                            } else {
                                // Default circular magnet (backward compatibility)
                                const animSize = size * currentAnimScale;
                                return (
                                    <G key={el.id}>
                                        <Circle cx={el.x} cy={el.y} r={animSize} fill="#F1B08B" stroke="#6B4B3E" strokeWidth={6 * finalScale} />
                                        <SvgText x={el.x} y={el.y! + (animSize * 0.2)} textAnchor="middle" fontSize={animSize * 0.8}>🧲</SvgText>
                                        {isSelected && renderTransformBox(el)}
                                    </G>
                                );
                            }
                        }
                        return null;
                    })}
                    {currentPath ? (
                        <Path ref={activePathRef} d={currentPath} stroke={strokeColor} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    ) : null}
                </Svg>
            </View>

            {isTyping && (
                <>
                    <TouchableWithoutFeedback onPress={finishTyping}>
                        <View style={StyleSheet.absoluteFill} />
                    </TouchableWithoutFeedback>
                    <View style={[styles.typingContainer, {
                        left: (typingPos.x / VIRTUAL_WIDTH) * width - (width * 0.4),
                        top: (typingPos.y / virtualHeight) * height - 40,
                        width: width * 0.8
                    }]}>
                        <TextInput
                            style={styles.textInput}
                            autoFocus
                            value={typingText}
                            onChangeText={setTypingText}
                            onBlur={finishTyping}
                            onSubmitEditing={finishTyping}
                            placeholder="..."
                            placeholderTextColor="#C9B2A3"
                            returnKeyType="done"
                        />
                    </View>
                </>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { backgroundColor: 'transparent' },
    typingContainer: {
        position: 'absolute',
        zIndex: 1000,
    },
    textInput: {
        fontSize: 32,
        fontFamily: 'Inter-Bold',
        color: '#6B4B3E',
        textAlign: 'center',
        padding: 15,
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#6B4B3E',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
});
