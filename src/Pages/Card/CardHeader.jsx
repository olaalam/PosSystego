import React from "react";
import { Button } from "@/components/ui/button";

export default function CardHeader({
  orderItems,
  handleClearAllItems,
  handleViewOrders,
  handleViewPendingOrders,
  isLoading,
  t,
}) {
  return (
    <div className="flex-shrink-0">
      {/* Title */}
      <h2 className="text-bg-primary text-3xl font-bold mb-6">
        {t("OrderDetails")}
      </h2>

      {/* Buttons Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
        {/* Clear Items */}
        <Button
          onClick={handleClearAllItems}
          className="bg-bg-primary text-white hover:bg-purple-700 text-sm flex items-center justify-center px-6 py-4 w-full md:h-12"
          disabled={isLoading || orderItems.length === 0}
        >
          {t("ClearAllItems")} ({orderItems.length || 0})
        </Button>



        {/* Pending Orders */}
        <Button
          onClick={handleViewPendingOrders}
          className="bg-teal-600 text-white hover:bg-teal-500 text-sm px-6 py-4 w-full md:h-12"
        >
          {t("PendingOrders")}
        </Button>

        {/* Optional: Apply Offer */}
        {/* 
        <Button
          onClick={onShowOfferModal}
          className="bg-green-600 text-white hover:bg-green-700 text-sm px-6 py-4 w-full md:h-12"
          disabled={isLoading}
        >
          {t("ApplyOffer")}
        </Button>
        */}
      </div>
    </div>
  );
}
