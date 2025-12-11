import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Download, X, Printer, CheckCircle } from "lucide-react";
import html2canvas from "html2canvas";
import QRCode from "qrcode";
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

interface TransactionItem {
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
    total_amount: number;
    qr_code_data: string | null;
    payment_status: string;
  };
  totalBatches: number;
  batchIndex: number;
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

const DeliveryBatchReceipt = ({
  batch,
  transaction,
  totalBatches,
  batchIndex,
  onClose,
}: DeliveryBatchReceiptProps) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<DeliveryBatchItem[]>([]);
  const [allTransactionItems, setAllTransactionItems] = useState<TransactionItem[]>([]);
  const [businessName, setBusinessName] = useState("ชื่อร้านของคุณ");
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [signatureUrl, setSignatureUrl] = useState<string>("");
  const [customerName, setCustomerName] = useState<string | null>(null);
  const [customerAddress, setCustomerAddress] = useState<string | null>(null);
  const [customerRank, setCustomerRank] = useState<string>("standard");
  const [loading, setLoading] = useState(true);
  const [isComplete, setIsComplete] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [autoSaved, setAutoSaved] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (transaction.qr_code_data && isComplete) {
      generateQRCode();
    }
  }, [transaction.qr_code_data, isComplete]);

  // Auto-save when data is loaded
  useEffect(() => {
    if (!loading && !autoSaved && receiptRef.current) {
      // Delay to ensure rendering is complete
      const timer = setTimeout(() => {
        autoSaveReceipt();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loading, autoSaved]);

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

      // Load all transaction items to show full order when complete
      const { data: txItems, error: txItemsError } = await supabase
        .from("transaction_items")
        .select("*")
        .eq("transaction_id", transaction.id);

      if (!txItemsError && txItems) {
        setAllTransactionItems(txItems);
      }

      // Load customer info
      if (transaction.customer_id) {
        const { data: customer, error: customerError } = await supabase
          .from("customers")
          .select("name, address, rank")
          .eq("id", transaction.customer_id)
          .maybeSingle();

        if (!customerError && customer) {
          setCustomerName(customer.name);
          setCustomerAddress(customer.address);
          setCustomerRank(customer.rank || "standard");
        }
      }

      // Check if this is the final batch (all items delivered)
      const { data: allBatches, error: allBatchesError } = await supabase
        .from("delivery_batches")
        .select("id")
        .eq("transaction_id", transaction.id);

      if (!allBatchesError && allBatches && txItems) {
        const batchIds = allBatches.map((b) => b.id);
        const { data: allDeliveredItems, error: deliveredError } = await supabase
          .from("delivery_batch_items")
          .select("product_name, quantity")
          .in("batch_id", batchIds);

        if (!deliveredError && allDeliveredItems) {
          // Calculate total ordered and delivered
          const totalOrdered = txItems.reduce((sum, item) => sum + item.quantity, 0);
          const totalDelivered = allDeliveredItems.reduce((sum, item) => sum + item.quantity, 0);
          
          setIsComplete(totalDelivered >= totalOrdered);
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

  const totalBatchAmount = items.reduce((sum, item) => sum + Number(item.subtotal), 0);

  const autoSaveReceipt = async () => {
    if (!receiptRef.current || autoSaved) return;

    try {
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        allowTaint: false,
        imageTimeout: 0,
        onclone: async (clonedDoc) => {
          const clonedElement = clonedDoc.body.querySelector('[data-receipt]');
          if (!clonedElement) return;
          
          const images = clonedElement.querySelectorAll('img');
          for (const img of Array.from(images)) {
            const originalSrc = img.getAttribute('src');
            if (originalSrc && !originalSrc.startsWith('data:')) {
              try {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth || img.width;
                canvas.height = img.naturalHeight || img.height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  ctx.drawImage(img, 0, 0);
                  img.src = canvas.toDataURL('image/png');
                }
              } catch (e) {
                console.warn('Could not convert image:', e);
              }
            }
          }
        }
      });

      // Convert to blob for upload
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), "image/png", 0.9);
      });

      // Upload to storage
      const fileName = `delivery-${batch.batch_number}-${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage
        .from("invoice-files")
        .upload(fileName, blob, {
          contentType: "image/png",
          upsert: true,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
      } else {
        setAutoSaved(true);
        console.log("Receipt auto-saved:", fileName);
      }
    } catch (error) {
      console.error("Auto-save receipt error:", error);
    }
  };

  const downloadReceipt = async () => {
    if (!receiptRef.current) return;

    try {
      const canvas = await html2canvas(receiptRef.current, {
        scale: 3,
        backgroundColor: "#ffffff",
        useCORS: true,
        allowTaint: false,
        imageTimeout: 0,
        onclone: async (clonedDoc) => {
          const clonedElement = clonedDoc.body.querySelector('[data-receipt]');
          if (!clonedElement) return;
          
          const images = clonedElement.querySelectorAll('img');
          for (const img of Array.from(images)) {
            const originalSrc = img.getAttribute('src');
            if (originalSrc && !originalSrc.startsWith('data:')) {
              try {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth || img.width;
                canvas.height = img.naturalHeight || img.height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  ctx.drawImage(img, 0, 0);
                  img.src = canvas.toDataURL('image/png');
                }
              } catch (e) {
                console.warn('Could not convert image:', e);
              }
            }
          }
        }
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
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold">
              {isComplete ? "ใบส่งงาน + ใบเสร็จ" : "ใบส่งงาน"}
            </h2>
            {isComplete && (
              <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                ส่งครบแล้ว
              </span>
            )}
          </div>
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
          <div ref={receiptRef} data-receipt className="bg-white p-8 rounded-lg shadow-lg text-gray-800">
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
                {isComplete ? (
                  <>ใบส่งงาน + ใบเสร็จรับเงิน</>
                ) : (
                  <>ใบส่งงาน (รอบที่ {batchIndex}/{totalBatches})</>
                )}
              </p>
              {isComplete && (
                <div className="mt-2 inline-flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                  <CheckCircle className="h-4 w-4" />
                  ส่งมอบงานครบถ้วน
                </div>
              )}
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
                {isComplete && (
                  <div>
                    <p className="text-sm text-gray-500">สถานะการชำระ:</p>
                    <p className={`font-semibold ${transaction.payment_status === 'paid' ? 'text-green-600' : 'text-orange-600'}`}>
                      {transaction.payment_status === 'paid' ? 'ชำระแล้ว' : 'รอชำระ'}
                    </p>
                  </div>
                )}
              </div>

              {customerName && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">ลูกค้า:</p>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-lg">{customerName}</p>
                    {customerRank && customerRank !== "standard" && (
                      <span className={`px-3 py-1 rounded-full text-xs font-bold text-white ${getRankBadge(customerRank)}`}>
                        {customerRank.toUpperCase()}
                      </span>
                    )}
                  </div>
                  {customerAddress && (
                    <p className="text-sm text-gray-600 mt-1">{customerAddress}</p>
                  )}
                </div>
              )}
            </div>

            {/* Items for this batch */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-700 mb-3 border-b pb-2">
                {isComplete ? "รายการทั้งหมด (รอบที่ส่งครบ)" : `รายการรอบนี้ (รอบที่ ${batchIndex})`}
              </h3>
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

            {/* Batch Total */}
            <div className="mb-6 border-t-2 border-gray-300 pt-4">
              <div className="flex justify-between items-center text-xl font-bold">
                <span>ยอดรวมรอบนี้:</span>
                <span className="text-primary">฿{totalBatchAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* Full Order Summary (when complete) */}
            {isComplete && (
              <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  สรุปยอดรวมทั้งหมด
                </h3>
                <table className="w-full text-sm">
                  <thead className="border-b border-green-300">
                    <tr>
                      <th className="text-left py-2">รายการ</th>
                      <th className="text-center py-2">จำนวน</th>
                      <th className="text-right py-2">รวม</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allTransactionItems.map((item) => (
                      <tr key={item.id} className="border-b border-green-100">
                        <td className="py-2">{item.product_name}</td>
                        <td className="text-center py-2">{item.quantity}</td>
                        <td className="text-right py-2">
                          ฿{Number(item.subtotal).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-4 pt-3 border-t border-green-300 flex justify-between items-center text-xl font-bold text-green-800">
                  <span>ยอดรวมทั้งหมด:</span>
                  <span>฿{Number(transaction.total_amount).toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* QR Code for Payment (when complete and unpaid) */}
            {isComplete && transaction.payment_status !== 'paid' && qrCodeUrl && (
              <div className="text-center my-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-lg font-semibold text-blue-800 mb-4">
                  สแกน QR Code เพื่อชำระเงินผ่านพร้อมเพย์
                </p>
                <div className="flex justify-center">
                  <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" crossOrigin="anonymous" />
                </div>
                <p className="text-sm text-blue-600 mt-4">
                  จำนวนเงิน: ฿{Number(transaction.total_amount).toFixed(2)}
                </p>
              </div>
            )}

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
              {isComplete && (
                <p className="text-green-600 font-medium mt-1">ส่งมอบงานครบถ้วนแล้ว</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryBatchReceipt;
