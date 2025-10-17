import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Trash2, Shield, LogOut, Package } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductManagement } from "@/components/ProductManagement";
import { Badge } from "@/components/ui/badge";

type UserWithRole = {
  id: string;
  user_id: string;
  email: string;
  role: string;
  created_at: string;
};

const Admin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "user">("user");
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    setCurrentUser(session.user);

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      toast({
        title: "ไม่มีสิทธิ์เข้าถึง",
        description: "คุณไม่มีสิทธิ์เข้าถึงหน้านี้",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    setIsAdmin(true);
    loadUsers();
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("*");

      if (rolesData) {
        const usersWithRoles: UserWithRole[] = rolesData.map((role: any) => ({
          id: role.id,
          user_id: role.user_id,
          email: "ดูใน Backend",
          role: role.role,
          created_at: role.created_at,
        }));
        setUsers(usersWithRoles);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // This needs to be done via edge function or backend
      toast({
        title: "การสร้างผู้ใช้",
        description: "กรุณาสร้างผู้ใช้ใหม่ผ่าน Lovable Cloud Backend",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถสร้างผู้ใช้ได้",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUserId) return;

    try {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("id", deleteUserId);

      if (error) throw error;

      toast({
        title: "ลบสิทธิ์สำเร็จ",
        description: "ลบสิทธิ์ผู้ใช้เรียบร้อยแล้ว",
      });
      loadUsers();
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถลบสิทธิ์ได้",
        variant: "destructive",
      });
    } finally {
      setDeleteUserId(null);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">จัดการระบบ</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/")}>
              กลับหน้าหลัก
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              ออกจากระบบ
            </Button>
          </div>
        </div>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
            <TabsTrigger value="users" className="gap-2">
              <Shield className="h-4 w-4" />
              จัดการผู้ใช้
            </TabsTrigger>
            <TabsTrigger value="products" className="gap-2">
              <Package className="h-4 w-4" />
              จัดการสินค้า
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-6 w-6" />
                  จัดการผู้ใช้และสิทธิ์
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">กำลังโหลด...</p>
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">ยังไม่มีผู้ใช้ในระบบ</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>อีเมล</TableHead>
                          <TableHead>บทบาท</TableHead>
                          <TableHead>วันที่สร้าง</TableHead>
                          <TableHead className="text-right">จัดการ</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((user) => (
                          <TableRow key={user.user_id}>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                              <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                                {user.role === 'admin' ? 'ผู้ดูแลระบบ' : 'ผู้ใช้'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {new Date(user.created_at || '').toLocaleDateString('th-TH')}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setDeleteUserId(user.id)}
                                disabled={user.user_id === currentUser?.id}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <UserPlus className="h-5 w-5" />
                    เพิ่มผู้ใช้ใหม่
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    เนื่องจากระบบไม่มีหน้าลงทะเบียน คุณสามารถเพิ่มผู้ใช้ได้ 2 วิธี:
                  </p>
                  <ol className="list-decimal list-inside text-sm text-muted-foreground mt-2 space-y-1">
                    <li>ไปที่ Lovable Cloud Backend → Authentication → ใช้ Dashboard สร้างผู้ใช้</li>
                    <li>หลังจากสร้างผู้ใช้แล้ว กลับมาที่หน้านี้เพื่อกำหนดสิทธิ์</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products">
            <ProductManagement />
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบสิทธิ์</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการลบสิทธิ์ของผู้ใช้นี้หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser}>
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Admin;
