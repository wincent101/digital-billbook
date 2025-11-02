import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Save, ArrowLeft } from "lucide-react";

interface SettingsPageProps {
  onBack: () => void;
}

export const SettingsPage = ({ onBack }: SettingsPageProps) => {
  const [businessName, setBusinessName] = useState("ชื่อร้านของคุณ");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [signatureUrl, setSignatureUrl] = useState<string>("");
  const [settingsId, setSettingsId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("business_settings")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setBusinessName(data.business_name);
        setPhoneNumber(data.phone_number || "");
        setLogoUrl(data.logo_url || "");
        setSignatureUrl(data.signature_url || "");
        setSettingsId(data.id);
      }
    } catch (error) {
      console.error("Load settings error:", error);
      toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูล");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);

      try {
        const fileExt = file.name.split(".").pop();
        const fileName = `logo-${Date.now()}.${fileExt}`;

        const { data, error } = await supabase.storage
          .from("invoice-files")
          .upload(fileName, file);

        if (error) throw error;

        const {
          data: { publicUrl },
        } = supabase.storage.from("invoice-files").getPublicUrl(fileName);

        setLogoUrl(publicUrl);
        toast.success("อัปโหลดโลโก้สำเร็จ!");
      } catch (error) {
        console.error("Logo upload error:", error);
        toast.error("เกิดข้อผิดพลาดในการอัปโหลดโลโก้");
      }
    }
  };

  const handleSignatureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSignatureFile(file);

      try {
        const fileExt = file.name.split(".").pop();
        const fileName = `signature-${Date.now()}.${fileExt}`;

        const { data, error } = await supabase.storage
          .from("invoice-files")
          .upload(fileName, file);

        if (error) throw error;

        const {
          data: { publicUrl },
        } = supabase.storage.from("invoice-files").getPublicUrl(fileName);

        setSignatureUrl(publicUrl);
        toast.success("อัปโหลดลายเซ็นสำเร็จ!");
      } catch (error) {
        console.error("Signature upload error:", error);
        toast.error("เกิดข้อผิดพลาดในการอัปโหลดลายเซ็น");
      }
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (settingsId) {
        const { error } = await supabase
          .from("business_settings")
          .update({
            business_name: businessName,
            phone_number: phoneNumber,
            logo_url: logoUrl,
            signature_url: signatureUrl,
          })
          .eq("id", settingsId);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("business_settings").insert({
          business_name: businessName,
          phone_number: phoneNumber,
          logo_url: logoUrl,
          signature_url: signatureUrl,
        });

        if (error) throw error;
      }

      toast.success("บันทึกการตั้งค่าสำเร็จ!");
    } catch (error) {
      console.error("Save settings error:", error);
      toast.error("เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-6">
      <div className="max-w-2xl mx-auto">
        <Button
          onClick={onBack}
          variant="ghost"
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          กลับ
        </Button>

        <Card className="shadow-[var(--shadow-elegant)] border-2 border-primary/10">
          <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10 border-b border-border/50">
            <CardTitle className="text-3xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              ตั้งค่าร้านค้า
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-8 space-y-6">
            <div className="space-y-3">
              <Label htmlFor="businessName" className="text-lg font-semibold">
                ชื่อร้าน
              </Label>
              <Input
                id="businessName"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="กรอกชื่อร้านค้าของคุณ"
                className="text-lg h-12 border-2 focus:border-primary transition-all"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="phoneNumber" className="text-lg font-semibold">
                เบอร์โทรศัพท์
              </Label>
              <Input
                id="phoneNumber"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="กรอกเบอร์โทรศัพท์ (เช่น 0812345678)"
                className="text-lg h-12 border-2 focus:border-primary transition-all"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="logo" className="text-lg font-semibold">
                โลโก้ร้าน
              </Label>
              <div className="flex flex-col gap-4">
                {logoUrl && (
                  <div className="flex justify-center p-6 bg-gradient-to-br from-muted/30 to-background rounded-xl border-2 border-dashed border-primary/20">
                    <img
                      src={logoUrl}
                      alt="Logo Preview"
                      className="max-h-32 object-contain rounded-lg shadow-md"
                    />
                  </div>
                )}
                <div className="flex gap-3">
                  <Input
                    id="logo"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    disabled={isLoading}
                    className="flex-1 border-2 focus:border-primary transition-all"
                  />
                  <Button
                    variant="outline"
                    className="border-2 hover:border-primary"
                  >
                    <Upload className="h-4 w-4" />
                  </Button>
                </div>
                {logoFile && (
                  <p className="text-sm text-muted-foreground">
                    ไฟล์: {logoFile.name}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="signature" className="text-lg font-semibold">
                ลายเซ็นร้าน
              </Label>
              <div className="flex flex-col gap-4">
                {signatureUrl && (
                  <div className="flex justify-center p-6 bg-gradient-to-br from-muted/30 to-background rounded-xl border-2 border-dashed border-secondary/20">
                    <img
                      src={signatureUrl}
                      alt="Signature Preview"
                      className="max-h-24 object-contain rounded-lg shadow-md"
                    />
                  </div>
                )}
                <div className="flex gap-3">
                  <Input
                    id="signature"
                    type="file"
                    accept="image/*"
                    onChange={handleSignatureChange}
                    disabled={isLoading}
                    className="flex-1 border-2 focus:border-secondary transition-all"
                  />
                  <Button
                    variant="outline"
                    className="border-2 hover:border-secondary"
                  >
                    <Upload className="h-4 w-4" />
                  </Button>
                </div>
                {signatureFile && (
                  <p className="text-sm text-muted-foreground">
                    ไฟล์: {signatureFile.name}
                  </p>
                )}
              </div>
            </div>

            <div className="pt-6">
              <Button
                onClick={handleSave}
                disabled={isSaving || isLoading}
                variant="gradient"
                size="lg"
                className="w-full"
              >
                <Save className="mr-2 h-5 w-5" />
                {isSaving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
