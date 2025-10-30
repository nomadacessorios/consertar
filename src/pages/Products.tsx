import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Edit2, FolderPlus, Star, Settings2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch"; // Importar Switch
import { supabase as sb } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
const supabase: any = sb;

interface Product {
  id: string;
  name: string;
  price: number;
  active: boolean;
  image_url?: string;
  category_id?: string;
  stock_quantity: number;
  earns_loyalty_points: boolean;
  loyalty_points_value: number;
  has_variations: boolean; // Adicionado
}

interface Category {
  id: string;
  name: string;
}

interface Variation {
  id: string;
  product_id: string;
  name: string;
  price_adjustment: number;
  stock_quantity: number;
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // State for adding new product
  const [newProductName, setNewProductName] = useState("");
  const [newProductPrice, setNewProductPrice] = useState("");
  const [newProductImageUrl, setNewProductImageUrl] = useState("");
  const [newProductCategoryId, setNewProductCategoryId] = useState("");
  const [newProductLoyaltyPointsValue, setNewProductLoyaltyPointsValue] = useState("0.0");
  const [newProductHasVariations, setNewProductHasVariations] = useState(false); // Adicionado
  const [newProductStockQuantity, setNewProductStockQuantity] = useState("0"); // Adicionado: Estado para o estoque inicial
  
  // State for category management dialog
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  
  // State for product editing dialog
  const [showEditProductDialog, setShowEditProductDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editProductName, setEditProductName] = useState("");
  const [editProductPrice, setEditProductPrice] = useState("");
  const [editProductImageUrl, setEditProductImageUrl] = useState("");
  const [editProductCategoryId, setEditProductCategoryId] = useState("");
  const [editProductLoyaltyPointsValue, setEditProductLoyaltyPointsValue] = useState("0.0");
  const [editProductHasVariations, setEditProductHasVariations] = useState(false); // Adicionado
  const [editProductStockQuantity, setEditProductStockQuantity] = useState(""); // Adicionado para estoque base
  
  // State for variation management dialog
  const [showVariationsDialog, setShowVariationsDialog] = useState(false);
  const [currentProductForVariations, setCurrentProductForVariations] = useState<Product | null>(null);
  const [productVariations, setProductVariations] = useState<Variation[]>([]);
  const [newVariationName, setNewVariationName] = useState("");
  const [newVariationPriceAdjustment, setNewVariationPriceAdjustment] = useState("0.0");
  const [newVariationStockQuantity, setNewVariationStockQuantity] = useState("0");
  const [editingVariation, setEditingVariation] = useState<Variation | null>(null);

  const { profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (profile?.store_id) {
      loadProducts();
      loadCategories();
    }
  }, [profile]);

  const loadCategories = async () => {
    if (!profile?.store_id) return;

    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("store_id", profile.store_id)
      .order("name");

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar categorias",
        description: error.message,
      });
    } else {
      setCategories(data || []);
    }
  };

  const loadProducts = async () => {
    if (!profile?.store_id) return;

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("store_id", profile.store_id)
      .order("name");

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar produtos",
        description: error.message,
      });
    } else {
      setProducts(data || []);
    }
  };

  const loadVariationsForProduct = async (productId: string) => {
    const { data, error } = await supabase
      .from("product_variations")
      .select("*")
      .eq("product_id", productId)
      .order("name");

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar variações",
        description: error.message,
      });
      return [];
    }
    setProductVariations(data || []);
    return data || [];
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile?.store_id) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Você precisa estar vinculado a uma loja",
      });
      return;
    }

    const loyaltyValue = parseFloat(newProductLoyaltyPointsValue);
    const earnsLoyalty = loyaltyValue > 0;

    const { error } = await supabase.from("products").insert({
      store_id: profile.store_id,
      name: newProductName,
      price: newProductHasVariations ? 0 : parseFloat(newProductPrice), // Preço 0 se tiver variações
      image_url: newProductImageUrl || null,
      category_id: newProductCategoryId && newProductCategoryId !== "none" ? newProductCategoryId : null,
      stock_quantity: newProductHasVariations ? 0 : parseInt(newProductStockQuantity || "0"), // Estoque 0 se tiver variações
      earns_loyalty_points: earnsLoyalty,
      loyalty_points_value: loyaltyValue,
      has_variations: newProductHasVariations, // Salvar has_variations
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao adicionar produto",
        description: error.message,
      });
    } else {
      toast({
        title: "Produto adicionado com sucesso!",
      });
      setNewProductName("");
      setNewProductPrice("");
      setNewProductImageUrl("");
      setNewProductCategoryId("");
      setNewProductLoyaltyPointsValue("0.0");
      setNewProductHasVariations(false);
      setNewProductStockQuantity("0");
      loadProducts();
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este produto? Todas as variações associadas também serão excluídas.")) return;

    const { error } = await supabase.from("products").delete().eq("id", id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir produto",
        description: error.message,
      });
    } else {
      toast({
        title: "Produto excluído com sucesso!",
      });
      loadProducts();
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile?.store_id) return;

    if (editingCategory) {
      // Update existing category
      const { error } = await supabase
        .from("categories")
        .update({ name: categoryName })
        .eq("id", editingCategory.id);

      if (error) {
        toast({
          variant: "destructive",
          title: "Erro ao renomear categoria",
          description: error.message,
        });
      } else {
        toast({
          title: "Categoria renomeada com sucesso!",
        });
        setShowCategoryDialog(false);
        setCategoryName("");
        setEditingCategory(null);
        loadCategories();
      }
    } else {
      // Create new category
      const { error } = await supabase
        .from("categories")
        .insert({
          store_id: profile.store_id,
          name: categoryName,
        });

      if (error) {
        toast({
          variant: "destructive",
          title: "Erro ao criar categoria",
          description: error.message,
        });
      } else {
        toast({
          title: "Categoria criada com sucesso!",
        });
        setShowCategoryDialog(false);
        setCategoryName("");
        loadCategories();
      }
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Tem certeza? Os produtos desta categoria ficarão sem categoria.")) return;

    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir categoria",
        description: error.message,
      });
    } else {
      toast({
        title: "Categoria excluída com sucesso!",
      });
      loadCategories();
    }
  };

  const openEditProductDialog = (product: Product) => {
    setEditingProduct(product);
    setEditProductName(product.name);
    setEditProductPrice(product.price.toString());
    setEditProductImageUrl(product.image_url || "");
    setEditProductCategoryId(product.category_id || "none");
    setEditProductLoyaltyPointsValue(product.loyalty_points_value.toString());
    setEditProductHasVariations(product.has_variations); // Carregar has_variations
    setEditProductStockQuantity(product.stock_quantity.toString()); // Carregar estoque base
    setShowEditProductDialog(true);
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    const loyaltyValue = parseFloat(editProductLoyaltyPointsValue);
    const earnsLoyalty = loyaltyValue > 0;

    const { error } = await supabase
      .from("products")
      .update({
        name: editProductName,
        price: editProductHasVariations ? 0 : parseFloat(editProductPrice), // Preço 0 se tiver variações
        image_url: editProductImageUrl || null,
        category_id: editProductCategoryId && editProductCategoryId !== "none" ? editProductCategoryId : null,
        earns_loyalty_points: earnsLoyalty,
        loyalty_points_value: loyaltyValue,
        has_variations: editProductHasVariations, // Salvar has_variations
        stock_quantity: editProductHasVariations ? 0 : parseInt(editProductStockQuantity || "0"), // Estoque 0 se tiver variações
      })
      .eq("id", editingProduct.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar produto",
        description: error.message,
      });
    } else {
      toast({
        title: "Produto atualizado com sucesso!",
      });
      setShowEditProductDialog(false);
      setEditingProduct(null);
      loadProducts();
    }
  };

  const openVariationsDialog = async (product: Product) => {
    setCurrentProductForVariations(product);
    await loadVariationsForProduct(product.id);
    setShowVariationsDialog(true);
  };

  const handleAddVariation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProductForVariations) return;

    const variationData = {
      product_id: currentProductForVariations.id,
      name: newVariationName,
      price_adjustment: parseFloat(newVariationPriceAdjustment),
      stock_quantity: parseInt(newVariationStockQuantity),
    };

    const { error } = await supabase.from("product_variations").insert(variationData);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao adicionar variação",
        description: error.message,
      });
    } else {
      toast({
        title: "Variação adicionada!",
      });
      setNewVariationName("");
      setNewVariationPriceAdjustment("0.0");
      setNewVariationStockQuantity("0");
      loadVariationsForProduct(currentProductForVariations.id);
    }
  };

  const handleUpdateVariation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVariation) return;

    const variationData = {
      name: newVariationName,
      price_adjustment: parseFloat(newVariationPriceAdjustment),
      stock_quantity: parseInt(newVariationStockQuantity),
    };

    const { error } = await supabase
      .from("product_variations")
      .update(variationData)
      .eq("id", editingVariation.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar variação",
        description: error.message,
      });
    } else {
      toast({
        title: "Variação atualizada!",
      });
      setNewVariationName("");
      setNewVariationPriceAdjustment("0.0");
      setNewVariationStockQuantity("0");
      setEditingVariation(null);
      loadVariationsForProduct(currentProductForVariations!.id);
    }
  };

  const handleDeleteVariation = async (variationId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta variação?")) return;

    const { error } = await supabase
      .from("product_variations")
      .delete()
      .eq("id", variationId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir variação",
        description: error.message,
      });
    } else {
      toast({
        title: "Variação excluída!",
      });
      loadVariationsForProduct(currentProductForVariations!.id);
    }
  };

  const getCategoryName = (categoryId?: string) => {
    if (!categoryId) return "Sem Categoria";
    const category = categories.find(c => c.id === categoryId);
    return category?.name || "Sem Categoria";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Produtos</h1>
        <p className="text-muted-foreground">Gerencie os produtos da loja</p>
      </div>

      {/* Gerenciamento de Categorias */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Categorias</CardTitle>
          <Dialog open={showCategoryDialog} onOpenChange={(open) => {
            setShowCategoryDialog(open);
            if (!open) {
              setEditingCategory(null);
              setCategoryName("");
            }
          }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <FolderPlus className="h-4 w-4 mr-2" />
                Nova Categoria
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingCategory ? "Renomear Categoria" : "Nova Categoria"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSaveCategory} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="categoryName">Nome da Categoria</Label>
                  <Input
                    id="categoryName"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    placeholder="Ex: Bebidas"
                    required
                  />
                </div>
                <Button type="submit" className="w-full">
                  {editingCategory ? "Salvar" : "Criar"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma categoria criada</p>
            ) : (
              categories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center gap-2 bg-accent px-3 py-2 rounded-md"
                >
                  <span className="text-sm font-medium">{category.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => {
                      setEditingCategory(category);
                      setCategoryName(category.name);
                      setShowCategoryDialog(true);
                    }}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-destructive"
                    onClick={() => handleDeleteCategory(category.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Adicionar Produto</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddProduct} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="newProductName">Nome do Produto</Label>
                <Input
                  id="newProductName"
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  placeholder="Ex: Frango com Recheio"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newProductPrice">Preço (R$)</Label>
                <Input
                  id="newProductPrice"
                  type="number"
                  step="0.01"
                  value={newProductPrice}
                  onChange={(e) => setNewProductPrice(e.target.value)}
                  placeholder="25.90"
                  required
                  disabled={newProductHasVariations} // Desabilitar se tiver variações
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newProductCategory">Categoria</Label>
                <Select value={newProductCategoryId} onValueChange={setNewProductCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem Categoria</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="newProductImage">URL da Imagem (opcional)</Label>
                <Input
                  id="newProductImage"
                  type="url"
                  value={newProductImageUrl}
                  onChange={(e) => setNewProductImageUrl(e.target.value)}
                  placeholder="https://exemplo.com/imagem.jpg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newProductLoyaltyPoints">Pontos de Fidelidade</Label>
                <Input
                  id="newProductLoyaltyPoints"
                  type="number"
                  step="0.01"
                  min="0"
                  value={newProductLoyaltyPointsValue}
                  onChange={(e) => setNewProductLoyaltyPointsValue(e.target.value)}
                  placeholder="0.00"
                />
                <p className="text-xs text-muted-foreground">
                  Valor em pontos que este produto concede ao cliente.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="newProductHasVariations"
                  checked={newProductHasVariations}
                  onCheckedChange={setNewProductHasVariations}
                />
                <Label htmlFor="newProductHasVariations">Possui Variações?</Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="newProductStockQuantity">Estoque Inicial</Label>
                <Input
                  id="newProductStockQuantity"
                  type="number"
                  min="0"
                  value={newProductStockQuantity}
                  onChange={(e) => setNewProductStockQuantity(e.target.value)}
                  placeholder="0"
                  required
                  disabled={newProductHasVariations} // Desabilitar se tiver variações
                />
                <p className="text-xs text-muted-foreground">
                  {newProductHasVariations ? "Estoque gerenciado por variações." : "Estoque do produto principal."}
                </p>
              </div>
            </div>
            <Button type="submit" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Produto
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Produtos Cadastrados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {products.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum produto cadastrado
              </p>
            ) : (
              products.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-4 bg-accent rounded-lg"
                >
                  <div className="flex items-center gap-3 flex-1">
                    {product.image_url && (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-12 h-12 object-cover rounded"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {product.has_variations ? "Com Variações" : `R$ ${product.price.toFixed(2)}`}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-muted-foreground">
                          {getCategoryName(product.category_id)}
                        </p>
                        {product.earns_loyalty_points && (
                          <span className="flex items-center text-xs text-primary font-medium">
                            <Star className="h-3 w-3 mr-1" /> {product.loyalty_points_value.toFixed(2)} pts
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {product.has_variations && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openVariationsDialog(product)}
                      >
                        <Settings2 className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditProductDialog(product)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteProduct(product.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Product Dialog */}
      <Dialog open={showEditProductDialog} onOpenChange={(open) => {
        setShowEditProductDialog(open);
        if (!open) {
          setEditingProduct(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Produto</DialogTitle>
          </DialogHeader>
          {editingProduct && (
            <form onSubmit={handleUpdateProduct} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="editProductName">Nome do Produto</Label>
                <Input
                  id="editProductName"
                  value={editProductName}
                  onChange={(e) => setEditProductName(e.target.value)}
                  placeholder="Ex: Frango com Recheio"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editProductPrice">Preço (R$)</Label>
                <Input
                  id="editProductPrice"
                  type="number"
                  step="0.01"
                  value={editProductPrice}
                  onChange={(e) => setEditProductPrice(e.target.value)}
                  placeholder="25.90"
                  required
                  disabled={editProductHasVariations} // Desabilitar se tiver variações
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editProductImageUrl">URL da Imagem (opcional)</Label>
                <Input
                  id="editProductImageUrl"
                  type="url"
                  value={editProductImageUrl}
                  onChange={(e) => setEditProductImageUrl(e.target.value)}
                  placeholder="https://exemplo.com/imagem.jpg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editProductCategory">Categoria</Label>
                <Select value={editProductCategoryId} onValueChange={setEditProductCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem Categoria</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editProductLoyaltyPoints">Pontos de Fidelidade</Label>
                <Input
                  id="editProductLoyaltyPoints"
                  type="number"
                  step="0.01"
                  min="0"
                  value={editProductLoyaltyPointsValue}
                  onChange={(e) => setEditProductLoyaltyPointsValue(e.target.value)}
                  placeholder="0.00"
                />
                <p className="text-xs text-muted-foreground">
                  Valor em pontos que este produto concede ao cliente.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="editProductHasVariations"
                  checked={editProductHasVariations}
                  onCheckedChange={setEditProductHasVariations}
                />
                <Label htmlFor="editProductHasVariations">Possui Variações?</Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editProductStockQuantity">Estoque</Label>
                <Input
                  id="editProductStockQuantity"
                  type="number"
                  min="0"
                  value={editProductStockQuantity}
                  onChange={(e) => setEditProductStockQuantity(e.target.value)}
                  placeholder="0"
                  required
                  disabled={editProductHasVariations} // Desabilitar se tiver variações
                />
                <p className="text-xs text-muted-foreground">
                  {editProductHasVariations ? "Estoque gerenciado por variações." : "Estoque do produto principal."}
                </p>
              </div>
              <Button type="submit" className="w-full">
                Salvar Alterações
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Variation Management Dialog */}
      <Dialog open={showVariationsDialog} onOpenChange={(open) => {
        setShowVariationsDialog(open);
        if (!open) {
          setCurrentProductForVariations(null);
          setEditingVariation(null);
          setNewVariationName("");
          setNewVariationPriceAdjustment("0.0");
          setNewVariationStockQuantity("0");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerenciar Variações para "{currentProductForVariations?.name}"</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <h3 className="text-lg font-semibold">Variações Atuais</h3>
            {productVariations.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma variação cadastrada.</p>
            ) : (
              <div className="space-y-2">
                {productVariations.map((variation) => (
                  <div key={variation.id} className="flex items-center justify-between p-3 bg-accent rounded-lg">
                    <div>
                      <p className="font-medium">{variation.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Ajuste de Preço: R$ {variation.price_adjustment.toFixed(2)} | Estoque: {variation.stock_quantity}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => {
                          setEditingVariation(variation);
                          setNewVariationName(variation.name);
                          setNewVariationPriceAdjustment(variation.price_adjustment.toString());
                          setNewVariationStockQuantity(variation.stock_quantity.toString());
                        }}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-destructive"
                        onClick={() => handleDeleteVariation(variation.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <h3 className="text-lg font-semibold mt-6">
              {editingVariation ? "Editar Variação" : "Adicionar Nova Variação"}
            </h3>
            <form onSubmit={editingVariation ? handleUpdateVariation : handleAddVariation} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="variationName">Nome da Variação</Label>
                <Input
                  id="variationName"
                  value={newVariationName}
                  onChange={(e) => setNewVariationName(e.target.value)}
                  placeholder="Ex: Tamanho P, Sabor Chocolate"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="variationPriceAdjustment">Ajuste de Preço (R$)</Label>
                <Input
                  id="variationPriceAdjustment"
                  type="number"
                  step="0.01"
                  value={newVariationPriceAdjustment}
                  onChange={(e) => setNewVariationPriceAdjustment(e.target.value)}
                  placeholder="0.00 (ex: -2.00 para desconto, 5.00 para acréscimo)"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Este valor será adicionado ao preço base do produto.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="variationStockQuantity">Estoque da Variação</Label>
                <Input
                  id="variationStockQuantity"
                  type="number"
                  min="0"
                  value={newVariationStockQuantity}
                  onChange={(e) => setNewVariationStockQuantity(e.target.value)}
                  placeholder="0"
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                {editingVariation && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditingVariation(null);
                      setNewVariationName("");
                      setNewVariationPriceAdjustment("0.0");
                      setNewVariationStockQuantity("0");
                    }}
                  >
                    Cancelar Edição
                  </Button>
                )}
                <Button type="submit">
                  {editingVariation ? "Salvar Variação" : "Adicionar Variação"}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}