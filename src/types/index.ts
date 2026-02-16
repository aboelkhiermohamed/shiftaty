export type PaymentModel = "fixed" | "per_patient" | "mixed" | "detailed";

export interface Hospital {
  id: string;
  name: string;
  paymentModel: PaymentModel;
  fixedRate: number; // Amount per shift (Used for 'fixed' and 'mixed')
  perPatientRate: number; // Amount per patient/case (Used for 'per_patient' and 'mixed')

  // New fields for "detailed" model
  fixedSalary?: number; // Base pay per shift
  itemRates?: {
    id: string;
    name: string;
    rate: number;
  }[];

  color?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Shift {
  id: string;
  hospitalId: string;
  date: Date;
  startTime: string;
  endTime: string;
  casesCount: number;
  proceduresCount: number;
  includesOutpatient: boolean;
  notes?: string;
  customRate?: number; // Override hospital default rate

  // New fields for "detailed" model
  itemCounts?: Record<string, number>; // Maps itemRate.id to count

  totalEarnings: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MonthlyStats {
  totalShifts: number;
  totalPatients: number;
  totalIncome: number;
  incomeByHospital: {
    hospitalId: string;
    hospitalName: string;
    income: number;
    shifts: number;
    color?: string;
  }[];
}

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}
