import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Settings, FileText, History, LogOut, Shield, ShoppingCart, Users, BarChart3, FolderOpen } from "lucide-react";
import { InvoiceForm } from "@/components/InvoiceForm";
import { SettingsPage } from "@/components/SettingsPage";
import { InvoiceHistory } from "@/components/InvoiceHistory";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Index = () => {
  const [showSettings, setShowSettings] = useState(false);
  const [businessName, setBusinessName] = useState("ชื่อร้านของคุณ");
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [signatureUrl, setSignatureUrl] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    loadBusinessSettings();
  }, [showSettings]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    // Check if user is admin
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "admin")
      .maybeSingle();

    setIsAdmin(!!roleData);

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  };

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
        setSignatureUrl(data.signature_url || "");
      }
    } catch (error) {
      console.error("Load business settings error:", error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
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
            <div className="flex gap-2">
              <Button
                onClick={() => navigate("/pos")}
                variant="outline"
                className="gap-2"
              >
                <ShoppingCart className="h-4 w-4" />
                ขายหน้าร้าน (POS)
              </Button>
              <Button
                onClick={() => navigate("/customers")}
                variant="outline"
                className="gap-2"
              >
                <Users className="h-4 w-4" />
                จัดการลูกค้า
              </Button>
              <Button
                onClick={() => navigate("/reports")}
                variant="outline"
                className="gap-2 border-2 hover:border-chart-1 transition-all"
              >
                <BarChart3 className="h-4 w-4" />
                รายงานขาย
              </Button>
              <Button
                onClick={() => navigate("/files")}
                variant="outline"
                className="gap-2"
              >
                <FolderOpen className="h-4 w-4" />
                จัดการไฟล์
              </Button>
              {isAdmin && (
                <Button
                  onClick={() => navigate("/admin")}
                  variant="outline"
                  className="gap-2"
                >
                  <Shield className="h-4 w-4" />
                  จัดการผู้ใช้
                </Button>
              )}
              <Button
                onClick={() => setShowSettings(true)}
                variant="outline"
                className="gap-2 border-2 hover:border-primary transition-all"
              >
                <Settings className="h-4 w-4" />
                ตั้งค่า
              </Button>
              <Button
                onClick={handleLogout}
                variant="outline"
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                ออกจากระบบ
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <h2 className="text-4xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent mb-3">
            ระบบจัดการใบเสร็จ
          </h2>
          <p className="text-lg text-muted-foreground">
            สร้างและจัดการใบเสร็จอย่างมืออาชีพ พร้อม QR Code สำหรับลูกค้า
          </p>
        </div>

        <Tabs defaultValue="create" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
            <TabsTrigger value="create" className="gap-2">
              <FileText className="h-4 w-4" />
              สร้างใบเสร็จ
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              ประวัติ
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create">
            <InvoiceForm businessName={businessName} logoUrl={logoUrl} signatureUrl={signatureUrl} />
          </TabsContent>

          <TabsContent value="history">
            <InvoiceHistory businessName={businessName} logoUrl={logoUrl} />
          </TabsContent>
        </Tabs>
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
