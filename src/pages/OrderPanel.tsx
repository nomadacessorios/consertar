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

export default function OrderPanel() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [motoboyWhatsappNumber, setMotoboyWhatsappNumber] = useState<string | null>(null);
  const { profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (profile?.store_id) {
      loadOrders();
      loadMotoboyNumber();

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

  const loadOrders = async () => {
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
      .in("status", ["pending", "preparing", "ready"]) // Excluir 'cancelled'
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

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive", label: string }> = {
      pending: { variant: "secondary", label: "Pendente" },
      preparing: { variant: "default", label: "Em Preparo" },
      ready: { variant: "destructive", label: "Pronto" },
      cancelled: { variant: "destructive", label: "Cancelado" }, // Adicionado
    };

    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const pendingOrders = orders.filter(o => o.status === "pending");
  const preparingOrders = orders.filter(o => o.status === "preparing");
  const readyOrders = orders.filter(o => o.status === "ready");

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Painel de Pedidos</h1>
        <p className="text-muted-foreground">Acompanhe os pedidos em tempo real</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-secondary" />
            <h2 className="text-xl font-semibold">Pendentes ({pendingOrders.length})</h2>
          </div>
          {pendingOrders.map((order) => (
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
                  <Button
                    onClick={() => updateOrderStatus(order.id, "preparing")}
                    className="w-full"
                    size="sm"
                  >
                    Iniciar Preparo
                  </Button>
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
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Em Preparo ({preparingOrders.length})</h2>
          </div>
          {preparingOrders.map((order) => (
            <Card key={order.id} className="shadow-soft border-primary">
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
                  <Button
                    onClick={() => updateOrderStatus(order.id, "ready")}
                    className="w-full"
                    size="sm"
                  >
                    Marcar como Pronto
                  </Button>
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
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <h2 className="text-xl font-semibold">Prontos ({readyOrders.length})</h2>
          </div>
          {readyOrders.map((order) => (
            <Card key={order.id} className="shadow-soft border-green-500">
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
                  <Button
                    onClick={() => updateOrderStatus(order.id, "delivered")}
                    className="w-full"
                    size="sm"
                    variant="secondary"
                  >
                    Marcar como Entregue
                  </Button>
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
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}