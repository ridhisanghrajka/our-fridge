import Foundation

struct CanvasElement: Codable {
    let id: String
    let type: String // "path", "text", "magnet"
    let data: String
    let x: Double?
    let y: Double?
    let color: String?
    let size: Double?
    let scale: Double?
    let rotation: Double?
}

struct WidgetSnapshot: Codable {
    let fridgeName: String
    let items: [String]
    let noteSnippet: String
    let noteElements: [CanvasElement]?
    let updatedAt: Double
    let isLocked: Bool
}

extension CanvasElement: Equatable {
    static func == (lhs: CanvasElement, rhs: CanvasElement) -> Bool {
        return lhs.id == rhs.id &&
               lhs.type == rhs.type &&
               lhs.data == rhs.data
    }
}

extension WidgetSnapshot: Equatable {
    static func == (lhs: WidgetSnapshot, rhs: WidgetSnapshot) -> Bool {
        return lhs.fridgeName == rhs.fridgeName &&
               lhs.items == rhs.items &&
               lhs.noteSnippet == rhs.noteSnippet &&
               lhs.noteElements == rhs.noteElements &&
               lhs.isLocked == rhs.isLocked
        // updatedAt intentionally excluded — it changes every call
        // even when the actual fridge content hasn't changed
    }
}
