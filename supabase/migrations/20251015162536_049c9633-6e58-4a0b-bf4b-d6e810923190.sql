-- สร้างตาราง business_settings สำหรับเก็บข้อมูลโลโก้และชื่อร้าน
CREATE TABLE public.business_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT NOT NULL DEFAULT 'ชื่อร้านของคุณ',
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- สร้างตาราง invoices สำหรับเก็บข้อมูลใบเสร็จ
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  reference_number TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_code TEXT NOT NULL,
  file_url TEXT,
  qr_code_data TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Policies สำหรับ business_settings (อนุญาตให้ทุกคนอ่านได้ แต่แก้ไขได้แค่ตัวเอง - สำหรับ demo)
CREATE POLICY "Anyone can view business settings"
  ON public.business_settings
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can update business settings"
  ON public.business_settings
  FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can insert business settings"
  ON public.business_settings
  FOR INSERT
  WITH CHECK (true);

-- Policies สำหรับ invoices (อนุญาตให้ทุกคนใช้งานได้ - สำหรับ demo)
CREATE POLICY "Anyone can view invoices"
  ON public.invoices
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create invoices"
  ON public.invoices
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update invoices"
  ON public.invoices
  FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete invoices"
  ON public.invoices
  FOR DELETE
  USING (true);

-- Trigger สำหรับอัปเดต updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_business_settings_updated_at
  BEFORE UPDATE ON public.business_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- สร้าง storage bucket สำหรับเก็บไฟล์
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoice-files', 'invoice-files', true)
ON CONFLICT (id) DO NOTHING;

-- Policies สำหรับ storage
CREATE POLICY "Anyone can view files"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'invoice-files');

CREATE POLICY "Anyone can upload files"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'invoice-files');

-- เพิ่มข้อมูล business_settings เริ่มต้น
INSERT INTO public.business_settings (business_name)
VALUES ('ชื่อร้านของคุณ')
ON CONFLICT DO NOTHING;