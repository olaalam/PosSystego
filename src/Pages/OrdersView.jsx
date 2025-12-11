import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useGet } from "@/Hooks/useGet";
import Loading from "@/components/Loading";
import { useTranslation } from "react-i18next";

export default function OrdersView() {
  const { data, error, isLoading } = useGet("api/admin/pos/sales/complete");
  const [search, setSearch] = useState("");
  const { t } = useTranslation();

  if (isLoading) return <Loading />;
  if (error) return <div className="text-red-500 text-center">Error loading data.</div>;

  const orders = data?.sales || [];

  const filteredOrders = orders.filter((order) =>
    order.order_number?.toString().includes(search)
  );

  return (
    <div className="p-6 space-y-6">
      <Input
        type="text"
        placeholder={t("SearchOrderNumber")}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-md mx-auto"
      />

      <h2 className="text-xl font-semibold mt-6 text-center">
        {t("Orders")}
      </h2>

      {filteredOrders.length === 0 ? (
        <p className="text-gray-500 text-center">{t("Noordersfound")}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOrders.map((order) => (
            <Card key={order.id} className="border shadow-sm bg-white flex flex-col h-full">
              <CardContent className="p-4 space-y-3 flex-grow">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-lg">#{order.order_number}</h3>
                </div>
                <p className="text-sm text-gray-500">{order.order_date} — {order.date}</p>
                <div className="space-y-1">
                  <p className="text-sm font-medium">{t("Items")}:</p>
                  <ul className="list-disc list-inside text-sm text-gray-700">
                    {order.order_details?.map((detail, i) =>
                      detail.product?.map((prod, j) => (
                        <li key={`${i}-${j}`}>{prod.product.name} × {prod.count}</li>
                      ))
                    )}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
