// utils/processProductItem.js

/**
 * معالجة عنصر واحد من السلة وتحويله للشكل اللي الـ Backend بيفهمه
 */
// utils/processProductItem.js

export const processProductItem = (item) => {
let product_price_id = null;
  // 1. لو المنتج different_price → نضيف الـ _id بتاع النسخة المختارة في options_id
if (item.different_price && item.selectedVariation?.price_variation) {
    product_price_id = item.selectedVariation.price_variation.toString();
  }


  // 3. Addons (مع السعر)
  const addons = [];
  if (item.addons && Array.isArray(item.addons)) {
    item.addons.forEach((addon) => {
      const count = parseInt(addon.quantity || addon.count || 0);
      if (addon.addon_id && count > 0) {
        addons.push({
          addon_id: addon.addon_id.toString(),
          count: count.toString(),
          price: parseFloat(addon.price || 0).toFixed(2),
        });
      }
    });
  }

  // 4. Extras & Excludes
  const extra_id = (item.selectedExtras || [])
    .map(id => id.toString())
    .filter(id => (item.allExtras || []).some(e => e.id.toString() === id));

  const exclude_id = (item.selectedExcludes || [])
    .map(id => id.toString())
    .filter(Boolean);

  const note = item.notes?.trim() || "No notes";

  // الـ payload النهائي
  const payload = {
    product_id: item._id.toString(),
    quantity: (item.count || item.quantity || 1).toString(),
    price: parseFloat(item.price || 0).toFixed(2),
    subtotal: (parseFloat(item.price || 0) * (item.count || item.quantity || 1)).toFixed(2),
    note,
  };

  // نضيف options_id فقط لو فيه قيم
if (product_price_id) {
    payload.product_price_id = product_price_id;     // ← الجديد
  }

  // نضيف addons لو موجودة
  if (addons.length > 0) {
    payload.addons = addons;
  }

  // extra_id & exclude_id
  if (extra_id.length > 0) payload.extra_id = extra_id;
  if (exclude_id.length > 0) payload.exclude_id = exclude_id;

  return payload;
};
/**
 * بناء الـ financials payload - account_id array
 */

export const buildFinancialsPayload = (paymentSplits, financialAccounts = []) => {
  return paymentSplits.map((split) => {
    const account = financialAccounts.find(a => a._id === split.account_id);
    const isVisa = account?.name?.toLowerCase().includes("visa");

    const payload = {
      account_id: split.account_id?.toString(), // ← تم تغيير _id إلى account_id
      amount: parseFloat(split.amount || 0).toFixed(2),
    };

    if (split.checkout?.trim()) {
      payload.description = split.checkout.trim();
    }

    if (split.transition_id?.trim()) {
      payload.transition_id = split.transition_id.trim();
    }

    return payload;
  });
};
/**
 * تحديد الـ Endpoint الصحيح
 */
export const getOrderEndpoint = (hasDealItems) => {
  if (hasDealItems) return "cashier/deal/add";
  return "api/admin/pos/sales"; // أو الـ endpoint الصح عندك
};

/**
 * بناء الـ Payload الأساسي - متوافق مع الباك إند
 */

export const buildOrderPayload = ({
  orderItems,
  amountToPay,
 order_tax,         
  notes,
  financialsPayload,
  cashierId,
  due = 0,
  user_id,
  customer_id,
  discount_id,
  module_id,
  free_discount,
  due_module,
  selectedTaxAmount = 0,
  selectedTaxId,   // ← القيمة الفعلية للضريبة اليدوية
  password,
}) => {
  const products = orderItems.map(processProductItem);

let customerId;
if (customer_id) {
  // الأولوية للـ customer_id اللي جاي explicit من الـ function call (حالة Due Order)
  customerId = customer_id.toString();
} else if (user_id) {
  customerId = user_id.toString();
} else {
  customerId = sessionStorage.getItem("selected_customer_id")?.toString();
}

if (!customerId) customerId = undefined;
const finalTaxAmount = selectedTaxAmount > 0
    ? parseFloat(selectedTaxAmount).toFixed(2)
    : order_tax ? parseFloat(order_tax).toFixed(2) : undefined
  const basePayload = {
    customer_id: customerId,
     due,
    grand_total: parseFloat(amountToPay).toFixed(2),
    products,
    bundles: [],
    financials: financialsPayload,

    // الضريبة: نستخدم الضريبة اليدوية لو موجودة، وإلا نستخدم اللي جاية من المنتجات
order_tax: selectedTaxId 
        ? selectedTaxId.toString() 
        : undefined,
    // الخصم: من القايمة (الـ ID بس)
    order_discount: discount_id ? discount_id.toString() : undefined,

    notes: notes?.trim() || "No notes",
    cashier_id: cashierId.toString(),
  };

  // Due Module
  if (due_module > 0) {
    basePayload.due_module = parseFloat(due_module).toFixed(2);
  }

  // Module ID
  if (module_id && module_id !== "all") {
    basePayload.module_id = module_id.toString();
  }

  // Free Discount + Password
  if (free_discount && free_discount > 0) {
    basePayload.free_discount = parseFloat(free_discount).toFixed(2);
    if (password && password.trim()) {
      basePayload.password = password.trim();
    }
  }

  // تنظيف الـ undefined
  Object.keys(basePayload).forEach(key => {
    if (basePayload[key] === undefined) {
      delete basePayload[key];
    }
  });

  return basePayload;
};

/**
 * Deal Payload
 */
export const buildDealPayload = (orderItems, financialsPayload) => {
  const deal = orderItems.find(i => i.is_deal);
  return {
    deal_id: deal.deal_id.toString(),
    user_id: deal.deal_user_id?.toString() || "",
    financials: financialsPayload,
  };
};

/**
 * التحقق من الدفع
 */
export const validatePaymentSplits = (paymentSplits, getDescriptionStatus) => {
  let total = 0;

  for (const split of paymentSplits) {
    const amount = parseFloat(split.amount || 0);
    if (amount <= 0) {
      return { valid: false, error: "Please enter a valid amount" };
    }
    total += amount;

    if (getDescriptionStatus(split.account_id)) { // هنا التعديل
      if (!split.checkout || split.checkout.length !== 4 || !/^\d{4}$/.test(split.checkout)) {
        return { valid: false, error: "Please enter last 4 digits" };
      }
    }
  }

  return { valid: true, totalPaid: total };
};