import Foundation
import WidgetKit
import React

@objc(WidgetBridge)
class WidgetBridge: NSObject {
  private let appGroup = "group.ridhisanghrajka.ourfridge"
  private let widgetDataKey = "widgetData"
  
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
  
  /**
   Writes widget JSON into the shared App Group defaults and forces a timeline reload.
   This bypasses the unmaintained shared-group-preferences module and ensures the widget process
   can observe changes quickly.
   */
  @objc(setWidgetData:)
  func setWidgetData(_ json: String) {
    if let defaults = UserDefaults(suiteName: appGroup) {
      defaults.set(json, forKey: widgetDataKey)
      // synchronize() is deprecated but improves cross-process propagation in practice.
      defaults.synchronize()
    }
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
