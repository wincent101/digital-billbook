import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { ShoppingCart, Minus, Plus, Trash2, Receipt, ArrowLeft, Home, History, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PaymentReceipt } from "@/components/PaymentReceipt";
import generatePayload from "promptpay-qr";
import { Label } from "@/components/ui/label";

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
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customers, setCustomers] = useState<any[]>([]);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadProducts();
    loadCustomers();
  }, []);

  useEffect(() => {
    if (customerName.length > 0) {
      const filtered = customers.filter(c => 
        c.name.toLowerCase().includes(customerName.toLowerCase())
      );
      setShowCustomerSuggestions(filtered.length > 0);
    } else {
      setShowCustomerSuggestions(false);
    }
  }, [customerName, customers]);

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

  const loadCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("name");

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error("Load customers error:", error);
    }
  };

  const selectCustomer = (customer: any) => {
    setCustomerName(customer.name);
    setCustomerPhone(customer.phone || "");
    setCustomerEmail(customer.email || "");
    setCustomerAddress(customer.address || "");
    setShowCustomerSuggestions(false);
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

    if (!customerName.trim()) {
      toast({
        title: "กรุณากรอกข้อมูลลูกค้า",
        description: "กรุณากรอกชื่อลูกค้าก่อนทำรายการ",
        variant: "destructive",
      });
      return;
    }

    try {
      const total = calculateTotal();
      const transactionNumber = generateTransactionNumber();

      // ตรวจสอบและบันทึกข้อมูลลูกค้า
      let customerId = null;
      const existingCustomer = customers.find(c => c.name === customerName);
      
      if (existingCustomer) {
        // อัปเดตข้อมูลลูกค้าที่มีอยู่
        const { data: updatedCustomer, error: updateError } = await supabase
          .from("customers")
          .update({
            phone: customerPhone || existingCustomer.phone,
            email: customerEmail || existingCustomer.email,
            address: customerAddress || existingCustomer.address,
          })
          .eq("id", existingCustomer.id)
          .select()
          .single();

        if (updateError) throw updateError;
        customerId = updatedCustomer.id;
      } else {
        // สร้างข้อมูลลูกค้าใหม่
        const { data: newCustomer, error: customerError } = await supabase
          .from("customers")
          .insert({
            name: customerName,
            phone: customerPhone,
            email: customerEmail,
            address: customerAddress,
          })
          .select()
          .single();

        if (customerError) throw customerError;
        customerId = newCustomer.id;
        setCustomers([...customers, newCustomer]);
      }

      // โหลดเบอร์พร้อมเพย์จาก business_settings
      const { data: settings } = await supabase
        .from("business_settings")
        .select("phone_number")
        .limit(1)
        .maybeSingle();
      
      const promptPayNumber = settings?.phone_number || "0987654321";
      
      // สร้าง PromptPay QR Code data ตามมาตรฐาน EMVCo
      const qrData = generatePayload(promptPayNumber, { amount: total });

      // สร้างธุรกรรม
      const { data: transaction, error: transactionError } = await supabase
        .from("pos_transactions")
        .insert({
          transaction_number: transactionNumber,
          total_amount: total,
          payment_status: "pending",
          qr_code_data: qrData,
          customer_id: customerId,
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

      setCurrentTransaction({ ...transaction, items: cart, customerName });
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


  const handleReceiptClose = () => {
    setShowReceipt(false);
    setCurrentTransaction(null);
    clearCart();
    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");
    setCustomerAddress("");
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
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5">
      {/* Header/Navbar */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10 shadow-[var(--shadow-soft)]">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md">
                <ShoppingCart className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  ระบบขายหน้าร้าน (POS)
                </h1>
                <p className="text-sm text-muted-foreground">เลือกสินค้าและสร้างใบแจ้งชำระเงิน</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => navigate("/pos/history")}
                variant="outline"
                className="gap-2"
              >
                <History className="h-4 w-4" />
                ประวัติการขาย
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

      <div className="container mx-auto max-w-7xl p-4">

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
                {/* Customer Information */}
                <div className="border-b pb-4 space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4" />
                    <Label className="font-semibold">ข้อมูลลูกค้า</Label>
                  </div>
                  <div className="space-y-2 relative">
                    <Input
                      placeholder="คุณ..."
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      onFocus={() => customerName && setShowCustomerSuggestions(true)}
                      className="border-2 focus:border-primary"
                    />
                    {showCustomerSuggestions && (
                      <div className="absolute z-10 w-full bg-card border-2 rounded-md shadow-lg max-h-40 overflow-y-auto">
                        {customers
                          .filter(c => c.name.toLowerCase().includes(customerName.toLowerCase()))
                          .map(customer => (
                            <div
                              key={customer.id}
                              className="p-2 hover:bg-accent cursor-pointer"
                              onClick={() => selectCustomer(customer)}
                            >
                              <div className="font-semibold">{customer.name}</div>
                              {customer.phone && (
                                <div className="text-sm text-muted-foreground">{customer.phone}</div>
                              )}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                  <Input
                    placeholder="เบอร์โทร (ถ้ามี)"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="border-2 focus:border-primary"
                  />
                </div>
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
