# Astro Connect (textbased-demo)

[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38B2AC.svg)](https://tailwindcss.com/)
[![Status](https://img.shields.io/badge/Status-Feature_Complete_SPA_Demo-brightgreen.svg)]()

**Astro Connect** is a full-featured single-page application (SPA) providing a comprehensive astrology consultation ecosystem. It supports three distinct role portals—**Seeker (User)**, **Astrologer**, and **Editor/Assistant**—complete with text-based consultations, audio call & chat simulators, live streaming rooms, multi-day Atonement (Pariharam) progress tracking, calendar scheduling, and wallet/payout systems.

> 📖 **For an in-depth architectural breakdown and feature analysis, read [PROJECT_ANALYSIS.md](file:///home/seechan5/orca/workspaces/astro-textbased/sabrefish/PROJECT_ANALYSIS.md).**

---

## 🌟 Core Highlights

- **Multi-Role Portal System**:
  - **User Portal (`/user`)**: Browse astrologers, submit text questions with voice recording, book appointments, track remedies, and join live sessions.
  - **Astrologer Portal (`/astrologer`)**: Answer questions with draft auto-save, manage availability and calendar, host live streams, configure perks/subscriptions, and manage earnings & withdrawals.
  - **Editor & Assistant Portal (`/editor`)**: Delegated role-based access control (RBAC) allowing assistants to draft responses, schedule events, and manage appointments under granular permissions.
- **Consultation Channels**:
  - **Text-Based Questions**: Category-based questions (Marriage, Career, Health), voice-to-text input, deadline countdowns, and attachment support.
  - **Instant Call & Chat**: Simulated live audio calls with floating drawer widgets and chat with automated birth-details intake.
  - **Live Video Broadcasts**: Multi-step live session hosting, audience chat, super-chats, and post-session summaries.
- **Atonement / Pariharam Engine**:
  - Structured multi-day remedies (7, 21, 48, 108 days) with daily step tracking, proof photo submissions, and verification workflows.
- **Financial & Wallet Ecosystem**:
  - Simulated multi-tier pricing, promotional campaigns, question package bundles, running ledger balances, and settlement payouts.

---

## 🚀 Quick Start

### 1. Installation

```bash
# Clone repository and navigate to folder
cd sabrefish

# Install dependencies
npm install
```

### 2. Run Locally

```bash
# Start Vite development server
npm run dev
```

Visit `http://localhost:5173` in your browser.

### 3. Build & Test

```bash
# Production build
npm run build

# Preview build
npm run preview

# Lint with Oxlint
npm run lint

# Run Vitest unit tests
npm run test
```

---

## 🔑 Demo Credentials

| Role | Email | Password | Landing Route |
| :--- | :--- | :--- | :--- |
| **Seeker (User)** | `user@astroconnect.com` | `User@123` | [`/user`](http://localhost:5173/user) |
| **Astrologer** | `astro@astroconnect.com` | `Astro@123` | [`/astrologer`](http://localhost:5173/astrologer) |
| **Astrologer (Alias)** | `dr.rani@astroconnect.com` | `Astro@123` | [`/astrologer`](http://localhost:5173/astrologer) |
| **Editor / Assistant** | `priya@astroconnect.com` | *(Invitation flow)* | [`/editor`](http://localhost:5173/editor) |

---

## 📂 Project Structure

```
sabrefish/
├── PROJECT_ANALYSIS.md        # Comprehensive technical & architectural analysis
├── ATONEMENT-SCRUM.md         # Scrum backlog and detailed user stories
├── src/
│   ├── components/            # UI elements, modals, drawers, audio recorders
│   ├── data/                  # Mock databases (astrologers, appointments, remedies)
│   ├── pages/                 # User, Astrologer, and Editor view routes
│   ├── state/                 # Context state providers (Auth, AppData, Editor, Call)
│   └── utils/                 # Business logic, math engines, and unit tests
└── package.json
```

---

## 📄 Documentation

- [Comprehensive Project Analysis](file:///home/seechan5/orca/workspaces/astro-textbased/sabrefish/PROJECT_ANALYSIS.md)
- [Atonement Scrum Backlog](file:///home/seechan5/orca/workspaces/astro-textbased/sabrefish/ATONEMENT-SCRUM.md)
- [Project Context Summary](file:///home/seechan5/orca/workspaces/astro-textbased/sabrefish/context.md)
