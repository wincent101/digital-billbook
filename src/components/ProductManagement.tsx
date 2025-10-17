import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Package, Plus, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Product {
  id: string;
  name: string;
  price: number;
  description?: string;
  is_active: boolean;
}

export const ProductManagement = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    description: "",
    is_active: true,
  });
  const { toast } = useToast();

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("products")
        .select("*")
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
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.price) {
      toast({
        title: "ข้อมูลไม่ครบถ้วน",
        description: "กรุณากรอกชื่อและราคาสินค้า",
        variant: "destructive",
      });
      return;
    }

    try {
      const productData = {
        name: formData.name,
        price: parseFloat(formData.price),
        description: formData.description || null,
        is_active: formData.is_active,
      };

      if (editProduct) {
        const { error } = await supabase
          .from("products")
          .update(productData)
          .eq("id", editProduct.id);

        if (error) throw error;

        toast({
          title: "สำเร็จ",
          description: "แก้ไขสินค้าเรียบร้อยแล้ว",
        });
      } else {
        const { error } = await supabase.from("products").insert(productData);

        if (error) throw error;

        toast({
          title: "สำเร็จ",
          description: "เพิ่มสินค้าเรียบร้อยแล้ว",
        });
      }

      setDialogOpen(false);
      resetForm();
      loadProducts();
    } catch (error) {
      console.error("Save product error:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถบันทึกสินค้าได้",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (product: Product) => {
    setEditProduct(product);
    setFormData({
      name: product.name,
      price: product.price.toString(),
      description: product.description || "",
      is_active: product.is_active,
    });
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase.from("products").delete().eq("id", deleteId);

      if (error) throw error;

      toast({
        title: "สำเร็จ",
        description: "ลบสินค้าเรียบร้อยแล้ว",
      });

      loadProducts();
    } catch (error) {
      console.error("Delete product error:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถลบสินค้าได้",
        variant: "destructive",
      });
    } finally {
      setDeleteId(null);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      price: "",
      description: "",
      is_active: true,
    });
    setEditProduct(null);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-6 w-6" />
              จัดการสินค้า
            </CardTitle>
            <Dialog
              open={dialogOpen}
              onOpenChange={(open) => {
                setDialogOpen(open);
                if (!open) resetForm();
              }}
            >
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  เพิ่มสินค้า
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editProduct ? "แก้ไขสินค้า" : "เพิ่มสินค้าใหม่"}
                  </DialogTitle>
                  <DialogDescription>
                    กรอกข้อมูลสินค้าด้านล่าง
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">ชื่อสินค้า *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="กรอกชื่อสินค้า"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price">ราคา (บาท) *</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData({ ...formData, price: e.target.value })
                      }
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">รายละเอียด</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      placeholder="กรอกรายละเอียดสินค้า (ถ้ามี)"
                      rows={3}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={formData.is_active}
                      onChange={(e) =>
                        setFormData({ ...formData, is_active: e.target.checked })
                      }
                      className="h-4 w-4"
                    />
                    <Label htmlFor="is_active">สินค้าพร้อมขาย</Label>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setDialogOpen(false);
                        resetForm();
                      }}
                    >
                      ยกเลิก
                    </Button>
                    <Button type="submit">บันทึก</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-4">
                <Package className="h-12 w-12 text-muted-foreground animate-pulse" />
                <p className="text-muted-foreground">กำลังโหลด...</p>
              </div>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-xl text-muted-foreground">ยังไม่มีสินค้าในระบบ</p>
              <p className="text-muted-foreground mt-2">
                คลิกปุ่ม "เพิ่มสินค้า" เพื่อเริ่มต้น
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ชื่อสินค้า</TableHead>
                    <TableHead>รายละเอียด</TableHead>
                    <TableHead className="text-right">ราคา</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead className="text-right">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-semibold">{product.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {product.description || "-"}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        ฿{product.price.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={product.is_active ? "default" : "secondary"}>
                          {product.is_active ? "พร้อมขาย" : "ไม่พร้อมขาย"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(product)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setDeleteId(product.id)}
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
              คุณแน่ใจหรือไม่ว่าต้องการลบสินค้านี้? การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>ลบ</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
