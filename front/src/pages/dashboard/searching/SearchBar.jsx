// searching/SearchBar.jsx
import React, { useState, useRef, useEffect } from "react";
import { FaSearch, FaTimes } from "react-icons/fa";
import { packageService } from "../services/packageService";

const SearchBar = ({
  onSearchResults,
  onSearchError,
  placeholder = "جستجو...",
  debounceDelay = 5000,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceTimerRef = useRef(null);

  const handleSearch = async (term) => {
    if (term.trim() === "") {
      onSearchResults([]);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    setHasSearched(true);

    try {
      const results = await packageService.searchPackages(term);
      onSearchResults(results);
    } catch (error) {
      console.error("Search error:", error);
      onSearchError?.(error.message || "خطا در جستجو");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    handleSearch(searchTerm);
  };

  const handleClear = () => {
    setSearchTerm("");
    setHasSearched(false);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    onSearchResults([]);
  };

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  return (
    <div className="search-container relative">
  <form onSubmit={handleSubmit} className="relative">
    <div className="relative group">
      <input
        type="text"
        value={searchTerm}
        onChange={handleInputChange}
        placeholder={placeholder || "جستجو..."}
        className="w-full pr-10 pl-10 py-3 text-right text-gray-800 bg-white  rounded-lg focus:ring-3 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all duration-300 shadow-sm hover:shadow-md focus:shadow-lg focus:pl-12"
        dir="rtl"
        aria-label="Search"
        disabled={isLoading}
      />
      
      {/* Search Icon */}
      <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
        {isLoading ? (
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-200 border-t-blue-600"></div>
        ) : (
          <FaSearch className="text-gray-400 h-4 w-4 group-focus-within:text-blue-500 transition-colors duration-200" />
        )}
      </div>
      
      {/* Clear Button */}
      {searchTerm && !isLoading && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1"
          aria-label="Clear search"
        >
          <FaTimes className="text-gray-400 hover:text-gray-600 h-4 w-4 transition-colors" />
        </button>
      )}
      
      {/* Submit (Inside Input - Compact) */}
      {searchTerm && (
        <button
          type="submit"
          className="absolute left-10 top-1/2 transform -translate-y-1/2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors duration-200"
          disabled={isLoading}
        >
          {isLoading ? "..." : "برو"}
        </button>
      )}
    </div>
  </form>
  
  
</div>
  );
};

export default SearchBar;
