import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { X, Package, Truck, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TransactionItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface DeliveredItem {
  product_name: string;
  total_delivered: number;
}

interface DeliveryBatchFormProps {
  transaction: {
    id: string;
    transaction_number: string;
    total_amount: number;
    customer_id: string | null;
  };
  onClose: () => void;
  onSuccess: () => void;
}

const DeliveryBatchForm = ({ transaction, onClose, onSuccess }: DeliveryBatchFormProps) => {
  const [items, setItems] = useState<TransactionItem[]>([]);
  const [deliveredItems, setDeliveredItems] = useState<DeliveredItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [batchCount, setBatchCount] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load transaction items
      const { data: transactionItems, error: itemsError } = await supabase
        .from("transaction_items")
        .select("*")
        .eq("transaction_id", transaction.id);

      if (itemsError) throw itemsError;

      // Load existing delivery batches
      const { data: batches, error: batchesError } = await supabase
        .from("delivery_batches")
        .select("id")
        .eq("transaction_id", transaction.id);

      if (batchesError) throw batchesError;

      setBatchCount(batches?.length || 0);

      // Load delivered items from all batches
      if (batches && batches.length > 0) {
        const batchIds = batches.map((b) => b.id);
        const { data: batchItems, error: batchItemsError } = await supabase
          .from("delivery_batch_items")
          .select("product_name, quantity")
          .in("batch_id", batchIds);

        if (batchItemsError) throw batchItemsError;

        // Aggregate delivered quantities by product name
        const delivered: Record<string, number> = {};
        batchItems?.forEach((item) => {
          delivered[item.product_name] = (delivered[item.product_name] || 0) + item.quantity;
        });

        setDeliveredItems(
          Object.entries(delivered).map(([product_name, total_delivered]) => ({
            product_name,
            total_delivered,
          }))
        );
      }

      setItems(transactionItems || []);
    } catch (error: any) {
      console.error("Load data error:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message || "ไม่สามารถโหลดข้อมูลได้",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getDeliveredQuantity = (productName: string) => {
    const found = deliveredItems.find((d) => d.product_name === productName);
    return found?.total_delivered || 0;
  };

  const getRemainingQuantity = (item: TransactionItem) => {
    return item.quantity - getDeliveredQuantity(item.product_name);
  };

  const handleQuantityChange = (itemId: string, quantity: number, maxQuantity: number) => {
    if (quantity < 0) quantity = 0;
    if (quantity > maxQuantity) quantity = maxQuantity;
    
    setSelectedItems((prev) => ({
      ...prev,
      [itemId]: quantity,
    }));
  };

  const handleToggleItem = (itemId: string, checked: boolean, maxQuantity: number) => {
    if (checked) {
      setSelectedItems((prev) => ({
        ...prev,
        [itemId]: maxQuantity,
      }));
    } else {
      setSelectedItems((prev) => {
        const newSelected = { ...prev };
        delete newSelected[itemId];
        return newSelected;
      });
    }
  };

  const handleSubmit = async () => {
    const itemsToDeliver = Object.entries(selectedItems).filter(([_, qty]) => qty > 0);
    
    if (itemsToDeliver.length === 0) {
      toast({
        title: "กรุณาเลือกสินค้า",
        description: "กรุณาเลือกสินค้าอย่างน้อย 1 รายการ",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);

      // Generate batch number
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
      const batchNumber = `DEL-${dateStr}-${String(batchCount + 1).padStart(3, "0")}`;

      // Create delivery batch
      const { data: batch, error: batchError } = await supabase
        .from("delivery_batches")
        .insert({
          transaction_id: transaction.id,
          batch_number: batchNumber,
          notes: notes || null,
        })
        .select()
        .single();

      if (batchError) throw batchError;

      // Create delivery batch items
      const batchItemsData = itemsToDeliver.map(([itemId, quantity]) => {
        const item = items.find((i) => i.id === itemId)!;
        return {
          batch_id: batch.id,
          transaction_item_id: itemId,
          product_name: item.product_name,
          quantity,
          unit_price: item.unit_price,
          subtotal: Number(item.unit_price) * quantity,
        };
      });

      const { error: itemsError } = await supabase
        .from("delivery_batch_items")
        .insert(batchItemsData);

      if (itemsError) throw itemsError;

      // Check if all items are delivered
      const totalOrdered = items.reduce((sum, item) => sum + item.quantity, 0);
      const totalDeliveredBefore = deliveredItems.reduce((sum, d) => sum + d.total_delivered, 0);
      const totalDeliveredNow = itemsToDeliver.reduce((sum, [_, qty]) => sum + qty, 0);
      
      if (totalDeliveredBefore + totalDeliveredNow >= totalOrdered) {
        // Update transaction delivery status
        await supabase
          .from("pos_transactions")
          .update({ delivery_status: "delivered" })
          .eq("id", transaction.id);
      }

      toast({
        title: "สำเร็จ",
        description: `สร้างรอบส่งงาน ${batchNumber} เรียบร้อยแล้ว`,
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Create delivery batch error:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message || "ไม่สามารถสร้างรอบส่งงานได้",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const totalSelectedAmount = Object.entries(selectedItems).reduce((sum, [itemId, qty]) => {
    const item = items.find((i) => i.id === itemId);
    return sum + (item ? Number(item.unit_price) * qty : 0);
  }, 0);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            แบ่งส่งงาน - รอบที่ {batchCount + 1}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">กำลังโหลด...</div>
        ) : (
          <div className="space-y-6">
            <div className="text-sm text-muted-foreground">
              รายการอ้างอิง: <span className="font-mono font-medium">{transaction.transaction_number}</span>
            </div>

            <div className="space-y-4">
              <Label>เลือกสินค้าที่จะส่งในรอบนี้</Label>
              <div className="space-y-3">
                {items.map((item) => {
                  const remaining = getRemainingQuantity(item);
                  const delivered = getDeliveredQuantity(item.product_name);
                  const isSelected = selectedItems[item.id] !== undefined;
                  const selectedQty = selectedItems[item.id] || 0;

                  return (
                    <Card key={item.id} className={remaining === 0 ? "opacity-50" : ""}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) =>
                              handleToggleItem(item.id, !!checked, remaining)
                            }
                            disabled={remaining === 0}
                          />
                          <div className="flex-1">
                            <div className="font-medium">{item.product_name}</div>
                            <div className="text-sm text-muted-foreground">
                              ราคา: ฿{Number(item.unit_price).toFixed(2)}
                            </div>
                            <div className="text-sm">
                              <span className="text-muted-foreground">สั่งซื้อ: </span>
                              <span className="font-medium">{item.quantity}</span>
                              {delivered > 0 && (
                                <>
                                  <span className="text-muted-foreground"> | ส่งแล้ว: </span>
                                  <span className="text-green-600 font-medium">{delivered}</span>
                                </>
                              )}
                              <span className="text-muted-foreground"> | คงเหลือ: </span>
                              <span className={remaining > 0 ? "text-orange-600 font-medium" : "text-green-600 font-medium"}>
                                {remaining}
                              </span>
                            </div>
                          </div>
                          {isSelected && remaining > 0 && (
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleQuantityChange(item.id, selectedQty - 1, remaining)
                                }
                              >
                                -
                              </Button>
                              <Input
                                type="number"
                                value={selectedQty}
                                onChange={(e) =>
                                  handleQuantityChange(
                                    item.id,
                                    parseInt(e.target.value) || 0,
                                    remaining
                                  )
                                }
                                className="w-16 text-center"
                                min={0}
                                max={remaining}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleQuantityChange(item.id, selectedQty + 1, remaining)
                                }
                              >
                                +
                              </Button>
                            </div>
                          )}
                          {remaining === 0 && (
                            <span className="text-green-600 flex items-center gap-1">
                              <Check className="h-4 w-4" />
                              ส่งครบแล้ว
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">หมายเหตุ (ไม่บังคับ)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="หมายเหตุการส่งงาน..."
                rows={3}
              />
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex justify-between items-center text-lg font-semibold">
                <span>ยอดรวมรอบนี้:</span>
                <span className="text-primary">฿{totalSelectedAmount.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={onClose} disabled={submitting}>
                <X className="h-4 w-4 mr-2" />
                ยกเลิก
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                <Package className="h-4 w-4 mr-2" />
                {submitting ? "กำลังบันทึก..." : "สร้างรอบส่งงาน"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DeliveryBatchForm;
