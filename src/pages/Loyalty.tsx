import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox"; // Importar Checkbox para o CEP
import { 
  Gift, 
  Star, 
  Search,
  Phone,
  Trophy,
  Plus,
  Edit,
  Trash2,
  Download,
  MessageCircle,
  MapPin,
  Home,
  Briefcase,
  User,
  CalendarDays
} from "lucide-react";
import { supabase as sb } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
const supabase: any = sb;

interface Customer {
  id: string;
  phone: string;
  name: string;
  points: number;
  created_at: string;
}

interface LoyaltyRule {
  id: string;
  name: string;
  pointsRequired: number;
  reward: string; // Agora esta coluna existe no banco de dados
  active: boolean;
}

interface CustomerAddress {
  id: string;
  customer_id: string;
  name: string; // Personalized name like "Casa", "Trabalho"
  address: string; // Street
  number: string;
  neighborhood: string;
  reference: string;
  cep: string;
}

export default function Loyalty() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loyaltyRules, setLoyaltyRules] = useState<LoyaltyRule[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Rule management states
  const [showRuleDialog, setShowRuleDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<LoyaltyRule | null>(null);
  const [ruleName, setRuleName] = useState("");
  const [rulePointsRequired, setRulePointsRequired] = useState("0");
  const [ruleReward, setRuleReward] = useState("");

  // Customer edit dialog states
  const [showEditCustomerDialog, setShowEditCustomerDialog] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editCustomerName, setEditCustomerName] = useState("");
  const [editCustomerPhone, setEditCustomerPhone] = useState("");
  const [customerAddressesInModal, setCustomerAddressesInModal] = useState<CustomerAddress[]>([]);

  // Address management sub-dialog states (within customer edit modal)
  const [showAddEditAddressDialog, setShowAddEditAddressDialog] = useState(false);
  const [currentAddressForEdit, setCurrentAddressForEdit] = useState<CustomerAddress | null>(null);
  const [addressName, setAddressName] = useState("");
  const [addressStreet, setAddressStreet] = useState("");
  const [addressNumber, setAddressNumber] = useState("");
  const [addressNeighborhood, setAddressNeighborhood] = useState("");
  const [addressReference, setAddressReference] = useState("");
  const [addressCep, setAddressCep] = useState("");
  const [addressSkipCep, setAddressSkipCep] = useState(false);

  const { profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (profile?.store_id) {
      const fetchAllData = async () => {
        await loadCustomers();
        await loadLoyaltyRules();
      };
      fetchAllData();
    }
  }, [profile]);

  const loadCustomers = async () => {
    if (!profile?.store_id) return [];

    const { data, error } = await supabase
      .from("customers")
      .select("id, name, phone, points, created_at")
      .eq("store_id", profile.store_id)
      .order("points", { ascending: false });

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar clientes",
        description: error.message,
      });
      return [];
    } else {
      setCustomers(data || []);
      return data || [];
    }
  };

  const loadLoyaltyRules = async () => {
    if (!profile?.store_id) return;

    const { data, error } = await supabase
      .from("loyalty_rules")
      .select("*, reward") // Seleciona a nova coluna 'reward'
      .eq("store_id", profile.store_id)
      .order("points_required", { ascending: true });

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar regras",
        description: error.message,
      });
    } else {
      const mappedData = (data || []).map((rule: any) => ({
        id: rule.id,
        name: rule.name,
        pointsRequired: rule.points_required,
        reward: rule.reward, // Mapeia a nova coluna 'reward'
        active: rule.active,
      }));
      setLoyaltyRules(mappedData);
    }
  };

  const loadAddressesForCustomer = async (customerId: string) => {
    const { data, error } = await supabase
      .from("customer_addresses")
      .select("*")
      .eq("customer_id", customerId)
      .order("name");

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar endereços do cliente",
        description: error.message,
      });
      return [];
    }
    setCustomerAddressesInModal(data || []);
    return data || [];
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone.includes(searchTerm)
  );

  const getCustomerLevel = (points: number) => {
    if (points >= 15) return { level: "Ouro", color: "bg-yellow-500" };
    if (points >= 8) return { level: "Prata", color: "bg-gray-400" };
    return { level: "Bronze", color: "bg-amber-600" };
  };

  // --- Loyalty Rule Management ---
  const openNewRuleDialog = () => {
    setEditingRule(null);
    setRuleName("");
    setRulePointsRequired("0");
    setRuleReward("");
    setShowRuleDialog(true);
  };

  const openEditRuleDialog = (rule: LoyaltyRule) => {
    setEditingRule(rule);
    setRuleName(rule.name);
    setRulePointsRequired(rule.pointsRequired.toString());
    setRuleReward(rule.reward);
    setShowRuleDialog(true);
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!ruleName || !ruleReward) {
      toast({
        variant: "destructive",
        title: "Preencha todos os campos",
      });
      return;
    }

    const ruleData = {
      name: ruleName,
      points_required: parseInt(rulePointsRequired),
      reward: ruleReward, // Agora esta coluna existe no banco de dados
      store_id: profile.store_id,
    };

    if (editingRule) {
      const { error } = await supabase
        .from("loyalty_rules")
        .update(ruleData)
        .eq("id", editingRule.id);

      if (error) {
        toast({
          variant: "destructive",
          title: "Erro ao atualizar prêmio",
          description: error.message,
        });
      } else {
        toast({
          title: "Prêmio atualizado!",
        });
        setShowRuleDialog(false);
        setRuleName("");
        setRulePointsRequired("0");
        setRuleReward("");
        setEditingRule(null);
        loadLoyaltyRules();
      }
    } else {
      const { error } = await supabase
        .from("loyalty_rules")
        .insert(ruleData);

      if (error) {
        toast({
          variant: "destructive",
          title: "Erro ao criar prêmio",
          description: error.message,
        });
      } else {
        toast({
          title: "Prêmio criado!",
        });
        setShowRuleDialog(false);
        setRuleName("");
        setRulePointsRequired("0");
        setRuleReward("");
        loadLoyaltyRules();
      }
    }
  };

  const handleToggleRuleActive = async (rule: LoyaltyRule) => {
    const { error } = await supabase
      .from("loyalty_rules")
      .update({ active: !rule.active })
      .eq("id", rule.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar prêmio",
        description: error.message,
      });
    } else {
      loadLoyaltyRules();
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm("Deseja realmente excluir este prêmio?")) return;

    const { error } = await supabase
      .from("loyalty_rules")
      .delete()
      .eq("id", ruleId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir prêmio",
        description: error.message,
      });
    } else {
      toast({
        title: "Prêmio excluído!",
      });
      loadLoyaltyRules();
    }
  };

  // --- Customer Management (Edit/Delete) ---
  const openEditCustomerDialog = async (customer: Customer) => {
    setEditingCustomer(customer);
    setEditCustomerName(customer.name);
    setEditCustomerPhone(customer.phone);
    await loadAddressesForCustomer(customer.id);
    setShowEditCustomerDialog(true);
  };

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;

    const { error } = await supabase
      .from("customers")
      .update({ name: editCustomerName, phone: editCustomerPhone })
      .eq("id", editingCustomer.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar cliente",
        description: error.message,
      });
    } else {
      toast({
        title: "Cliente atualizado!",
      });
      setShowEditCustomerDialog(false);
      loadCustomers();
    }
  };

  const handleDeleteCustomer = async (customerId: string) => {
    if (!confirm("Tem certeza que deseja excluir este cliente? Todos os pedidos e endereços associados serão removidos.")) return;

    // Delete associated orders and loyalty transactions first (due to foreign key constraints)
    const { error: deleteOrdersError } = await supabase
      .from("orders")
      .delete()
      .eq("customer_id", customerId);
    if (deleteOrdersError) {
      toast({ variant: "destructive", title: "Erro ao excluir pedidos do cliente", description: deleteOrdersError.message });
      return;
    }

    const { error: deleteLoyaltyError } = await supabase
      .from("loyalty_transactions")
      .delete()
      .eq("customer_id", customerId);
    if (deleteLoyaltyError) {
      toast({ variant: "destructive", title: "Erro ao excluir histórico de fidelidade", description: deleteLoyaltyError.message });
      return;
    }

    const { error: deleteAddressesError } = await supabase
      .from("customer_addresses")
      .delete()
      .eq("customer_id", customerId);
    if (deleteAddressesError) {
      toast({ variant: "destructive", title: "Erro ao excluir endereços do cliente", description: deleteAddressesError.message });
      return;
    }

    const { error } = await supabase
      .from("customers")
      .delete()
      .eq("id", customerId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir cliente",
        description: error.message,
      });
    } else {
      toast({
        title: "Cliente excluído com sucesso!",
      });
      setShowEditCustomerDialog(false);
      loadCustomers();
    }
  };

  // --- Address Management (within Customer Edit Modal) ---
  const openAddAddressForCustomer = () => {
    setCurrentAddressForEdit(null);
    setAddressName("");
    setAddressStreet("");
    setAddressNumber("");
    setAddressNeighborhood("");
    setAddressReference("");
    setAddressCep("");
    setAddressSkipCep(false);
    setShowAddEditAddressDialog(true);
  };

  const openEditAddressForCustomer = (address: CustomerAddress) => {
    setCurrentAddressForEdit(address);
    setAddressName(address.name);
    setAddressStreet(address.address);
    setAddressNumber(address.number || "");
    setAddressNeighborhood(address.neighborhood);
    setAddressReference(address.reference || "");
    setAddressCep(address.cep || "");
    setAddressSkipCep(!address.cep);
    setShowAddEditAddressDialog(true);
  };

  const handleSaveAddressInModal = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingCustomer?.id || !addressName || !addressStreet || !addressNeighborhood) {
      toast({ variant: "destructive", title: "Campos obrigatórios", description: "Nome, Rua e Bairro são obrigatórios." });
      return;
    }

    const addressData = {
      customer_id: editingCustomer.id,
      name: addressName,
      address: addressStreet,
      number: addressNumber || null,
      neighborhood: addressNeighborhood,
      reference: addressReference || null,
      cep: addressSkipCep ? null : addressCep || null,
    };

    if (currentAddressForEdit) {
      const { error } = await supabase
        .from("customer_addresses")
        .update(addressData)
        .eq("id", currentAddressForEdit.id);

      if (error) {
        toast({ variant: "destructive", title: "Erro ao atualizar endereço", description: error.message });
      } else {
        toast({ title: "Endereço atualizado!" });
        setShowAddEditAddressDialog(false);
        loadAddressesForCustomer(editingCustomer.id);
      }
    } else {
      const { error } = await supabase
        .from("customer_addresses")
        .insert(addressData);

      if (error) {
        toast({ variant: "destructive", title: "Erro ao adicionar endereço", description: error.message });
      } else {
        toast({ title: "Endereço adicionado!" });
        setShowAddEditAddressDialog(false);
        loadAddressesForCustomer(editingCustomer.id);
      }
    }
  };

  const handleDeleteAddressInModal = async (addressId: string) => {
    if (!confirm("Tem certeza que deseja excluir este endereço?")) return;

    const { error } = await supabase
      .from("customer_addresses")
      .delete()
      .eq("id", addressId);

    if (error) {
      toast({ variant: "destructive", title: "Erro ao excluir endereço", description: error.message });
    } else {
      toast({ title: "Endereço excluído!" });
      if (editingCustomer) {
        loadAddressesForCustomer(editingCustomer.id);
      }
    }
  };

  const handleExportCustomers = async () => {
    if (!profile?.store_id) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Você precisa estar vinculado a uma loja para exportar clientes.",
      });
      return;
    }

    const { data: customersData, error: customersError } = await supabase
      .from("customers")
      .select("id, name, phone, points")
      .eq("store_id", profile.store_id);

    if (customersError) {
      toast({ variant: "destructive", title: "Erro ao carregar clientes", description: customersError.message });
      return;
    }

    const { data: ordersData, error: ordersError } = await supabase
      .from("orders")
      .select("customer_id, created_at")
      .eq("store_id", profile.store_id)
      .order("created_at", { ascending: false });

    if (ordersError) {
      toast({ variant: "destructive", title: "Erro ao carregar pedidos", description: ordersError.message });
      return;
    }

    const lastPurchaseDates = new Map<string, string>(); // customer_id -> latest_created_at
    ordersData.forEach(order => {
      if (order.customer_id && !lastPurchaseDates.has(order.customer_id)) {
        lastPurchaseDates.set(order.customer_id, order.created_at);
      }
    });

    const csvRows = [];
    csvRows.push("Nome,Telefone,Pontos,Ultima Compra"); // Header

    customersData.forEach(customer => {
      const lastPurchase = lastPurchaseDates.get(customer.id);
      const lastPurchaseFormatted = lastPurchase ? new Date(lastPurchase).toLocaleDateString('pt-BR') : "N/A";
      csvRows.push(`"${customer.name}","${customer.phone}",${customer.points},"${lastPurchaseFormatted}"`);
    });

    const csvString = csvRows.join("\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "clientes_fidelidade.csv");
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: "Exportação concluída!", description: "Clientes exportados para CSV." });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Programa de Fidelidade</h1>
          <p className="text-muted-foreground">Gerencie clientes e regras de pontuação</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCustomers}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Dialog open={showRuleDialog} onOpenChange={setShowRuleDialog}>
            <DialogTrigger asChild>
              <Button className="shadow-soft" onClick={openNewRuleDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Prêmio
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingRule ? "Editar Prêmio" : "Novo Prêmio de Fidelidade"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSaveRule} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ruleName">Nome do Prêmio</Label>
                  <Input
                    id="ruleName"
                    placeholder="Ex: A cada 2 frangos comprados"
                    value={ruleName}
                    onChange={(e) => setRuleName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="points">Pontos Necessários</Label>
                  <Input
                    id="points"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={rulePointsRequired}
                    onChange={(e) => setRulePointsRequired(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reward">Recompensa</Label>
                  <Input
                    id="reward"
                    placeholder="Ex: 1 frango assado grátis"
                    value={ruleReward}
                    onChange={(e) => setRuleReward(e.target.value)}
                    required
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowRuleDialog(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingRule ? "Salvar" : "Criar"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Estatísticas */}
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-full">
                  <Gift className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{customers.length}</p>
                  <p className="text-sm text-muted-foreground">Clientes Cadastrados</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-success/10 rounded-full">
                  <Star className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {customers.reduce((sum, c) => sum + c.points, 0)}
                  </p>
                  <p className="text-sm text-muted-foreground">Pontos Ativos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-warning/10 rounded-full">
                  <Trophy className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">0</p>
                  <p className="text-sm text-muted-foreground">Resgates Este Mês</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-destructive/10 rounded-full">
                  <Phone className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">0</p>
                  <p className="text-sm text-muted-foreground">Novos Hoje</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Clientes */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Clientes Fidelidade</CardTitle>
              <CardDescription>
                Clientes cadastrados no programa de fidelidade
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou WhatsApp..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="space-y-3">
                {filteredCustomers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum cliente cadastrado no programa de fidelidade
                  </p>
                ) : (
                  filteredCustomers.map((customer) => {
                    const level = getCustomerLevel(customer.points);
                    return (
                      <div
                        key={customer.id}
                        className="flex items-center justify-between p-4 bg-accent rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback className="bg-primary text-primary-foreground">
                              {customer.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{customer.name}</p>
                            <div className="flex items-center gap-2">
                              <p className="text-sm text-muted-foreground">{customer.phone}</p>
                              <a 
                                href={`https://wa.me/55${customer.phone.replace(/\D/g, '')}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                              >
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                  <MessageCircle className="h-4 w-4 text-green-500" />
                                </Button>
                              </a>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Cliente desde {new Date(customer.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-2">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={`${level.color} text-white`}>
                              {level.level}
                            </Badge>
                          </div>
                          <p className="text-lg font-bold text-primary">
                            {customer.points} pts
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditCustomerDialog(customer)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Regras de Fidelidade */}
        <div className="space-y-4">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Prêmios Ativos</CardTitle>
              <CardDescription>
                Configure os prêmios e resgates de fidelidade
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {loyaltyRules.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum prêmio cadastrado
                </p>
              ) : (
                loyaltyRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="p-3 border border-border rounded-lg space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <Badge variant={rule.active ? "default" : "secondary"}>
                        {rule.active ? "Ativo" : "Inativo"}
                      </Badge>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditRuleDialog(rule)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-destructive"
                          onClick={() => handleDeleteRule(rule.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Switch
                          checked={rule.active}
                          onCheckedChange={() => handleToggleRuleActive(rule)}
                        />
                      </div>
                    </div>
                    <p className="text-sm font-medium">{rule.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Recompensa: <span className="text-primary font-medium">{rule.reward}</span>
                    </p>
                    {rule.pointsRequired > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Requer {rule.pointsRequired} pontos
                      </p>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Customer Edit Dialog */}
      <Dialog open={showEditCustomerDialog} onOpenChange={(open) => {
        setShowEditCustomerDialog(open);
        if (!open) {
          setEditingCustomer(null);
          setCustomerAddressesInModal([]);
        }
      }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
          </DialogHeader>
          {editingCustomer && (
            <div className="space-y-6 py-4">
              <form onSubmit={handleUpdateCustomer} className="space-y-4 border-b pb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Dados do Cliente
                </h3>
                <div className="space-y-2">
                  <Label htmlFor="editCustomerName">Nome</Label>
                  <Input
                    id="editCustomerName"
                    value={editCustomerName}
                    onChange={(e) => setEditCustomerName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editCustomerPhone">Telefone</Label>
                  <Input
                    id="editCustomerPhone"
                    type="tel"
                    value={editCustomerPhone}
                    onChange={(e) => setEditCustomerPhone(e.target.value.replace(/\D/g, ''))}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    required
                  />
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarDays className="h-4 w-4" />
                  Cadastrado em: {new Date(editingCustomer.created_at).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-2 text-sm text-primary font-medium">
                  <Star className="h-4 w-4" />
                  Pontos de Fidelidade: {editingCustomer.points}
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="submit">Salvar Alterações</Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => handleDeleteCustomer(editingCustomer.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir Cliente
                  </Button>
                </div>
              </form>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Endereços Salvos
                  </h3>
                  <Button size="sm" onClick={openAddAddressForCustomer}>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Endereço
                  </Button>
                </div>
                {customerAddressesInModal.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    Nenhum endereço salvo para este cliente.
                  </p>
                ) : (
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                    {customerAddressesInModal.map((addr) => (
                      <div
                        key={addr.id}
                        className="p-3 border border-border rounded-lg space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {addr.name.toLowerCase() === "casa" ? <Home className="h-4 w-4 text-muted-foreground" /> :
                             addr.name.toLowerCase() === "trabalho" ? <Briefcase className="h-4 w-4 text-muted-foreground" /> :
                             <MapPin className="h-4 w-4 text-muted-foreground" />}
                            <p className="font-medium">{addr.name}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditAddressForCustomer(addr)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-destructive"
                              onClick={() => handleDeleteAddressInModal(addr.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
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
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add/Edit Address Sub-Dialog (within Customer Edit Modal) */}
      <Dialog open={showAddEditAddressDialog} onOpenChange={(open) => {
        setShowAddEditAddressDialog(open);
        if (!open) { // Reset form when dialog closes
          setCurrentAddressForEdit(null);
          setAddressName("");
          setAddressStreet("");
          setAddressNumber("");
          setAddressNeighborhood("");
          setAddressReference("");
          setAddressCep("");
          setAddressSkipCep(false);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {currentAddressForEdit ? "Editar Endereço" : "Adicionar Novo Endereço"} para {editingCustomer?.name}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveAddressInModal} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="addressName">Nome do Endereço (Ex: Casa, Trabalho)</Label>
              <Input
                id="addressName"
                value={addressName}
                onChange={(e) => setAddressName(e.target.value)}
                placeholder="Ex: Casa"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="addressStreet">Rua</Label>
              <Input
                id="addressStreet"
                value={addressStreet}
                onChange={(e) => setAddressStreet(e.target.value)}
                placeholder="Ex: Rua das Flores"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="addressNumber">Número</Label>
              <Input
                id="addressNumber"
                value={addressNumber}
                onChange={(e) => setAddressNumber(e.target.value)}
                placeholder="Ex: 123"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="addressNeighborhood">Bairro</Label>
              <Input
                id="addressNeighborhood"
                value={addressNeighborhood}
                onChange={(e) => setAddressNeighborhood(e.target.value)}
                placeholder="Ex: Centro"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="addressReference">Referência (Opcional)</Label>
              <Input
                id="addressReference"
                value={addressReference}
                onChange={(e) => setAddressReference(e.target.value)}
                placeholder="Ex: Próximo à padaria"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="addressCep">CEP</Label>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={() => setAddressSkipCep(!addressSkipCep)}
                >
                  {addressSkipCep ? "Informar CEP" : "Não sei o CEP"}
                </Button>
              </div>
              {!addressSkipCep && (
                <Input
                  id="addressCep"
                  value={addressCep}
                  onChange={(e) => setAddressCep(e.target.value.replace(/\D/g, ''))}
                  placeholder="00000-000"
                  inputMode="numeric"
                />
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddEditAddressDialog(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">
                {currentAddressForEdit ? "Salvar Alterações" : "Adicionar Endereço"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}