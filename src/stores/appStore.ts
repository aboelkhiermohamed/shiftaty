import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Hospital, Shift, PaymentModel } from "@/types";

interface AppState {
  hospitals: Hospital[];
  shifts: Shift[];
  
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
    customRate?: number
  ) => number;
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

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      hospitals: [],
      shifts: [],

      addHospital: (hospitalData) => {
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
      },

      updateHospital: (id, updates) => {
        set((state) => ({
          hospitals: state.hospitals.map((h) =>
            h.id === id ? { ...h, ...updates, updatedAt: new Date() } : h
          ),
        }));
      },

      deleteHospital: (id) => {
        set((state) => ({
          hospitals: state.hospitals.filter((h) => h.id !== id),
          shifts: state.shifts.filter((s) => s.hospitalId !== id),
        }));
      },

      addShift: (shiftData) => {
        const totalEarnings = get().calculateShiftEarnings(
          shiftData.hospitalId,
          shiftData.casesCount,
          shiftData.customRate
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
      },

      updateShift: (id, updates) => {
        set((state) => ({
          shifts: state.shifts.map((s) => {
            if (s.id !== id) return s;
            
            const updatedShift = { ...s, ...updates, updatedAt: new Date() };
            
            // Recalculate earnings if relevant fields changed
            if (updates.hospitalId || updates.casesCount !== undefined || updates.customRate !== undefined) {
              updatedShift.totalEarnings = get().calculateShiftEarnings(
                updatedShift.hospitalId,
                updatedShift.casesCount,
                updatedShift.customRate
              );
            }
            
            return updatedShift;
          }),
        }));
      },

      deleteShift: (id) => {
        set((state) => ({
          shifts: state.shifts.filter((s) => s.id !== id),
        }));
      },

      calculateShiftEarnings: (hospitalId, casesCount, customRate) => {
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
          default:
            return 0;
        }
      },
    }),
    {
      name: "doctor-shift-manager",
      partialize: (state) => ({
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
          // Convert date strings back to Date objects
          state.shifts = state.shifts.map((s: any) => ({
            ...s,
            date: new Date(s.date),
            createdAt: new Date(s.createdAt),
            updatedAt: new Date(s.updatedAt),
          }));
          state.hospitals = state.hospitals.map((h: any) => ({
            ...h,
            createdAt: new Date(h.createdAt),
            updatedAt: new Date(h.updatedAt),
          }));
        }
      },
    }
  )
);
