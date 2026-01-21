# VishwaSetu - Complete Code Documentation

**Version:** 1.0.0
**Last Updated:** January 21, 2026
**Author:** VishwaSetu Development Team

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Project Structure](#project-structure)
5. [Backend Implementation](#backend-implementation)
6. [Frontend Implementation](#frontend-implementation)
7. [Live Classroom Feature](#live-classroom-feature)
8. [API Reference](#api-reference)
9. [Audio Processing](#audio-processing)
10. [Authentication](#authentication)
11. [Database Schema](#database-schema)
12. [Deployment](#deployment)
13. [Troubleshooting](#troubleshooting)
14. [Future Enhancements](#future-enhancements)

---

## Project Overview

### Mission

VishwaSetu ("Global Language Bridge") empowers Indian villagers, migrant workers, and students to become "Country-Ready" for employment in foreign countries by teaching practical phrases for work, navigation, and emergency survival.

### Key Differentiators

- **Job-Specific Vocabulary**: Tailored for Construction, IT, Healthcare, Engineering, Driving
- **Native Language Bridge**: Teaches in user's mother tongue (Telugu, Hindi, Tamil, Kannada, Marathi, English)
- **Survival Curriculum**: Focus on real-world utility, not academic grammar
- **Voice-First Interaction**: Accessible for non-text-heavy learners
- **Cultural Integration**: Social etiquette taught alongside language

### Target Users

- Indian migrant workers preparing for overseas employment
- Village youth seeking international opportunities
- Healthcare workers, engineers, construction workers heading abroad
- Students planning to study in foreign countries

---

## Architecture

### System Design

VishwaSetu uses a **three-tier architecture**:

```
┌─────────────────────────────────────────────────────────────┐
│                     Mobile App (React Native)                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Landing    │  │   Dashboard  │  │     Live     │      │
│  │     Page     │→ │ (4 Features) │→ │  Classroom   │      │
│  └──────────────┘  └──────────────┘  └──────┬───────┘      │
│                                              │               │
│                                              │ expo-av       │
│                                              │ Audio         │
└──────────────────────────────────────────────┼───────────────┘
                                               │
                                   HTTPS + SSE │ Clerk Token
                                               │
┌──────────────────────────────────────────────▼───────────────┐
│                    Backend API (Express.js)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │    Auth      │  │   Session    │  │    Audio     │      │
│  │  Middleware  │→ │  Management  │→ │  Processing  │      │
│  └──────────────┘  └──────────────┘  └──────┬───────┘      │
│                                              │               │
│                                              │ WebSocket     │
└──────────────────────────────────────────────┼───────────────┘
                                               │
                                               │ Gemini API
                                               │
┌──────────────────────────────────────────────▼───────────────┐
│              Google Gemini AI Platform                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Gemini 2.5 Flash Native Audio (Live Classroom)      │   │
│  │  - Real-time bidirectional audio streaming           │   │
│  │  - Low-latency transcription                         │   │
│  │  - Multi-language support                            │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Gemini 3 Flash (Cultural Knowledge Hub)             │   │
│  │  - Google Search grounding                           │   │
│  │  - Cited cultural information                        │   │
│  └──────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────┘
```

### Data Flow: Live Classroom

```
User Speaks → Mobile Device Microphone (expo-av)
              ↓
          Audio Chunk (CAF/AAC, 16kHz)
              ↓
    POST /api/classroom/session/:id/audio
              ↓
      Backend Audio Conversion (PCM)
              ↓
    Gemini WebSocket (Base64 PCM)
              ↓
         Gemini Processing
              ↓
    ← Input Transcript (User's words)
    ← Output Transcript (Vishwa's words)
    ← Audio Response (PCM, 24kHz)
              ↓
    SSE Stream to Mobile App
              ↓
    Display Transcripts + Play Audio
```

---

## Technology Stack

### Frontend (React Native Expo)

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.1.0 | UI framework |
| React Native | 0.81.5 | Mobile platform |
| Expo SDK | 54 | Development framework |
| Expo Router | v6 | File-based navigation |
| TypeScript | 5.x | Type safety |
| expo-av | Latest | Audio recording/playback |
| @clerk/clerk-expo | Latest | Authentication |
| react-native-reanimated | Latest | Animations |

### Backend (Node.js)

| Technology | Version | Purpose |
|------------|---------|---------|
| Express.js | 4.18.2 | Web server |
| TypeScript | 5.3.3 | Type safety |
| @google/genai | 1.37.0 | Gemini API client |
| fluent-ffmpeg | Latest | Audio conversion |
| uuid | Latest | Session IDs |
| cors | Latest | Cross-origin requests |
| dotenv | 17.2.3 | Environment variables |

### Database

| Technology | Version | Purpose |
|------------|---------|---------|
| Neon Database | Latest | PostgreSQL hosting |
| Drizzle ORM | 0.45.1 | Database ORM |
| drizzle-kit | 0.31.8 | Migrations |

### AI Models

| Model | ID | Purpose |
|-------|-----|---------|
| Gemini 2.5 Flash Native Audio | `gemini-2.5-flash-native-audio-preview-12-2025` | Live Classroom voice interaction |
| Gemini 3 Flash | `gemini-3-flash-preview` | Cultural Knowledge Hub with Search |

---

## Project Structure

```
C:\Users\ES\Desktop\2025\vishwasetu\
│
├── app/                           # React Native app screens
│   ├── _layout.tsx                # Root navigation layout
│   ├── (tabs)/                    # Main app screens
│   │   ├── _layout.tsx            # Stack navigation config
│   │   ├── index.tsx              # Landing page with carousel
│   │   ├── home.tsx               # Dashboard with 4 feature cards
│   │   ├── profile.tsx            # User profile screen
│   │   └── classroom.tsx          # Live Classroom (TO BE CREATED)
│   ├── (auth)/                    # Authentication screens
│   │   ├── sign-in.tsx            # Clerk sign-in
│   │   └── sign-up.tsx            # Clerk sign-up
│   └── types/                     # TypeScript types
│       └── classroom.ts           # Classroom types (TO BE CREATED)
│
├── hooks/                         # Custom React hooks
│   ├── use-theme-color.ts         # Theme color hook
│   └── useClassroom.ts            # Classroom logic (TO BE CREATED)
│
├── constants/                     # App constants
│   ├── theme.ts                   # Fresh Mint theme colors
│   └── classroom.ts               # Classroom config (TO BE CREATED)
│
├── services/                      # API clients
│   └── classroomApi.ts            # Backend API client (TO BE CREATED)
│
├── components/                    # Reusable UI components
│   ├── SplashScreen.tsx           # Custom splash animation
│   ├── ThemedView.tsx             # Theme-aware View
│   └── ThemedText.tsx             # Theme-aware Text
│
├── backend/                       # Express.js backend
│   ├── src/                       # Source code (TO BE CREATED)
│   │   ├── index.ts               # Server entry point
│   │   ├── config/                # Configuration
│   │   │   └── constants.ts       # System prompts, model config
│   │   ├── middleware/            # Express middleware
│   │   │   └── auth.ts            # Clerk authentication
│   │   ├── routes/                # API routes
│   │   │   └── classroom.ts       # Classroom endpoints
│   │   ├── services/              # Business logic
│   │   │   ├── geminiService.ts   # Gemini API integration
│   │   │   └── audioUtils.ts      # Audio processing
│   │   └── types/                 # TypeScript types
│   │       └── index.ts           # Backend types
│   ├── package.json               # Dependencies
│   ├── tsconfig.json              # TypeScript config (TO BE CREATED)
│   └── .env                       # Environment variables
│
├── workingcode/                   # Web prototype (reference)
│   ├── App.tsx                    # React web app
│   ├── constants.ts               # System instruction prompt
│   ├── services/                  # Gemini & audio services
│   └── app.md                     # Architecture docs
│
├── public/                        # Static assets
│   └── images/                    # App images
│       ├── logo.png               # VishwaSetu logo
│       ├── splashscreen.png       # Splash screen image
│       └── bannerimage*.png       # Landing page banners
│
├── .env                           # Frontend environment variables
├── app.json                       # Expo configuration
├── package.json                   # Frontend dependencies
├── CLAUDE.md                      # AI assistant instructions
└── codeinfo.md                    # This file
```

---

## Backend Implementation

### 1. Server Entry Point

**File:** `backend/src/index.ts`

```typescript
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import classroomRoutes from './routes/classroom';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
}));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});
app.use('/api/classroom', classroomRoutes);

// Error handling
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`✅ VishwaSetu backend running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
});
```

### 2. Gemini Service

**File:** `backend/src/services/geminiService.ts`

**Key Class:** `GeminiLiveSession`

**Responsibilities:**

- Establish WebSocket connection to Gemini API
- Send audio chunks (Base64 PCM)
- Receive and parse events:
  - `setupComplete`: Connection established
  - `serverContent.turnComplete`: AI finished speaking
  - `serverContent.modelTurn`: AI's audio and transcript
  - `content.parts`: User's transcribed speech
- Handle errors and reconnection

**Core Methods:**

```typescript
class GeminiLiveSession {
  connect(): Promise<void>
  sendAudioChunk(base64Audio: string): void
  onInputTranscript(callback: (text: string) => void): void
  onOutputTranscript(callback: (text: string) => void): void
  onAudioResponse(callback: (audioData: string) => void): void
  disconnect(): void
}
```

**Configuration:**

```typescript
const config = {
  model: 'gemini-2.5-flash-native-audio-preview-12-2025',
  systemInstruction: SYSTEM_INSTRUCTION,  // From constants.ts
  generationConfig: {
    responseModalities: 'audio',
    speechConfig: {
      voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
    }
  }
};
```

### 3. Audio Utilities

**File:** `backend/src/services/audioUtils.ts`

**Functions:**

- `decode(base64: string): Uint8Array` - Decode Base64 to bytes
- `encode(bytes: Uint8Array): string` - Encode bytes to Base64
- `convertCafToPcm(cafBuffer: Buffer): Promise<Buffer>` - iOS format
- `convertAacToPcm(aacBuffer: Buffer): Promise<Buffer>` - Android format

**Audio Format Specs:**

- **Input (from mobile)**: CAF (iOS) or AAC (Android), 16kHz, mono
- **Gemini Input**: PCM 16-bit, 16kHz, mono, Base64 encoded
- **Gemini Output**: PCM 16-bit, 24kHz, mono, Base64 encoded

### 4. Authentication Middleware

**File:** `backend/src/middleware/auth.ts`

```typescript
import { verifyToken } from '@clerk/express';

export async function authenticateRequest(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const session = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });
    req.userId = session.sub;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

### 5. Classroom Routes

**File:** `backend/src/routes/classroom.ts`

**Endpoints:**

- `POST /session/start` - Initialize session
- `POST /session/:id/audio` - Upload audio chunk
- `GET /session/:id/events` - SSE stream (transcripts + audio)
- `POST /session/:id/stop` - End session

**Session Storage:**

```typescript
const sessions = new Map<string, GeminiLiveSession>();
```

---

## Frontend Implementation

### 1. Classroom Screen

**File:** `app/(tabs)/classroom.tsx`

**Component Structure:**

```tsx
export default function ClassroomScreen() {
  const { session, isRecording, startSession, stopSession, startRecording, stopRecording } = useClassroom();

  return (
    <View style={styles.container}>
      <Header session={session} />
      <MessageList messages={session?.messages} />
      <MicrophoneButton isRecording={isRecording} onPress={toggleRecording} />
      <SessionControls onStart={startSession} onStop={stopSession} />
    </View>
  );
}
```

**Styling Theme:**

- Background: `#F0FFF4` (Fresh Mint)
- Accent: `#10B981` (Emerald Green)
- User bubbles: White with green left border, right-aligned
- Vishwa bubbles: White with green right border, left-aligned

### 2. Classroom Hook

**File:** `hooks/useClassroom.ts`

**State Management:**

```typescript
export function useClassroom() {
  const [session, setSession] = useState<ClassroomSession | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Methods...
}
```

**Audio Recording Setup:**

```typescript
const startRecording = async () => {
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
    staysActiveInBackground: true,
  });

  const recording = new Audio.Recording();
  await recording.prepareToRecordAsync({
    ios: {
      extension: '.caf',
      sampleRate: 16000,
      numberOfChannels: 1,
      linearPCMBitDepth: 16,
    },
    android: {
      extension: '.m4a',
      sampleRate: 16000,
      numberOfChannels: 1,
    },
  });

  await recording.startAsync();
  recordingRef.current = recording;
};
```

### 3. API Client

**File:** `services/classroomApi.ts`

```typescript
class ClassroomApiClient {
  private baseUrl = process.env.EXPO_PUBLIC_API_URL;

  async startSession(): Promise<{ sessionId: string }> {
    const token = await getToken();  // Clerk
    const response = await fetch(`${this.baseUrl}/api/classroom/session/start`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    return response.json();
  }

  // Other methods...
}
```

---

## Live Classroom Feature

### System Instruction Prompt

**Source:** `workingcode/constants.ts`

The system instruction defines VishwaSetu's personality and teaching methodology:

```typescript
export const SYSTEM_INSTRUCTION = `
You are "VishwaSetu," a wise, patient, and friendly language teacher designed for villagers in India.

CRITICAL RULE:
Once the user identifies their native language (Telugu, Hindi, Marathi, Kannada, Tamil, or English),
you MUST speak to them EXCLUSIVELY in that language for all instructions, explanations, and encouragement.

YOUR GOAL:
To teach users foreign languages (French, Russian, Spanish, Chinese, Arabic, Japanese, English US)
using their mother tongue as the only bridge. Make the user "Country-Ready."

PHASE 1: THE WELCOME (Language Negotiation)
- Start: "Namaste! Welcome to VishwaSetu. What is your native language?"
- Wait for reply, then switch to that language.

PHASE 2: THE GOAL (Target Selection)
- In NATIVE language: "Which foreign language do you wish to learn today?"

PHASE 2.5: THE JOB (Work Context)
- In NATIVE language: "What kind of work will you do? (Construction, IT, Healthcare, etc.)"

PHASE 3: THE TEACHER (Instruction & Survival)
- ALL instructions in NATIVE language
- Adapt vocabulary based on job context
- Focus on practical survival phrases

PHASE 4: ROLEPLAY SIMULATIONS
- Scenarios: "Asking Boss for Leave", "Market Negotiation", etc.
- Set scene in native language → Speak phrase in target language → Ask user to repeat

METHOD:
1. Set the scene (Native Language)
2. Speak phrase (Native Language)
3. Say it in Target Language
4. Ask user to repeat
5. Provide feedback (Native Language)
`;
```

### Teaching Flow Example

**User Journey:**

1. User says: "Telugu" (native language)
2. Vishwa responds in Telugu: "బాగుంది! ఏ విదేశీ భాష నేర్చుకోవాలనుకుంటున్నారు?"
3. User says: "French"
4. Vishwa asks in Telugu: "మీరు ఏ పని చేస్తారు?"
5. User says: "Construction"
6. Vishwa teaches in Telugu: "మీ బాస్‌కు సెలవు అడగడం ఎలాగో నేర్పిస్తాను. ఈ వాక్యాన్ని వినండి..."
7. Vishwa speaks: "Puis-je prendre un congé?" (French)
8. User repeats (attempts pronunciation)
9. Vishwa gives feedback in Telugu

---

## API Reference

### Authentication

All API endpoints require Clerk Bearer token:

```
Authorization: Bearer <clerk_jwt_token>
```

### Endpoints

#### 1. Start Session

**POST** `/api/classroom/session/start`

**Request:**

```json
{
  "nativeLanguage": "Telugu",  // optional
  "targetLanguage": "French",  // optional
  "jobContext": "Construction"  // optional
}
```

**Response (200):**

```json
{
  "sessionId": "uuid-v4",
  "status": "active",
  "message": "Session created successfully"
}
```

#### 2. Send Audio Chunk

**POST** `/api/classroom/session/:sessionId/audio`

**Request:**

```json
{
  "audioData": "base64_encoded_audio_bytes",
  "format": "caf" | "aac" | "pcm",
  "sampleRate": 16000
}
```

**Response (200):**

```json
{
  "status": "processing"
}
```

#### 3. Event Stream (SSE)

**GET** `/api/classroom/session/:sessionId/events`

**Response:** Server-Sent Events stream

**Event Types:**

- `inputTranscript`: User's speech transcribed
- `outputTranscript`: Vishwa's speech transcribed
- `audioChunk`: Vishwa's audio response (Base64 PCM)
- `turnComplete`: Conversation turn finished
- `error`: Error occurred
- `heartbeat`: Connection keepalive (every 30s)

**Example:**

```
event: inputTranscript
data: {"text": "Hello"}

event: outputTranscript
data: {"text": "Welcome! What is your native language?"}

event: audioChunk
data: {"audioData": "base64...", "mimeType": "audio/pcm;rate=24000"}

event: turnComplete
data: {"timestamp": 1234567890}
```

#### 4. Stop Session

**POST** `/api/classroom/session/:sessionId/stop`

**Response (200):**

```json
{
  "status": "closed",
  "duration": 342,
  "messageCount": 24,
  "summary": {
    "userMessages": 12,
    "vishwaMessages": 12,
    "startTime": "2025-01-20T10:30:00Z",
    "endTime": "2025-01-20T10:35:42Z"
  }
}
```

---

## Audio Processing

### Recording (Mobile)

**iOS Configuration (CAF format):**

```typescript
{
  extension: '.caf',
  audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
  sampleRate: 16000,
  numberOfChannels: 1,
  bitRate: 128000,
  linearPCMBitDepth: 16,
  linearPCMIsBigEndian: false,
  linearPCMIsFloat: false,
}
```

**Android Configuration (AAC format):**

```typescript
{
  extension: '.m4a',
  outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
  audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
  sampleRate: 16000,
  numberOfChannels: 1,
  bitRate: 128000,
}
```

### Conversion (Backend)

**Using fluent-ffmpeg:**

```typescript
import ffmpeg from 'fluent-ffmpeg';

function convertToPcm(inputBuffer: Buffer, format: 'caf' | 'aac'): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    ffmpeg()
      .input(Readable.from(inputBuffer))
      .inputFormat(format)
      .audioFrequency(16000)
      .audioChannels(1)
      .audioCodec('pcm_s16le')
      .format('s16le')
      .on('data', (chunk) => chunks.push(chunk))
      .on('end', () => resolve(Buffer.concat(chunks)))
      .on('error', reject)
      .run();
  });
}
```

### Playback (Mobile)

```typescript
import { Audio } from 'expo-av';

async function playAudio(base64Pcm: string) {
  const audioBuffer = Buffer.from(base64Pcm, 'base64');
  const sound = new Audio.Sound();

  await sound.loadAsync({
    uri: `data:audio/pcm;base64,${base64Pcm}`,
  });

  await sound.playAsync();
}
```

---

## Authentication

### Clerk Setup

**Frontend (.env):**

```env
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
```

**Backend (.env):**

```env
CLERK_SECRET_KEY=sk_live_...
```

### Token Flow

1. User signs in via Clerk in mobile app
2. Clerk returns JWT token
3. Mobile app stores token in secure storage
4. All API requests include: `Authorization: Bearer <token>`
5. Backend verifies token with Clerk's `verifyToken()`
6. Backend attaches `userId` to request
7. Session tied to `userId` for security

### Token Refresh

```typescript
const makeAuthenticatedRequest = async (request: () => Promise<Response>) => {
  try {
    return await request();
  } catch (error) {
    if (error.status === 401) {
      const { getToken } = useAuth();
      await getToken({ skipCache: true });  // Refresh
      return await request();  // Retry
    }
    throw error;
  }
};
```

---

## Database Schema

### Tables (Drizzle ORM)

**File:** `backend/src/db/schema.ts`

```typescript
import { pgTable, uuid, varchar, timestamp, integer, text } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkId: varchar('clerk_id', { length: 255 }).notNull().unique(),
  nativeLanguage: varchar('native_language', { length: 50 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const sessions = pgTable('classroom_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  nativeLanguage: varchar('native_language', { length: 50 }),
  targetLanguage: varchar('target_language', { length: 50 }),
  jobContext: varchar('job_context', { length: 100 }),
  startTime: timestamp('start_time').notNull().defaultNow(),
  endTime: timestamp('end_time'),
  messageCount: integer('message_count').default(0),
});

export const messages = pgTable('classroom_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').references(() => sessions.id),
  role: varchar('role', { length: 10 }).notNull(),  // 'user' | 'vishwa'
  text: text('text').notNull(),
  audioUrl: varchar('audio_url', { length: 500 }),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
});

export const progress = pgTable('user_progress', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  targetLanguage: varchar('target_language', { length: 50 }).notNull(),
  phrasesLearned: integer('phrases_learned').default(0),
  sessionsCompleted: integer('sessions_completed').default(0),
  lastSessionDate: timestamp('last_session_date'),
});
```

### Migrations

**Create migration:**

```bash
cd backend
npx drizzle-kit generate:pg
```

**Apply migration:**

```bash
npx drizzle-kit push:pg
```

**Connection (Neon Database):**

```typescript
import { drizzle } from 'drizzle-orm/neon-serverless';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql);
```

---

## Deployment

### Backend Deployment (Railway/Render)

**1. Environment Variables:**

```env
NODE_ENV=production
PORT=3000
GEMINI_API_KEY=AIzaSy...
CLERK_SECRET_KEY=sk_live_...
DATABASE_URL=postgresql://...
ALLOWED_ORIGINS=https://yourapp.com,exp://...
```

**2. Build Command:**

```bash
npm run build
```

**3. Start Command:**

```bash
npm start
```

**4. Railway:**

```bash
railway login
railway init
railway up
```

### Mobile App Deployment (EAS)

**1. Configure EAS:**

```bash
eas build:configure
```

**2. Build for iOS:**

```bash
eas build --platform ios --profile production
```

**3. Build for Android:**

```bash
eas build --platform android --profile production
```

**4. Submit to stores:**

```bash
eas submit --platform ios
eas submit --platform android
```

### Environment Setup

**Production .env:**

```env
EXPO_PUBLIC_API_URL=https://your-backend.railway.app
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
```

---

## Troubleshooting

### Common Issues

#### 1. Audio Not Recording

**Symptom:** Microphone button doesn't record

**Solutions:**

- Check permissions in `app.json`
- Verify runtime permission granted
- Test `Audio.requestPermissionsAsync()`
- Check audio mode configuration

**Debug:**

```typescript
const { status } = await Audio.getPermissionsAsync();
console.log('Microphone permission:', status);
```

#### 2. No Transcripts Appearing

**Symptom:** Recording works but no text shows

**Solutions:**

- Verify backend connection (check network tab)
- Test SSE endpoint with curl
- Check audio format conversion
- Verify Gemini API key is valid

**Debug:**

```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/classroom/session/<id>/events
```

#### 3. High Audio Latency

**Symptom:** >5 second delay in responses

**Solutions:**

- Reduce audio chunk size (100ms)
- Check network speed
- Optimize audio conversion
- Use audio pre-buffering

**Optimization:**

```typescript
const CHUNK_DURATION = 100;  // milliseconds
const BUFFER_SIZE = 3;  // pre-buffer 3 chunks
```

#### 4. Session Disconnects

**Symptom:** SSE connection drops frequently

**Solutions:**

- Implement heartbeat (30s interval)
- Add reconnection logic
- Check firewall/proxy settings
- Use WebSocket as fallback

**Heartbeat:**

```typescript
setInterval(() => {
  res.write('event: heartbeat\ndata: {}\n\n');
}, 30000);
```

#### 5. Token Expired Errors

**Symptom:** 401 errors during session

**Solutions:**

- Implement auto-refresh
- Increase token TTL in Clerk
- Cache tokens with expiry check
- Add retry logic

**Auto-refresh:**

```typescript
const { getToken } = useAuth();
await getToken({ skipCache: true });
```

---

## Future Enhancements

### Planned Features

#### 1. Cultural Knowledge Hub

- Gemini 3 Flash with Google Search
- Grounded information with citations
- Workplace norms, legal requirements
- Cultural etiquette guides

#### 2. Visual Sign Bridge

- Camera integration
- Real-time sign translation
- Safety manual OCR
- Medicine label reading

#### 3. Emergency Quick-Help

- Instant phrase access
- "I need a doctor"
- "Call the police"
- "I am lost"
- One-tap emergency phrases

#### 4. Roleplay Simulations

- Predefined scenarios
- "Asking boss for leave"
- "Negotiating at market"
- "Explaining a problem"
- Interactive practice

#### 5. Progress Tracking

- Daily learning summaries
- Phrases learned counter
- Pronunciation accuracy score
- Weekly progress reports
- Achievement badges

#### 6. Offline Support

- Cache recent sessions
- Download phrase packs
- Queue unsent audio
- Sync when online

#### 7. Advanced Features

- Group classroom sessions
- Teacher dashboard
- Shared vocabulary lists
- Leaderboards
- Challenges and competitions

---

## Performance Metrics

### Target Benchmarks

| Metric | Target | Critical Threshold |
|--------|--------|-------------------|
| Audio latency | < 2 seconds | < 5 seconds |
| Session startup | < 1 second | < 3 seconds |
| Transcript delay | < 500ms | < 1 second |
| Message render | < 50ms | < 200ms |
| Memory usage | < 100MB | < 200MB |
| Network bandwidth | < 50 KB/s | < 100 KB/s |

### Monitoring

```typescript
// Track latency
const startTime = Date.now();
await sendAudioChunk(audio);
const latency = Date.now() - startTime;
console.log(`Audio upload latency: ${latency}ms`);

// Track memory
if (performance.memory) {
  console.log('Memory usage:', performance.memory.usedJSHeapSize / 1048576, 'MB');
}
```

---

## Contributing

### Development Workflow

1. **Clone repository:**

```bash
git clone https://github.com/yourorg/vishwasetu.git
cd vishwasetu
```

1. **Install dependencies:**

```bash
npm install
cd backend && npm install
```

1. **Setup environment:**

```bash
cp .env.example .env
# Edit .env with your keys
```

1. **Start backend:**

```bash
cd backend
npm run dev
```

1. **Start frontend:**

```bash
npm start
```

1. **Create feature branch:**

```bash
git checkout -b feature/your-feature
```

1. **Commit changes:**

```bash
git add .
git commit -m "Add your feature"
```

1. **Push and create PR:**

```bash
git push origin feature/your-feature
```

---

## License

**VishwaSetu** is proprietary software.
© 2026 VishwaSetu Development Team. All rights reserved.

---

## Support

For technical support or questions:

- **Email:** <support@vishwasetu.com>
- **Documentation:** <https://docs.vishwasetu.com>
- **GitHub Issues:** <https://github.com/yourorg/vishwasetu/issues>

---

**Last Updated:** January 21, 2026
**Version:** 1.0.0

----------------------------------------------------------------------------------------------

Testing Strategy:

  Phase 1: Test Gemini API Key (Simple Test Script)

  Goal: Verify your GEMINI_API_KEY works with both models

  We'll create simple test scripts in the backend folder to test:

  1. ✅ Gemini 2.5 Flash Native Audio (for Live Classroom)
  2. ✅ Gemini 3 Flash (for Cultural Knowledge Hub)

  No Express needed yet - just Node.js test scripts!

  Phase 2: Build Express Backend (Once API works)

  After confirming Gemini works, we'll build Express server for full Live Classroom

  Phase 3: Frontend Integration

  Connect React Native app to backend

  Phase 4: Database (Later)

  Add Neon + Drizzle for progress tracking

  ---
  Let's Start with Simple Gemini Tests

  I'll create test scripts in your backend folder. Do you want me to create:

  Option A: Both test scripts at once (recommended)

- backend/test-gemini-audio.js - Test Live Classroom model
- backend/test-gemini-search.js - Test Cultural Knowledge Hub model

  Option B: One at a time

- Start with Live Classroom test first

  Option C: Create a combined test menu

- Single script that lets you test all models interactively

  Which would you prefer? I recommend Option A so we can quickly verify both API keys work for your planned features.
