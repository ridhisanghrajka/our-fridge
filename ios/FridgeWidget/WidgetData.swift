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
}
