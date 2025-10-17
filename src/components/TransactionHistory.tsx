import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Download, Eye, Trash2, Home, ShoppingCart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
import { PaymentReceipt } from "./PaymentReceipt";

interface Transaction {
  id: string;
  transaction_number: string;
  total_amount: number;
  payment_status: string;
  created_at: string;
  qr_code_data: string | null;
}

export const TransactionHistory = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewTransaction, setViewTransaction] = useState<any>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("pos_transactions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error("Load transactions error:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดประวัติการทำรายการได้",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from("pos_transactions")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;

      toast({
        title: "สำเร็จ",
        description: "ลบรายการเรียบร้อยแล้ว",
      });

      loadTransactions();
    } catch (error) {
      console.error("Delete transaction error:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถลบรายการได้",
        variant: "destructive",
      });
    } finally {
      setDeleteId(null);
    }
  };

  const handleViewReceipt = async (transaction: Transaction) => {
    try {
      // โหลดรายการสินค้า
      const { data: items, error } = await supabase
        .from("transaction_items")
        .select("*")
        .eq("transaction_id", transaction.id);

      if (error) throw error;

      const itemsFormatted = items?.map((item) => ({
        id: item.product_id,
        name: item.product_name,
        price: Number(item.unit_price),
        quantity: item.quantity,
      }));

      setViewTransaction({
        ...transaction,
        items: itemsFormatted,
      });
    } catch (error) {
      console.error("View receipt error:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถแสดงใบแจ้งชำระเงินได้",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      pending: "secondary",
      paid: "default",
      cancelled: "destructive",
    };

    const labels: Record<string, string> = {
      pending: "รอชำระเงิน",
      paid: "ชำระแล้ว",
      cancelled: "ยกเลิก",
    };

    return (
      <Badge variant={variants[status] || "default"}>{labels[status] || status}</Badge>
    );
  };

  if (viewTransaction) {
    return (
      <PaymentReceipt
        transaction={viewTransaction}
        onClose={() => setViewTransaction(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5">
      {/* Header/Navbar */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10 shadow-[var(--shadow-soft)]">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  ประวัติการขาย
                </h1>
                <p className="text-sm text-muted-foreground">ดูและจัดการประวัติการทำรายการ</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => navigate("/pos")}
                variant="outline"
                className="gap-2"
              >
                <ShoppingCart className="h-4 w-4" />
                ขายหน้าร้าน
              </Button>
              <Button
                onClick={() => navigate("/")}
                variant="outline"
                className="gap-2"
              >
                <Home className="h-4 w-4" />
                หน้าหลัก
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-6 w-6" />
            ประวัติการทำรายการ
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-4">
                <FileText className="h-12 w-12 text-muted-foreground animate-pulse" />
                <p className="text-muted-foreground">กำลังโหลด...</p>
              </div>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-xl text-muted-foreground">ยังไม่มีประวัติการทำรายการ</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>เลขที่รายการ</TableHead>
                    <TableHead>วันที่/เวลา</TableHead>
                    <TableHead className="text-right">จำนวนเงิน</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead className="text-right">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-mono">
                        {transaction.transaction_number}
                      </TableCell>
                      <TableCell>
                        {new Date(transaction.created_at).toLocaleString("th-TH", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        ฿{Number(transaction.total_amount).toFixed(2)}
                      </TableCell>
                      <TableCell>{getStatusBadge(transaction.payment_status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewReceipt(transaction)}
                            className="gap-2"
                          >
                            <Eye className="h-4 w-4" />
                            ดู/พิมพ์
                          </Button>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => navigate("/", { 
                              state: { 
                                fromTransaction: true,
                                transactionId: transaction.id,
                                transactionNumber: transaction.transaction_number,
                                totalAmount: transaction.total_amount
                              } 
                            })}
                            className="gap-2"
                          >
                            <FileText className="h-4 w-4" />
                            สร้างใบเสร็จ
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setDeleteId(transaction.id)}
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

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
            <AlertDialogDescription>
              คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้? การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>ลบ</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </div>
  );
};
