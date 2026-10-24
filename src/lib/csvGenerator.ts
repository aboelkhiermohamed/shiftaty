import { format } from "date-fns";
import { GenerateReportParams } from "./pdfGenerator";
import { getHospitalDetails } from "./hospitalUtils";

export const generateCsvReport = ({
    profile,
    startDate,
    endDate,
    shifts,
    hospitals,
}: GenerateReportParams): string => {
    // CSV Header row
    const headers = [
        "Date",
        "Hospital",
        "Start Time",
        "End Time",
        "Cases",
        "Procedures",
        "Includes Outpatient",
        "Income (EGP)",
        "Notes",
        "Payment Items"
    ];

    const rows = [headers.join(",")];

    // CSV Data rows
    const sortedShifts = [...shifts].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    sortedShifts.forEach((s) => {
        const hospital = hospitals.find((h) => h.id === s.hospitalId);

        // Strip metadata tags from notes and parse snapshot hospital name
        let cleanNotes = s.notes || "";
        let snapshotHospitalName = "";
        let isNabatya = false;
        if (s.notes) {
            const matchName = s.notes.match(/\[HospitalName:\s*([^\]]+)\s*\]/i);
            if (matchName) {
                snapshotHospitalName = matchName[1].trim();
                cleanNotes = cleanNotes.replace(/\s*\[HospitalName:\s*[^\]]+\s*\]/gi, "").trim();
            }
            cleanNotes = cleanNotes.replace(/\s*\[HospitalColor:\s*[^\]]+\s*\]/gi, "").trim();
            cleanNotes = cleanNotes.replace(/\s*\[StoredFixedSalary:\s*[^\]]+\s*\]/gi, "").trim();
            cleanNotes = cleanNotes.replace(/\s*\[StoredFixedRate:\s*[^\]]+\s*\]/gi, "").trim();
            cleanNotes = cleanNotes.replace(/\s*\[StoredPaymentModel:\s*[^\]]+\s*\]/gi, "").trim();
            cleanNotes = cleanNotes.replace(/\s*\[Multiplier:\s*[0-9.]+\s*x\s*\((Total|Base)\)\]/gi, "").trim();
            cleanNotes = cleanNotes.replace(/\s*\[CustomFixed:\s*[0-9.]+\s*\]/gi, "").trim();
            if (s.notes.includes("[Nabatya: true]")) {
                isNabatya = true;
                cleanNotes = cleanNotes.replace(/\s*\[Nabatya:\s*true\s*\]/gi, "").trim();
            }
        }

        let itemsStr = "";
        if (hospital?.paymentModel === 'detailed' && s.itemCounts) {
            const items = Object.entries(s.itemCounts)
                .map(([itemId, count]) => {
                    const itemRate = hospital.itemRates?.find(ir => ir.id === itemId);
                    if (itemRate && count > 0) return `${itemRate.name} x${count}`;
                    return null;
                })
                .filter(Boolean);
            if (items.length > 0) {
                itemsStr = items.join(', ');
            }
        } else if (hospital?.paymentModel === 'government') {
            itemsStr = isNabatya ? "Nabatya Shift (نباطشية)" : "Normal Shift (عادي)";
        }

        const rowData = [
            format(new Date(s.date), "yyyy-MM-dd"),
            `"${hospital?.name || snapshotHospitalName || "Unknown"}"`,
            s.startTime || "-",
            s.endTime || "-",
            s.casesCount.toString(),
            s.proceduresCount?.toString() || "0",
            s.includesOutpatient ? "Yes" : "No",
            s.totalEarnings.toString(),
            `"${cleanNotes.replace(/"/g, '""')}"`,
            `"${itemsStr}"`
        ];

        rows.push(rowData.join(","));
    });

    // Add empty row
    rows.push("");

    // Add Hospital Breakdown Summary
    rows.push("Hospital Summary");
    rows.push("Hospital,Shifts,Total Income (EGP)");

    const hospitalStatsMap = new Map<string, { id: string, name: string, shiftsCount: number, earnings: number }>();
    shifts.forEach(s => {
        const details = getHospitalDetails(s.hospitalId, hospitals, shifts);
        const name = details.name;

        const existing = hospitalStatsMap.get(s.hospitalId) || { id: s.hospitalId, name, shiftsCount: 0, earnings: 0 };
        existing.shiftsCount += 1;
        existing.earnings += s.totalEarnings;
        hospitalStatsMap.set(s.hospitalId, existing);
    });

    // Add government monthly fixed salaries to hospital summary
    hospitalStatsMap.forEach((stat) => {
        const details = getHospitalDetails(stat.id, hospitals, shifts);
        if (details.paymentModel === "government" && details.fixedSalary > 0) {
            const uniqueMonths = new Set<string>();
            shifts.filter(s => s.hospitalId === stat.id).forEach(s => {
                const date = new Date(s.date);
                uniqueMonths.add(`${date.getFullYear()}-${date.getMonth()}`);
            });
            stat.earnings += uniqueMonths.size * details.fixedSalary;
        }
    });

    const hospitalStats = Array.from(hospitalStatsMap.values());

    hospitalStats.forEach(h => {
        rows.push(`"${h.name}",${h.shiftsCount},${h.earnings}`);
    });

    // Generate string with UTF-8 BOM for Excel support
    const csvContent = "\uFEFF" + rows.join("\n");
    return csvContent;
};
