import Foundation
import WidgetKit
import React

@objc(WidgetBridge)
class WidgetBridge: NSObject {
  
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
  
  @objc(reloadWidget)
  func reloadWidget() {
    if #available(iOS 14.0, *) {
      WidgetCenter.shared.reloadAllTimelines()
    }
  }

  @objc(exitApp)
  func exitApp() {
    DispatchQueue.main.async {
      exit(0)
    }
  }
}
