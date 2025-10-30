import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Plus, 
  Minus, 
  ShoppingCart, 
  Trash2,
  Hash,
  Smartphone,
  Monitor,
  User,
  CreditCard,
  Banknote,
  QrCode,
  Star,
} from "lucide-react";
import { supabase as sb } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
const supabase: any = sb;

interface Product {
  id: string;
  name: string;
  price: number;
  stock_quantity: number;
  has_variations: boolean; // Adicionado
  earns_loyalty_points: boolean; // Adicionado
  loyalty_points_value: number; // Adicionado
  min_variation_price?: number; // Novo campo
  max_variation_price?: number; // Novo campo
}

interface Variation {
  id: string;
  product_id: string;
  name: string;
  price_adjustment: number;
  stock_quantity: number;
}

interface CartItem extends Product {
  quantity: number;
  selectedVariation?: Variation; // Adicionado
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  points: number;
}

type OrderSource = "totem" | "whatsapp" | "presencial" | "ifood";
type PaymentMethod = "pix" | "credito" | "debito" | "dinheiro" | "fidelidade";

export default function PDV() {
  const [products, setProducts] = useState<Product[]>([]);
  const [allVariations, setAllVariations] = useState<Variation[]>([]); // Todas as variações carregadas
  const [cart, setCart] = useState<CartItem[]>([]);
  const [phone, setPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [source, setSource] = useState<OrderSource>("presencial");
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [showSelectVariationDialog, setShowSelectVariationDialog] = useState(false); // Novo estado
  const [productToSelectVariation, setProductToSelectVariation] = useState<Product | null>(null); // Produto para selecionar variação
  const [selectedVariationForProduct, setSelectedVariationForProduct] = useState<Variation | null>(null); // Variação selecionada no modal
  const [showPaymentDialog, setShowPaymentDialog] = useState(false); // Mantido, mas não usado diretamente aqui
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [isDelivery, setIsDelivery] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState("");
  const [changeFor, setChangeFor] = useState("");
  const { profile, user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (profile?.store_id) {
      loadProductsAndVariations();
    }
  }, [profile]);

  const loadProductsAndVariations = async () => {
    const { data: productsData, error: productsError } = await supabase
      .from("products")
      .select("id, name, price, stock_quantity, has_variations, earns_loyalty_points, loyalty_points_value")
      .eq("store_id", profile.store_id)
      .eq("active", true)
      .order("name");

    if (productsError) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar produtos",
        description: productsError.message,
      });
      return;
    }

    const productIdsWithVariations = (productsData || []).filter((p: Product) => p.has_variations).map((p: Product) => p.id);
    let variationsData: Variation[] = [];

    if (productIdsWithVariations.length > 0) {
      const { data: fetchedVariations, error: variationsError } = await supabase
        .from("product_variations")
        .select("*")
        .in("product_id", productIdsWithVariations)
        .order("name");

      if (variationsError) {
        toast({
          variant: "destructive",
          title: "Erro ao carregar variações",
          description: variationsError.message,
        });
        return;
      }
      variationsData = fetchedVariations || [];
    }
    setAllVariations(variationsData);

    const variationsByProductId = new Map<string, Variation[]>();
    variationsData.forEach(v => {
      const existing = variationsByProductId.get(v.product_id) || [];
      existing.push(v);
      variationsByProductId.set(v.product_id, existing);
    });

    const productsWithCalculatedPrices = (productsData || []).map((product: Product) => {
      if (product.has_variations) {
        const productVariations = variationsByProductId.get(product.id) || [];
        if (productVariations.length > 0) {
          const finalPrices = productVariations.map(v => product.price + v.price_adjustment);
          product.min_variation_price = Math.min(...finalPrices);
          product.max_variation_price = Math.max(...finalPrices);
        } else {
          product.min_variation_price = 0;
          product.max_variation_price = 0;
        }
      }
      return product;
    });

    setProducts(productsWithCalculatedPrices);
  };

  const checkCustomer = async (phoneNumber: string) => {
    const { data } = await supabase
      .from("customers" as any)
      .select("*")
      .eq("store_id", profile.store_id)
      .eq("phone", phoneNumber)
      .maybeSingle();

    return data;
  };

  const handleCustomerLookup = async () => {
    if (!phone) return;
    
    const customerData = await checkCustomer(phone);
    if (customerData && 'id' in customerData) {
      setCustomer(customerData as unknown as Customer);
      toast({
        title: "Cliente encontrado!",
        description: `Bem-vindo ${(customerData as unknown as Customer).name}`,
      });
    } else {
      setShowCustomerDialog(true);
    }
  };

  const handleAddToCart = async (product: Product) => {
    if ((source === "whatsapp" || source === "ifood") && !phone) {
      setPendingProduct(product);
      setShowCustomerDialog(true);
      return;
    }

    if (product.has_variations) {
      setProductToSelectVariation(product);
      setShowSelectVariationDialog(true);
    } else {
      addProductToCart(product);
    }
  };

  const addProductToCart = (product: Product, variation?: Variation) => {
    const itemPrice = variation ? product.price + variation.price_adjustment : product.price;
    const itemStock = variation ? variation.stock_quantity : product.stock_quantity;
    const itemId = variation ? `${product.id}-${variation.id}` : product.id;

    const existingItem = cart.find(item => 
      item.id === product.id && item.selectedVariation?.id === variation?.id
    );
    
    if (existingItem) {
      if (existingItem.quantity >= itemStock) {
        toast({
          variant: "destructive",
          title: "Estoque insuficiente",
          description: `Apenas ${itemStock} unidades disponíveis para ${product.name} ${variation?.name ? `(${variation.name})` : ''}.`,
        });
        return;
      }
      setCart(cart.map(item =>
        item.id === product.id && item.selectedVariation?.id === variation?.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      if (1 > itemStock) { // Check if initial quantity (1) exceeds stock
        toast({
          variant: "destructive",
          title: "Estoque insuficiente",
          description: `Apenas ${itemStock} unidades disponíveis para ${product.name} ${variation?.name ? `(${variation.name})` : ''}.`,
        });
        return;
      }
      setCart([...cart, { 
        ...product, 
        id: product.id, // Keep original product ID
        quantity: 1, 
        price: itemPrice, // Use adjusted price
        stock_quantity: itemStock, // Use variation stock
        selectedVariation: variation 
      }]);
    }
    toast({
      title: "Produto adicionado!",
      description: `${product.name} ${variation ? `(${variation.name})` : ''} adicionado ao carrinho.`,
    });
  };

  const handleSelectVariationAndAddToCart = () => {
    if (!productToSelectVariation || !selectedVariationForProduct) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Selecione uma variação válida.",
      });
      return;
    }
    addProductToCart(productToSelectVariation, selectedVariationForProduct);
    setShowSelectVariationDialog(false);
    setProductToSelectVariation(null);
    setSelectedVariationForProduct(null);
  };

  const handleCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const customer = await checkCustomer(phone);
    
    if (!customer && !customerName) {
      toast({
        variant: "destructive",
        title: "Nome obrigatório",
        description: "Este é um cliente novo, informe o nome",
      });
      return;
    }

    if (!customer && customerName) {
      const { data: newCustomer } = await supabase.from("customers" as any).insert({
        store_id: profile.store_id,
        phone,
        name: customerName,
        points: 0,
      }).select().single();
      
      if (newCustomer && 'id' in newCustomer) {
        setCustomer(newCustomer as unknown as Customer);
      }
    }

    setShowCustomerDialog(false);
    if (pendingProduct) {
      if (pendingProduct.has_variations) {
        setProductToSelectVariation(pendingProduct);
        setShowSelectVariationDialog(true);
      } else {
        addProductToCart(pendingProduct);
      }
      setPendingProduct(null);
    }
  };

  const updateQuantity = (productId: string, variationId: string | undefined, quantity: number) => {
    const itemInCart = cart.find(item => 
      item.id === productId && item.selectedVariation?.id === variationId
    );

    if (!itemInCart) return;

    const currentStock = itemInCart.selectedVariation 
      ? itemInCart.selectedVariation.stock_quantity 
      : itemInCart.stock_quantity;

    if (quantity > currentStock) {
      toast({
        variant: "destructive",
        title: "Estoque insuficiente",
        description: `Apenas ${currentStock} unidades disponíveis para ${itemInCart.name} ${itemInCart.selectedVariation?.name ? `(${itemInCart.selectedVariation.name})` : ''}.`,
      });
      return;
    }

    if (quantity === 0) {
      setCart(cart.filter(item => !(item.id === productId && item.selectedVariation?.id === variationId)));
    } else {
      setCart(cart.map(item =>
        item.id === productId && item.selectedVariation?.id === variationId
          ? { ...item, quantity }
          : item
      ));
    }
  };

  const clearCart = () => {
    setCart([]);
    setPhone("");
    setCustomerName("");
    setCustomer(null);
    setPaymentMethod(null);
    setIsDelivery(false);
    setDeliveryFee("");
    setChangeFor("");
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const deliveryAmount = isDelivery && deliveryFee ? parseFloat(deliveryFee) : 0;
  const total = subtotal + deliveryAmount;

  const printOrder = (orderNumber: string) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Pedido ${orderNumber}</title>
            <style>
              body { font-family: monospace; padding: 20px; }
              h1 { text-align: center; }
              table { width: 100%; border-collapse: collapse; margin: 20px 0; }
              th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
              .total { font-size: 18px; font-weight: bold; margin-top: 20px; }
            </style>
          </head>
          <body>
            <h1>PEDIDO #${orderNumber}</h1>
            <p>Data: ${new Date().toLocaleString()}</p>
            <p>Origem: ${source.toUpperCase()}</p>
            ${phone ? `<p>Tel: ${phone}</p>` : ''}
            ${customer?.name ? `<p>Cliente: ${customer.name}</p>` : ''}
            <table>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Qtd</th>
                  <th>Preço</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${cart.map(item => `
                  <tr>
                    <td>${item.name} ${item.selectedVariation ? `(${item.selectedVariation.name})` : ''}</td>
                    <td>${item.quantity}</td>
                    <td>R$ ${(item.price).toFixed(2)}</td>
                    <td>R$ ${(item.price * item.quantity).toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            ${isDelivery && deliveryAmount > 0 ? `<p>Taxa de Entrega: R$ ${deliveryAmount.toFixed(2)}</p>` : ''}
            <div class="total">TOTAL: R$ ${total.toFixed(2)}</div>
            <p>Pagamento: ${paymentMethod?.charAt(0).toUpperCase() + paymentMethod?.slice(1)}</p>
            ${paymentMethod === "dinheiro" && changeFor ? `<p>Troco para: R$ ${parseFloat(changeFor).toFixed(2)}</p>` : ''}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
      printWindow.close();
    }
  };

  const finishOrder = async () => {
    if (cart.length === 0) {
      toast({
        variant: "destructive",
        title: "Carrinho vazio",
        description: "Adicione produtos antes de finalizar",
      });
      return;
    }

    if (!paymentMethod) {
      toast({
        variant: "destructive",
        title: "Selecione forma de pagamento",
      });
      return;
    }

    // Check loyalty points if payment is fidelidade
    if (paymentMethod === "fidelidade") {
      if (!customer || customer.points < 9) {
        toast({
          variant: "destructive",
          title: "Pontos insuficientes",
          description: `${customer ? `Você tem ${customer.points} pontos` : "Cliente não identificado"}. Necessário 9 pontos.`,
        });
        return;
      }
    }

    const { data: cashRegister } = await supabase
      .from("cash_register" as any)
      .select("id")
      .eq("store_id", profile.store_id)
      .is("closed_at", null)
      .maybeSingle();

    if (!cashRegister || !('id' in cashRegister)) {
      toast({
        variant: "destructive",
        title: "Caixa fechado",
        description: "Abra o caixa antes de fazer vendas",
      });
      return;
    }

    const cashRegisterId = (cashRegister as any).id;

    const orderNumber = `PED-${Date.now().toString().slice(-6)}`;

    let customerId = customer?.id || null;

    const { data: order, error: orderError } = await supabase
      .from("orders" as any)
      .insert({
        store_id: profile.store_id,
        order_number: orderNumber,
        customer_id: customerId,
        source,
        total,
        payment_method: paymentMethod,
        delivery: isDelivery,
        delivery_fee: deliveryAmount,
        change_for: paymentMethod === "dinheiro" && changeFor ? parseFloat(changeFor) : null,
        cash_register_id: cashRegisterId,
        created_by: user?.id,
      })
      .select()
      .single();

    if (orderError || !order || !('id' in order)) {
      toast({
        variant: "destructive",
        title: "Erro ao criar pedido",
        description: orderError?.message || "Erro desconhecido",
      });
      return;
    }

    const orderId = (order as any)?.id;
    const orderItems = cart.map(item => ({
      order_id: orderId,
      product_id: item.id,
      product_name: item.name,
      product_price: item.price,
      quantity: item.quantity,
      subtotal: item.price * item.quantity,
      product_variation_id: item.selectedVariation?.id || null, // Salvar ID da variação
      variation_name: item.selectedVariation?.name || null, // Salvar nome da variação
    }));

    const { error: itemsError } = await supabase
      .from("order_items" as any)
      .insert(orderItems);

    if (itemsError) {
      toast({
        variant: "destructive",
        title: "Erro ao adicionar itens",
        description: itemsError.message,
      });
      return;
    }

    // --- ATUALIZAÇÃO DE ESTOQUE (PRODUTOS E VARIAÇÕES) ---
    const stockUpdatePromises = cart.map(async (item) => {
      if (item.selectedVariation) {
        // Update variation stock
        const { error: stockError } = await supabase
          .from("product_variations")
          .update({ stock_quantity: item.selectedVariation.stock_quantity - item.quantity })
          .eq("id", item.selectedVariation.id);

        if (stockError) {
          console.error(`Erro ao atualizar estoque da variação ${item.selectedVariation.name}:`, stockError.message);
        }
      } else {
        // Update base product stock
        const { error: stockError } = await supabase
          .from("products")
          .update({ stock_quantity: item.stock_quantity - item.quantity })
          .eq("id", item.id);

        if (stockError) {
          console.error(`Erro ao atualizar estoque do produto ${item.name}:`, stockError.message);
        }
      }
    });

    await Promise.all(stockUpdatePromises);
    // --- FIM DA ATUALIZAÇÃO DE ESTOQUE ---

    // Handle loyalty (only redeem points here, earning points will be handled when order status is 'ready')
    if (paymentMethod === "fidelidade" && customer && 'id' in customer) {
      // Deduct 9 points
      await supabase
        .from("customers" as any)
        .update({ points: customer.points - 9 })
        .eq("id", customer.id);

      await supabase
        .from("loyalty_transactions" as any)
        .insert({
          customer_id: customer.id,
          order_id: orderId,
          points: -9,
          transaction_type: "redeem",
          store_id: profile.store_id, // Adicionado store_id
        });
    }
    // Removida a lógica de atribuição de pontos (earn) daqui. Será feita no OrderPanel.

    toast({
      title: "Pedido finalizado!",
      description: `Pedido ${orderNumber} criado com sucesso`,
    });

    printOrder(orderNumber);
    clearCart();
    setShowPaymentDialog(false);
    loadProductsAndVariations(); // Recarregar produtos e variações para refletir o estoque atualizado
  };

  const sourceIcons = {
    totem: Monitor,
    whatsapp: Smartphone,
    presencial: User,
    ifood: ShoppingCart,
  };

  const paymentMethodIcons = {
    pix: QrCode,
    credito: CreditCard,
    debito: CreditCard,
    dinheiro: Banknote,
    fidelidade: Star,
  };

  const paymentMethodLabels = {
    pix: "PIX",
    credito: "Crédito",
    debito: "Débito",
    dinheiro: "Dinheiro",
    fidelidade: "Fidelidade",
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-2rem)]">
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">PDV - Ponto de Venda</h1>
            <p className="text-muted-foreground">Selecione os produtos para adicionar ao pedido</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto max-h-[calc(100vh-12rem)]">
          {products.map((product) => {
            const isOutOfStock = product.has_variations 
              ? allVariations.filter(v => v.product_id === product.id).every(v => v.stock_quantity === 0)
              : product.stock_quantity === 0;
            return (
              <Card key={product.id} className={`shadow-soft ${isOutOfStock ? 'opacity-60' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{product.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {product.has_variations ? "Com variações" : `Estoque: ${product.stock_quantity}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-primary">
                      {product.has_variations ? (
                        product.min_variation_price === product.max_variation_price ? (
                          `R$ ${product.min_variation_price?.toFixed(2)}`
                        ) : (
                          `R$ ${product.min_variation_price?.toFixed(2)} - ${product.max_variation_price?.toFixed(2)}`
                        )
                      ) : (
                        `R$ ${product.price.toFixed(2)}`
                      )}
                    </span>
                    <Button
                      onClick={() => handleAddToCart(product)}
                      className="shadow-soft"
                      disabled={isOutOfStock}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {isOutOfStock ? "Sem Estoque" : "Adicionar"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Cliente Fidelidade</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                type="tel"
                placeholder="Celular do cliente"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                inputMode="numeric"
                pattern="[0-9]*"
              />
              <Button onClick={handleCustomerLookup} size="sm">
                OK
              </Button>
            </div>
            {customer && (
              <div className="p-3 bg-primary/10 rounded-lg">
                <p className="font-medium">{customer.name}</p>
                <p className="text-sm text-muted-foreground">
                  {customer.points} pontos
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Carrinho
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {(["presencial", "whatsapp", "ifood"] as OrderSource[]).map((s) => {
              const Icon = sourceIcons[s];
              return (
                <Button
                  key={s}
                  variant={source === s ? "default" : "outline"}
                  onClick={() => setSource(s)}
                  size="sm"
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </Button>
              );
            })}
          </div>
            {cart.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Carrinho vazio
              </p>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div key={`${item.id}-${item.selectedVariation?.id || ''}`} className="flex items-center justify-between p-3 bg-accent rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">
                        {item.name} {item.selectedVariation && `(${item.selectedVariation.name})`}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        R$ {item.price.toFixed(2)} cada
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuantity(item.id, item.selectedVariation?.id, item.quantity - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuantity(item.id, item.selectedVariation?.id, item.quantity + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {cart.length > 0 && (
              <>
                <Separator />
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="delivery" className="cursor-pointer">Entrega?</Label>
                    <Checkbox
                      id="delivery"
                      checked={isDelivery}
                      onCheckedChange={(checked) => setIsDelivery(checked === true)}
                    />
                  </div>
                  
                  {isDelivery && (
                    <div className="space-y-2">
                      <Label htmlFor="deliveryFee">Taxa de Entrega</Label>
                      <Input
                        id="deliveryFee"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={deliveryFee}
                        onChange={(e) => setDeliveryFee(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="paymentMethod">Forma de Pagamento</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {(["pix", "credito", "debito", "dinheiro", "fidelidade"] as PaymentMethod[]).map((method) => {
                        const Icon = paymentMethodIcons[method];
                        return (
                          <Button
                            key={method}
                            variant={paymentMethod === method ? "default" : "outline"}
                            onClick={() => setPaymentMethod(method)}
                            className="flex items-center justify-center gap-2"
                          >
                            <Icon className="h-4 w-4" />
                            {paymentMethodLabels[method]}
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  {paymentMethod === "dinheiro" && (
                    <div className="space-y-2">
                      <Label htmlFor="changeFor">Troco para quanto?</Label>
                      <Input
                        id="changeFor"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={changeFor}
                        onChange={(e) => setChangeFor(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                <Separator />
                
                <div className="space-y-2">
                  {isDelivery && deliveryFee && (
                    <div className="flex items-center justify-between text-sm">
                      <span>Subtotal:</span>
                      <span>R$ {subtotal.toFixed(2)}</span>
                    </div>
                  )}
                  {isDelivery && deliveryFee && (
                    <div className="flex items-center justify-between text-sm">
                      <span>Taxa de Entrega:</span>
                      <span>R$ {deliveryAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-lg font-semibold">
                    <span>Total:</span>
                    <span className="text-primary">R$ {total.toFixed(2)}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" onClick={clearCart}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Limpar
                    </Button>
                    <Button onClick={finishOrder} className="shadow-soft">
                      <Hash className="h-4 w-4 mr-2" />
                      Finalizar
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showCustomerDialog} onOpenChange={setShowCustomerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Informações do Cliente</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCustomerSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 99999-9999"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Nome (se for cliente novo)</Label>
              <Input
                id="name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Nome do cliente"
              />
            </div>
            <Button type="submit" className="w-full">
              Confirmar
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog para selecionar variação */}
      <Dialog open={showSelectVariationDialog} onOpenChange={setShowSelectVariationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Selecione a Variação</DialogTitle>
          </DialogHeader>
          {productToSelectVariation && (
            <div className="space-y-4">
              <p className="text-lg font-semibold">{productToSelectVariation.name}</p>
              <Select
                value={selectedVariationForProduct?.id || ""}
                onValueChange={(value) => setSelectedVariationForProduct(allVariations.find(v => v.id === value) || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Escolha uma variação" />
                </SelectTrigger>
                <SelectContent>
                  {allVariations
                    .filter(v => v.product_id === productToSelectVariation.id && v.stock_quantity > 0)
                    .map(variation => (
                      <SelectItem key={variation.id} value={variation.id}>
                        {variation.name} (R$ {(productToSelectVariation.price + variation.price_adjustment).toFixed(2)}) - Estoque: {variation.stock_quantity}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {selectedVariationForProduct && selectedVariationForProduct.stock_quantity === 0 && (
                <p className="text-sm text-destructive">Esta variação está sem estoque.</p>
              )}
              <Button 
                onClick={handleSelectVariationAndAddToCart} 
                className="w-full"
                disabled={!selectedVariationForProduct || selectedVariationForProduct.stock_quantity === 0}
              >
                Adicionar ao Carrinho
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}