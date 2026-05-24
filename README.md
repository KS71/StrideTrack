# 🚶‍♂️ StrideTrack

100% vibe code

**Note:** Please note that there are still features that have not yet been installed, but the app works perfectly fine.

A user-friendly Android app (.apk) designed to help you track your walks, set personal goals, and keep track of them. The app is built with a focus on seamless mobile user experience.

> **Note:** StrideTrack does *not* use your phone's GPS to automatically track your walks. You must use another device (like a smartwatch or another tracking app) to record your distance and then manually log it in StrideTrack.

---

## 📸 Screenshots

<div align="center">
  <img src="001.jpg" width="300" alt="Dashboard" />
    &nbsp;&nbsp;&nbsp;&nbsp;
  <img src="004.jpg" width="300" alt="Settings" />
</div>
<br />
<div align="center">
  <img src="003.jpg" width="300" alt="History" />
    &nbsp;&nbsp;&nbsp;&nbsp;
  <img src="002b.jpg" width="300" alt="New Screenshot 2" />
</div>

<br />
<div align="center">
  <img src="ny_history.jpg" width="300" alt="History Updates" />
  &nbsp;&nbsp;&nbsp;&nbsp;
  <img src="ny_yearly.jpg" width="300" alt="Yearly Overview" />
</div>
<br />
<div align="center">
  &nbsp;&nbsp;&nbsp;&nbsp;
  <img width="1080" height="4302" alt="Settings" src="https://github.com/user-attachments/assets/32d15b5f-b333-4cfd-86c4-574434616169" />
  <img src="ny_settings.jpg" width="300" alt="Settings Updates" />
</div>

---

## ✨ Features

- **📊 Dashboard:** Get a full overview of your daily, weekly, and monthly progress directly on the front page.
- **🎯 Goals:** Set personal goals for how much you want to walk per week, month, and year, and track how close you are to reaching them.
- **📝 Log Walk:** Easy and quick logging of the distance you've walked on your latest trips.
- **📅 History:** Coming in the next version.
- **⚙️ Settings:** Customize the app to your needs and easily delete your data.
- **📱 Android App (.apk):** Built as a native app via Capacitor, ready to install on your Android phone.

## 🔒 Data & Privacy

StrideTrack is built with a 100% focus on user privacy and data ownership, employing a **Local-First with Opt-In Cloud Sync** philosophy:

- **Local-First by Default:** Everything you enter (how far you walk, times, goals, preferences) is saved **locally on your own phone**. The app works 100% offline and does not require an account to use. No one else has access to your local data.
- **Voluntary Cloud Backup (Opt-In):** We have integrated a secure, voluntary cloud backup system using **Supabase**. If you choose to connect a profile, your walk logs and goals will be automatically backed up in the cloud, protecting your history from physical device loss or app deletion.
- **Database-Level Protection:** When using cloud sync, your data is secured at the lowest database engine level using PostgreSQL **Row-Level Security (RLS)**. Only your authenticated user account has permission to read, write, or modify your walking data.
- **Offline / Local Backups:** If you prefer not to use the cloud, you can still manually export and import your complete walking history as a local backup file at any time via the settings.

## 🛠️ Technologies

The project is built with modern web technologies to ensure the best performance and experience:

- **Frontend Framework:** React 18
- **Programming Language:** TypeScript
- **Styling:** Tailwind CSS (with custom color themes)
- **Build Tool:** Vite
- **Icons:** Lucide React
- **Mobile/Native App:** Capacitor (Built for Android / APK)

## 🚀 Getting Started (Run Locally)

To run the project locally on your own machine:

1. **Clone the project:**
   ```bash
   git clone https://github.com/KS71/WalkGoal.git
   ```
2. **Enter the folder:**
   ```bash
   cd WalkGoal
   ```
3. **Install dependencies:**
   ```bash
   npm install
   ```
4. **Start the app:**
   ```bash
   npm run dev
   ```

## 👨‍💻 Development & History

The app is continuously updated.

**v2.2.0:**
- **Cloud Sync Integration:** Securely back up all your walking logs, goals, and settings in the cloud using Supabase. Logs are seamlessly synchronized between device local storage and your database.
- **Double Password Verification:** Added confirmation input on registration modal to ensure accurate profile password setup.
- **English Localization:** Translated and standardized all new Settings UI elements, modals, and synchronizing workflows to match the rest of the application.
- **Local Data Backup Clarity:** Refined Settings category and descriptions to clearly distinguish local file backups from cloud sync.

**v2.1.6:**
- **Swipe Navigation:** You can now smoothly swipe left and right to navigate between the different pages in the app.

**v2.1.5:**
- **Yearly Overview:** All months now consistently show the distance walked.
- **History:** Monthly group headers now turn green when the goal for that month is reached.
- **Settings:** Removed Daily Reminders. Updated the Roadmap to include Google Health Connect Integration.

**v2.1.4:**
- **Monthly History Grouping:** Walks in the History tab are now automatically grouped by month with collapsible sections.
- **Monthly Totals:** Each month now displays the total distance walked directly in the header.
- **Auto-Expand:** The most recent month is automatically expanded for quick access.

**v2.1.3:**
- Added the ability to manually select the time of the walk instead of defaulting to 'Now'.
- Implemented a festive "Goal Reached" graphic when progress reaches 100% or more.

**v2.1.1:**
- Added Settings navigation to sub-headers (Log Walk, Goal Setup, History).
- Added Last Backup date display with 12h/24h format support in Settings.
- Added a brand new Yearly Overview Statistics screen.
- Improved header styling across all pages to prevent overlap with the Android status bar.
