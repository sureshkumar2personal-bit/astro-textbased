# Project Context

## Overview
`textbased-demo` is a React + Vite single-page application that simulates an astrology services portal called **Astro Connect**.

The app has two main user roles:
- **User**
- **Astrologer**

It includes role-based routing, local auth persistence, shared app state, notifications, wallet/history views, questions, disputes, campaigns, appointments, and live session pages.

## Tech Stack
- React 19
- Vite
- React Router DOM
- Framer Motion
- Lucide React
- Tailwind CSS 4
- Vitest
- Oxlint

## Scripts
- `npm run dev` - start the Vite dev server
- `npm run build` - create a production build
- `npm run preview` - preview the production build
- `npm run lint` - run Oxlint
- `npm run test` - run Vitest tests

## App Structure

### Entry and Routing
- `src/main.jsx` boots the app.
- `src/App.jsx` wires providers and defines routes.
- `src/utils/roleRoutes.js` defines role-aware base paths and dashboard redirects.

### Global Providers
- `src/state/AuthContext.jsx` stores auth state in `localStorage`, seeds demo users, and exposes `login`, `register`, and `logout`.
- `src/state/ThemeContext.jsx` manages light/dark theme and persists the choice.
- `src/state/AppDataContext.jsx` contains the in-memory app dataset and actions for notifications and domain data.

### Layout
- `src/components/Layout.jsx` provides the authenticated shell, sidebar navigation, top bar actions, notifications, profile popovers, and page metadata.
- `src/components/SidebarItem.jsx`, `src/components/ThemeToggle.jsx`, and `src/components/NotificationsPanel.jsx` support the shell.

### Pages
Routes are grouped by role:
- Public: `Login`, `Register`
- Astrologer: dashboard, text questions, sales management, wallet history, answer question, dispute management, purchase package
- User: dashboard, wallet history, purchase package, ask question, track questions, raise dispute, astrologer profile, appointment details, pooja details, live session

## Data Model
The app is intentionally demo-driven and uses local mock data rather than a backend.

Important state files:
- `src/data/mockData.js`
- `src/data/mockNotifications.js`
- `src/data/notificationData.js`

Common entities include:
- users
- questions
- campaigns
- notifications
- appointments
- astrologer profiles
- live sessions
- pooja details

## Behavioral Notes
- Authentication is role-based and inferred from email domain:
  - `.com` for users
  - `.app` for astrologers
- Users are redirected to the correct dashboard after login.
- The layout uses route metadata to show the current page title and subtitle.
- Notifications are filtered by role and can navigate to route targets.
- Theme selection is saved locally and applied to the document root.

## UI Notes
- Styling is mostly driven through `src/index.css` and utility classes.
- The UI uses a polished admin-dashboard style with cards, panels, icons, and motion.
- `framer-motion` is used for animated interactions in the shell and page transitions.

## Testing
- `src/utils/selectSections.test.js` is the primary test file present in the repo.
- If you change routing, auth rules, or data selection logic, update tests accordingly.

## Conventions
- The codebase uses ES modules.
- Components and hooks are organized by feature area.
- Demo data is stored in context/state modules, not a remote API.
- Keep role-aware navigation and redirects consistent with `src/utils/roleRoutes.js`.
