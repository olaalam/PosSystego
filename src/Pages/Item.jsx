import React, { useState, useMemo,  useCallback } from "react";
import { usePost } from "@/Hooks/usePost";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import Loading from "@/components/Loading";
import { toast } from "react-toastify";
import { useProductModal } from "@/Hooks/useProductModal";
import CategorySelector from "./CategorySelector";
import ProductCard from "./ProductCard";
import ProductModal from "./ProductModal";
import { useTranslation } from "react-i18next";
import { buildProductPayload } from "@/services/productProcessor";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ;
const getAuthToken = () => sessionStorage.getItem("token");

const apiFetcher = async (path) => {
  const url = `${API_BASE_URL}${path}`;
  const token = getAuthToken();
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.statusText}`);
  return res.json();
};

const INITIAL_PRODUCT_ROWS = 2;
const PRODUCTS_PER_ROW = 4;
const PRODUCTS_TO_SHOW_INITIALLY = INITIAL_PRODUCT_ROWS * PRODUCTS_PER_ROW;

export default function Item({ onAddToOrder }) {
  const [activeTab, setActiveTab] = useState("category"); // category, brand, feature
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleProductCount, setVisibleProductCount] = useState(PRODUCTS_TO_SHOW_INITIALLY);
  const { t, i18n } = useTranslation();
  const orderType = sessionStorage.getItem("order_type") || "dine_in";
  const { postData: postOrder, loading: orderLoading } = usePost();

  const {
    selectedProduct,
    isProductModalOpen,
    selectedVariation,
    selectedExtras,
    selectedExcludes,
    quantity,
    totalPrice,
    openProductModal,
    closeProductModal,
    handleVariationChange,
    handleExtraChange,
    handleExclusionChange,
    setQuantity,
    handleExtraDecrement,
  } = useProductModal();

  // ✅ 1. جلب Categories
  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiFetcher("api/admin/pos-home/categories"),
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
  });

  const categories = useMemo(() => {
    return categoriesData?.data?.category || [];
  }, [categoriesData]);

  // ✅ 2. جلب Brands
  const { data: brandsData, isLoading: brandsLoading } = useQuery({
    queryKey: ["brands"],
    queryFn: () => apiFetcher("api/admin/pos-home/brands"),
    staleTime: 10 * 60 * 1000,
  });

  const brands = useMemo(() => {
    return brandsData?.data?.brand || [];
  }, [brandsData]);

  // ✅ 3. جلب Featured Products
  const { data: featuredData, isLoading: featuredLoading } = useQuery({
    queryKey: ["featured"],
    queryFn: () => apiFetcher("api/admin/pos-home/featured"),
    enabled: activeTab === "feature",
    staleTime: 10 * 60 * 1000,
  });

  const featuredProducts = useMemo(() => {
    return featuredData?.data?.products || [];
  }, [featuredData]);

  // ✅ 4. جلب Products حسب Category
  const { data: categoryProductsData, isLoading: categoryProductsLoading } = useQuery({
    queryKey: ["categoryProducts", selectedCategory],
    queryFn: () => apiFetcher(`api/admin/pos-home/categories/${selectedCategory}/products`),
    enabled: activeTab === "category" && selectedCategory !== "all",
    staleTime: 5 * 60 * 1000,
  });

  const categoryProducts = useMemo(() => {
    return categoryProductsData?.data?.products || [];
  }, [categoryProductsData]);

  // ✅ 5. جلب Products حسب Brand
  const { data: brandProductsData, isLoading: brandProductsLoading } = useQuery({
    queryKey: ["brandProducts", selectedBrand],
    queryFn: () => apiFetcher(`api/admin/pos-home/brands/${selectedBrand}/products`),
    enabled: activeTab === "brand" && selectedBrand !== "all",
    staleTime: 5 * 60 * 1000,
  });

  const brandProducts = useMemo(() => {
    return brandProductsData?.data?.products || [];
  }, [brandProductsData]);

  // ✅ 6. تحديد المنتجات حسب الـ Tab
  const productsSource = useMemo(() => {
    if (activeTab === "feature") return featuredProducts;
    if (activeTab === "brand") {
      return selectedBrand === "all" ? [] : brandProducts;
    }
    if (activeTab === "category") {
      return selectedCategory === "all" ? [] : categoryProducts;
    }
    return [];
  }, [activeTab, featuredProducts, brandProducts, categoryProducts, selectedBrand, selectedCategory]);

  // ✅ 7. فلترة المنتجات حسب البحث
  const filteredProducts = useMemo(() => {
    let products = productsSource;
    const query = searchQuery.trim().toLowerCase();

    if (query) {
      products = products.filter((p) => {
        const name = p.name?.toLowerCase() || "";
        const code = p.product_code?.toString().toLowerCase() || "";
        return name.includes(query) || code.includes(query);
      });
    }

    return products;
  }, [productsSource, searchQuery]);

  const productsToDisplay = filteredProducts.slice(0, visibleProductCount);

  // ✅ 8. Handle Tab Change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSelectedCategory("all");
    setSelectedBrand("all");
    setVisibleProductCount(PRODUCTS_TO_SHOW_INITIALLY);
    setSearchQuery("");
  };

  // ✅ 9. Handle Category Select
  const handleCategorySelect = (categoryId) => {
    setSelectedCategory(categoryId);
    setVisibleProductCount(PRODUCTS_TO_SHOW_INITIALLY);
    setSearchQuery("");
  };

  // ✅ 10. Handle Brand Select
  const handleBrandSelect = (brandId) => {
    setSelectedBrand(brandId);
    setVisibleProductCount(PRODUCTS_TO_SHOW_INITIALLY);
    setSearchQuery("");
  };

  const handleShowMoreProducts = () => {
    setVisibleProductCount((prev) => prev + PRODUCTS_PER_ROW * INITIAL_PRODUCT_ROWS);
  };

  const createTempId = (productId) =>
    `${productId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const handleAddToOrder = useCallback(async (product, customQuantity = 1) => {
    const basePrice = parseFloat(
      product.price_after_discount || product.price || product.originalPrice || 0
    );

    let addonsTotal = 0;
    if (product.selectedExtras && product.selectedExtras.length > 0) {
      const extraCounts = {};
      product.selectedExtras.forEach(extraId => {
        extraCounts[extraId] = (extraCounts[extraId] || 0) + 1;
      });
      Object.entries(extraCounts).forEach(([extraId, count]) => {
        let extra = product.addons?.find(a => a.id === parseInt(extraId));
        if (!extra) extra = product.allExtras?.find(e => e.id === parseInt(extraId));
        if (extra) {
          const extraPrice = parseFloat(
            extra.price_after_discount || extra.price_after_tax || extra.price || 0
          );
          addonsTotal += extraPrice * count;
        }
      });
    }

    let variationsTotal = 0;
    if (product.selectedVariation && product.variations) {
      product.variations.forEach(variation => {
        const selectedOptions = product.selectedVariation[variation.id];
        if (selectedOptions) {
          if (variation.type === 'single') {
            const option = variation.options?.find(opt => opt.id === selectedOptions);
            if (option) variationsTotal += parseFloat(option.price_after_tax || option.price || 0);
          } else if (variation.type === 'multiple') {
            const optionsArray = Array.isArray(selectedOptions) ? selectedOptions : [selectedOptions];
            optionsArray.forEach(optionId => {
              const option = variation.options?.find(opt => opt.id === optionId);
              if (option) variationsTotal += parseFloat(option.price_after_tax || option.price || 0);
            });
          }
        }
      });
    }

    const itemPrice = basePrice + addonsTotal + variationsTotal;
    if (itemPrice <= 0) {
      toast.error(t("InvalidProductPrice"));
      return;
    }

    const quantity = product.weight_status === 1
      ? Number(product.quantity || customQuantity || 1)
      : parseInt(customQuantity) || 1;

    const itemTotal = itemPrice * quantity;

    if (orderType === "take_away" || orderType === "delivery") {
      const newItem = {
        ...product,
        temp_id: createTempId(product._id),
        count: quantity,
        price: itemPrice,
        originalPrice: basePrice,
        totalPrice: itemTotal,
        preparation_status: "pending",
        notes: product.notes || "",
        allSelectedVariations: product.allSelectedVariations || [],
        selectedExtras: product.selectedExtras || [],
        selectedExcludes: product.selectedExcludes || [],
        selectedAddons: product.selectedAddons || [],
      };
      onAddToOrder(newItem);
      toast.success(t("ProductAddedToCart"));
      return;
    }

    if (orderType === "dine_in") {
      const tableId = sessionStorage.getItem("table_id");
      if (!tableId) {
        toast.error(t("PleaseSelectTableFirst"));
        return;
      }

      const processedItem = buildProductPayload({
        ...product,
        price: itemPrice,
        count: quantity,
      });

      const payload = {
        table_id: tableId,
        cashier_id: sessionStorage.getItem("cashier_id"),
        amount: itemTotal.toFixed(2),
        total_tax: (itemTotal * 0.14).toFixed(2),
        total_discount: "0.00",
        notes: "Added from POS",
        source: "web",
        products: [processedItem],
      };

      try {
        const response = await postOrder("cashier/dine_in_order", payload, {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
            "Content-Type": "application/json",
          },
        });

        let cartId = null;
        if (response?.cart_id) cartId = response.cart_id;
        else if (response?.id) cartId = response.id;
        else if (response?.success?.cart_id) cartId = response.success.cart_id;
        else if (response?.data?.cart_id) cartId = response.data.cart_id;

        const newItem = {
          ...product,
          temp_id: createTempId(product._id),
          count: quantity,
          price: itemPrice,
          originalPrice: basePrice,
          totalPrice: itemTotal,
          cart_id: cartId ? cartId.toString() : null,
          preparation_status: "pending",
          notes: product.notes || "",
        };

        onAddToOrder(newItem);
        toast.success(t("ProductAddedToTable", { table: tableId }));
      } catch (err) {
        console.error("Dine-in order error:", err);
        toast.error(err.response?.data?.message || t("FailedToAddToTable"));
      }
    }
  }, [orderType, onAddToOrder, postOrder, t]);

  const handleAddFromModal = (enhancedProduct, options = {}) => {
    handleAddToOrder(enhancedProduct, enhancedProduct.quantity, options);
  };

  const isAnyLoading = categoriesLoading || brandsLoading || categoryProductsLoading || brandProductsLoading || featuredLoading;
  const isArabic = i18n.language === "ar";

  if (isAnyLoading && !categories.length) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loading />
      </div>
    );
  }

  return (
    <div className={`${isArabic ? "text-right" : "text-left"}`} dir={isArabic ? "rtl" : "ltr"}>
      {/* ✅ Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-200">
        <button
          onClick={() => handleTabChange("category")}
          className={`px-6 py-3 font-semibold transition-colors ${
            activeTab === "category"
              ? "border-b-2 border-purple-600 text-purple-600"
              : "text-gray-600 hover:text-purple-600"
          }`}
        >
          {t("Categories") || "Categories"}
        </button>
        <button
          onClick={() => handleTabChange("brand")}
          className={`px-6 py-3 font-semibold transition-colors ${
            activeTab === "brand"
              ? "border-b-2 border-purple-600 text-purple-600"
              : "text-gray-600 hover:text-purple-600"
          }`}
        >
          {t("Brands") || "Brands"}
        </button>
        <button
          onClick={() => handleTabChange("feature")}
          className={`px-6 py-3 font-semibold transition-colors ${
            activeTab === "feature"
              ? "border-b-2 border-purple-600 text-purple-600"
              : "text-gray-600 hover:text-purple-600"
          }`}
        >
          {t("Featured") || "Featured"}
        </button>
      </div>

      {/* ✅ Category Tab */}
      {activeTab === "category" && (
        <>
          <h2 className="text-purple-600 text-2xl font-bold mb-4">
            {t("SelectCategory") || "Select Category"}
          </h2>
          
          <div className="flex flex-wrap gap-3 mb-6">
            {/* <button
              onClick={() => handleCategorySelect("all")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedCategory === "all"
                  ? "bg-purple-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-purple-100"
              }`}
            >
              {t("All") || "All"}
            </button> */}
            {categories.map((cat) => (
              <button
                key={cat._id}
                onClick={() => handleCategorySelect(cat._id)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedCategory === cat._id
                    ? "bg-purple-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-purple-100"
                }`}
              >
                {isArabic ? cat.ar_name || cat.name : cat.name}
              </button>
            ))}
          </div>
        </>
      )}

      {/* ✅ Brand Tab */}
      {activeTab === "brand" && (
        <>
          <h2 className="text-purple-600 text-2xl font-bold mb-4">
            {t("SelectBrand") || "Select Brand"}
          </h2>
          
          <div className="flex flex-wrap gap-3 mb-6">
            {/* <button
              onClick={() => handleBrandSelect("all")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedBrand === "all"
                  ? "bg-purple-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-purple-100"
              }`}
            >
              {t("All") || "All"}
            </button> */}
            {brands.map((brand) => (
              <button
                key={brand._id}
                onClick={() => handleBrandSelect(brand._id)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedBrand === brand._id
                    ? "bg-purple-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-purple-100"
                }`}
              >
                {brand.name}
              </button>
            ))}
          </div>
        </>
      )}

      {/* ✅ Featured Tab */}
      {activeTab === "feature" && (
        <h2 className="text-purple-600 text-2xl font-bold mb-4">
          {t("FeaturedProducts") || "Featured Products"}
        </h2>
      )}

      {/* ✅ Search Bar */}
      <div className="mb-6">
        <input
          type="text"
          placeholder={t("SearchByProductName") || "Search by product name..."}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-600"
        />
      </div>

      {/* ✅ Products Grid */}
      <div className="bg-gray-50 border border-gray-200 px-5 mb-8 rounded-lg max-h-[500px] overflow-y-auto">
        {isAnyLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loading />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center text-gray-500 text-lg py-8">
            {t("NoProductsFound") || "No products found"}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pb-4 py-3">
              {productsToDisplay.map((product) => (
                <ProductCard
                  key={product._id }
                  product={product}
                  onAddToOrder={handleAddToOrder}
                  onOpenModal={openProductModal}
                  orderLoading={orderLoading}
                />
              ))}
            </div>

            {visibleProductCount < filteredProducts.length && (
              <div className="flex justify-center my-3">
                <Button
                  onClick={handleShowMoreProducts}
                  className="bg-purple-600 text-white py-2 px-6 rounded-lg hover:bg-purple-700 transition-colors"
                >
                  {t("ShowMoreProducts") || "Show More"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ✅ Product Modal */}
      <ProductModal
        isOpen={isProductModalOpen}
        onClose={closeProductModal}
        selectedProduct={selectedProduct}
        selectedVariation={selectedVariation}
        selectedExtras={selectedExtras}
        selectedExcludes={selectedExcludes}
        quantity={quantity}
        totalPrice={totalPrice}
        onVariationChange={handleVariationChange}
        onExtraChange={handleExtraChange}
        onExclusionChange={handleExclusionChange}
        onExtraDecrement={handleExtraDecrement}
        onQuantityChange={setQuantity}
        onAddFromModal={handleAddFromModal}
        orderLoading={orderLoading}
      />

      {orderLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Loading />
        </div>
      )}
    </div>
  );
}