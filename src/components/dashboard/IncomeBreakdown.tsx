import { memo, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from "recharts";
import { useAppStore } from "@/stores/appStore";
import { getHospitalDetails } from "@/lib/hospitalUtils";

interface IncomeBreakdownProps {
  month: Date;
  isPrivacyMode?: boolean;
}

export const IncomeBreakdown = memo(function IncomeBreakdown({ month, isPrivacyMode = false }: IncomeBreakdownProps) {
  const hospitals = useAppStore((state) => state.hospitals);
  const shifts = useAppStore((state) => state.shifts);
  const chartType = useAppStore((state) => state.chartType);
  const [expandedHospital, setExpandedHospital] = useState<string | null>(null);

  const data = useMemo(() => {
    const monthStart = new Date(month.getFullYear(), month.getMonth(), 1, 0, 0, 0, 0);
    const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59, 999);

    const monthShifts = shifts.filter((s) => {
      const shiftDate = new Date(s.date);
      return shiftDate >= monthStart && shiftDate <= monthEnd;
    });

    const uniqueHospitalIds = Array.from(
      new Set(monthShifts.map((s) => s.hospitalId))
    );

    const breakdown = uniqueHospitalIds
      .map((hId) => {
        const hospitalShifts = monthShifts.filter((s) => s.hospitalId === hId);
        const detailsObj = getHospitalDetails(hId, hospitals, shifts);
        
        let income = hospitalShifts.reduce(
          (sum, s) => sum + (s.totalEarnings || 0),
          0
        );

        let details: { label: string; amount: number; count?: number }[] = [];
        const name = detailsObj.name;
        const color = detailsObj.color;

        if (detailsObj.paymentModel === "government" && detailsObj.fixedSalary) {
          income += detailsObj.fixedSalary;
        }

        // Detailed Calculation
        if (detailsObj.paymentModel === "fixed") {
          const salaryTotal = hospitalShifts.reduce(
            (sum, s) => sum + (s.totalEarnings || 0),
            0
          );
          if (salaryTotal > 0)
            details.push({
              label: "Fixed Salary",
              amount: salaryTotal,
              count: hospitalShifts.length,
            });
        } else if (detailsObj.paymentModel === "per_patient") {
          const casesTotal = hospitalShifts.reduce(
            (sum, s) => sum + (s.totalEarnings || 0),
            0
          );
          if (casesTotal > 0)
            details.push({
              label: "Cases Income",
              amount: casesTotal,
              count: hospitalShifts.reduce((sum, s) => sum + s.casesCount, 0),
            });
        } else if (detailsObj.paymentModel === "mixed") {
          let salaryTotal = 0;
          let casesTotal = 0;

          hospitalShifts.forEach((s) => {
            const fRate = s.storedFixedRate !== undefined ? s.storedFixedRate : detailsObj.fixedRate;
            const pRate = s.storedPerPatientRate !== undefined ? s.storedPerPatientRate : detailsObj.perPatientRate;
            
            let mult = 1;
            let multType = 'total';
            if (s.notes) {
              const match = s.notes.match(/\[Multiplier:\s*([0-9.]+)\s*x\s*\((Total|Base)\)\]/i);
              if (match) {
                mult = parseFloat(match[1]);
                multType = match[2].toLowerCase();
              }
            }

            const basePart = fRate;
            const casesPart = s.casesCount * pRate;

            if (multType === 'base') {
              salaryTotal += basePart * mult;
              casesTotal += casesPart;
            } else {
              salaryTotal += basePart * mult;
              casesTotal += casesPart * mult;
            }
          });

          if (salaryTotal > 0)
            details.push({ label: "Base Salary", amount: salaryTotal });
          if (casesTotal > 0)
            details.push({
              label: "Cases Bonus",
              amount: casesTotal,
              count: hospitalShifts.reduce((sum, s) => sum + s.casesCount, 0),
            });
        } else if (detailsObj.paymentModel === "detailed") {
          let salaryTotal = 0;
          const itemTotals: Record<
            string,
            { name: string; amount: number; count: number }
          > = {};

          hospitalShifts.forEach((s) => {
            const fSalary = s.storedFixedSalary !== undefined ? s.storedFixedSalary : detailsObj.fixedSalary;
            
            let mult = 1;
            let multType = 'total';
            if (s.notes) {
              const match = s.notes.match(/\[Multiplier:\s*([0-9.]+)\s*x\s*\((Total|Base)\)\]/i);
              if (match) {
                mult = parseFloat(match[1]);
                multType = match[2].toLowerCase();
              }
            }

            salaryTotal += fSalary * mult;
          });

          if (salaryTotal > 0)
            details.push({ label: "Shift Salary", amount: salaryTotal });

          const activeH = hospitals.find(h => h.id === hId);
          if (activeH && activeH.itemRates) {
            hospitalShifts.forEach((s) => {
              if (s.itemCounts) {
                activeH.itemRates?.forEach((rateItem) => {
                  const count = s.itemCounts?.[rateItem.id] || 0;
                  if (count > 0) {
                    if (!itemTotals[rateItem.id]) {
                      itemTotals[rateItem.id] = {
                        name: rateItem.name,
                        amount: 0,
                        count: 0,
                      };
                    }
                    itemTotals[rateItem.id].count += count;
                    
                    const itemRate = rateItem.rate;
                    let mult = 1;
                    if (s.notes) {
                      const match = s.notes.match(/\[Multiplier:\s*([0-9.]+)\s*x\s*\((Total|Base)\)\]/i);
                      if (match) mult = parseFloat(match[1]);
                    }
                    const itemAmount = count * itemRate * mult;
                    itemTotals[rateItem.id].amount += itemAmount;
                  }
                });
              }
            });

            Object.values(itemTotals).forEach((item) => {
              details.push({
                label: item.name,
                amount: item.amount,
                count: item.count,
              });
            });
          }
        } else if (detailsObj.paymentModel === "government") {
          if (detailsObj.fixedSalary && detailsObj.fixedSalary > 0 && hospitalShifts.length > 0) {
            details.push({
              label: "Fixed Monthly Salary (المرتب الحكومي)",
              amount: detailsObj.fixedSalary,
            });
          }
          const nabatyaShifts = hospitalShifts.filter((s) => s.notes?.includes("[Nabatya: true]"));
          const nabatyaTotal = nabatyaShifts.reduce((sum, s) => sum + (s.totalEarnings || 0), 0);
          if (nabatyaTotal > 0) {
            details.push({
              label: "Nabatya Allowance (بدل نوبتجيات)",
              amount: nabatyaTotal,
              count: nabatyaShifts.length,
            });
          }
        }

        if (detailsObj.isDeleted) {
          details.push({
            label: "Hospital Deleted (مستشفى محذوفة)",
            amount: 0,
          });
        }

        return {
          id: hId,
          name: name,
          value: income,
          color: color,
          shifts: hospitalShifts.length,
          details: details,
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
        <h3 className="font-semibold text-foreground mb-4">
          MONTHLY BREAKDOWN
        </h3>
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="bg-card rounded-2xl p-4 sm:p-5 shadow-sm border border-border"
    >
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3.5">
        MONTHLY BREAKDOWN
      </h3>

      <div className="flex items-center gap-4">
        {/* Left Side: Chart */}
        {chartType !== "list" && (
          <div className="relative w-24 h-24 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "bar" ? (
                <BarChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <Bar 
                    dataKey="value" 
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={false}
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                  <XAxis dataKey="name" hide />
                  <YAxis hide />
                </BarChart>
              ) : (
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={chartType === "donut" ? 32 : 0}
                    outerRadius={48}
                    paddingAngle={chartType === "donut" ? 4 : 0}
                    dataKey="value"
                    stroke="none"
                    isAnimationActive={false}
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              )}
            </ResponsiveContainer>
            {(chartType === "pie" || chartType === "donut") && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-base font-bold text-foreground leading-none">
                  {isPrivacyMode ? "***" : totalIncome.toLocaleString()}
                </span>
                <span className="text-[10px] text-muted-foreground font-medium mt-1">
                  EGP
                </span>
              </div>
            )}
          </div>
        )}

        {/* Right Side: List */}
        <div className="flex-1 space-y-4">
          {data.map((item) => (
            <div
              key={item.id}
              className="flex flex-col"
            >
              <div
                className="flex items-start w-full cursor-pointer group"
                onClick={() =>
                  setExpandedHospital(
                    expandedHospital === item.id ? null : item.id
                  )
                }
              >
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm font-bold text-slate-900 dark:text-white/90 truncate leading-tight">
                      {item.name}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 dark:text-white/50 font-medium pl-4.5">
                    {item.shifts} shift{item.shifts !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="flex flex-col items-end shrink-0 ml-2">
                  <span className="text-[13px] font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                    {isPrivacyMode ? "***" : (item.value || 0).toLocaleString()} <span className="text-[10px] font-bold opacity-60">EGP</span>
                  </span>
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
                    <div className="pl-4.5 pr-2 pt-2 space-y-1.5 text-xs">
                      {item.details.length > 0 ? (
                        item.details.map((detail, idx) => (
                          <div
                            key={idx}
                            className="flex justify-between items-center text-muted-foreground"
                          >
                            <span>
                              {detail.label}{" "}
                              {detail.count ? `(${detail.count})` : ""}
                            </span>
                            <span className="font-medium text-foreground/80">
                              {isPrivacyMode ? "***" : detail.amount > 0 ? `${detail.amount.toLocaleString()} EGP` : "-"}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-muted-foreground/70 italic">
                          No detailed breakdown available
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
});
