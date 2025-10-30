import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign, Package, ShoppingCart, XCircle, Store, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { supabase as sb } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
const supabase: any = sb;

interface SalesSummary {
  productsSold: { name: string; quantity: number; }[];
  paymentMethodTotals: { method: string; total: number; }[];
  totalSales: number;
  initialAmount: number;
}

export default function Dashboard() {
  const [initialAmount, setInitialAmount] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showCloseSummaryDialog, setShowCloseSummaryDialog] = useState(false);
  const [cashRegister, setCashRegister] = useState<any>(null);
  const [stats, setStats] = useState({
    todaySales: 0,
    todayOrders: 0,
    pendingOrders: 0,
  });
  const [adminStats, setAdminStats] = useState({
    totalStores: 0,
    totalUsers: 0,
  });
  const [salesSummary, setSalesSummary] = useState<SalesSummary | null>(null);
  const { profile, user, isAdmin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAdmin) {
      loadAdminStats();
    } else if (profile?.store_id) {
      loadCashRegister();
      loadStats();
    }
  }, [profile, isAdmin]);

  const loadAdminStats = async () => {
    // Load total stores
    const { count: storesCount, error: storesError } = await supabase
      .from("stores")
      .select("*", { count: "exact", head: true });

    if (storesError) {
      console.error("Erro ao carregar lojas:", storesError.message);
      toast({
        variant: "destructive",
        title: "Erro ao carregar lojas",
        description: storesError.message,
      });
    }

    // Load total users (profiles)
    const { count: usersCount, error: usersError } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    if (usersError) {
      console.error("Erro ao carregar usuários:", usersError.message);
      toast({
        variant: "destructive",
        title: "Erro ao carregar usuários",
        description: usersError.message,
      });
    }

    setAdminStats({
      totalStores: storesCount || 0,
      totalUsers: usersCount || 0,
    });
  };

  const loadCashRegister = async () => {
    const { data } = await supabase
      .from("cash_register")
      .select("*")
      .eq("store_id", profile.store_id)
      .is("closed_at", null)
      .order("opened_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    setCashRegister(data);
  };

  const loadStats = async () => {
    const today = new Date().toISOString().split("T")[0];
    
    const { data: orders } = await supabase
      .from("orders")
      .select("total, status")
      .eq("store_id", profile.store_id)
      .gte("created_at", today);

    if (orders) {
      setStats({
        todaySales: orders.reduce((sum, o) => sum + parseFloat(o.total.toString()), 0),
        todayOrders: orders.length,
        pendingOrders: orders.filter(o => o.status === "pending" || o.status === "preparing").length,
      });
    }
  };

  const handleOpenCashRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data: newCashRegister, error } = await supabase.from("cash_register").insert({
      store_id: profile.store_id,
      opened_by: user?.id,
      initial_amount: parseFloat(initialAmount),
    }).select().single(); // Select the newly created cash register

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao abrir caixa",
        description: error.message,
      });
    } else {
      toast({
        title: "Caixa aberto com sucesso!",
      });
      setInitialAmount("");
      setIsDialogOpen(false);
      loadCashRegister();

      // Associate pending reservation orders with this new cash register
      if (newCashRegister) {
        const { error: updateOrdersError } = await supabase
          .from("orders")
          .update({ cash_register_id: newCashRegister.id })
          .eq("store_id", profile.store_id)
          .is("cash_register_id", null) // Only unassigned orders
          .not("reservation_date", "is", null) // Only reservations (identified by reservation_date not null)
          .eq("status", "pending"); // Only pending reservations

        if (updateOrdersError) {
          console.error("Erro ao associar reservas ao novo caixa:", updateOrdersError.message);
          toast({
            title: "Aviso",
            description: "Algumas reservas podem não ter sido associadas automaticamente. Verifique manualmente.",
          });
        } else {
          toast({
            title: "Reservas associadas!",
            description: "Reservas pendentes foram vinculadas ao novo caixa.",
          });
        }
      }
    }
  };

  const handlePrepareCloseCashRegister = async () => {
    if (!cashRegister) return;

    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("id, payment_method, total")
      .eq("cash_register_id", cashRegister.id);

    if (ordersError) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar pedidos",
        description: ordersError.message,
      });
      return;
    }

    const paymentMethodTotals: { [key: string]: number } = {
      dinheiro: 0,
      pix: 0,
      credito: 0,
      debito: 0,
      fidelidade: 0,
    };

    let totalSales = 0;
    orders?.forEach((order: any) => {
      const method = order.payment_method as keyof typeof paymentMethodTotals;
      if (method) {
        paymentMethodTotals[method] += parseFloat(order.total.toString());
      }
      totalSales += parseFloat(order.total.toString());
    });

    const orderIds = orders.map((order: any) => order.id);
    const { data: orderItems, error: orderItemsError } = await supabase
      .from("order_items")
      .select("product_name, quantity")
      .in("order_id", orderIds);

    if (orderItemsError) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar itens do pedido",
        description: orderItemsError.message,
      });
      return;
    }

    const productsSoldMap = new Map<string, number>();
    orderItems?.forEach((item: any) => {
      productsSoldMap.set(item.product_name, (productsSoldMap.get(item.product_name) || 0) + item.quantity);
    });

    const productsSold = Array.from(productsSoldMap.entries()).map(([name, quantity]) => ({ name, quantity }));

    setSalesSummary({
      productsSold,
      paymentMethodTotals: Object.entries(paymentMethodTotals).map(([method, total]) => ({ method, total })),
      totalSales,
      initialAmount: cashRegister.initial_amount,
    });
    setShowCloseSummaryDialog(true);
  };

  const handleConfirmCloseCashRegister = async () => {
    if (!cashRegister || !salesSummary) return;

    const cashRegisterId = cashRegister.id;

    try {
      // 1. Close the cash register
      const { error: closeRegisterError } = await supabase
        .from("cash_register")
        .update({
          closed_at: new Date().toISOString(),
          final_amount: salesSummary.totalSales,
        })
        .eq("id", cashRegisterId);

      if (closeRegisterError) throw closeRegisterError;

      // 2. Fetch all orders associated with this cash register
      const { data: associatedOrders, error: fetchOrdersError } = await supabase
        .from("orders")
        .select("id")
        .eq("cash_register_id", cashRegisterId);

      if (fetchOrdersError) throw fetchOrdersError;

      // 3. Update the status of these orders to 'delivered'
      if (associatedOrders && associatedOrders.length > 0) {
        const orderIdsToUpdate = associatedOrders.map((order: any) => order.id);
        const { error: updateOrdersStatusError } = await supabase
          .from("orders")
          .update({ status: "delivered" }) // Mark as delivered
          .in("id", orderIdsToUpdate);

        if (updateOrdersStatusError) throw updateOrdersStatusError;
      }

      toast({
        title: "Caixa fechado com sucesso!",
        description: "Todos os pedidos associados foram marcados como entregues.",
      });
      setShowCloseSummaryDialog(false);
      loadCashRegister();
      loadStats();
    } catch (error: any) {
      console.error("Erro ao fechar caixa:", error);
      toast({
        variant: "destructive",
        title: "Erro ao fechar caixa",
        description: error.message || "Ocorreu um erro ao fechar o caixa.",
      });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            {isAdmin ? "Visão geral do sistema" : "Resumo das vendas"}
          </p>
        </div>
        {!isAdmin && (
          <div className="flex gap-2">
            {cashRegister ? (
              <>
                <Button onClick={() => navigate("/pdv")}>
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Ir para PDV
                </Button>
                <Button variant="destructive" onClick={handlePrepareCloseCashRegister}>
                  <DollarSign className="h-4 w-4 mr-2" />
                  Fechar Caixa
                </Button>
              </>
            ) : (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <DollarSign className="h-4 w-4 mr-2" />
                    Abrir Caixa
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Abrir Caixa</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleOpenCashRegister} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="initialAmount">Valor Inicial (R$)</Label>
                      <Input
                        id="initialAmount"
                        type="number"
                        step="0.01"
                        value={initialAmount}
                        onChange={(e) => setInitialAmount(e.target.value)}
                        placeholder="0.00"
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full">
                      Abrir Caixa
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        )}
      </div>

      {isAdmin ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="shadow-soft hover:shadow-glow transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Lojas Cadastradas
              </CardTitle>
              <Store className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {adminStats.totalStores}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft hover:shadow-glow transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Usuários Cadastrados
              </CardTitle>
              <Users className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {adminStats.totalUsers}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="shadow-soft hover:shadow-glow transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Vendas Hoje
              </CardTitle>
              <DollarSign className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                R$ {stats.todaySales.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft hover:shadow-glow transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pedidos Hoje
              </CardTitle>
              <ShoppingCart className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {stats.todayOrders}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft hover:shadow-glow transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pedidos Pendentes
              </CardTitle>
              <Package className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {stats.pendingOrders}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={showCloseSummaryDialog} onOpenChange={setShowCloseSummaryDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Resumo de Fechamento de Caixa</DialogTitle>
          </DialogHeader>
          {salesSummary ? (
            <div className="space-y-4 py-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Produtos Vendidos:</h3>
                {salesSummary.productsSold.length > 0 ? (
                  <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                    {salesSummary.productsSold.map((item, index) => (
                      <li key={index}>{item.name}: {item.quantity} unidades</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum produto vendido neste caixa.</p>
                )}
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Vendas por Forma de Pagamento:</h3>
                {salesSummary.paymentMethodTotals.length > 0 ? (
                  <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                    {salesSummary.paymentMethodTotals.map((pm, index) => (
                      <li key={index}>
                        {pm.method.charAt(0).toUpperCase() + pm.method.slice(1)}: R$ {pm.total.toFixed(2)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhuma venda registrada neste caixa.</p>
                )}
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between font-medium">
                  <span>Valor Inicial:</span>
                  <span>R$ {salesSummary.initialAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Total de Vendas:</span>
                  <span>R$ {salesSummary.totalSales.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg text-primary">
                  <span>Total Final Estimado:</span>
                  <span>R$ {(salesSummary.initialAmount + salesSummary.totalSales).toFixed(2)}</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-center text-muted-foreground">Carregando resumo...</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCloseSummaryDialog(false)}>
              <XCircle className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleConfirmCloseCashRegister}>
              <DollarSign className="h-4 w-4 mr-2" />
              Confirmar Fechamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}