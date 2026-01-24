# Troubleshooting VishwaSetu in Local/Expo Environments

If you are experiencing issues where the "Live Classroom" session starts and immediately closes, or stops after a few turns, it is likely due to one of the following environment-specific factors:

## 1. WebSocket Throttling & Proxy Issues
Gemini Live API communicates over **WebSockets**. Some development servers (like the one used by Expo Web or VS Code Port Forwarding) can interfere with WebSocket long-polling or persistent connections. 
- **Fix:** Ensure you are accessing the app directly via `localhost` rather than a proxied tunnel (like a `.github.dev` or VS Code remote link) if possible.

## 2. API Key Visibility
In many Expo/Vite/Webpack setups, `process.env.API_KEY` might not be automatically injected unless explicitly configured in your `.env` or build settings. 
- **Symptom:** The session attempts to connect, the server rejects the empty/invalid key, and triggers an `onclose` event immediately.
- **Verification:** Check your browser console for 401 (Unauthorized) or 403 (Forbidden) errors.

## 3. AudioContext "Auto-Resume" Policy
Modern browsers (Chrome, Safari) have strict power-saving features that suspend `AudioContext` if they detect the tab is "inactive" or if the event loop is heavily taxed by the development server's HMR (Hot Module Replacement).
- **Fix:** We have implemented proactive `.resume()` calls on every audio process tick to keep the connection alive.

## 4. Microphone Permissions in Expo/Mobile
If you are running this as a native Expo app (not just web):
- You must ensure `expo-av` or standard `getUserMedia` is correctly configured in `app.json` or `info.plist`.
- Without explicit permissions, the browser engine inside the Expo wrapper will kill the stream after a few seconds.

## 5. ScriptProcessor Performance
The current implementation uses `ScriptProcessorNode`. While functional, it runs on the main thread. In a development environment with "Source Maps" and "Debuggers" active, the main thread can lag, causing the Gemini server to close the connection due to "Audio Underflow" (not receiving enough data quickly enough).

---
**Current Improvements in Code:**
- Added more descriptive logging to the console.
- Added a "Heartbeat" nudge to keep the WebSocket active.
- Improved the cleanup logic to ensure no ghost connections stay open.
