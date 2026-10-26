import React from "react";
import { CgNotes } from "react-icons/cg";
const BillSummary = ({ record }) => {
  return (
    <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-lg shadow-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-lg">
          <div className="">
            <CgNotes className="text-cyan-800" size={24} />
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">خلاصه بیل</h2>
          <p className="text-gray-600 text-sm">جمع‌بندی کلی هزینه‌ها</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Digital Printing Total */}
        <div className="bg-white rounded-md p-4 border border-cyan-100 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-semibold text-gray-600 mb-2">
                چاپ دیجیتال
              </p>
              <p className="text-2xl font-bold text-blue-600">
                {record.total_money_digital}
              </p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
            </div>
          </div>
          <p className="text-base text-gray-500 mt-2">افغانی</p>
        </div>

        {/* Offset Printing Total */}
        <div className="bg-white rounded-md p-4 border border-cyan-100 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-semibold text-gray-600 mb-2">
                چاپ افست
              </p>
              <p className="text-2xl font-bold text-green-600">
                {record.total_money_offset}
              </p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
            </div>
          </div>
          <p className="text-base text-gray-500 mt-2">افغانی</p>
        </div>

        {/* Grand Total */}
        <div className="bg-white rounded-md p-4 border border-cyan-100 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-semibold text-gray-600 mb-2">
                مجموع کل
              </p>
              <p className="text-2xl font-bold">{record.total}</p>
            </div>
            <div className="w-10 h-10 bg-blue-400 rounded-full flex items-center justify-center">
              <div className="w-4 h-4 bg-white rounded"></div>
            </div>
          </div>
          <p className="text-base text-gray-500 mt-2">افغانی</p>
        </div>
      </div>

      {/* Detailed Breakdown */}
      <div className="bg-white rounded-md p-4 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          جزئیات محاسبات
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-gray-600">مجموع چاپ دیجیتال:</span>
            <span className="font-semibold text-blue-600">
              {record.total_money_digital} افغانی
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-gray-600">مجموع چاپ افست:</span>
            <span className="font-semibold text-green-600">
              {record.total_money_offset} افغانی
            </span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-gray-700 font-semibold">مبلغ نهایی:</span>
            <span className="text-xl font-bold text-gray-800">
              {record.total} افغانی
            </span>
          </div>
        </div>
      </div>

      {/* Status Indicator */}
      <div className="mt-4 flex items-center justify-between bg-gray-50 rounded-lg p-3">
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${
              parseFloat(record.total) > 0 ? "bg-green-500" : "bg-gray-400"
            }`}
          ></div>
          <span className="text-sm text-gray-600">
            {parseFloat(record.total) > 0 ? "فاکتور فعال" : "فاکتور خالی"}
          </span>
        </div>
        <div className="text-sm text-gray-500">
          {new Date().toLocaleDateString("fa-IR")}
        </div>
      </div>
    </div>
  );
};

export default BillSummary;
