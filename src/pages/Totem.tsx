import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Minus, Clock, Calendar as CalendarIcon, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase as sb } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";

const supabase: any = sb;

interface Customer {
  id: string;
  name: string;
  phone: string;
  points: number;
}

interface Product {
  id: string;
  name: string;
  price: number;
  stock_quantity: number;
  image_url?: string;
  earns_loyalty_points: boolean;
  loyalty_points_value: number;
  has_variations: boolean; // Adicionado
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

type PaymentMethod = "pix" | "credito" | "debito" | "dinheiro";

export default function Totem() {
  const { slug } = useParams();
  const [storeId, setStoreId] = useState<string | null>(null);
  const [storeName, setStoreName] = useState("Minha Loja");
  const [storeActive, setStoreActive] = useState(true);
  const [storeLogoUrl, setStoreLogoUrl] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [allVariations, setAllVariations] = useState<Variation[]>([]); // Todas as variações carregadas
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [isReservation, setIsReservation] = useState(false);
  const [reservationDate, setReservationDate] = useState<Date>();
  const [pickupTime, setPickupTime] = useState<string>("");
  const [needsChange, setNeedsChange] = useState(false);
  const [changeFor, setChangeFor] = useState("");
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [lastOrderNumber, setLastOrderNumber] = useState("");
  const [phoneChecked, setPhoneChecked] = useState(false);
  const [showSelectVariationDialog, setShowSelectVariationDialog] = useState(false); // Novo estado
  const [productToSelectVariation, setProductToSelectVariation] = useState<Product | null>(null); // Produto para selecionar variação
  const [selectedVariationForProduct, setSelectedVariationForProduct] = useState<Variation | null>(null); // Variação selecionada no modal
  const { toast } = useToast();

  useEffect(() => {
    loadStoreInfo();
  }, [slug]);

  useEffect(() => {
    if (storeId) {
      loadProductsAndVariations();
    }
  }, [storeId]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showSuccessScreen && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (showSuccessScreen && countdown === 0) {
      handleNewOrder();
    }
    return () => clearTimeout(timer);
  }, [showSuccessScreen, countdown]);

  const loadStoreInfo = async () => {
    let query = supabase.from("stores" as any).select("*");
    
    if (slug) {
      query = query.eq("slug", slug);
    }
    
    const { data, error } = await query.maybeSingle();

    if (error || !data) {
      toast({
        variant: "destructive",
        title: "Loja não encontrada",
        description: slug ? "Esta URL de loja não existe" : "Nenhuma loja disponível",
      });
      return;
    }

    setStoreId((data as any).id);
    setStoreName((data as any).display_name || (data as any).name);
    setStoreActive((data as any).is_active ?? true);
    setStoreLogoUrl((data as any).image_url || null);
  };

  const loadProductsAndVariations = async () => {
    if (!storeId) return;

    const { data: productsData, error: productsError } = await supabase
      .from("products" as any)
      .select("id, name, price, stock_quantity, image_url, earns_loyalty_points, loyalty_points_value, has_variations") // Selecionar campos de fidelidade e variações
      .eq("store_id", storeId)
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
    setProducts(productsData as unknown as Product[]);

    const productIdsWithVariations = (productsData || []).filter((p: Product) => p.has_variations).map((p: Product) => p.id);

    if (productIdsWithVariations.length > 0) {
      const { data: variationsData, error: variationsError } = await supabase
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
      setAllVariations(variationsData || []);
    } else {
      setAllVariations([]);
    }
  };

  const handleCheckPhone = async () => {
    if (!phone || phone.length < 10) {
      toast({
        variant: "destructive",
        title: "Número inválido",
        description: "Digite um número de celular válido",
      });
      return;
    }

    if (!storeId) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Loja não disponível",
      });
      return;
    }

    const { data: existingCustomer } = await supabase
      .from("customers" as any)
      .select("*")
      .eq("phone", phone)
      .eq("store_id", storeId)
      .maybeSingle();

    if (existingCustomer) {
      setCustomer(existingCustomer as unknown as Customer);
      setName((existingCustomer as any).name || "");
      toast({
        title: `Bem-vindo, ${(existingCustomer as any).name}!`,
        description: "Seu número foi reconhecido.",
      });
    } else {
      setCustomer(null);
      setName("");
      toast({
        title: "Novo cliente",
        description: "Por favor, informe seu nome para continuar.",
      });
    }
    setPhoneChecked(true);
  };

  const addToCart = (product: Product) => {
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
      setCart(cart.map((item) =>
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

  const handleNewOrder = () => {
    setCart([]);
    setPhone("");
    setName("");
    setCustomer(null);
    setPaymentMethod(null);
    setIsReservation(false);
    setReservationDate(undefined);
    setPickupTime("");
    setNeedsChange(false);
    setChangeFor("");
    setShowSuccessScreen(false);
    setCountdown(5);
    setLastOrderNumber("");
    setPhoneChecked(false);
    loadProductsAndVariations();
  };

  const finishOrder = async () => {
    if (cart.length === 0) {
      toast({
        variant: "destructive",
        title: "Carrinho vazio",
      });
      return;
    }

    if (!storeId) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Loja não disponível",
      });
      return;
    }

    if (!storeActive) {
      toast({
        variant: "destructive",
        title: "Loja fechada",
        description: "A loja não está aceitando pedidos no momento",
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

    if (isReservation && !pickupTime) {
      toast({
        variant: "destructive",
        title: "Horário obrigatório",
        description: "Selecione o horário de retirada",
      });
      return;
    }

    if (!phone || (phone && phone.length < 10)) {
      toast({
        variant: "destructive",
        title: "Número de celular inválido",
        description: "Por favor, insira um número de celular válido para contato.",
      });
      return;
    }

    if (!customer && !name) {
      toast({
        variant: "destructive",
        title: "Nome obrigatório",
        description: "Por favor, insira seu nome para o pedido.",
      });
      return;
    }

    let currentCustomer = customer;
    if (!currentCustomer) {
      const { data: newCustomer, error: newCustomerError } = await supabase
        .from("customers" as any)
        .insert({ phone, name, points: 0, store_id: storeId })
        .select()
        .single();

      if (newCustomerError) {
        toast({ variant: "destructive", title: "Erro ao cadastrar cliente", description: newCustomerError.message });
        return;
      }
      currentCustomer = newCustomer as unknown as Customer;
      setCustomer(currentCustomer);
    }

    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const orderNumber = `PED-${Date.now().toString().slice(-6)}`;

    let cashRegisterIdForOrder = null;
    if (!isReservation) {
      const { data: openCashRegister } = await supabase
        .from("cash_register" as any)
        .select("id")
        .eq("store_id", storeId)
        .is("closed_at", null)
        .maybeSingle();

      if (!openCashRegister) {
        toast({
          variant: "destructive",
          title: "Caixa fechado",
          description: "Não é possível fazer pedidos imediatos com o caixa fechado.",
        });
        return;
      }
      cashRegisterIdForOrder = openCashRegister.id;
    }

    const { data: order, error } = await supabase
      .from("orders" as any)
      .insert({
        store_id: storeId,
        order_number: orderNumber,
        customer_id: currentCustomer.id,
        source: "totem",
        total,
        payment_method: paymentMethod,
        reservation_date: isReservation && reservationDate ? format(reservationDate, "yyyy-MM-dd") : null,
        pickup_time: isReservation ? pickupTime : null,
        delivery: false,
        delivery_address: null,
        delivery_number: null,
        delivery_reference: null,
        delivery_cep: null,
        change_for: paymentMethod === "dinheiro" && needsChange ? parseFloat(changeFor) : null,
        cash_register_id: cashRegisterIdForOrder, // Assign cash register ID here
      })
      .select()
      .single();

    if (error || !order) {
      toast({
        variant: "destructive",
        title: "Erro ao criar pedido",
        description: error?.message,
      });
      return;
    }

    const orderItems = cart.map((item) => ({
      order_id: (order as any).id,
      product_id: item.id,
      product_name: item.name,
      product_price: item.price,
      quantity: item.quantity,
      subtotal: item.price * item.quantity,
      product_variation_id: item.selectedVariation?.id || null, // Salvar ID da variação
      variation_name: item.selectedVariation?.name || null, // Salvar nome da variação
    }));

    await supabase.from("order_items" as any).insert(orderItems);

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

    if (currentCustomer) {
      let pointsEarned = 0;
      cart.forEach(item => {
        if (item.earns_loyalty_points && item.loyalty_points_value > 0) {
          pointsEarned += item.loyalty_points_value * item.quantity;
        }
      });

      if (pointsEarned > 0) {
        await supabase
          .from("customers" as any)
          .update({ points: currentCustomer.points + pointsEarned })
          .eq("id", currentCustomer.id);

        await supabase.from("loyalty_transactions" as any).insert({
          customer_id: currentCustomer.id,
          order_id: (order as any).id,
          points_change: pointsEarned,
          transaction_type: "earn",
        });
      }
    }

    setLastOrderNumber(orderNumber);
    setShowSuccessScreen(true);
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const timeSlots = [];
  for (let hour = 10; hour <= 14; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      if (hour === 10 && minute === 0) continue;
      if (hour === 14 && minute > 0) break;
      const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      timeSlots.push(time);
    }
  }

  if (!storeId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <p className="text-muted-foreground">Carregando totem...</p>
      </div>
    );
  }

  if (!storeActive) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-primary/5 to-primary/10">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader>
            {storeLogoUrl && (
              <div className="flex justify-center mb-4">
                <img src={storeLogoUrl} alt={`${storeName} logo`} className="h-24 object-contain" />
              </div>
            )}
            <CardTitle className="text-2xl text-center flex items-center justify-center gap-2">
              <AlertCircle className="h-6 w-6" />
              {storeName}
            </CardTitle>
            <p className="text-center text-muted-foreground">
              Desculpe, estamos fechados no momento. Volte mais tarde!
            </p>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (showSuccessScreen) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-success/5 to-success/10 text-center">
        <CheckCircle2 className="h-32 w-32 text-success mb-8 animate-bounce" />
        <h1 className="text-5xl font-bold text-foreground mb-4">Pedido Concluído!</h1>
        <p className="text-2xl text-muted-foreground mb-8">
          Seu pedido <span className="font-bold text-primary">#{lastOrderNumber}</span> foi enviado. Só aguardar!
        </p>
        <Button onClick={handleNewOrder} className="w-full max-w-xs text-lg py-6 shadow-soft">
          Fazer Novo Pedido ({countdown}s)
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-primary/5 to-primary/10">
      <div className="max-w-6xl mx-auto">
        <Card className="shadow-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                {storeLogoUrl && (
                  <div className="flex justify-start mb-2">
                    <img src={storeLogoUrl} alt={`${storeName} logo`} className="h-16 object-contain" />
                  </div>
                )}
                <CardTitle className="text-2xl">{storeName}</CardTitle>
                <p className="text-muted-foreground">Faça seu pedido</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Nosso Cardápio</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {products.map((product) => {
                  const isOutOfStock = product.has_variations 
                    ? allVariations.filter(v => v.product_id === product.id).every(v => v.stock_quantity === 0)
                    : product.stock_quantity === 0;
                  return (
                    <Card key={product.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          {product.image_url && (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-16 h-16 object-cover rounded"
                            />
                          )}
                          <div className="flex-1">
                            <p className="font-medium">{product.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {product.has_variations ? "Com variações" : `Estoque: ${product.stock_quantity}`}
                            </p>
                            <p className="text-lg font-bold text-primary">
                              R$ {product.price.toFixed(2)}
                            </p>
                          </div>
                          <Button onClick={() => addToCart(product)} size="sm" disabled={isOutOfStock}>
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {cart.length > 0 && (
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle>Seu Carrinho</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {cart.map((item) => (
                      <div key={`${item.id}-${item.selectedVariation?.id || ''}`} className="flex items-center justify-between">
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
                          <span className="w-8 text-center">{item.quantity}</span>
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

                    <div className="space-y-3 pt-4 border-t">
                      <div className="space-y-2">
                        <Label htmlFor="phone">Seu Celular</Label>
                        <div className="flex gap-2">
                          <Input
                            id="phone"
                            type="tel"
                            placeholder="(11) 99999-9999"
                            value={phone}
                            onChange={(e) => {
                              setPhone(e.target.value.replace(/\D/g, ''));
                              setPhoneChecked(false);
                              setCustomer(null);
                              setName("");
                            }}
                            inputMode="numeric"
                            pattern="[0-9]*"
                            required
                          />
                          <Button onClick={handleCheckPhone} type="button" size="sm">
                            Verificar
                          </Button>
                        </div>
                      </div>

                      {phoneChecked && !customer && (
                        <div className="space-y-2">
                          <Label htmlFor="name">Seu Nome</Label>
                          <Input
                            id="name"
                            placeholder="Seu nome"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                          />
                        </div>
                      )}
                      {phoneChecked && customer && (
                        <div className="p-3 bg-accent rounded-lg">
                          <p className="font-medium">Olá, {customer.name}!</p>
                          <p className="text-sm text-muted-foreground">Seu número já está cadastrado.</p>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label>Forma de Pagamento</Label>
                        <Select
                          value={paymentMethod || ""}
                          onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pix">PIX</SelectItem>
                            <SelectItem value="credito">Crédito</SelectItem>
                            <SelectItem value="debito">Débito</SelectItem>
                            <SelectItem value="dinheiro">Dinheiro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {paymentMethod === "dinheiro" && (
                        <>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id="needsChange"
                              checked={needsChange}
                              onCheckedChange={(checked) => setNeedsChange(checked === true)}
                            />
                            <Label htmlFor="needsChange">Precisa de troco?</Label>
                          </div>
                          {needsChange && (
                            <div className="space-y-2">
                              <Label>Troco para quanto?</Label>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={changeFor}
                                onChange={(e) => setChangeFor(e.target.value)}
                              />
                            </div>
                          )}
                        </>
                       )}

                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="isReservation"
                            checked={isReservation}
                            onCheckedChange={(checked) => {
                              setIsReservation(checked === true);
                              if (!checked) {
                                setReservationDate(undefined);
                                setPickupTime("");
                              }
                            }}
                          />
                          <Label htmlFor="isReservation">É uma reserva?</Label>
                        </div>

                        {isReservation && (
                          <div className="space-y-2">
                            <Label htmlFor="pickupTime">
                              <Clock className="inline h-4 w-4 mr-1" />
                              Horário de Retirada
                            </Label>
                            <Select value={pickupTime} onValueChange={setPickupTime}>
                              <SelectTrigger id="pickupTime">
                                <SelectValue placeholder="Selecione o horário" />
                              </SelectTrigger>
                              <SelectContent>
                                {timeSlots.map((time) => (
                                  <SelectItem key={time} value={time}>
                                    {time}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>

                      <div className="text-lg font-bold text-right">
                        Total: R$ {subtotal.toFixed(2)}
                      </div>

                      <Button onClick={finishOrder} className="w-full">
                        Finalizar Pedido
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

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