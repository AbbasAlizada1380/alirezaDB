// src/components/bills/SearchBillsBar.jsx
import { useState } from "react";
import { FaSearch, FaTimes } from "react-icons/fa";

export default function SearchBillsBar({ onSearch, initialValue = "" }) {
  const [value, setValue] = useState(initialValue);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch?.(value.trim());
  };

  const handleClear = () => {
    setValue("");
    onSearch?.("");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 w-full sm:w-auto"
    >
      <div className="relative flex-1 sm:w-72">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="جستجو با مشتری، تماس، یا شماره بل..."
          className="w-full border border-gray-300 rounded-lg pr-10 pl-3 py-2 text-sm bg-white focus:ring-2 focus:ring-primary focus:border-primary outline-none"
        />
        <FaSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none" />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            title="پاک کردن"
          >
            <FaTimes className="text-xs" />
          </button>
        )}
      </div>

      <button
        type="submit"
        className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition flex items-center gap-2"
      >
        <FaSearch className="text-xs" />
        جستجو
      </button>
    </form>
  );
}