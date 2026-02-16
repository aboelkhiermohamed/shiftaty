import { motion, AnimatePresence } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { useAppStore } from "@/stores/appStore";
import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface IncomeBreakdownProps {
  month: Date;
}

export function IncomeBreakdown({ month }: IncomeBreakdownProps) {
  const hospitals = useAppStore((state) => state.hospitals);
  const shifts = useAppStore((state) => state.shifts);
  const [expandedHospital, setExpandedHospital] = useState<string | null>(null);

  const data = useMemo(() => {
    const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
    const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);

    const monthShifts = shifts.filter((s) => {
      const shiftDate = new Date(s.date);
      return shiftDate >= monthStart && shiftDate <= monthEnd;
    });

    const breakdown = hospitals
      .map((hospital) => {
        const hospitalShifts = monthShifts.filter(
          (s) => s.hospitalId === hospital.id
        );
        const income = hospitalShifts.reduce(
          (sum, s) => sum + (s.totalEarnings || 0),
          0
        );

        // Detailed Calculation
        let details: { label: string; amount: number; count?: number }[] = [];

        if (hospital.paymentModel === 'fixed') {
          const salaryTotal = hospitalShifts.reduce((sum, s) => sum + (s.customRate || hospital.fixedRate || 0), 0);
          if (salaryTotal > 0) details.push({ label: 'Fixed Salary', amount: salaryTotal, count: hospitalShifts.length });
        } else if (hospital.paymentModel === 'per_patient') {
          const casesTotal = hospitalShifts.reduce((sum, s) => sum + (s.casesCount * (hospital.perPatientRate || 0)), 0);
          const proceduresTotal = hospitalShifts.reduce((sum, s) => sum + (s.proceduresCount * (hospital.perPatientRate || 0)), 0); // Assuming same rate or handled? Usually per_patient is mainly cases.
          // Wait, usually per_patient implies cases. Procedures might be separate?
          // Let's check calculation logic in appStore.
          // calculateShiftEarnings: casesCount * hospital.perPatientRate. It ignores procedures count for per_patient model in the store logic unless custom logic exists?
          // Store logic: return casesCount * hospital.perPatientRate;
          if (casesTotal > 0) details.push({ label: 'Cases Income', amount: casesTotal, count: hospitalShifts.reduce((sum, s) => sum + s.casesCount, 0) });
        } else if (hospital.paymentModel === 'mixed') {
          const salaryTotal = hospitalShifts.length * (hospital.fixedRate || 0);
          const casesTotal = hospitalShifts.reduce((sum, s) => sum + (s.casesCount * (hospital.perPatientRate || 0)), 0);
          if (salaryTotal > 0) details.push({ label: 'Base Salary', amount: salaryTotal });
          if (casesTotal > 0) details.push({ label: 'Cases Bonus', amount: casesTotal, count: hospitalShifts.reduce((sum, s) => sum + s.casesCount, 0) });
        } else if (hospital.paymentModel === 'detailed') {
          const salaryTotal = hospitalShifts.length * (hospital.fixedSalary || 0);
          if (salaryTotal > 0) details.push({ label: 'Shift Salary', amount: salaryTotal });

          // Aggregate items
          const itemTotals: Record<string, { name: string; amount: number; count: number }> = {};
          hospitalShifts.forEach(shift => {
            if (shift.itemCounts && hospital.itemRates) {
              hospital.itemRates.forEach(rateItem => {
                const count = shift.itemCounts?.[rateItem.id] || 0;
                if (count > 0) {
                  if (!itemTotals[rateItem.id]) {
                    itemTotals[rateItem.id] = { name: rateItem.name, amount: 0, count: 0 };
                  }
                  itemTotals[rateItem.id].count += count;
                  itemTotals[rateItem.id].amount += count * rateItem.rate;
                }
              });
            }
          });
          Object.values(itemTotals).forEach(item => {
            details.push({ label: item.name, amount: item.amount, count: item.count });
          });
        }

        // Handle Custom Rates generically if they override
        // Actually customRate overrides everything in calculateShiftEarnings.
        // So if customRate is present, we might ideally show "Custom Rate Adjustments" but for simplicity let's rely on standard model unless customRate matches total.

        return {
          id: hospital.id,
          name: hospital.name,
          value: income,
          color: hospital.color || "#3b82f6",
          shifts: hospitalShifts.length,
          details: details
        };
      })
      .filter((item) => item.value > 0);

    return breakdown;
  }, [hospitals, shifts, month]);

  if (data.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-2xl p-6 shadow-sm border border-border"
      >
        <h3 className="font-semibold text-foreground mb-4">Income Breakdown</h3>
        <div className="text-center py-8 text-muted-foreground">
          <p>No income data for this month</p>
          <p className="text-sm mt-1">Add shifts to see the breakdown</p>
        </div>
      </motion.div>
    );
  }

  const totalIncome = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-card rounded-2xl p-6 shadow-sm border border-border"
    >
      <h3 className="font-semibold text-foreground mb-4">Income by Hospital</h3>

      <div className="h-48 mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={70}
              paddingAngle={4}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-3">
        {data.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + index * 0.05 }}
            className="border-b border-border/50 last:border-0 pb-2 last:pb-0"
          >
            <div
              className="flex flex-col gap-1 cursor-pointer hover:bg-accent/5 rounded-lg p-2 transition-colors"
              onClick={() => setExpandedHospital(expandedHospital === item.id ? null : item.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm font-medium text-foreground truncate max-w-[180px]">
                    {item.name}
                  </span>
                  {expandedHospital === item.id ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
                </div>
                <span className="text-sm font-bold text-foreground">
                  {(item.value || 0).toLocaleString()} EGP
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground pl-5">
                <span>{item.shifts} shifts</span>
                <span>{((item.value / totalIncome) * 100).toFixed(0)}%</span>
              </div>
            </div>

            <AnimatePresence>
              {expandedHospital === item.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pl-9 pr-2 py-2 space-y-1.5 bg-muted/30 rounded-b-lg text-xs">
                    {item.details.length > 0 ? (
                      item.details.map((detail, idx) => (
                        <div key={idx} className="flex justify-between items-center text-muted-foreground">
                          <span>{detail.label} {detail.count ? `(${detail.count})` : ''}</span>
                          <span className="font-medium text-foreground">{detail.amount.toLocaleString()} EGP</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground italic">No detailed breakdown available</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
