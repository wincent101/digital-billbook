import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Trash2, FileText, Image as ImageIcon, Download } from "lucide-react";
import { toast } from "sonner";
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

interface StorageFile {
  name: string;
  id: string;
  created_at: string;
  metadata: {
    size: number;
    mimetype: string;
  };
}

export default function FileManagement() {
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteFile, setDeleteFile] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.storage
        .from("invoice-files")
        .list();

      if (error) throw error;

      const formattedFiles: StorageFile[] = (data || []).map((file) => ({
        name: file.name,
        id: file.id,
        created_at: file.created_at,
        metadata: {
          size: (file.metadata as any)?.size || 0,
          mimetype: (file.metadata as any)?.mimetype || "application/octet-stream",
        },
      }));

      setFiles(formattedFiles);
    } catch (error) {
      console.error("Load files error:", error);
      toast.error("ไม่สามารถโหลดไฟล์ได้");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (fileName: string) => {
    try {
      const { error } = await supabase.storage
        .from("invoice-files")
        .remove([fileName]);

      if (error) throw error;

      toast.success("ลบไฟล์สำเร็จ");
      loadFiles();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("ไม่สามารถลบไฟล์ได้");
    } finally {
      setDeleteFile(null);
    }
  };

  const handleDownload = async (fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("invoice-files")
        .download(fileName);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);

      toast.success("ดาวน์โหลดสำเร็จ");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("ไม่สามารถดาวน์โหลดไฟล์ได้");
    }
  };

  const getFileIcon = (mimetype: string) => {
    if (mimetype.startsWith("image/")) {
      return <ImageIcon className="h-8 w-8 text-primary" />;
    }
    return <FileText className="h-8 w-8 text-primary" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const getFileUrl = (fileName: string) => {
    const { data } = supabase.storage
      .from("invoice-files")
      .getPublicUrl(fileName);
    return data.publicUrl;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  จัดการไฟล์ในระบบ
                </h1>
                <p className="text-sm text-muted-foreground">
                  ดูและจัดการไฟล์ทั้งหมดในระบบ
                </p>
              </div>
            </div>
            <Button onClick={() => navigate("/")} variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              กลับหน้าหลัก
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>ไฟล์ทั้งหมด ({files.length})</span>
              <Button onClick={loadFiles} variant="outline" size="sm">
                รีเฟรช
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">
                กำลังโหลด...
              </div>
            ) : files.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                ไม่มีไฟล์ในระบบ
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {files.map((file) => (
                  <Card key={file.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          {getFileIcon(file.metadata.mimetype)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate text-sm mb-1">
                            {file.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(file.metadata.size)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(file.created_at).toLocaleDateString("th-TH")}
                          </p>
                        </div>
                      </div>

                      {file.metadata.mimetype.startsWith("image/") && (
                        <div className="mt-3 rounded-md overflow-hidden bg-muted">
                          <img
                            src={getFileUrl(file.name)}
                            alt={file.name}
                            className="w-full h-32 object-cover"
                          />
                        </div>
                      )}

                      <div className="flex gap-2 mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleDownload(file.name)}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          ดาวน์โหลด
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setDeleteFile(file.name)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <AlertDialog open={!!deleteFile} onOpenChange={() => setDeleteFile(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบไฟล์</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการลบไฟล์ "{deleteFile}" ใช่หรือไม่?
              การกระทำนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteFile && handleDelete(deleteFile)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              ลบไฟล์
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
