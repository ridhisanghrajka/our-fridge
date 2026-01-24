import WidgetKit
import SwiftUI
import UIKit

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: Date(), data: WidgetSnapshot(
            fridgeName: "Our Fridge",
            items: ["Milk", "Eggs", "Bread"],
            noteSnippet: "Don't forget the milk!",
            noteElements: [],
            updatedAt: Date().timeIntervalSince1970
        ))
    }

    func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> ()) {
        let entry = readWidgetData()
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        let entry = readWidgetData()
        // Refresh every 15 minutes if not triggered by app
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }

    private func readWidgetData() -> SimpleEntry {
        let sharedDefaults = UserDefaults(suiteName: "group.com.ridhisanghrajka.ourfridge")
        let date = Date()
        
        // Read the JSON string we saved in React Native
        if let jsonData = sharedDefaults?.string(forKey: "widgetData")?.data(using: .utf8) {
            do {
                let decoder = JSONDecoder()
                let data = try decoder.decode(WidgetSnapshot.self, from: jsonData)
                return SimpleEntry(date: date, data: data)
            } catch {
                print("Error decoding widget data: \(error)")
            }
        }
        
        return SimpleEntry(date: date, data: nil)
    }
}

struct SimpleEntry: TimelineEntry {
    let date: Date
    let data: WidgetSnapshot?
}

extension Color {
    static let brandBrown = Color(red: 107/255, green: 75/255, blue: 62/255)
    static let brandBlue = Color(red: 221/255, green: 243/255, blue: 255/255)
    static let paperWhite = Color(red: 255/255, green: 246/255, blue: 234/255)
}

struct FridgeWidgetEntryView : View {
    var entry: Provider.Entry
    @Environment(\.widgetFamily) var family

    var body: some View {
        VStack(alignment: .center, spacing: 4) {
            headerView
                .layoutPriority(1) // Ensure header is never compressed
            
            // Content Area: Notepad Paper style
            Group {
                if family == .systemLarge {
                    VStack(alignment: .leading, spacing: 0) {
                        listView
                            .padding(.top, 10)
                            .frame(height: 142, alignment: .topLeading)
                        
                        // Horizontal Divider
                        Rectangle()
                            .fill(Color.brandBrown.opacity(0.1))
                            .frame(height: 1)
                        
                        noteSectionView
                            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                    }
                } else {
                    HStack(alignment: .top, spacing: 12) {
                        if family == .systemMedium {
                            // Left Column: Grocery List
                            listView
                                .frame(maxWidth: .infinity, alignment: .topLeading)
                            
                            // Vertical Divider
                            Rectangle()
                                .fill(Color.brandBrown.opacity(0.1))
                                .frame(width: 1)
                                .padding(.vertical, 4)
                            
                            // Right Column: Note Section
                            noteSectionView
                                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                        } else {
                            // Small widget: Just grocery list
                            listView
                                .frame(maxWidth: .infinity, alignment: .topLeading)
                        }
                    }
                }
            }
            .padding(.horizontal, 8)     // Keep left/right at 8
            .padding(.top, family == .systemLarge ? 0 : 4)
            .padding(.bottom, family == .systemLarge ? 0 : 10)
            .frame(maxWidth: .infinity, alignment: .topLeading)
            .frame(height: family == .systemLarge ? 280 : 102, alignment: .topLeading)
            .clipped()
            .background(Color.paperWhite)
            .cornerRadius(12)
            .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
            
            HStack {
                Spacer()
                Text("LAST SYNCED: \(formatDate(entry.date))")
                    .font(.custom("Inter-Bold", size: 7))
                    .foregroundColor(.brandBrown.opacity(0.4))
            }
            .padding(.trailing, 6)
            .padding(.top, 2)
            .layoutPriority(1) // Ensure footer is never compressed
        }
        .padding(.horizontal, 12)
        .padding(.top, 0) // Reduced to minimize blue border at top
        .padding(.bottom, 4) // Reduced space below last sync line
        .widgetURL(URL(string: "ourfridge://fridge"))
    }

    // MARK: - Subviews

    private var headerView: some View {
        VStack(spacing: -10) { // Overlap clip and panel to match the app
            // The Clip (Orange/Copper Clip)
            ZStack {
                ClipShape()
                    .fill(LinearGradient(colors: [Color(red: 241/255, green: 176/255, blue: 139/255), Color(red: 231/255, green: 155/255, blue: 116/255)], startPoint: .top, endPoint: .bottom))
                
                ClipShape()
                    .stroke(Color.brandBrown, lineWidth: 1.5)
                
                Circle()
                    .fill(Color(red: 247/255, green: 231/255, blue: 220/255))
                    .overlay(Circle().stroke(Color.brandBrown, lineWidth: 1))
                    .frame(width: 6, height: 6)
                    .offset(y: -4)
            }
            .frame(width: 32, height: 22)
            .zIndex(1) // Ensure clip stays on top
            
            // The Panel (Beige Title Bar)
            Text(entry.data?.fridgeName ?? "Our Fridge")
                .font(.custom("Poppins-SemiBold", size: 11))
                .foregroundColor(Color.brandBrown)
                .padding(.horizontal, 12)
                .padding(.top, 10) // Increased top padding to push text below the clip
                .padding(.bottom, 6)
                .background(Color(red: 243/255, green: 227/255, blue: 215/255))
                .cornerRadius(4)
                .overlay(
                    RoundedRectangle(cornerRadius: 4)
                        .stroke(Color.brandBrown, lineWidth: 1.5)
                )
        }
        .frame(maxWidth: .infinity, alignment: .center)
    }

    private var listView: some View {
        Group {
            if let items = entry.data?.items, !items.isEmpty {
                let itemLimit: Int = {
                    switch family {
                    case .systemSmall: return 6
                    case .systemMedium: return 5
                    case .systemLarge: return 6 // Show 6 items
                    default: return 5
                    }
                }()
                
                VStack(alignment: .leading, spacing: family == .systemLarge ? 6 : 4) {
                    ForEach(items.prefix(itemLimit), id: \.self) { item in
                        HStack(spacing: family == .systemLarge ? 10 : 8) {
                            // Checkbox: Styled like the app's checkbox
                            RoundedRectangle(cornerRadius: 3)
                                .stroke(Color.brandBrown.opacity(0.35), lineWidth: 1.5)
                                .frame(width: family == .systemLarge ? 14 : 12, height: family == .systemLarge ? 14 : 12)
                            
                            Text(item)
                                .font(.custom("Inter-Medium", size: family == .systemLarge ? 16 : 13))
                                .foregroundColor(Color(red: 0.2, green: 0.15, blue: 0.1))
                                .lineLimit(1)
                        }
                    }
                    if items.count > itemLimit {
                        Text("+ \(items.count - itemLimit) more...")
                            .font(.custom("Inter-Bold", size: family == .systemLarge ? 12 : 10))
                            .foregroundColor(.brandBrown.opacity(0.5))
                            .padding(.leading, family == .systemLarge ? 12 : 10)
                    }
                }
            } else {
                HStack {
                    Spacer()
                    Text("Empty List")
                        .font(.custom("Inter-Medium", size: family == .systemLarge ? 15 : 12))
                        .foregroundColor(.brandBrown.opacity(0.4))
                    Spacer()
                }
            }
        }
    }

    private var noteSectionView: some View {
        ZStack(alignment: .topLeading) {
            Color.clear
            Group {
                if let noteElements = entry.data?.noteElements, !noteElements.isEmpty {
                    NotePainter(elements: noteElements)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .clipped()
                } else if let snippet = entry.data?.noteSnippet, !snippet.isEmpty, snippet != "No notes yet" {
                    Text(snippet)
                        .font(.custom("Inter-Regular", size: family == .systemSmall ? 11 : 12))
                        .foregroundColor(.brandBrown)
                        .lineLimit(family == .systemLarge ? 10 : (family == .systemSmall ? 2 : 3))
                        .padding(4)
                }
            }
        }
    }
}

struct ClipShape: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        let w = rect.width
        let h = rect.height
        
        path.move(to: CGPoint(x: w * 0.15, y: h * 0.3))
        path.addQuadCurve(to: CGPoint(x: w * 0.85, y: h * 0.3), control: CGPoint(x: w * 0.5, y: 0))
        path.addQuadCurve(to: CGPoint(x: w, y: h * 0.5), control: CGPoint(x: w, y: h * 0.35))
        path.addLine(to: CGPoint(x: w, y: h * 0.85))
        path.addQuadCurve(to: CGPoint(x: w * 0.8, y: h), control: CGPoint(x: w, y: h))
        path.addLine(to: CGPoint(x: w * 0.2, y: h))
        path.addQuadCurve(to: CGPoint(x: 0, y: h * 0.85), control: CGPoint(x: 0, y: h))
        path.addLine(to: CGPoint(x: 0, y: h * 0.5))
        path.addQuadCurve(to: CGPoint(x: w * 0.15, y: h * 0.3), control: CGPoint(x: 0, y: h * 0.35))
        
        return path
    }
}

struct NotePainter: View {
    let elements: [CanvasElement]
    let virtualWidth: CGFloat = 1000.0
    let virtualHeight: CGFloat = 600.0 // Based on the 800:480 aspect ratio in the app

    var body: some View {
        GeometryReader { geometry in
            let widthScale = geometry.size.width / virtualWidth
            let heightScale = geometry.size.height / virtualHeight
            let scale = min(widthScale, heightScale)
            
            // Center the drawing in the available space
            let offsetX = (geometry.size.width - (virtualWidth * scale)) / 2
            let offsetY = (geometry.size.height - (virtualHeight * scale)) / 2
            
            ZStack(alignment: .topLeading) {
                // Background to ensure the view takes up the space
                Color.clear
                
                Group {
                    ForEach(elements, id: \.id) { el in
                        if el.type == "path" {
                            PathParser.parse(el.data)
                                .applying(CGAffineTransform(scaleX: scale, y: scale))
                                .stroke(Color.brandBrown, style: StrokeStyle(lineWidth: (el.size ?? 15.0) * scale, lineCap: .round, lineJoin: .round))
                        } else if el.type == "text" {
                            Text(el.data)
                                .font(.custom("Inter-Bold", size: (el.size ?? 210.0) * scale * (el.scale ?? 1.0)))
                                .foregroundColor(Color.brandBrown)
                                .rotationEffect(.degrees(el.rotation ?? 0))
                                .position(x: (el.x ?? 0) * scale, y: (el.y ?? 0) * scale)
                        } else if el.type == "magnet" {
                            renderMagnet(el, scale: scale)
                        }
                    }
                }
                .offset(x: offsetX, y: offsetY)
            }
            .drawingGroup()
        }
    }

    @ViewBuilder
    private func renderMagnet(_ el: CanvasElement, scale: CGFloat) -> some View {
        let name = "\(el.data)_magnet"
        let baseSize = getMagnetBaseSize(el.data)
        let magnetScale = CGFloat(el.scale ?? 1.0)
        let w = baseSize.width * scale * magnetScale
        let h = baseSize.height * scale * magnetScale
        
        Image(name)
            .resizable()
            .aspectRatio(contentMode: .fit)
            .frame(width: w, height: h)
            .rotationEffect(.degrees(el.rotation ?? 0))
            .position(x: (el.x ?? 0) * scale, y: (el.y ?? 0) * scale)
    }

    private func getMagnetBaseSize(_ type: String) -> CGSize {
        switch type {
        case "uk": return CGSize(width: 320, height: 420)
        case "germany": return CGSize(width: 350, height: 440)
        case "canada": return CGSize(width: 450, height: 300)
        case "australia": return CGSize(width: 420, height: 300)
        case "usa": return CGSize(width: 500, height: 300)
        default: return CGSize(width: 200, height: 200)
        }
    }
}

struct PathParser {
    static func parse(_ svgPath: String) -> Path {
        var path = Path()
        let components = svgPath.components(separatedBy: .whitespaces).filter { !$0.isEmpty }
        var i = 0
        
        while i < components.count {
            let cmd = components[i]
            if cmd == "M" && i + 2 < components.count {
                if let x = Double(components[i+1]), let y = Double(components[i+2]) {
                    path.move(to: CGPoint(x: x, y: y))
                }
                i += 3
            } else if cmd == "L" && i + 2 < components.count {
                if let x = Double(components[i+1]), let y = Double(components[i+2]) {
                    path.addLine(to: CGPoint(x: x, y: y))
                }
                i += 3
            } else {
                i += 1
            }
        }
        return path
    }
}

private func formatDate(_ date: Date) -> String {
    let formatter = DateFormatter()
    formatter.dateFormat = "h:mm a"
    return formatter.string(from: date)
}

@main
struct FridgeWidget: Widget {
    let kind: String = "FridgeWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            FridgeWidgetEntryView(entry: entry)
                .containerBackground(Color.brandBlue, for: .widget)
        }
        .configurationDisplayName("Our Fridge")
        .description("Keep track of your grocery list and notes.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
        .contentMarginsDisabled()
    }
}
