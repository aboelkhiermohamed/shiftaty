export type PaymentModel = "fixed" | "per_patient" | "mixed";

export interface Hospital {
  id: string;
  name: string;
  paymentModel: PaymentModel;
  fixedRate: number; // Amount per shift
  perPatientRate: number; // Amount per patient/case
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
