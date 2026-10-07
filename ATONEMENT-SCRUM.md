# Astro Connect — Scrum Backlog (Atonement Space)

> **Project:** Astro Connect (textbased-demo)
> **Platform:** React 19 + Vite + Tailwind CSS 4
> **Portals:** User · Astrologer · Editor
> **Document:** Epic → User Story → Sub-task hierarchy
> **Jira Import:** Use Jira's CSV/Markdown import or create issues manually from this document

---

## Epic 1: Authentication & User Management

### US-1.1: User Registration
**As a** new visitor
**I want to** register an account with my email and password
**So that** I can access the platform's features

**Acceptance Criteria:**
- Registration form with name, email, phone, password
- Email validation (.com domain required)
- Role inference from email domain (astro@ → Astrologer, else → User)
- Duplicate email prevention
- Auto-login after successful registration

**Sub-tasks:**
- [ ] Create registration form UI (`src/pages/auth/AuthPage.jsx`)
- [ ] Implement `register()` in `AuthContext.jsx`
- [ ] Add email normalization (strip `.app` suffix, lowercase)
- [ ] Add role inference logic (`inferRoleFromEmail`)
- [ ] Add duplicate email validation
- [ ] Add auto-login after registration
- [ ] Write unit tests for registration flow

---

### US-1.2: User Login
**As a** registered user
**I want to** log in with my email and password
**So that** I can access my account

**Acceptance Criteria:**
- Login form with email and password
- Role-based portal redirect (User → /user, Astrologer → /astrologer)
- Error handling for invalid credentials
- Session persistence via localStorage

**Sub-tasks:**
- [ ] Create login form UI (`src/pages/auth/Login.jsx`)
- [ ] Implement `login()` in `AuthContext.jsx`
- [ ] Add role-based redirect logic
- [ ] Add session persistence (localStorage)
- [ ] Add error handling for invalid credentials
- [ ] Write unit tests for login flow

---

### US-1.3: Profile Management
**As a** logged-in user
**I want to** view and edit my profile details
**So that** my information is up to date

**Acceptance Criteria:**
- View profile (name, email, phone, bio, profile image)
- Edit profile fields
- Birth details management (DOB, time, place, lat/long, timezone)
- Horoscope details (rasi, nakshatra, lagna)
- Phone/email visibility settings
- Change password
- Delete account

**Sub-tasks:**
- [ ] Create profile view page (`src/pages/Profile.jsx`)
- [ ] Create profile edit form
- [ ] Implement `updateProfile()` in `AuthContext.jsx`
- [ ] Add birth details form
- [ ] Add horoscope details fields
- [ ] Add visibility settings (phone/email)
- [ ] Implement `changePassword()`
- [ ] Implement `deleteAccount()`
- [ ] Add profile activity logging
- [ ] Write unit tests for profile operations

---

### US-1.4: Role-Based Access Control
**As a** system
**I want to** restrict access based on user roles
**So that** each portal is only accessible to authorized users

**Acceptance Criteria:**
- Role detection from email domain
- Route guards for /user, /astrologer, /editor
- Editor session management
- Access denied page for unauthorized access

**Sub-tasks:**
- [ ] Implement `roleRoutes.js` with role-based route mapping
- [ ] Add route guards in `App.jsx`
- [ ] Create `EditorAccessDenied` page
- [ ] Implement editor session start/end
- [ ] Add role-based navigation
- [ ] Write unit tests for access control

---

## Epic 2: User Dashboard & Navigation

### US-2.1: User Dashboard
**As a** logged-in user
**I want to** see a dashboard with my recent activity and quick actions
**So that** I can quickly access the features I need

**Acceptance Criteria:**
- Welcome banner with user name
- Quick action cards (Ask Question, Book Appointment, Chat, Call, Purchase Package, Join Live)
- Recommended astrologers section
- Upcoming appointments list
- Recent activity feed
- Live now section

**Sub-tasks:**
- [ ] Create `UserDashboard.jsx` page
- [ ] Build quick actions grid
- [ ] Build recommended astrologers section
- [ ] Build upcoming appointments list
- [ ] Build recent activity feed
- [ ] Build live now section
- [ ] Add navigation to all quick actions
- [ ] Write unit tests for dashboard rendering

---

### US-2.2: Notifications
**As a** user
**I want to** see notifications about my questions, appointments, and sessions
**So that** I stay informed about important updates

**Acceptance Criteria:**
- Notification list with read/unread status
- Notification categories (questions, appointments, live, offers, pooja)
- Click to navigate to relevant page
- Mark as read on click

**Sub-tasks:**
- [ ] Create `NotificationScreen.jsx`
- [ ] Create `NotificationRow.jsx` component
- [ ] Add notification data model
- [ ] Add category-based icons
- [ ] Add click-to-navigate functionality
- [ ] Add mark-as-read functionality
- [ ] Write unit tests for notifications

---

## Epic 3: Question & Campaign System

### US-3.1: Ask a Question
**As a** user
**I want to** submit a text-based question to an astrologer
**So that** I can get astrological guidance

**Acceptance Criteria:**
- Question form with category, type (General/Personal), question text
- Horoscope mode selection (Use Saved / Upload / Continue Without)
- File attachment support
- Campaign selection (if applicable)
- Question submission with success feedback

**Sub-tasks:**
- [ ] Create `AskQuestion.jsx` page
- [ ] Build question form with all fields
- [ ] Add category selection
- [ ] Add question type toggle (General/Personal)
- [ ] Add horoscope mode selection
- [ ] Add file attachment upload
- [ ] Add campaign selection
- [ ] Implement question submission logic
- [ ] Add success feedback
- [ ] Write unit tests for question submission

---

### US-3.2: Track Questions
**As a** user
**I want to** view the status of my submitted questions
**So that** I know when to expect an answer

**Acceptance Criteria:**
- Question list with status badges (Pending, In Progress, Answered, Disputed, Cancelled)
- Question detail view with full question text and answer
- Filter by status
- Search by question ID or text

**Sub-tasks:**
- [ ] Create `TrackQuestions.jsx` page
- [ ] Build question list with status badges
- [ ] Build question detail view
- [ ] Add status filter
- [ ] Add search functionality
- [ ] Add question history display
- [ ] Write unit tests for question tracking

---

### US-3.3: Campaign Management (Astrologer)
**As an** astrologer
**I want to** create and manage question campaigns
**So that** I can offer themed question packages to users

**Acceptance Criteria:**
- Create campaign with name, categories, pricing, capacity
- Campaign status workflow (Draft → Scheduled → Active → Closed)
- Campaign categories with individual pricing
- Offer/discount configuration
- Capacity allocation and tracking
- Month-based campaign organization

**Sub-tasks:**
- [ ] Create `Campaigns.jsx` page (astrologer)
- [ ] Create `CreateCampaignModal.jsx`
- [ ] Build campaign form with all fields
- [ ] Add campaign status workflow
- [ ] Add category-based pricing
- [ ] Add offer/discount configuration
- [ ] Add capacity allocation
- [ ] Add month-based filtering
- [ ] Implement campaign CRUD operations
- [ ] Write unit tests for campaign management

---

### US-3.4: Answer Questions (Astrologer)
**As an** astrologer
**I want to** answer user questions
**So that** users receive astrological guidance

**Acceptance Criteria:**
- Question queue with filtering (Pending, In Progress, Answered, Disputed)
- Answer editor with draft save
- Submit answer with confirmation
- Edit answer before submission
- Auto-cancellation on answer deadline exceeded (30 days)

**Sub-tasks:**
- [ ] Create `AnswerQuestion.jsx` page (astrologer)
- [ ] Build question queue with filters
- [ ] Build answer editor
- [ ] Add draft save functionality
- [ ] Add answer submission
- [ ] Add answer editing
- [ ] Implement auto-cancellation logic
- [ ] Write unit tests for answer workflow

---

### US-3.5: Purchase Campaign Package
**As a** user
**I want to** purchase a campaign question package
**So that** I can ask questions within that campaign

**Acceptance Criteria:**
- Package display with pricing and capacity
- General and Personal question slot selection
- Package purchase with wallet payment
- Purchase confirmation
- Slot balance tracking

**Sub-tasks:**
- [ ] Create `PurchasePackage.jsx` page
- [ ] Build package display cards
- [ ] Add slot selection (General/Personal)
- [ ] Add wallet payment integration
- [ ] Add purchase confirmation
- [ ] Add slot balance tracking
- [ ] Write unit tests for package purchase

---

## Epic 4: Appointment System

### US-4.1: Book Appointment
**As a** user
**I want to** book an appointment with an astrologer
**So that** I can have a scheduled consultation

**Acceptance Criteria:**
- Astrologer selection with availability display
- Date and time slot selection
- Appointment type selection (Chat/Call/Video)
- Booking confirmation
- Appointment details view

**Sub-tasks:**
- [ ] Create `AppointmentBookingModal.jsx`
- [ ] Create `AppointmentSlotsModal.jsx`
- [ ] Build astrologer selection
- [ ] Build date/time slot picker
- [ ] Add appointment type selection
- [ ] Add booking confirmation
- [ ] Create `AppointmentDetails.jsx`
- [ ] Write unit tests for appointment booking

---

### US-4.2: Manage Appointments (Astrologer)
**As an** astrologer
**I want to** view and manage my appointments
**So that** I can prepare for and conduct consultations

**Acceptance Criteria:**
- Appointment calendar view
- Today's appointments panel
- Appointment detail drawer
- Start call/video for appointment
- Reschedule appointments
- Complete appointment with notes
- Appointment history

**Sub-tasks:**
- [ ] Create `Appointments.jsx` page
- [ ] Create `AppointmentCalendar.jsx`
- [ ] Create `AppointmentDetailsDrawer.jsx`
- [ ] Create `AppointmentCallScreen.jsx`
- [ ] Create `RescheduleModal.jsx`
- [ ] Build today's appointments panel
- [ ] Add start call functionality
- [ ] Add reschedule functionality
- [ ] Add complete appointment with notes
- [ ] Add appointment history view
- [ ] Write unit tests for appointment management

---

### US-4.3: Appointment Availability (Astrologer)
**As an** astrologer
**I want to** set my availability schedule
**So that** users can book appointments during my available slots

**Acceptance Criteria:**
- Weekly schedule configuration (day-wise slots)
- Date-specific overrides (Available, Unavailable, Leave, Dyan)
- Availability period setting (start/end dates)
- Appointment duration and buffer configuration
- Publish/unpublish availability

**Sub-tasks:**
- [ ] Create `AppointmentAvailabilityPanel.jsx`
- [ ] Build weekly schedule editor
- [ ] Add date override functionality
- [ ] Add availability period setting
- [ ] Add duration/buffer configuration
- [ ] Add publish/unpublish toggle
- [ ] Write unit tests for availability management

---

## Epic 5: Live Sessions

### US-5.1: Join Live Session
**As a** user
**I want to** join a live astrology session
**So that** I can ask questions in real-time

**Acceptance Criteria:**
- Live session list with status (Live Now, Upcoming, Past)
- Join live session with access control (public/followers/subscribers)
- Live chat interface
- Free and premium question queue
- Session timer and expiry

**Sub-tasks:**
- [ ] Create `LiveSession.jsx` page
- [ ] Build live session list
- [ ] Add access control logic
- [ ] Build live chat interface
- [ ] Add free/premium queue
- [ ] Add session timer
- [ ] Write unit tests for live session

---

### US-5.2: Manage Live Sessions (Astrologer)
**As an** astrologer
**I want to** create and manage live sessions
**So that** I can host real-time Q&A with users

**Acceptance Criteria:**
- Create live session with title, description, category
- Schedule session with start/end time
- Audience selection (public/followers/subscribers)
- Subscriber tier selection (silver/gold/pro)
- Go live / end live
- Session history with earnings

**Sub-tasks:**
- [ ] Create `AstrologerLiveSession.jsx` page
- [ ] Create `LiveSessionLists.jsx`
- [ ] Build session creation form
- [ ] Add scheduling functionality
- [ ] Add audience selection
- [ ] Add subscriber tier selection
- [ ] Add go live/end live controls
- [ ] Add session history
- [ ] Write unit tests for live session management

---

## Epic 6: Chat & Call Consultations

### US-6.1: Chat with Astrologer
**As a** user
**I want to** chat with an astrologer in real-time
**So that** I can get instant astrological guidance

**Acceptance Criteria:**
- Astrologer list with availability status (Available/Busy/Offline)
- Chat interface with message history
- Per-minute rate display
- Chat booking and payment
- Chat history

**Sub-tasks:**
- [ ] Create `ChatAstrologers.jsx` page
- [ ] Create `ChatScreen.jsx`
- [ ] Create `ChatBooking.jsx`
- [ ] Create `ChatPaymentInformation.jsx`
- [ ] Create `ChatPaymentSuccess.jsx`
- [ ] Build astrologer list with status
- [ ] Build chat interface
- [ ] Add rate display
- [ ] Add booking and payment flow
- [ ] Add chat history
- [ ] Write unit tests for chat system

---

### US-6.2: Call with Astrologer
**As a** user
**I want to** have a voice/video call with an astrologer
**So that** I can have a personal consultation

**Acceptance Criteria:**
- Astrologer list with call availability
- Call booking and payment
- In-call interface with timer
- Call history
- Call rating

**Sub-tasks:**
- [ ] Create `CallAstrologers.jsx` page
- [ ] Create `CallScreen.jsx`
- [ ] Create `VoiceCallScreen.jsx`
- [ ] Create `CallBooking.jsx`
- [ ] Create `CallPaymentInformation.jsx`
- [ ] Create `CallPaymentSuccess.jsx`
- [ ] Create `CallPackageSelection.jsx`
- [ ] Build astrologer list with call availability
- [ ] Build call interface with timer
- [ ] Add booking and payment flow
- [ ] Add call history
- [ ] Add call rating
- [ ] Write unit tests for call system

---

## Epic 7: Wallet & Payments

### US-7.1: User Wallet
**As a** user
**I want to** manage my wallet balance
**So that** I can pay for consultations and questions

**Acceptance Criteria:**
- Wallet balance display
- Transaction history (top-ups, purchases, refunds)
- Top-up functionality
- Payment method management (bank, UPI, card)
- Auto-pay setup (subscription, low-balance)

**Sub-tasks:**
- [ ] Create `WalletDashboard.jsx` component
- [ ] Create `WalletHistory.jsx` page
- [ ] Create `WalletPayment.jsx` page
- [ ] Build balance display
- [ ] Build transaction history
- [ ] Add top-up functionality
- [ ] Add payment method management
- [ ] Add auto-pay setup
- [ ] Write unit tests for wallet operations

---

### US-7.2: Astrologer Wallet & Payouts
**As an** astrologer
**I want to** view my earnings and manage payouts
**So that** I can track my income and receive payments

**Acceptance Criteria:**
- Earnings dashboard with ledger
- Payout method management (bank, UPI)
- Settlement schedule
- Held payments with hold period
- Payout history

**Sub-tasks:**
- [ ] Create `AstrologerWallet.jsx` page
- [ ] Build earnings dashboard
- [ ] Add payout method management
- [ ] Add settlement schedule
- [ ] Add held payments display
- [ ] Add payout history
- [ ] Write unit tests for astrologer wallet

---

## Epic 8: Dispute Management

### US-8.1: Raise Dispute
**As a** user
**I want to** raise a dispute on an answer I'm not satisfied with
**So that** I can get a better response or resolution

**Acceptance Criteria:**
- Dispute form with reason selection and description
- Dispute submission with attachment support
- Dispute status tracking (Open, Resolved)
- Dispute history

**Sub-tasks:**
- [ ] Create `RaiseDispute.jsx` page
- [ ] Build dispute form with reason selection
- [ ] Add description field
- [ ] Add attachment support
- [ ] Add dispute submission
- [ ] Add dispute status tracking
- [ ] Add dispute history
- [ ] Write unit tests for dispute raising

---

### US-8.2: Resolve Dispute (Astrologer)
**As an** astrologer
**I want to** respond to and resolve disputes
**So that** users get satisfactory resolutions

**Acceptance Criteria:**
- Dispute queue with filtering
- Dispute detail view with question and answer
- Response editor
- Resolve dispute with resolution notes
- Dispute history

**Sub-tasks:**
- [ ] Create `DisputeManagement.jsx` page (astrologer)
- [ ] Create `DisputeDetailsModal.jsx`
- [ ] Build dispute queue
- [ ] Build dispute detail view
- [ ] Add response editor
- [ ] Add resolve functionality
- [ ] Add dispute history
- [ ] Write unit tests for dispute resolution

---

## Epic 9: Atonement Tracking

### US-9.1: Atonement Assignment
**As a** user
**I want to** view my assigned atonement/pooja routines
**So that** I can complete my spiritual remedies

**Acceptance Criteria:**
- Atonement list with source (question, chat, call, appointment)
- Day-wise atonement schedule
- Completion tracking per day
- Atonement details (god, things, pooja instructions)
- Proof submission for completion

**Sub-tasks:**
- [ ] Create `Atonement.jsx` page
- [ ] Create `AtonementDetails.jsx` page
- [ ] Create `AtonementCard.jsx` component
- [ ] Create `AtonementDayFlow.jsx` component
- [ ] Build atonement list
- [ ] Build day-wise schedule
- [ ] Add completion tracking
- [ ] Add atonement details display
- [ ] Add proof submission
- [ ] Write unit tests for atonement tracking

---

### US-9.2: Atonement Management (Editor)
**As an** editor
**I want to** manage atonement templates and track user completions
**So that** I can ensure users complete their remedies

**Acceptance Criteria:**
- Atonement template management
- User atonement tracking
- Completion verification
- Atonement history

**Sub-tasks:**
- [ ] Create `EditorAtonementTracking.jsx` page
- [ ] Build template management
- [ ] Add user completion tracking
- [ ] Add completion verification
- [ ] Add atonement history
- [ ] Write unit tests for atonement management

---

## Epic 10: Pooja Booking

### US-10.1: Book Pooja
**As a** user
**I want to** book a pooja ceremony
**So that** I can have rituals performed on my behalf

**Acceptance Criteria:**
- Pooja list with details
- Pooja booking with date selection
- Booking confirmation
- Pooja details and status tracking
- Prasadam tracking

**Sub-tasks:**
- [ ] Create `PoojaDetails.jsx` page
- [ ] Build pooja list
- [ ] Add booking functionality
- [ ] Add booking confirmation
- [ ] Add status tracking
- [ ] Add prasadam tracking
- [ ] Write unit tests for pooja booking

---

## Epic 11: Social Features

### US-11.1: Follow Astrologers
**As a** user
**I want to** follow astrologers I like
**So that** I can see their updates and content

**Acceptance Criteria:**
- Follow/unfollow astrologers
- Followed astrologers list
- Follower count display
- Following feed

**Sub-tasks:**
- [ ] Create `Following.jsx` page
- [ ] Create `FollowedAstrologersFull.jsx` page
- [ ] Create `SuggestedAstrologers.jsx` page
- [ ] Add follow/unfollow functionality
- [ ] Add followed astrologers list
- [ ] Add follower count display
- [ ] Add following feed
- [ ] Write unit tests for follow system

---

### US-11.2: Astrologer Posts & Content
**As a** user
**I want to** view posts from astrologers I follow
**So that** I can stay updated with their content

**Acceptance Criteria:**
- Post feed with visibility filtering (public/followers/subscribers)
- Post interactions (like, comment, share, save)
- Post media support (images, videos)
- Scheduled posts

**Sub-tasks:**
- [ ] Create post feed component
- [ ] Add visibility filtering
- [ ] Add like/comment/share/save interactions
- [ ] Add media support
- [ ] Add scheduled post display
- [ ] Write unit tests for posts

---

### US-11.3: Reviews & Ratings
**As a** user
**I want to** rate and review astrologers
**So that** others can benefit from my experience

**Acceptance Criteria:**
- Star rating display
- Review submission
- Review list with filtering
- Average rating calculation

**Sub-tasks:**
- [ ] Create `ReviewsRatings.jsx` page
- [ ] Create `Rating.jsx` component
- [ ] Add star rating display
- [ ] Add review submission
- [ ] Add review list
- [ ] Add average rating calculation
- [ ] Write unit tests for reviews

---

## Epic 12: Editor Portal

### US-12.1: Editor Dashboard
**As an** editor
**I want to** see an overview of all platform activity
**So that** I can manage the platform effectively

**Acceptance Criteria:**
- Platform statistics overview
- Recent activity feed
- Quick access to all management modules
- Notification center

**Sub-tasks:**
- [ ] Create `EditorDashboard.jsx` page
- [ ] Build statistics overview
- [ ] Build activity feed
- [ ] Add quick access modules
- [ ] Add notification center
- [ ] Write unit tests for editor dashboard

---

### US-12.2: Editor Content Management
**As an** editor
**I want to** manage astrologer content and posts
**So that** the platform has quality content

**Acceptance Criteria:**
- Content queue with filtering
- Content approval/rejection
- Content editing
- Content scheduling

**Sub-tasks:**
- [ ] Create `EditorContent.jsx` page
- [ ] Build content queue
- [ ] Add approval/rejection
- [ ] Add content editing
- [ ] Add content scheduling
- [ ] Write unit tests for content management

---

### US-12.3: Editor Campaign Management
**As an** editor
**I want to** oversee and manage all campaigns
**So that** campaigns are properly configured and active

**Acceptance Criteria:**
- All campaigns list with filtering
- Campaign approval/rejection
- Campaign editing
- Campaign analytics

**Sub-tasks:**
- [ ] Create `EditorCampaigns.jsx` page
- [ ] Build campaigns list
- [ ] Add approval/rejection
- [ ] Add campaign editing
- [ ] Add campaign analytics
- [ ] Write unit tests for editor campaign management

---

### US-12.4: Editor Question Management
**As an** editor
**I want to** oversee all questions on the platform
**So that** quality is maintained and issues are resolved

**Acceptance Criteria:**
- All questions list with filtering
- Question detail view
- Question intervention (edit, cancel, reassign)
- Dispute oversight

**Sub-tasks:**
- [ ] Create `EditorQuestions.jsx` page
- [ ] Build questions list
- [ ] Add question detail view
- [ ] Add intervention actions
- [ ] Add dispute oversight
- [ ] Write unit tests for editor question management

---

### US-12.5: Editor Appointment Management
**As an** editor
**I want to** oversee all appointments
**So that** scheduling conflicts are minimized

**Acceptance Criteria:**
- All appointments list
- Appointment detail view
- Appointment intervention (reschedule, cancel)
- Availability oversight

**Sub-tasks:**
- [ ] Create `EditorAppointments.jsx` page
- [ ] Build appointments list
- [ ] Add appointment detail view
- [ ] Add intervention actions
- [ ] Add availability oversight
- [ ] Write unit tests for editor appointment management

---

### US-12.6: Editor Live Session Management
**As an** editor
**I want to** oversee live sessions
**So that** quality is maintained

**Acceptance Criteria:**
- Live session list
- Session detail view
- Session intervention (end, mute)
- Session analytics

**Sub-tasks:**
- [ ] Create `EditorLiveScheduling.jsx` page
- [ ] Create `EditorLiveHistory.jsx` page
- [ ] Build live session list
- [ ] Add session detail view
- [ ] Add intervention actions
- [ ] Add session analytics
- [ ] Write unit tests for editor live session management

---

### US-12.7: Editor Perks & Benefits Management
**As an** editor
**I want to** manage perks and benefits
**So that** the platform offers competitive benefits

**Acceptance Criteria:**
- Perks configuration
- Benefits management
- Perks history

**Sub-tasks:**
- [ ] Create `EditorPerks.jsx` page
- [ ] Build perks configuration
- [ ] Add benefits management
- [ ] Add perks history
- [ ] Write unit tests for perks management

---

### US-12.8: Editor Discount Management
**As an** editor
**I want to** manage discounts and offers
**So that** pricing is competitive and fair

**Acceptance Criteria:**
- Discount configuration
- Offer management
- Discount history

**Sub-tasks:**
- [ ] Create `EditorDiscounts.jsx` page
- [ ] Build discount configuration
- [ ] Add offer management
- [ ] Add discount history
- [ ] Write unit tests for discount management

---

## Epic 13: Sales & Analytics

### US-13.1: Sales Management (Astrologer)
**As an** astrologer
**I want to** view my sales and revenue analytics
**So that** I can track my business performance

**Acceptance Criteria:**
- Sales dashboard with revenue metrics
- Sales history with filtering
- Revenue by campaign/question type
- Sales trends

**Sub-tasks:**
- [ ] Create `SalesManagement.jsx` page (astrologer)
- [ ] Build sales dashboard
- [ ] Add sales history
- [ ] Add revenue breakdown
- [ ] Add sales trends
- [ ] Write unit tests for sales management

---

## Epic 14: PDF Reports

### US-14.1: Generate PDF Report
**As a** user
**I want to** generate a PDF report of my consultation
**So that** I have a permanent record of the guidance

**Acceptance Criteria:**
- PDF generation from consultation data
- Birth chart inclusion
- Answer/remedy formatting
- Download and share

**Sub-tasks:**
- [ ] Create `pdfReport.js` utility
- [ ] Build PDF generation logic
- [ ] Add birth chart formatting
- [ ] Add answer/remedy formatting
- [ ] Add download functionality
- [ ] Write unit tests for PDF generation

---

## Epic 15: Birth Chart Integration

### US-15.1: Birth Chart Calculation
**As a** user
**I want to** calculate my birth chart from my birth details
**So that** astrologers can provide accurate guidance

**Acceptance Criteria:**
- Birth details form (DOB, time, place, lat/long)
- API integration for birth chart calculation
- Birth chart display
- Error handling for unavailable service

**Sub-tasks:**
- [ ] Create birth details form
- [ ] Implement `calculateBirthChart()` in `astrologyService.js`
- [ ] Add API integration
- [ ] Add birth chart display
- [ ] Add error handling
- [ ] Write unit tests for birth chart calculation

---

## Epic 16: Subscription Management

### US-16.1: Subscribe to Astrologer
**As a** user
**I want to** subscribe to an astrologer
**So that** I get premium access to their content

**Acceptance Criteria:**
- Subscription plans display (silver, gold, pro)
- Subscribe/unsubscribe
- Subscription status tracking
- Subscriber-only content access

**Sub-tasks:**
- [ ] Create `Subscriptions.jsx` page
- [ ] Build subscription plans display
- [ ] Add subscribe/unsubscribe
- [ ] Add status tracking
- [ ] Add subscriber-only content access
- [ ] Write unit tests for subscriptions

---

## Epic 17: Perks & Benefits

### US-17.1: View Perks & Benefits
**As a** user
**I want to** view available perks and benefits
**So that** I can take advantage of platform offers

**Acceptance Criteria:**
- Perks display
- Benefits history
- Perk redemption

**Sub-tasks:**
- [ ] Create `PerksAndBenefits.jsx` page
- [ ] Build perks display
- [ ] Add benefits history
- [ ] Add perk redemption
- [ ] Write unit tests for perks

---

## Epic 18: Instant Consultation

### US-18.1: Instant Chat Consultation
**As a** user
**I want to** start an instant chat with an available astrologer
**So that** I get immediate guidance

**Acceptance Criteria:**
- Available astrologers list
- Instant chat start
- Rate display
- Chat interface

**Sub-tasks:**
- [ ] Create `instantchatastrologer.jsx` page
- [ ] Build available astrologers list
- [ ] Add instant chat start
- [ ] Add rate display
- [ ] Add chat interface
- [ ] Write unit tests for instant chat

---

### US-18.2: Instant Call Consultation
**As a** user
**I want to** start an instant call with an available astrologer
**So that** I get immediate personal guidance

**Acceptance Criteria:**
- Available astrologers list
- Instant call start
- Rate display
- Call interface

**Sub-tasks:**
- [ ] Create `instantcallastrologer.jsx` page
- [ ] Build available astrologers list
- [ ] Add instant call start
- [ ] Add rate display
- [ ] Add call interface
- [ ] Write unit tests for instant call

---

## Epic 19: Activity Logging

### US-19.1: User Activity Log
**As a** user
**I want to** view my activity history
**So that** I can track all my interactions on the platform

**Acceptance Criteria:**
- Activity list with timestamps
- Activity categories (profile, horoscope, security, questions, appointments)
- Activity detail view

**Sub-tasks:**
- [ ] Create `activity.jsx` page
- [ ] Build activity list
- [ ] Add category filtering
- [ ] Add activity detail view
- [ ] Write unit tests for activity log

---

### US-19.2: Astrologer Activity Log
**As an** astrologer
**I want to** view my activity history
**So that** I can track all my platform interactions

**Acceptance Criteria:**
- Activity list with timestamps
- Activity categories
- Activity detail view

**Sub-tasks:**
- [ ] Create `AstrologerActivity.jsx` page
- [ ] Build activity list
- [ ] Add category filtering
- [ ] Add activity detail view
- [ ] Write unit tests for astrologer activity log

---

## Epic 20: Theme & UI

### US-20.1: Theme Toggle
**As a** user
**I want to** switch between light and dark themes
**So that** I can use the platform comfortably

**Acceptance Criteria:**
- Theme toggle button
- Light/dark theme support
- Theme persistence
- Smooth theme transition

**Sub-tasks:**
- [ ] Create `ThemeContext.jsx`
- [ ] Create `ThemeToggle.jsx` component
- [ ] Add light/dark theme CSS
- [ ] Add theme persistence
- [ ] Add smooth transition
- [ ] Write unit tests for theme toggle

---

## Summary

| Epic | User Stories | Sub-tasks |
|------|-------------|-----------|
| 1. Authentication & User Management | 4 | 28 |
| 2. User Dashboard & Navigation | 2 | 15 |
| 3. Question & Campaign System | 5 | 42 |
| 4. Appointment System | 3 | 28 |
| 5. Live Sessions | 2 | 18 |
| 6. Chat & Call Consultations | 2 | 22 |
| 7. Wallet & Payments | 2 | 18 |
| 8. Dispute Management | 2 | 16 |
| 9. Atonement Tracking | 2 | 14 |
| 10. Pooja Booking | 1 | 7 |
| 11. Social Features | 3 | 22 |
| 12. Editor Portal | 8 | 40 |
| 13. Sales & Analytics | 1 | 6 |
| 14. PDF Reports | 1 | 6 |
| 15. Birth Chart Integration | 1 | 6 |
| 16. Subscription Management | 1 | 6 |
| 17. Perks & Benefits | 1 | 4 |
| 18. Instant Consultation | 2 | 12 |
| 19. Activity Logging | 2 | 10 |
| 20. Theme & UI | 1 | 6 |
| **Total** | **48** | **331** |

---

## Jira Import Instructions

### Option 1: CSV Import
1. Convert this document to CSV with columns: `Issue Type, Summary, Description, Epic Link, Priority, Assignee`
2. In Jira: **Issues → Import Issues from CSV**
3. Map columns and import

### Option 2: Manual Creation
1. Create Epics from the 20 epic titles
2. Create User Stories under each epic
3. Create Sub-tasks under each user story

### Option 3: Jira REST API
Use the Jira REST API to programmatically create issues:
```
POST /rest/api/2/issue
{
  "fields": {
    "project": { "key": "ATONEMENT" },
    "summary": "User Story Title",
    "description": "Acceptance criteria...",
    "issuetype": { "name": "Story" },
    "customfield_10008": "Epic Name"
  }
}
```

---

*Document generated from codebase analysis of Astro Connect (textbased-demo)*
