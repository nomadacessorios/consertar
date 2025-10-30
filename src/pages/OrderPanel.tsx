import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, Package, Info, MessageCircle, XCircle } from "lucide-react";
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
const supabase: any = sb;

interface Order {
  id: string;
  order_number: string;
  source: string;
  status: string;
  total: number;
  created_at: string;
  payment_method: string;
  delivery: boolean;
  delivery_address?: string;
  delivery_number?: string;
  delivery_reference?: string;
  pickup_time?: string;
  reservation_date?: string;
  customers?: {
    name: string;
    phone: string;
  };
  order_items: Array<{
    product_id: string; // Adicionado para buscar detalhes do produto
    product_name: string;
    quantity: number;
    variation_name?: string;
  }>;
}

interface OrderStatusConfig {
  id: string;
  store_id: string;
  status_key: string;
  status_label: string;
  is_active: boolean;
  display_order: number;
}

export default function OrderPanel() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [motoboyWhatsappNumber, setMotoboyWhatsappNumber] = useState<string | null>(null);
  const [statusConfigs, setStatusConfigs] = useState<OrderStatusConfig[]>([]);
  const { profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (profile?.store_id) {
      loadOrders();
      loadMotoboyNumber();
      loadStatusConfigs();

      const channel = supabase
        .channel('orders-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: `store_id=eq.${profile.store_id}`,
          },
          () => {
            loadOrders();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [profile]);

  const loadMotoboyNumber = async () => {
    if (!profile?.store_id) return;

    const { data, error } = await supabase
      .from("stores")
      .select("motoboy_whatsapp_number")
      .eq("id", profile.store_id)
      .single();

    if (error) {
      console.error("Erro ao carregar número do motoboy:", error);
    } else if (data) {
      setMotoboyWhatsappNumber(data.motoboy_whatsapp_number);
    }
  };

  const loadStatusConfigs = async () => {
    if (!profile?.store_id) return;

    const { data, error } = await supabase
      .from("order_status_config")
      .select("*")
      .eq("store_id", profile.store_id)
      .order("display_order");

    if (error) {
      console.error("Erro ao carregar configurações de status:", error);
      // Se não houver configurações, usa defaults
      setStatusConfigs([
        { id: "1", store_id: profile.store_id, status_key: "pending", status_label: "Pendente", is_active: true, display_order: 1 },
        { id: "2", store_id: profile.store_id, status_key: "preparing", status_label: "Em Preparo", is_active: true, display_order: 2 },
        { id: "3", store_id: profile.store_id, status_key: "ready", status_label: "Pronto", is_active: true, display_order: 3 },
        { id: "4", store_id: profile.store_id, status_key: "delivered", status_label: "Entregue", is_active: true, display_order: 4 },
        { id: "5", store_id: profile.store_id, status_key: "cancelled", status_label: "Cancelado", is_active: true, display_order: 5 },
      ]);
    } else {
      setStatusConfigs(data || []);
    }
  };

  const loadOrders = async () => {
    // Filtrar apenas os status ativos (exceto cancelled que nunca aparece no painel)
    const activeStatusKeys = statusConfigs
      .filter(s => s.is_active && s.status_key !== "cancelled" && s.status_key !== "delivered")
      .map(s => s.status_key);

    // Se ainda não carregou as configs, usa os padrões
    const statusesToShow = activeStatusKeys.length > 0 
      ? activeStatusKeys 
      : ["pending", "preparing", "ready"];

    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        customers (
          name,
          phone
        ),
        order_items (
          product_id,
          product_name,
          quantity,
          variation_name
        )
      `)
      .eq("store_id", profile.store_id)
      .in("status", statusesToShow)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar pedidos",
        description: error.message,
      });
    } else {
      setOrders(data || []);
    }
  };

  const updateOrderStatus = async (orderId: string, status: "pending" | "preparing" | "ready" | "delivered" | "cancelled") => {
    // A lógica de atribuição de pontos de fidelidade foi movida para um trigger no banco de dados
    // que é executado quando o status do pedido muda para 'delivered'.
    // Isso garante que os pontos sejam atribuídos de forma consistente,
    // independentemente de como o status 'delivered' é alcançado.

    // Finalmente, atualiza o status do pedido
    const { error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", orderId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar pedido",
        description: error.message,
      });
    } else {
      toast({
        title: "Pedido atualizado!",
      });
      loadOrders();
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm("Tem certeza que deseja cancelar este pedido? Esta ação não pode ser desfeita.")) {
      return;
    }
    await updateOrderStatus(orderId, "cancelled");
  };

  const handleSendWhatsappToMotoboy = (order: Order) => {
    if (!motoboyWhatsappNumber) {
      toast({
        variant: "destructive",
        title: "Número do motoboy não configurado",
        description: "Configure o número de WhatsApp do motoboy nas Configurações da Loja.",
      });
      return;
    }

    let message = `*NOVO PEDIDO DE ENTREGA*\n\n`;
    message += `*Pedido:* #${order.order_number}\n`;
    message += `*Cliente:* ${order.customers?.name || 'N/A'}\n`;
    message += `*Telefone:* ${order.customers?.phone || 'N/A'}\n`;
    message += `*Endereço:* ${order.delivery_address}, ${order.delivery_number}\n`;
    if (order.delivery_reference) {
      message += `*Referência:* ${order.delivery_reference}\n`;
    }
    message += `*Total:* R$ ${order.total.toFixed(2)}\n`;
    message += `*Pagamento:* ${order.payment_method.charAt(0).toUpperCase() + order.payment_method.slice(1)}\n\n`;
    message += `*Itens:*\n`;
    order.order_items.forEach(item => {
      message += `- ${item.quantity}x ${item.product_name} ${item.variation_name ? `(${item.variation_name})` : ''}\n`;
    });

    const whatsappUrl = `https://wa.me/${motoboyWhatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Função para obter o próximo status ativo
  const getNextActiveStatus = (currentStatus: string): string | null => {
    const currentConfig = statusConfigs.find(s => s.status_key === currentStatus);
    if (!currentConfig) return null;

    // Busca os status ativos após o status atual
    const activeStatuses = statusConfigs
      .filter(s => s.is_active && s.display_order > currentConfig.display_order)
      .sort((a, b) => a.display_order - b.display_order);

    return activeStatuses.length > 0 ? activeStatuses[0].status_key : null;
  };

  const getStatusBadge = (status: string) => {
    // Busca a configuração customizada para o status
    const customConfig = statusConfigs.find(s => s.status_key === status);
    
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" }> = {
      pending: { variant: "secondary" },
      preparing: { variant: "default" },
      ready: { variant: "destructive" },
      delivered: { variant: "default" },
      cancelled: { variant: "destructive" },
    };

    const config = variants[status] || variants.pending;
    const label = customConfig?.status_label || status;
    
    return <Badge variant={config.variant}>{label}</Badge>;
  };

  // Filtra pedidos pelos status ativos
  const getActiveStatusColumns = () => {
    return statusConfigs
      .filter(s => s.is_active && s.status_key !== "cancelled" && s.status_key !== "delivered")
      .sort((a, b) => a.display_order - b.display_order);
  };

  const activeColumns = getActiveStatusColumns();
  
  // Cria dinamicamente os filtros de pedidos por coluna
  const getOrdersByStatus = (statusKey: string) => {
    return orders.filter(o => o.status === statusKey);
  };

  // Renderiza os botões de ação baseado no status
  const renderOrderActions = (order: Order, statusConfig: OrderStatusConfig) => {
    const nextStatus = getNextActiveStatus(order.status);
    
    return (
      <div className="space-y-2">
        {nextStatus && (
          <Button
            onClick={() => updateOrderStatus(order.id, nextStatus as any)}
            className="w-full"
            size="sm"
            variant="secondary"
          >
            Mover para {statusConfigs.find(s => s.status_key === nextStatus)?.status_label}
          </Button>
        )}
        {!nextStatus && (
          <Button
            onClick={() => updateOrderStatus(order.id, "delivered")}
            className="w-full"
            size="sm"
            variant="secondary"
          >
            Marcar como Entregue
          </Button>
        )}
        <Button
          onClick={() => handleCancelOrder(order.id)}
          className="w-full"
          size="sm"
          variant="destructive"
        >
          <XCircle className="h-4 w-4 mr-2" />
          Cancelar
        </Button>
      </div>
    );
  };

  // Ícone baseado no status
  const getStatusIcon = (statusKey: string) => {
    const icons: Record<string, any> = {
      pending: Clock,
      preparing: Package,
      ready: CheckCircle,
      delivered: CheckCircle,
      cancelled: XCircle,
    };
    return icons[statusKey] || Clock;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Painel de Pedidos</h1>
        <p className="text-muted-foreground">Acompanhe os pedidos em tempo real</p>
      </div>

      <div className={`grid grid-cols-1 gap-6 ${activeColumns.length === 1 ? 'lg:grid-cols-1' : activeColumns.length === 2 ? 'lg:grid-cols-2' : 'lg:grid-cols-3'}`}>
        {activeColumns.map((statusConfig) => {
          const StatusIcon = getStatusIcon(statusConfig.status_key);
          const columnOrders = getOrdersByStatus(statusConfig.status_key);
          
          return (
            <div key={statusConfig.status_key} className="space-y-4">
              <div className="flex items-center gap-2">
                <StatusIcon className="h-5 w-5 text-secondary" />
                <h2 className="text-xl font-semibold">{statusConfig.status_label} ({columnOrders.length})</h2>
              </div>
              {columnOrders.map((order) => (
            <Card key={order.id} className="shadow-soft">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <div className="flex items-center gap-2">
                    <span>{order.order_number}</span>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <Info className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Detalhes do Pedido</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-3 text-sm">
                          <div><strong>Pedido:</strong> {order.order_number}</div>
                          <div><strong>Origem:</strong> {order.source.charAt(0).toUpperCase() + order.source.slice(1)}</div>
                          <div><strong>Pagamento:</strong> {order.payment_method}</div>
                          <div><strong>Total:</strong> R$ {order.total.toFixed(2)}</div>
                          {order.customers && (
                            <>
                              <div><strong>Cliente:</strong> {order.customers.name}</div>
                              <div><strong>Telefone:</strong> {order.customers.phone}</div>
                            </>
                          )}
                          {order.delivery && (
                            <>
                              <div><strong>Entrega:</strong> Sim</div>
                              {order.delivery_address && <div><strong>Endereço:</strong> {order.delivery_address}, {order.delivery_number}</div>}
                              {order.delivery_reference && <div><strong>Referência:</strong> {order.delivery_reference}</div>}
                            </>
                          )}
                          {!order.delivery && (order.pickup_time || order.reservation_date) && (
                            <>
                              <div><strong>Retirada:</strong> Sim</div>
                              {order.pickup_time && <div><strong>Horário:</strong> {order.pickup_time}</div>}
                              {order.reservation_date && <div><strong>Data da Reserva:</strong> {new Date(order.reservation_date).toLocaleDateString()}</div>}
                            </>
                          )}
                          <div className="pt-2 border-t">
                            <strong>Itens:</strong>
                            {order.order_items.map((item, idx) => (
                              <div key={idx} className="flex justify-between mt-1">
                                <span>{item.product_name} {item.variation_name && `(${item.variation_name})`}</span>
                                <span>x{item.quantity}</span>
                              </div>
                            ))}
                          </div>
                          {order.delivery && motoboyWhatsappNumber && (
                            <Button
                              onClick={() => handleSendWhatsappToMotoboy(order)}
                              className="w-full mt-4"
                              variant="outline"
                            >
                              <MessageCircle className="h-4 w-4 mr-2" />
                              WhatsApp Motoboy
                            </Button>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  {getStatusBadge(order.status)}
                </CardTitle>
                {order.customers && (
                  <p className="text-sm text-muted-foreground">{order.customers.name}</p>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm space-y-1">
                  {order.order_items.map((item, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>{item.product_name} {item.variation_name && `(${item.variation_name})`}</span>
                      <span className="font-medium">x{item.quantity}</span>
                    </div>
                  ))}
                </div>
                <div className="flex flex-col gap-2">
                  {order.delivery && motoboyWhatsappNumber && (
                    <Button
                      onClick={() => handleSendWhatsappToMotoboy(order)}
                      className="w-full"
                      size="sm"
                      variant="outline"
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      WhatsApp Motoboy
                    </Button>
                  )}
                  {renderOrderActions(order, statusConfig)}
                </div>
              </CardContent>
            </Card>
          ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
