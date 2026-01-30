#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(WidgetBridge, NSObject)

RCT_EXTERN_METHOD(reloadWidget)
RCT_EXTERN_METHOD(exitApp)

@end
