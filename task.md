# WalkGoal PWA - Project Status

## Overview
This file tracks the development progress of the WalkGoal PWA. It is stored in the project folder to ensure context is preserved across devices via OneDrive.

## Current Status
- **PWA Core**: Fully functional (manifest, service worker installed).
- **Tech Stack**: React, TypeScript, Tailwind CSS, Vite.
- **Data Persistence**: Uses `localStorage` for saving logs and goals.

## Completed Features
- [x] **Dashboard**: Visual circular progress, "Ahead/Behind" indicator, Heatmap for consistency.
- [x] **Goal Setting**: Interface to set Weekly, Monthly, and Yearly distance goals.
- [x] **Logging**: Add walks with distance and date.
- [x] **History/Storage**: Save data locally and persist across reloads.
- [x] **Settings**: Dark/Light mode toggle, Export/Import JSON data.
- [x] **App Icon**: Custom neon shoe icon (native Android integration).
- [x] **Native Features**: Fixed Backup/Export on Android using System Share Sheet.
- [x] **UI Polish**: Removed redundant Logout button.
- [x] **App Icon**: Custom neon shoe icon (native Android integration).
- [x] **Native Features**: Fixed Backup/Export on Android using System Share Sheet.
- [x] **UI Polish**: Removed redundant Logout button and fixed padding issues.
- [x] **Help Center**: Added in-app guide for features and settings.
- [x] **Roadmap**: Added "Coming Soon" section to Settings.
- [x] **Roadmap Update**: Added "GPS Tracking" to the Coming Soon list.

## Pending Tasks / Ideas
- [x] **Mobile App**: Convert to Capacitor for APK/iOS build support (Enables background GPS).
  - *Note: Requires Android Studio to build final APK.*
- [ ] **Data Visualization**: Add graphs (bar/line charts) for better historical insight.
- [ ] **Gamification**: Add badges or streak counters to motivate the user.
- [ ] **Cloud Sync (Supabase)**: Optional hybrid cloud sync (Local-first + Supabase PostgreSQL) to secure user data with custom email login.
- [x] **Localization**: Support for miles vs km and Week Start (Mon/Sun).
- [ ] **PWA Refinement**: Ensure "Install App" prompt works smoothly on mobile.
- [ ] **Integrations (Strava & Health Connect)**: Add settings toggles and a manual "Sync Now" button to automatically import walks from Garmin/Strava/Health apps.
