import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Minus, Clock, Calendar as CalendarIcon, AlertCircle, LogOut, Home, Briefcase, MapPin, Gift, Package, Star, Edit, Trash2 } from "lucide-react";
import { supabase as sb } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, addDays, parseISO, isBefore, isAfter, setHours, setMinutes, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { DateRange } from "react-day-picker";
import useEmblaCarousel from 'embla-carousel-react';

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
  has_variations: boolean;
  earns_loyalty_points: boolean;
  loyalty_points_value: number;
  min_variation_price?: number; // Novo campo
  max_variation_price?: number; // Novo campo
  category_id?: string; // Adicionado
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

interface CartItem extends Product {
  quantity: number;
  selectedVariation?: Variation;
}

interface CustomerAddress {
  id: string;
  customer_id: string;
  name: string; // Personalized name like "Casa", "Trabalho"
  address: string; // Street
  number: string;
  neighborhood: string; // New field
  reference: string;
  cep: string;
}

interface LoyaltyRule {
  id: string;
  name: string;
  pointsRequired: number;
  reward: string;
  active: boolean;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  total: number;
  created_at: string;
  delivery: boolean;
  payment_method: string;
}

interface LoyaltyTransaction {
  id: string;
  points: number;
  transaction_type: string;
  created_at: string;
  order_id: string | null;
  description?: string | null;
  orders?: {
    order_number: string;
    total: number;
    status: string;
    delivery: boolean;
    payment_method: string;
  } | null;
}

interface CombinedHistoryItem {
  id: string;
  created_at: string;
  type: 'order' | 'loyalty_transaction';
  order_number?: string;
  status?: string;
  total?: number;
  delivery?: boolean;
  payment_method?: string;
  // For loyalty transactions (either standalone or associated with an order)
  points_change?: number; // The actual points value from the transaction
  transaction_type?: string; // 'earn' or 'redeem'
  description?: string | null;
  // Specifically for orders that earned/redeemed points
  earned_points?: number;
  redeemed_points?: number; // This will be a negative value from the transaction
}

interface StoreOperatingHour {
  id: string;
  store_id: string;
  day_of_week: number; // 0 for Sunday, 6 for Saturday
  is_open: boolean;
  open_time: string | null; // HH:mm
  close_time: string | null; // HH:mm
}

interface StoreSpecialDay {
  id: string;
  store_id: string;
  date: string; // YYYY-MM-DD
  is_open: boolean;
  open_time: string | null; // HH:mm
  close_time: string | null; // HH:mm
}

type PaymentMethod = "pix" | "credito" | "debito" | "dinheiro" | "fidelidade";

export default function CustomerStore() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [storeId, setStoreId] = useState<string | null>(null);
  const [storeName, setStoreName] = useState("Minha Loja");
  const [storeActive, setStoreActive] = useState(true);
  const [storeLogoUrl, setStoreLogoUrl] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [allVariations, setAllVariations] = useState<Variation[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [loyaltyRules, setLoyaltyRules] = useState<LoyaltyRule[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [isReservation, setIsReservation] = useState(false);
  const [reservationDate, setReservationDate] = useState<Date>();
  const [pickupTime, setPickupTime] = useState<string>("");
  const [isDelivery, setIsDelivery] = useState(false);
  const [needsChange, setNeedsChange] = useState(false);
  const [changeFor, setChangeFor] = useState("");
  const [address, setAddress] = useState("");
  const [number, setNumber] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [reference, setReference] = useState("");
  const [cep, setCep] = useState("");
  const [skipCep, setSkipCep] = useState(false);
  const [showNameInput, setShowNameInput] = useState(false);
  const [showSelectVariationDialog, setShowSelectVariationDialog] = useState(false);
  const [productToSelectVariation, setProductToSelectVariation] = useState<Product | null>(null);
  const [selectedVariationForProduct, setSelectedVariationForProduct] = useState<Variation | null>(null);
  const [saveAddress, setSaveAddress] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([]);
  const [selectedSavedAddressId, setSelectedSavedAddressId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: undefined,
    to: undefined,
  });
  const [combinedHistory, setCombinedHistory] = useState<CombinedHistoryItem[]>([]);

  const [showEditSavedAddressDialog, setShowEditSavedAddressDialog] = useState(false);
  const [editingSavedAddress, setEditingSavedAddress] = useState<CustomerAddress | null>(null);
  const [editAddressName, setEditAddressName] = useState("");
  const [editAddressStreet, setEditAddressStreet] = useState("");
  const [editAddressNumber, setEditAddressNumber] = useState("");
  const [editAddressNeighborhood, setEditAddressNeighborhood] = useState("");
  const [editAddressReference, setEditAddressReference] = useState("");
  const [editAddressCep, setEditAddressCep] = useState("");
  const [editAddressSkipCep, setEditAddressSkipCep] = useState(false);

  // New states for category filter
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  
  // Store operating hours and special days
  const [operatingHours, setOperatingHours] = useState<StoreOperatingHour[]>([]);
  const [specialDays, setSpecialDays] = useState<StoreSpecialDay[]>([]);

  const [emblaRef] = useEmblaCarousel({ dragFree: true, containScroll: 'trimSnaps' });

  const { toast } = useToast();
  const { user: authUser } = useAuth();

  useEffect(() => {
    loadStoreInfo();
  }, [slug]);

  // Effect to check for persisted customer session
  useEffect(() => {
    if (storeId) { // Ensure storeId is loaded before checking session
      const storedSession = localStorage.getItem('customerStoreSession');
      if (storedSession) {
        const { customerId, customerPhone, customerName } = JSON.parse(storedSession);
        const checkAndSetCustomer = async () => {
          const { data: existingCustomer, error } = await supabase
            .from("customers")
            .select("*")
            .eq("id", customerId)
            .eq("phone", customerPhone)
            .eq("store_id", storeId)
            .maybeSingle();

          if (existingCustomer) {
            setCustomer(existingCustomer as unknown as Customer);
            setPhone(customerPhone);
            setName(customerName);
            setIsLoggedIn(true);
            toast({
              title: `Bem-vindo de volta, ${customerName}!`,
              description: "Sua sessão foi restaurada.",
            });
          } else {
            // Stored session is invalid or customer no longer exists/belongs to store
            localStorage.removeItem('customerStoreSession');
            setIsLoggedIn(false);
            setCustomer(null);
            setPhone("");
            setName("");
          }
        };
        checkAndSetCustomer();
      }
    }
  }, [storeId]); // Depend on storeId to ensure it's loaded before checking session

  useEffect(() => {
    if (isLoggedIn && customer && storeId) {
      loadCategories(); // Load categories first
      loadProductsAndVariations();
      loadActiveOrders();
      loadSavedAddresses();
      loadLoyaltyRules();
      loadCombinedHistory();
      loadOperatingHours(); // Load operating hours
      loadSpecialDays(); // Load special days
    }
  }, [isLoggedIn, customer, storeId, dateRange, selectedCategoryId]); // Add selectedCategoryId to dependencies

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

  const loadCategories = async () => {
    if (!storeId) return;
    const { data, error } = await supabase
      .from("categories")
      .select("id, name")
      .eq("store_id", storeId)
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

  const loadProductsAndVariations = async () => {
    if (!storeId) return;

    let productsQuery = supabase
      .from("products" as any)
      .select("id, name, price, stock_quantity, image_url, has_variations, earns_loyalty_points, loyalty_points_value, category_id")
      .eq("store_id", storeId)
      .eq("active", true)
      .order("name");

    if (selectedCategoryId) {
      productsQuery = productsQuery.eq("category_id", selectedCategoryId);
    } else if (selectedCategoryId === null) {
      // If 'All' is selected, no category filter is applied
    }


    const { data: productsData, error: productsError } = await productsQuery;

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

  const loadActiveOrders = async () => {
    if (!customer) return;

    const { data } = await supabase
      .from("orders" as any)
      .select("*")
      .eq("customer_id", customer.id)
      .in("status", ["pending", "preparing", "ready"])
      .order("created_at", { ascending: false });

    if (data) {
      setActiveOrders(data as unknown as Order[]);
    }
  };

  const loadLoyaltyRules = async () => {
    if (!storeId) return;

    const { data, error } = await supabase
      .from("loyalty_rules")
      .select("id, name, points_required, reward, active")
      .eq("store_id", storeId)
      .eq("active", true)
      .order("points_required", { ascending: true });

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar prêmios",
        description: error.message,
      });
    } else {
      const mappedData = (data || []).map((rule: any) => ({
        id: rule.id,
        name: rule.name,
        pointsRequired: rule.points_required,
        reward: rule.reward,
        active: rule.active,
      }));
      setLoyaltyRules(mappedData);
    }
  };

  const loadSavedAddresses = async () => {
    if (!customer?.id) return;

    const { data, error } = await supabase
      .from("customer_addresses")
      .select("*")
      .eq("customer_id", customer.id)
      .order("name");

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar endereços salvos",
        description: error.message,
      });
    } else {
      setSavedAddresses(data || []);
    }
  };

  const loadCombinedHistory = async () => {
    if (!customer) return;

    // 1. Fetch all relevant orders (delivered/cancelled) with their items
    let ordersQuery = supabase
      .from("orders" as any)
      .select(`
        id,
        created_at,
        order_number,
        status,
        total,
        delivery,
        payment_method,
        order_items (
          id,
          product_id,
          quantity,
          products (
            earns_loyalty_points,
            loyalty_points_value
          )
        )
      `)
      .eq("customer_id", customer.id)
      .in("status", ["delivered", "cancelled"])
      .order("created_at", { ascending: false });

    if (dateRange?.from) {
      ordersQuery = ordersQuery.gte("created_at", format(dateRange.from, "yyyy-MM-dd"));
    }
    if (dateRange?.to) {
      ordersQuery = ordersQuery.lte("created_at", format(addDays(dateRange.to, 1), "yyyy-MM-dd"));
    }

    const { data: ordersData, error: ordersError } = await ordersQuery;
    if (ordersError) {
      toast({ variant: "destructive", title: "Erro ao carregar histórico de pedidos", description: ordersError.message });
      return;
    }

    // 2. Fetch all loyalty transactions
    let loyaltyTransactionsQuery = supabase
      .from("loyalty_transactions" as any)
      .select(`
        id,
        created_at,
        points,
        transaction_type,
        description,
        order_id
      `)
      .eq("customer_id", customer.id)
      .order("created_at", { ascending: false });

    if (dateRange?.from) {
      loyaltyTransactionsQuery = loyaltyTransactionsQuery.gte("created_at", format(dateRange.from, "yyyy-MM-dd"));
    }
    if (dateRange?.to) {
      loyaltyTransactionsQuery = loyaltyTransactionsQuery.lte("created_at", format(addDays(dateRange.to, 1), "yyyy-MM-dd"));
    }

    const { data: loyaltyData, error: loyaltyError } = await loyaltyTransactionsQuery;
    if (loyaltyError) {
      toast({ variant: "destructive", title: "Erro ao carregar histórico de pontos", description: loyaltyError.message });
      return;
    }

    // Map to store all loyalty transactions by order_id (can be multiple per order)
    const loyaltyByOrderId = new Map<string, LoyaltyTransaction[]>();
    loyaltyData.forEach((lt: any) => {
      if (lt.order_id) {
        const existing = loyaltyByOrderId.get(lt.order_id) || [];
        existing.push(lt);
        loyaltyByOrderId.set(lt.order_id, existing);
      }
    });

    const combined: CombinedHistoryItem[] = [];
    const processedLoyaltyTransactionIds = new Set<string>();

    // Process orders
    (ordersData || []).forEach((order: any) => {
      const item: CombinedHistoryItem = {
        id: order.id,
        created_at: order.created_at,
        type: 'order',
        order_number: order.order_number,
        status: order.status,
        total: order.total,
        delivery: order.delivery,
        payment_method: order.payment_method,
      };

      const associatedLoyaltyTransactions = loyaltyByOrderId.get(order.id) || [];
      
      // If there are loyalty transactions, use them
      if (associatedLoyaltyTransactions.length > 0) {
        associatedLoyaltyTransactions.forEach(lt => {
          if (lt.transaction_type === 'earn') {
            item.earned_points = (item.earned_points || 0) + lt.points;
          } else if (lt.transaction_type === 'redeem') {
            item.redeemed_points = (item.redeemed_points || 0) + lt.points; // points will be negative for redeem
          }
          processedLoyaltyTransactionIds.add(lt.id);
        });
      } else if (order.payment_method !== 'fidelidade' && order.status === 'delivered') {
        // Calculate points from order items if no loyalty transaction exists
        let calculatedPoints = 0;
        if (order.order_items && Array.isArray(order.order_items)) {
          order.order_items.forEach((orderItem: any) => {
            if (orderItem.products && orderItem.products.earns_loyalty_points) {
              const itemPoints = Math.floor(orderItem.quantity * (orderItem.products.loyalty_points_value || 0));
              calculatedPoints += itemPoints;
            }
          });
        }
        if (calculatedPoints > 0) {
          item.earned_points = calculatedPoints;
        }
      }
      
      combined.push(item);
    });

    // Add any remaining loyalty transactions (not linked to an order, or not yet processed)
    (loyaltyData || []).forEach((lt: any) => {
      if (!processedLoyaltyTransactionIds.has(lt.id)) {
        combined.push({
          id: lt.id,
          created_at: lt.created_at,
          type: 'loyalty_transaction',
          points_change: lt.points,
          transaction_type: lt.transaction_type,
          description: lt.description,
          order_number: lt.order_id ? `(Pedido ${lt.order_id.slice(-6)})` : undefined,
        });
      }
    });

    combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    setCombinedHistory(combined);
  };

  const loadOperatingHours = async () => {
    if (!storeId) return;
    const { data, error } = await supabase
      .from("store_operating_hours")
      .select("*")
      .eq("store_id", storeId)
      .order("day_of_week");
    if (error) {
      console.error("Erro ao carregar horários de funcionamento:", error.message);
    } else {
      setOperatingHours(data || []);
    }
  };

  const loadSpecialDays = async () => {
    if (!storeId) return;
    const { data, error } = await supabase
      .from("store_special_days")
      .select("*")
      .eq("store_id", storeId)
      .order("date");
    if (error) {
      console.error("Erro ao carregar dias especiais:", error.message);
    } else {
      setSpecialDays(data || []);
    }
  };

  const isStoreOpen = (date: Date, time: string | null) => {
    if (!storeId) return false;

    const formattedDate = format(date, "yyyy-MM-dd");
    const dayOfWeek = getDay(date); // 0 for Sunday, 6 for Saturday

    // Check for special day override first
    const specialDay = specialDays.find(sd => sd.date === formattedDate);

    if (specialDay) {
      if (!specialDay.is_open) return false; // Explicitly closed
      if (!time || !specialDay.open_time || !specialDay.close_time) return false;
      
      const pickupDateTime = setMinutes(setHours(date, parseInt(time.split(':')[0])), parseInt(time.split(':')[1]));
      const openDateTime = setMinutes(setHours(date, parseInt(specialDay.open_time.split(':')[0])), parseInt(specialDay.open_time.split(':')[1]));
      const closeDateTime = setMinutes(setHours(date, parseInt(specialDay.close_time.split(':')[0])), parseInt(specialDay.close_time.split(':')[1]));

      return isAfter(pickupDateTime, openDateTime) && isBefore(pickupDateTime, closeDateTime);
    }

    // If no special day, check regular operating hours
    const regularHours = operatingHours.find(oh => oh.day_of_week === dayOfWeek);

    if (!regularHours || !regularHours.is_open) return false; // Closed on this day

    if (!time || !regularHours.open_time || !regularHours.close_time) return false;

    const pickupDateTime = setMinutes(setHours(date, parseInt(time.split(':')[0])), parseInt(time.split(':')[1]));
    const openDateTime = setMinutes(setHours(date, parseInt(regularHours.open_time.split(':')[0])), parseInt(regularHours.open_time.split(':')[1]));
    const closeDateTime = setMinutes(setHours(date, parseInt(regularHours.close_time.split(':')[0])), parseInt(regularHours.close_time.split(':')[1]));

    return isAfter(pickupDateTime, openDateTime) && isBefore(pickupDateTime, closeDateTime);
  };

  const handleCheckPhoneAndLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (phone.length < 10) {
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
      setIsLoggedIn(true);
      setShowNameInput(false);
      localStorage.setItem('customerStoreSession', JSON.stringify({
        customerId: existingCustomer.id,
        customerPhone: existingCustomer.phone,
        customerName: existingCustomer.name,
      }));
      toast({
        title: `Bem-vindo, ${(existingCustomer as any).name}!`,
        description: "Acesso ao cardápio liberado",
      });
    } else {
      setShowNameInput(true);
      if (name) {
        const { data: newCustomer, error: newCustomerError } = await supabase
          .from("customers" as any)
          .insert({ phone, name, points: 0, store_id: storeId })
          .select()
          .single();

        if (newCustomerError) {
          toast({ variant: "destructive", title: "Erro ao cadastrar", description: newCustomerError.message });
          return;
        }

        if (newCustomer) {
          setCustomer(newCustomer as unknown as Customer);
          setIsLoggedIn(true);
          setShowNameInput(false);
          localStorage.setItem('customerStoreSession', JSON.stringify({
            customerId: newCustomer.id,
            customerPhone: newCustomer.phone,
            customerName: newCustomer.name,
          }));
          toast({ title: "Cadastro realizado!", description: `Bem-vindo, ${name}!` });
        }
      } else {
        toast({ variant: "default", title: "Novo cadastro", description: "Por favor, informe seu nome para continuar." });
      }
    }
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
      if (1 > itemStock) {
        toast({
          variant: "destructive",
          title: "Estoque insuficiente",
          description: `Apenas ${itemStock} unidades disponíveis para ${product.name} ${variation?.name ? `(${variation.name})` : ''}.`,
        });
        return;
      }
      setCart([...cart, { 
        ...product, 
        id: product.id,
        quantity: 1, 
        price: itemPrice,
        stock_quantity: itemStock,
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

  const handleSaveAddress = async () => {
    if (!customer?.id || !address || !neighborhood) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar endereço",
        description: "Preencha Rua e Bairro para salvar o endereço.",
      });
      return;
    }

    const { error } = await supabase.from("customer_addresses").insert({
      customer_id: customer.id,
      name: "Endereço Salvo",
      address,
      number,
      neighborhood,
      reference,
      cep: skipCep ? null : cep,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar endereço",
        description: error.message,
      });
    } else {
      toast({
        title: "Endereço salvo com sucesso!",
      });
      loadSavedAddresses();
      setSaveAddress(false);
    }
  };

  const handleSelectSavedAddress = (addressId: string) => {
    const selected = savedAddresses.find(addr => addr.id === addressId);
    if (selected) {
      setAddress(selected.address);
      setNumber(selected.number || "");
      setNeighborhood(selected.neighborhood);
      setReference(selected.reference || "");
      setCep(selected.cep || "");
      setSkipCep(!selected.cep);
      setSelectedSavedAddressId(addressId);
    }
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

    if (paymentMethod === "fidelidade" && (!customer || customer.points < 9)) {
      toast({
        variant: "destructive",
        title: "Pontos insuficientes",
        description: "Você precisa de 9 pontos para usar fidelidade",
      });
      return;
    }

    if (isReservation) {
      if (!reservationDate) {
        toast({
          variant: "destructive",
          title: "Data obrigatória",
          description: "Selecione a data da reserva",
        });
        return;
      }
      if (!pickupTime) {
        toast({
          variant: "destructive",
          title: "Horário obrigatório",
          description: "Selecione o horário de retirada",
        });
        return;
      }

      // Validate if store is open on reservation date and time
      if (!isStoreOpen(reservationDate, pickupTime)) {
        toast({
          variant: "destructive",
          title: "Loja fechada",
          description: "A loja não está aberta para reservas neste dia ou horário.",
        });
        return;
      }
    }

    if (isDelivery && (!address || !neighborhood)) {
      toast({
        variant: "destructive",
        title: "Endereço e Bairro obrigatórios para entrega",
      });
      return;
    }

    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const orderNumber = `PED-${Date.now().toString().slice(-6)}`;

    const { data: order, error } = await supabase
      .from("orders" as any)
      .insert({
        store_id: storeId,
        order_number: orderNumber,
        customer_id: customer?.id,
        source: "whatsapp",
        total,
        payment_method: paymentMethod,
        reservation_date: isReservation && reservationDate ? format(reservationDate, "yyyy-MM-dd") : null,
        pickup_time: pickupTime,
        delivery: isDelivery,
        delivery_address: isDelivery ? address : null,
        delivery_number: isDelivery ? number : null,
        delivery_neighborhood: isDelivery ? neighborhood : null,
        delivery_reference: isDelivery ? reference : null,
        delivery_cep: isDelivery && !skipCep ? cep : null,
        change_for: paymentMethod === "dinheiro" && needsChange ? parseFloat(changeFor) : null,
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
      product_variation_id: item.selectedVariation?.id || null,
      variation_name: item.selectedVariation?.name || null,
    }));

    await supabase.from("order_items" as any).insert(orderItems);

    const stockUpdatePromises = cart.map(async (item) => {
      if (item.selectedVariation) {
        const { error: stockError } = await supabase
          .from("product_variations")
          .update({ stock_quantity: item.selectedVariation.stock_quantity - item.quantity })
          .eq("id", item.selectedVariation.id);

        if (stockError) {
          console.error(`Erro ao atualizar estoque da variação ${item.selectedVariation.name}:`, stockError.message);
        }
      } else {
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

    // REMOVIDA A LÓGICA DE ATRIBUIÇÃO DE PONTOS DE FIDELIDADE DO FRONTEND.
    // AGORA, OS PONTOS SÃO ATRIBUÍDOS APENAS PELO TRIGGER DO BANCO DE DADOS
    // QUANDO O STATUS DO PEDIDO MUDA PARA 'DELIVERED'.

    if (paymentMethod === "fidelidade" && customer) {
      await supabase
        .from("customers" as any)
        .update({ points: customer.points - 9 })
        .eq("id", customer.id);

      await supabase.from("loyalty_transactions" as any).insert({
        customer_id: customer.id,
        order_id: (order as any).id,
        points: -9,
        transaction_type: "redeem",
        store_id: storeId,
      });
      
      setCustomer({ ...customer, points: customer.points - 9 });
    }

    if (saveAddress && customer?.id && address && neighborhood) {
      await handleSaveAddress();
    }

    toast({
      title: "Pedido realizado!",
      description: `Pedido ${orderNumber} criado com sucesso`,
    });

    setCart([]);
    setPaymentMethod(null);
    setIsReservation(false);
    setReservationDate(undefined);
    setPickupTime("");
    setIsDelivery(false);
    setNeedsChange(false);
    setChangeFor("");
    setAddress("");
    setNumber("");
    setNeighborhood("");
    setReference("");
    setCep("");
    setSkipCep(false);
    setSaveAddress(false);
    setSavedAddresses([]);
    setSelectedSavedAddressId(null);
    
    loadActiveOrders();
    loadCombinedHistory();
    loadProductsAndVariations();
    loadSavedAddresses();
  };

  const handleLogout = async () => {
    localStorage.removeItem('customerStoreSession'); // Clear persisted session
    setCustomer(null);
    setIsLoggedIn(false);
    setPhone("");
    setName("");
    setCart([]);
    setActiveOrders([]);
    setCombinedHistory([]);
    setLoyaltyRules([]);
    setPaymentMethod(null);
    setIsReservation(false);
    setReservationDate(undefined);
    setPickupTime("");
    setIsDelivery(false);
    setNeedsChange(false);
    setChangeFor("");
    setAddress("");
    setNumber("");
    setNeighborhood("");
    setReference("");
    setCep("");
    setSkipCep(false);
    setSaveAddress(false);
    setSavedAddresses([]);
    setSelectedSavedAddressId(null);
    
    toast({
      title: "Deslogado com sucesso!",
      description: "Você pode fazer login novamente ou usar outro número.",
    });

    // Redirect to the customer store's homepage
    navigate(`/loja/${slug || ''}`);
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "Pendente",
      preparing: "Em Preparo",
      ready: "Pronto",
      delivered: "Entregue",
      cancelled: "Cancelado",
    };
    return labels[status] || status;
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" => {
    if (status === "ready") return "destructive";
    if (status === "preparing") return "default";
    if (status === "cancelled") return "secondary";
    return "secondary";
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

  const openEditSavedAddressDialog = (address: CustomerAddress) => {
    setEditingSavedAddress(address);
    setEditAddressName(address.name);
    setEditAddressStreet(address.address);
    setEditAddressNumber(address.number || "");
    setEditAddressNeighborhood(address.neighborhood);
    setEditAddressReference(address.reference || "");
    setEditAddressCep(address.cep || "");
    setEditAddressSkipCep(!address.cep);
    setShowEditSavedAddressDialog(true);
  };

  const handleUpdateSavedAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSavedAddress || !customer?.id) return;

    if (!editAddressName || !editAddressStreet || !editAddressNeighborhood) {
      toast({ variant: "destructive", title: "Campos obrigatórios", description: "Nome, Rua e Bairro são obrigatórios." });
      return;
    }

    const addressData = {
      name: editAddressName,
      address: editAddressStreet,
      number: editAddressNumber || null,
      neighborhood: editAddressNeighborhood,
      reference: editAddressReference || null,
      cep: editAddressSkipCep ? null : editAddressCep || null,
    };

    const { error } = await supabase
      .from("customer_addresses")
      .update(addressData)
      .eq("id", editingSavedAddress.id);

    if (error) {
      toast({ variant: "destructive", title: "Erro ao atualizar endereço", description: error.message });
    } else {
      toast({ title: "Endereço atualizado!" });
      setShowEditSavedAddressDialog(false);
      loadSavedAddresses();
    }
  };

  const handleDeleteSavedAddress = async (addressId: string) => {
    if (!confirm("Tem certeza que deseja excluir este endereço?")) return;

    const { error } = await supabase
      .from("customer_addresses")
      .delete()
      .eq("id", addressId);

    if (error) {
      toast({ variant: "destructive", title: "Erro ao excluir endereço", description: error.message });
    } else {
      toast({ title: "Endereço excluído!" });
      loadSavedAddresses();
    }
  };

  // Group products by category
  const productsByCategory: { [key: string]: Product[] } = {};
  products.forEach(product => {
    const categoryName = categories.find(cat => cat.id === product.category_id)?.name || "Sem Categoria";
    if (!productsByCategory[categoryName]) {
      productsByCategory[categoryName] = [];
    }
    productsByCategory[categoryName].push(product);
  });

  const sortedCategoryNames = Object.keys(productsByCategory).sort((a, b) => {
    if (a === "Sem Categoria") return 1;
    if (b === "Sem Categoria") return -1;
    return a.localeCompare(b);
  });


  if (!storeId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <p className="text-muted-foreground">Carregando loja...</p>
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

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-primary/5 to-primary/10">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader>
            {storeLogoUrl && (
              <div className="flex justify-center mb-4">
                <img src={storeLogoUrl} alt={`${storeName} logo`} className="h-24 object-contain" />
              </div>
            )}
            <CardTitle className="text-2xl text-center">{storeName}</CardTitle>
            <p className="text-center text-muted-foreground">
              Para fazer seu pedido, precisamos de um número para contato.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCheckPhoneAndLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Número de Celular</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(11) 99999-9999"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value.replace(/\D/g, ''));
                    setName("");
                    setShowNameInput(false);
                  }}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  required
                />
              </div>
              {showNameInput && (
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    placeholder="Seu nome"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              )}
              <Button type="submit" className="w-full">
                {showNameInput && !name ? "Cadastrar e Ver Cardápio" : "Ver Cardápio"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen sm:p-6 p-2 bg-gradient-to-br from-primary/5 to-primary/10">
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
                <CardTitle className="text-2xl">Bem-vindo, {customer?.name}!</CardTitle>
                <p className="text-muted-foreground">Celular: {phone}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                {customer && (
                  <div className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-primary fill-primary" />
                    <p className="text-lg font-bold text-primary">{customer.points?.toFixed(1) || 0} pts</p>
                  </div>
                )}
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Deslogar
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="order" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="order">Fazer Pedido</TabsTrigger>
                <TabsTrigger value="active">Pedidos</TabsTrigger>
                <TabsTrigger value="loyalty">Fidelidade</TabsTrigger>
              </TabsList>

              <TabsContent value="order" className="space-y-4">
                <h3 className="text-lg font-semibold">Nosso Cardápio</h3>
                
                {/* Category Filter Carousel */}
                <div className="embla overflow-hidden" ref={emblaRef}>
                  <div className="embla__container flex gap-2 pb-2">
                    <Button
                      variant={selectedCategoryId === null ? "default" : "outline"}
                      onClick={() => setSelectedCategoryId(null)}
                      className="embla__slide flex-shrink-0"
                    >
                      Todas
                    </Button>
                    {categories.map((category) => (
                      <Button
                        key={category.id}
                        variant={selectedCategoryId === category.id ? "default" : "outline"}
                        onClick={() => setSelectedCategoryId(category.id)}
                        className="embla__slide flex-shrink-0"
                      >
                        {category.name}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Product Sections by Category */}
                {sortedCategoryNames.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum produto disponível nesta categoria.
                  </p>
                ) : (
                  sortedCategoryNames.map(categoryName => (
                    <div key={categoryName} className="space-y-4">
                      <h4 className="text-xl font-bold mt-6 mb-4">{categoryName}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {productsByCategory[categoryName].map((product) => {
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
                                      {product.has_variations ? (
                                        product.min_variation_price === product.max_variation_price ? (
                                          `R$ ${product.min_variation_price?.toFixed(2)}`
                                        ) : (
                                          `R$ ${product.min_variation_price?.toFixed(2)} - ${product.max_variation_price?.toFixed(2)}`
                                        )
                                      ) : (
                                        `R$ ${product.price.toFixed(2)}`
                                      )}
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
                    </div>
                  ))
                )}

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
                              <SelectItem value="fidelidade">Fidelidade (9 pontos)</SelectItem>
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
                              onCheckedChange={(checked) => setIsReservation(checked === true)}
                            />
                            <Label htmlFor="isReservation">É uma reserva?</Label>
                          </div>

                          {isReservation && (
                            <div className="space-y-2">
                              <Label>Data da Reserva</Label>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      "w-full justify-start text-left font-normal",
                                      !reservationDate && "text-muted-foreground"
                                    )}
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {reservationDate ? format(reservationDate, "dd/MM/yyyy") : "Selecione a data"}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={reservationDate}
                                    onSelect={setReservationDate}
                                    disabled={(date) => date < new Date() || date > addDays(new Date(), 21)}
                                    initialFocus
                                    locale={ptBR}
                                    className="pointer-events-auto"
                                  />
                                </PopoverContent>
                              </Popover>
                              <p className="text-xs text-muted-foreground">
                                Até 3 semanas à frente
                              </p>
                            </div>
                          )}
                        </div>

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

                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="isDelivery"
                            checked={isDelivery}
                            onCheckedChange={(checked) => setIsDelivery(checked === true)}
                          />
                          <Label htmlFor="isDelivery">É para entrega?</Label>
                          </div>

                        {isDelivery && (
                          <div className="space-y-3">
                            {savedAddresses.length > 0 && (
                              <div className="space-y-2">
                                <Label htmlFor="savedAddress">Endereços Salvos</Label>
                                <Select value={selectedSavedAddressId || ""} onValueChange={handleSelectSavedAddress}>
                                  <SelectTrigger id="savedAddress">
                                    <SelectValue placeholder="Selecionar endereço salvo" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {savedAddresses.map(addr => (
                                      <SelectItem key={addr.id} value={addr.id}>
                                        {addr.name} - {addr.address}, {addr.number} ({addr.neighborhood})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                            <div className="space-y-2">
                              <Label>Rua</Label>
                              <Input
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                required
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-2">
                                <Label>Número</Label>
                                <Input
                                  value={number}
                                  onChange={(e) => setNumber(e.target.value)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Bairro</Label>
                                <Input
                                  value={neighborhood}
                                  onChange={(e) => setNeighborhood(e.target.value)}
                                  required
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label>Referência</Label>
                              <Input
                                value={reference}
                                onChange={(e) => setReference(e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label>CEP</Label>
                                <Button
                                  type="button"
                                  variant="link"
                                  size="sm"
                                  onClick={() => setSkipCep(!skipCep)}
                                >
                                  {skipCep ? "Informar CEP" : "Não sei o CEP"}
                                </Button>
                              </div>
                              {!skipCep && (
                                <Input
                                  value={cep}
                                  onChange={(e) => setCep(e.target.value.replace(/\D/g, ''))}
                                  placeholder="00000-000"
                                  inputMode="numeric"
                                />
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id="saveAddress"
                                checked={saveAddress}
                                onCheckedChange={(checked) => setSaveAddress(checked === true)}
                              />
                              <Label htmlFor="saveAddress">Salvar endereço para próxima compra</Label>
                            </div>
                          </div>
                        )}

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
              </TabsContent>

              <TabsContent value="active" className="space-y-4">
                <h3 className="text-lg font-semibold">Seus Pedidos Ativos</h3>
                {activeOrders.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum pedido ativo
                  </p>
                ) : (
                  activeOrders.map((order) => (
                    <Card key={order.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-bold">{order.order_number}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(order.created_at).toLocaleString()}
                            </p>
                            <p className="text-sm">
                              {order.delivery ? "🚚 Entrega" : "🏪 Retirada"}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge variant={getStatusVariant(order.status)}>
                              {getStatusLabel(order.status)}
                            </Badge>
                            <p className="text-lg font-bold text-primary mt-2">
                              R$ {parseFloat(order.total.toString()).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="loyalty" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    
                    <h3 className="text-lg font-semibold">Prêmios Disponíveis</h3>
                    {loyaltyRules.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        Nenhum prêmio disponível no momento.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {loyaltyRules.map((rule) => (
                          <Card key={rule.id}>
                            <CardContent className="p-4">
                              <div className="flex items-center gap-3">
                                <Gift className="h-6 w-6 text-primary" />
                                <div>
                                  <p className="font-medium">{rule.name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    Recompensa: <span className="font-semibold">{rule.reward}</span>
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Requer {rule.pointsRequired} pontos
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Histórico de Transações</h3>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          id="date"
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !dateRange?.from && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateRange?.from ? (
                            dateRange.to ? (
                              <>
                                {format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} -{" "}
                                {format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
                              </>
                            ) : (
                              format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
                            )
                          ) : (
                            <span>Filtrar por data</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          initialFocus
                          mode="range"
                          defaultMonth={dateRange?.from}
                          selected={dateRange}
                          onSelect={setDateRange}
                          numberOfMonths={2}
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>

                    <div className="space-y-3 max-h-[700px] overflow-y-auto pr-2">
                      {combinedHistory.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">
                          Nenhuma movimentação ou pedido finalizado no período.
                        </p>
                      ) : (
                          combinedHistory.map((item) => (
                            <Card key={item.id}>
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm text-muted-foreground">
                                      {new Date(item.created_at).toLocaleDateString('pt-BR')}
                                    </p>
                                    {item.type === 'order' ? (
                                      <>
                                        <p className="text-sm font-medium mt-1 flex items-center gap-1">
                                          <Package className="h-4 w-4 text-muted-foreground" />
                                          Pedido: #{item.order_number}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          Total: R$ {item.total?.toFixed(2)} | Status: {getStatusLabel(item.status || '')}
                                        </p>
                                        {item.earned_points !== undefined && item.earned_points > 0 && (
                                          <div className="flex items-center gap-1 mt-2 px-2 py-1 bg-green-50 dark:bg-green-950 rounded-md w-fit">
                                            <Star className="h-3 w-3 text-green-600 dark:text-green-400 fill-green-600 dark:fill-green-400" />
                                            <p className="text-xs font-semibold text-green-600 dark:text-green-400">
                                              +{item.earned_points.toFixed(1)} pontos ganhos
                                            </p>
                                          </div>
                                        )}
                                        {item.redeemed_points !== undefined && item.redeemed_points < 0 && (
                                          <div className="flex items-center gap-1 mt-2 px-2 py-1 bg-red-50 dark:bg-red-950 rounded-md w-fit">
                                            <Star className="h-3 w-3 text-red-600 dark:text-red-400" />
                                            <p className="text-xs font-semibold text-red-600 dark:text-red-400">
                                              -{Math.abs(item.redeemed_points).toFixed(1)} pontos usados
                                            </p>
                                          </div>
                                        )}
                                      </>
                                    ) : ( // type === 'loyalty_transaction'
                                      <>
                                        <p className="text-sm font-medium mt-1 flex items-center gap-1">
                                          <Star className="h-4 w-4 text-muted-foreground" />
                                          {item.transaction_type === "earn" ? "Pontos Ganhos" : "Pontos Usados"}
                                        </p>
                                        {item.order_number && (
                                          <p className="text-xs text-muted-foreground">
                                            Pedido: #{item.order_number} (R$ {item.total?.toFixed(2)})
                                          </p>
                                        )}
                                        {item.description && (
                                          <p className="text-xs text-muted-foreground">
                                            {item.description}
                                          </p>
                                        )}
                                      </>
                                    )}
                                  </div>
                                  <div className="text-right">
                                    {item.type === 'order' ? (
                                      <p className="text-lg font-bold text-foreground">
                                        R$ {item.total?.toFixed(2)}
                                      </p>
                                    ) : (
                                      <p
                                        className={`text-lg font-bold ${
                                          item.points_change && item.points_change > 0 ? "text-green-500" : "text-red-500"
                                        }`}
                                      >
                                        {item.points_change && item.points_change > 0 ? "+" : ""}
                                        {item.points_change?.toFixed(1)} pts
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4 mt-6">
                  <h3 className="text-lg font-semibold">Endereços Salvos</h3>
                  {savedAddresses.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhum endereço salvo.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {savedAddresses.map((addr) => (
                        <Card key={addr.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {addr.name.toLowerCase() === "casa" ? <Home className="h-5 w-5 text-muted-foreground" /> :
                                 addr.name.toLowerCase() === "trabalho" ? <Briefcase className="h-5 w-5 text-muted-foreground" /> :
                                 <MapPin className="h-5 w-5 text-muted-foreground" />}
                                <div>
                                  <p className="font-medium">{addr.name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {addr.address}, {addr.number} - {addr.neighborhood}
                                  </p>
                                  {addr.reference && (
                                    <p className="text-xs text-muted-foreground">Ref: {addr.reference}</p>
                                  )}
                                  {addr.cep && (
                                    <p className="text-xs text-muted-foreground">CEP: {addr.cep}</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditSavedAddressDialog(addr)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-destructive"
                                  onClick={() => handleDeleteSavedAddress(addr.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
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

      {/* Dialog para Editar Endereço Salvo */}
      <Dialog open={showEditSavedAddressDialog} onOpenChange={(open) => {
        setShowEditSavedAddressDialog(open);
        if (!open) {
          setEditingSavedAddress(null);
          setEditAddressName("");
          setEditAddressStreet("");
          setEditAddressNumber("");
          setEditAddressNeighborhood("");
          setEditAddressReference("");
          setEditAddressCep("");
          setEditAddressSkipCep(false);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Editar Endereço Salvo
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateSavedAddress} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editAddressName">Nome do Endereço (Ex: Casa, Trabalho)</Label>
              <Input
                id="editAddressName"
                value={editAddressName}
                onChange={(e) => setEditAddressName(e.target.value)}
                placeholder="Ex: Casa"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editAddressStreet">Rua</Label>
              <Input
                id="editAddressStreet"
                value={editAddressStreet}
                onChange={(e) => setEditAddressStreet(e.target.value)}
                placeholder="Ex: Rua das Flores"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editAddressNumber">Número</Label>
              <Input
                id="editAddressNumber"
                value={editAddressNumber}
                onChange={(e) => setEditAddressNumber(e.target.value)}
                placeholder="Ex: 123"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editAddressNeighborhood">Bairro</Label>
              <Input
                id="editAddressNeighborhood"
                value={editAddressNeighborhood}
                onChange={(e) => setEditAddressNeighborhood(e.target.value)}
                placeholder="Ex: Centro"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editAddressReference">Referência (Opcional)</Label>
              <Input
                id="editAddressReference"
                value={editAddressReference}
                onChange={(e) => setEditAddressReference(e.target.value)}
                placeholder="Ex: Próximo à padaria"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="editAddressCep">CEP</Label>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={() => setEditAddressSkipCep(!editAddressSkipCep)}
                >
                  {editAddressSkipCep ? "Informar CEP" : "Não sei o CEP"}
                </Button>
              </div>
              {!editAddressSkipCep && (
                <Input
                  id="editAddressCep"
                  value={editAddressCep}
                  onChange={(e) => setEditAddressCep(e.target.value.replace(/\D/g, ''))}
                  placeholder="00000-000"
                  inputMode="numeric"
                />
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEditSavedAddressDialog(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">
                Salvar Alterações
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}