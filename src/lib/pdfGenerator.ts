import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { Hospital, Shift } from "@/types";
import { UserProfile } from "@/stores/appStore";
import { amiriFontBase64 } from "./fonts/amiriFont";
import { getHospitalDetails, calculateFixedSalariesForShifts } from "./hospitalUtils";


export interface GenerateReportParams {
    profile: UserProfile;
    startDate: Date;
    endDate: Date;
    shifts: Shift[];
    hospitals: Hospital[];
}

const loadArabicFont = (doc: jsPDF) => {
    try {
        doc.addFileToVFS("Amiri-Regular.ttf", amiriFontBase64);
        doc.addFont("Amiri-Regular.ttf", "Amiri", "normal");
        doc.setFont("Amiri");
    } catch (error) {
        console.error("Could not load Arabic font", error);
    }
};

export const generateMonthlyReport = ({
    profile,
    startDate,
    endDate,
    shifts,
    hospitals,
}: GenerateReportParams): Promise<string> => {
    return new Promise((resolve) => {
        const doc = new jsPDF();
        loadArabicFont(doc);
        const pageWidth = doc.internal.pageSize.width;

        // --- Header ---
        doc.setFontSize(22);
        doc.setTextColor(40, 40, 40);
        doc.text("Shiftaty", pageWidth / 2, 20, { align: "center" });

        doc.setFontSize(16);
        doc.setTextColor(60, 60, 60);
        doc.text("Monthly Report", pageWidth / 2, 30, { align: "center" });

        // --- Doctor Info ---
        doc.setFontSize(12);
        doc.setTextColor(80, 80, 80);
        doc.text(`Doctor: ${profile.name}`, 14, 45);
        doc.text(`Title: ${profile.title}`, 14, 52);

        const periodStr = format(startDate, "dd MMM yyyy") === format(endDate, "dd MMM yyyy")
            ? format(startDate, "dd MMM yyyy")
            : `${format(startDate, "dd MMM yyyy")} - ${format(endDate, "dd MMM yyyy")}`;
        doc.text(`Period: ${periodStr}`, 14, 59);

        doc.text(
            `Date Generated: ${format(new Date(), "dd MMM yyyy, HH:mm")}`,
            pageWidth - 14,
            45,
            { align: "right" }
        );

        // --- Stats Calculation ---
        const totalShifts = shifts.length;
        const totalPatients = shifts.reduce((sum, s) => sum + s.casesCount, 0);
        
        const totalIncome = shifts.reduce((sum, s) => sum + s.totalEarnings, 0) +
            calculateFixedSalariesForShifts(shifts, hospitals, shifts);

        // --- Stats Summary ---
        doc.setFillColor(245, 247, 250);
        doc.roundedRect(14, 65, pageWidth - 28, 25, 3, 3, "F");

        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text("Total Shifts", 30, 73, { align: "center" });
        doc.text("Total Patients", pageWidth / 2, 73, { align: "center" });
        doc.text("Total Income", pageWidth - 30, 73, { align: "center" });

        doc.setFontSize(14);
        doc.setTextColor(40, 40, 40);
        doc.setFont("helvetica", "bold");
        doc.text(totalShifts.toString(), 30, 83, { align: "center" });
        doc.text(totalPatients.toString(), pageWidth / 2, 83, { align: "center" });
        doc.text(`${totalIncome.toLocaleString()} EGP`, pageWidth - 30, 83, { align: "center" });
        doc.setFont("helvetica", "normal");

        // --- Hospital Breakdown ---
        const hospitalStatsMap = new Map<string, { id: string, name: string, shiftsCount: number, earnings: number }>();
        shifts.forEach(s => {
            const details = getHospitalDetails(s.hospitalId, hospitals, shifts);
            const name = details.name;

            const existing = hospitalStatsMap.get(s.hospitalId) || { id: s.hospitalId, name, shiftsCount: 0, earnings: 0 };
            existing.shiftsCount += 1;
            existing.earnings += s.totalEarnings;
            hospitalStatsMap.set(s.hospitalId, existing);
        });
        
        // Add government monthly fixed salaries to hospital stats map
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

        const hospitalTableData = hospitalStats.map(h => [
            h.name,
            h.shiftsCount.toString(),
            `${h.earnings.toLocaleString()} EGP`
        ]);

        if (doc.getNumberOfPages() > 0) {
            doc.setFont("Amiri"); // Ensure font is set before table
        }

        autoTable(doc, {
            startY: 100,
            head: [["Hospital", "Shifts", "Income"]],
            body: hospitalTableData,
            theme: "grid",
            styles: { font: "Amiri", fontStyle: "normal" }, // Use Arabic font
            headStyles: { fillColor: [59, 130, 246] }, // Blue header
        });

        const nextY = (doc as any).lastAutoTable.finalY + 15;

        // --- Table Data ---
        const sortedShifts = [...shifts].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const tableData = sortedShifts.map((s) => {
            const hospital = hospitals.find((h) => h.id === s.hospitalId);
            const timeStr = (s.startTime && s.endTime) ? `${s.startTime} - ${s.endTime}` : "-";

            let detailsArr: string[] = [];
            if (s.includesOutpatient) detailsArr.push("Outpatient");

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

            if (hospital?.paymentModel === "government") {
                detailsArr.push(isNabatya ? "Nabatya Shift (نباطشية)" : "Normal Shift (عادي)");
            }

            if (cleanNotes) detailsArr.push(`Notes: ${cleanNotes}`);

            if (hospital?.paymentModel === 'detailed' && s.itemCounts) {
                const items = Object.entries(s.itemCounts)
                    .map(([itemId, count]) => {
                        const itemRate = hospital.itemRates?.find(ir => ir.id === itemId);
                        if (itemRate && count > 0) return `${itemRate.name} x${count}`;
                        return null;
                    })
                    .filter(Boolean);
                if (items.length > 0) {
                    detailsArr.push(`Items: ${items.join(', ')}`);
                }
            }

            const detailsStr = detailsArr.length > 0 ? detailsArr.join('\n') : "-";

            return [
                format(new Date(s.date), "dd MMM"),
                hospital?.name || snapshotHospitalName || "Unknown Hospital",
                timeStr,
                s.casesCount.toString(),
                s.proceduresCount?.toString() || "0",
                `${s.totalEarnings.toLocaleString()} EGP`,
                detailsStr
            ];
        });

        // --- Shifts Table ---
        autoTable(doc, {
            startY: nextY,
            head: [["Date", "Hospital", "Time", "Patients", "Procedures", "Income", "Details"]],
            body: tableData,
            theme: "grid",
            styles: { font: "Amiri", fontStyle: "normal", cellPadding: 2 }, // Use Arabic font
            headStyles: { fillColor: [59, 130, 246] }, // Blue header
            foot: [["Total", "", "", totalPatients.toString(), shifts.reduce((sum, s) => sum + (s.proceduresCount || 0), 0).toString(), `${totalIncome.toLocaleString()} EGP`, ""]],
            footStyles: { fillColor: [240, 240, 240], textColor: [40, 40, 40], fontStyle: "bold" },
            rowPageBreak: 'avoid',
            showFoot: 'lastPage',
        });

        // --- Footer ---
        const finalY = (doc as any).lastAutoTable.finalY + 10;
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text("Generated by Shiftaty App", pageWidth / 2, finalY, {
            align: "center",
        });

        // Return Base64 string (without prefix for Capacitor)
        const base64 = doc.output("datauristring").split(",")[1];
        resolve(base64);
    });
};
