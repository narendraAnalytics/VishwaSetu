# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Vishwasetu** is an Expo React Native application (v54) built with TypeScript and using Expo Router for file-based navigation. The app supports iOS, Android, and web platforms with automatic dark mode support.

## Key Technologies

- **Framework**: Expo SDK 54 with React 19.1.0 and React Native 0.81.5
- **Navigation**: Expo Router v6 with file-based routing and typed routes enabled
- **Authentication**: Clerk Expo integration
- **Styling**: Custom theme system via `constants/theme.ts` with light/dark mode support
- **Architecture**: React Compiler and New Architecture enabled

## Development Commands

### Starting Development

```bash
# Install dependencies
npm install

# Start Expo dev server (choose platform after)
npm start

# Start on specific platforms
npm run android
npm run ios
npm run web
```

### Linting

```bash
npm run lint
```

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

- `app/_layout.tsx` - Root layout with theme provider and navigation stack
- `app/(tabs)/` - Tab navigation group (anchor route)
  - `_layout.tsx` - Tab bar configuration with haptic feedback
  - `index.tsx` - Home tab
  - `explore.tsx` - Explore tab
- `app/modal.tsx` - Modal screen presentation

**Navigation anchor**: The default navigation anchor is set to `(tabs)` via `unstable_settings` in `app/_layout.tsx:8-10`.

### Theme System

Theming is centralized in `constants/theme.ts`:
- `Colors` object with `light` and `dark` variants
- `Fonts` object with platform-specific font families (iOS, web, default)
- Hook `useThemeColor()` at `hooks/use-theme-color.ts` for component-level theme access
- Themed components: `ThemedView` and `ThemedText` in `components/`

**Theme usage pattern**: Components use `useThemeColor()` to access theme-aware colors. The hook accepts optional light/dark overrides and falls back to theme constants.

### Component Organization

- `components/` - Reusable UI components
  - `themed-*.tsx` - Theme-aware wrappers for native components
  - `ui/` - UI primitives (Collapsible, IconSymbol)
  - `haptic-tab.tsx` - Tab button with haptic feedback
  - `parallax-scroll-view.tsx` - Animated scroll component

### TypeScript Configuration

- Strict mode enabled
- Path alias: `@/*` maps to root directory
- Expo types automatically included via `.expo/types/`

### Clerk Authentication

The project includes `@clerk/clerk-expo` with `expo-secure-store` plugin configured. Token storage uses secure-store for production environments.

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

### Platform-Specific Notes

- **Android**: Edge-to-edge enabled, predictive back gesture disabled
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
- Tab navigation is configured in `app/(tabs)/_layout.tsx`
- Modal presentations use `Stack.Screen` with `presentation: 'modal'`
- Haptic feedback is integrated into tab navigation via `HapticTab` component
