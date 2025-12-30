import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";
import { useAppStore } from "@/stores/appStore";
import { useMemo } from "react";

interface IncomeBreakdownProps {
  month: Date;
}

export function IncomeBreakdown({ month }: IncomeBreakdownProps) {
  const hospitals = useAppStore((state) => state.hospitals);
  const shifts = useAppStore((state) => state.shifts);

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
          (sum, s) => sum + s.totalEarnings,
          0
        );
        return {
          name: hospital.name,
          value: income,
          color: hospital.color || "#3b82f6",
          shifts: hospitalShifts.length,
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

      <div className="h-48">
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

      <div className="mt-4 space-y-2">
        {data.map((item, index) => (
          <motion.div
            key={item.name}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + index * 0.05 }}
            className="flex items-center justify-between text-sm"
          >
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-foreground">{item.name}</span>
              <span className="text-muted-foreground">({item.shifts} shifts)</span>
            </div>
            <div className="text-right">
              <span className="font-medium text-foreground">
                {item.value.toLocaleString()} EGP
              </span>
              <span className="text-muted-foreground ml-2">
                ({((item.value / totalIncome) * 100).toFixed(0)}%)
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
