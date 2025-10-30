import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Minus, PackagePlus } from "lucide-react";
import { supabase as sb } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";

const supabase: any = sb;

interface Product {
  id: string;
  name: string;
  stock_quantity: number;
  has_variations: boolean; // Adicionado
}

interface Variation {
  id: string;
  name: string;
  stock_quantity: number;
  product_id: string;
}

export default function Stock() {
  const [products, setProducts] = useState<Product[]>([]);
  const [variations, setVariations] = useState<Variation[]>([]); // Novo estado para variações
  const [showAddStockDialog, setShowAddStockDialog] = useState(false);
  const [manualStockInputs, setManualStockInputs] = useState<Record<string, string>>({});
  const { profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (profile?.store_id) {
      loadProductsAndVariations();
    }
  }, [profile]);

  const loadProductsAndVariations = async () => {
    const { data: productsData, error: productsError } = await supabase
      .from("products" as any)
      .select("id, name, stock_quantity, has_variations")
      .eq("store_id", profile.store_id)
      .order("name");

    if (productsError) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar produtos",
        description: productsError.message,
      });
      return;
    }

    setProducts(productsData || []);

    const { data: variationsData, error: variationsError } = await supabase
      .from("product_variations" as any)
      .select("id, name, stock_quantity, product_id")
      .in("product_id", (productsData || []).map((p: Product) => p.id))
      .order("name");

    if (variationsError) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar variações",
        description: variationsError.message,
      });
      return;
    }
    setVariations(variationsData || []);

    // Initialize manualStockInputs with current stock values
    const initialInputs: Record<string, string> = {};
    (productsData || []).forEach((product: Product) => {
      if (!product.has_variations) {
        initialInputs[product.id] = product.stock_quantity.toString();
      }
    });
    (variationsData || []).forEach((variation: Variation) => {
      initialInputs[variation.id] = variation.stock_quantity.toString();
    });
    setManualStockInputs(initialInputs);
  };

  const updateStock = async (id: string, change: number, isVariation: boolean) => {
    let currentQuantity = 0;
    let tableName = "";

    if (isVariation) {
      const variation = variations.find(v => v.id === id);
      if (!variation) return;
      currentQuantity = variation.stock_quantity;
      tableName = "product_variations";
    } else {
      const product = products.find(p => p.id === id);
      if (!product) return;
      currentQuantity = product.stock_quantity;
      tableName = "products";
    }

    const newQuantity = Math.max(0, currentQuantity + change);

    const { error } = await supabase
      .from(tableName)
      .update({ stock_quantity: newQuantity })
      .eq("id", id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar estoque",
        description: error.message,
      });
    } else {
      loadProductsAndVariations(); // Reload products and variations after update
    }
  };

  const handleManualStockChange = (id: string, value: string) => {
    setManualStockInputs(prev => ({
      ...prev,
      [id]: value,
    }));
  };

  const handleSaveAllStock = async () => {
    if (!profile?.store_id) return;

    const updates = Object.entries(manualStockInputs)
      .filter(([, value]) => value !== "")
      .map(async ([id, value]) => {
        const newQuantity = parseInt(value, 10);
        if (isNaN(newQuantity) || newQuantity < 0) {
          throw new Error(`Quantidade inválida para o item com ID ${id}`);
        }

        const isVariation = variations.some(v => v.id === id);
        const tableName = isVariation ? "product_variations" : "products";

        return supabase
          .from(tableName)
          .update({ stock_quantity: newQuantity })
          .eq("id", id);
      });

    try {
      await Promise.all(updates);
      toast({
        title: "Estoque atualizado!",
        description: "Todos os estoques foram salvos com sucesso.",
      });
      setShowAddStockDialog(false);
      loadProductsAndVariations(); // Reload to reflect changes
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar estoque",
        description: error.message || "Ocorreu um erro ao salvar os estoques.",
      });
    }
  };

  const productsWithoutVariations = products.filter(p => !p.has_variations);
  const productsWithVariations = products.filter(p => p.has_variations);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Estoque</h1>
          <p className="text-muted-foreground">Gerencie o estoque dos produtos e suas variações</p>
        </div>
        {products.length === 0 ? (
          <Button onClick={() => navigate("/produtos")}>
            <PackagePlus className="h-4 w-4 mr-2" />
            Cadastrar Produto
          </Button>
        ) : (
          <Dialog open={showAddStockDialog} onOpenChange={setShowAddStockDialog}>
            <DialogTrigger asChild>
              <Button>
                <PackagePlus className="h-4 w-4 mr-2" />
                Adicionar Estoque
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Adicionar Estoque Manualmente</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto">
                {productsWithoutVariations.map((product) => (
                  <div key={product.id} className="grid grid-cols-3 items-center gap-4">
                    <Label htmlFor={`stock-${product.id}`} className="col-span-2">
                      {product.name}
                    </Label>
                    <Input
                      id={`stock-${product.id}`}
                      type="number"
                      min="0"
                      value={manualStockInputs[product.id] || ""}
                      onChange={(e) => handleManualStockChange(product.id, e.target.value)}
                      className="col-span-1"
                    />
                  </div>
                ))}
                {productsWithVariations.map((product) => (
                  <div key={product.id} className="space-y-2">
                    <h4 className="font-semibold mt-4">{product.name} (Variações)</h4>
                    {variations.filter(v => v.product_id === product.id).map(variation => (
                      <div key={variation.id} className="grid grid-cols-3 items-center gap-4 pl-4">
                        <Label htmlFor={`stock-${variation.id}`} className="col-span-2 text-sm">
                          - {variation.name}
                        </Label>
                        <Input
                          id={`stock-${variation.id}`}
                          type="number"
                          min="0"
                          value={manualStockInputs[variation.id] || ""}
                          onChange={(e) => handleManualStockChange(variation.id, e.target.value)}
                          className="col-span-1"
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSaveAllStock}>Salvar Estoque</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {productsWithoutVariations.map((product) => (
          <Card key={product.id} className="shadow-soft">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateStock(product.id, -1, false)}
                  disabled={product.stock_quantity === 0}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                
                <div className="flex-1 text-center">
                  <p className="font-medium text-sm">{product.name}</p>
                  <p className="text-2xl font-bold text-primary">
                    {product.stock_quantity}
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateStock(product.id, 1, false)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {productsWithVariations.map((product) => (
          <Card key={product.id} className="shadow-soft col-span-1 md:col-span-2 lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{product.name} (Variações)</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              {variations.filter(v => v.product_id === product.id).map(variation => (
                <div key={variation.id} className="flex items-center justify-between gap-2 border-b pb-2 last:border-b-0 last:pb-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateStock(variation.id, -1, true)}
                    disabled={variation.stock_quantity === 0}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  
                  <div className="flex-1 text-center">
                    <p className="font-medium text-sm">{variation.name}</p>
                    <p className="text-xl font-bold text-primary">
                      {variation.stock_quantity}
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateStock(variation.id, 1, true)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}