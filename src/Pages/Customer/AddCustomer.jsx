import React, { useState } from "react";
import { usePost } from "@/Hooks/usePost";
import { useGet } from "@/Hooks/useGet";
import { toast } from "react-toastify";

export default function AddCustomer({ onClose }) {
  const { postData, loading } = usePost();
  const { data: selections } = useGet("api/admin/pos-home/selections");

  const countries = selections?.data?.countries || [];
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone_number: "",
    address: "",
    country: "",
    city: "",
    customer_group_id: "",
  });

  // --- التعديل هنا ---
  // البحث عن البلد المختار واستخراج مصفوفة المدن منه
  const selectedCountry = countries.find(
    (country) => country._id === form.country
  );
  const cities = selectedCountry?.cities || [];
  // -------------------
  
  const customerGroups = selections?.data?.customerGroups || [];


  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    try {
      await postData("api/admin/customer/", form);
      toast.success("Customer Added Successfully");
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Error adding customer");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-lg shadow-lg w-[500px] p-6 relative">

        {/* زر X للإغلاق */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 text-xl font-bold text-gray-600 hover:text-red-500"
        >
          ✕
        </button>

        <h2 className="text-2xl font-semibold mb-4">Add Customer</h2>

        <div className="grid grid-cols-2 gap-3">

          <input
            name="name"
            placeholder="Name"
            value={form.name}
            onChange={handleChange}
            className="border p-2 rounded"
          />

          <input
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            className="border p-2 rounded"
          />

          <input
            name="phone_number"
            placeholder="Phone"
            value={form.phone_number}
            onChange={handleChange}
            className="border p-2 rounded"
          />

          <input
            name="address"
            placeholder="Address"
            value={form.address}
            onChange={handleChange}
            className="border p-2 rounded"
          />

          {/* Country Select */}
          <select
            name="country"
            value={form.country}
            onChange={(e) => {
              // هذا الجزء صحيح - يقوم بمسح المدينة عند تغيير البلد
              setForm({ ...form, country: e.target.value, city: "" }); 
            }}
            className="border p-2 rounded"
          >

            <option value="">Select Country</option>
            {countries.map((x) => (
              <option key={x._id} value={x._id}>
                {x.name}
              </option>
            ))}
          </select>

          {/* City Select */}
          <select
            name="city"
            value={form.city}
            onChange={handleChange}
            // تعطيل حقل المدينة إذا لم يتم اختيار بلد أو كانت قائمة المدن فارغة
            disabled={!form.country || cities.length === 0} 
            className="border p-2 rounded"
          >
            <option value="">Select City</option>
            {cities.map((x) => (
              <option key={x._id} value={x._id}>
                {x.name}
              </option>
            ))}
          </select>


          {/* Customer Group */}
          <select
            name="customer_group_id"
            value={form.customer_group_id}
            onChange={handleChange}
            className="border p-2 rounded col-span-2"
          >
            <option value="">Select Customer Group</option>
            {customerGroups.map((g) => (
              <option key={g._id} value={g._id}>
                {g.name}
              </option>
            ))}
          </select>

        </div>

        <button
          onClick={handleSubmit}
          className="mt-5 w-full bg-bg-primary text-white py-2 rounded hover:bg-purple-700 transition"
        >
          {loading ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}