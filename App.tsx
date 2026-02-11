import React, { useState, useEffect } from 'react';
import { Asset } from 'expo-asset';
import * as SplashScreen from 'expo-splash-screen';
import { useShareIntent } from "expo-share-intent";
import { useShareStore } from './src/services/shareStore';
import { 
  useFonts, 
  Poppins_600SemiBold, 
  Poppins_700Bold, 
  Poppins_800ExtraBold 
} from '@expo-google-fonts/poppins';
import { 
  Inter_400Regular, 
  Inter_500Medium, 
  Inter_600SemiBold, 
  Inter_700Bold, 
  Inter_800ExtraBold,
  Inter_900Black 
} from '@expo-google-fonts/inter';
import { AppNavigator } from './src/navigation/AppNavigator';
import { PairingProvider } from './src/context/PairingContext';
import './src/services/locationService'; // Register geofencing task
import './src/services/notifications'; // Register notification listeners + background task

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [assetsReady, setAssetsReady] = useState(false);
  const { hasShareIntent, shareIntent, resetShareIntent, error } = useShareIntent();
  const setPendingRecipeUrl = useShareStore((state) => state.setPendingRecipeUrl);
  const lastProcessedUrl = React.useRef<string | null>(null);
  
  const [fontsLoaded] = useFonts({
    'Poppins-SemiBold': Poppins_600SemiBold,
    'Poppins-Bold': Poppins_700Bold,
    'Poppins-ExtraBold': Poppins_800ExtraBold,
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
    'Inter-ExtraBold': Inter_800ExtraBold,
    'Inter-Black': Inter_900Black,
  });

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
        setAssetsReady(true);
      }
    }

    prepare();
  }, []);

  useEffect(() => {
    if (hasShareIntent && (shareIntent.type === "text" || shareIntent.type === "webpage" || shareIntent.type === "weburl" || shareIntent.type === "file")) {
      // The library seems to use webUrl (camelCase) or text for the actual value
      const url = shareIntent.value?.trim() || (shareIntent as any).webUrl || (shareIntent as any).text;
      
      if (url) {
        setPendingRecipeUrl(url);
        
        // Reset the native intent immediately after capturing the payload
        resetShareIntent();
      }
    }
  }, [hasShareIntent, shareIntent, setPendingRecipeUrl, resetShareIntent]);

  useEffect(() => {
    if (fontsLoaded && assetsReady) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, assetsReady]);

  if (!fontsLoaded || !assetsReady) {
    return null;
  }

  return (
    <PairingProvider>
      <AppNavigator />
    </PairingProvider>
  );
}
