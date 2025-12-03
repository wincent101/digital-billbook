import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { X } from "lucide-react";

interface Transaction {
  id: string;
  transaction_number: string;
  total_amount: number;
}

interface RefundFormProps {
  transaction: Transaction;
  onClose: () => void;
  onSuccess: () => void;
}

const BANKS = [
  "ธนาคารกรุงเทพ",
  "ธนาคารกสิกรไทย",
  "ธนาคารกรุงไทย",
  "ธนาคารไทยพาณิชย์",
  "ธนาคารกรุงศรีอยุธยา",
  "ธนาคารทหารไทยธนชาต",
  "ธนาคารออมสิน",
  "ธนาคารเกียรตินาคินภัทร",
  "ธนาคารซีไอเอ็มบี",
  "ธนาคารยูโอบี",
  "พร้อมเพย์",
  "อื่นๆ",
];

export default function RefundForm({ transaction, onClose, onSuccess }: RefundFormProps) {
  const [refundAmount, setRefundAmount] = useState(transaction.total_amount.toString());
  const [reason, setReason] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [loading, setLoading] = useState(false);

  const generateRefundNumber = () => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const day = now.getDate().toString().padStart(2, "0");
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
    return `RF${year}${month}${day}${random}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!refundAmount || parseFloat(refundAmount) <= 0) {
      toast.error("กรุณาระบุจำนวนเงินคืน");
      return;
    }

    if (parseFloat(refundAmount) > transaction.total_amount) {
      toast.error("จำนวนเงินคืนไม่สามารถมากกว่ายอดรวมได้");
      return;
    }

    if (!reason.trim()) {
      toast.error("กรุณาระบุเหตุผลการคืนเงิน");
      return;
    }

    if (!bankName) {
      toast.error("กรุณาเลือกธนาคาร");
      return;
    }

    if (!accountNumber.trim()) {
      toast.error("กรุณาระบุเลขบัญชี");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from("refunds").insert({
        transaction_id: transaction.id,
        refund_amount: parseFloat(refundAmount),
        reason: reason.trim(),
        bank_name: bankName,
        account_number: accountNumber.trim(),
        account_name: accountName.trim() || null,
        refund_number: generateRefundNumber(),
      });

      if (error) throw error;

      toast.success("บันทึกการคืนเงินสำเร็จ");
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Refund error:", error);
      toast.error("ไม่สามารถบันทึกการคืนเงินได้");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            คืนเงิน - {transaction.transaction_number}
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">ยอดรวมของรายการ</p>
            <p className="text-lg font-semibold">฿{transaction.total_amount.toLocaleString()}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="refundAmount">จำนวนเงินที่คืน (บาท) *</Label>
            <Input
              id="refundAmount"
              type="number"
              step="0.01"
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">เหตุผลการคืนเงิน *</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="ระบุเหตุผลการคืนเงิน..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bankName">ธนาคาร *</Label>
            <Select value={bankName} onValueChange={setBankName}>
              <SelectTrigger>
                <SelectValue placeholder="เลือกธนาคาร" />
              </SelectTrigger>
              <SelectContent>
                {BANKS.map((bank) => (
                  <SelectItem key={bank} value={bank}>
                    {bank}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountNumber">เลขบัญชี *</Label>
            <Input
              id="accountNumber"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="เลขบัญชีธนาคาร"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountName">ชื่อบัญชี</Label>
            <Input
              id="accountName"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="ชื่อเจ้าของบัญชี"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              ยกเลิก
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "กำลังบันทึก..." : "บันทึกการคืนเงิน"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
