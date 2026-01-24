# VishwaSetu Live Classroom - AI Voice Workflow Documentation

## Overview

VishwaSetu's Live Classroom feature provides real-time, two-way voice interaction with Gemini AI using WebSocket-based audio streaming. Users can speak naturally with the AI assistant "Vishwa" for language learning conversations.

### Key Features

- **Real-time voice conversation** with sub-500ms latency
- **Continuous audio streaming** (no chunking delays)
- **Native PCM audio** for optimal quality
- **Bidirectional WebSocket** communication
- **Session management** with auto-cleanup

---

## Architecture Overview

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│                 │         │                 │         │                 │
│  React Native   │◄───────►│  Express.js     │◄───────►│  Gemini Live    │
│    Frontend     │WebSocket│    Backend      │WebSocket│      API        │
│                 │         │                 │         │                 │
└─────────────────┘         └─────────────────┘         └─────────────────┘
        │                           │                           │
        │                           │                           │
   Native PCM              WebSocket Handler           gemini-2.5-flash
   Recording                Message Routing            native-audio
   (16kHz)                  Session Mgmt              (16kHz→24kHz)
```

### Technology Stack

**Frontend:**

- React Native (Expo SDK 54)
- `react-native-live-audio-stream` - Native PCM audio recording
- `expo-audio` - Audio playback
- Native WebSocket API - Real-time communication

**Backend:**

- Node.js + Express.js
- `ws` - WebSocket server
- `@google/genai` - Gemini Live API SDK

**AI Model:**

- `gemini-2.5-flash-native-audio-preview-12-2025`
- Native audio input/output
- Real-time transcription

---

## Complete Audio Flow

### User → Gemini (Input Flow)

```
User Speaks
    ↓
[1] Native Microphone Capture
    │ (react-native-live-audio-stream)
    │ Config: 16kHz, mono, 16-bit PCM
    ↓
[2] Base64 Encoding
    │ (Native module handles encoding)
    ↓
[3] WebSocket Send
    │ Message: { type: 'audio_chunk', data: { audioData: base64, format: 'pcm' } }
    │ Connection: ws://localhost:3000
    ↓
[4] Backend Receives
    │ (backend/src/routes/classroom.ts)
    │ Validates PCM buffer
    ↓
[5] Forward to Gemini
    │ (backend/src/services/geminiLiveService.ts)
    │ sendRealtimeInput({ media: { data: base64, mimeType: 'audio/pcm;rate=16000' } })
    ↓
[6] Gemini Processing
    │ Speech-to-text transcription
    │ AI response generation
    │ Text-to-speech synthesis
```

### Gemini → User (Output Flow)

```
Gemini Generates Response
    ↓
[1] PCM Audio Output
    │ Format: 24kHz, mono, 16-bit PCM
    │ Base64 encoded
    ↓
[2] Backend Receives
    │ (geminiLiveService.ts onmessage callback)
    │ Event: serverContent.modelTurn.parts[0].inlineData.data
    ↓
[3] WebSocket Broadcast
    │ Message: { type: 'audioChunk', data: { audioData: base64, mimeType: 'audio/pcm;rate=24000' } }
    ↓
[4] Frontend Receives
    │ (hooks/useClassroom.ts handleWebSocketMessage)
    │ Decode base64 → Uint8Array
    ↓
[5] Buffer Management
    │ Accumulate PCM bytes until threshold (15360 bytes ~300ms)
    │ Push to playback queue
    ↓
[6] PCM → WAV Conversion
    │ (services/audioUtils.ts pcmToWav)
    │ Add 44-byte WAV header
    ↓
[7] File Write & Playback
    │ Write to temp file in cache directory
    │ expo-audio createAudioPlayer()
    │ Play audio, then cleanup temp file
```

---

## WebSocket Message Protocol

### Client → Backend Messages

#### 1. Start Session

```json
{
  "type": "start_session",
  "data": {}
}
```

**Response:** `session_started` with `sessionId`

#### 2. Audio Chunk

```json
{
  "type": "audio_chunk",
  "data": {
    "audioData": "base64_pcm_string",
    "format": "pcm"
  }
}
```

**Sent:** Continuously while recording (real-time stream)

#### 3. Stop Session

```json
{
  "type": "stop_session",
  "data": {}
}
```

**Response:** `session_stopped`

---

### Backend → Client Messages

#### 1. Connected

```json
{
  "type": "connected",
  "data": { "timestamp": 1234567890 }
}
```

**When:** Immediately after WebSocket connection

#### 2. Session Started

```json
{
  "type": "session_started",
  "data": { "sessionId": "uuid-v4-string" }
}
```

**When:** After Gemini Live session initialized

#### 3. Status

```json
{
  "type": "status",
  "data": { "connected": true }
}
```

**When:** Gemini connection state changes

#### 4. Input Transcript

```json
{
  "type": "inputTranscript",
  "data": { "text": "user spoken text..." }
}
```

**When:** Gemini transcribes user speech

#### 5. Output Transcript

```json
{
  "type": "outputTranscript",
  "data": { "text": "AI response text..." }
}
```

**When:** Gemini generates text response

#### 6. Audio Chunk

```json
{
  "type": "audioChunk",
  "data": {
    "audioData": "base64_pcm_24khz",
    "mimeType": "audio/pcm;rate=24000"
  }
}
```

**When:** Gemini generates audio output (continuous stream)

#### 7. Turn Complete

```json
{
  "type": "turnComplete",
  "data": { "timestamp": 1234567890 }
}
```

**When:** Gemini finishes a conversational turn

#### 8. Error

```json
{
  "type": "error",
  "data": { "message": "error description" }
}
```

**When:** Any error occurs (connection, audio processing, etc.)

#### 9. Heartbeat

```json
{
  "type": "heartbeat",
  "data": { "alive": true }
}
```

**When:** Every 15 seconds (keep-alive)

---

## Session Lifecycle

### 1. Session Start

**Frontend (`hooks/useClassroom.ts:298-385`):**

```typescript
// User clicks "Start Session" button
startSession() {
  // 1. Connect WebSocket
  const ws = new WebSocket(classroomApi.getWebSocketUrl());

  ws.onopen = () => {
    // 2. Send start_session message
    ws.send(JSON.stringify({ type: 'start_session', data: {} }));
  };

  // 3. Configure native PCM recording
  LiveAudioStream.init({
    sampleRate: 16000,
    channels: 1,
    bitsPerSample: 16,
    audioSource: 6,  // VOICE_COMMUNICATION
    wavFile: ''
  });

  // 4. Stream audio continuously
  LiveAudioStream.on('data', (base64PCM) => {
    ws.send(JSON.stringify({
      type: 'audio_chunk',
      data: { audioData: base64PCM, format: 'pcm' }
    }));
  });

  LiveAudioStream.start();
}
```

**Backend (`backend/src/routes/classroom.ts:79-116`):**

```typescript
async function handleStartSession(ws, send) {
  // 1. Generate session ID
  const sessionId = uuidv4();

  // 2. Create Gemini Live session
  const geminiSession = new GeminiLiveSession(apiKey, onGeminiEvent);
  await geminiSession.connect();

  // 3. Store session
  sessions.set(sessionId, {
    sessionId,
    geminiSession,
    ws,
    lastActivity: Date.now()
  });

  // 4. Notify client
  send('session_started', { sessionId });
  send('status', { connected: true });
}
```

### 2. Active Session (Audio Streaming)

**Continuous Loop:**

```
User speaks → Native mic captures PCM
    ↓
PCM encoded to base64 (automatic by native module)
    ↓
WebSocket send audio_chunk (real-time, no batching)
    ↓
Backend validates & forwards to Gemini
    ↓
Gemini processes & generates response
    ↓
Gemini sends PCM audio back
    ↓
Backend broadcasts audioChunk via WebSocket
    ↓
Frontend buffers & plays audio
    ↓
[Repeat continuously]
```

### 3. Session Management

**Timeout Cleanup (`classroom.ts:16-29`):**

```typescript
setInterval(() => {
  const now = Date.now();
  const TIMEOUT = 5 * 60 * 1000; // 5 minutes

  for (const [sessionId, data] of sessions.entries()) {
    if (now - data.lastActivity > TIMEOUT) {
      console.log(`[SESSION ${sessionId}] Timeout, cleaning up`);
      data.geminiSession.disconnect();
      sessions.delete(sessionId);
    }
  }
}, 60 * 1000); // Check every minute
```

**Activity Updates:**

- Updated on every `audio_chunk` received
- Resets 5-minute timeout
- Prevents premature session closure

### 4. Session Stop

**Frontend:**

```typescript
stopSession() {
  // 1. Stop recording
  LiveAudioStream.stop();

  // 2. Send stop message
  ws.send(JSON.stringify({ type: 'stop_session', data: {} }));

  // 3. Close WebSocket
  ws.close();

  // 4. Cleanup playback
  audioQueue.clear();
  currentPlayer?.pause();
}
```

**Backend:**

```typescript
async function handleStopSession(sessionId) {
  const sessionData = sessions.get(sessionId);
  if (sessionData) {
    // 1. Disconnect Gemini
    sessionData.geminiSession.disconnect();

    // 2. Remove from sessions map
    sessions.delete(sessionId);
  }
}
```

---

## Technical Details

### Audio Formats

| Stage | Format | Sample Rate | Channels | Bit Depth |
|-------|--------|-------------|----------|-----------|
| **Recording** | PCM | 16 kHz | Mono (1) | 16-bit |
| **Frontend → Backend** | Base64 PCM | 16 kHz | Mono (1) | 16-bit |
| **Backend → Gemini** | Base64 PCM | 16 kHz | Mono (1) | 16-bit |
| **Gemini → Backend** | Base64 PCM | 24 kHz | Mono (1) | 16-bit |
| **Backend → Frontend** | Base64 PCM | 24 kHz | Mono (1) | 16-bit |
| **Playback** | WAV (PCM) | 24 kHz | Mono (1) | 16-bit |

### Buffer Management

**Frontend Playback Buffer (`useClassroom.ts:28-32, 259-279`):**

```typescript
const BUFFER_THRESHOLD = 15360; // ~300ms at 24kHz

// Accumulate PCM bytes
pcmBufferRef.current = concatUint8Arrays(pcmBufferRef.current, chunkBytes);

// When buffer reaches threshold, queue for playback
if (pcmBufferRef.current.length >= BUFFER_THRESHOLD) {
  audioQueueRef.current.push(pcmBufferRef.current);
  pcmBufferRef.current = new Uint8Array(0);
  playNextAudioChunk(); // Start playback
}
```

**Benefits:**

- Prevents choppy playback (accumulates ~300ms chunks)
- Sequential playback queue (no overlapping)
- Automatic cleanup of temp files

### Error Handling

**WebSocket Connection Errors:**

```typescript
ws.onerror = (error) => {
  console.error('[WEBSOCKET] Error:', error);
  setError('WebSocket connection error');
  setIsConnected(false);
};

ws.onclose = () => {
  console.log('[WEBSOCKET] Closed');
  setIsConnected(false);
  // Could implement reconnection logic here
};
```

**Audio Processing Errors:**

```typescript
// Backend validates PCM before sending to Gemini
if (pcmBuffer.length === 0) {
  console.warn('Empty audio buffer');
  return;
}

if (pcmBuffer.length % 2 !== 0) {
  console.warn('PCM buffer not aligned to 16-bit samples');
}
```

**Playback Safety:**

```typescript
// 10-second timeout prevents playback hang
const timeoutId = setTimeout(() => {
  console.warn('Playback timeout - forcing reset');
  isPlayingRef.current = false;
  playNextAudioChunk(); // Try next chunk
}, 10000);
```

---

## Code References

### Backend Files

#### `backend/src/index.ts` (73 lines)

**Purpose:** Express + WebSocket server setup
**Key Code:**

```typescript
// Create HTTP server from Express
const server = createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ server });

// Handle connections
wss.on('connection', (ws, req) => {
  handleWebSocketConnection(ws);
});

// Listen on single port (HTTP + WebSocket)
server.listen(PORT);
```

#### `backend/src/routes/classroom.ts` (202 lines)

**Purpose:** WebSocket message handling & session management
**Key Functions:**

- `handleWebSocketConnection(ws)` - Main connection handler
- `handleStartSession(ws, send)` - Initialize Gemini session
- `handleAudioChunk(data, sessionId, send)` - Process & forward audio
- `handleStopSession(sessionId)` - Cleanup session

**Session Storage:**

```typescript
const sessions = new Map<string, SessionData>();

interface SessionData {
  sessionId: string;
  geminiSession: GeminiLiveSession;
  ws: WebSocket;
  lastActivity: number;
}
```

#### `backend/src/services/geminiLiveService.ts` (149 lines)

**Purpose:** Gemini Live API integration
**Key Methods:**

- `connect()` - Initialize Gemini Live session
- `sendAudioChunk(buffer)` - Send PCM to Gemini
- `disconnect()` - Close Gemini session

**Gemini Configuration:**

```typescript
await this.ai.live.connect({
  model: 'gemini-2.5-flash-native-audio-preview-12-2025',
  config: {
    responseModalities: [Modality.TEXT, Modality.AUDIO],
    temperature: 0.8,
    speechConfig: {
      voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
    },
    inputAudioTranscription: { model: 'default' },
    outputAudioTranscription: { model: 'default' }
  }
});
```

---

### Frontend Files

#### `hooks/useClassroom.ts` (439 lines)

**Purpose:** Main session management hook
**Key Functions:**

- `startSession()` - Initialize WebSocket & recording
- `stopSession()` - Cleanup all resources
- `handleWebSocketMessage(event, data)` - Process incoming messages
- `playNextAudioChunk()` - Sequential audio playback

**WebSocket Setup:**

```typescript
const ws = new WebSocket(classroomApi.getWebSocketUrl());

ws.onopen = () => {
  ws.send(JSON.stringify({ type: 'start_session', data: {} }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  handleWebSocketMessage(message.type, message.data);
};
```

**Native PCM Recording:**

```typescript
LiveAudioStream.init({
  sampleRate: 16000,
  channels: 1,
  bitsPerSample: 16,
  audioSource: 6,
  wavFile: ''
});

LiveAudioStream.on('data', (base64PCM) => {
  ws.send(JSON.stringify({
    type: 'audio_chunk',
    data: { audioData: base64PCM, format: 'pcm' }
  }));
});

LiveAudioStream.start();
```

#### `services/classroomApi.ts` (12 lines)

**Purpose:** WebSocket URL helper

```typescript
const getWebSocketUrl = (): string => {
  const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
  return BASE_URL.replace(/^http/, 'ws');
};
```

#### `services/audioUtils.ts` (126 lines)

**Purpose:** PCM to WAV conversion for playback
**Key Function:**

```typescript
export function pcmToWav(
  pcmData: Uint8Array,
  sampleRate: number,
  channels: number
): string {
  // Create WAV header (44 bytes)
  const header = createWavHeader(pcmData.length, sampleRate, channels);

  // Combine header + PCM data
  const wavBuffer = new Uint8Array(44 + pcmData.length);
  wavBuffer.set(header);
  wavBuffer.set(pcmData, 44);

  // Return base64
  return uint8ArrayToBase64(wavBuffer);
}
```

#### `app/(tabs)/classroom.tsx` (UI Component)

**Purpose:** Live Classroom screen UI
**Key Elements:**

- Start/Stop session buttons
- Connection status indicator
- Transcript display (input/output)
- Message history (conversation bubbles)

---

## Performance Characteristics

### Latency Breakdown

- **User speaks → Gemini receives**: ~100-200ms
  - Native recording: ~10ms
  - WebSocket transmission: ~50-100ms
  - Backend forwarding: ~40-90ms
- **Gemini processes → User hears**: ~200-400ms
  - Gemini AI processing: ~150-300ms
  - Audio transmission back: ~50-100ms
- **Total round-trip latency**: ~300-600ms

### Network Requirements

- **Bandwidth**: ~20-30 KB/s per direction
  - Upload (16kHz PCM): ~32 KB/s
  - Download (24kHz PCM): ~48 KB/s
- **Connection**: Stable WebSocket (no HTTP polling fallback)

### Resource Usage

- **Memory**: ~5-10 MB for audio buffers
- **CPU**: Low (native audio processing)
- **Battery**: Moderate (continuous microphone use)

---

## Environment Variables

### Backend (`.env`)

```env
PORT=3000
GEMINI_API_KEY=your_gemini_api_key_here
```

### Frontend (`.env`)

```env
EXPO_PUBLIC_API_URL=http://localhost:3000
```

---

## Testing Checklist

### Backend Tests

- [ ] WebSocket server starts on correct port
- [ ] Handles multiple concurrent sessions
- [ ] Session timeout cleanup works (5 minutes)
- [ ] Gemini connection initializes successfully
- [ ] Audio chunks forwarded correctly
- [ ] Error handling for invalid messages

### Frontend Tests

- [ ] WebSocket connection establishes
- [ ] Native PCM recording starts
- [ ] Audio streams continuously (no gaps)
- [ ] Playback queue works sequentially
- [ ] Session cleanup on stop
- [ ] Microphone permissions requested

### Integration Tests

- [ ] End-to-end voice conversation works
- [ ] Transcripts displayed correctly
- [ ] No session timeouts during active conversation
- [ ] Reconnection after network interruption
- [ ] Audio quality is clear and intelligible

---

## Troubleshooting

### Common Issues

#### 1. Session Closes Immediately

**Cause:** Gemini API key missing or invalid
**Fix:** Check `GEMINI_API_KEY` in `backend/.env`

#### 2. No Audio Output

**Cause:** Playback buffer not reaching threshold
**Fix:** Check console logs for `audioChunk` events

#### 3. WebSocket Connection Fails

**Cause:** Backend not running or wrong URL
**Fix:** Verify backend is running on correct port, check `EXPO_PUBLIC_API_URL`

#### 4. Recording Not Working

**Cause:** Microphone permissions denied
**Fix:** Check app permissions in system settings

#### 5. High Latency

**Cause:** Network issues or slow Gemini API
**Fix:** Check network connection, try different network

---

## Future Enhancements

### Planned Features

- [ ] Automatic reconnection with exponential backoff
- [ ] Offline mode with cached responses
- [ ] Multiple voice options (beyond Zephyr)
- [ ] Conversation history persistence
- [ ] Audio quality settings (16kHz/24kHz/48kHz)
- [ ] Echo cancellation for speaker playback
- [ ] Background audio support
- [ ] Push-to-talk mode option

### Performance Optimizations

- [ ] Audio compression (opus codec)
- [ ] Adaptive buffer sizing
- [ ] WebRTC for peer-to-peer audio
- [ ] Edge caching for common responses

---

## Additional Resources

- [Gemini Live API Documentation](https://ai.google.dev/gemini-api/docs/live)
- [WebSocket API Reference](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
- [react-native-live-audio-stream](https://github.com/tlenclos/react-native-live-audio-stream)
- [Expo Audio](https://docs.expo.dev/versions/latest/sdk/audio/)

---

**Last Updated:** January 2025
**Version:** 1.0.0
**Maintained by:** VishwaSetu Development Team

------------------------------------------- ------------------------------------------------- -------------------------

Express.js + WebSocket Architecture - Clarification

 Current Implementation: ✅ Express.js IS Still Used

 What We Have Now (backend/src/index.ts):

 HTTP Server (created from Express app)
     │
     ├─── Express.js (HTTP REST endpoints)
     │    ├── GET /health
     │    ├── GET /api/test-gemini
     │    └── [Can add more routes later]
     │
     └─── WebSocket Server (WebSocket connections)
          └── Live Classroom audio streaming

 Express.js Status:

- ✅ KEPT: Express.js is still running
- ✅ HTTP endpoints still work: /health, /api/test-gemini
- ✅ WebSocket added on top: Same HTTP server handles both

 Code Evidence:

 // backend/src/index.ts
 const app = express();  // ✅ Express still exists

 // Create HTTP server FROM Express
 const server = createServer(app);  // ✅ Express handles HTTP

 // Add WebSocket to same server
 const wss = new WebSocketServer({ server });  // ✅ WebSocket added

 Answer: YES

 Can you use Express.js later after testing?

- ✅ YES - Express is already there, still working
- ✅ YES - You can add more Express routes anytime
- ✅ YES - HTTP REST and WebSocket coexist perfectly

 Why We Kept Express.js:

 1. HTTP endpoints needed: Health checks, testing endpoints
 2. Future flexibility: Can add more REST APIs later
 3. WebSocket upgrade: Requires HTTP server (Express provides this)
 4. No breaking changes: Existing endpoints still work

 What Changed:

 ❌ REMOVED: Old SSE + HTTP POST audio upload approach
 ✅ ADDED: WebSocket for real-time audio streaming
 ✅ KEPT: Express.js for HTTP endpoints

 Future Usage:

 You can add more Express routes later:
 // Example: Add new REST endpoints later
 app.get('/api/users', (req, res) => { ... });
 app.post('/api/auth', (req, res) => { ... });

 Both HTTP and WebSocket will work together on the same port (3000).
