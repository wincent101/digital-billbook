import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2, Download, Edit, FileText } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import html2canvas from "html2canvas";
import { InvoicePreview } from "./InvoicePreview";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface Invoice {
  id: string;
  invoice_number: string;
  reference_number: string;
  customer_name: string;
  customer_code: string;
  file_url: string | null;
  created_at: string;
}

interface InvoiceHistoryProps {
  businessName: string;
  logoUrl?: string;
}

export const InvoiceHistory = ({ businessName, logoUrl }: InvoiceHistoryProps) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error("Load error:", error);
      toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูล");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from("invoices")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;

      toast.success("ลบใบเสร็จสำเร็จ!");
      loadInvoices();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("เกิดข้อผิดพลาดในการลบ");
    } finally {
      setDeleteId(null);
    }
  };

  const handleDownload = async (invoice: Invoice, format: "png" | "jpg") => {
    setPreviewInvoice(invoice);
    
    // Wait for preview to render
    setTimeout(async () => {
      const element = document.getElementById("invoice-download-preview");
      if (!element) return;

      try {
        const canvas = await html2canvas(element, {
          scale: 2,
          backgroundColor: "#ffffff",
          useCORS: true,
          allowTaint: false,
          logging: false,
          onclone: (clonedDoc) => {
            const images = clonedDoc.getElementsByTagName("img");
            Array.from(images).forEach((img) => {
              if (img.src && !img.src.startsWith("data:")) {
                const canvas = document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext("2d");
                if (ctx) {
                  ctx.drawImage(img, 0, 0);
                  try {
                    img.src = canvas.toDataURL();
                  } catch (e) {
                    console.error("Error converting image:", e);
                  }
                }
              }
            });
          },
        });

        const link = document.createElement("a");
        link.download = `invoice-${invoice.invoice_number}.${format}`;
        link.href = canvas.toDataURL(
          format === "png" ? "image/png" : "image/jpeg",
          0.95
        );
        link.click();

        toast.success(`ดาวน์โหลด ${format.toUpperCase()} สำเร็จ!`);
        setPreviewInvoice(null);
      } catch (error) {
        console.error("Download error:", error);
        toast.error("เกิดข้อผิดพลาดในการดาวน์โหลด");
        setPreviewInvoice(null);
      }
    }, 100);
  };

  if (loading) {
    return (
      <Card className="shadow-[var(--shadow-soft)] border-2 border-primary/10">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5 border-b border-border/50">
          <CardTitle className="text-2xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            ประวัติใบเสร็จ
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 p-4 border rounded-lg animate-pulse">
                <div className="h-12 w-12 bg-muted rounded" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-muted rounded" />
                  <div className="h-3 w-48 bg-muted rounded" />
                </div>
                <div className="h-8 w-24 bg-muted rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="shadow-[var(--shadow-soft)] border-2 border-primary/10">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5 border-b border-border/50">
          <CardTitle className="text-2xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            ประวัติใบเสร็จ
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {invoices.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-lg text-muted-foreground">ยังไม่มีใบเสร็จในระบบ</p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>เลขที่ใบส่งงาน</TableHead>
                    <TableHead>เลขอ้างอิง</TableHead>
                    <TableHead>ชื่อลูกค้า</TableHead>
                    <TableHead>รหัสลูกค้า</TableHead>
                    <TableHead>วันที่สร้าง</TableHead>
                    <TableHead className="text-right">การจัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                      <TableCell>{invoice.reference_number}</TableCell>
                      <TableCell>{invoice.customer_name}</TableCell>
                      <TableCell>{invoice.customer_code}</TableCell>
                      <TableCell>
                        {format(new Date(invoice.created_at), "dd MMM yyyy, HH:mm น.", {
                          locale: th,
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(invoice, "png")}
                            className="border-primary/20 hover:border-primary"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            PNG
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(invoice, "jpg")}
                            className="border-primary/20 hover:border-primary"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            JPG
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeleteId(invoice.id)}
                            className="border-destructive/20 hover:border-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบใบเสร็จ</AlertDialogTitle>
            <AlertDialogDescription>
              คุณแน่ใจหรือไม่ว่าต้องการลบใบเสร็จนี้? การกระทำนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              ลบใบเสร็จ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Hidden Preview for Download */}
      {previewInvoice && (
        <div className="fixed left-[-9999px] top-0">
          <div id="invoice-download-preview">
            <InvoicePreview
              invoiceNumber={previewInvoice.invoice_number}
              referenceNumber={previewInvoice.reference_number}
              customerName={previewInvoice.customer_name}
              customerCode={previewInvoice.customer_code}
              businessName={businessName}
              logoUrl={logoUrl}
              fileUrl={previewInvoice.file_url || ""}
              createdAt={new Date(previewInvoice.created_at)}
            />
          </div>
        </div>
      )}
    </>
  );
};
