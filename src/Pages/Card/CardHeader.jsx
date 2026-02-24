import React from "react";
import { Trash2, Clock, Save } from "lucide-react";

export default function CardHeader({
  orderItems,
  orderType,
  handleClearAllItems,
  handleViewPendingOrders,
  onSaveAsPending,
  isLoading,
  t,
}) {
  return (
    <div className="flex-shrink-0 pb-3">
      {/* Row: All 3 buttons side by side, equal size */}
      <div className="flex gap-2">
        {/* Pending Orders */}
        <button
          onClick={handleViewPendingOrders}
          className="flex-1 flex flex-col items-center justify-center gap-1.5 bg-[#D4860B] hover:bg-[#c07a09] active:scale-95 text-white font-bold py-3 px-1 rounded-xl transition-all duration-150 shadow-md aspect-square max-h-[80px]"
        >
          <Clock size={20} strokeWidth={2.5} />
          <span className="uppercase text-[10px] leading-tight text-center tracking-wide">
            {t("PendingOrders")}
          </span>
        </button>

        {/* Save as Pending — only for take_away */}
        {orderType === "take_away" && (
          <button
            onClick={onSaveAsPending}
            disabled={isLoading || orderItems.length === 0}
            className="flex-1 flex flex-col items-center justify-center gap-1.5 bg-[#E0440E] hover:bg-[#c93c0c] active:scale-95 disabled:opacity-40 text-white font-bold py-3 px-1 rounded-xl transition-all duration-150 shadow-md aspect-square max-h-[80px]"
          >
            <Save size={20} strokeWidth={2.5} />
            <span className="uppercase text-[10px] leading-tight text-center tracking-wide">
              {t("SaveasPending")}
            </span>
          </button>
        )}

        {/* Clear All Items */}
        <button
          onClick={handleClearAllItems}
          disabled={isLoading || orderItems.length === 0}
          className="flex-1 flex flex-col items-center justify-center gap-1.5 bg-purple-600 hover:bg-purple-700 active:scale-95 disabled:opacity-40 text-white font-bold py-3 px-1 rounded-xl transition-all duration-150 shadow-md aspect-square max-h-[80px] relative"
        >
          <Trash2 size={20} strokeWidth={2.5} />
          <span className="uppercase text-[10px] leading-tight text-center tracking-wide">
            {t("ClearAllItems")}
          </span>
          {orderItems.length > 0 && (
            <span className="absolute top-1.5 right-1.5 bg-white text-purple-600 text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {orderItems.length}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
