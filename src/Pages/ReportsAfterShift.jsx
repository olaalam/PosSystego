// src/Pages/EndShiftReportModal.jsx
import React, { useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  FaMoneyBillWave,
  FaClock,
  FaShoppingCart,
  FaReceipt,
  FaCheckCircle,
  FaPrint,
  FaTimes,
  FaArrowDown,
  FaArrowUp
} from "react-icons/fa";

// ─── ترويسة موحدة لأقسام التقرير ───
const SectionHeader = ({ icon: Icon, title }) => (
  <h3 className="font-bold text-lg flex items-center gap-2 mb-4 text-gray-800 border-b pb-2 border-gray-200">
    <Icon className="text-xl text-purple-600" />
    {title}
  </h3>
);

// ─── بطاقة إحصائية مبسطة ───
const CompactStatCard = ({ icon: Icon, title, value, subValue }) => (
  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200 shadow-sm">
    <div className="p-3 rounded-full bg-white shadow-sm text-purple-600">
      <Icon className="text-xl" />
    </div>
    <div>
      <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">{title}</p>
      <p className="font-bold text-gray-800 text-lg">{value}</p>
      {subValue && <p className="text-xs text-gray-400">{subValue}</p>}
    </div>
  </div>
);

// ─── مكون تقرير الطباعة ───
const PrintableReport = React.forwardRef(({ reportData, t, formatAmount, isArabic }, ref) => {
  const apiData = reportData?.data || reportData;
  const message = apiData?.message || "";
  const shift = apiData?.shift || {};

  // استخراج البيانات بناءً على هيكل الـ JSON الجديد
  const report = apiData?.report || {};
  const financialSummary = report.financialSummary || {};
  const accounts = financialSummary.accounts || []; // تفاصيل كل خزنة/طريقة دفع
  const totals = financialSummary.totals || {}; // الإجماليات العامة
  const ordersSummary = report.ordersSummary || {};
  const expensesData = report.expenses || {};
  const expensesList = expensesData.rows || [];

  // التواريخ
  const shiftStart = shift.start_time
    ? new Date(shift.start_time).toLocaleTimeString(isArabic ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })
    : "--:--";
  const shiftEnd = shift.end_time
    ? new Date(shift.end_time).toLocaleTimeString(isArabic ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })
    : t("Now") || "الآن";

  return (
    <div ref={ref} className="print-report-container" style={{ display: 'none' }}>
      <style>
        {`
        @media print {
          @page { size: 80mm auto; margin: 0; }
          body { margin: 0.5cm; font-family: 'Tahoma', sans-serif; font-size: 12px; color: #000; direction: ${isArabic ? "rtl" : "ltr"}; }
          .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
          .title { font-size: 16px; font-weight: bold; margin-bottom: 5px; }
          .subtitle { font-size: 10px; }
          .section { margin-bottom: 15px; }
          .section-title { font-weight: bold; border-bottom: 1px solid #000; margin-bottom: 5px; display: block; font-size: 13px; padding-bottom: 2px; }
          .row { display: flex; justify-content: space-between; margin-bottom: 4px; }
          .table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 5px; }
          .table th { border-bottom: 1px solid #000; text-align: ${isArabic ? 'right' : 'left'}; font-weight: bold; padding: 2px; }
          .table td { border-bottom: 1px dotted #ccc; padding: 3px 2px; }
          .total-box { border-top: 2px dashed #000; border-bottom: 2px dashed #000; padding: 10px 0; margin-top: 10px; font-weight: bold; font-size: 14px; text-align: center; }
          .footer { text-align: center; font-size: 10px; margin-top: 20px; border-top: 1px solid #000; padding-top: 5px; }
          .bold { font-weight: bold; }
        }
        `}
      </style>

      <div className="header">
        <div className="title">{t("EndShiftReport")}</div>
        <div className="subtitle">{message.includes("preview") ? `(${t("Preview")})` : ""}</div>
        <div className="subtitle">{new Date().toLocaleString(isArabic ? 'ar-EG' : 'en-US')}</div>
      </div>

      <div className="section">
        <span className="section-title">{t("ShiftInfo")}</span>
        <div className="row"><span>{t("ShiftID")}:</span> <span>#{shift._id?.slice(-6) || "N/A"}</span></div>
        <div className="row"><span>{t("From")}:</span> <span>{shiftStart}</span></div>
        <div className="row"><span>{t("To")}:</span> <span>{shiftEnd}</span></div>
        <div className="row"><span>{t("TotalOrders")}:</span> <span>{ordersSummary.totalOrders || 0}</span></div>
      </div>

      {/* تفاصيل الحسابات (Financial Breakdown) */}
      <div className="section">
        <span className="section-title">{t("FinancialDetails")}</span>
        <table className="table">
          <thead>
            <tr>
              <th width="30%">{t("Method")}</th>
              <th width="25%">{t("Sales")}</th>
              <th width="20%">{t("Exp.")}</th>
              <th width="25%">{t("Net")}</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((acc, idx) => (
              <tr key={idx}>
                <td>{acc.name === "cash" ? t("Cash") : acc.name}</td>
                <td>{formatAmount(acc.salesAmount, "")}</td>
                <td>{acc.expensesAmount > 0 ? `-${formatAmount(acc.expensesAmount, "")}` : "0"}</td>
                <td className="bold">{formatAmount(acc.net, "")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* المصروفات التفصيلية */}
      {expensesList.length > 0 && (
        <div className="section">
          <span className="section-title">{t("ExpensesList")}</span>
          <table className="table">
            <thead>
              <tr>
                <th>{t("Desc")}</th>
                <th>{t("Acc")}</th>
                <th>{t("Val")}</th>
              </tr>
            </thead>
            <tbody>
              {expensesList.map((exp, idx) => (
                <tr key={idx}>
                  <td>{exp.description}</td>
                  <td>{exp.account?.name}</td>
                  <td>{formatAmount(Math.abs(exp.amount), "")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* الملخص المالي النهائي */}
      <div className="section">
        <div className="row bold">
          <span>{t("TotalSales")}:</span>
          <span>{formatAmount(totals.totalSales)}</span>
        </div>
        <div className="row bold">
          <span>{t("TotalExpenses")}:</span>
          <span>-{formatAmount(totals.totalExpenses)}</span>
        </div>
      </div>

      <div className="total-box">
        <div>{t("NetCashInDrawer")}</div>
        <div style={{ fontSize: "18px", marginTop: "5px" }}>{formatAmount(totals.netCashInDrawer)}</div>
      </div>

      <div className="footer">
        {t("SystemGeneratedReport")}
      </div>
    </div>
  );
});

PrintableReport.displayName = 'PrintableReport';

// ─── المكون الرئيسي (Modal) ───
export default function EndShiftReportModal({ reportData, onClose, onConfirmClose }) {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const printRef = useRef(null);

  // استخراج البيانات من الـ Response
  const apiData = reportData?.data || reportData;
  const message = apiData?.message || "";
  const shift = apiData?.shift || {};
  const report = apiData?.report || {};

  // 1. ملخص الطلبات
  const ordersSummary = report.ordersSummary || { totalOrders: 0 };

  // 2. الملخص المالي (Accounts & Totals)
  const financialSummary = report.financialSummary || {};
  const accounts = financialSummary.accounts || []; // المصفوفة التي تحتوي على cash, visa, etc.
  const totals = financialSummary.totals || { totalSales: 0, totalExpenses: 0, netCashInDrawer: 0 };

  // 3. المصروفات
  const expensesData = report.expenses || {};
  const expensesList = expensesData.rows || [];

  // تنسيق العملة
  const formatAmount = (amount, currency = t("EGP")) => {
    return `${(amount || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${currency}`;
  };

  // توقيتات الشيفت
  const shiftStart = shift.start_time
    ? new Date(shift.start_time).toLocaleTimeString(isArabic ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })
    : "--:--";
  const shiftEnd = shift.end_time
    ? new Date(shift.end_time).toLocaleTimeString(isArabic ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })
    : t("Now");

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank', 'width=400,height=600');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="${isArabic ? 'rtl' : 'ltr'}">
      <head>
        <title>${t("EndShiftReport")}</title>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    };
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" dir={isArabic ? "rtl" : "ltr"}>

        {/* Header */}
        <div className="bg-gray-900 text-white p-5 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <FaReceipt className="text-purple-400" />
              {t("EndShiftReport")}
            </h2>
            <p className="text-xs text-gray-400 mt-1 opacity-80">{message}</p>
          </div>
          {/* <button onClick={onClose} className="text-gray-400 hover:text-white transition">
            <FaTimes size={20} />
          </button> */}
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">

          {/* Shift Info Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <CompactStatCard
              icon={FaClock}
              title={t("ShiftDuration")}
              value={`${shiftStart} - ${shiftEnd}`}
              subValue={new Date().toLocaleDateString()}
            />
            <CompactStatCard
              icon={FaShoppingCart}
              title={t("TotalOrders")}
              value={ordersSummary.totalOrders}
            />
          </div>

          {/* Financial Breakdown Table (حسب الـ JSON) */}
          <div className="mb-6 border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-50 p-3 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-bold text-gray-700 flex items-center gap-2">
                <FaMoneyBillWave className="text-green-600" />
                {t("FinancialDetails")}
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3 text-start">{t("Account")}</th>
                    <th className="px-4 py-3 text-start">{t("Sales")}</th>
                    <th className="px-4 py-3 text-start">{t("Expenses")}</th>
                    <th className="px-4 py-3 text-start">{t("Net")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {accounts.map((acc, index) => (
                    <tr key={index} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {acc.name === "cash" ? t("Cash") : acc.name.toUpperCase()}
                      </td>
                      <td className="px-4 py-3 text-green-600 font-bold">
                        {formatAmount(acc.salesAmount)}
                      </td>
                      <td className="px-4 py-3 text-red-500">
                        {acc.expensesAmount > 0 ? `-${formatAmount(acc.expensesAmount)}` : "-"}
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-900 bg-gray-50">
                        {formatAmount(acc.net)}
                      </td>
                    </tr>
                  ))}

                  {/* Totals Row */}
                  <tr className="bg-gray-800 text-white font-bold">
                    <td className="px-4 py-3">{t("Total")}</td>
                    <td className="px-4 py-3 text-green-300">{formatAmount(totals.totalSales)}</td>
                    <td className="px-4 py-3 text-red-300">-{formatAmount(totals.totalExpenses)}</td>
                    <td className="px-4 py-3 text-white">{formatAmount(totals.netCashInDrawer)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Expenses Detail Section */}
          {expensesList.length > 0 && (
            <div className="mb-6">
              <SectionHeader icon={FaArrowDown} title={t("ExpensesBreakdown")} />
              <div className="space-y-2">
                {expensesList.map((exp, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-red-50 border border-red-100 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-500 text-xs font-bold">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">{exp.description}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          {t("From")}: <span className="font-medium">{exp.account?.name}</span>
                        </p>
                      </div>
                    </div>
                    <span className="font-bold text-red-600">-{formatAmount(Math.abs(exp.amount || 0))}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Final Net Cash Card */}
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl p-6 text-center text-white shadow-lg relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-gray-400 text-sm font-medium uppercase tracking-widest mb-1">{t("NetCashInDrawer")}</p>
              <h1 className="text-4xl font-black tracking-tight">{formatAmount(totals.netCashInDrawer)}</h1>
              <p className="text-xs text-gray-500 mt-2 opacity-70">
                {t("CalculatedFrom")}: {t("TotalSales")} - {t("TotalExpenses")}
              </p>
            </div>
            {/* Background decoration */}
            <FaMoneyBillWave className="absolute -bottom-4 -right-4 text-8xl text-white opacity-5 rotate-12" />
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-gray-100 bg-gray-50 flex gap-4">
          <button
            onClick={handlePrint}
            className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 hover:border-gray-400 transition shadow-sm flex items-center gap-2"
          >
            <FaPrint /> {t("Print")}
          </button>

          <div className="flex-1 flex gap-3">
            {/* <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 rounded-xl font-bold hover:bg-gray-300 transition"
            >
              {t("Cancel")}
            </button> */}
            <button
              onClick={onConfirmClose}
              className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 shadow-lg shadow-purple-200 transition"
            >
              {t("ConfirmCloseShift")}
            </button>
          </div>
        </div>
      </div>

      {/* Hidden Print Component */}
      <PrintableReport
        ref={printRef}
        reportData={reportData}
        t={t}
        formatAmount={formatAmount}
        isArabic={isArabic}
      />
    </div>
  );
}