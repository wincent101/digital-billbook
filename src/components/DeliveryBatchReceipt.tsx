import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Download, X, Printer } from "lucide-react";
import html2canvas from "html2canvas";
import { useToast } from "@/hooks/use-toast";

interface DeliveryBatch {
  id: string;
  batch_number: string;
  delivery_date: string;
  notes: string | null;
  status: string;
  created_at: string;
}

interface DeliveryBatchItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface DeliveryBatchReceiptProps {
  batch: DeliveryBatch;
  transaction: {
    id: string;
    transaction_number: string;
    customer_id: string | null;
  };
  totalBatches: number;
  batchIndex: number;
  onClose: () => void;
}

const DeliveryBatchReceipt = ({
  batch,
  transaction,
  totalBatches,
  batchIndex,
  onClose,
}: DeliveryBatchReceiptProps) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<DeliveryBatchItem[]>([]);
  const [businessName, setBusinessName] = useState("ชื่อร้านของคุณ");
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [signatureUrl, setSignatureUrl] = useState<string>("");
  const [customerName, setCustomerName] = useState<string | null>(null);
  const [customerAddress, setCustomerAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load business settings
      const { data: settings, error: settingsError } = await supabase
        .from("business_settings")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (!settingsError && settings) {
        setBusinessName(settings.business_name);
        setLogoUrl(settings.logo_url || "");
        setSignatureUrl(settings.signature_url || "");
      }

      // Load batch items
      const { data: batchItems, error: itemsError } = await supabase
        .from("delivery_batch_items")
        .select("*")
        .eq("batch_id", batch.id);

      if (itemsError) throw itemsError;
      setItems(batchItems || []);

      // Load customer info
      if (transaction.customer_id) {
        const { data: customer, error: customerError } = await supabase
          .from("customers")
          .select("name, address")
          .eq("id", transaction.customer_id)
          .maybeSingle();

        if (!customerError && customer) {
          setCustomerName(customer.name);
          setCustomerAddress(customer.address);
        }
      }
    } catch (error: any) {
      console.error("Load data error:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message || "ไม่สามารถโหลดข้อมูลได้",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = items.reduce((sum, item) => sum + Number(item.subtotal), 0);

  const downloadReceipt = async () => {
    if (!receiptRef.current) return;

    try {
      const canvas = await html2canvas(receiptRef.current, {
        scale: 3,
        backgroundColor: "#ffffff",
        useCORS: true,
        allowTaint: false,
        imageTimeout: 0,
      });

      const imageUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `delivery-${batch.batch_number}.png`;
      link.href = imageUrl;
      link.click();

      toast({
        title: "สำเร็จ",
        description: "บันทึกใบส่งงานเรียบร้อยแล้ว",
      });
    } catch (error) {
      console.error("Download receipt error:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถบันทึกใบส่งงานได้",
        variant: "destructive",
      });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-background rounded-lg p-8 text-center">
          <p className="text-muted-foreground">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-background border-b p-4 flex justify-between items-center print:hidden">
          <h2 className="text-xl font-bold">ใบส่งงาน</h2>
          <div className="flex gap-2">
            <Button onClick={handlePrint} variant="outline" className="gap-2">
              <Printer className="h-4 w-4" />
              พิมพ์
            </Button>
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
          <div ref={receiptRef} className="bg-white p-8 rounded-lg shadow-lg text-gray-800">
            {/* Header */}
            <div className="text-center mb-6 border-b pb-6">
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="h-20 mx-auto mb-4 object-contain"
                  crossOrigin="anonymous"
                />
              )}
              <h1 className="text-3xl font-bold mb-2">{businessName}</h1>
              <p className="text-lg font-semibold text-gray-600">
                ใบส่งงาน (รอบที่ {batchIndex}/{totalBatches})
              </p>
            </div>

            {/* Info */}
            <div className="mb-6">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-500">เลขที่ส่งงาน:</p>
                  <p className="font-semibold">{batch.batch_number}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">อ้างอิง:</p>
                  <p className="font-semibold">{transaction.transaction_number}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">วันที่ส่ง:</p>
                  <p className="font-semibold">
                    {new Date(batch.delivery_date).toLocaleString("th-TH", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>

              {customerName && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">ลูกค้า:</p>
                  <p className="font-semibold text-lg">{customerName}</p>
                  {customerAddress && (
                    <p className="text-sm text-gray-600 mt-1">{customerAddress}</p>
                  )}
                </div>
              )}
            </div>

            {/* Items */}
            <div className="mb-6">
              <table className="w-full">
                <thead className="border-b-2 border-gray-300">
                  <tr>
                    <th className="text-left py-2">รายการ</th>
                    <th className="text-center py-2">จำนวน</th>
                    <th className="text-right py-2">ราคา/หน่วย</th>
                    <th className="text-right py-2">รวม</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-gray-200">
                      <td className="py-3">{item.product_name}</td>
                      <td className="text-center py-3">{item.quantity}</td>
                      <td className="text-right py-3">
                        ฿{Number(item.unit_price).toFixed(2)}
                      </td>
                      <td className="text-right py-3">
                        ฿{Number(item.subtotal).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total */}
            <div className="mb-6 border-t-2 border-gray-300 pt-4">
              <div className="flex justify-between items-center text-xl font-bold">
                <span>ยอดรวมรอบนี้:</span>
                <span className="text-primary">฿{totalAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* Notes */}
            {batch.notes && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">หมายเหตุ:</p>
                <p>{batch.notes}</p>
              </div>
            )}

            {/* Signature Section */}
            <div className="mt-8 border-t pt-6">
              <div className="grid grid-cols-2 gap-8">
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-12">ผู้ส่งมอบ</p>
                  {signatureUrl && (
                    <img
                      src={signatureUrl}
                      alt="Signature"
                      className="h-16 mx-auto mb-2 object-contain"
                      crossOrigin="anonymous"
                    />
                  )}
                  <div className="border-t border-gray-400 pt-2">
                    <p className="text-sm">ลายเซ็น/ตราประทับ</p>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-12">ผู้รับมอบ</p>
                  <div className="border-t border-gray-400 pt-2">
                    <p className="text-sm">ลายเซ็น/ตราประทับ</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-8 text-center text-gray-500 text-sm border-t pt-4">
              <p>ขอบคุณที่ใช้บริการ</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryBatchReceipt;
