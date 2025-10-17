import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { ShoppingCart, Minus, Plus, Trash2, Receipt } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PaymentReceipt } from "@/components/PaymentReceipt";

interface Product {
  id: string;
  name: string;
  price: number;
  description?: string;
}

interface CartItem extends Product {
  quantity: number;
}

export default function POS() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showReceipt, setShowReceipt] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Load products error:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดสินค้าได้",
        variant: "destructive",
      });
    }
  };

  const addToCart = (product: Product) => {
    const existingItem = cart.find((item) => item.id === product.id);
    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const updateQuantity = (productId: string, change: number) => {
    setCart(
      cart
        .map((item) =>
          item.id === productId
            ? { ...item, quantity: item.quantity + change }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const generateTransactionNumber = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `TXN${timestamp}${random}`;
  };

  const createTransaction = async () => {
    if (cart.length === 0) {
      toast({
        title: "ตะกร้าสินค้าว่างเปล่า",
        description: "กรุณาเพิ่มสินค้าในตะกร้าก่อนทำรายการ",
        variant: "destructive",
      });
      return;
    }

    try {
      const total = calculateTotal();
      const transactionNumber = generateTransactionNumber();

      // สร้าง PromptPay QR Code data
      const qrData = generatePromptPayQR("0987654321", total); // เปลี่ยนเบอร์PromptPay ตามต้องการ

      // สร้างธุรกรรม
      const { data: transaction, error: transactionError } = await supabase
        .from("pos_transactions")
        .insert({
          transaction_number: transactionNumber,
          total_amount: total,
          payment_status: "pending",
          qr_code_data: qrData,
        })
        .select()
        .single();

      if (transactionError) throw transactionError;

      // สร้างรายการสินค้า
      const items = cart.map((item) => ({
        transaction_id: transaction.id,
        product_id: item.id,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        subtotal: item.price * item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from("transaction_items")
        .insert(items);

      if (itemsError) throw itemsError;

      setCurrentTransaction({ ...transaction, items: cart });
      setShowReceipt(true);

      toast({
        title: "สำเร็จ",
        description: "สร้างใบแจ้งชำระเงินเรียบร้อยแล้ว",
      });
    } catch (error) {
      console.error("Create transaction error:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถสร้างธุรกรรมได้",
        variant: "destructive",
      });
    }
  };

  const generatePromptPayQR = (phoneNumber: string, amount: number): string => {
    // PromptPay QR Code generation (simplified)
    // Format: 00020101021229370016A000000677010111{phone}5303764{amount}6304{checksum}
    const phone = phoneNumber.replace(/\D/g, "").slice(-10);
    const amountStr = amount.toFixed(2);
    
    // สร้าง payload ตาม EMVCo standard (simplified version)
    let payload = "00020101021229370016A000000677010111";
    payload += "0066" + phone.padStart(13, "0");
    payload += "5303764"; // Currency: THB
    payload += "54" + String(amountStr.length).padStart(2, "0") + amountStr;
    payload += "5802TH"; // Country: Thailand
    payload += "6304"; // CRC placeholder
    
    return payload;
  };

  const handleReceiptClose = () => {
    setShowReceipt(false);
    setCurrentTransaction(null);
    clearCart();
  };

  if (showReceipt && currentTransaction) {
    return (
      <PaymentReceipt
        transaction={currentTransaction}
        onClose={handleReceiptClose}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5 p-4">
      <div className="container mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            ระบบขายหน้าร้าน (POS)
          </h1>
          <p className="text-muted-foreground">เลือกสินค้าและสร้างใบแจ้งชำระเงิน</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Products Section */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>สินค้าทั้งหมด</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {products.map((product) => (
                    <Card
                      key={product.id}
                      className="cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => addToCart(product)}
                    >
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-lg mb-2">{product.name}</h3>
                        {product.description && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {product.description}
                          </p>
                        )}
                        <p className="text-primary font-bold text-xl">
                          ฿{product.price.toFixed(2)}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {products.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    ไม่พบสินค้า กรุณาเพิ่มสินค้าในระบบก่อน
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Cart Section */}
          <div>
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  ตะกร้าสินค้า
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {cart.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    ตะกร้าสินค้าว่างเปล่า
                  </div>
                ) : (
                  <>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {cart.map((item) => (
                        <div key={item.id} className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                          <div className="flex-1">
                            <p className="font-semibold">{item.name}</p>
                            <p className="text-sm text-muted-foreground">
                              ฿{item.price.toFixed(2)} x {item.quantity}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8"
                              onClick={() => updateQuantity(item.id, -1)}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="w-8 text-center font-bold">
                              {item.quantity}
                            </span>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8"
                              onClick={() => updateQuantity(item.id, 1)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="destructive"
                              className="h-8 w-8"
                              onClick={() => removeFromCart(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="border-t pt-4 space-y-4">
                      <div className="flex justify-between items-center text-xl font-bold">
                        <span>รวมทั้งหมด:</span>
                        <span className="text-primary">
                          ฿{calculateTotal().toFixed(2)}
                        </span>
                      </div>

                      <Button
                        onClick={createTransaction}
                        className="w-full gap-2"
                        size="lg"
                      >
                        <Receipt className="h-5 w-5" />
                        สร้างใบแจ้งชำระเงิน
                      </Button>

                      <Button
                        onClick={clearCart}
                        variant="outline"
                        className="w-full"
                      >
                        ล้างตะกร้า
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
