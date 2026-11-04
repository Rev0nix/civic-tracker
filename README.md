# 🏛️ CivicTrack

**CivicTrack** is a modern, responsive, and full-stack municipal issue-reporting and tracking platform. Designed to bridge the gap between citizens and local government bodies, it enables everyday users to report municipal infrastructure problems—such as damaged potholes, faulty street lights, broken water/drainage pipes, and garbage overflows—with high precision. Concurrently, it provides municipal authorities with a dedicated administrative control center to manage, filter, analyze, and resolve these reports in real-time.


---

## 🚀 Core Modules & Functionality

### A. Startup Splash & Onboarding
- **Introductory Landing Screen:** Displays a sleek, animated startup splash screen on launch while initializing GPS locks and verifying system environment status.

### B. The Citizen Portal & Reporting Workflow
- **Precise GPS Location Locking:** When reporting an issue, the app requests high-accuracy device GPS coordinates (`navigator.geolocation`) and reverse-geocodes them via the OpenStreetMap/Nominatim API into readable, exact street addresses.
- **AI Duplicate Detection:** Automatically calculates distances (Haversine formula) to check if a similar issue was recently reported nearby within a 100-meter radius, offering users the option to upvote existing reports instead.
- **AI Smart Priority Scoring:** Automatically analyzes issue text keywords to categorize urgency levels (`Critical`, `Medium`, or `Low`).
- **Client-Side Image Compression:** High-resolution user photos are automatically compressed down in the browser using HTML5 Canvas before uploading to save storage and mobile bandwidth.
- **Visual Progress Timeline:** Every issue card features an interactive 3-step milestone progress bar (`Submitted` ➔ `In Progress` ➔ `Resolved`) giving citizens clear visual feedback.
- **Automated Email Notifications:** Integrated with EmailJS to automatically trigger an email notification to the citizen's registered address when an official marks their issue as **Resolved**.
- **Community Upvoting:** Citizens can upvote existing infrastructure reports to highlight community priority and urgency.

### C. The Municipal Admin Portal
- **Secured Access Control:** Hidden behind a discrete three-dot menu (`•••`) in the header requiring an admin passcode (`admin123`) to keep administrative controls private.
- **Executive Summary Analytics:** Summary cards tracking total reports, counts for each submission state, and total community upvotes.
- **Advanced Multi-Field Search & Filters:** Filter reports instantly by category, status, or keyword search across titles, descriptions, and street addresses.
- **CSV Data Export:** Export filtered municipal report data directly to `.csv` spreadsheets for offline reporting and municipal audits.
- **Live Database Synchronization:** Powered by Supabase Realtime channels so status changes and new reports reflect instantly across all connected screens.

### D. In-App OTA Updates
- **Over-the-Air Version Checker:** Connects with Supabase database version tables to check for application updates on startup or via manual checks, prompting users when a new release is available.

---

## 🛠️ Technology Stack
- **Frontend:** React, Vite, Tailwind CSS, Custom SVGs
- **Mapping & Geocoding:** Leaflet, React-Leaflet, OpenStreetMap / Nominatim API
- **Backend, Auth & Storage:** Supabase (PostgreSQL Database, Row Storage, Realtime Subscriptions)
- **Notifications:** EmailJS Browser SDK
- **Hosting & CI/CD:** GitHub Pages (Automated via GitHub Actions)
- **PWA & Mobile Support:** Capacitor Android wrapper and PWA manifest support

---

## 📂 System Architecture & Directory Structure
```text
civic-tracker/
├── .github/
│   └── workflows/
│       └── deploy.yml       # Automated GitHub Actions CI/CD pipeline
├── android/                 # Capacitor Android native project files
├── public/
│   ├── manifest.json        # PWA configuration manifest for mobile installation
│   └── favicon.svg          # App branding asset
├── src/
│   ├── App.jsx              # Main application component, UI views, and state logic
│   ├── App.css              # Custom layout styles
│   ├── index.css            # Tailwind CSS directives
│   ├── main.jsx             # React DOM root entry point
│   └── supabaseClient.js    # Supabase database and storage connection client
├── index.html               # Root HTML document embedding PWA meta tags
├── package.json             # Project dependencies and npm scripts
└── vite.config.js           # Vite build and bundling configurations

Getting Started Locally
Prerequisites
Node.js and npm installed on your machine.

A Supabase project with an issues table, app_versions table, and an issue-photos storage bucket.

Installation & Setup
1.Clone the repository:

    git clone [https://github.com/Rev0nix/civic-tracker.git](https://github.com/Rev0nix/civic-tracker.git)
    cd civic-tracker

2.Install dependencies:

    npm install

3.Configure environment variables:
Create a .env.local file in the root directory and add your Supabase credentials:

    VITE_SUPABASE_URL=your_supabase_project_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

4.Run the development server:
    npm run dev

🚢 Deployment & Mobile Build
CivicTrack is configured for automated continuous deployment to GitHub Pages via GitHub Actions whenever changes are pushed to the main branch.

1.To build and sync for Android locally:

    npm run build && npx cap sync && cd android && ./gradlew assembleDebug

2.To push manual updates:

    git add .
    git commit -m "Update project features and UI components"
    git push origin main    


🌐 **Live Demo:** [https://rev0nix.github.io/civic-tracker](https://rev0nix.github.io/civic-tracker)

### 📥 Download App
[Download Latest Debug APK v1.0.0](https://github.com/Rev0nix/civic-tracker/releases/download/v1.0.0/app-debug.apk)
