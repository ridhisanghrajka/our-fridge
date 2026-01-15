import React, { useState, useEffect } from 'react';
import { Asset } from 'expo-asset';
import * as SplashScreen from 'expo-splash-screen';
import { AppNavigator } from './src/navigation/AppNavigator';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Pre-load all magnet assets (PNGs only)
        const magnetAssets = [
          require('./src/assets/uk_magnet.png'),
          require('./src/assets/germany_magnet.png'),
          require('./src/assets/usa_magnet.png'),
          require('./src/assets/canada_magnet.png'),
          require('./src/assets/australia_magnet.png'),
        ];

        const cacheAssets = magnetAssets.map(asset => {
          return Asset.fromModule(asset).downloadAsync();
        });

        await Promise.all(cacheAssets);
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
        await SplashScreen.hideAsync();
      }
    }

    prepare();
  }, []);

  if (!appIsReady) {
    return null;
  }

  return <AppNavigator />;
}
