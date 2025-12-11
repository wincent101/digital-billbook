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
import { FileText, Eye, Trash2, Home, ShoppingCart, RotateCcw, Receipt, Truck, Package } from "lucide-react";
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
import RefundForm from "./RefundForm";
import RefundReceipt from "./RefundReceipt";
import DeliveryBatchForm from "./DeliveryBatchForm";
import DeliveryBatchReceipt from "./DeliveryBatchReceipt";

interface Transaction {
  id: string;
  transaction_number: string;
  total_amount: number;
  payment_status: string;
  delivery_status: string;
  created_at: string;
  qr_code_data: string | null;
  customer_id: string | null;
}

interface Refund {
  id: string;
  refund_number: string;
  refund_amount: number;
  reason: string;
  bank_name: string;
  account_number: string;
  account_name: string | null;
  status: string;
  created_at: string;
  transaction_id: string;
}

interface DeliveryBatch {
  id: string;
  batch_number: string;
  delivery_date: string;
  notes: string | null;
  status: string;
  created_at: string;
  transaction_id: string;
}

export const TransactionHistory = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewTransaction, setViewTransaction] = useState<any>(null);
  const [refundTransaction, setRefundTransaction] = useState<Transaction | null>(null);
  const [viewRefund, setViewRefund] = useState<{ refund: Refund; transaction: Transaction } | null>(null);
  const [refunds, setRefunds] = useState<Record<string, Refund[]>>({});
  const [deliveryBatches, setDeliveryBatches] = useState<Record<string, DeliveryBatch[]>>({});
  const [deliveryBatchTransaction, setDeliveryBatchTransaction] = useState<Transaction | null>(null);
  const [viewDeliveryBatch, setViewDeliveryBatch] = useState<{
    batch: DeliveryBatch;
    transaction: Transaction;
    totalBatches: number;
    batchIndex: number;
  } | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAuthAndLoad();
  }, []);

  const loadRefunds = async (transactionIds: string[]) => {
    if (transactionIds.length === 0) return;
    
    const { data, error } = await supabase
      .from("refunds")
      .select("*")
      .in("transaction_id", transactionIds);

    if (!error && data) {
      const refundMap: Record<string, Refund[]> = {};
      data.forEach((refund: Refund) => {
        if (!refundMap[refund.transaction_id]) {
          refundMap[refund.transaction_id] = [];
        }
        refundMap[refund.transaction_id].push(refund);
      });
      setRefunds(refundMap);
    }
  };

  const checkAuthAndLoad = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.log("No session found, redirecting to auth");
      navigate("/auth");
      return;
    }
    
    await loadTransactions();
  };

  const loadTransactions = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("pos_transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      
      setTransactions(data || []);
      setLoading(false);
      
      // Load refunds and delivery batches in background (non-blocking)
      if (data && data.length > 0) {
        const transactionIds = data.map((t: Transaction) => t.id);
        // Fire and forget - don't await
        loadRefunds(transactionIds);
        loadDeliveryBatches(transactionIds);
      }
    } catch (error: any) {
      console.error("Load transactions error:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message || "ไม่สามารถโหลดประวัติการทำรายการได้",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const loadDeliveryBatches = async (transactionIds: string[]) => {
    if (transactionIds.length === 0) return;
    
    const { data, error } = await supabase
      .from("delivery_batches")
      .select("*")
      .in("transaction_id", transactionIds)
      .order("created_at", { ascending: true });

    if (!error && data) {
      const batchMap: Record<string, DeliveryBatch[]> = {};
      data.forEach((batch: DeliveryBatch) => {
        if (!batchMap[batch.transaction_id]) {
          batchMap[batch.transaction_id] = [];
        }
        batchMap[batch.transaction_id].push(batch);
      });
      setDeliveryBatches(batchMap);
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
      const { data: items, error: itemsError } = await supabase
        .from("transaction_items")
        .select("*")
        .eq("transaction_id", transaction.id);

      if (itemsError) throw itemsError;

      const itemsFormatted = items?.map((item) => ({
        id: item.product_id,
        name: item.product_name,
        price: Number(item.unit_price),
        quantity: item.quantity,
      }));

      // โหลดข้อมูลลูกค้า
      let customerName = null;
      let customerRank = null;
      if (transaction.customer_id) {
        const { data: customer, error: customerError } = await supabase
          .from("customers")
          .select("name, rank")
          .eq("id", transaction.customer_id)
          .maybeSingle();

        if (!customerError && customer) {
          customerName = customer.name;
          customerRank = customer.rank;
        }
      }

      setViewTransaction({
        ...transaction,
        items: itemsFormatted,
        customer_name: customerName,
        customer_rank: customerRank,
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

  const getPaymentStatusBadge = (status: string) => {
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

  const getDeliveryStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary"> = {
      pending: "secondary",
      delivered: "default",
    };

    const labels: Record<string, string> = {
      pending: "รอส่งงาน",
      delivered: "ส่งแล้ว",
    };

    return (
      <Badge variant={variants[status] || "default"}>{labels[status] || status}</Badge>
    );
  };

  const handleUpdateStatus = async (
    transactionId: string,
    statusType: "payment_status" | "delivery_status",
    newStatus: string
  ) => {
    try {
      const { error } = await supabase
        .from("pos_transactions")
        .update({ [statusType]: newStatus })
        .eq("id", transactionId);

      if (error) throw error;

      toast({
        title: "สำเร็จ",
        description: "อัปเดตสถานะเรียบร้อยแล้ว",
      });

      loadTransactions();
    } catch (error) {
      console.error("Update status error:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถอัปเดตสถานะได้",
        variant: "destructive",
      });
    }
  };

  if (viewDeliveryBatch) {
    return (
      <DeliveryBatchReceipt
        batch={viewDeliveryBatch.batch}
        transaction={viewDeliveryBatch.transaction}
        totalBatches={viewDeliveryBatch.totalBatches}
        batchIndex={viewDeliveryBatch.batchIndex}
        onClose={() => setViewDeliveryBatch(null)}
      />
    );
  }

  if (viewRefund) {
    return (
      <RefundReceipt
        refund={viewRefund.refund}
        transaction={viewRefund.transaction}
        onClose={() => setViewRefund(null)}
      />
    );
  }

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
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4 border rounded-lg animate-pulse">
                  <div className="h-12 w-12 bg-muted rounded" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 bg-muted rounded" />
                    <div className="h-3 w-48 bg-muted rounded" />
                  </div>
                  <div className="flex gap-2">
                    <div className="h-8 w-20 bg-muted rounded" />
                    <div className="h-8 w-20 bg-muted rounded" />
                  </div>
                </div>
              ))}
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
                    <TableHead>สถานะการชำระ</TableHead>
                    <TableHead>สถานะการส่ง</TableHead>
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
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {getPaymentStatusBadge(transaction.payment_status)}
                          {transaction.payment_status === "pending" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-6"
                              onClick={() =>
                                handleUpdateStatus(
                                  transaction.id,
                                  "payment_status",
                                  "paid"
                                )
                              }
                            >
                              ชำระแล้ว
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {getDeliveryStatusBadge(transaction.delivery_status)}
                          {transaction.delivery_status === "pending" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-6"
                              onClick={() =>
                                handleUpdateStatus(
                                  transaction.id,
                                  "delivery_status",
                                  "delivered"
                                )
                              }
                            >
                              ส่งแล้ว
                            </Button>
                          )}
                        </div>
                      </TableCell>
                        <TableCell className="text-right">
                        <div className="flex flex-wrap gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewReceipt(transaction)}
                            className="gap-1"
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
                            className="gap-1"
                          >
                            <FileText className="h-4 w-4" />
                            สร้างใบเสร็จ
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setRefundTransaction(transaction)}
                            className="gap-1"
                          >
                            <RotateCcw className="h-4 w-4" />
                            คืนเงิน
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDeliveryBatchTransaction(transaction)}
                            className="gap-1 text-blue-600 border-blue-200"
                          >
                            <Truck className="h-4 w-4" />
                            แบ่งส่งงาน
                            {deliveryBatches[transaction.id]?.length > 0 && (
                              <Badge variant="secondary" className="ml-1 text-xs">
                                {deliveryBatches[transaction.id].length}
                              </Badge>
                            )}
                          </Button>
                          {deliveryBatches[transaction.id]?.map((batch, index) => (
                            <Button
                              key={batch.id}
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setViewDeliveryBatch({
                                  batch,
                                  transaction,
                                  totalBatches: deliveryBatches[transaction.id].length,
                                  batchIndex: index + 1,
                                })
                              }
                              className="gap-1 text-green-600 border-green-200"
                            >
                              <Package className="h-4 w-4" />
                              รอบ {index + 1}
                            </Button>
                          ))}
                          {refunds[transaction.id]?.map((refund) => (
                            <Button
                              key={refund.id}
                              size="sm"
                              variant="outline"
                              onClick={() => setViewRefund({ refund, transaction })}
                              className="gap-1 text-red-600 border-red-200"
                            >
                              <Receipt className="h-4 w-4" />
                              ใบคืนเงิน
                            </Button>
                          ))}
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

      {refundTransaction && (
        <RefundForm
          transaction={refundTransaction}
          onClose={() => setRefundTransaction(null)}
          onSuccess={loadTransactions}
        />
      )}

      {deliveryBatchTransaction && (
        <DeliveryBatchForm
          transaction={deliveryBatchTransaction}
          onClose={() => setDeliveryBatchTransaction(null)}
          onSuccess={loadTransactions}
        />
      )}
      </div>
    </div>
  );
};
