import { format } from "date-fns";
import { th } from "date-fns/locale";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

interface InvoicePreviewProps {
  invoiceNumber: string;
  referenceNumber: string;
  customerName: string;
  customerCode: string;
  businessName: string;
  logoUrl?: string;
  fileUrl?: string;
  createdAt?: Date;
}

export const InvoicePreview = ({
  invoiceNumber,
  referenceNumber,
  customerName,
  customerCode,
  businessName,
  logoUrl,
  fileUrl,
  createdAt = new Date(),
}: InvoicePreviewProps) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");

  useEffect(() => {
    const generateQR = async () => {
      if (fileUrl) {
        try {
          const url = await QRCode.toDataURL(fileUrl, {
            width: 200,
            margin: 1,
            color: {
              dark: "#5b21b6",
              light: "#ffffff",
            },
          });
          setQrCodeUrl(url);
        } catch (err) {
          console.error("Error generating QR code:", err);
        }
      }
    };
    generateQR();
  }, [fileUrl]);

  return (
    <div
      id="invoice-preview"
      className="bg-gradient-to-br from-background via-muted/30 to-background border-2 border-primary/20 rounded-2xl p-8 shadow-[var(--shadow-elegant)] max-w-2xl mx-auto"
      style={{ width: "794px", minHeight: "500px" }}
    >
      {/* Header with Logo and Business Name */}
      <div className="flex items-center justify-between mb-8 pb-6 border-b-2 border-primary/20">
        <div className="flex items-center gap-4">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Logo"
              className="h-16 w-16 object-contain rounded-lg shadow-md"
              crossOrigin="anonymous"
            />
          ) : (
            <div className="h-16 w-16 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md">
              <span className="text-2xl font-bold text-white">
                {businessName.charAt(0)}
              </span>
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold text-primary">
              {businessName}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">ใบส่งงาน / ใบเสร็จรับเงิน</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-muted-foreground">วันที่</p>
          <p className="text-lg font-semibold text-foreground">
            {format(createdAt, "dd MMM yyyy", { locale: th })}
          </p>
          <p className="text-sm text-muted-foreground">
            {format(createdAt, "HH:mm น.", { locale: th })}
          </p>
        </div>
      </div>

      {/* Invoice Details */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-primary/5 to-accent/5 p-4 rounded-xl border border-primary/10">
            <p className="text-sm font-medium text-muted-foreground mb-1">เลขที่ใบส่งงาน</p>
            <p className="text-xl font-bold text-primary">{invoiceNumber}</p>
          </div>
          <div className="bg-gradient-to-br from-secondary/5 to-accent/5 p-4 rounded-xl border border-secondary/10">
            <p className="text-sm font-medium text-muted-foreground mb-1">เลขอ้างอิง</p>
            <p className="text-lg font-semibold text-foreground">{referenceNumber}</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-accent/5 to-primary/5 p-4 rounded-xl border border-accent/10">
            <p className="text-sm font-medium text-muted-foreground mb-1">ชื่อลูกค้า</p>
            <p className="text-lg font-semibold text-foreground">{customerName}</p>
          </div>
          <div className="bg-gradient-to-br from-muted/50 to-background p-4 rounded-xl border border-border">
            <p className="text-sm font-medium text-muted-foreground mb-1">รหัสลูกค้า</p>
            <p className="text-lg font-semibold text-foreground">{customerCode}</p>
          </div>
        </div>
      </div>

      {/* QR Code Section */}
      {fileUrl && qrCodeUrl && (
        <div className="mt-8 pt-6 border-t-2 border-primary/20">
          <div className="flex items-center justify-center gap-6 bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/5 p-6 rounded-xl border-2 border-dashed border-primary/20">
            <div className="text-center">
              <img
                src={qrCodeUrl}
                alt="QR Code"
                className="w-32 h-32 mx-auto mb-3 rounded-lg shadow-lg bg-white p-2"
              />
              <p className="text-sm font-medium text-primary">สแกนเพื่อดาวน์โหลดไฟล์</p>
              <p className="text-xs text-muted-foreground mt-1">QR Code สำหรับลูกค้า</p>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 pt-6 border-t border-border/50 text-center">
        <p className="text-xs text-muted-foreground">
          ขอบคุณที่ใช้บริการ • {businessName}
        </p>
      </div>
    </div>
  );
};
