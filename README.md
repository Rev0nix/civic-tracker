# 🏛️ CivicTrack

**CivicTrack** is a modern, responsive, and full-stack municipal issue-reporting and tracking platform. Designed to bridge the gap between citizens and local government bodies, it enables everyday users to report municipal infrastructure problems—such as damaged potholes, faulty street lights, broken water/drainage pipes, and garbage overflows—with high precision. Concurrently, it provides municipal authorities with a dedicated administrative control center to manage, filter, analyze, and resolve these reports in real-time.

🌐 **Live Demo:** [https://rev0nix.github.io/civic-tracker](https://rev0nix.github.io/civic-tracker)

**CivicTrack** is a modern, responsive, and full-stack municipal issue-reporting and tracking platform...

---

## 🚀 Core Modules & Functionality

### A. The Citizen Portal & Reporting Workflow
* **Precise GPS Location Locking:** When reporting an issue, the app requests the mobile device's high-accuracy GPS coordinates (`navigator.geolocation`) and reverse-geocodes them via the OpenStreetMap/Nominatim API into readable, exact street addresses.
* **Client-Side Image Compression:** To prevent slow uploads on mobile networks and save database storage, high-resolution user photos are automatically compressed down in the browser using HTML5 Canvas before uploading.
* **Visual Progress Timeline:** Every issue card features an interactive 3-step milestone progress bar (`Submitted` ➔ `In Progress` ➔ `Resolved`) that gives citizens clear visual feedback on their report's progress.
* **Automated Email Notifications:** Integrated with EmailJS, the platform automatically triggers an email notification to the citizen's registered address the moment an official marks their issue as **Resolved**.
* **Community Upvoting:** Citizens can upvote existing infrastructure reports to highlight community priority and urgency.

### B. The Municipal Admin Portal
* **Secured Access Control:** Hidden behind a discrete three-dot menu (•••) in the header requiring a passcode (`admin123`) to keep administrative controls private.
* **Executive Summary Analytics:** Summary cards tracking total reports, counts for each submission state, and total community upvotes.
* **Advanced Multi-Field Search & Filters:** Filter reports instantly by category, status, or keyword search across titles, descriptions, and street addresses.
* **CSV Data Export:** Export filtered municipal report data directly to `.csv` spreadsheets for offline reporting and municipal audits.
* **Live Database Synchronization:** Powered by Supabase Realtime channels so status changes and new reports reflect instantly across all connected screens.

---

## 🛠️ Technology Stack
* **Frontend:** React, Vite, Tailwind CSS, Lucide / Custom SVGs
* **Mapping & Geocoding:** Leaflet, React-Leaflet, OpenStreetMap / Nominatim API
* **Backend, Auth & Storage:** Supabase (PostgreSQL Database, Row Storage, Realtime Subscriptions)
* **Notifications:** EmailJS Browser SDK
* **Hosting & CI/CD:** GitHub Pages (Automated via GitHub Actions)
* **PWA & Offline Support:** Progressive Web App manifest and network status detector

---

## 📂 System Architecture & Directory Structure
```text
civic-tracker/
├── .github/
│   └── workflows/
│       └── deploy.yml       # Automated GitHub Actions CI/CD pipeline
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

⚙️ Getting Started Locally
Prerequisites
  *  Node.js and npm installed on your machine.

  *  A Supabase project with an issues table and an issue-photos storage bucket.

  Installation & Setup
    Clone the repository:
        git clone [https://github.com/Rev0nix/civic-tracker.git](https://github.com/Rev0nix/civic-tracker.git)
        cd civic-tracker
    
    Install dependencies:
        npm install

    Configure environment variables:
    Create a .env.local file in the root directory and add your Supabase credentials:
        VITE_SUPABASE_URL=your_supabase_project_url
        VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

    Run the development server:
        npm run dev

    🚢 Deployment
    CivicTrack is configured for automated continuous deployment to GitHub Pages via GitHub Actions whenever changes are pushed to the main branch.

        To push manual updates:
            git add .
            git commit -m "Update project features and UI"
            git push origin main