import React, { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGet } from "@/Hooks/useGet";
import { usePost } from "@/Hooks/usePost";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Loading from "@/components/Loading";
import qz from "qz-tray";
import CustomerSelectionModal from "./CustomerSelectionModal";
import {
  buildFinancialsPayload,
  getOrderEndpoint,
  buildOrderPayload,
  buildDealPayload,
  validatePaymentSplits,
} from "./processProductItem";
import {
  prepareReceiptData,
  printReceiptSilently,
} from "../utils/printReceipt";
import { useTranslation } from "react-i18next";
import FreeDiscountPasswordModal from "./FreeDiscountPasswordModal";

const CheckOut = ({
  amountToPay,
  orderItems,
  onClose,
  order_tax,
  totalDiscount,
  selectedPaymentItemIds = [],
  onClearCart,
  shouldPrintReceipt = true,
}) => {
  const cashierId = sessionStorage.getItem("cashier_id");
  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  const { t } = useTranslation();
  const lastSelectedGroup = sessionStorage.getItem("last_selected_group");

  const { data: groupData } = useGet("cashier/group_product");
  const groupProducts = groupData?.group_product || [];
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [pendingFreeDiscountPassword, setPendingFreeDiscountPassword] =
    useState("");

  const isDueModuleAllowed = (() => {
    if (!groupProducts || groupProducts.length === 0) return false;

    const lastSelectedGroupId = sessionStorage.getItem("last_selected_group");
    if (!lastSelectedGroupId || lastSelectedGroupId === "all") return false;

    const groupId = parseInt(lastSelectedGroupId);
    if (isNaN(groupId)) return false;

    const selectedGroup = groupProducts.find((g) => g.id === groupId);
    return selectedGroup?.due === 1;
  })();

  const { data: discountListData, loading: discountsLoading } =
    useGet("api/admin/discount");
  const { data: taxesData, loading: taxesLoading } = useGet("api/admin/taxes");
  const [selectedDiscountId, setSelectedDiscountId] = useState(null);
  const [selectedTaxId, setSelectedTaxId] = useState(null);
  const [freeDiscount, setFreeDiscount] = useState("");

// === QZ Tray Connection ===
  useEffect(() => {
    if (!shouldPrintReceipt) {
    // لو مش هنطبع → متعملش اتصال بـ QZ خالص
    return;
  }
    // 1. جلب التوكين (تأكد من اسم المفتاح الصحيح سواء token أو access_token)
    const token = sessionStorage.getItem("token"); 

    // إعداد الهيدر للإرسال
    const authHeaders = {
      "Authorization": `Bearer ${token}` // إضافة التوكين هنا
    };

    // 2. إعداد الـ Certificate
    qz.security.setCertificatePromise(function (resolve, reject) {
      fetch(`${baseUrl}api/admin/qztray/cert`, {
        method: "GET",
        headers: authHeaders // <--- إرسال التوكين هنا
      })
        .then((response) => {
          if (!response.ok) {
            // إذا كان الخطأ 401، فهذا يعني أن التوكين غير صحيح أو منتهي
            if (response.status === 401) {
                throw new Error("401 Unauthorized: Please check login status.");
            }
            throw new Error(`Certificate Error: ${response.status}`);
          }
          return response.text();
        })
        .then(resolve)
        .catch((err) => {
          console.error("❌ Failed to fetch certificate:", err);
          reject(err);
        });
    });

    qz.security.setSignatureAlgorithm("SHA512");

    // 3. إعداد الـ Signature
    qz.security.setSignaturePromise(function (toSign) {
      return function (resolve, reject) {
        const apiUrl = `${baseUrl}api/admin/qztray/sign?request=${toSign}`;

        fetch(apiUrl, {
          method: "GET",
          headers: authHeaders // <--- إرسال التوكين هنا أيضاً
        })
          .then((response) => {
            if (!response.ok) {
              if (response.status === 401) {
                  throw new Error("401 Unauthorized: Signature rejected.");
              }
              throw new Error(`Signature Error: ${response.status}`);
            }
            return response.text();
          })
          .then(resolve)
          .catch((err) => {
            console.error("❌ Failed to sign request:", err);
            reject(err);
          });
      };
    });

    // 4. الاتصال
    if (!qz.websocket.isActive()) {
      qz.websocket
        .connect()
        .then(() => {
          console.log("✅ Connected to QZ Tray");
        })
        .catch((err) => {
          console.error("❌ QZ Tray connection error:", err);
          // تجاهل الخطأ إذا كان بسبب التكرار، لكن اعرضه إذا كان اتصالاً فعلياً
          // toast.error(t("QZTrayNotRunning")); 
        });
    }

    return () => {
      if (qz.websocket.isActive()) {
        qz.websocket.disconnect();
      }
    };
  }, [baseUrl, t,shouldPrintReceipt]); // تمت إزالة token من الاعتماديات لتجنب إعادة الاتصال المتكررة إذا لم يكن ضرورياً

  const { postData, loading } = usePost();

  const [orderNotes, setOrderNotes] = useState("");
  const [paymentSplits, setPaymentSplits] = useState([]);
  const [customerPaid, setCustomerPaid] = useState("");
  const [customerSelectionOpen, setCustomerSelectionOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");

const {
  data: dueUsersData,
  loading: customerSearchLoading,
  refetch: refetchDueUsers,
} = useGet(`api/admin/pos-home/selections`);

const searchResults = useMemo(() => {
  // التغيير الوحيد: dueCustomers بدل users
  const customers = dueUsersData?.data?.dueCustomers || [];

  return customers.filter((c) =>
    c.name?.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
    c.phone_number?.includes(customerSearchQuery)
    // لو في phone_2 ممكن تضيفه هنا لو موجود في الـ API
  );
}, [dueUsersData, customerSearchQuery]);

  const { selectedDiscountAmount, finalSelectedDiscountId } = useMemo(() => {
    const discountList = discountListData?.data?.discounts || [];
    const selectedDiscount = discountList.find(
      (d) => d._id === selectedDiscountId
    );

    if (!selectedDiscount) {
      return { selectedDiscountAmount: 0, finalSelectedDiscountId: null };
    }

    let discountValue = 0;
    if (selectedDiscount.type === "percentage") {
      discountValue = amountToPay * (selectedDiscount.amount / 100);
    } else if (selectedDiscount.type === "value") {
      discountValue = selectedDiscount.amount;
    }

    return {
      selectedDiscountAmount: discountValue,
      finalSelectedDiscountId: selectedDiscount._id,
    };
  }, [discountListData, selectedDiscountId, amountToPay]);

  const [isDueOrder, setIsDueOrder] = useState(false);
  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [discountError, setDiscountError] = useState(null);
  const [isCheckingDiscount, setIsCheckingDiscount] = useState(false);
  const selectedTaxAmount = useMemo(() => {
    if (!selectedTaxId || !taxesData?.data?.taxes) return 0;

    const selectedTax = taxesData.data.taxes.find(
      (t) => t._id === selectedTaxId
    );
    if (!selectedTax) return 0;

    if (selectedTax.type === "percentage") {
      return amountToPay * (selectedTax.amount / 100);
    } else {
      // fixed
      return selectedTax.amount;
    }
  }, [selectedTaxId, taxesData, amountToPay]);

  const discountedAmount = useMemo(() => {
    let totalDiscountValue = 0;

    // تطبيق الخصم بالرمز
    if (appliedDiscount > 0) {
      totalDiscountValue = amountToPay * (appliedDiscount / 100);
    }
    // تطبيق الخصم المختار من القائمة
    else if (selectedDiscountAmount > 0) {
      totalDiscountValue = selectedDiscountAmount;
    }

    // خصم الـ free_discount
    const afterPercentageDiscount = amountToPay - totalDiscountValue;
    const freeDiscountValue = parseFloat(freeDiscount) || 0;

    return Math.max(0, afterPercentageDiscount - freeDiscountValue);
  }, [amountToPay, appliedDiscount, selectedDiscountAmount, freeDiscount]);

  const requiredTotal = useMemo(() => {
    if (selectedPaymentItemIds.length > 0) {
      const selectedItems = orderItems.filter((item) =>
        selectedPaymentItemIds.includes(item.temp_id)
      );
      return selectedItems.reduce((acc, item) => {
        const quantity = item.count ?? item.quantity ?? 1;
        return acc + item.price * quantity;
      }, 0);
    }

    // المجموع بعد الخصومات + الضريبة اليدوية
    return discountedAmount + selectedTaxAmount;
  }, [orderItems, discountedAmount, selectedPaymentItemIds, selectedTaxAmount]);

  const { totalScheduled, remainingAmount, changeAmount } = useMemo(() => {
    const sum = paymentSplits.reduce(
      (acc, split) => acc + (parseFloat(split.amount) || 0),
      0
    );
    const calculatedRemaining = requiredTotal - sum;
    const calculatedChange = sum - requiredTotal;

    return {
      totalScheduled: sum,
      remainingAmount: calculatedRemaining > 0 ? calculatedRemaining : 0,
      changeAmount: calculatedChange > 0 ? calculatedChange : 0,
    };
  }, [paymentSplits, requiredTotal]);

  const calculatedChange = useMemo(() => {
    const paid = parseFloat(customerPaid) || 0;
    return paid > requiredTotal ? paid - requiredTotal : 0;
  }, [customerPaid, requiredTotal]);

  const isTotalMet = totalScheduled >= requiredTotal;

  const financialAccounts = useMemo(() => {
    const item = sessionStorage.getItem("financial_accounts");

    if (!item) {
      console.warn("No financial_accounts in sessionStorage");
      return [];
    }

    try {
      const parsed = JSON.parse(item);

      // الحالة 1: لو array (الطبيعي)
      if (Array.isArray(parsed)) {
        return parsed;
      }

      // الحالة 2: لو object واحد بس (اللي حصل عندك)
      if (parsed && parsed._id && parsed.name) {
        console.log("Single financial account detected, wrapping in array");
        return [parsed]; // نلفه في array عشان الكود يشتغل
      }

      // الحالة 3: لو كان object فيه مفتاح واحد بس (مثل { main: [...] })
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const values = Object.values(parsed);
        const flat = values.flat();
        if (flat.length > 0 && flat[0]._id) {
          return flat;
        }
      }

      return [];
    } catch (e) {
      console.error("Failed to parse financial_accounts:", e);
      return [];
    }
  }, []);

  // Initialize default payment split
  useEffect(() => {
    if (
      financialAccounts?.length > 0 &&
      paymentSplits.length === 0 &&
      requiredTotal > 0
    ) {
      const visaAccount = financialAccounts.find((acc) =>
        acc.name?.toLowerCase().includes("visa")
      );

      const defaultAccountId = visaAccount
        ? visaAccount._id
        : financialAccounts[0]._id;

      setPaymentSplits([
        {
          _id: "split-1",
          account_id: defaultAccountId, // ← هنا
          amount: requiredTotal,
          checkout: "",
          transition_id: "",
        },
      ]);
    }
  }, [financialAccounts, requiredTotal, paymentSplits.length]);

  // Auto-update single split amount
  useEffect(() => {
    if (paymentSplits.length === 1 && paymentSplits[0]._id === "split-1") {
      setPaymentSplits((prev) => {
        if (
          prev.length === 1 &&
          prev[0]._id === "split-1" &&
          prev[0].amount !== requiredTotal
        ) {
          return prev.map((split) =>
            split._id === "split-1"
              ? { ...split, amount: requiredTotal || 0 }
              : split
          );
        }
        return prev;
      });
    }
  }, [requiredTotal]);

  const handleApplyDiscount = async () => {
    if (!discountCode) {
      toast.error(t("PleaseEnterDiscountCode"));
      return;
    }

    setIsCheckingDiscount(true);
    setDiscountError(null);

    try {
      const response = await postData("cashier/check_discount_code", {
        code: discountCode,
      });
      if (response.success) {
        setAppliedDiscount(response.discount);
        toast.success(t("DiscountApplied", { discount: response.discount }));
      } 
      else {
        setAppliedDiscount(0);
        setDiscountError("Invalid or Off discount code.");
        toast.error(t("InvalidOrOffDiscountCode"));
      }
    } catch (e) {
      setAppliedDiscount(0);
      setDiscountError(e.message || "Failed to validate discount code.");
      toast.error(e.message || t("FailedToValidateDiscountCode"));
    } finally {
      setIsCheckingDiscount(false);
    }
  };

  const handleAmountChange = (_id, value) => {
    const newAmount = parseFloat(value) || 0;
    if (newAmount < 0) {
      toast.error(t("AmountCannotBeNegative"));
      return;
    }

    setPaymentSplits((prevSplits) => {
      const totalExcludingCurrent = prevSplits.reduce(
        (acc, s) => (s._id === _id ? acc : acc + s.amount),
        0
      );
      const maxAllowed = requiredTotal - totalExcludingCurrent;

      if (newAmount > maxAllowed) {
        toast.error(t("AmountExceedsLimit", { amount: maxAllowed.toFixed(2) }));
        return prevSplits.map((split) =>
          split._id === _id ? { ...split, amount: maxAllowed } : split
        );
      }

      return prevSplits.map((split) =>
        split._id === _id ? { ...split, amount: newAmount } : split
      );
    });
  };

  const handleAccountChange = (_id, accountId) => {
    setPaymentSplits((prev) =>
      prev.map((split) =>
        split._id === _id
          ? {
              ...split,
              account_id: accountId,
              checkout: "",
              transition_id: "",
            }
          : split
      )
    );
  };

  const handleDescriptionChange = (_id, value) => {
    setPaymentSplits((prev) =>
      prev.map((split) =>
        split._id === _id ? { ...split, checkout: value } : split
      )
    );
  };

  const handleTransitionIdChange = (_id, value) => {
    setPaymentSplits((prev) =>
      prev.map((split) =>
        split._id === _id ? { ...split, transition_id: value } : split
      )
    );
  };

  const handleAddSplit = () => {
    if (!financialAccounts?.length) {
      return toast.error(t("NoFinancialAccounts"));
    }

    const defaultAccountId = financialAccounts[0]._id;
    setPaymentSplits((prev) => [
      ...prev,
      {
        _id: `split-${Date.now()}`,
        accountId: defaultAccountId,
        amount: remainingAmount > 0 ? remainingAmount : 0,
        checkout: "",
        transition_id: "",
      },
    ]);
  };

  const handleRemoveSplit = (_id) => {
    setPaymentSplits((prev) => prev.filter((s) => s._id !== _id));
  };

  const getAccountNameById = (account_id) => {
    const acc = financialAccounts?.find((a) => a._id == account_id);
    return acc ? acc.name : "Select Account";
  };
  const getDescriptionStatus = (accountId) => {
    const acc = financialAccounts?.find((a) => a._id === parseInt(accountId));
    return acc?.description_status === 1;
  };

  const isVisaAccount = (accountId) => {
    const acc = financialAccounts?.find((a) => a._id === parseInt(accountId));
    return acc?.name?.toLowerCase().includes("visa");
  };

const proceedWithOrderSubmission = async (
  due = 0,
  customer_id = undefined,
  dueModuleValue = 0,
  forcedPassword = null
) => {
  const freeDiscountValue = parseFloat(freeDiscount) || 0;

  // طلب كلمة سر للخصم المجاني
  if (
    freeDiscountValue > 0 &&
    !forcedPassword &&
    !pendingFreeDiscountPassword
  ) {
    setPasswordModalOpen(true);
    return;
  }

  const safeOrderItems = Array.isArray(orderItems) ? orderItems : [];
  const hasDealItems = safeOrderItems.some((item) => item.is_deal);
  const endpoint = getOrderEndpoint(null, safeOrderItems, hasDealItems);
  const financialsPayload = buildFinancialsPayload(paymentSplits, financialAccounts);

  const moduleId = sessionStorage.getItem("module_id");

  let payload;
  if (hasDealItems) {
    payload = buildDealPayload(safeOrderItems, financialsPayload);
  } else {
    payload = buildOrderPayload({
      orderItems: safeOrderItems,
      amountToPay: requiredTotal,
      order_tax,
      totalDiscount: appliedDiscount > 0
        ? amountToPay * (appliedDiscount / 100)
        : totalDiscount,
      notes: orderNotes.trim() || "No special instructions",
      financialsPayload,
      cashierId,
      due,
      customer_id: customer_id || selectedCustomer?._id,
      selectedTaxId: selectedTaxId,
      discount_id: selectedDiscountId,
      module_id: moduleId,
      free_discount: freeDiscountValue > 0 ? freeDiscountValue : undefined,
      due_module: dueModuleValue > 0 ? dueModuleValue.toFixed(2) : undefined,
      selectedTaxAmount: selectedTaxAmount,
      password: forcedPassword || pendingFreeDiscountPassword || undefined,
    });
  }

  try {
    const response = await postData(endpoint, payload, {
      headers: { "Content-Type": "application/json" },
    });

    if (response?.success) {
      // نجاح الطلب
      toast.success(due === 1 ? t("DueOrderCreated") : t("OrderPlaced"));
      setPendingFreeDiscountPassword("");

      // دالة التنظيف والإغلاق (مشتركة)
      const completeOrder = () => {
        onClearCart?.();
        onClose();
      };

      if (due === 0) {
        // طلب عادي (مش آجل)
        const receiptData = prepareReceiptData(
          safeOrderItems,
          amountToPay,
          order_tax,
          totalDiscount,
          appliedDiscount,
          {},
          null,
          requiredTotal,
          response.success,
          response
        );

        if (shouldPrintReceipt) {
          // مع طباعة
          printReceiptSilently(receiptData, response, () => {
            completeOrder();
            toast.success(t("OrderCompletedSuccessfully"));
          });
        } else {
          // بدون طباعة
          completeOrder();
          toast.success(t("OrderCompletedSuccessfully") + " (" + t("NoPrint") + ")");
        }
      } else {
        // طلب آجل → بدون طباعة عادةً
        completeOrder();
      }
    } else {
      // فشل من الـ API
      toast.error(response?.message || t("FailedToProcessOrder"));
    }
  } catch (e) {
    console.error("Submit error:", e);
    toast.error(e.message || t("SubmissionFailed"));
  }
};

const handleSelectCustomer = async (customer) => {
  // عرض تحذير بس مش منع (لو عايزة تسمحي بالدين حتى لو زاد)
  if (customer.amount_Due && requiredTotal > 0) {
    const newTotalDue = customer.amount_Due + requiredTotal;
    toast.info(
      t("CustomerCurrentDue", { 
        current: customer.amount_Due.toFixed(2),
        new: newTotalDue.toFixed(2)
      })
    );
  }

  setSelectedCustomer(customer);
  setCustomerSelectionOpen(false);

 await proceedWithOrderSubmission(1, customer._id);
};
  const handleSubmitOrder = async () => {
    if (!isTotalMet || totalScheduled === 0) {
      return toast.error(
        t("TotalMustEqual", { amount: requiredTotal.toFixed(2) })
      );
    }

    const validation = validatePaymentSplits(
      paymentSplits,
      getDescriptionStatus
    );
    if (!validation.valid) {
      return toast.error(validation.error);
    }

    if (isDueOrder) {
      if (!selectedCustomer) {
        setCustomerSelectionOpen(true);
        refetchDueUsers();
        return;
      }
      return;
    }

    await proceedWithOrderSubmission(0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
      <CustomerSelectionModal
        isOpen={customerSelectionOpen}
        onClose={() => setCustomerSelectionOpen(false)}
        onSelectCustomer={handleSelectCustomer}
        searchQuery={customerSearchQuery}
        setSearchQuery={setCustomerSearchQuery}
        customers={searchResults}
        loading={customerSearchLoading}
        requiredTotal={requiredTotal}
      />

      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl h-auto flex flex-col">
        <div className="bg-white p-4 border-b flex items-center justify-between">
          <h2 className="text-2xl font-semibold">{t("ProcessPayment")}</h2>
          <button
            onClick={onClose}
            className="text-4xl p-2 rounded-full hover:bg-gray-100"
          >
            X
          </button>
        </div>

        <div className="p-8 overflow-y-auto max-h-[calc(90vh-6rem)]">
          <div className="mb-6 border-b pb-4">
            <div className="flex justify-between mb-2">
              <span>{t("OriginalAmount")}</span>
              <span>
                {amountToPay.toFixed(2)} {t("EGP")}
              </span>
            </div>

            {appliedDiscount > 0 && (
              <div className="flex justify-between mb-2">
                <span>
                  {t("Discount")} ({appliedDiscount}%):
                </span>
                <span>
                  -{(amountToPay * (appliedDiscount / 100)).toFixed(2)}{" "}
                  {t("EGP")}
                </span>
              </div>
            )}

            {selectedDiscountAmount > 0 && appliedDiscount === 0 && (
              <div className="flex justify-between mb-2 text-blue-600 font-medium">
                <span>{t("ListDiscount")}:</span>
                <span>
                  -{selectedDiscountAmount.toFixed(2)} {t("EGP")}
                </span>
              </div>
            )}

            {freeDiscount && parseFloat(freeDiscount) > 0 && (
              <div className="flex justify-between mb-2 text-purple-600 font-medium">
                <span>{t("FreeDiscount")}:</span>
                <span>
                  -{parseFloat(freeDiscount).toFixed(2)} {t("EGP")}
                </span>
              </div>
            )}

            <div className="flex justify-between mb-2 font-bold text-lg">
              <span>{t("TotalAmount")}</span>
              <span>
                {requiredTotal.toFixed(2)} {t("EGP")}
              </span>
            </div>
            <div className="flex justify-between mb-2">
              <span>{t("Remaining")}</span>
              <span
                className={
                  remainingAmount > 0 ? "text-bg-secondary" : "text-teal-600"
                }
              >
                {remainingAmount.toFixed(2)} {t("EGP")}
              </span>
            </div>
            {changeAmount > 0 && (
              <div className="flex justify-between">
                <span>{t("Change")}:</span>
                <span className="text-teal-600">
                  {changeAmount.toFixed(2)} {t("EGP")}
                </span>
              </div>
            )}
          </div>

          {isDueModuleAllowed && remainingAmount > 0.01 && (
            <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="text-center mb-4">
                <p className="text-lg font-bold text-purple-600">
                  المنصة هتدفع الباقي (Due Module):{" "}
                  <strong>
                    {remainingAmount.toFixed(2)} {t("EGP")}
                  </strong>
                </p>
              </div>

              <Button
                className="w-full text-white text-lg font-bold py-6 bg-purple-600 hover:bg-purple-700"
                disabled={loading}
                onClick={() =>
                  proceedWithOrderSubmission(0, undefined, remainingAmount)
                }
              >
                تأكيد الطلب مع Due Module ({remainingAmount.toFixed(2)}{" "}
                {t("EGP")})
              </Button>
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              {t("OrderNotes")}
            </label>
            <Textarea
              placeholder={t("OrderNotesPlaceholder")}
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              className="w-full min-h-[100px] resize-none"
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-1">
              {orderNotes.length}/500 {t("characters")}
            </p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              {t("FreeDiscount")} ({t("EGP")})
            </label>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder={t("EnterFreeDiscount")}
              value={freeDiscount}
              onChange={(e) => setFreeDiscount(e.target.value)}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              {t("FreeDiscountHint")}
            </p>
          </div>

          <div className="mb-6">
            <label className="block text-sm mb-1">
              {t("DiscountbyCompany")}
            </label>
            <div className="flex space-x-2">
              <Input
                type="text"
                placeholder={t("EnterDiscountCode")}
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value)}
                disabled={isCheckingDiscount}
              />
              <Button
                onClick={handleApplyDiscount}
                disabled={isCheckingDiscount || !discountCode}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isCheckingDiscount ? t("Checking") : t("Apply")}
              </Button>
            </div>
            {discountError && (
              <p className="mt-2 text-purple-500 text-sm">{discountError}</p>
            )}
            {appliedDiscount > 0 && (
              <p className="mt-2 text-teal-600 text-sm">
                {t("DiscountAppliedSuccess", { appliedDiscount })}
              </p>
            )}
          </div>

          <div className="mb-6 flex gap-3">
            <label className="block text-sm mb-1">
              {t("SelectDiscountFromList")}
            </label>
            <Select
              value={String(selectedDiscountId || "0")}
              onValueChange={(val) => {
                const _id = val === "0" ? null : val;
                setSelectedDiscountId(_id);
              }}
              disabled={
                discountsLoading || !discountListData?.data?.discounts?.length
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t("ChooseDiscount")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem key="none" value="0">
                  {t("NoDiscount")}
                </SelectItem>
                {discountListData?.data?.discounts?.map((discount) => (
                  <SelectItem key={discount._id} value={String(discount._id)}>
                    {discount.name} ({discount.amount}
                    {discount.type === "percentage" ? "%" : t("EGP")})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {discountsLoading && (
              <p className="mt-2 text-sm text-gray-500">
                {t("LoadingDiscounts")}
              </p>
            )}
          </div>
          <label className="block text-sm mb-1">{t("SelectTaxFromList")}</label>
          <Select
            value={selectedTaxId || "0"}
            onValueChange={(val) => {
              setSelectedTaxId(val === "0" ? null : val);
            }}
            disabled={taxesLoading || !taxesData?.data?.taxes?.length}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("NoTaxSelected")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">{t("NoTax")}</SelectItem>
              {taxesData?.data?.taxes
                ?.filter((tax) => tax.status === true)
                .map((tax) => (
                  <SelectItem key={tax._id} value={tax._id}>
                    {tax.name} ({tax.amount}
                    {tax.type === "percentage" ? "%" : ` ${t("EGP")} fixed`})
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>

          {taxesLoading && (
            <p className="mt-2 text-sm text-gray-500">{t("LoadingTaxes")}</p>
          )}
          {!taxesData?.data?.taxes?.length && !taxesLoading && (
            <p className="mt-2 text-sm text-gray-500">
              {t("NoTaxesAvailable")}
            </p>
          )}

          <div className="space-y-6">
            {paymentSplits.map((split) => (
              <div key={split._id} className="space-y-3">
                <div className="flex items-center space-x-4">
                  <div className="w-40">
                    <Select
                      value={String(split.account_id)}
                      onValueChange={(val) =>
                        handleAccountChange(split._id, val)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue>
                          {getAccountNameById(split.account_id)}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {financialAccounts.map((acc) => (
                          <SelectItem key={acc._id} value={String(acc._id)}>
                            {acc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="relative flex-grow">
                    <Input
                      type="number"
                      min="0"
                      value={split.amount === 0 ? "" : String(split.amount)}
                      onChange={(e) =>
                        handleAmountChange(split._id, e.target.value)
                      }
                      className="pl-16"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2">
                      {t("EGP")}
                    </span>
                  </div>
                  {getDescriptionStatus(split.account_id) && (
                    <Input
                      type="text"
                      placeholder="Last 4 digits"
                      value={split.checkout}
                      onChange={(e) =>
                        handleDescriptionChange(split._id, e.target.value)
                      }
                      maxLength={4}
                      className="w-32"
                    />
                  )}
                  {paymentSplits.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveSplit(split._id)}
                    >
                      {t("Remove")}
                    </Button>
                  )}
                </div>

                {isVisaAccount(split.account_id) && (
                  <div className="ml-44 flex items-center gap-2">
                    <label className="text-sm text-gray-600 whitespace-nowrap">
                      {t("TransactionID")}:
                    </label>
                    <Input
                      type="text"
                      placeholder={t("EnterTransactionID")}
                      value={split.transition_id || ""}
                      onChange={(e) =>
                        handleTransitionIdChange(split._id, e.target.value)
                      }
                      className="flex-1"
                    />
                  </div>
                )}
              </div>
            ))}
            {remainingAmount > 0 && (
              <Button
                variant="link"
                onClick={handleAddSplit}
                className="text-sm text-blue-600"
              >
                {t("AddAccountSplit")}
              </Button>
            )}
          </div>

          <div className="mt-6">
            <label className="block text-sm mb-1">
              {t("AmountPaidByCustomer")}
            </label>
            <div className="relative">
              <Input
                type="number"
                min="0"
                placeholder={t("EnterAmountPaid")}
                value={customerPaid}
                onChange={(e) => setCustomerPaid(e.target.value)}
                className="pl-16"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2">
                {t("EGP")}
              </span>
            </div>
            {parseFloat(customerPaid) > requiredTotal && (
              <p className="mt-2 text-teal-600 text-sm font-semibold">
                {t("ChangeDue", { value: calculatedChange.toFixed(2) })}
              </p>
            )}
          </div>

          <div className="mt-6 flex items-center gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <input
              type="checkbox"
              _id="isDueOrder"
              checked={isDueOrder}
              onChange={(e) => {
                setIsDueOrder(e.target.checked);
                if (!e.target.checked) {
                  setSelectedCustomer(null);
                }
              }}
              className="w-5 h-5 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
            />
            <label
              htmlFor="isDueOrder"
              className="text-sm font-medium text-gray-700 cursor-pointer"
            >
              {t("MarkAsDueOrder")}
            </label>
          </div>

          <div className="flex space-x-4 mt-6">
            <Button
              className="flex-1 text-white bg-bg-secondary hover:bg-teal-700"
              disabled={loading || !isTotalMet}
              onClick={handleSubmitOrder}
            >
              {loading
                ? t("Processing")
                : isDueOrder
                ? selectedCustomer
                  ? t("DueOrderReady")
                  : t("SelectCustomer")
                : t("ConfirmAndPay")}
            </Button>
          </div>
        </div>
      </div>

      <FreeDiscountPasswordModal
        isOpen={passwordModalOpen}
        onClose={() => {
          setPasswordModalOpen(false);
          setFreeDiscount("");
          toast.info(t("FreeDiscountCancelled"));
        }}
        onConfirm={(password) => {
          setPendingFreeDiscountPassword(password);
          setPasswordModalOpen(false);
          toast.success(t("PasswordAccepted"));

          proceedWithOrderSubmission(
            isDueOrder ? 1 : 0,
            selectedCustomer?._id,
            remainingAmount > 0.01 && isDueModuleAllowed ? remainingAmount : 0,
            password
          );
        }}
      />
    </div>
  );
};

export default CheckOut;
