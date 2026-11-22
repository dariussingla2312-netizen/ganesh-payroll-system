import React from 'react';
import { Download, Printer, Share2, Building2 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Modal } from './Modal';
import {
  Employee,
  LabourMonthlyCalculation,
  StaffMonthlyCalculation,
  GlobalSettings,
} from '../../types';
import {
  formatINR,
  formatMonthName,
  maskAadhaar,
  formatDateDDMMYYYY,
} from '../../utils/payrollCalculator';
import { useTheme } from '../../context/ThemeContext';

interface PayslipModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee;
  month: string; // YYYY-MM
  labourCalc?: LabourMonthlyCalculation;
  staffCalc?: StaffMonthlyCalculation;
  settings: GlobalSettings;
}

export const PayslipModal: React.FC<PayslipModalProps> = ({
  isOpen,
  onClose,
  employee,
  month,
  labourCalc,
  staffCalc,
  settings,
}) => {
  const { language, t } = useTheme();

  const isLabour = employee.type === 'labour';
  const monthFormatted = formatMonthName(month, language);

  const gross = isLabour ? labourCalc?.grossSalary || 0 : staffCalc?.monthlySalary || 0;
  const leaveDeduction = staffCalc?.leaveDeduction || 0;
  const advanceDeduction = isLabour
    ? labourCalc?.advancesDeducted || 0
    : staffCalc?.advancesDeducted || 0;
  const carryForward = isLabour
    ? labourCalc?.carryForwardToNextMonth || 0
    : staffCalc?.carryForwardToNextMonth || 0;
  const netPayable = isLabour ? labourCalc?.netPayable || 0 : staffCalc?.netPayable || 0;

  // Generate and download PDF
  const handleDownloadPDF = () => {
    const doc = new jsPDF();

    // Company Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(settings.companyName || 'M/S GANESH AGRO', 105, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    if (settings.companyAddress) {
      doc.text(settings.companyAddress, 105, 26, { align: 'center' });
    }
    const contactDetails = [
      settings.companyPhone ? `Phone: ${settings.companyPhone}` : '',
      `Website: ${settings.companyWebsite || 'www.ganeshagrosangrur.com'}`,
    ].filter(Boolean).join(' | ');
    doc.text(contactDetails, 105, 31, { align: 'center' });

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`PAYSLIP FOR ${monthFormatted.toUpperCase()}`, 105, 42, { align: 'center' });

    // Employee Information Table
    const empInfo = [
      ['Employee Name:', employee.name, 'Category:', isLabour ? 'Labour (Work-based)' : 'Fixed Salary Staff'],
      ['Role / Designation:', employee.designation || 'Labourer', 'Phone:', employee.phone || '-'],
      ['Aadhaar No.:', maskAadhaar(employee.aadhaar), 'Joining Date:', formatDateDDMMYYYY(employee.joiningDate)],
    ];

    autoTable(doc, {
      startY: 48,
      body: empInfo,
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 35 },
        1: { cellWidth: 60 },
        2: { fontStyle: 'bold', cellWidth: 35 },
        3: { cellWidth: 60 },
      },
    });

    let currentY = (doc as any).lastAutoTable.finalY + 8;

    if (isLabour && labourCalc) {
      // Labour breakdown table
      const rows = labourCalc.workTypeBreakdowns.map((wt) => {
        const details =
          wt.payModel === 'piece'
            ? `${wt.quantity} pieces @ Rs.${wt.rate}`
            : `${wt.regularHours}h reg + ${wt.overtimeHours}h OT @ Rs.${wt.rate}/h`;
        return [wt.workTypeName, details, `Rs. ${wt.totalAmount.toFixed(2)}`];
      });

      autoTable(doc, {
        startY: currentY,
        head: [['Work Description', 'Details / Hours', 'Amount (INR)']],
        body: rows,
        theme: 'striped',
        headStyles: { fillColor: [22, 163, 74] },
        styles: { fontSize: 9 },
      });

      currentY = (doc as any).lastAutoTable.finalY + 6;
    } else if (staffCalc) {
      // Staff breakdown
      const staffRows = [
        ['Base Monthly Fixed Salary', `Total Days: ${staffCalc.totalDaysInMonth}`, `Rs. ${staffCalc.monthlySalary.toFixed(2)}`],
        [
          'Leave Deduction',
          `${staffCalc.absentDays} absent, ${staffCalc.halfDays} half-days (${staffCalc.paidLeavesUsed} paid leaves used, ${staffCalc.unpaidLeaves} unpaid)`,
          `- Rs. ${staffCalc.leaveDeduction.toFixed(2)}`,
        ],
      ];

      autoTable(doc, {
        startY: currentY,
        head: [['Earnings / Salary Component', 'Breakdown', 'Amount (INR)']],
        body: staffRows,
        theme: 'striped',
        headStyles: { fillColor: [22, 163, 74] },
        styles: { fontSize: 9 },
      });

      currentY = (doc as any).lastAutoTable.finalY + 6;
    }

    // Deductions & Net summary table
    const summaryRows = [
      ['Gross Earnings', `Rs. ${gross.toFixed(2)}`],
      ['Advances Deducted', `- Rs. ${advanceDeduction.toFixed(2)}`],
    ];

    if (carryForward > 0) {
      summaryRows.push(['Advance Balance Carried Forward', `Rs. ${carryForward.toFixed(2)}`]);
    }

    summaryRows.push(['NET PAYABLE SALARY', `Rs. ${netPayable.toFixed(2)}`]);

    autoTable(doc, {
      startY: currentY,
      body: summaryRows,
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 120 },
        1: { halign: 'right', fontStyle: 'bold', cellWidth: 60 },
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 25;

    // Signatures
    doc.setFontSize(9);
    doc.text('_________________________', 30, currentY);
    doc.text('Employee Signature', 30, currentY + 6);

    doc.text('_________________________', 140, currentY);
    doc.text('Employer / Authorized Signature', 140, currentY + 6);

    doc.save(`Payslip_${employee.name.replace(/\s+/g, '_')}_${month}.pdf`);
  };

  // WhatsApp Share handler
  const handleShareWhatsApp = () => {
    let msg = `*${settings.companyName || 'M/S GANESH AGRO'}*\n`;
    msg += `🌐 ${settings.companyWebsite || 'www.ganeshagrosangrur.com'}\n`;
    msg += `📄 *Payslip for ${monthFormatted}*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `👤 *Worker:* ${employee.name}\n`;
    if (employee.designation) msg += `💼 *Designation:* ${employee.designation}\n`;
    msg += `🆔 *Aadhaar:* ${maskAadhaar(employee.aadhaar)}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;

    if (isLabour && labourCalc) {
      msg += `⏱ *Days Worked:* ${labourCalc.totalDaysWorked} days\n`;
      msg += `🕒 *Regular Hours:* ${labourCalc.totalRegularHours} hrs\n`;
      if (labourCalc.totalOvertimeHours > 0) {
        msg += `🔥 *Overtime:* ${labourCalc.totalOvertimeHours} hrs\n`;
      }
      if (labourCalc.totalPieceQuantity > 0) {
        msg += `📦 *Pieces Done:* ${labourCalc.totalPieceQuantity}\n`;
      }
    } else if (staffCalc) {
      msg += `📅 *Month Days:* ${staffCalc.totalDaysInMonth}\n`;
      msg += `🏖 *Unpaid Leaves:* ${staffCalc.unpaidLeaves} days\n`;
      if (staffCalc.leaveDeduction > 0) {
        msg += `🔻 *Leave Deduction:* ${formatINR(staffCalc.leaveDeduction)}\n`;
      }
    }

    msg += `💵 *Gross Earnings:* ${formatINR(gross)}\n`;
    if (advanceDeduction > 0) {
      msg += `📉 *Advance Deducted:* -${formatINR(advanceDeduction)}\n`;
    }
    if (carryForward > 0) {
      msg += `⚠️ *Carry Forward Advance:* ${formatINR(carryForward)}\n`;
    }
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `💰 *NET PAYABLE:* *${formatINR(netPayable)}*\n\n`;
    msg += `_M/S GANESH AGRO (Sangrur, Punjab) • ${settings.companyWebsite || 'www.ganeshagrosangrur.com'}_`;

    const phoneClean = (employee.phone || '').replace(/\D/g, '');
    const phoneParam = phoneClean.length === 10 ? `91${phoneClean}` : phoneClean;
    const url = phoneParam
      ? `https://wa.me/${phoneParam}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;

    window.open(url, '_blank');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${t('payslip')}: ${employee.name}`} maxWidth="xl">
      <div id="printable-payslip" className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-xl space-y-5">
        {/* Company Header */}
        <div className="text-center border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="inline-flex p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mb-2">
            <Building2 className="w-6 h-6" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
            {settings.companyName || 'M/S GANESH AGRO'}
          </h2>
          {settings.companyAddress && (
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              {settings.companyAddress}
            </p>
          )}
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
            {settings.companyWebsite || 'www.ganeshagrosangrur.com'}
          </p>
          <div className="mt-2 inline-block px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300">
            {t('payslip').toUpperCase()} — {monthFormatted}
          </div>
        </div>

        {/* Employee Summary Card */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs">
          <div>
            <span className="text-slate-400 block">{t('fullName')}:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
              {employee.name}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">{t('phone')}:</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {employee.phone || '-'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">{t('aadhaarNumber')}:</span>
            <span className="font-mono text-slate-700 dark:text-slate-300">
              {maskAadhaar(employee.aadhaar) || '-'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">{t('joiningDate')}:</span>
            <span className="text-slate-700 dark:text-slate-300">
              {formatDateDDMMYYYY(employee.joiningDate)}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">Category:</span>
            <span className="font-medium text-emerald-600 dark:text-emerald-400">
              {isLabour ? 'Labour (Work-based)' : 'Fixed Salary Staff'}
            </span>
          </div>
          {employee.designation && (
            <div>
              <span className="text-slate-400 block">{t('roleDesignation')}:</span>
              <span className="text-slate-700 dark:text-slate-300">{employee.designation}</span>
            </div>
          )}
        </div>

        {/* Work Breakdown Table for Labour */}
        {isLabour && labourCalc && (
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-2.5">Work Type</th>
                  <th className="p-2.5 text-center">Regular</th>
                  <th className="p-2.5 text-center">Overtime</th>
                  <th className="p-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {labourCalc.workTypeBreakdowns.map((wt) => (
                  <tr key={wt.workTypeId} className="text-slate-700 dark:text-slate-300">
                    <td className="p-2.5">
                      <div className="font-medium">{wt.workTypeName}</div>
                      <div className="text-[10px] text-slate-400">
                        {wt.payModel === 'piece' ? `${wt.quantity} pieces @ ₹${wt.rate}` : `Rate: ₹${wt.rate}/h`}
                      </div>
                    </td>
                    <td className="p-2.5 text-center">
                      {wt.payModel === 'piece' ? '-' : `${wt.regularHours}h`}
                    </td>
                    <td className="p-2.5 text-center">
                      {wt.payModel === 'piece' ? '-' : wt.overtimeHours > 0 ? `${wt.overtimeHours}h` : '-'}
                    </td>
                    <td className="p-2.5 text-right font-semibold">
                      {formatINR(wt.totalAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Leave details for Staff */}
        {!isLabour && staffCalc && (
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-2 text-xs">
            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span>Base Fixed Monthly Salary:</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {formatINR(staffCalc.monthlySalary)}
              </span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span>Attendance / Leaves:</span>
              <span>
                {staffCalc.absentDays} Absent, {staffCalc.halfDays} Half Days ({staffCalc.paidLeavesUsed} Paid Leaves)
              </span>
            </div>
            {staffCalc.leaveDeduction > 0 && (
              <div className="flex justify-between text-rose-600 dark:text-rose-400">
                <span>Leave Deduction ({staffCalc.unpaidLeaves} unpaid days @ {formatINR(staffCalc.perDayRate)}/day):</span>
                <span>-{formatINR(staffCalc.leaveDeduction)}</span>
              </div>
            )}
          </div>
        )}

        {/* Financial Calculation Summary */}
        <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl space-y-2 text-sm">
          <div className="flex justify-between text-slate-700 dark:text-slate-300">
            <span>{t('grossSalary')}:</span>
            <span className="font-semibold">{formatINR(gross)}</span>
          </div>

          {advanceDeduction > 0 && (
            <div className="flex justify-between text-rose-600 dark:text-rose-400">
              <span>{t('advancesDeduction')}:</span>
              <span className="font-semibold">-{formatINR(advanceDeduction)}</span>
            </div>
          )}

          {carryForward > 0 && (
            <div className="text-xs text-amber-600 dark:text-amber-400 flex justify-between bg-amber-50 dark:bg-amber-950/40 p-2 rounded-lg">
              <span>Remaining advance carried forward to next month:</span>
              <span className="font-semibold">{formatINR(carryForward)}</span>
            </div>
          )}

          <div className="border-t border-emerald-200 dark:border-emerald-800 pt-2 flex justify-between items-center text-base sm:text-lg font-bold text-emerald-800 dark:text-emerald-300">
            <span>{t('netPayable')}:</span>
            <span className="text-xl text-emerald-600 dark:text-emerald-400">
              {formatINR(netPayable)}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={handleShareWhatsApp}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-xs transition-colors shadow-sm"
          >
            <Share2 className="w-4 h-4" />
            <span>{t('shareWhatsApp')}</span>
          </button>

          <button
            onClick={handleDownloadPDF}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>{t('exportPDF')}</span>
          </button>

          <button
            onClick={() => window.print()}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Print</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
