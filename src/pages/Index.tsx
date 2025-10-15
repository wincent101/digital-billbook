import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Settings, FileText } from "lucide-react";
import { InvoiceForm } from "@/components/InvoiceForm";
import { SettingsPage } from "@/components/SettingsPage";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const [showSettings, setShowSettings] = useState(false);
  const [businessName, setBusinessName] = useState("ชื่อร้านของคุณ");
  const [logoUrl, setLogoUrl] = useState<string>("");

  useEffect(() => {
    loadBusinessSettings();
  }, [showSettings]);

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

  if (showSettings) {
    return <SettingsPage onBack={() => setShowSettings(false)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10 shadow-[var(--shadow-soft)]">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  ระบบใบเสร็จรับเงิน
                </h1>
                <p className="text-sm text-muted-foreground">สร้างใบเสร็จอย่างมืออาชีพ</p>
              </div>
            </div>
            <Button
              onClick={() => setShowSettings(true)}
              variant="outline"
              className="gap-2 border-2 hover:border-primary transition-all"
            >
              <Settings className="h-4 w-4" />
              ตั้งค่า
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <h2 className="text-4xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent mb-3">
            สร้างใบเสร็จของคุณ
          </h2>
          <p className="text-lg text-muted-foreground">
            ระบบออกใบเสร็จที่สวยงามและมืออาชีพ พร้อม QR Code สำหรับลูกค้า
          </p>
        </div>

        <InvoiceForm businessName={businessName} logoUrl={logoUrl} />
      </main>

      {/* Footer */}
      <footer className="mt-16 py-8 border-t bg-card/30 backdrop-blur-sm">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            ระบบออกใบเสร็จรับเงิน • สร้างสรรค์ด้วย Lovable
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
