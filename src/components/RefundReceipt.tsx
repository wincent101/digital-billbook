import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import html2canvas from "html2canvas";
import { toast } from "sonner";

interface Refund {
  id: string;
  refund_number: string;
  refund_amount: number;
  reason: string;
  bank_name: string;
  account_number: string;
  account_name: string | null;
  status: string;
  created_at: string;
  transaction_id: string;
}

interface Transaction {
  id: string;
  transaction_number: string;
  total_amount: number;
  created_at: string;
}

interface BusinessSettings {
  business_name: string;
  logo_url: string | null;
  phone_number: string | null;
  signature_url: string | null;
}

interface RefundReceiptProps {
  refund: Refund;
  transaction: Transaction;
  onClose: () => void;
}

export default function RefundReceipt({ refund, transaction, onClose }: RefundReceiptProps) {
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadBusinessSettings();
  }, []);

  const loadBusinessSettings = async () => {
    const { data } = await supabase
      .from("business_settings")
      .select("*")
      .maybeSingle();

    if (data) {
      setBusinessSettings(data);
    }
  };

  const handleDownload = async () => {
    if (!receiptRef.current) return;

    try {
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        allowTaint: true,
        onclone: (clonedDoc) => {
          const images = clonedDoc.getElementsByTagName("img");
          for (let i = 0; i < images.length; i++) {
            const img = images[i];
            if (img.src && !img.src.startsWith("data:")) {
              const originalImg = new Image();
              originalImg.crossOrigin = "anonymous";
              originalImg.src = img.src;
              const tempCanvas = document.createElement("canvas");
              tempCanvas.width = originalImg.naturalWidth || 100;
              tempCanvas.height = originalImg.naturalHeight || 100;
              const ctx = tempCanvas.getContext("2d");
              if (ctx) {
                ctx.drawImage(originalImg, 0, 0);
                img.src = tempCanvas.toDataURL("image/png");
              }
            }
          }
        },
      });

      const link = document.createElement("a");
      link.download = `refund-${refund.refund_number}.png`;
      link.href = canvas.toDataURL();
      link.click();

      toast.success("ดาวน์โหลดใบคืนเงินสำเร็จ");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("ไม่สามารถดาวน์โหลดได้");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4 print:hidden">
          <Button variant="ghost" onClick={onClose}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            กลับ
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              พิมพ์
            </Button>
            <Button onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              ดาวน์โหลด
            </Button>
          </div>
        </div>

        <Card ref={receiptRef} className="bg-white text-black">
          <CardHeader className="text-center border-b pb-4">
            {businessSettings?.logo_url && (
              <img
                src={businessSettings.logo_url}
                alt="Logo"
                className="h-16 mx-auto mb-2 object-contain"
              />
            )}
            <h1 className="text-2xl font-bold">{businessSettings?.business_name || "ชื่อร้าน"}</h1>
            {businessSettings?.phone_number && (
              <p className="text-sm text-gray-600">โทร: {businessSettings.phone_number}</p>
            )}
            <div className="mt-4 py-2 bg-red-50 rounded-lg">
              <h2 className="text-xl font-bold text-red-600">ใบคืนเงิน (Refund)</h2>
            </div>
          </CardHeader>

          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">เลขที่ใบคืนเงิน</p>
                <p className="font-semibold">{refund.refund_number}</p>
              </div>
              <div className="text-right">
                <p className="text-gray-500">วันที่</p>
                <p className="font-semibold">
                  {format(new Date(refund.created_at), "d MMMM yyyy HH:mm", { locale: th })}
                </p>
              </div>
            </div>

            <div className="border rounded-lg p-4 bg-gray-50">
              <h3 className="font-semibold mb-3 text-gray-700">อ้างอิงรายการ</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-gray-500">เลขที่รายการ</p>
                  <p className="font-medium">{transaction.transaction_number}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-500">ยอดรวมเดิม</p>
                  <p className="font-medium">฿{transaction.total_amount.toLocaleString()}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-500">วันที่ทำรายการ</p>
                  <p className="font-medium">
                    {format(new Date(transaction.created_at), "d MMMM yyyy HH:mm", { locale: th })}
                  </p>
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-3 text-gray-700">รายละเอียดการคืนเงิน</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-500">เหตุผล</p>
                  <p className="font-medium">{refund.reason}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-gray-500">ธนาคาร</p>
                    <p className="font-medium">{refund.bank_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">เลขบัญชี</p>
                    <p className="font-medium">{refund.account_number}</p>
                  </div>
                </div>
                {refund.account_name && (
                  <div>
                    <p className="text-gray-500">ชื่อบัญชี</p>
                    <p className="font-medium">{refund.account_name}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t-2 border-dashed pt-4">
              <div className="flex justify-between items-center text-lg">
                <span className="font-semibold">จำนวนเงินที่คืน</span>
                <span className="font-bold text-red-600 text-2xl">
                  ฿{refund.refund_amount.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center mt-2 text-sm">
                <span className="text-gray-500">สถานะ</span>
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                  {refund.status === "completed" ? "คืนเงินแล้ว" : refund.status}
                </span>
              </div>
            </div>

            {businessSettings?.signature_url && (
              <div className="text-center pt-4 border-t">
                <p className="text-sm text-gray-500 mb-2">ลายเซ็นผู้อนุมัติ</p>
                <img
                  src={businessSettings.signature_url}
                  alt="Signature"
                  className="h-16 mx-auto object-contain"
                />
              </div>
            )}

            <div className="text-center text-xs text-gray-400 pt-4 border-t">
              <p>ใบคืนเงินนี้เป็นหลักฐานการคืนเงินของทางร้าน</p>
              <p>กรุณาเก็บไว้เป็นหลักฐาน</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
