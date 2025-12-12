import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SalesData {
  date: string;
  amount: number;
  count: number;
}

interface SummaryData {
  totalSales: number;
  totalOrders: number;
  averageOrder: number;
  completedOrders: number;
}

interface TopProduct {
  name: string;
  quantity: number;
  revenue: number;
}

interface TopCustomer {
  name: string;
  totalOrders: number;
  totalSpent: number;
}

// Function to load Thai font
const loadThaiFont = async (doc: jsPDF) => {
  try {
    // Fetch Sarabun font from jsDelivr CDN (TTF format required for jsPDF)
    const fontUrl = "https://cdn.jsdelivr.net/npm/font-th-sarabun-new@1.0.0/fonts/THSarabunNew-webfont.ttf";
    const response = await fetch(fontUrl);
    const arrayBuffer = await response.arrayBuffer();
    
    // Convert ArrayBuffer to base64
    const base64 = btoa(
      new Uint8Array(arrayBuffer)
        .reduce((data, byte) => data + String.fromCharCode(byte), '')
    );
    
    // Add font to jsPDF
    doc.addFileToVFS("THSarabunNew.ttf", base64);
    doc.addFont("THSarabunNew.ttf", "THSarabunNew", "normal");
    doc.setFont("THSarabunNew");
    
    return true;
  } catch (error) {
    console.error("Failed to load Thai font:", error);
    return false;
  }
};

export const generatePDFReport = async (
  summary: SummaryData,
  dailyData: SalesData[],
  weeklyData: SalesData[],
  monthlyData: SalesData[],
  reportType: "daily" | "weekly" | "monthly" | "full"
) => {
  try {
    toast.info("กำลังสร้างรายงาน PDF...");

    // Fetch additional data for full report
    let topProducts: TopProduct[] = [];
    let topCustomers: TopCustomer[] = [];
    let businessSettings: { business_name: string; phone_number: string | null; logo_url: string | null } | null = null;

    // Get business settings
    const { data: settingsData } = await supabase
      .from("business_settings")
      .select("business_name, phone_number, logo_url")
      .limit(1)
      .single();
    
    businessSettings = settingsData;

    // Get top products
    const { data: productData } = await supabase
      .from("transaction_items")
      .select("product_name, quantity, subtotal");
    
    if (productData) {
      const productMap = new Map<string, { quantity: number; revenue: number }>();
      productData.forEach(item => {
        const existing = productMap.get(item.product_name) || { quantity: 0, revenue: 0 };
        productMap.set(item.product_name, {
          quantity: existing.quantity + item.quantity,
          revenue: existing.revenue + Number(item.subtotal)
        });
      });
      
      topProducts = Array.from(productMap.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);
    }

    // Get top customers
    const { data: transactionData } = await supabase
      .from("pos_transactions")
      .select("customer_id, total_amount, customers(name)")
      .not("customer_id", "is", null);
    
    if (transactionData) {
      const customerMap = new Map<string, { name: string; totalOrders: number; totalSpent: number }>();
      transactionData.forEach(t => {
        const customer = t.customers as { name: string } | null;
        if (customer && t.customer_id) {
          const existing = customerMap.get(t.customer_id) || { name: customer.name, totalOrders: 0, totalSpent: 0 };
          customerMap.set(t.customer_id, {
            name: customer.name,
            totalOrders: existing.totalOrders + 1,
            totalSpent: existing.totalSpent + Number(t.total_amount)
          });
        }
      });
      
      topCustomers = Array.from(customerMap.values())
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 10);
    }

    // Create PDF with A4 dimensions
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    // Load Thai font
    const fontLoaded = await loadThaiFont(doc);
    if (!fontLoaded) {
      toast.error("ไม่สามารถโหลดฟอนต์ภาษาไทยได้");
      return;
    }

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let yPosition = margin;

    // Helper function to format currency
    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat("th-TH", {
        style: "decimal",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(value) + " บาท";
    };

    // Helper function to check if we need a new page
    const checkNewPage = (requiredSpace: number) => {
      if (yPosition + requiredSpace > pageHeight - margin) {
        doc.addPage();
        doc.setFont("THSarabunNew");
        yPosition = margin;
        return true;
      }
      return false;
    };

    // === HEADER ===
    // Background gradient effect (simulated with rectangles)
    doc.setFillColor(103, 58, 183); // Purple primary
    doc.rect(0, 0, pageWidth, 50, "F");
    
    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.text("รายงานสรุปผลประกอบการ", pageWidth / 2, 22, { align: "center" });
    
    // Subtitle
    doc.setFontSize(16);
    const businessName = businessSettings?.business_name || "ร้านค้าในเครือ Kwint.shop";
    doc.text(businessName, pageWidth / 2, 34, { align: "center" });
    
    // Report date
    doc.setFontSize(12);
    doc.text(`วันที่ออกรายงาน: ${format(new Date(), "d MMMM yyyy เวลา HH:mm น.", { locale: th })}`, pageWidth / 2, 44, { align: "center" });

    yPosition = 60;

    // === SUMMARY SECTION ===
    doc.setTextColor(103, 58, 183);
    doc.setFontSize(18);
    doc.text("ภาพรวมผลประกอบการ", margin, yPosition);
    yPosition += 10;

    // Summary boxes
    const boxWidth = (pageWidth - margin * 2 - 15) / 4;
    const boxHeight = 28;
    const boxes = [
      { label: "ยอดขายรวม", value: formatCurrency(summary.totalSales), color: [103, 58, 183] as [number, number, number] },
      { label: "จำนวนออเดอร์", value: summary.totalOrders.toString() + " รายการ", color: [156, 39, 176] as [number, number, number] },
      { label: "ค่าเฉลี่ย/ออเดอร์", value: formatCurrency(summary.averageOrder), color: [123, 31, 162] as [number, number, number] },
      { label: "ชำระแล้ว", value: summary.completedOrders.toString() + " รายการ", color: [74, 20, 140] as [number, number, number] }
    ];

    boxes.forEach((box, index) => {
      const x = margin + (boxWidth + 5) * index;
      doc.setFillColor(...box.color);
      doc.roundedRect(x, yPosition, boxWidth, boxHeight, 3, 3, "F");
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.text(box.label, x + boxWidth / 2, yPosition + 10, { align: "center" });
      doc.setFontSize(11);
      doc.text(box.value, x + boxWidth / 2, yPosition + 20, { align: "center" });
    });

    yPosition += boxHeight + 15;

    // === SALES DATA TABLE ===
    const tableData = reportType === "daily" || reportType === "full" ? dailyData :
                      reportType === "weekly" ? weeklyData : monthlyData;
    
    const tableTitle = reportType === "daily" ? "ยอดขายรายวัน (7 วันล่าสุด)" :
                       reportType === "weekly" ? "ยอดขายรายสัปดาห์ (8 สัปดาห์)" :
                       reportType === "monthly" ? "ยอดขายรายเดือน (12 เดือน)" :
                       "ยอดขายรายวัน (7 วันล่าสุด)";

    doc.setTextColor(103, 58, 183);
    doc.setFontSize(16);
    doc.text(tableTitle, margin, yPosition);
    yPosition += 5;

    autoTable(doc, {
      startY: yPosition,
      head: [["ช่วงเวลา", "ยอดขาย", "จำนวนออเดอร์", "ค่าเฉลี่ย/ออเดอร์"]],
      body: tableData.map(item => [
        item.date,
        formatCurrency(item.amount),
        item.count.toString(),
        formatCurrency(item.count > 0 ? item.amount / item.count : 0)
      ]),
      styles: {
        fontSize: 11,
        cellPadding: 4,
        font: "THSarabunNew"
      },
      headStyles: {
        fillColor: [103, 58, 183],
        textColor: [255, 255, 255],
        fontStyle: "normal",
        font: "THSarabunNew"
      },
      alternateRowStyles: {
        fillColor: [245, 243, 255]
      },
      margin: { left: margin, right: margin }
    });

    yPosition = (doc as typeof doc & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;

    // === FULL REPORT ADDITIONAL SECTIONS ===
    if (reportType === "full") {
      // Weekly data
      checkNewPage(80);
      doc.setTextColor(103, 58, 183);
      doc.setFontSize(16);
      doc.text("ยอดขายรายสัปดาห์ (8 สัปดาห์)", margin, yPosition);
      yPosition += 5;

      autoTable(doc, {
        startY: yPosition,
        head: [["ช่วงเวลา", "ยอดขาย", "จำนวนออเดอร์", "ค่าเฉลี่ย/ออเดอร์"]],
        body: weeklyData.map(item => [
          item.date,
          formatCurrency(item.amount),
          item.count.toString(),
          formatCurrency(item.count > 0 ? item.amount / item.count : 0)
        ]),
        styles: { fontSize: 11, cellPadding: 4, font: "THSarabunNew" },
        headStyles: { fillColor: [156, 39, 176], textColor: [255, 255, 255], fontStyle: "normal", font: "THSarabunNew" },
        alternateRowStyles: { fillColor: [252, 243, 255] },
        margin: { left: margin, right: margin }
      });

      yPosition = (doc as typeof doc & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;

      // Monthly data
      checkNewPage(100);
      doc.setTextColor(103, 58, 183);
      doc.setFontSize(16);
      doc.text("ยอดขายรายเดือน (12 เดือน)", margin, yPosition);
      yPosition += 5;

      autoTable(doc, {
        startY: yPosition,
        head: [["เดือน", "ยอดขาย", "จำนวนออเดอร์", "ค่าเฉลี่ย/ออเดอร์"]],
        body: monthlyData.map(item => [
          item.date,
          formatCurrency(item.amount),
          item.count.toString(),
          formatCurrency(item.count > 0 ? item.amount / item.count : 0)
        ]),
        styles: { fontSize: 11, cellPadding: 4, font: "THSarabunNew" },
        headStyles: { fillColor: [123, 31, 162], textColor: [255, 255, 255], fontStyle: "normal", font: "THSarabunNew" },
        alternateRowStyles: { fillColor: [248, 243, 255] },
        margin: { left: margin, right: margin }
      });

      yPosition = (doc as typeof doc & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;

      // Top Products
      if (topProducts.length > 0) {
        checkNewPage(80);
        doc.setTextColor(103, 58, 183);
        doc.setFontSize(16);
        doc.text("สินค้าขายดี Top 10", margin, yPosition);
        yPosition += 5;

        autoTable(doc, {
          startY: yPosition,
          head: [["อันดับ", "ชื่อสินค้า", "จำนวนที่ขาย", "รายได้"]],
          body: topProducts.map((product, index) => [
            (index + 1).toString(),
            product.name,
            product.quantity.toString(),
            formatCurrency(product.revenue)
          ]),
          styles: { fontSize: 11, cellPadding: 4, font: "THSarabunNew" },
          headStyles: { fillColor: [74, 20, 140], textColor: [255, 255, 255], fontStyle: "normal", font: "THSarabunNew" },
          alternateRowStyles: { fillColor: [245, 240, 255] },
          margin: { left: margin, right: margin }
        });

        yPosition = (doc as typeof doc & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
      }

      // Top Customers
      if (topCustomers.length > 0) {
        checkNewPage(80);
        doc.setTextColor(103, 58, 183);
        doc.setFontSize(16);
        doc.text("ลูกค้าประจำ Top 10", margin, yPosition);
        yPosition += 5;

        autoTable(doc, {
          startY: yPosition,
          head: [["อันดับ", "ชื่อลูกค้า", "จำนวนออเดอร์", "ยอดสั่งซื้อรวม"]],
          body: topCustomers.map((customer, index) => [
            (index + 1).toString(),
            customer.name,
            customer.totalOrders.toString(),
            formatCurrency(customer.totalSpent)
          ]),
          styles: { fontSize: 11, cellPadding: 4, font: "THSarabunNew" },
          headStyles: { fillColor: [103, 58, 183], textColor: [255, 255, 255], fontStyle: "normal", font: "THSarabunNew" },
          alternateRowStyles: { fillColor: [245, 243, 255] },
          margin: { left: margin, right: margin }
        });
      }
    }

    // === FOOTER ===
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont("THSarabunNew");
      doc.setFillColor(103, 58, 183);
      doc.rect(0, pageHeight - 15, pageWidth, 15, "F");
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.text(businessName, margin, pageHeight - 5);
      doc.text(`หน้า ${i} / ${totalPages}`, pageWidth - margin, pageHeight - 5, { align: "right" });
    }

    // Generate filename
    const dateStr = format(new Date(), "yyyy-MM-dd_HHmm");
    const typeStr = reportType === "full" ? "full" : reportType;
    const filename = `report_${typeStr}_${dateStr}.pdf`;

    // Save PDF
    doc.save(filename);
    toast.success("ดาวน์โหลดรายงาน PDF สำเร็จ!");

  } catch (error) {
    console.error("PDF generation error:", error);
    toast.error("เกิดข้อผิดพลาดในการสร้าง PDF");
  }
};
