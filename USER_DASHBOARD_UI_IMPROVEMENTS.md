# User Dashboard UI Improvements Plan

> **Branch:** `usersideuiimprovements`  
> **Target Page:** User Dashboard (`/user`) — [`src/pages/UserDashboard.jsx`](file:///home/seechan5/orca/workspaces/astro-textbased/sabrefish/src/pages/UserDashboard.jsx)

---

## 1. Key Metrics & Quick-Glance Summary Cards
Add a high-level summary stats row immediately below the Hero Banner:
- **Wallet & Balance Card:**
  - Live wallet balance (`₹500.00`) with quick `+ Add Funds` / `Top-up` trigger.
  - Question credits counter (e.g., `2 Prepaid Questions Remaining`).
- **Next Upcoming Appointment Card:**
  - Immediate countdown badge: e.g. *"Audio Call with Arjun Sharma in 2 days (27 Aug, 11:30 AM)"*.
  - Direct `View Details` and `Test Audio` actions.
- **Active Atonement / Remedy Card:**
  - Active remedy progress bar: e.g. *"Rahu Shanti Ritual — Day 4 of 21"*.
  - Quick action: *"Submit Today's Proof"*.
- **Daily Astro Insight / Horoscope Card:**
  - Auspicious time (Shubh Muhurat) & daily sign guidance with link to full Kundli report.

---

## 2. Enhanced Hero Banner
- Dynamic contextual alert (e.g. *"1 answer ready to view"*, *"3 followed astrologers online"*).
- Dual action buttons: Primary `Ask a Question` (gradient) + Secondary `Instant Consultation` (outline/glassmorphic).

---

## 3. Elevated "Quick Actions" Design
- Semantic color-coding:
  - **Ask Question:** Indigo / Violet (`MessagesSquare`)
  - **Book Appointment:** Amber / Orange (`CalendarDays`)
  - **Instant Chat:** Emerald Green with live pulse indicator (`MessageCircle`)
  - **Instant Call:** Electric Cyan / Blue (`PhoneCall`)
  - **Join Live:** Crimson / Rose with blinking `LIVE` badge (`Radio`)
- Micro-interactions: Subtle hover lift (`translate-y-[-2px]`), border glow, and refined subtext.

---

## 4. Polished "Recommended Astrologers" Section
- Avatar ring with animated green online status dot / offline indicator.
- Distinct pill badges for specialization and rating (`★ 4.7 (1,710)`).
- Dual prominent CTAs on each card: `📞 Call · ₹X/m` and `💬 Chat · ₹X/m`.
- Quick filter tabs: `All`, `Online Now`, `Vedic`, `Tarot`, `Numerology`.

---

## 5. Revamped Appointments & Activity Sections
- **Interactive Appointment Cards:** Astrologer avatar, consultation mode icon (Audio/Video), color-coded status badge, and direct `Join Room` / `Reschedule` buttons.
- **Timeline-Style Activity List:** Visual state transition indicators (Question Submitted $\rightarrow$ Answer Received $\rightarrow$ Remedy Prescribed).

---

## 6. "Live Now" Broadcast Banner
- Dedicated broadcast banner when an astrologer goes live.
- Waveform / pulsing red indicator, session title, live listener count, and direct `Join Stream` button.
