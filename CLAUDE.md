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

### Starting Development

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
  - `_layout.tsx` - Stack configuration (converted from Tabs to Stack)
  - `index.tsx` - Landing page with auto-advancing image carousel
  - `explore.tsx` - Available for future screens
- `app/modal.tsx` - Modal screen presentation

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

When adding new screens:
1. Create screen file in `app/` following the routing convention
2. Use `Stack.Screen` or route groups `()` for organization
3. Access via typed routes from `expo-router`

When modifying theme:
1. Update `constants/theme.ts` for global changes
2. Use `useThemeColor()` hook in components for theme-aware values
3. Test both light and dark modes (controlled by system settings)

When working with navigation:
- Stack navigation is configured in `app/(tabs)/_layout.tsx` (not Tabs despite directory name)
- Modal presentations use `Stack.Screen` with `presentation: 'modal'`
- Navigation bar can be controlled via `expo-navigation-bar` package

When working with animations (react-native-reanimated):
- Use `useSharedValue()` for animated values on the UI thread
- Shared values are stable references and don't need to be in `useCallback` deps
- Use `// eslint-disable-next-line react-hooks/exhaustive-deps` when ESLint incorrectly flags shared values
- Pattern: `withTiming()` for smooth transitions, `withRepeat()` for continuous animations
- `runOnJS()` required to call React state setters from worklet functions

When working with full-screen images:
- Use absolute positioning pattern: `{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }`
- Avoid `Dimensions.get('window')` in edge-to-edge mode - use edge anchoring instead
- `expo-image` with `contentFit="cover"` for full-screen edge-to-edge fill
- Use relative paths (`../../public/images/`) not path aliases (`@/`) for `require()` with static assets

## Planned Features

See `workingcode/app.md` for complete feature roadmap. Key upcoming features:

1. **Live Classroom** - Real-time voice interaction with Gemini 2.5 Flash
   - Job-specific vocabulary (Construction, IT, Healthcare, Engineering, Driving)
   - Survival curriculum (work dialogue, navigation, emergencies)
   - Cultural etiquette integration

2. **Cultural Knowledge Hub** - Grounded information with Google Search
   - Workplace norms and legal requirements
   - Cultural etiquette with citations

3. **Visual Sign Bridge** - Camera-based sign translation
   - Read work-site signs, safety manuals, medicine labels
   - Explain meaning in user's native language

4. **Emergency Quick-Help Mode** - Critical phrases for safety
   - "I need a doctor", "Call the police", "I am lost"

5. **Roleplay Simulations** - Practice scenarios
   - "Asking boss for leave", "Negotiating at market"

6. **Progress Tracking** - Voice-based progress reports
   - Daily learning summaries
