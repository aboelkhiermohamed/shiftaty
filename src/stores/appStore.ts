import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Hospital, Shift, PaymentModel } from "@/types";
import { supabase } from "@/lib/supabase";
import { LocalNotifications } from "@capacitor/local-notifications";

export interface UserProfile {
  name: string;
  title: string;
  email: string;
  gender: string;
}

interface AppState {
  userProfile: UserProfile;
  hospitals: Hospital[];
  shifts: Shift[];
  notificationsEnabled: boolean;

  // Profile actions
  updateUserProfile: (profile: Partial<UserProfile>) => void;
  setNotificationsEnabled: (enabled: boolean) => Promise<boolean>;

  // Hospital actions
  addHospital: (hospital: Omit<Hospital, "id" | "createdAt" | "updatedAt">) => void;
  updateHospital: (id: string, updates: Partial<Hospital>) => void;
  deleteHospital: (id: string) => void;

  // Shift actions
  addShift: (shift: Omit<Shift, "id" | "createdAt" | "updatedAt" | "totalEarnings">) => void;
  updateShift: (id: string, updates: Partial<Shift>) => void;
  deleteShift: (id: string) => void;

  // Calculation helpers
  calculateShiftEarnings: (
    hospitalId: string,
    casesCount: number,
    customRate?: number,
    itemCounts?: Record<string, number>
  ) => number;

  // Data management
  importData: (data: AppState) => void;
  syncData: () => Promise<void>;
  fetchData: () => Promise<void>;
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

      updateUserProfile: async (profile) => {
        set((state) => ({
          userProfile: { ...state.userProfile, ...profile },
        }));

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await supabase.from('profiles').upsert({
            id: session.user.id,
            ...get().userProfile,
            updated_at: new Date().toISOString()
          });
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
          // Optionally cancel all notifications?
          // LocalNotifications.cancel(get().shifts.map(s => ({ id: getNotificationId(s.id) })));
          return true;
        }
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
        }));

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await supabase.from('hospitals').insert({
            ...newHospital,
            user_id: session.user.id
          });
        }
      },

      updateHospital: async (id, updates) => {
        set((state) => ({
          hospitals: state.hospitals.map((h) =>
            h.id === id ? { ...h, ...updates, updatedAt: new Date() } : h
          ),
        }));

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const updatedHospital = get().hospitals.find(h => h.id === id);
          if (updatedHospital) {
            await supabase.from('hospitals').update({
              ...updatedHospital,
              updatedAt: new Date().toISOString()
            }).eq('id', id);
          }
        }
      },

      deleteHospital: async (id) => {
        set((state) => ({
          hospitals: state.hospitals.filter((h) => h.id !== id),
          shifts: state.shifts.filter((s) => s.hospitalId !== id),
        }));

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await supabase.from('hospitals').delete().eq('id', id);
        }
      },

      addShift: async (shiftData) => {
        const totalEarnings = get().calculateShiftEarnings(
          shiftData.hospitalId,
          shiftData.casesCount,
          shiftData.customRate,
          shiftData.itemCounts
        );

        const newShift: Shift = {
          ...shiftData,
          id: generateId(),
          totalEarnings,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        set((state) => ({
          shifts: [...state.shifts, newShift],
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
          // Handle overnight shifts
          if (endDate < startDate) {
            endDate.setDate(endDate.getDate() + 1);
          }

          // 1. Start Notification (1 hour before)
          const startScheduleTime = new Date(startDate.getTime() - 60 * 60 * 1000);
          if (startScheduleTime > new Date()) {
            LocalNotifications.schedule({
              notifications: [{
                title: "Upcoming Shift 🏥",
                body: `Your shift at ${hospital?.name || 'Hospital'} starts in 1 hour.`,
                id: getNotificationId(newShift.id + '_start'),
                schedule: { at: startScheduleTime },
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
                id: getNotificationId(newShift.id + '_end'),
                schedule: { at: endScheduleTime },
              }]
            });
          }
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await supabase.from('shifts').insert({
            ...newShift,
            user_id: session.user.id
          });
        }
      },

      updateShift: async (id, updates) => {
        set((state) => ({
          shifts: state.shifts.map((s) => {
            if (s.id !== id) return s;

            let updatedShift = { ...s, ...updates, updatedAt: new Date() };

            // Recalculate earnings if relevant fields changed
            if (updates.hospitalId || updates.casesCount !== undefined || updates.customRate !== undefined || updates.itemCounts !== undefined) {
              updatedShift.totalEarnings = get().calculateShiftEarnings(
                updatedShift.hospitalId,
                updatedShift.casesCount,
                updatedShift.customRate,
                updatedShift.itemCounts
              );
            }

            return updatedShift;
          }),
        }));

        // Update Notifications
        if (get().notificationsEnabled) {
          // Cancel old
          LocalNotifications.cancel({
            notifications: [
              { id: getNotificationId(id + '_start') },
              { id: getNotificationId(id + '_end') },
              { id: getNotificationId(id) } // Legacy support for old IDs
            ]
          });

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
            if (endDate < startDate) {
              endDate.setDate(endDate.getDate() + 1);
            }

            // 1. Start Notification
            const startScheduleTime = new Date(startDate.getTime() - 60 * 60 * 1000);
            if (startScheduleTime > new Date()) {
              LocalNotifications.schedule({
                notifications: [{
                  title: "Upcoming Shift 🏥",
                  body: `Your shift at ${hospital?.name || 'Hospital'} starts in 1 hour.`,
                  id: getNotificationId(updatedShift.id + '_start'),
                  schedule: { at: startScheduleTime },
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
                  id: getNotificationId(updatedShift.id + '_end'),
                  schedule: { at: endScheduleTime },
                }]
              });
            }
          }
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const updatedShift = get().shifts.find(s => s.id === id);
          if (updatedShift) {
            await supabase.from('shifts').update({
              ...updatedShift,
              updatedAt: new Date().toISOString()
            }).eq('id', id);
          }
        }
      },

      deleteShift: async (id) => {
        set((state) => ({
          shifts: state.shifts.filter((s) => s.id !== id),
        }));

        if (get().notificationsEnabled) {
          LocalNotifications.cancel({
            notifications: [
              { id: getNotificationId(id + '_start') },
              { id: getNotificationId(id + '_end') },
              { id: getNotificationId(id) }
            ]
          });
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await supabase.from('shifts').delete().eq('id', id);
        }
      },

      calculateShiftEarnings: (hospitalId, casesCount, customRate, itemCounts) => {
        const hospital = get().hospitals.find((h) => h.id === hospitalId);
        if (!hospital) return 0;

        if (customRate !== undefined && customRate > 0) {
          return customRate;
        }

        switch (hospital.paymentModel) {
          case "fixed":
            return hospital.fixedRate;
          case "per_patient":
            return casesCount * hospital.perPatientRate;
          case "mixed":
            return hospital.fixedRate + casesCount * hospital.perPatientRate;
          case "detailed":
            let earnings = hospital.fixedSalary || 0;
            // FIXED: Added check for hospital.itemRates to avoid crash if undefined
            if (itemCounts && hospital.itemRates && Array.isArray(hospital.itemRates)) {
              hospital.itemRates.forEach((item) => {
                const count = itemCounts[item.id] || 0;
                earnings += count * item.rate;
              });
            }
            return earnings;
          default:
            return 0;
        }
      },

      importData: (data) => {
        set({
          userProfile: data.userProfile,
          hospitals: data.hospitals,
          shifts: data.shifts,
          notificationsEnabled: data.notificationsEnabled || false
        });
      },

      syncData: async () => {
        console.log("Starting syncData...");
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          console.log("No user session found during syncData");
          return;
        }

        const userId = session.user.id;
        const state = get();
        console.log("Syncing for user:", userId);
        console.log("Hospitals to sync:", state.hospitals.length);
        console.log("Shifts to sync:", state.shifts.length);

        // 1. Upload Profiles
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: userId,
          ...state.userProfile,
          updated_at: new Date().toISOString(),
        });
        if (profileError) console.error("Error syncing profile:", profileError);

        // 2. Upload/Sync Hospitals
        for (const h of state.hospitals) {
          const { error } = await supabase.from('hospitals').upsert({
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
            updated_at: new Date().toISOString()
          }).select();
          if (error) console.error("Error syncing hospital", h.name, error);
        }

        // 3. Upload Shifts
        for (const s of state.shifts) {
          const { error } = await supabase.from('shifts').upsert({
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
            total_earnings: s.totalEarnings,
            created_at: s.createdAt instanceof Date ? s.createdAt.toISOString() : s.createdAt,
            updated_at: new Date().toISOString()
          }).select();
          if (error) console.error("Error syncing shift", s.id, error);
        }
        console.log("syncData complete.");
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
          set((state) => ({
            userProfile: { ...state.userProfile, ...profile }
          }));
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
              itemRates: h.item_rates
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
              itemCounts: s.item_counts,
              totalEarnings: s.total_earnings || 0,
              createdAt: new Date(s.created_at),
              updatedAt: new Date(s.updated_at)
            }))
          });
        }
      },
    }),
    {
      name: "doctor-shift-manager",
      partialize: (state) => ({
        userProfile: state.userProfile,
        notificationsEnabled: state.notificationsEnabled,
        hospitals: state.hospitals,
        shifts: state.shifts.map((s) => ({
          ...s,
          date: s.date instanceof Date ? s.date.toISOString() : s.date,
          createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : s.createdAt,
          updatedAt: s.updatedAt instanceof Date ? s.updatedAt.toISOString() : s.updatedAt,
        })),
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Safety check: Ensure arrays are initialized
          state.shifts = Array.isArray(state.shifts) ? state.shifts : [];
          state.hospitals = Array.isArray(state.hospitals) ? state.hospitals : [];

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
        }
      },
    }
  )
);
