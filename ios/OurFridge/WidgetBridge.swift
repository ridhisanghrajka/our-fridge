import Foundation
import WidgetKit
import React

@objc(WidgetBridge)
class WidgetBridge: NSObject {
  private let appGroup = "group.ridhisanghrajka.ourfridge"
  private let widgetDataKey = "widgetData"
  private let pairIdKey = "sharedPairId"
  
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
  
  @objc(setSharedPairId:)
  func setSharedPairId(_ pairId: String) {
    if let defaults = UserDefaults(suiteName: appGroup) {
      defaults.set(pairId, forKey: pairIdKey)
      defaults.synchronize()
    }
  }

  @objc(getSharedPairId:rejecter:)
  func getSharedPairId(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    if let defaults = UserDefaults(suiteName: appGroup) {
      let pairId = defaults.string(forKey: pairIdKey) ?? ""
      resolve(pairId)
    } else {
      resolve("")
    }
  }
  
  /**
   Writes widget JSON into the shared App Group defaults and forces a timeline reload.
   This bypasses the unmaintained shared-group-preferences module and ensures the widget process
   can observe changes quickly.
   */
  @objc(setWidgetData:)
  func setWidgetData(_ json: String) {
    guard let defaults = UserDefaults(suiteName: appGroup) else {
      reloadWidget()
      return
    }
    
    // Decode incoming snapshot
    if let newData = json.data(using: .utf8),
       let newSnapshot = try? JSONDecoder().decode(WidgetSnapshot.self, from: newData) {
      
      // Decode existing snapshot and compare (ignores updatedAt)
      if let existingJson = defaults.string(forKey: widgetDataKey),
         let existingData = existingJson.data(using: .utf8),
         let existingSnapshot = try? JSONDecoder().decode(WidgetSnapshot.self, from: existingData),
         existingSnapshot == newSnapshot {
        return // Content is identical, skip the write and reload
      }
    }
    
    defaults.set(json, forKey: widgetDataKey)
    // synchronize() is deprecated but improves cross-process propagation in practice.
    defaults.synchronize()
    reloadWidget()
  }

  @objc(reloadWidget)
  func reloadWidget() {
    if #available(iOS 14.0, *) {
      // React Native calls native modules off the main thread by default.
      // WidgetKit refresh APIs are safest on the main queue.
      DispatchQueue.main.async {
        WidgetCenter.shared.reloadAllTimelines()
      }
    }
  }

  @objc(exitApp)
  func exitApp() {
    DispatchQueue.main.async {
      exit(0)
    }
  }
}
