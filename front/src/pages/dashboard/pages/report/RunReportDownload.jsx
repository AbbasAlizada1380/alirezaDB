import React, { useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import moment from "moment-jalaali";
import { Download, Hash } from "lucide-react";

const BASE_URL = import.meta.env.VITE_BASE_URL;
import VazirmatnTTF from "../../../../../public/ttf/Vazirmatn.js";

const RunReportDownload = () => {
    const [runNumber, setRunNumber] = useState("");
    const [loading, setLoading] = useState(false);

    const handleDownload = async () => {
        if (!runNumber || isNaN(parseInt(runNumber))) {
            alert("لطفاً یک شماره رن معتبر وارد کنید");
            return;
        }

        try {
            setLoading(true);

            // Fetch packages data
            const response = await axios.get(`${BASE_URL}/packages/run?run=${runNumber}`);

            if (!response.data.success || !response.data.data || response.data.data.length === 0) {
                alert("هیچ پکیجی برای این شماره رن یافت نشد");
                setLoading(false);
                return;
            }

            const packages = response.data.data;

            // Calculate statistics
            const totalWeight = packages.reduce(
                (sum, pkg) => sum + (pkg.totalWeight || 0),
                0
            );
            const totalCash = packages.reduce(
                (sum, pkg) => sum + (pkg.totalCash || 0),
                0
            );
            const totalValue = packages.reduce(
                (sum, pkg) => sum + (pkg.value || 0),
                0
            );

            // ===================== PDF Generation =====================
            const doc = new jsPDF({
                orientation: "p",
                unit: "pt",
                format: "a4",
            });

            doc.addFileToVFS("Vazirmatn.ttf", VazirmatnTTF);
            doc.addFont("Vazirmatn.ttf", "Vazirmatn", "normal");
            doc.setFont("Vazirmatn");

            // Header
            doc.setFillColor(240, 240, 240);
            doc.rect(0, 0, doc.internal.pageSize.width, 70, "F");

            doc.setFontSize(18);
            doc.setTextColor(30, 41, 59);
            doc.text("گزارش پکیج‌های رن", doc.internal.pageSize.width - 40, 35, {
                align: "right",
            });

            doc.setFontSize(14);
            doc.setTextColor(59, 130, 246);
            doc.text(
                `شماره رن: ${runNumber}`,
                doc.internal.pageSize.width - 40,
                60,
                { align: "right" }
            );

            doc.setFontSize(10);
            doc.setTextColor(71, 85, 105);
            doc.text(
                `تاریخ تولید: ${moment().format("jYYYY/jMM/jDD HH:mm")}`,
                doc.internal.pageSize.width - 40,
                80,
                { align: "right" }
            );

            // Summary Section
            const summaryY = 100;

            doc.setFontSize(11);
            doc.setTextColor(71, 85, 105);
            doc.text("خلاصه گزارش:", doc.internal.pageSize.width - 40, summaryY, {
                align: "right",
            });

            doc.setFontSize(10);
            doc.text(
                `تعداد پکیج‌ها: ${packages.length} | وزن کل: ${totalWeight.toLocaleString("fa-AF")} کیلوگرم | ` +
                `مجموع نرخ: ${totalCash.toLocaleString("fa-AF")} افغانی | ` +
                `ارزش کل: ${totalValue.toLocaleString("fa-AF")} دالر`,
                doc.internal.pageSize.width - 40,
                summaryY + 20,
                { align: "right" }
            );

            // Table headers - REVERSED ORDER
            const headers = [
                [
                    "تعداد بسته",
                    "موقعیت",
                    "ترنزیت‌",
                    "ارزش",
                    "نرخ",
                    "تعداد بسته",
                    "وزن (kg)",
                    "تاریخ",
                    "گیرنده",
                    "فرستنده",
                    "شماره بیل",
                ],
            ];

            const data = packages.map((pkg, index) => [
                (pkg.packList?.length || 0).toLocaleString("fa-AF"),
                pkg.location || "-",
                pkg.transitWay || "-",
                (pkg.value || 0).toLocaleString("fa-AF"),
                (pkg.totalCash || 0).toLocaleString("fa-AF"),
                (pkg.piece || 0).toLocaleString("fa-AF"),
                (pkg.totalWeight || 0).toLocaleString("fa-AF"),
                moment(pkg.date || pkg.createdAt).format("jYYYY/jMM/jDD"),
                pkg.Receiver?.name || "-",
                pkg.Sender?.name || "-",
                pkg.id.toString()
            ]);

            autoTable(doc, {
                head: headers,
                body: data,
                startY: summaryY + 40,
                margin: { right: 20, left: 20 },
                styles: {
                    font: "Vazirmatn",
                    fontStyle: "normal",
                    halign: "center",
                    fontSize: 8,
                    cellPadding: 5,
                    lineColor: [229, 231, 235],
                    lineWidth: 0.5,
                },
                headStyles: {
                    font: "Vazirmatn",
                    fontStyle: "bold",
                    halign: "center",
                    fillColor: [59, 130, 246],
                    textColor: [255, 255, 255],
                    fontSize: 9,
                    cellPadding: 8,
                },
                alternateRowStyles: {
                    fillColor: [249, 250, 251],
                },
                didParseCell: function (data) {
                    data.cell.styles.font = "Vazirmatn";
                    data.cell.styles.fontStyle = "normal";
                },
                theme: "striped",
                pageBreak: 'auto',
            });

            // Footer with signature (optional)
            const finalY = doc.lastAutoTable.finalY + 30;

            if (finalY < doc.internal.pageSize.height - 50) {
                doc.setFontSize(10);
                doc.setTextColor(100, 116, 139);
                doc.text("امضاء و مهر:", doc.internal.pageSize.width - 40, finalY, {
                    align: "right",
                });
                doc.line(
                    doc.internal.pageSize.width - 200,
                    finalY + 5,
                    doc.internal.pageSize.width - 40,
                    finalY + 5
                );

                doc.setFontSize(8);
                doc.text(
                    `تعداد کل رکوردها: ${packages.length}`,
                    40,
                    doc.internal.pageSize.height - 20,
                    { align: "left" }
                );
            }

            // Save PDF
            doc.save(`run_report_${runNumber}_${moment().format("YYYY-MM-DD")}.pdf`);

        } catch (error) {
            console.error("Error fetching packages:", error);
            alert("خطا در دریافت اطلاعات!");
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleDownload();
        }
    };

    return (
        <div className="">
            <div className="">
                {/* Simple Card */}
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    {/* Header */}
                    <div className="flex items-center gap-6 mb-10">
                        <div className="flex-shrink-0 w-20 h-20 flex items-center justify-center bg-gradient-to-br from-blue-900 to-indigo-800 rounded-2xl shadow-lg">
                            <Hash className="w-10 h-10 text-white" />
                        </div>

                        <div className="text-right">
                            <h1 className="text-2xl font-bold text-gray-800 mb-2">
                                دانلود گزارش ران
                            </h1>
                            <p className="text-gray-600 leading-relaxed">
                                شماره ران را وارد کرده و گزارش را دانلود کنید
                            </p>
                        </div>
                    </div>

                    {/* Input Field */}
                    <div className="space-y-4 mb-3">
                        <div className="">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg">
                                    <Hash className="w-5 h-5 text-blue-900" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700">
                                        شماره رن
                                    </label>
                                    <p className="text-xs text-gray-500 mt-1">
                                        شماره رن مورد نظر برای گزارش‌گیری
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <input
                                        type="number"
                                        min="1"
                                        className="w-full px-5 py-3 bg-gray-50 border border-gray-300 rounded-lg 
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
        transition-all duration-300 text-gray-800 text-lg font-medium
        placeholder-gray-400"
                                        placeholder="شماره ران (مثال: 3)"
                                        value={runNumber}
                                        onChange={(e) => setRunNumber(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                        autoFocus
                                    />
                                </div>

                                <div className="flex-shrink-0">
                                    <button
                                        onClick={handleDownload}
                                        disabled={loading || !runNumber}
                                        className="h-full group relative flex items-center justify-center gap-3 
        bg-blue-900 
        text-white py-3 px-8 rounded-xl font-bold text-lg
        transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/25
        disabled:opacity-50 disabled:cursor-not-allowed
        overflow-hidden min-w-[180px]"
                                    >
                                        {/* Background animation */}
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>

                                        {loading ? (
                                            <>
                                                <div className="relative z-10 w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                <span className="relative z-10 text-sm">در حال دانلود...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Download className="w-5 h-5 relative z-10" />
                                                <span className="relative z-10 text-sm">دانلود PDF</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RunReportDownload;