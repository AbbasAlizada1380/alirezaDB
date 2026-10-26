import React, { useEffect } from "react";
import moment from "moment-jalaali";
import { FaPhone, FaPrint, FaTimes } from "react-icons/fa";

const PrintOrderBill = ({ isOpen, onClose, order, autoPrint }) => {
  if (!isOpen || !order) return null;

  // Helper functions to check if items are filled
  const isDigitalItemFilled = (item) => {
    return (
      item.name?.trim() !== "" ||
      item.quantity > 0 ||
      item.height > 0 ||
      item.weight > 0 ||
      item.price_per_unit > 0 ||
      item.money > 0
    );
  };

  const isOffsetItemFilled = (item) => {
    return (
      item.name?.trim() !== "" ||
      item.quantity > 0 ||
      item.price_per_unit > 0 ||
      item.money > 0
    );
  };

  // Auto print when component mounts if autoPrint is true
  useEffect(() => {
    if (autoPrint && isOpen) {
      // Small delay to ensure the component is fully rendered
      const timer = setTimeout(() => {
        window.print();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [autoPrint, isOpen]);

  // Filter out empty items
  const filledDigital = (order.digital || []).filter(isDigitalItemFilled);
  const filledOffset = (order.offset || []).filter(isOffsetItemFilled);

  // Recalculate totals based on filled items only
  const total_money_digital = filledDigital.reduce(
    (sum, d) => sum + Number(d.money || 0),
    0
  );
  const total_money_offset = filledOffset.reduce(
    (sum, o) => sum + Number(o.money || 0),
    0
  );
  const total = total_money_digital + total_money_offset;
  const remained = total - (order.recip || 0);

  const today = moment().format("jYYYY/jMM/jDD");
  const billNumber = order.id
    ? `ORD-${order.id}`
    : `ORD-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

  const formatCurrency = (num) => {
    const number = Number(num || 0);
    return number.toLocaleString("fa-AF") + " افغانی";
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4 print:bg-transparent print:p-0">
      {/* A5 Container */}
      <div className="">
        <div
          id="printable-area"
          className="bg-white shadow-2xl rounded-lg overflow-hidden flex flex-col print:shadow-none print:rounded-none"
          style={{
            width: "148mm",
            height: "210mm",
            direction: "rtl",
          }}
        >
          {/* Header */}
          <div className="bg-gradient-to-l from-cyan-800 to-cyan-600 text-white p-4 text-center border-b-4 border-cyan-900">
            <h1 className="text-xl font-bold mb-1">چاپخانه اکبر</h1>
            <p className="text-sm opacity-90">Akbar Printing House</p>
            <div className="flex justify-between items-center mt-2 text-xs">
              <span>شماره: {billNumber}</span>
              <span>تاریخ: {today}</span>
            </div>
          </div>

          {/* Customer Info */}
          <div className="p-3 border-b border-gray-200">
            <h2 className="text-sm font-bold text-gray-700 mb-2 border-b pb-1 border-gray-300">
              معلومات مشتری
            </h2>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="font-semibold">نام:</span>{" "}
                {order.customer?.name || order.name || "—"}
              </div>
              <div>
                <span className="font-semibold">شماره تماس:</span>{" "}
                {order.customer?.phone_number || order.phone_number || "—"}
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 p-3 overflow-auto">
            {/* Digital Printing Section */}
            {filledDigital.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-bold text-green-700 mb-2 bg-green-50 p-2 rounded border-r-4 border-green-500">
                  چاپ دیجیتال
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border border-gray-300">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="border border-gray-300 p-1 text-center w-6">
                          #
                        </th>
                        <th className="border border-gray-300 p-1 text-center">
                          شرح
                        </th>
                        <th className="border border-gray-300 p-1 text-center w-12">
                          تعداد
                        </th>
                        <th className="border border-gray-300 p-1 text-center w-16">
                          ارتفاع
                        </th>
                        <th className="border border-gray-300 p-1 text-center w-16">
                          عرض
                        </th>
                        <th className="border border-gray-300 p-1 text-center w-20">
                          قیمت واحد
                        </th>
                        <th className="border border-gray-300 p-1 text-center w-20">
                          مبلغ
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filledDigital.map((d, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="border border-gray-300 p-1 text-center">
                            {i + 1}
                          </td>
                          <td className="border border-gray-300 p-1 text-right">
                            {d.name || "—"}
                          </td>
                          <td className="border border-gray-300 p-1 text-center">
                            {d.quantity || 0}
                          </td>
                          <td className="border border-gray-300 p-1 text-center">
                            {d.height || 0}
                          </td>
                          <td className="border border-gray-300 p-1 text-center">
                            {d.weight || 0}
                          </td>
                          <td className="border border-gray-300 p-1 text-center">
                            {formatCurrency(d.price_per_unit || 0)}
                          </td>
                          <td className="border border-gray-300 p-1 text-center font-semibold">
                            {formatCurrency(d.money || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-end mt-1 text-xs font-bold text-green-700">
                  مجموع: {formatCurrency(total_money_digital)}
                </div>
              </div>
            )}

            {/* Offset Printing Section */}
            {filledOffset.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-bold text-purple-700 mb-2 bg-purple-50 p-2 rounded border-r-4 border-purple-500">
                  چاپ افست
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border border-gray-300">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="border border-gray-300 p-1 text-center w-6">
                          #
                        </th>
                        <th className="border border-gray-300 p-1 text-center">
                          شرح
                        </th>
                        <th className="border border-gray-300 p-1 text-center w-12">
                          تعداد
                        </th>
                        <th className="border border-gray-300 p-1 text-center w-20">
                          قیمت واحد
                        </th>
                        <th className="border border-gray-300 p-1 text-center w-20">
                          مبلغ
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filledOffset.map((o, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="border border-gray-300 p-1 text-center">
                            {i + 1}
                          </td>
                          <td className="border border-gray-300 p-1 text-right">
                            {o.name || "—"}
                          </td>
                          <td className="border border-gray-300 p-1 text-center">
                            {o.quantity || 0}
                          </td>
                          <td className="border border-gray-300 p-1 text-center">
                            {formatCurrency(o.price_per_unit || 0)}
                          </td>
                          <td className="border border-gray-300 p-1 text-center font-semibold">
                            {formatCurrency(o.money || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-end mt-1 text-xs font-bold text-purple-700">
                  مجموع: {formatCurrency(total_money_offset)}
                </div>
              </div>
            )}

            {/* No Items Message */}
            {filledDigital.length === 0 && filledOffset.length === 0 && (
              <div className="text-center py-8 text-gray-500 text-sm border border-dashed border-gray-300 rounded-lg">
                هیچ محصولی ثبت نشده است
              </div>
            )}
          </div>

          {/* Bill Summary */}
          <div className="border-t border-gray-300 bg-gray-50 p-3">
            <div className="space-y-1 text-xs">
              {filledDigital.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">مجموع چاپ دیجیتال:</span>
                  <span className="font-semibold">
                    {formatCurrency(total_money_digital)}
                  </span>
                </div>
              )}
              {filledOffset.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">مجموع چاپ افست:</span>
                  <span className="font-semibold">
                    {formatCurrency(total_money_offset)}
                  </span>
                </div>
              )}
              <div className="flex justify-between font-bold border-t border-gray-300 pt-1 text-sm">
                <span>مجموع کل:</span>
                <span className="text-cyan-800">{formatCurrency(total)}</span>
              </div>
              <div className="flex justify-between">
                <span>مقدار پرداختی:</span>
                <span className="text-green-600">
                  {formatCurrency(order.recip || 0)}
                </span>
              </div>
              <div className="flex justify-between font-bold border-t border-gray-300 pt-1">
                <span
                  className={remained > 0 ? "text-red-600" : "text-green-600"}
                >
                  باقیمانده:
                </span>
                <span
                  className={remained > 0 ? "text-red-600" : "text-green-600"}
                >
                  {formatCurrency(remained)}
                </span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-800 text-white p-3 text-center text-xs">
            <div className="flex items-center justify-center gap-2 mb-1">
              <FaPhone className="text-cyan-300" />
              <span>تماس: ۰۷۹۳ـــ۰۰۰۰۰۰</span>
            </div>
            <p className="text-cyan-200">تشکر از اعتماد شما به چاپخانه اکبر!</p>
          </div>
        </div>
      </div>

      {/* Action Buttons - Only Close and Print */}
      <div className="absolute bottom-6 left-6 flex gap-3 print:hidden">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center gap-2 shadow-lg transition-colors"
        >
          <FaTimes size={14} /> بستن
        </button>
        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg flex items-center gap-2 shadow-lg transition-colors"
        >
          <FaPrint size={14} /> چاپ فاکتور
        </button>
      </div>
      {/* Action Buttons - Only show if not auto printing */}
      {!autoPrint && (
        <div className="absolute bottom-6 left-6 flex gap-3 print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center gap-2 shadow-lg transition-colors"
          >
            <FaTimes size={14} /> بستن
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg flex items-center gap-2 shadow-lg transition-colors"
          >
            <FaPrint size={14} /> چاپ فاکتور
          </button>
        </div>
      )}
      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          @page {
            size: A5 portrait;
            margin: 0;
          }
          body * {
            visibility: hidden;
          }
          #printable-area,
          #printable-area * {
            visibility: visible;
          }
          #printable-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 148mm !important;
            height: 210mm !important;
            margin: 0;
            padding: 0;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
          .print-hidden {
            display: none !important;
          }
        }

        /* Hide scrollbars for print */
        @media print {
          ::-webkit-scrollbar {
            display: none;
          }
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default PrintOrderBill;
