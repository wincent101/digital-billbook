import { format } from "date-fns";
import { th } from "date-fns/locale";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";

interface InvoicePreviewProps {
  invoiceNumber: string;
  referenceNumber: string;
  customerName: string;
  customerCode: string;
  customerRank?: string;
  businessName: string;
  logoUrl?: string;
  signatureUrl?: string;
  fileUrl?: string;
  createdAt?: Date;
}

export const InvoicePreview = ({
  invoiceNumber,
  referenceNumber,
  customerName,
  customerCode,
  customerRank = "standard",
  businessName,
  logoUrl,
  signatureUrl,
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
      className="bg-white border border-border rounded-lg shadow-2xl max-w-2xl mx-auto overflow-hidden"
      style={{ width: "794px", minHeight: "500px" }}
    >
      {/* Professional Header with Brand Colors */}
      <div className="bg-gradient-to-r from-primary via-primary to-accent p-8 text-white">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {logoUrl ? (
              <div className="bg-white p-3 rounded-xl shadow-lg">
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="h-16 w-16 object-contain"
                  crossOrigin="anonymous"
                />
              </div>
            ) : (
              <div className="h-20 w-20 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg border-2 border-white/30">
                <span className="text-4xl font-bold text-white">
                  {businessName.charAt(0)}
                </span>
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold mb-1 tracking-tight">
                {businessName}
              </h1>
              <p className="text-white/90 text-sm font-medium">ผู้ให้บริการมืออาชีพ</p>
            </div>
          </div>
          <div className="text-right bg-white/10 backdrop-blur-sm p-4 rounded-lg border border-white/20">
            <p className="text-xs font-medium text-white/80 mb-1">วันที่ออกเอกสาร</p>
            <p className="text-xl font-bold">
              {format(createdAt, "dd MMM yyyy", { locale: th })}
            </p>
            <p className="text-sm text-white/90 mt-1">
              {format(createdAt, "HH:mm น.", { locale: th })}
            </p>
          </div>
        </div>
      </div>

      {/* Document Title */}
      <div className="bg-gradient-to-r from-muted/50 to-muted/30 py-4 px-8 border-b-2 border-primary/20">
        <h2 className="text-2xl font-bold text-center text-foreground">
          ใบส่งงาน / ใบเสร็จรับเงิน
        </h2>
        <p className="text-center text-sm text-muted-foreground mt-1">
          WORK DELIVERY / RECEIPT
        </p>
      </div>

      {/* Main Content */}
      <div className="p-8">
        {/* Invoice Details Grid */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-5 rounded-lg border-l-4 border-primary shadow-sm">
              <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">
                Invoice Number
              </p>
              <p className="text-2xl font-bold text-foreground">{invoiceNumber}</p>
            </div>
            <div className="bg-gradient-to-br from-secondary/10 to-secondary/5 p-5 rounded-lg border-l-4 border-secondary shadow-sm">
              <p className="text-xs font-semibold text-secondary uppercase tracking-wide mb-2">
                Reference Number
              </p>
              <p className="text-xl font-semibold text-foreground">{referenceNumber}</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-accent/10 to-accent/5 p-5 rounded-lg border-l-4 border-accent shadow-sm">
              <p className="text-xs font-semibold text-accent uppercase tracking-wide mb-2">
                Customer Name
              </p>
              <p className="text-xl font-semibold text-foreground">{customerName}</p>
              {customerRank && customerRank !== "standard" && (
                <div className="mt-2">
                  <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white">
                    {customerRank.toUpperCase()}
                  </Badge>
                </div>
              )}
            </div>
            <div className="bg-gradient-to-br from-muted to-muted/50 p-5 rounded-lg border-l-4 border-border shadow-sm">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Customer Code
              </p>
              <p className="text-xl font-semibold text-foreground">{customerCode}</p>
            </div>
          </div>
        </div>

        {/* QR Code Section */}
        {fileUrl && qrCodeUrl && (
          <div className="mt-8 bg-gradient-to-br from-primary/5 via-accent/5 to-background p-6 rounded-lg border-2 border-dashed border-primary/30">
            <div className="flex items-center justify-center gap-8">
              <div className="text-center">
                <div className="inline-block p-3 bg-white rounded-xl shadow-lg border-2 border-primary/20">
                  <img
                    src={qrCodeUrl}
                    alt="QR Code"
                    className="w-32 h-32"
                    crossOrigin="anonymous"
                  />
                </div>
                <div className="mt-4">
                  <p className="text-sm font-bold text-primary mb-1">สแกน QR Code</p>
                  <p className="text-xs text-muted-foreground">เพื่อดาวน์โหลดไฟล์งาน</p>
                </div>
              </div>
              <div className="flex-1 max-w-xs space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-primary"></div>
                  <span className="text-muted-foreground">สแกนด้วยกล้องมือถือ</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-accent"></div>
                  <span className="text-muted-foreground">เข้าถึงไฟล์ได้ทันที</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-secondary"></div>
                  <span className="text-muted-foreground">ปลอดภัยและรวดเร็ว</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Signature Section */}
        <div className="mt-12 pt-8 border-t-2 border-dashed border-border">
          <div className="grid grid-cols-2 gap-12">
            <div className="text-center">
              <div className="h-20 border-b-2 border-border mb-3"></div>
              <p className="text-sm font-semibold text-foreground">{customerName}</p>
              <p className="text-xs text-muted-foreground mt-1">ผู้รับมอบงาน / Received by</p>
              <p className="text-xs text-muted-foreground mt-2">วันที่ / Date: {format(createdAt, "dd/MM/yyyy", { locale: th })}</p>
            </div>
            <div className="text-center">
              <div className="h-20 border-b-2 border-border mb-3 flex items-center justify-center">
                {signatureUrl ? (
                  <img
                    src={signatureUrl}
                    alt="Signature"
                    className="max-h-16 object-contain"
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div className="text-primary/20 text-6xl font-bold">✓</div>
                )}
              </div>
              <p className="text-sm font-semibold text-foreground">{businessName}</p>
              <p className="text-xs text-muted-foreground mt-1">ผู้มอบงาน / Authorized Signature</p>
              <p className="text-xs text-muted-foreground mt-2">วันที่ / Date: {format(createdAt, "dd/MM/yyyy", { locale: th })}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Professional Footer */}
      <div className="bg-gradient-to-r from-muted/50 to-muted/30 py-4 px-8 border-t">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <p>เอกสารฉบับนี้ออกโดยระบบอัตโนมัติ</p>
          <p className="font-semibold">{businessName} © {new Date().getFullYear()}</p>
        </div>
      </div>
    </div>
  );
};
