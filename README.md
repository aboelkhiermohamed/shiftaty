# 🕒 Shiftaty

**Shiftaty** is a professional-grade shift and salary management ecosystem built for healthcare workers and shift-based professionals. It combines a high-performance web core with native mobile capabilities to provide real-time earnings tracking, automated financial calculations, and secure cloud synchronization.

---

## ✨ Key Features & Deep Dive

### 💰 Smart Salary Engine
Shiftaty doesn't just track hours; it understands complex payment structures.
- **Multiple Payment Models**: Support for Fixed Rate, Per Patient, Mixed (Fixed + Per Patient), and Detailed (item-based) models.
- **Precision Calculations**: Real-time calculation of total earnings including base pay and custom bonuses.
- **Hospital-Specific Rules**: Configure unique payment structures for every workplace you visit.

### 📊 Dynamic Business Intelligence
Visualize your productivity and financial growth through data.
- **Monthly Breakdowns**: Detailed views of your earnings per month and per workplace.
- **Trend Visualizations**: Beautiful interactive charts powered by `Recharts` to track your progress over time.
- **Export Capabilities**: Generate professional PDF reports of your shift data for record-keeping or sharing.

### 📱 Native Mobile Core
Built on **Capacitor**, Shiftaty provides a true app experience on mobile devices.
- **Push & Local Notifications**: Reminders for upcoming shifts and encouraging messages when you finish work.
- **Native File System**: High-performance local storage ensuring your data is accessible even without an internet connection.
- **Adaptive UI**: A premium "Glassmorphism" interface that adjusts perfectly between Light and Dark modes.

### ☁️ Enterprise-Grade Sync
Your data follows you everywhere.
- **Supabase Integration**: Real-time, secure synchronization between your PC, Android, and iOS devices.
- **Offline-First**: Add shifts while at work; they'll sync automatically as soon as you're back online.

---

## 🚀 Tech Stack

| Category | Technology |
| :--- | :--- |
| **Core** | React 18, Vite 5, TypeScript 5 |
| **State** | Zustand (with Persistence) |
| **Backend** | Supabase (PostgreSQL, Auth, Edge Functions) |
| **Mobile** | Capacitor 8 (Android & iOS) |
| **Styling** | Tailwind CSS, shadcn/ui, Framer Motion |
| **Utilities** | Lucide Icons, Recharts, date-fns, jsPDF |

---

## 📂 Project Structure

```text
shiftaty/
├── android/              # Native Android project files
├── ios/                  # Native iOS project files
├── src/
│   ├── components/       # UI Components (shadcn/ui + custom)
│   │   ├── dashboard/    # Specialized dashboard charts/cards
│   │   ├── layout/       # Navigation and shell components
│   │   └── shifts/       # Shift-related forms and views
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utility libraries (Supabase, PDF Gen)
│   ├── pages/            # View-level components (Index, Login, Settings)
│   ├── stores/           # Zustand state management (appStore.ts)
│   └── types/            # TypeScript interfaces & enums
├── public/               # Static assets (icons, manifest)
├── capacitor.config.ts   # Mobile configuration
└── tailwind.config.ts    # Styling theme configuration
```

---

## 🛠️ Detailed Setup

### 1. Repository Setup
```sh
git clone https://github.com/aboelkhiermohamed/shiftaty.git
cd shiftaty
npm install
```

### 2. Environment Configuration
Create a `.env` file in the root with your Supabase credentials. These are essential for cloud sync and authentication features.
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Database Migration (Optional)
Shiftaty expects a specific schema in Supabase. Ensure you have the `profiles`, `hospitals`, and `shifts` tables configured with RLS (Row Level Security) enabled.

---

## 📱 Mobile Development

### Android
- **Prerequisites**: Android Studio & SDK 33+.
- **Build & Sync**:
  ```sh
  npm run build
  npx cap sync android
  npx cap open android
  ```

### iOS
- **Prerequisites**: macOS & Xcode 15+.
- **Build & Sync**:
  ```sh
  npm run build
  npx cap sync ios
  npx cap open ios
  ```

---

## 💡 Troubleshooting

- **Sync Issues**: Ensure `VITE_SUPABASE_URL` is correctly formatted. Check the browser console for "Net Error" if offline.
- **Build Errors**: If `npm run build` fails, try deleting `node_modules` and `package-lock.json` then run `npm install` again.
- **Mobile Splash Screen**: To update icons, use the `generate-icons.js` utility script included in the root.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
