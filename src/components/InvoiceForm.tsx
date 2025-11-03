import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUp, Download, FileImage } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import { InvoicePreview } from "./InvoicePreview";

interface InvoiceFormProps {
  businessName: string;
  logoUrl?: string;
  signatureUrl?: string;
}

export const InvoiceForm = ({ businessName, logoUrl, signatureUrl }: InvoiceFormProps) => {
  const location = useLocation();
  const [invoiceNumber, setInvoiceNumber] = useState(`INV-${Date.now()}`);
  const [referenceNumber, setReferenceNumber] = useState(`REF-${Date.now()}`);
  const [customerName, setCustomerName] = useState("");
  const [customerCode, setCustomerCode] = useState("");
  const [customerRank, setCustomerRank] = useState("standard");
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // โหลดข้อมูลจาก transaction ถ้ามีการส่งมาจากหน้าประวัติการขาย
    const loadTransactionData = async () => {
      if (location.state?.fromTransaction) {
        const { transactionId, transactionNumber } = location.state;
        setReferenceNumber(transactionNumber);
        
        // โหลดข้อมูลลูกค้าจาก transaction
        const { data: transaction } = await supabase
          .from("pos_transactions")
          .select("customer_id")
          .eq("id", transactionId)
          .maybeSingle();

        if (transaction?.customer_id) {
          const { data: customer } = await supabase
            .from("customers")
            .select("*")
            .eq("id", transaction.customer_id)
            .single();

          if (customer) {
            setCustomerName(customer.name);
            setCustomerCode(customer.phone || customer.id);
            setCustomerRank(customer.rank || "standard");
          }
        }
      }
    };

    loadTransactionData();
  }, [location.state]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      
      setIsUploading(true);
      try {
        const fileExt = selectedFile.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { data, error } = await supabase.storage
          .from("invoice-files")
          .upload(fileName, selectedFile);

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from("invoice-files")
          .getPublicUrl(fileName);

        setFileUrl(publicUrl);
        toast.success("อัปโหลดไฟล์สำเร็จ!");
      } catch (error) {
        console.error("Upload error:", error);
        toast.error("เกิดข้อผิดพลาดในการอัปโหลดไฟล์");
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleSaveInvoice = async () => {
    if (!customerName || !customerCode) {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from("invoices").insert({
        invoice_number: invoiceNumber,
        reference_number: referenceNumber,
        customer_name: customerName,
        customer_code: customerCode,
        file_url: fileUrl || null,
        qr_code_data: fileUrl || null,
      });

      if (error) throw error;

      toast.success("บันทึกใบเสร็จสำเร็จ!");
      
      // Reset form
      setInvoiceNumber(`INV-${Date.now()}`);
      setReferenceNumber(`REF-${Date.now()}`);
      setCustomerName("");
      setCustomerCode("");
      setFile(null);
      setFileUrl("");
    } catch (error) {
      console.error("Save error:", error);
      toast.error("เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setIsSaving(false);
    }
  };

  const waitForImagesToLoad = async (element: HTMLElement) => {
    const images = element.querySelectorAll('img');
    const imagePromises = Array.from(images).map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = resolve; // Resolve even on error to not block
      });
    });
    await Promise.all(imagePromises);
  };

  const handleDownloadPNG = async () => {
    const element = document.getElementById("invoice-preview");
    if (!element) return;

    try {
      // รอให้ images ทั้งหมดโหลดเสร็จก่อน
      await waitForImagesToLoad(element);
      
      // รอเพิ่มอีกนิดเพื่อให้แน่ใจว่า QR code render เสร็จ
      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        allowTaint: true,
        logging: false,
      });
      
      const link = document.createElement("a");
      link.download = `invoice-${invoiceNumber}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      
      toast.success("ดาวน์โหลด PNG สำเร็จ!");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("เกิดข้อผิดพลาดในการดาวน์โหลด");
    }
  };

  const handleDownloadJPG = async () => {
    const element = document.getElementById("invoice-preview");
    if (!element) return;

    try {
      // รอให้ images ทั้งหมดโหลดเสร็จก่อน
      await waitForImagesToLoad(element);
      
      // รอเพิ่มอีกนิดเพื่อให้แน่ใจว่า QR code render เสร็จ
      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        allowTaint: true,
        logging: false,
      });
      
      const link = document.createElement("a");
      link.download = `invoice-${invoiceNumber}.jpg`;
      link.href = canvas.toDataURL("image/jpeg", 0.95);
      link.click();
      
      toast.success("ดาวน์โหลด JPG สำเร็จ!");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("เกิดข้อผิดพลาดในการดาวน์โหลด");
    }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Form Section */}
      <Card className="shadow-[var(--shadow-soft)] border-2 border-primary/10">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5 border-b border-border/50">
          <CardTitle className="text-2xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            สร้างใบเสร็จ
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invoiceNumber" className="font-semibold">เลขที่ใบส่งงาน</Label>
            <Input
              id="invoiceNumber"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              className="border-2 focus:border-primary transition-all"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="referenceNumber" className="font-semibold">เลขอ้างอิงใบแจ้งค่าใช้บริการ</Label>
            <Input
              id="referenceNumber"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              className="border-2 focus:border-primary transition-all"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customerName" className="font-semibold">ชื่อลูกค้า</Label>
            <Input
              id="customerName"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="กรอกชื่อลูกค้า"
              className="border-2 focus:border-primary transition-all"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customerCode" className="font-semibold">รหัสลูกค้า</Label>
            <Input
              id="customerCode"
              value={customerCode}
              onChange={(e) => setCustomerCode(e.target.value)}
              placeholder="กรอกรหัสลูกค้า"
              className="border-2 focus:border-primary transition-all"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="file" className="font-semibold">ไฟล์แนบสำหรับลูกค้า (ถ้ามี)</Label>
            <div className="flex gap-2">
              <Input
                id="file"
                type="file"
                onChange={handleFileChange}
                disabled={isUploading}
                className="border-2 focus:border-primary transition-all"
              />
              {isUploading && <span className="text-sm text-muted-foreground">กำลังอัปโหลด...</span>}
            </div>
            {file && <p className="text-sm text-muted-foreground">ไฟล์: {file.name}</p>}
          </div>

          <div className="pt-4 space-y-3">
            <Button
              onClick={handleSaveInvoice}
              disabled={isSaving}
              variant="gradient"
              size="lg"
              className="w-full"
            >
              <FileUp className="mr-2 h-5 w-5" />
              {isSaving ? "กำลังบันทึก..." : "บันทึกใบเสร็จ"}
            </Button>

            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={handleDownloadPNG}
                variant="outline"
                className="w-full border-2 hover:border-primary"
              >
                <Download className="mr-2 h-4 w-4" />
                ดาวน์โหลด PNG
              </Button>
              <Button
                onClick={handleDownloadJPG}
                variant="outline"
                className="w-full border-2 hover:border-primary"
              >
                <FileImage className="mr-2 h-4 w-4" />
                ดาวน์โหลด JPG
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview Section */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-center bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          ตัวอย่างใบเสร็จ
        </h3>
        <InvoicePreview
          invoiceNumber={invoiceNumber}
          referenceNumber={referenceNumber}
          customerName={customerName || "ชื่อลูกค้า"}
          customerCode={customerCode || "รหัสลูกค้า"}
          customerRank={customerRank}
          businessName={businessName}
          logoUrl={logoUrl}
          signatureUrl={signatureUrl}
          fileUrl={fileUrl}
        />
      </div>
    </div>
  );
};
