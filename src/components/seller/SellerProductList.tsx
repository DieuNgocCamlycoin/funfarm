// 🌱 Divine Mantra: "Farmers rich, Eaters happy. Farm to Table, Fair & Fast."
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { ExternalLink, Edit, Package, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

interface SellerProduct {
  id: string;
  product_name: string;
  content: string;
  images: string[];
  price_camly: number;
  price_vnd: number | null;
  quantity_kg: number;
  product_status: string;
  category: string | null;
  created_at: string;
}

export const SellerProductList = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ quantity: number; price: number }>({ quantity: 0, price: 0 });

  useEffect(() => {
    if (user?.id) fetchProducts();
  }, [user?.id]);

  const fetchProducts = async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('posts')
        .select('id, product_name, content, images, price_camly, price_vnd, quantity_kg, product_status, category, created_at')
        .eq('author_id', user.id)
        .eq('is_product_post', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (product: SellerProduct) => {
    setEditingId(product.id);
    setEditValues({
      quantity: product.quantity_kg || 0,
      price: product.price_camly || 0,
    });
  };

  const saveEdit = async (productId: string) => {
    try {
      const { error } = await supabase
        .from('posts')
        .update({
          quantity_kg: editValues.quantity,
          price_camly: editValues.price,
        })
        .eq('id', productId);

      if (error) throw error;

      toast.success('Đã cập nhật sản phẩm');
      setEditingId(null);
      fetchProducts();
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error('Không thể cập nhật sản phẩm');
    }
  };

  const toggleStatus = async (productId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'hidden' : 'active';
    try {
      const { error } = await supabase
        .from('posts')
        .update({ product_status: newStatus })
        .eq('id', productId);

      if (error) throw error;

      toast.success(newStatus === 'active' ? 'Đã hiển thị sản phẩm' : 'Đã ẩn sản phẩm');
      fetchProducts();
    } catch (error) {
      console.error('Error toggling status:', error);
      toast.error('Không thể cập nhật trạng thái');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Đang bán</Badge>;
      case 'sold_out':
        return <Badge className="bg-orange-500">Hết hàng</Badge>;
      case 'hidden':
        return <Badge variant="secondary">Đã ẩn</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-20 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="font-semibold text-lg mb-2">Chưa có sản phẩm nào</h3>
        <p className="text-muted-foreground mb-4">Bắt đầu đăng bán sản phẩm để quản lý tại đây</p>
        <Link to="/">
          <Button>Đăng bán ngay</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {products.map(product => (
        <Card key={product.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex gap-4">
              {/* Product Image */}
              {product.images?.[0] && (
                <img 
                  src={product.images[0]} 
                  alt={product.product_name || 'Product'}
                  className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                />
              )}

              {/* Product Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="font-semibold truncate">{product.product_name || 'Sản phẩm'}</h4>
                  {getStatusBadge(product.product_status)}
                </div>

                {editingId === product.id ? (
                  <div className="flex gap-2 items-center my-2">
                    <Input
                      type="number"
                      value={editValues.quantity}
                      onChange={(e) => setEditValues(v => ({ ...v, quantity: Number(e.target.value) }))}
                      className="w-20 h-8"
                      placeholder="Số lượng"
                    />
                    <span className="text-sm">kg</span>
                    <Input
                      type="number"
                      value={editValues.price}
                      onChange={(e) => setEditValues(v => ({ ...v, price: Number(e.target.value) }))}
                      className="w-24 h-8"
                      placeholder="Giá"
                    />
                    <span className="text-sm">CLC/kg</span>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    <p>
                      {product.quantity_kg || 0} kg • 
                      <span className="font-semibold text-primary ml-1">
                        {(product.price_camly || 0).toLocaleString()} CAMLY/kg
                      </span>
                    </p>
                  </div>
                )}

                <p className="text-xs text-muted-foreground mt-1">
                  Đăng lúc: {new Date(product.created_at).toLocaleDateString('vi-VN')}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-4 pt-3 border-t">
              <Link to={`/post/${product.id}`} className="flex-1">
                <Button variant="outline" size="sm" className="w-full">
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Xem bài
                </Button>
              </Link>
              
              {editingId === product.id ? (
                <>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setEditingId(null)}
                  >
                    Hủy
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => saveEdit(product.id)}
                  >
                    Lưu
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => startEdit(product)}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Sửa
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => toggleStatus(product.id, product.product_status)}
                  >
                    {product.product_status === 'active' ? (
                      <><EyeOff className="w-4 h-4 mr-1" /> Ẩn</>
                    ) : (
                      <><Eye className="w-4 h-4 mr-1" /> Hiện</>
                    )}
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default SellerProductList;
