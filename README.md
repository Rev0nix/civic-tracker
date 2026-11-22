# 🏛️ LOKIFY – Premium Android Civic Issue Reporting & Tracking

**Lokify** is a complete, modern, and production-grade civic issue reporting and municipal tracking application built for Android and modern web clients. It connects citizens directly with local municipal authorities to report, map, upvote, follow, and resolve neighborhood problems—including potholes, non-functional streetlights, water & sewage leaks, garbage overflows, and public safety hazards.

🌐 **Live Demo:** [https://rev0nix.github.io/civic-tracker](https://rev0nix.github.io/civic-tracker)

---

## 🎨 Design System & Visual Direction

Lokify embraces a modern dark civic-tech aesthetic built around:
- **Main Background:** `#080F0F` (Deep black-green)
- **Secondary Background:** `#101819`
- **Card Background:** `#192223` (Dark charcoal)
- **Elevated Surfaces:** `#202B2D`
- **Accent Teals:** `#A3DCE3` (Primary), `#28616A` (Secondary), `#315C60` (Active state)
- **Typography:** Inter, Manrope for headings & body; JetBrains Mono for technical labels, timestamps, and issue IDs (`LK-2481`)
- **Status Badges:**
  - `Open`: Neutral grey (`#A5B1B3`)
  - `Acknowledged`: Muted Teal (`#A3DCE3`)
  - `Assigned`: Light Blue (`#8DBBEB`)
  - `In Progress`: Active Cyan (`#38BDF8`)
  - `Resolved`: Success Green (`#43C88A`)
  - `Reopened`: Danger Red (`#EF6666`)

---

## 📱 Core Screens & Architecture

### 1. Feed / Home (`FeedScreen.jsx`)
- **Header:** Uppercase section label `YOUR AREA`, `Issues near you` title, live GPS locality indicator with one-tap refresh.
- **Search & Filters:** Real-time search query filtering, pill-shaped horizontal category selector (`All`, `Pothole`, `Streetlight`, `Garbage`, `Water & Sewage`, `Drainage`, `Road Damage`, `Public Safety`).
- **Interactive Map Toggle:** Switch between rich list view and full dark-mode Google Map view with custom category pins.
- **Issue Cards:** Large photo preview, issue title, formatted ID (`LK-xxxx`), category, status pill, relative timestamp (`2h ago`), locality, interactive upvote/support counter, and share action.
- **Floating Action Button:** `+ Report issue` pill positioned above bottom navigation.

### 2. My Issues (`MyIssuesScreen.jsx`)
- Displays exclusively reports posted from the active user's device / email identity.
- Tabs: `All`, `Open`, `In Progress`, `Resolved`.
- Shows issue thumbnail, title, status, location, and official municipal authority updates.
- Elegant empty state with decorative teal shape and `Report your first issue` action.

### 3. Alerts & Activity (`AlertsScreen.jsx`)
- Notifications grouped into `Today`, `Yesterday`, and `Earlier`.
- Status alerts (work started, issue resolved, authority comments, acknowledgments).
- Unread badge counter reflected on the bottom navigation bar with one-tap `Mark all read`.

### 4. Report an Issue (`ReportIssueModal.jsx`)
- Full sheet modal with camera (`Take Photo` with `capture="environment"`) and gallery selection.
- Selectable category chips with icons.
- Live GPS location locking with reverse geocoded locality.
- Description input with live `0/500` character counter.
- AI Duplicate Detection (<100m radius check) and AI Smart Priority scoring.

### 5. Issue Details (`IssueDetailModal.jsx`)
- Dedicated issue details overlay with hero photo.
- **Vertical Connected Timeline:** Displays progression through `Open` ➔ `Acknowledged` ➔ `Assigned` ➔ `In Progress` ➔ `Resolved` with highlighted active milestone.
- Location card with coordinates and Google Maps navigation link.
- Community verified badge, upvote button, follow toggle, and share action.
- Citizen feedback prompt to confirm fixed state or report dispute.

### 6. User Profile (`ProfileScreen.jsx`)
- Citizen avatar, email, and locality with interactive profile editing.
- Summary analytics: Total Reports, Resolved, Active, and Upvotes.
- Preference menus for notifications, location accuracy, privacy, and multilingual AI Assistant (English & Kannada).
- Gateway to the Municipal Admin Control Center.

### 7. Municipal Admin Center (`AdminModal.jsx`)
- Passcode-authenticated administrative suite (`admin123`).
- Executive analytics dashboard (Total, Open, In Progress, Resolved).
- Real-time status modification triggering automated citizen email notifications via EmailJS.
- Report deletion and one-click `.csv` municipal data export.

---

## 🛠️ Technology Stack
- **Frontend:** React 19, Vite 8, Tailwind CSS v4, Lucide React
- **Mapping & Geocoding:** Google Maps JavaScript API (custom Lokify dark vector styles), Google Geocoder & Nominatim API
- **Backend & Database:** Supabase (PostgreSQL, PostGIS Point geometry, Realtime subscriptions, Storage)
- **Notification Services:** EmailJS SDK
- **Mobile Container:** Capacitor Android native framework (`@capacitor/android`)

---

## 📂 Source Code Structure
```text
src/
├── components/
│   ├── BottomNav.jsx         # 4-destination fixed bottom navigation bar
│   ├── FeedScreen.jsx        # Screen 1: Feed with search, filters & map toggle
│   ├── MyIssuesScreen.jsx    # Screen 2: User's submitted issues & empty state
│   ├── AlertsScreen.jsx      # Screen 3: Activity alerts grouped by date
│   ├── ReportIssueModal.jsx  # Screen 4: Photo capture, GPS & category form
│   ├── IssueDetailModal.jsx  # Screen 5: Vertical status timeline & verification
│   ├── ProfileScreen.jsx     # Screen 6: Citizen profile, metrics & settings
│   ├── AdminModal.jsx        # Municipal official control center & CSV export
│   ├── CivicMap.jsx          # Interactive Google Map with custom dark theme
│   └── AiAssistantModal.jsx  # Multilingual AI assistant (English/Kannada)
├── constants/
│   └── theme.js              # Lokify colors, categories, status badges & formatters
├── utils/
│   └── issueHelpers.js       # Image compression, duplicate check & location parsers
├── googleMaps.js             # Google Maps loader, dark styling & reverse geocoder
├── supabaseClient.js         # Supabase client instance
├── App.jsx                   # Master state coordinator & realtime subscriptions
├── App.css                   # Custom typography & Android design rules
├── index.css                 # Tailwind directives
└── main.jsx                  # Application entry point
```

---

## 🚀 Building & Running Locally

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start Vite development server:**
   ```bash
   npm run dev
   ```

3. **Build and test production bundle:**
   ```bash
   npm run build
   ```

4. **Sync with Android native project:**
   ```bash
   npx cap sync android
   ```
