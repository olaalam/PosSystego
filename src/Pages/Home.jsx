import React, { useState, useEffect, useCallback, useMemo } from "react";
import TakeAway from "./TakeAway";
import OrderPage from "./OrderPage";
import { usePost } from "@/Hooks/usePost";
import { useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next"; 

const getInitialState = () => {
  const storedOrderType = sessionStorage.getItem("order_type") || "take_away";
  const storedTab = sessionStorage.getItem("tab") || storedOrderType;
  const storedTableId = sessionStorage.getItem("table_id") || null;
  const transferSourceTableId = sessionStorage.getItem("transfer_source_table_id") || null;
  const transferCartIds = JSON.parse(sessionStorage.getItem("transfer_cart_ids")) || null;
  const isTransferring = !!(transferSourceTableId && transferCartIds && transferCartIds.length > 0);

  return {
    tabValue: storedTab,
    orderType: storedOrderType,
    tableId: storedTableId,
    isTransferring,
    transferSourceTableId,
    transferCartIds,
  };
};



export default function Home() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const location = useLocation();
  const [state, setState] = useState(getInitialState);

  const initialState = useMemo(() => getInitialState(), [location.key]);
  
  useEffect(() => {
    setState((prevState) => {
      const newState = { ...prevState, ...initialState };
      return newState.tabValue === prevState.tabValue ? prevState : newState;
    });
  }, [initialState]);

  useEffect(() => {
    const { state: locationState } = location;
    
    if (locationState?.repeatedOrder && locationState?.tabValue === "take_away") {
      const storedCart = sessionStorage.getItem("cart");
      if (storedCart) {
        console.log("🔄 Loading repeated order cart:", JSON.parse(storedCart));
      }
      
      setState((prevState) => ({
        ...prevState,
        orderType: "take_away",
        tabValue: "take_away",
      }));
      return;
    }
    

  }, [location]);

  const { postData, loading: transferLoading } = usePost();

  const fetchDiscount = useCallback(async () => {
    const cachedDiscount = sessionStorage.getItem("discount_data");
    if (cachedDiscount) return;

    try {
      const branch_id = sessionStorage.getItem("branch_id") || "4";
const response = await postData("cashier/discount_module", {
      branch_id: branch_id,
      type: "web", // هنا بنبعت type: web زي ما عاوزة
    });      console.log("Discount API Response:", response);
      const discountData = {
        discount: response?.discount || 0,
        module: response?.module || [],
      };
      sessionStorage.setItem("discount_data", JSON.stringify(discountData));
    } catch (error) {
      console.error("Error fetching discount:", error);
      toast.error(t("Failedtofetchdiscountdata"));
      sessionStorage.setItem("discount_data", JSON.stringify({ discount: 0, module: [] }));
    }
  }, [postData, t]);

  useEffect(() => {
    fetchDiscount();
  }, [fetchDiscount]);




  console.log("Home Component State:", state);


  return (
    <div className="min-h-screen bg-white flex flex-col items-center">
      {/* عرض المحتوى بناءً على الـ tab الحالي */}
      {state.tabValue === "take_away" && (
        <TakeAway orderType={state.orderType} />
      )}


    </div>
  );
}