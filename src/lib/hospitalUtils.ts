import { Hospital, Shift, PaymentModel } from "@/types";

export const HOSPITAL_COLORS = [
  "#3b82f6", // blue
  "#10b981", // emerald
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
  "#6366f1", // indigo
];

/**
 * Deterministically assigns and resolves hospital accent color.
 * Reuses hospital.color if set, otherwise hashes name or id.
 */
export function getHospitalColor(hospital?: { color?: string; name?: string; id?: string } | null): string {
  if (hospital?.color && hospital.color.trim() !== "") {
    return hospital.color;
  }
  const str = hospital?.name || hospital?.id || "hospital";
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % HOSPITAL_COLORS.length;
  return HOSPITAL_COLORS[index];
}

/**
 * Human-readable payment model summaries
 */
export function getPaymentModelSummary(hospital: Hospital): string {
  switch (hospital.paymentModel) {
    case "fixed":
      return `Fixed rate • ${hospital.fixedRate || 0} EGP`;
    case "per_patient":
      return `Per patient • ${hospital.perPatientRate || 0} EGP/case`;
    case "mixed":
      return `Mixed • ${hospital.fixedRate || 0} EGP + ${hospital.perPatientRate || 0}/case`;
    case "detailed":
      return hospital.fixedSalary
        ? `Detailed • Base ${hospital.fixedSalary} EGP`
        : "Detailed items";
    case "government":
      return hospital.fixedSalary
        ? `Government • ${hospital.fixedSalary} EGP/mo`
        : "Government / Miri";
    default:
      return "Standard";
  }
}

export interface HospitalDetails {
  id: string;
  name: string;
  color: string;
  paymentModel: PaymentModel;
  fixedSalary: number;
  fixedRate: number;
  perPatientRate: number;
  isDeleted: boolean;
}

/**
 * Resolves hospital configuration details (name, color, payment model, rates)
 * from either active hospitals list or dynamically from shift notes snapshots / fields
 * if the hospital has been deleted.
 */
export function getHospitalDetails(
  hospitalId: string,
  hospitals: Hospital[],
  allShifts: Shift[]
): HospitalDetails {
  const h = hospitals.find((hosp) => hosp.id === hospitalId);
  if (h) {
    return {
      id: h.id,
      name: h.name,
      color: getHospitalColor(h),
      paymentModel: h.paymentModel,
      fixedSalary: h.fixedSalary || 0,
      fixedRate: h.fixedRate || 0,
      perPatientRate: h.perPatientRate || 0,
      isDeleted: false,
    };
  }

  // Hospital is deleted, recover from snapshots in allShifts
  const hospShifts = allShifts.filter((s) => s.hospitalId === hospitalId);
  
  let name = "Deleted Hospital";
  let color = "#94a3b8";
  let paymentModel: PaymentModel = "fixed";
  let fixedSalary = 0;
  let fixedRate = 0;
  let perPatientRate = 0;

  // Try to parse from notes snapshots
  for (const s of hospShifts) {
    if (s.notes) {
      const matchName = s.notes.match(/\[HospitalName:\s*([^\]]+)\s*\]/i);
      if (matchName) name = matchName[1].trim();

      const matchColor = s.notes.match(/\[HospitalColor:\s*([^\]]+)\s*\]/i);
      if (matchColor) color = matchColor[1].trim();

      const matchModel = s.notes.match(/\[StoredPaymentModel:\s*([^\]]+)\s*\]/i);
      if (matchModel) {
        paymentModel = matchModel[1].trim() as PaymentModel;
      } else {
        // Fallback checks
        if (s.notes.includes("[Nabatya: true]")) {
          paymentModel = "government";
        }
      }

      const matchSalary = s.notes.match(/\[StoredFixedSalary:\s*([0-9.]+)\s*\]/i);
      if (matchSalary) fixedSalary = parseFloat(matchSalary[1]);

      const matchRate = s.notes.match(/\[StoredFixedRate:\s*([0-9.]+)\s*\]/i);
      if (matchRate) fixedRate = parseFloat(matchRate[1]);
    }

    // Fallback to shift fields if they are present and > 0
    if (s.storedFixedSalary && s.storedFixedSalary > 0) {
      fixedSalary = s.storedFixedSalary;
    }
    if (s.storedFixedRate && s.storedFixedRate > 0) {
      fixedRate = s.storedFixedRate;
    }
    if (s.storedPerPatientRate && s.storedPerPatientRate > 0) {
      perPatientRate = s.storedPerPatientRate;
    }
  }

  // If we couldn't find a model but it has storedFixedSalary > 0, it might be government or detailed
  if (paymentModel === "fixed") {
    // If it has Nabatya shifts, it's government
    const hasNabatya = hospShifts.some(s => s.notes?.includes("[Nabatya: true]"));
    if (hasNabatya) {
      paymentModel = "government";
    } else if (hospShifts.some(s => s.storedFixedSalary && s.storedFixedSalary > 0 && s.totalEarnings === 0)) {
      paymentModel = "government";
    }
  }

  return {
    id: hospitalId,
    name,
    color,
    paymentModel,
    fixedSalary,
    fixedRate,
    perPatientRate,
    isDeleted: true,
  };
}

/**
 * Calculates total fixed monthly salaries for government hospitals (both active and deleted)
 * logged during the specified list of shifts. A hospital's salary is counted exactly once
 * per calendar month in which shifts were worked.
 */
export function calculateFixedSalariesForShifts(
  shiftsInPeriod: Shift[],
  hospitals: Hospital[],
  allShifts: Shift[]
): number {
  const shiftsByHospital: Record<string, Shift[]> = {};
  shiftsInPeriod.forEach((s) => {
    if (!shiftsByHospital[s.hospitalId]) {
      shiftsByHospital[s.hospitalId] = [];
    }
    shiftsByHospital[s.hospitalId].push(s);
  });

  let totalSalaries = 0;

  Object.entries(shiftsByHospital).forEach(([hId, hospShifts]) => {
    const uniqueMonths = new Set<string>();
    hospShifts.forEach((s) => {
      const date = new Date(s.date);
      uniqueMonths.add(`${date.getFullYear()}-${date.getMonth()}`);
    });

    const details = getHospitalDetails(hId, hospitals, allShifts);
    if (details.paymentModel === "government" && details.fixedSalary > 0) {
      totalSalaries += uniqueMonths.size * details.fixedSalary;
    }
  });

  return totalSalaries;
}
