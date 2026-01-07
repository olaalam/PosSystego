// src/Pages/EndShiftReportModal.jsx
import React, { useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  FaMoneyBillWave,
  FaClock,
  FaShoppingCart,
  FaReceipt,
  FaCheckCircle,
  FaPrint
} from "react-icons/fa";

// ─── ترويسة موحدة لأقسام التقرير ───
const SectionHeader = ({ icon: Icon, title }) => (
  <h3 className="font-bold text-lg flex items-center gap-2 mb-4 text-gray-800 border-b pb-2 border-gray-200">
    <Icon className="text-xl text-gray-600" />
    {title}
  </h3>
);

// ─── بطاقة إحصائية مبسطة ───
const CompactStatCard = ({ icon: Icon, title, value }) => (
  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
    <div className="p-2 rounded-full bg-gray-100">
      <Icon className="text-xl text-gray-600" />
    </div>
    <div>
      <p className="text-xs text-gray-500">{title}</p>
      <p className="font-semibold text-gray-800">{value}</p>
    </div>
  </div>
);

// ─── مكون تقرير الطباعة المنفصل ───
const PrintableReport = React.forwardRef(({ reportData, t, formatAmount, isArabic }, ref) => {
  const apiData = reportData?.data || reportData;
  const message = apiData?.message || "";
  const shift = apiData?.shift || {};
  const financialSummary = apiData?.report?.financialSummary || {};
  const ordersSummary = apiData?.report?.ordersSummary || {};
  const expenses = apiData?.report?.expenses || { rows: [], total: 0 };

  // استخراج الحسابات المالية من accounts array (ديناميكيًا)
  const financial_accounts = (financialSummary.accounts || [])
    .filter(acc => (acc.salesAmount || 0) > 0)
    .map(acc => ({
      financial_id: acc.account_id || acc.name,
      financial_name: acc.name === "cash" ? t("Cash") : acc.name.charAt(0).toUpperCase() + acc.name.slice(1).replace("_", " "),
      total_amount: acc.salesAmount || 0,
    }));

  const totalSales = financialSummary.totals?.totalSales || 0;
  const totalExpenses = financialSummary.totals?.totalExpenses || expenses.total || 0;
  const netCashInDrawer = financialSummary.totals?.netCashInDrawer || totalSales - totalExpenses;
  const expenses_list = expenses.rows || [];
  const total_orders = ordersSummary.totalOrders || 0;

  // مدة الشيفت (إذا كان مفتوحًا → "إلى الآن")
  const shiftStart = shift.start_time ? new Date(shift.start_time).toLocaleTimeString(isArabic ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' }) : "";
  const shiftEnd = shift.end_time 
    ? new Date(shift.end_time).toLocaleTimeString(isArabic ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })
    : t("Now") || "الآن";

  return (
    <div ref={ref} className="print-report-container" style={{ display: 'none' }}>
      <style>
        {`
        @media print {
          @page { size: A4; margin: 10mm; }
          * { box-sizing: border-box; -webkit-print-color-adjust: exact; color-adjust: exact; }
          html, body {
            width: 100% !important; margin: 0 !important; padding: 0 !important;
            font-family: 'Tahoma', 'Arial', sans-serif; font-size: 11px; line-height: 1.5;
            direction: ${isArabic ? "rtl" : "ltr"}; background: white !important; color: black !important;
          }
          .print-wrapper { width: 100% !important; padding: 5mm !important; }
          .print-table { width: 100% !important; border-collapse: collapse; margin: 8px 0 !important; font-size: 10px; }
          .print-table th, .print-table td { border: 1px solid #333 !important; padding: 6px 8px !important; text-align: ${isArabic ? 'right' : 'left'} !important; }
          .print-table th { background: white !important; color: black !important; font-weight: bold; text-align: center !important; border: 2px solid #333 !important; }
          .print-table tbody tr:last-child { background: white !important; color: black !important; font-weight: bold; border: 2px solid #333 !important; }
          .print-table tbody tr:last-child td { border: 2px solid #333 !important; }
          .print-section { margin: 10px 0 !important; page-break-inside: avoid; }
          .print-section-title { background: white !important; color: black !important; padding: 6px 8px !important; text-align: center; font-weight: bold; font-size: 12px; margin-bottom: 8px !important; border: 2px solid #333 !important; text-transform: uppercase; }
          .print-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 10px; border-bottom: 1px dashed #999; }
          .print-divider { border-top: 2px solid #333 !important; margin: 8px 0 !important; }
          .print-total-box { background: white !important; color: black !important; padding: 12px !important; text-align: center; margin: 12px 0 !important; page-break-inside: avoid; border: 3px solid #333 !important; }
          .print-total-value { font-size: 20px !important; font-weight: bold; color: black !important; }
          .print-header { text-align: center; padding: 8px 0; border-bottom: 2px solid #333; margin-bottom: 10px; }
          .print-title { font-size: 18px; font-weight: bold; color: black !important; }
          .print-footer { border-top: 2px solid #333; padding-top: 10px; margin-top: 15px; text-align: center; font-size: 9px; color: black !important; }
          .print-expense-table { width: 100%; border-collapse: collapse; margin: 8px 0; }
          .print-expense-table th, .print-expense-table td { border: 1px solid #333; padding: 6px; text-align: center; background: white !important; color: black !important; }
          .print-expense-table th { font-weight: bold; border: 2px solid #333 !important; }
          .print-expense-total { background: white !important; color: black !important; font-weight: bold; border: 2px solid #333 !important; }
          .print-expense-total td { border: 2px solid #333 !important; }
          * { opacity: 1 !important; }
        }
        `}
      </style>
      <div className="print-wrapper">
        {/* Header */}
        <div className="print-header">
          <div className="print-title">📋 {t("EndShiftReport")} {message.includes("preview") ? `(${t("Preview")})` : ""}</div>
          <div style={{ fontSize: '10px', marginTop: '4px' }}>
            {new Date().toLocaleDateString(isArabic ? 'ar-EG' : 'en-US')} - {new Date().toLocaleTimeString(isArabic ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        {/* Shift Info */}
        {shift.start_time && (
          <div className="print-section">
            <div className="print-section-title">📊 {t("ShiftInfo")}</div>
            <div className="print-row">
              <span>{t("ShiftDuration")}:</span>
              <strong>{t("From")} {shiftStart} {t("To")} {shiftEnd}</strong>
            </div>
            <div className="print-row">
              <span>{t("TotalOrders")}:</span>
              <strong>{total_orders}</strong>
            </div>
          </div>
        )}

        {/* Financial Summary */}
        <div className="print-section">
          <div className="print-section-title">💰 {t("FinancialSummary")}</div>
          {financial_accounts.map((acc) => (
            <div key={acc.financial_id} style={{ marginBottom: '8px', border: '1px solid #333', padding: '6px' }}>
              <div className="print-row" style={{ fontWeight: 'bold' }}>
                <span>{acc.financial_name}</span>
                <span>{formatAmount(acc.total_amount)}</span>
              </div>
            </div>
          ))}
          <div className="print-divider" />
          <div className="print-row" style={{ fontSize: '12px', fontWeight: 'bold' }}>
            <span>{t("TotalCashInShift")}</span>
            <span>{formatAmount(totalSales)}</span>
          </div>
        </div>

        {/* Expenses */}
        {expenses_list.length > 0 && (
          <div className="print-section">
            <div className="print-section-title">📝 {t("Expenses")}</div>
            <table className="print-expense-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{t("Description")}</th>
                  <th>{t("Amount")}</th>
                </tr>
              </thead>
              <tbody>
                {expenses_list.map((exp, idx) => (
                  <tr key={idx}>
                    <td>{idx + 1}</td>
                    <td>{exp.description || "Expense"}</td>
                    <td>-{formatAmount(exp.amount || exp.total, "")}</td>
                  </tr>
                ))}
                <tr className="print-expense-total">
                  <td colSpan="2">{t("TotalExpenses")}</td>
                  <td>-{formatAmount(totalExpenses)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Net Cash */}
        <div className="print-total-box">
          <div style={{ fontSize: '11px', marginBottom: '6px' }}>✅ {t("NetCashInDrawer")}</div>
          <div className="print-total-value">{formatAmount(netCashInDrawer)}</div>
          <div style={{ fontSize: '9px', marginTop: '4px', opacity: 0.8 }}>
            ({t("TotalCashInShift")} - {t("TotalExpenses")})
          </div>
        </div>

        {/* Footer */}
        <div className="print-footer">
          <div>━━━━━━━━━━━━━━━━━━━━</div>
          <div style={{ margin: '4px 0' }}>🙏 {t("ThankYou") || "شكراً لكم"}</div>
          <div>{t("PowepurpleBy") || "Powepurple by POS"}</div>
        </div>
      </div>
    </div>
  );
});
PrintableReport.displayName = 'PrintableReport';

// ─── المكون الرئيسي ───
export default function EndShiftReportModal({ reportData, onClose, onConfirmClose }) {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const printRef = useRef(null);

  const apiData = reportData?.data || reportData;
  const message = apiData?.message || "";
  const shift = apiData?.shift || {};
  const financialSummary = apiData?.report?.financialSummary || {};
  const ordersSummary = apiData?.report?.ordersSummary || {};
  const expenses = apiData?.report?.expenses || { rows: [], total: 0 };

  // استخراج الحسابات المالية من accounts array (ديناميكيًا)
  const financial_accounts = (financialSummary.accounts || [])
    .filter(acc => (acc.salesAmount || 0) > 0)
    .map(acc => ({
      financial_id: acc.account_id || acc.name,
      financial_name: acc.name === "cash" ? t("Cash") : acc.name.charAt(0).toUpperCase() + acc.name.slice(1).replace("_", " "),
      total_amount: acc.salesAmount || 0,
    }));

  const totalSales = financialSummary.totals?.totalSales || 0;
  const totalExpenses = financialSummary.totals?.totalExpenses || expenses.total || 0;
  const netCashInDrawer = financialSummary.totals?.netCashInDrawer || totalSales - totalExpenses;
  const expenses_list = expenses.rows || [];
  const total_orders = ordersSummary.totalOrders || 0;

  // مدة الشيفت
  const shiftStart = shift.start_time ? new Date(shift.start_time).toLocaleTimeString(isArabic ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' }) : "";
  const shiftEnd = shift.end_time 
    ? new Date(shift.end_time).toLocaleTimeString(isArabic ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })
    : t("Now") || "الآن";

  const formatAmount = (amount, currency = t("EGP")) => {
    return `${(amount || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${currency}`;
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank', 'width=350,height=600');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="${isArabic ? 'rtl' : 'ltr'}">
      <head>
        <meta charset="UTF-8">
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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-2">
      <div
        className="bg-white rounded-lg shadow-xl max-w-xl w-full max-h-[95vh] overflow-y-auto transform transition-all duration-300"
        dir={isArabic ? "rtl" : "ltr"}
      >
        <div className="p-6">
          {/* العنوان وزر الطباعة */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              {t("EndShiftReport")} {message.includes("preview") ? `(${t("Preview")})` : ""}
            </h2>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
            >
              <FaPrint className="text-lg" />
              <span className="text-sm font-medium">{t("Print") || "طباعة"}</span>
            </button>
          </div>

          {/* معلومات الشيفت */}
          {shift.start_time && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
              <CompactStatCard 
                icon={FaClock} 
                title={t("ShiftDuration")} 
                value={`${t("From")} ${shiftStart} ${t("To")} ${shiftEnd}`} 
              />
              <CompactStatCard icon={FaShoppingCart} title={t("TotalOrders")} value={total_orders} />
            </div>
          )}

          {/* الحسابات المالية */}
          <div className="space-y-4 mb-6 pt-4 border-t border-gray-100">
            <SectionHeader icon={FaMoneyBillWave} title={t("FinancialSummary")} />
            <div className="space-y-4">
              {financial_accounts.length > 0 ? (
                financial_accounts.map((acc) => (
                  <div
                    key={acc.financial_id}
                    className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm"
                  >
                    <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-full shadow">
                          <FaMoneyBillWave className="text-lg text-green-600" />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-800">{acc.financial_name}</h4>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-gray-800">
                          {formatAmount(acc.total_amount)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-4">{t("NoSalesYet") || "لا توجد مبيعات بعد"}</p>
              )}
            </div>

            {/* إجمالي المبيعات */}
            <div className="mt-6 pt-4 border-t-2 border-gray-300">
              <div className="flex justify-between items-center p-4 bg-gray-900 text-white rounded-lg text-lg font-bold">
                <span>{t("TotalCashInShift")}</span>
                <span className="text-2xl">{formatAmount(totalSales)}</span>
              </div>
            </div>
          </div>

          {/* المصروفات */}
          {expenses_list.length > 0 && (
            <div className="mb-8">
              <SectionHeader icon={FaReceipt} title={`${t("Expenses")} (${expenses_list.length})`} />
              <div className="overflow-x-auto rounded-xl border border-gray-300 shadow-sm">
                <table className="min-w-full bg-white text-sm">
                  <thead className="bg-gray-100 border-b border-gray-300">
                    <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:font-semibold [&>th]:uppercase text-xs text-gray-700">
                      <th className="text-center w-16">#</th>
                      <th className="text-center">{t("Description")}</th>
                      <th className="text-center">{t("Amount")} ({t("EGP")})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {expenses_list.map((exp, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors duration-150 [&>td]:px-4 [&>td]:py-3">
                        <td className="text-center text-gray-700">{idx + 1}</td>
                        <td className="text-center font-medium text-gray-800">
                          {exp.description || exp.financial_account || "Expense"}
                        </td>
                        <td className="text-center font-bold text-purple-600">
                          -{formatAmount(exp.amount || exp.total, "")}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gray-800 text-white font-semibold">
                      <td colSpan={2} className="px-4 py-3 text-center text-base">
                        {t("TotalExpenses")}
                      </td>
                      <td className="px-4 py-3 text-center text-lg font-bold">
                        -{formatAmount(totalExpenses)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* صافي النقدية في الدرج */}
          <div className="p-5 bg-gray-800 text-white rounded-lg text-center shadow-lg border border-gray-700">
            <FaCheckCircle className="text-3xl mx-auto mb-2 text-white opacity-90" />
            <p className="text-lg font-semibold mb-2">{t("NetCashInDrawer")}</p>
            <p className="text-4xl font-black">
              {formatAmount(netCashInDrawer)}
            </p>
            <p className="text-xs opacity-80 mt-1">
              ({t("TotalCashInShift")} - {t("TotalExpenses")})
            </p>
          </div>

          {/* الأزرار */}
          <div className="flex gap-3 mt-8 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition text-sm"
            >
              {t("Cancel")}
            </button>
            <button
              onClick={onConfirmClose}
              className="flex-1 py-2.5 bg-gray-800 text-white rounded-lg font-semibold hover:bg-gray-700 transition text-sm"
            >
              {t("ConfirmCloseShift")}
            </button>
          </div>
        </div>
      </div>

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