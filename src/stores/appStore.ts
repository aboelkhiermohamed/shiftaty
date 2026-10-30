import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Hospital, Shift, PaymentModel, NavIconStyle } from "@/types";
import { supabase } from "@/lib/supabase";
import { LocalNotifications } from "@capacitor/local-notifications";
import { PushNotifications } from "@capacitor/push-notifications";

export interface UserProfile {
  name: string;
  title: string;
  email: string;
  gender: string;
  enableMonthlyTargets?: boolean;
  targetMonthlyIncome?: number;
  targetMonthlyShifts?: number;
  specialty?: string;
  subspecialty?: string;
  phone?: string;
  workplace?: string;
  licenseNumber?: string;
  graduationYear?: string;
  bio?: string;
  fcmToken?: string;
  avatar?: string;
  updatedAt?: string;
}

interface AppState {
  userProfile: UserProfile;
  hospitals: Hospital[];
  shifts: Shift[];
  notificationsEnabled: boolean;
  reminderInterval: number;
  isPushInitialized: boolean;
  isSyncing: boolean;
  hasUnsyncedChanges: boolean;
  chartType: "pie" | "bar" | "list" | "donut";
  navIconStyle: NavIconStyle;
  isPrivacyMode: boolean;
  isHydrated: boolean;
  lastSyncedAt?: string | null;
  isSideMenuOpen: boolean;

  // Profile actions
  updateUserProfile: (profile: Partial<UserProfile>) => void;
  setNotificationsEnabled: (enabled: boolean) => Promise<boolean>;
  setReminderInterval: (hours: number) => void;
  setSideMenuOpen: (open: boolean) => void;
  initPushNotifications: () => Promise<void>;

  // Hospital actions
  addHospital: (hospital: Omit<Hospital, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateHospital: (id: string, updates: Partial<Hospital>) => Promise<void>;
  deleteHospital: (id: string) => Promise<void>;

  // Shift actions
  addShift: (shift: Omit<Shift, "id" | "createdAt" | "updatedAt" | "totalEarnings">) => Promise<void>;
  updateShift: (id: string, updates: Partial<Shift>) => Promise<void>;
  deleteShift: (id: string) => Promise<void>;

  // Calculation helpers
  calculateShiftEarnings: (
    hospitalId: string,
    casesCount: number,
    customRate?: number,
    itemCounts?: Record<string, number>,
    storedFixedRate?: number,
    storedPerPatientRate?: number,
    storedFixedSalary?: number,
    multiplier?: number,
    multiplierType?: "total" | "base",
    isNabatya?: boolean
  ) => number;

  // Data management
  importData: (data: AppState) => void;
  syncData: (force?: boolean) => Promise<{ success: boolean; reason?: 'no_session' | 'network_error' | 'none' }>;
  fetchData: () => Promise<void>;
  setChartType: (type: "pie" | "bar" | "list" | "donut") => void;
  setNavIconStyle: (style: NavIconStyle) => void;
  setPrivacyMode: (enabled: boolean) => void;
}

const HOSPITAL_COLORS = [
  "#3b82f6", // blue
  "#10b981", // emerald
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
  "#6366f1", // indigo
];

const ENCOURAGING_MESSAGES = [
  "You're doing amazing work!",
  "Almost time to rest, hero!",
  "You make a real difference.",
  "Great job today!",
  "Keep up the fantastic work!",
  "Proud of your dedication.",
  "You're a lifesaver!",
  "Finishing strong!",
  "Your hard work matters.",
  "One shift closer to your goals!"
];

function getRandomEncouragement(): string {
  return ENCOURAGING_MESSAGES[Math.floor(Math.random() * ENCOURAGING_MESSAGES.length)];
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

// Helper to convert string ID to integer for LocalNotifications
function getNotificationId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      userProfile: {
        name: "Doctor",
        title: "Healthcare Professional",
        email: "",
        gender: "",
      },
      hospitals: [],
      shifts: [],
      notificationsEnabled: false,
      reminderInterval: 3,
      isPushInitialized: false,
      isSyncing: false,
      hasUnsyncedChanges: false,
      chartType: "donut",
      navIconStyle: "modern",
      isPrivacyMode: false,
      isHydrated: false,
      lastSyncedAt: null,
      isSideMenuOpen: false,

      setChartType: (type) => set({ chartType: type }),
      setNavIconStyle: (style) => set({ navIconStyle: style }),
      setPrivacyMode: (enabled) => set({ isPrivacyMode: enabled }),
      setReminderInterval: (hours) => set({ reminderInterval: hours }),
      setSideMenuOpen: (open) => set({ isSideMenuOpen: open }),

      updateUserProfile: async (profile) => {
        const now = new Date().toISOString();
        set((state) => ({
          userProfile: { ...state.userProfile, ...profile, updatedAt: now },
          hasUnsyncedChanges: true,
        }));

        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const stateProfile = get().userProfile;
            const { error } = await supabase.from('profiles').upsert({
              id: session.user.id,
              name: stateProfile.name || "Doctor",
              title: stateProfile.title || "Healthcare Professional",
              fcm_token: stateProfile.fcmToken || null,
              updated_at: now,
            });

            if (!error) {
              set({ hasUnsyncedChanges: false, lastSyncedAt: now });
            } else {
              console.error("Profile auto-sync error:", error);
            }
          }
        } catch (e) {
          console.error("Auto-sync profile failed (will retry on next sync):", e);
        }
      },

      setNotificationsEnabled: async (enabled) => {
        if (enabled) {
          const permission = await LocalNotifications.requestPermissions();
          if (permission.display === 'granted') {
            set({ notificationsEnabled: true });
            return true;
          }
          return false;
        } else {
          set({ notificationsEnabled: false });
          try {
            const notificationsToCancel: { id: number }[] = [];
            get().shifts.forEach((s) => {
              notificationsToCancel.push(
                { id: getNotificationId(s.id + '_start') },
                { id: getNotificationId(s.id + '_end') },
                { id: getNotificationId(s.id + '_checkout') },
                { id: getNotificationId(s.id) }
              );
              for (let i = 1; i <= 24; i++) {
                notificationsToCancel.push({ id: getNotificationId(s.id + `_mid_${i}`) });
              }
            });
            if (notificationsToCancel.length > 0) {
              await LocalNotifications.cancel({
                notifications: notificationsToCancel
              });
            }
          } catch (e) {
            console.error("Failed to cancel notifications on disable:", e);
          }
          return true;
        }
      },

      initPushNotifications: async () => {
        const state = get();
        if (state.isPushInitialized) return;
        set({ isPushInitialized: true });

        let permStatus = await PushNotifications.checkPermissions();

        if (permStatus.receive === 'prompt') {
          permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive !== 'granted') {
          console.warn('User denied push notification permissions');
          return;
        }

        try {
          await PushNotifications.register();
        } catch (e: any) {
          console.error('Failed to register PushNotifications: ' + e.message);
        }

        PushNotifications.addListener('registration', async (token) => {
          console.log('Push registration success, token: ' + token.value);
          const currentToken = get().userProfile.fcmToken;

          if (currentToken !== token.value) {
            set((state) => ({
              userProfile: { ...state.userProfile, fcmToken: token.value }
            }));

            // Force a slight delay to ensure Supabase has loaded the session on fresh app opens
            setTimeout(async () => {
              const { data: { session } } = await supabase.auth.getSession();
              if (session?.user) {
                const stateProfile = get().userProfile;
                const { error } = await supabase.from('profiles').upsert({
                  id: session.user.id,
                  name: stateProfile.name,
                  title: stateProfile.title,
                  fcm_token: token.value,
                  updated_at: new Date().toISOString()
                });

                if (!error) {
                  console.log("Uploaded FCM Token to Supabase");
                }
              } else {
                console.log("No session found during push registration. Token saved locally.");
              }
            }, 2000);
          }
        });

        PushNotifications.addListener('registrationError', (error: any) => {
          console.error('Error on push registration: ' + JSON.stringify(error));
        });

        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('Push received: ' + JSON.stringify(notification));
          // Could dispatch a local toast here if desired
        });

        PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
          console.log('Push action performed: ' + JSON.stringify(notification));
        });
      },

      addHospital: async (hospitalData) => {
        const newHospital: Hospital = {
          ...hospitalData,
          id: generateId(),
          color: hospitalData.color || HOSPITAL_COLORS[get().hospitals.length % HOSPITAL_COLORS.length],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        set((state) => ({
          hospitals: [...state.hospitals, newHospital],
          hasUnsyncedChanges: true,
        }));

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // Fire and forget networking
          supabase.from('hospitals').insert({
            id: newHospital.id,
            user_id: session.user.id,
            name: newHospital.name,
            payment_model: newHospital.paymentModel,
            fixed_rate: newHospital.fixedRate,
            per_patient_rate: newHospital.perPatientRate,
            fixed_salary: newHospital.fixedSalary,
            item_rates: newHospital.itemRates,
            color: newHospital.color,
            created_at: newHospital.createdAt instanceof Date ? newHospital.createdAt.toISOString() : newHospital.createdAt,
            updated_at: newHospital.updatedAt instanceof Date ? newHospital.updatedAt.toISOString() : newHospital.updatedAt,
          }).then(({ error }) => {
            if (error) console.error("Background insert hospital failed:", error);
            else set({ hasUnsyncedChanges: false });
          });
        }
      },

      updateHospital: async (id, updates) => {
        set((state) => ({
          hospitals: state.hospitals.map((h) =>
            h.id === id ? { ...h, ...updates, updatedAt: new Date() } : h
          ),
          hasUnsyncedChanges: true,
        }));

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const updatedHospital = get().hospitals.find(h => h.id === id);
          if (updatedHospital) {
            // Fire and forget
            supabase.from('hospitals').update({
              name: updatedHospital.name,
              payment_model: updatedHospital.paymentModel,
              fixed_rate: updatedHospital.fixedRate,
              per_patient_rate: updatedHospital.perPatientRate,
              fixed_salary: updatedHospital.fixedSalary,
              item_rates: updatedHospital.itemRates,
              color: updatedHospital.color,
              updated_at: new Date().toISOString()
            }).eq('id', id).then(({ error }) => {
              if (error) console.error("Background update hospital failed:", error);
              else set({ hasUnsyncedChanges: false });
            });
          }
        }
      },

      deleteHospital: async (id) => {
        set((state) => ({
          hospitals: state.hospitals.filter((h) => h.id !== id),
          hasUnsyncedChanges: true,
        }));

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // Fire and forget to not block UI
          supabase.from('hospitals').delete().eq('id', id).then(({ error }) => {
            if (error) console.error('Failed to delete hospital from cloud:', error);
            else set({ hasUnsyncedChanges: false });
          });
        }
      },

      addShift: async (shiftData) => {
        const hospital = get().hospitals.find(h => h.id === shiftData.hospitalId);
        
        let mult = 1;
        let multType: 'total' | 'base' = 'total';
        if (shiftData.notes) {
          const match = shiftData.notes.match(/\[Multiplier:\s*([0-9.]+)\s*x\s*\((Total|Base)\)\]/i);
          if (match) {
            mult = parseFloat(match[1]);
            multType = match[2].toLowerCase() as 'total' | 'base';
          }
        }

        const fRate = shiftData.storedFixedRate !== undefined ? shiftData.storedFixedRate : hospital?.fixedRate;
        const pRate = shiftData.storedPerPatientRate !== undefined ? shiftData.storedPerPatientRate : hospital?.perPatientRate;
        const fSalary = shiftData.storedFixedSalary !== undefined ? shiftData.storedFixedSalary : hospital?.fixedSalary;

        const isNabatya = shiftData.notes?.includes("[Nabatya: true]") || false;
        const totalEarnings = get().calculateShiftEarnings(
          shiftData.hospitalId,
          shiftData.casesCount,
          shiftData.customRate,
          shiftData.itemCounts,
          fRate,
          pRate,
          fSalary,
          mult,
          multType,
          isNabatya
        );

        // Snapshot hospital name/color/salary tags
        let finalNotes = shiftData.notes || "";
        if (hospital) {
          finalNotes = finalNotes.replace(/\s*\[HospitalName:\s*[^\]]+\s*\]/gi, "").trim();
          finalNotes = finalNotes.replace(/\s*\[HospitalColor:\s*[^\]]+\s*\]/gi, "").trim();
          finalNotes = finalNotes.replace(/\s*\[StoredFixedSalary:\s*[^\]]+\s*\]/gi, "").trim();
          finalNotes = finalNotes.replace(/\s*\[StoredFixedRate:\s*[^\]]+\s*\]/gi, "").trim();
          finalNotes = finalNotes.replace(/\s*\[StoredPaymentModel:\s*[^\]]+\s*\]/gi, "").trim();
          const tag = `[HospitalName: ${hospital.name}] [HospitalColor: ${hospital.color}] [StoredFixedSalary: ${hospital.fixedSalary || 0}] [StoredFixedRate: ${hospital.fixedRate || 0}] [StoredPaymentModel: ${hospital.paymentModel}]`;
          finalNotes = finalNotes ? `${finalNotes}\n${tag}` : tag;
        }

        const newShift: Shift = {
          ...shiftData,
          id: generateId(),
          totalEarnings,
          storedFixedRate: fRate,
          storedPerPatientRate: pRate,
          storedFixedSalary: fSalary,
          notes: finalNotes || undefined,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        set((state) => ({
          shifts: [...state.shifts, newShift],
          hasUnsyncedChanges: true,
        }));

        // Schedule Notifications
        if (get().notificationsEnabled) {
          const hospital = get().hospitals.find(h => h.id === newShift.hospitalId);
          const shiftDate = new Date(newShift.date);
          const [startHours, startMinutes] = newShift.startTime.split(':').map(Number);
          const [endHours, endMinutes] = newShift.endTime.split(':').map(Number);

          const startDate = new Date(shiftDate);
          startDate.setHours(startHours, startMinutes, 0, 0);

          const endDate = new Date(shiftDate);
          endDate.setHours(endHours, endMinutes, 0, 0);
          // Handle overnight or 24-hour shifts
          if (endDate <= startDate) {
            endDate.setDate(endDate.getDate() + 1);
          }

          // 1. Start Notification (1 hour before)
          const startScheduleTime = new Date(startDate.getTime() - 60 * 60 * 1000);
          if (startScheduleTime > new Date()) {
            LocalNotifications.schedule({
              notifications: [{
                title: "Upcoming Shift 🏥",
                body: `Your shift at ${hospital?.name || 'Hospital'} starts in 1 hour.`,
                smallIcon: "logo_large",
                largeIcon: "logo_large",
                id: getNotificationId(newShift.id + '_start'),
                schedule: { at: startScheduleTime },
                extra: { shiftId: newShift.id }
              }]
            });
          }

          // 2. End Notification (15 mins before)
          const endScheduleTime = new Date(endDate.getTime() - 15 * 60 * 1000);
          if (endScheduleTime > new Date()) {
            LocalNotifications.schedule({
              notifications: [{
                title: "Almost Done! 🎉",
                body: `${getRandomEncouragement()} You've earned ${totalEarnings.toLocaleString()} EGP at ${hospital?.name || 'Hospital'}.`,
                smallIcon: "logo_large",
                largeIcon: "logo_large",
                id: getNotificationId(newShift.id + '_end'),
                schedule: { at: endScheduleTime },
                extra: { shiftId: newShift.id }
              }]
            });
          }

          // 3. Smart Checkout Reminder (10 mins after shift end)
          const checkoutScheduleTime = new Date(endDate.getTime() + 10 * 60 * 1000);
          if (checkoutScheduleTime > new Date()) {
            LocalNotifications.schedule({
              notifications: [{
                title: "انتهت النباطشية! 🏥",
                body: `لا تنسَ مراجعة وتسجيل عدد الحالات والعمليات اليوم في ${hospital?.name || 'المستشفى'}.`,
                smallIcon: "logo_large",
                largeIcon: "logo_large",
                id: getNotificationId(newShift.id + '_checkout'),
                schedule: { at: checkoutScheduleTime },
                extra: { shiftId: newShift.id }
              }]
            });
          }

          // 4. Periodic Mid-Shift Reminders (Every X hours during the shift)
          const intervalMs = get().reminderInterval * 60 * 60 * 1000;
          let reminderTime = new Date(startDate.getTime() + intervalMs);
          let midIndex = 1;
          while (reminderTime < new Date(endDate.getTime() - 30 * 60 * 1000)) {
            if (reminderTime > new Date()) {
              LocalNotifications.schedule({
                notifications: [{
                  title: "سجل حالاتك أولاً بأول! 🏥",
                  body: `لا تنسَ تحديث وتسجيل الحالات والعمليات التي أنجزتها حتى الآن في ${hospital?.name || 'المستشفى'}.`,
                  smallIcon: "logo_large",
                  largeIcon: "logo_large",
                  id: getNotificationId(newShift.id + `_mid_${midIndex}`),
                  schedule: { at: reminderTime },
                  extra: { shiftId: newShift.id }
                }]
              });
            }
            reminderTime = new Date(reminderTime.getTime() + intervalMs);
            midIndex++;
          }
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // Fire and forget
          supabase.from('shifts').insert({
            id: newShift.id,
            user_id: session.user.id,
            hospital_id: newShift.hospitalId,
            date: newShift.date instanceof Date ? newShift.date.toISOString() : newShift.date,
            start_time: newShift.startTime,
            end_time: newShift.endTime,
            cases_count: newShift.casesCount,
            procedures_count: newShift.proceduresCount,
            includes_outpatient: newShift.includesOutpatient,
            notes: newShift.notes ?? null,
            custom_rate: newShift.customRate ?? null,
            item_counts: newShift.itemCounts ?? null,
            stored_fixed_rate: newShift.storedFixedRate ?? null,
            stored_per_patient_rate: newShift.storedPerPatientRate ?? null,
            stored_fixed_salary: newShift.storedFixedSalary ?? null,
            total_earnings: newShift.totalEarnings,
            created_at: newShift.createdAt instanceof Date ? newShift.createdAt.toISOString() : newShift.createdAt,
            updated_at: newShift.updatedAt instanceof Date ? newShift.updatedAt.toISOString() : newShift.updatedAt,
          }).then(({ error }) => {
            if (error) console.error("Background shift insert failed:", error);
            else set({ hasUnsyncedChanges: false });
          });
        }
      },

      updateShift: async (id, updates) => {
        set((state) => ({
          shifts: state.shifts.map((s) => {
            if (s.id !== id) return s;

            // Snapshot hospital name/color/salary tags
            const finalHospId = updates.hospitalId || s.hospitalId;
            const hospital = get().hospitals.find(h => h.id === finalHospId);
            let finalNotes = (updates.notes !== undefined ? updates.notes : s.notes) || "";
            if (hospital) {
              finalNotes = finalNotes.replace(/\s*\[HospitalName:\s*[^\]]+\s*\]/gi, "").trim();
              finalNotes = finalNotes.replace(/\s*\[HospitalColor:\s*[^\]]+\s*\]/gi, "").trim();
              finalNotes = finalNotes.replace(/\s*\[StoredFixedSalary:\s*[^\]]+\s*\]/gi, "").trim();
              finalNotes = finalNotes.replace(/\s*\[StoredFixedRate:\s*[^\]]+\s*\]/gi, "").trim();
              finalNotes = finalNotes.replace(/\s*\[StoredPaymentModel:\s*[^\]]+\s*\]/gi, "").trim();
              const tag = `[HospitalName: ${hospital.name}] [HospitalColor: ${hospital.color}] [StoredFixedSalary: ${hospital.fixedSalary || 0}] [StoredFixedRate: ${hospital.fixedRate || 0}] [StoredPaymentModel: ${hospital.paymentModel}]`;
              finalNotes = finalNotes ? `${finalNotes}\n${tag}` : tag;
            }

            // Clean undefined values from updates to prevent overwriting existing fields
            const cleanedUpdates = { ...updates };
            if (cleanedUpdates.storedFixedRate === undefined) delete cleanedUpdates.storedFixedRate;
            if (cleanedUpdates.storedPerPatientRate === undefined) delete cleanedUpdates.storedPerPatientRate;
            if (cleanedUpdates.storedFixedSalary === undefined) delete cleanedUpdates.storedFixedSalary;

            let updatedShift = { ...s, ...cleanedUpdates, notes: finalNotes || undefined, updatedAt: new Date() };

            // Recalculate earnings if relevant fields changed
            if (
              updates.hospitalId ||
              updates.casesCount !== undefined ||
              updates.customRate !== undefined ||
              updates.itemCounts !== undefined ||
              updates.notes !== undefined ||
              updates.storedFixedRate !== undefined ||
              updates.storedFixedSalary !== undefined
            ) {
              // If hospital changed, we update the stored rates to the new hospital's defaults
              let fRate = updatedShift.storedFixedRate;
              let pRate = updatedShift.storedPerPatientRate;
              let fSalary = updatedShift.storedFixedSalary;

              if (updates.hospitalId && updates.hospitalId !== s.hospitalId) {
                const newHospital = get().hospitals.find(h => h.id === updates.hospitalId);
                fRate = newHospital?.fixedRate;
                pRate = newHospital?.perPatientRate;
                fSalary = newHospital?.fixedSalary;

                updatedShift.storedFixedRate = fRate;
                updatedShift.storedPerPatientRate = pRate;
                updatedShift.storedFixedSalary = fSalary;
              }

              let mult = 1;
              let multType: 'total' | 'base' = 'total';
              if (updatedShift.notes) {
                const match = updatedShift.notes.match(/\[Multiplier:\s*([0-9.]+)\s*x\s*\((Total|Base)\)\]/i);
                if (match) {
                  mult = parseFloat(match[1]);
                  multType = match[2].toLowerCase() as 'total' | 'base';
                }
              }

              const isNabatya = updatedShift.notes?.includes("[Nabatya: true]") || false;
              updatedShift.totalEarnings = get().calculateShiftEarnings(
                updatedShift.hospitalId,
                updatedShift.casesCount,
                updatedShift.customRate,
                updatedShift.itemCounts,
                fRate,
                pRate,
                fSalary,
                mult,
                multType,
                isNabatya
              );
            }

            return updatedShift;
          }),
          hasUnsyncedChanges: true,
        }));

        // Always cancel old notifications for this shift
        try {
          const notificationsToCancel = [
            { id: getNotificationId(id + '_start') },
            { id: getNotificationId(id + '_end') },
            { id: getNotificationId(id + '_checkout') },
            { id: getNotificationId(id) } // Legacy support for old IDs
          ];
          for (let i = 1; i <= 24; i++) {
            notificationsToCancel.push({ id: getNotificationId(id + `_mid_${i}`) });
          }
          await LocalNotifications.cancel({
            notifications: notificationsToCancel
          });
        } catch (e) {
          console.error("Failed to cancel notifications on update:", e);
        }

        // Schedule new notifications if enabled
        if (get().notificationsEnabled) {
          const updatedShift = get().shifts.find(s => s.id === id);
          if (updatedShift) {
            const hospital = get().hospitals.find(h => h.id === updatedShift.hospitalId);
            const shiftDate = new Date(updatedShift.date);
            const [startHours, startMinutes] = updatedShift.startTime.split(':').map(Number);
            const [endHours, endMinutes] = updatedShift.endTime.split(':').map(Number);

            const startDate = new Date(shiftDate);
            startDate.setHours(startHours, startMinutes, 0, 0);

            const endDate = new Date(shiftDate);
            endDate.setHours(endHours, endMinutes, 0, 0);
            // Handle overnight or 24-hour shifts
            if (endDate <= startDate) {
              endDate.setDate(endDate.getDate() + 1);
            }

            // 1. Start Notification
            const startScheduleTime = new Date(startDate.getTime() - 60 * 60 * 1000);
            if (startScheduleTime > new Date()) {
              LocalNotifications.schedule({
                notifications: [{
                  title: "Upcoming Shift 🏥",
                  body: `Your shift at ${hospital?.name || 'Hospital'} starts in 1 hour.`,
                  largeIcon: "logo_large",
                  id: getNotificationId(updatedShift.id + '_start'),
                  schedule: { at: startScheduleTime },
                  extra: { shiftId: updatedShift.id }
                }]
              });
            }

            // 2. End Notification
            const endScheduleTime = new Date(endDate.getTime() - 15 * 60 * 1000);
            if (endScheduleTime > new Date()) {
              LocalNotifications.schedule({
                notifications: [{
                  title: "Almost Done! 🎉",
                  body: `${getRandomEncouragement()} You've earned ${(updatedShift.totalEarnings || 0).toLocaleString()} EGP at ${hospital?.name || 'Hospital'}.`,
                  largeIcon: "logo_large",
                  id: getNotificationId(updatedShift.id + '_end'),
                  schedule: { at: endScheduleTime },
                  extra: { shiftId: updatedShift.id }
                }]
              });
            }

            // 3. Smart Checkout Reminder (10 mins after shift end)
            const checkoutScheduleTime = new Date(endDate.getTime() + 10 * 60 * 1000);
            if (checkoutScheduleTime > new Date()) {
              LocalNotifications.schedule({
                notifications: [{
                  title: "انتهت النباطشية! 🏥",
                  body: `لا تنسَ مراجعة وتسجيل عدد الحالات والعمليات اليوم في ${hospital?.name || 'المستشفى'}.`,
                  largeIcon: "logo_large",
                  id: getNotificationId(updatedShift.id + '_checkout'),
                  schedule: { at: checkoutScheduleTime },
                  extra: { shiftId: updatedShift.id }
                }]
              });
            }

            // 4. Periodic Mid-Shift Reminders (Every X hours during the shift)
            const intervalMs = get().reminderInterval * 60 * 60 * 1000;
            let reminderTime = new Date(startDate.getTime() + intervalMs);
            let midIndex = 1;
            while (reminderTime < new Date(endDate.getTime() - 30 * 60 * 1000)) {
              if (reminderTime > new Date()) {
                LocalNotifications.schedule({
                  notifications: [{
                    title: "سجل حالاتك أولاً بأول! 🏥",
                    body: `لا تنسَ تحديث وتسجيل الحالات والعمليات التي أنجزتها حتى الآن في ${hospital?.name || 'المستشفى'}.`,
                    largeIcon: "logo_large",
                    id: getNotificationId(updatedShift.id + `_mid_${midIndex}`),
                    schedule: { at: reminderTime },
                    extra: { shiftId: updatedShift.id }
                  }]
                });
              }
              reminderTime = new Date(reminderTime.getTime() + intervalMs);
              midIndex++;
            }
          }
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const updatedShift = get().shifts.find(s => s.id === id);
          if (updatedShift) {
            // Fire and forget
            supabase.from('shifts').update({
              hospital_id: updatedShift.hospitalId,
              date: updatedShift.date instanceof Date ? updatedShift.date.toISOString() : updatedShift.date,
              start_time: updatedShift.startTime,
              end_time: updatedShift.endTime,
              cases_count: updatedShift.casesCount,
              procedures_count: updatedShift.proceduresCount,
              includes_outpatient: updatedShift.includesOutpatient,
              notes: updatedShift.notes ?? null,
              custom_rate: updatedShift.customRate ?? null,
              item_counts: updatedShift.itemCounts ?? null,
              stored_fixed_rate: updatedShift.storedFixedRate ?? null,
              stored_per_patient_rate: updatedShift.storedPerPatientRate ?? null,
              stored_fixed_salary: updatedShift.storedFixedSalary ?? null,
              total_earnings: updatedShift.totalEarnings,
              updated_at: new Date().toISOString()
            }).eq('id', id).then(({ error }) => {
              if (error) console.error('Failed to update shift in cloud:', error);
              else set({ hasUnsyncedChanges: false });
            });
          }
        }
      },

      deleteShift: async (id) => {
        set((state) => ({
          shifts: state.shifts.filter((s) => s.id !== id),
          hasUnsyncedChanges: true,
        }));

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // Fire and forget
          supabase.from('shifts').delete().eq('id', id).then(({ error }) => {
            if (error) console.error('Failed to delete shift from cloud:', error);
            else set({ hasUnsyncedChanges: false });
          });
        }

        // Always cancel any scheduled notifications for this shift when deleted
        try {
          const notificationsToCancel = [
            { id: getNotificationId(id + '_start') },
            { id: getNotificationId(id + '_end') },
            { id: getNotificationId(id + '_checkout') },
            { id: getNotificationId(id) }
          ];
          for (let i = 1; i <= 24; i++) {
            notificationsToCancel.push({ id: getNotificationId(id + `_mid_${i}`) });
          }
          await LocalNotifications.cancel({
            notifications: notificationsToCancel
          });
        } catch (e) {
          console.error("Failed to cancel notifications on delete:", e);
        }
      },

      calculateShiftEarnings: (hospitalId, casesCount, customRate, itemCounts, storedFixedRate, storedPerPatientRate, storedFixedSalary, multiplier = 1, multiplierType = "total", isNabatya = false) => {
        const hospital = get().hospitals.find((h) => h.id === hospitalId);
        if (!hospital) return 0;

        if (customRate !== undefined && customRate > 0) {
          return customRate;
        }

        // Use stored rates if available, otherwise fallback to hospital current rates
        const fRate = storedFixedRate !== undefined ? storedFixedRate : hospital.fixedRate;
        const pRate = storedPerPatientRate !== undefined ? storedPerPatientRate : hospital.perPatientRate;
        const fSalary = storedFixedSalary !== undefined ? storedFixedSalary : (hospital.fixedSalary || 0);

        let baseEarnings = 0;
        let itemEarnings = 0;

        switch (hospital.paymentModel) {
          case "fixed":
            baseEarnings = fRate;
            break;
          case "per_patient":
            itemEarnings = casesCount * pRate;
            break;
          case "mixed":
            baseEarnings = fRate;
            itemEarnings = casesCount * pRate;
            break;
          case "detailed":
            baseEarnings = fSalary;
            if (itemCounts && hospital.itemRates && Array.isArray(hospital.itemRates)) {
              hospital.itemRates.forEach((item) => {
                const count = itemCounts[item.id] || 0;
                itemEarnings += count * item.rate;
              });
            }
            break;
          case "government":
            baseEarnings = isNabatya ? fRate : 0;
            break;
        }

        if (multiplierType === "base") {
          return (baseEarnings * multiplier) + itemEarnings;
        } else {
          return (baseEarnings + itemEarnings) * multiplier;
        }
      },

      importData: (data) => {
        set({
          userProfile: data.userProfile,
          hospitals: data.hospitals,
          shifts: data.shifts,
          notificationsEnabled: data.notificationsEnabled || false,
          reminderInterval: data.reminderInterval || 3
        });
      },

      syncData: async (force = false) => {
        // If no changes and not forced, don't waste bandwidth/CPU
        if (!get().hasUnsyncedChanges && !force) {
          console.log("No unsynced changes, skipping syncData heavy lifting.");
          return { success: true, reason: 'none' };
        }

        console.log("Starting syncData...");
        set({ isSyncing: true });

        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          console.log("No user session found during syncData (guest mode)");
          set({ isSyncing: false });
          return { success: false, reason: 'no_session' };
        }

        const userId = session.user.id;
        const state = get();
        console.log("Syncing for user:", userId);
        console.log("Hospitals to sync:", state.hospitals.length);
        console.log("Shifts to sync:", state.shifts.length);

        let hasSyncError = false;

        // 1. Upload Profiles (valid Supabase columns only: id, name, title, fcm_token, updated_at)
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: userId,
          name: state.userProfile.name || "Doctor",
          title: state.userProfile.title || "Healthcare Professional",
          fcm_token: state.userProfile.fcmToken || null,
          updated_at: new Date().toISOString(),
        });
        if (profileError) {
          console.error("Error syncing profile:", profileError);
          hasSyncError = true;
        }

        // 2. Upload/Sync Hospitals (BATCH)
        if (state.hospitals.length > 0) {
          const hospitalsPayload = state.hospitals.map(h => ({
            id: h.id,
            user_id: userId,
            name: h.name,
            payment_model: h.paymentModel,
            fixed_rate: h.fixedRate,
            per_patient_rate: h.perPatientRate,
            fixed_salary: h.fixedSalary,
            item_rates: h.itemRates,
            color: h.color,
            created_at: h.createdAt instanceof Date ? h.createdAt.toISOString() : h.createdAt,
            updated_at: h.updatedAt instanceof Date ? h.updatedAt.toISOString() : h.updatedAt,
          }));
          const { error } = await supabase.from('hospitals').upsert(hospitalsPayload);
          if (error) {
            console.error("Error batch syncing hospitals", error);
            hasSyncError = true;
          }
        }

        // 3. Upload Shifts (BATCH)
        if (state.shifts.length > 0) {
          const shiftsPayload = state.shifts.map(s => ({
            id: s.id,
            user_id: userId,
            hospital_id: s.hospitalId,
            date: s.date instanceof Date ? s.date.toISOString() : s.date,
            start_time: s.startTime,
            end_time: s.endTime,
            cases_count: s.casesCount,
            procedures_count: s.proceduresCount,
            includes_outpatient: s.includesOutpatient,
            notes: s.notes,
            custom_rate: s.customRate,
            item_counts: s.itemCounts,
            stored_fixed_rate: s.storedFixedRate,
            stored_per_patient_rate: s.storedPerPatientRate,
            stored_fixed_salary: s.storedFixedSalary,
            total_earnings: s.totalEarnings,
            created_at: s.createdAt instanceof Date ? s.createdAt.toISOString() : s.createdAt,
            updated_at: s.updatedAt instanceof Date ? s.updatedAt.toISOString() : s.updatedAt,
          }));

          // Chunk to avoid payload limit (e.g. 100 max per request if user has many)
          const chunkSize = 100;
          for (let i = 0; i < shiftsPayload.length; i += chunkSize) {
            const chunk = shiftsPayload.slice(i, i + chunkSize);
            const { error } = await supabase.from('shifts').upsert(chunk);
            if (error) {
              console.error("Error batch syncing shifts chunk", error);
              hasSyncError = true;
            }
          }
        }
        console.log("syncData complete. hasSyncError:", hasSyncError);
        set({
          isSyncing: false,
          hasUnsyncedChanges: hasSyncError,
          lastSyncedAt: hasSyncError ? get().lastSyncedAt : new Date().toISOString(),
        });

        return { success: !hasSyncError, reason: hasSyncError ? 'network_error' : 'none' };
      },

      fetchData: async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        const userId = session.user.id;

        // 1. Fetch Profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (profile) {
          set((state) => {
            // Only overwrite local name/title if they are defaults OR cloud is newer
            const cloudUpdatedAt = profile.updated_at ? new Date(profile.updated_at).getTime() : 0;
            const localUpdatedAt = state.userProfile.updatedAt ? new Date(state.userProfile.updatedAt).getTime() : 0;
            
            const shouldUpdateName = !state.userProfile.name || state.userProfile.name === "Doctor" || cloudUpdatedAt > localUpdatedAt;
            const shouldUpdateTitle = !state.userProfile.title || state.userProfile.title === "Healthcare Professional" || cloudUpdatedAt > localUpdatedAt;

            return {
              userProfile: {
                ...state.userProfile,
                name: shouldUpdateName ? (profile.name || state.userProfile.name) : state.userProfile.name,
                title: shouldUpdateTitle ? (profile.title || state.userProfile.title) : state.userProfile.title,
                email: profile.email || state.userProfile.email,
                gender: profile.gender || state.userProfile.gender,
                fcmToken: profile.fcm_token || state.userProfile.fcmToken,
                updatedAt: profile.updated_at || state.userProfile.updatedAt
              }
            };
          });
        }

        // 2. Fetch Hospitals
        const { data: hospitals } = await supabase
          .from('hospitals')
          .select('*')
          .eq('user_id', userId);

        if (hospitals && hospitals.length > 0) {
          set({
            hospitals: hospitals.map(h => ({
              ...h,
              createdAt: new Date(h.created_at),
              updatedAt: new Date(h.updated_at),
              // Map DB keys back to CamelCase if needed, but we used snake_case in DB and TS interface matches... 
              // Wait, DB has snake_case (fixed_rate), TS has camelCase (fixedRate).
              // We need to map them!
              paymentModel: h.payment_model,
              fixedRate: h.fixed_rate,
              perPatientRate: h.per_patient_rate,
              fixedSalary: h.fixed_salary,
              itemRates: typeof h.item_rates === 'string' ? JSON.parse(h.item_rates) : h.item_rates
            }))
          });
        }

        // 3. Fetch Shifts
        const { data: shifts } = await supabase
          .from('shifts')
          .select('*')
          .eq('user_id', userId);

        if (shifts && shifts.length > 0) {
          set({
            shifts: shifts.map(s => ({
              ...s,
              hospitalId: s.hospital_id,
              date: new Date(s.date),
              startTime: s.start_time,
              endTime: s.end_time,
              casesCount: s.cases_count,
              proceduresCount: s.procedures_count,
              includesOutpatient: s.includes_outpatient,
              customRate: s.custom_rate,
              itemCounts: typeof s.item_counts === 'string' ? JSON.parse(s.item_counts) : s.item_counts,
              storedFixedRate: s.stored_fixed_rate,
              storedPerPatientRate: s.stored_per_patient_rate,
              storedFixedSalary: s.stored_fixed_salary,
              totalEarnings: s.total_earnings || 0,
              createdAt: new Date(s.created_at),
              updatedAt: new Date(s.updated_at)
            }))
          });
        }
        set({ lastSyncedAt: new Date().toISOString() });
      },
    }),
    {
      name: "doctor-shift-manager",
      partialize: (state) => ({
        userProfile: state.userProfile,
        notificationsEnabled: state.notificationsEnabled,
        reminderInterval: state.reminderInterval,
        hospitals: state.hospitals,
        shifts: state.shifts.map((s) => ({
          ...s,
          date: s.date instanceof Date ? s.date.toISOString() : s.date,
          createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : s.createdAt,
          updatedAt: s.updatedAt instanceof Date ? s.updatedAt.toISOString() : s.updatedAt,
        })),
        chartType: state.chartType,
        navIconStyle: state.navIconStyle,
        hasUnsyncedChanges: state.hasUnsyncedChanges,
        lastSyncedAt: state.lastSyncedAt,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Safety check: Ensure arrays are initialized
          state.shifts = Array.isArray(state.shifts) ? state.shifts : [];
          state.hospitals = Array.isArray(state.hospitals) ? state.hospitals : [];
          state.reminderInterval = state.reminderInterval || 3;

          // Convert date strings back to Date objects
          state.shifts = state.shifts.map((s: any) => ({
            ...s,
            date: new Date(s.date),
            createdAt: s.createdAt ? new Date(s.createdAt) : new Date(),
            updatedAt: s.updatedAt ? new Date(s.updatedAt) : new Date(),
          }));
          state.hospitals = state.hospitals.map((h: any) => ({
            ...h,
            createdAt: h.createdAt ? new Date(h.createdAt) : new Date(),
            updatedAt: h.updatedAt ? new Date(h.updatedAt) : new Date(),
          }));

          // Migrate existing shifts to include hospital name, color, and stored values tags
          state.shifts = state.shifts.map((s: any) => {
            const hospital = state.hospitals.find((h: any) => h.id === s.hospitalId);
            let updatedShift = { ...s };
            
            if (hospital) {
              // Heal missing stored fields from active hospital
              if (updatedShift.storedFixedSalary === undefined || updatedShift.storedFixedSalary === null) {
                updatedShift.storedFixedSalary = hospital.fixedSalary || 0;
              }
              if (updatedShift.storedFixedRate === undefined || updatedShift.storedFixedRate === null) {
                updatedShift.storedFixedRate = hospital.fixedRate || 0;
              }
              if (updatedShift.storedPerPatientRate === undefined || updatedShift.storedPerPatientRate === null) {
                updatedShift.storedPerPatientRate = hospital.perPatientRate || 0;
              }

              // Snapshot metadata tags in notes
              let notesStr = updatedShift.notes || "";
              const hasNameTag = /\[HospitalName:\s*[^\]]+\s*\]/i.test(notesStr);
              const hasColorTag = /\[HospitalColor:\s*[^\]]+\s*\]/i.test(notesStr);
              const hasSalaryTag = /\[StoredFixedSalary:\s*[^\]]+\s*\]/i.test(notesStr);
              
              if (!hasNameTag || !hasColorTag || !hasSalaryTag) {
                notesStr = notesStr.replace(/\s*\[HospitalName:\s*[^\]]+\s*\]/gi, "").trim();
                notesStr = notesStr.replace(/\s*\[HospitalColor:\s*[^\]]+\s*\]/gi, "").trim();
                notesStr = notesStr.replace(/\s*\[StoredFixedSalary:\s*[^\]]+\s*\]/gi, "").trim();
                notesStr = notesStr.replace(/\s*\[StoredFixedRate:\s*[^\]]+\s*\]/gi, "").trim();
                notesStr = notesStr.replace(/\s*\[StoredPaymentModel:\s*[^\]]+\s*\]/gi, "").trim();

                const tag = `[HospitalName: ${hospital.name}] [HospitalColor: ${hospital.color}] [StoredFixedSalary: ${hospital.fixedSalary || 0}] [StoredFixedRate: ${hospital.fixedRate || 0}] [StoredPaymentModel: ${hospital.paymentModel}]`;
                notesStr = notesStr ? `${notesStr}\n${tag}` : tag;
                updatedShift.notes = notesStr;
              }
            }
            return updatedShift;
          });
        }
        
        // Mark as hydrated regardless of whether state was found or not
        useAppStore.setState({ isHydrated: true });
      },
    }
  )
);
