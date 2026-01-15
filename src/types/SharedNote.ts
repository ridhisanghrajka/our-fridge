export interface CanvasElement {
    id: string;
    type: 'path' | 'text' | 'magnet';
    data: string; // SVG path string or text content
    x?: number;   // 0-1000 for text/magnets
    y?: number;   // 0-1000 for text/magnets
    color?: string;
    size?: number;
    scale?: number;
    rotation?: number;
}

export interface SharedNote {
    pairId: string;
    content: string; // JSON string of CanvasElement[]
    updatedAt: Date;
    updatedBy: string;
}
