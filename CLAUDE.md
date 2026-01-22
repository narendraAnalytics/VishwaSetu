# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**VishwaSetu** ("Global Language Bridge") is an Expo React Native application (v54) designed to empower Indian villagers, migrant workers, and students to become "Country-Ready" for employment in foreign countries. The app bridges Indian native languages with world languages (French, Spanish, Russian, Chinese, Arabic) through job-specific, survival-focused language learning.

### Mission
Unlike basic translators, VishwaSetu teaches practical phrases for work, navigation, and emergency survival in foreign countries, with job-specific vocabulary tailored to careers like Construction, IT, Healthcare, Engineering, and Driving.

## Key Technologies

- **Framework**: Expo SDK 54 with React 19.1.0 and React Native 0.81.5
- **Navigation**: Expo Router v6 with file-based routing and typed routes enabled
- **Authentication**: Clerk Expo integration (`@clerk/clerk-expo`)
- **Database**: Neon Database with Drizzle ORM
- **Styling**: Custom theme system via `constants/theme.ts` with light/dark mode support
- **Animations**: react-native-reanimated for 60fps UI thread animations
- **Images**: expo-image for optimized image loading with caching
- **Architecture**: React Compiler and New Architecture enabled

### AI Models (Planned)
- **Gemini 2.5 Flash Native Audio**: Real-time voice classroom with low-latency interaction
- **Gemini 3 Flash**: Cultural knowledge hub with Google Search grounding

## Development Commands

### Frontend (Expo/React Native)

```bash
# Install dependencies
npm install

# Start Expo dev server (choose platform after)
npm start
# or
npx expo start

# Start on specific platforms
npm run android
npm run ios
npm run web
```

### Backend (Express Server)

The backend is a Node.js Express server in the `backend/` directory:

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install --legacy-peer-deps

# Start development server (uses ts-node)
npm run dev

# Build TypeScript to dist/
npm run build

# Run production build
npm start
```

**Backend runs on**: `http://localhost:3000` (default, configurable via `PORT` env variable)

**API Endpoints**:
- `GET /health` - Health check
- `GET /api/test-gemini` - Test Gemini API connection
- `POST /api/classroom/session/start` - Start Live Classroom session
- `POST /api/classroom/session/:id/stop` - Stop session
- `POST /api/classroom/session/:id/audio` - Send audio chunk (base64)
- `GET /api/classroom/session/:id/events` - SSE event stream for real-time updates

### Installing New Packages

When adding database/backend packages, use `--legacy-peer-deps`:
```bash
npm install <package> --legacy-peer-deps
```

### Linting

```bash
npm run lint
```

Common warnings to expect:
- `react-hooks/exhaustive-deps` in files using `react-native-reanimated` shared values
- These are intentional and suppressed with `// eslint-disable-next-line` comments

### EAS Build Commands

```bash
# Development build
eas build --profile development

# Preview build (internal distribution)
eas build --profile preview

# Production build (auto-increment enabled)
eas build --profile production
```

## Architecture

### File-Based Routing Structure

The app uses Expo Router with the following structure:

- `app/_layout.tsx` - Root layout with theme provider, custom splash screen control, and navigation stack
- `app/(tabs)/` - Stack navigation group (anchor route)
  - `_layout.tsx` - Stack configuration with 4 screens: index, home, classroom, profile
  - `index.tsx` - Landing page with auto-advancing image carousel (unauthenticated)
  - `home.tsx` - Dashboard with feature cards and user avatar (authenticated, redirects if not signed in)
  - `classroom.tsx` - Live Classroom screen with voice interaction UI
  - `profile` - User profile screen (planned)
- `app/modal.tsx` - Modal screen presentation

**Screen Routes**:
- `/(tabs)` → Landing page (entry point with carousel)
- `/(tabs)/home` → Dashboard (requires Clerk authentication)
- `/(tabs)/classroom` → Live Classroom (requires Clerk authentication)
- `/(tabs)/profile` → Profile page (requires Clerk authentication)

**Navigation anchor**: The default navigation anchor is set to `(tabs)` via `unstable_settings` in `app/_layout.tsx:14-16`.

**Important**: The `(tabs)` directory uses Stack navigation, not Tabs. The name is kept for routing purposes but navigation is configured as Stack in `_layout.tsx`.

### Theme System

Theming is centralized in `constants/theme.ts`:
- `Colors` object with `light` and `dark` variants
- `Fonts` object with platform-specific font families (iOS, web, default)
- Hook `useThemeColor()` at `hooks/use-theme-color.ts` for component-level theme access
- Themed components: `ThemedView` and `ThemedText` in `components/`

**Theme usage pattern**: Components use `useThemeColor()` to access theme-aware colors. The hook accepts optional light/dark overrides and falls back to theme constants.

### VishwaSetu Brand Colors

**Primary Color Scheme** (Fresh Mint theme):
- **Background**: `#F0FFF4` - Fresh Mint (represents growth, learning, freshness)
- **Accent**: `#10B981` - Emerald Green (landingAccent in theme.ts)
- **Inactive elements**: `rgba(16, 185, 129, 0.3)` - 30% opacity accent

**Splash Screen Flowers** (Pink/Magenta palette):
- Hot Pink: `#FF69B4`
- Deep Pink: `#FF1493`
- Light Pink: `#FFB6C1`

### Asset Locations

- **Logo**: `public/images/logo.png` - Original landscape logo (282KB, 300x200)
- **Splash Screen**: `public/images/splashscreen.png` - Full-screen portrait image (compressed)
- **Landing Banners**: `public/images/bannerimage.png`, `bannerimage1-3.png` (4 total)
- **App Icons**: `assets/images/icon.png`, `android-icon-*.png`

### Component Organization

- `components/` - Reusable UI components
  - `SplashScreen.tsx` - Custom animated splash screen with falling flowers and full-screen logo
  - `themed-*.tsx` - Theme-aware wrappers for native components
  - `ui/` - UI primitives (Collapsible, IconSymbol)
  - `haptic-tab.tsx` - Tab button with haptic feedback
  - `parallax-scroll-view.tsx` - Animated scroll component

- `hooks/` - Custom React hooks
  - `useClassroom.ts` - Manages Live Classroom session state, audio recording, SSE events
  - `use-theme-color.ts` - Theme-aware color access
  - `use-color-scheme.ts` - System color scheme detection

- `services/` - API integration layer
  - `classroomApi.ts` - Frontend API client for classroom endpoints (uses `EXPO_PUBLIC_API_URL` env var)

- `app/types/` - TypeScript type definitions
  - `classroom.ts` - Types for `ClassroomSession`, `ClassroomMessage`, etc.

### Custom Splash Screen

The app uses a dual splash screen approach:
1. **Native splash** (~500ms): Configured via `expo-splash-screen` plugin in `app.json`
2. **Custom animated splash** (3000ms): Rendered by `CustomSplashScreen` component in `app/_layout.tsx`
   - Full-screen VishwaSetu logo (`public/images/splashscreen.png`)
   - 6 falling flower animations using MaterialCommunityIcons
   - Fresh Mint background (#F0FFF4)
   - Total splash time: ~3.5 seconds

Control logic in `app/_layout.tsx:20-36` manages the transition from custom splash to main app.

### TypeScript Configuration

- Strict mode enabled
- Path alias: `@/*` maps to root directory
- Expo types automatically included via `.expo/types/`

### Clerk Authentication

The project includes `@clerk/clerk-expo` with `expo-secure-store` plugin configured. Token storage uses secure-store for production environments.

### Database Setup

The project uses Neon Database with Drizzle ORM. Key packages installed with `--legacy-peer-deps`:
- `@neondatabase/serverless` - Neon serverless driver
- `drizzle-orm` - TypeScript ORM
- `drizzle-kit` (dev) - Migration tool
- `uuid` and `@types/uuid` - UUID generation

Database schemas and migrations are located in `backend/src/` (structure to be defined).

### Backend Architecture

**Location**: `backend/src/`

**Structure**:
- `index.ts` - Express server entry point with CORS, body-parser, and route mounting
- `routes/classroom.ts` - Classroom API endpoints
- `services/geminiService.ts` - Gemini API wrapper for testing
- `services/geminiLiveService.ts` - Gemini Live API 2-way audio streaming
- `services/audioUtils.ts` - Audio format conversion utilities (PCM, base64)
- `config/constants.ts` - Configuration constants

**Key Technologies**:
- Express.js with TypeScript
- `@google/genai` - Gemini API SDK
- Server-Sent Events (SSE) for real-time streaming to frontend
- Audio processing with `fluent-ffmpeg`

**TypeScript Configuration** (`backend/tsconfig.json`):
- Target: ES2020
- Module: CommonJS (required for Express compatibility)
- Output: `dist/` directory
- Strict mode enabled

### Live Classroom Implementation

**Frontend** (`app/(tabs)/classroom.tsx` + `hooks/useClassroom.ts`):
- Uses `expo-audio` hooks: `useAudioRecorder`, `useAudioPlayer`, `useAudioRecorderState`
- Records audio in HIGH_QUALITY preset
- Converts recorded audio (CAF/M4A) to base64 and sends to backend
- Receives real-time transcripts via SSE events
- UI displays conversation bubbles with role labels (Student/Vishwa)

**Backend** (`backend/src/routes/classroom.ts` + `services/geminiLiveService.ts`):
- Manages Gemini Live API WebSocket connection
- Converts incoming audio formats to PCM16 (required by Gemini)
- Streams audio chunks to Gemini in real-time
- Broadcasts events to frontend via SSE:
  - `inputTranscript` - User speech transcription
  - `outputTranscript` - Vishwa's response transcription
  - `turnComplete` - Signal to finalize messages
  - `status` - Connection status updates
  - `error` - Error notifications

**SSE Event Flow**:
1. Frontend calls `POST /api/classroom/session/start` → Receives `sessionId`
2. Frontend opens SSE connection to `GET /api/classroom/session/:id/events`
3. Backend emits `status`, `inputTranscript`, `outputTranscript`, `turnComplete` events
4. Frontend updates UI in real-time based on events
5. Frontend sends audio via `POST /api/classroom/session/:id/audio` with base64 payload

**Critical Implementation Notes**:
- Audio recording permissions requested on mount via `AudioModule.requestRecordingPermissionsAsync()`
- Audio mode set to `playsInSilentMode: true, allowsRecording: true`
- SSE connection uses `XMLHttpRequest` (React Native compatible, not EventSource)
- Recording format auto-detected: `.caf` (iOS) or `.m4a` (Android/others) → Backend converts to PCM16

## Important Configuration Details

### Expo Plugins

Configured in `app.json:28-42`:
1. `expo-router` - File-based routing
2. `expo-splash-screen` - Custom splash with light/dark variants
3. `expo-secure-store` - Secure token storage

### Experimental Features

Enabled in `app.json:44-47`:
- **Typed Routes**: Type-safe navigation with auto-generated route types
- **React Compiler**: Automatic optimization via React Compiler

### Landing Page Carousel

**Location**: `app/(tabs)/index.tsx`

The landing page features an auto-advancing full-screen image carousel:
- **Images**: 4 banners from `public/images/` (bannerimage.png, bannerimage1-3.png)
- **Auto-advance**: 3-second intervals with infinite loop
- **Rendering**: All 4 images rendered simultaneously with opacity control (visible: 1, hidden: 0)
- **Pagination**: 4 dots at bottom, Fresh Mint theme (#10B981 active, rgba(16,185,129,0.3) inactive)
- **Full-screen**: Edge-to-edge using absolute positioning (`top:0, left:0, right:0, bottom:0`)
- **Navigation bar**: Hidden via `expo-navigation-bar` on mount

**Critical implementation notes**:
- Uses `contentFit="cover"` for edge-to-edge fill
- All images pre-mounted to avoid blank screens during transitions
- Loop logic: `(prev + 1) % 4` for infinite cycling

### Platform-Specific Notes

- **Android**: Edge-to-edge enabled (`edgeToEdgeEnabled: true`), predictive back gesture disabled
  - Navigation bar hidden on landing page for immersive full-screen experience
  - `expo-navigation-bar` package used for runtime control
- **iOS**: Tablet support enabled
- **Web**: Static output mode configured

## Development Workflow

### Adding New Screens

1. Create screen file in `app/` following the routing convention
2. Add `Stack.Screen` entry in `app/(tabs)/_layout.tsx`
3. If authentication required, add redirect logic using `useUser()` from `@clerk/clerk-expo`
4. Access via typed routes from `expo-router` (e.g., `router.push('/(tabs)/classroom')`)

### Modifying Theme

1. Update `constants/theme.ts` for global changes
2. Use `useThemeColor()` hook in components for theme-aware values
3. Test both light and dark modes (controlled by system settings)

### Working with Navigation

- Stack navigation is configured in `app/(tabs)/_layout.tsx` (not Tabs despite directory name)
- Modal presentations use `Stack.Screen` with `presentation: 'modal'`
- Navigation bar can be controlled via `expo-navigation-bar` package
- Pattern for authenticated screens:
  ```typescript
  const { isSignedIn, user, isLoaded } = useUser();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace('/(tabs)');
    }
  }, [isLoaded, isSignedIn, router]);
  ```

### Working with Animations (react-native-reanimated)

- Use `useSharedValue()` for animated values on the UI thread
- Shared values are stable references and don't need to be in `useCallback` deps
- Use `// eslint-disable-next-line react-hooks/exhaustive-deps` when ESLint incorrectly flags shared values
- Pattern: `withTiming()` for smooth transitions, `withRepeat()` for continuous animations
- `runOnJS()` required to call React state setters from worklet functions
- Example staggered animations: `app/(tabs)/home.tsx:66-79` uses `withDelay()` for sequential icon entrance

### Working with Full-Screen Images

- Use absolute positioning pattern: `{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }`
- Avoid `Dimensions.get('window')` in edge-to-edge mode - use edge anchoring instead
- `expo-image` with `contentFit="cover"` for full-screen edge-to-edge fill
- Use relative paths (`../../public/images/`) not path aliases (`@/`) for `require()` with static assets

### Working with Audio (expo-audio)

- Use `useAudioRecorder(RecordingPresets.HIGH_QUALITY)` for recording
- Use `useAudioRecorderState(recorder)` to track recording state
- Request permissions on mount: `AudioModule.requestRecordingPermissionsAsync()`
- Set audio mode for background recording: `setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true })`
- Pattern for recording workflow:
  ```typescript
  await recorder.prepareToRecordAsync();
  recorder.record(); // Start
  await recorder.stop(); // Stop
  const uri = recorder.uri; // Get file URI
  ```
- Convert to base64 for API upload: `readAsStringAsync(uri, { encoding: 'base64' })`

### Adding Backend Endpoints

1. Create route handler in `backend/src/routes/`
2. Mount route in `backend/src/index.ts` using `app.use()`
3. For real-time features, use SSE pattern from `routes/classroom.ts`
4. SSE headers required:
   ```typescript
   res.setHeader('Content-Type', 'text/event-stream');
   res.setHeader('Cache-Control', 'no-cache');
   res.setHeader('Connection', 'keep-alive');
   ```
5. Send events: `res.write(`event: eventName\ndata: ${JSON.stringify(data)}\n\n`)`

### Environment Variables

**Frontend** (`.env` in root):
- `EXPO_PUBLIC_API_URL` - Backend URL (e.g., `http://localhost:3000`)
- Clerk keys: `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`

**Backend** (`backend/.env`):
- `PORT` - Server port (default: 3000)
- `GEMINI_API_KEY` - Google Gemini API key
- Database credentials (if using Neon/PostgreSQL)

## Feature Implementation Status

### Implemented Features

1. **Live Classroom** ✅ (Initial implementation)
   - Location: `app/(tabs)/classroom.tsx`, `hooks/useClassroom.ts`, `backend/src/routes/classroom.ts`
   - Real-time voice interaction with Gemini Live API
   - 2-way audio streaming (user → Gemini, Gemini → user)
   - SSE-based real-time transcription display
   - Recording state management with visual feedback (pulsing mic button)
   - Conversation history with Student/Vishwa role labels

2. **Dashboard Screen** ✅
   - Location: `app/(tabs)/home.tsx`
   - User avatar with Clerk integration (shows image or initials)
   - 4 feature cards with staggered entrance animations
   - Auto-hiding navigation icons (home, history, contact)
   - Touch-based icon reveal (3-second auto-hide)

3. **Landing Page Carousel** ✅
   - Location: `app/(tabs)/index.tsx`
   - 4-image auto-advancing carousel (3-second intervals)
   - Full-screen edge-to-edge display
   - Pagination dots with Fresh Mint theme

4. **Authentication** ✅
   - Clerk Expo integration with `@clerk/clerk-expo`
   - Protected routes with redirect logic
   - User profile data access

### Planned Features

See `workingcode/app.md` for complete feature roadmap. Key upcoming features:

1. **Live Classroom Enhancements**
   - Job-specific vocabulary modules (Construction, IT, Healthcare, Engineering, Driving)
   - Survival curriculum (work dialogue, navigation, emergencies)
   - Cultural etiquette integration
   - Pronunciation feedback

2. **Cultural Knowledge Hub**
   - Grounded information with Google Search
   - Workplace norms and legal requirements
   - Cultural etiquette with citations

3. **Visual Sign Bridge**
   - Camera-based sign translation using `expo-camera`
   - Read work-site signs, safety manuals, medicine labels
   - Explain meaning in user's native language

4. **Emergency Quick-Help Mode**
   - Critical phrases for safety: "I need a doctor", "Call the police", "I am lost"

5. **Roleplay Simulations**
   - Practice scenarios: "Asking boss for leave", "Negotiating at market"

6. **Progress Tracking**
   - Voice-based progress reports
   - Daily learning summaries
