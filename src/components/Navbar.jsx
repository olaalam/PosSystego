// Navbar.js - النسخة الكاملة المحدثة والنهائية مع Combobox
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { usePut } from "@/Hooks/usePut";
import { useShift } from "@/context/ShiftContext";
import { toast } from "react-toastify";
import {
  FaUserCircle,
  FaUsers,
  FaListAlt,
  FaDollarSign,
} from "react-icons/fa";
import { useTranslation } from "react-i18next";
// Shadcn UI components for Tabs
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
// Shadcn UI components for Combobox (Searchable Select)
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils"; // يُفترض وجود هذا الملف لدمج الـ utility classes
import { Check, ChevronsUpDown } from "lucide-react"; // أيقونات
// -------------------------------------------------------------------
import axios from "axios";
import { usePost } from "@/Hooks/usePost";
// المودالز الجديدة
import ExpensesModal from "@/Pages/ExpensesModal";
import PasswordConfirmModal from "@/Pages/PasswordConfirmModal";
import EndShiftReportModal from "@/Pages/ReportsAfterShift";
import Notifications from "@/components/Notifications";
import { useGet } from "@/Hooks/useGet";
import AddCustomer from "@/Pages/Customer/AddCustomer";
import logo from "@/assets/logo.png";

// ===============================================
// 🚀 المكون الجديد: Combobox للبحث في العملاء (مُخصص)
// ===============================================

function CustomerSearchCombobox({ customers, selectedCustomer, onSelect, t }) {
  const [open, setOpen] = useState(false);
  const selectedCustomerObj = customers.find(
    (customer) => customer._id === selectedCustomer
  );

  // دالة مخصصة لفلترة العملاء بناءً على البحث (الاسم أو رقم الهاتف)
  const filterCustomers = (searchValue, customer) => {
    // توحيد النص للبحث
    const normalizedSearch = searchValue.toLowerCase();
    const customerName = (customer.name || "").toLowerCase();
    const customerPhone = (customer.phone_number || "").toLowerCase();

    // البحث في الاسم أو رقم الهاتف
    if (customerName.includes(normalizedSearch) || customerPhone.includes(normalizedSearch)) {
      return 1; // تطابق (احتفاظ بالنتيجة)
    }
    return 0; // لا يوجد تطابق
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[200px] justify-between h-auto py-1 px-3 text-sm"
        >
          {selectedCustomerObj
            ? selectedCustomerObj.name +
              (selectedCustomerObj.phone_number ? ` (${selectedCustomerObj.phone_number})` : "")
            : t("Select Customer")}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0">
        {/* تحديد دالة filter المخصصة للبحث في أكثر من حقل */}
        <Command filter={filterCustomers}>
          <CommandInput placeholder={t("Search customer...")} />
          <CommandEmpty>{t("No customer found")}.</CommandEmpty>
          <CommandGroup className="max-h-[200px] overflow-y-auto">
            {customers.map((customer) => (
              <CommandItem
                key={customer._id}
                // تعيين قيمة البحث لتشمل الاسم ورقم الهاتف
                value={`${customer.name} ${customer.phone_number}`} 
                onSelect={(currentValue) => {
                  
                  // عند الاختيار، يجب العثور على الـ ID الصحيح للعميل
                  const selectedId = customer._id; // طريقة أسهل وأكثر موثوقية: استخدام ID العنصر الذي تم النقر عليه
                  
                  onSelect(selectedId);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    selectedCustomer === customer._id ? "opacity-100" : "opacity-0"
                  )}
                />
                <div className="flex flex-col items-start">
                    <span>{customer.name}</span>
                    {customer.phone_number && <span className="text-xs text-gray-500">{customer.phone_number}</span>}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}


// ===============================================
// 🏠 المكون الرئيسي: Navbar
// ===============================================

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isShiftOpen, shiftStartTime, closeShift } = useShift();
  const [currentTime, setCurrentTime] = useState(new Date());
  const { t, i18n } = useTranslation();
  const [language, setLanguage] = useState(
    localStorage.getItem("language") || "en"
  );
  const [loading, setLoading] = useState(false);

  // حالات المودالز الجديدة
  const [showExpensesModal, setShowExpensesModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [endShiftReport, setEndShiftReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const { postData } = usePost();
  const { putData } = usePut();
  const currentTab = sessionStorage.getItem("tab") || "take_away";
  const isArabic = i18n.language === "ar";
  
  // ✅ تصحيح مسار استخراج العملاء
  const { data: selections } = useGet("api/admin/pos-home/selections");
  const customers = selections?.data?.customers || []; 

  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(
    sessionStorage.getItem("selected_customer_id") || ""
  );

  useEffect(() => {
    if (isShiftOpen) {
      const timer = setInterval(() => setCurrentTime(new Date()), 1000);
      return () => clearInterval(timer);
    }
  }, [isShiftOpen]);

  const toggleLanguage = () => {
    const newLang = language === "en" ? "ar" : "en";
    i18n.changeLanguage(newLang);
    setLanguage(newLang);
    localStorage.setItem("language", newLang);
    document.documentElement.dir = newLang === "ar" ? "rtl" : "ltr";
  };

  const formatElapsedTime = () => {
    const start = shiftStartTime || sessionStorage.getItem("shift_start_time");
    if (!start) return "00:00:00";
    const elapsed = Math.floor((currentTime - new Date(start)) / 1000);
    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    const seconds = elapsed % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleTabChange = (value) => {
    sessionStorage.setItem("tab", value);
    sessionStorage.setItem("order_type", value);

    if (value === "take_away") {
      sessionStorage.removeItem("table_id");
      sessionStorage.removeItem("delivery_user_id");
      navigate("/", { replace: true });
    } else if (value === "dine_in") {
      sessionStorage.removeItem("delivery_user_id");
      navigate("/", { replace: true });
    } else if (value === "delivery") {
      sessionStorage.removeItem("table_id");
      navigate("/", { replace: true });
    } else if (value === "online-order") {
      navigate("/online-orders", { replace: true });
    }
  };

  const handleDueUsers = () => navigate("/due");
  const handleAllOrders = () => navigate("/all-orders");
  const handleExpenses = () => setShowExpensesModal(true);

  // ===== إغلاق الشيفت بكل الخطوات =====
  const handleCloseShift = () => {
    if (!isShiftOpen) {
      toast.error(t("No active shift found"));
      return;
    }
    setShowPasswordModal(true);
  };

  const handlePasswordConfirmed = async (password) => {
    setShowPasswordModal(false);
    setReportLoading(true);

    try {
      const token = sessionStorage.getItem("token");
      const baseUrl = import.meta.env.VITE_API_BASE_URL;

      // API واحدة بتعمل كل حاجة: تحقق الباسورد + تجيب التقرير
      const response = await axios.post(
        `${baseUrl}api/admin/cashier-shift/end/`,
        { password },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // الـ API دي لازم ترجع التقرير جاهز
      setEndShiftReport(response.data); // response.data يحتوي على reportData
      setShowReportModal(true);
    } catch (err) {
      const msg =
        err.response?.data?.message || t("Invalid password or error occurred");
      toast.error(msg);
    } finally {
      setReportLoading(false);
    }
  };

  const handleClose = async () => {
    // ⚠️ ملاحظة: تم إزالة setLoading(true) / setLoading(false) لأن usePut يديرها داخلياً.
    
    try {
        const endpoint = `api/admin/cashier-shift/end`;

        // ✅ استدعاء API لقفل الـ shift باستخدام putData
        await putData(endpoint, {}); 

        // ✅ تحديث الـ context
        closeShift();

        // ✅ مسح بيانات الـ shift من sessionStorage
        sessionStorage.removeItem("shift_start_time");
        sessionStorage.removeItem("shift_data");
        sessionStorage.clear(); 

        // ✅ عرض رسالة النجاح
        toast.success(t("ShiftClosedSuccessfully"));

        // ✅ الانتقال لصفحة تسجيل الدخول
        navigate("/login");
    } catch (err) {
        // 🛑 معالجة الأخطاء - الـ Hook يرمي الخطأ (throw err)
        console.error("Close shift error:", err);
        // نعرض رسالة الخطأ للمستخدم
        toast.error(err?.response?.data?.message || t("FailedToCloseShift"));
    } 
  };


  const handleLogout = async () => {
    try {
        await postData("api/admin/cashier-shift/logout", {});
        sessionStorage.clear();
        toast.success(t("Logged out successfully"));
        navigate("/login");
    } catch (err) {
      toast.error(err?.message || t("Error while logging out"));
    }
  };
  
  // 🛑 تم حذف دالة CustomerModal المكررة لأنك تستخدم AddCustomer المستورد

  return (
    <>
      <div className="text-gray-800 px-4 py-5 md:px-6 mb-6 w-full z-50 bg-white shadow-md">
        <div className="flex items-center justify-between gap-4">
          {/* الجزء الأيسر */}
          <div className="flex items-center gap-2">
            {location.pathname !== "/shift" &&
              location.pathname !== "/cashier" && (
                <button
                  onClick={() => navigate(-1)}
                  className="font-bold text-center px-1 pb-1 hover:bg-purple-200 cursor-pointer hover:text-gray-800 rounded bg-bg-primary text-3xl text-white transition-colors duration-200"
                  title="Go back"
                >
                  ←
                </button>
              )}

            <button
              onClick={() => navigate("/profile")}
              className="text-gray-600 hover:text-bg-primary"
            >
              <FaUserCircle className="text-2xl md:text-3xl" />
            </button>

            <button
              onClick={handleDueUsers}
              className="text-gray-600 hover:text-bg-primary"
            >
              <FaUsers className="text-2xl md:text-3xl" />
            </button>

            <button
              onClick={handleAllOrders}
              className="text-gray-600 hover:text-bg-primary"
              title={t("AllOrders")}
            >
              <FaListAlt className="text-2xl md:text-3xl" />
            </button>

            <button
              onClick={handleExpenses}
              className="text-bg-secondary hover:text-teal-800"
              title="Add Expense"
            >
              <FaDollarSign className="text-2xl md:text-3xl" />
            </button>
            
            {/* ✅ استبدال SELECT CUSTOMER بمكون Combobox (مع البحث) */}
            <CustomerSearchCombobox
                customers={customers}
                selectedCustomer={selectedCustomer}
                onSelect={(id) => {
                    setSelectedCustomer(id);
                    sessionStorage.setItem("selected_customer_id", id);
                }}
                t={t}
            />

            {/* ADD CUSTOMER */}
            <button
              onClick={() => setShowCustomerModal(true)}
              className="px-3 py-1 text-sm  bg-white text-bg-primary border border-bg-primary rounded"
            >
              + {t("Customer")}
            </button>



            <Tabs value={currentTab} onValueChange={handleTabChange}>
              <TabsList className="flex gap-2 bg-transparent p-0 ml-2">
                <TabsTrigger
                  value="online-order"
                  className="px-3 py-1 text-sm font-semibold bg-white text-bg-primary border border-bg-primary data-[state=active]:bg-bg-primary data-[state=active]:text-white transition-colors duration-200"
                >
                  {t("OnlineOrders")}
                </TabsTrigger>
                <TabsTrigger
                  value="take_away"
                  className="px-3 py-1 text-sm font-semibold bg-white text-bg-primary border border-bg-primary data-[state=active]:bg-bg-primary data-[state=active]:text-white transition-colors duration-200"
                >
                  {t("take_away")}
                </TabsTrigger>


              </TabsList>
            </Tabs>
          </div>

          {/* اللوجو */}
          <a
            href="https://Food2go.online"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center"
          >
            <img
              src={logo}
              alt="Systego Logo"
              className="h-18 w-18 object-contain cursor-pointer"
            />
          </a>

          {/* الجزء الأيمن */}
          <div className="flex items-center gap-2">
            {location.pathname !== "/shift" &&
              location.pathname !== "/cashier" && (
                <>
                  <div className="flex items-center text-xs md:text-sm font-medium text-gray-600">
                    <span className="text-gray-500 mr-1 hidden sm:inline">
                      {t("shift")}:
                    </span>
                    <span className="bg-gray-100 px-2 py-1 rounded-md text-gray-800 text-xs md:text-sm">
                      {formatElapsedTime()}
                    </span>
                  </div>

                  <button
                    onClick={handleCloseShift}
                    disabled={loading || reportLoading}
                    className="bg-bg-primary text-white px-3 py-1 md:px-4 md:py-2 rounded-md text-xs md:text-sm font-semibold hover:bg-purple-700 disabled:opacity-50 transition"
                  >
                    {loading || reportLoading ? (
                      "..."
                    ) : (
                      <>
                        <span className="hidden md:inline">
                          {t("closeshift")}
                        </span>
                        <span className="md:hidden">{t("Close")}</span>
                      </>
                    )}
                  </button>
                </>
              )}

            {/* تبديل اللغة */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">AR</span>
              <button
                onClick={toggleLanguage}
                className={`relative inline-flex h-6 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  isArabic ? "bg-bg-primary" : "bg-gray-300"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    !isArabic ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </button>
              <span className="text-sm font-medium">EN</span>
            </div>
            <Notifications />

            <button
              onClick={handleLogout}
              className="bg-gray-200 text-gray-800 px-3 py-1 md:px-4 md:py-2 rounded-md text-xs md:text-sm font-semibold hover:bg-gray-300 transition"
            >
              <span className="hidden sm:inline">{t("logout")}</span>
              <span className="sm:hidden">{t("Exit")}</span>
            </button>
          </div>
        </div>
      </div>

      {/* المودالز */}
      {showExpensesModal && (
        <ExpensesModal onClose={() => setShowExpensesModal(false)} />
      )}

      {showPasswordModal && (
        <PasswordConfirmModal
          onConfirm={handlePasswordConfirmed}
          onCancel={handleClose}
          loading={reportLoading}
        />
      )}

      {showReportModal && (
        <EndShiftReportModal
          reportData={endShiftReport}
          onClose={() => setShowReportModal(false)}
          onConfirmClose={handleClose}
        />
      )}
      {showCustomerModal && (
        <AddCustomer onClose={() => setShowCustomerModal(false)} />
      )}



    </>
  );
}