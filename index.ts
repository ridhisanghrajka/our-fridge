import { registerRootComponent } from 'expo';
// #region agent log
fetch('http://127.0.0.1:7243/ingest/b1447da8-c5e0-4696-a6ce-533cceafc06d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.ts:2',message:'Index entry point reached',data:{env:process.env.NODE_ENV,platform:process.env.EXPO_OS},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
// #endregion

// Initialize Firebase before anything else
import './src/services/firebase';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
// #region agent log
fetch('http://127.0.0.1:7243/ingest/b1447da8-c5e0-4696-a6ce-533cceafc06d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.ts:15',message:'Registering root component',timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
// #endregion
registerRootComponent(App);
