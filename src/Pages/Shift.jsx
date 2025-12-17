import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { useShift } from "@/context/ShiftContext";
import { toast } from "react-toastify";
import Loading from "@/components/Loading";
import { CheckCircle, XCircle, User, ArrowRight } from "lucide-react";
// Temporarily disabled framer-motion for debugging
// import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";

export default function Shift() {
  const [shiftStatus, setShiftStatus] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [loading, setLoading] = useState(false);
  const { openShift, closeShift, isShiftOpen } = useShift();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();

  // 🧠 استرجاع بيانات المستخدم
  const userData = sessionStorage.getItem("user");
  const user = userData && userData !== "undefined" ? JSON.parse(userData) : null;
  const userName = user?.user_name || "Cashier";
  const cashierId = sessionStorage.getItem("cashier_id");

  // ✅ فتح الشيفت (POST)
  const handleOpenShift = async () => {
    const endpoint = `${import.meta.env.VITE_API_BASE_URL}api/admin/cashier-shift/start`;

    try {
      setLoading(true);

      // بناء البيانات المرسلة
      const payload = {};
      if (cashierId) payload.cashier_id = cashierId;

      const token = sessionStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      // ✅ هنا POST لفتح الشيفت
      await axios.post(endpoint, payload, { headers });

      openShift();
      setShiftStatus("Shift is open.");


      // تنظيف الـ URL من ?action
      const params = new URLSearchParams(location.search);
      params.delete("action");
      navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });

      // بدء العد التنازلي للتحويل
      let timeLeft = 3;
      setCountdown(timeLeft);
      const countdownInterval = setInterval(() => {
        timeLeft -= 1;
        setCountdown(timeLeft);
        if (timeLeft <= 0) {
          clearInterval(countdownInterval);
          navigate("/");
        }
      }, 1000);
    } catch (err) {
      console.error("Open shift error:", err);
      toast.error(err?.response?.data?.message || t("FailedToOpenShift"));
    } finally {
      setLoading(false);
    }
  };

  // ✅ غلق الشيفت (GET)
  const handleCloseShiftAction = async () => {
    const endpoint = `${import.meta.env.VITE_API_BASE_URL}api/admin/cashier-shift/end`;

    try {
      setLoading(true);
      const token = sessionStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      // ✅ هنا GET لغلق الشيفت
      await axios.get(endpoint, { headers });

      // ✅ تحديث الـ context
      closeShift();
      
      // ✅ مسح البيانات من sessionStorage
      sessionStorage.removeItem("shift_start_time");
      sessionStorage.removeItem("shift_data");
      
      setShiftStatus("Shift is closed.");
      toast.success(t("ShiftClosedSuccessfully"));

      // ✅ الانتقال للـ home
      setTimeout(() => {
        navigate("/", { replace: true });
      }, 1500);

    } catch (err) {
      console.error("Close shift error:", err);
      toast.error(err?.response?.data?.message || t("FailedToCloseShift"));
    } finally {
      setLoading(false);
    }
  };

  // ✅ تنفيذ الغلق التلقائي في حالة action=close
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const action = params.get("action");
    if (action === "close" && isShiftOpen) {
      handleCloseShiftAction();
    }
  }, [location.search, isShiftOpen]);

  if (loading) return <Loading />;

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">

      <div className="max-w-md w-full m-auto pb-20">
        <div className="text-center mb-6">
          <h1 className="text-2xl text-gray-800">
            {t("WelcomeBack")}, <span className="text-bg-primary font-semibold">{userName}</span>
          </h1>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-6 text-center">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">{t("ShiftStatus")}</h2>
            <p className="text-gray-500 text-sm">
              {isShiftOpen ? t("CurrentlyOnShift") : t("UpForShift")}
            </p>
          </div>

          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 bg-black rounded-full flex items-center justify-center">
              <User className="w-12 h-12 text-white" />
            </div>
          </div>

          {!isShiftOpen && !shiftStatus && (
            <div className="px-6 pb-6">
              <button
                onClick={handleOpenShift}
                className="w-full bg-bg-primary hover:bg-purple-800 text-white font-medium py-4 px-6 rounded-lg flex items-center justify-center gap-3 group transition-all"
              >
                <span>{t("TakeYourShift")}</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
              </button>
            </div>
          )}

          {isShiftOpen && (
            <div className="px-6 pb-6">
              <button
                onClick={() => navigate("/")}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-4 px-6 rounded-lg flex items-center justify-center gap-3 group transition-all"
              >
                <span>{t("BackToWork")}</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
              </button>
            </div>
          )}

          {shiftStatus && (
            <div className="px-6 pb-4 text-center">
              <div
                className={`flex items-center justify-center gap-2 text-lg font-medium ${
                  shiftStatus.includes("open") ? "text-green-600" : "text-bg-primary"
                }`}
              >
                {shiftStatus.includes("open") ? (
                  <CheckCircle className="w-6 h-6" />
                ) : (
                  <XCircle className="w-6 h-6" />
                )}
                {shiftStatus}
              </div>
            </div>
          )}

          {!isShiftOpen && shiftStatus === "Shift is closed." && (
            <div className="px-6 pb-6">
              <button
                onClick={handleOpenShift}
                className="w-full bg-bg-primary hover:bg-purple-800 text-white font-medium py-4 px-6 rounded-lg flex items-center justify-center gap-3 group transition-all"
              >
                <span>{t("OpenNewShift")}</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
              </button>
            </div>
          )}

          {countdown !== null && countdown > 0 && shiftStatus?.includes("open") && (
            <div className="px-6 pb-6 text-center">
              <div className="text-4xl font-bold text-bg-primary">
                {countdown}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}