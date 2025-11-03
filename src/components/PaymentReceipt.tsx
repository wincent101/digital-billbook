import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Download, X } from "lucide-react";
import html2canvas from "html2canvas";
import QRCode from "qrcode";
import { useToast } from "@/hooks/use-toast";

interface PaymentReceiptProps {
  transaction: any;
  onClose: () => void;
}

const getRankBadge = (rank: string) => {
  const colors: Record<string, string> = {
    standard: "bg-gray-500",
    silver: "bg-slate-400",
    gold: "bg-yellow-500",
    platinum: "bg-purple-500",
    vip: "bg-gradient-to-r from-purple-600 to-pink-600",
  };
  return colors[rank] || colors.standard;
};

export const PaymentReceipt = ({ transaction, onClose }: PaymentReceiptProps) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [businessName, setBusinessName] = useState("ชื่อร้านของคุณ");
  const [logoUrl, setLogoUrl] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    loadBusinessSettings();
    generateQRCode();
  }, []);

  const loadBusinessSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("business_settings")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setBusinessName(data.business_name);
        setLogoUrl(data.logo_url || "");
      }
    } catch (error) {
      console.error("Load business settings error:", error);
    }
  };

  const generateQRCode = async () => {
    try {
      if (transaction.qr_code_data) {
        const url = await QRCode.toDataURL(transaction.qr_code_data, {
          width: 300,
          margin: 1,
        });
        setQrCodeUrl(url);
      }
    } catch (error) {
      console.error("Generate QR code error:", error);
    }
  };

  const waitForImagesToLoad = async (element: HTMLElement) => {
    const images = element.querySelectorAll('img');
    const imagePromises = Array.from(images).map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve; // Resolve even on error to not block
      });
    });
    await Promise.all(imagePromises);
  };

  const downloadReceipt = async () => {
    if (!receiptRef.current) return;

    try {
      // รอให้ images ทั้งหมดโหลดเสร็จก่อน
      await waitForImagesToLoad(receiptRef.current);
      
      // รอเพิ่มอีกนิดเพื่อให้แน่ใจว่า QR code render เสร็จ
      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        allowTaint: true,
      });

      const imageUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `receipt-${transaction.transaction_number}.png`;
      link.href = imageUrl;
      link.click();

      // บันทึก URL ของรูปภาพลงฐานข้อมูล
      await supabase
        .from("pos_transactions")
        .update({ payment_image_url: imageUrl })
        .eq("id", transaction.id);

      toast({
        title: "สำเร็จ",
        description: "บันทึกใบแจ้งชำระเงินเรียบร้อยแล้ว",
      });
    } catch (error) {
      console.error("Download receipt error:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถบันทึกใบแจ้งชำระเงินได้",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-background border-b p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">ใบแจ้งชำระเงิน</h2>
          <div className="flex gap-2">
            <Button onClick={downloadReceipt} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              บันทึกรูปภาพ
            </Button>
            <Button onClick={onClose} variant="ghost" size="icon">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="p-8">
          <div ref={receiptRef} className="bg-white p-8 rounded-lg shadow-lg">
            {/* Header */}
            <div className="text-center mb-6 border-b pb-6">
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="h-20 mx-auto mb-4 object-contain"
                />
              )}
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                {businessName}
              </h1>
              <p className="text-lg font-semibold text-gray-600">
                ใบแจ้งชำระเงิน
              </p>
            </div>

            {/* Transaction Info */}
            <div className="mb-6 text-gray-700">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">เลขที่รายการ:</p>
                  <p className="font-semibold">{transaction.transaction_number}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">วันที่/เวลา:</p>
                  <p className="font-semibold">
                    {new Date(transaction.created_at).toLocaleString("th-TH", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
              {transaction.customer_name && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">ชื่อลูกค้า:</p>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-lg">{transaction.customer_name}</p>
                    {transaction.customer_rank && transaction.customer_rank !== "standard" && (
                      <span className={`px-3 py-1 rounded-full text-xs font-bold text-white ${getRankBadge(transaction.customer_rank)}`}>
                        {transaction.customer_rank.toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Items */}
            <div className="mb-6">
              <table className="w-full text-gray-700">
                <thead className="border-b-2 border-gray-300">
                  <tr>
                    <th className="text-left py-2">รายการ</th>
                    <th className="text-center py-2">จำนวน</th>
                    <th className="text-right py-2">ราคา/หน่วย</th>
                    <th className="text-right py-2">รวม</th>
                  </tr>
                </thead>
                <tbody>
                  {transaction.items?.map((item: any, index: number) => (
                    <tr key={index} className="border-b border-gray-200">
                      <td className="py-3">{item.name}</td>
                      <td className="text-center py-3">{item.quantity}</td>
                      <td className="text-right py-3">
                        ฿{item.price.toFixed(2)}
                      </td>
                      <td className="text-right py-3">
                        ฿{(item.price * item.quantity).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total */}
            <div className="mb-6 border-t-2 border-gray-300 pt-4">
              <div className="flex justify-between items-center text-2xl font-bold text-gray-800">
                <span>ยอดรวมทั้งหมด:</span>
                <span className="text-primary">
                  ฿{transaction.total_amount.toFixed(2)}
                </span>
              </div>
            </div>

            {/* QR Code */}
            {qrCodeUrl && (
              <div className="text-center mt-8">
                <p className="text-lg font-semibold text-gray-700 mb-4">
                  สแกน QR Code เพื่อชำระเงินผ่านพร้อมเพย์
                </p>
                <div className="flex justify-center">
                  <img src={qrCodeUrl} alt="QR Code" className="w-64 h-64" />
                </div>
                <p className="text-sm text-gray-500 mt-4">
                  จำนวนเงิน: ฿{transaction.total_amount.toFixed(2)}
                </p>
              </div>
            )}

            {/* Footer */}
            <div className="mt-8 text-center text-gray-500 text-sm border-t pt-4">
              <p>ขอบคุณที่ใช้บริการ</p>
              <p>โปรดตรวจสอบรายการก่อนชำระเงิน</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
