import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { 
  Settings as SettingsIcon, 
  Store,
  Bell,
  Users,
  Shield,
  Palette,
  Database,
  Copy,
  Truck,
  Wrench,
  Clock,
  CalendarDays,
  Plus,
  Trash2,
  Edit,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase as sb } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const supabase: any = sb;

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

const daysOfWeek = [
  "Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira",
  "Quinta-feira", "Sexta-feira", "Sábado"
];

const generateTimeOptions = () => {
  const times = [];
  for (let i = 0; i < 24; i++) {
    for (let j = 0; j < 60; j += 30) {
      times.push(`${String(i).padStart(2, '0')}:${String(j).padStart(2, '0')}`);
    }
  }
  return times;
};

const timeOptions = generateTimeOptions();

export default function Settings() {
  const { user, profile, isAdmin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [storeName, setStoreName] = useState("Frango Assado do João"); // Placeholder, ideally loaded from store data
  const [storePhone, setStorePhone] = useState("(11) 99999-9999"); // Placeholder
  const [storeAddress, setStoreAddress] = useState("Rua das Flores, 123 - Centro"); // Placeholder
  const [storeHours, setStoreHours] = useState("Seg-Dom: 11:00 às 22:00"); // Placeholder
  const [motoboyWhatsappNumber, setMotoboyWhatsappNumber] = useState("");

  const [operatingHours, setOperatingHours] = useState<StoreOperatingHour[]>([]);
  const [specialDays, setSpecialDays] = useState<StoreSpecialDay[]>([]);
  const [showSpecialDayDialog, setShowSpecialDayDialog] = useState(false);
  const [selectedSpecialDate, setSelectedSpecialDate] = useState<Date | undefined>(undefined);
  const [specialDayIsOpen, setSpecialDayIsOpen] = useState(false);
  const [specialDayOpenTime, setSpecialDayOpenTime] = useState<string | null>(null);
  const [specialDayCloseTime, setSpecialDayCloseTime] = useState<string | null>(null);
  const [editingSpecialDay, setEditingSpecialDay] = useState<StoreSpecialDay | null>(null);

  useEffect(() => {
    if (profile?.store_id) {
      loadStoreSettings();
      loadOperatingHours();
      loadSpecialDays();
    }
  }, [profile]);

  const loadStoreSettings = async () => {
    if (!profile?.store_id) return;

    const { data, error } = await supabase
      .from("stores")
      .select("name, display_name, motoboy_whatsapp_number, is_active") // Incluir nova coluna
      .eq("id", profile.store_id)
      .single();

    if (error) {
      console.error("Erro ao carregar configurações da loja:", error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar configurações",
        description: error.message,
      });
      return;
    }

    if (data) {
      setStoreName(data.display_name || data.name);
      setMotoboyWhatsappNumber(data.motoboy_whatsapp_number || "");
      // Outras configurações da loja (telefone, endereço, horário) não estão no schema 'stores'
      // e precisariam de outra tabela ou seriam mockadas como estão.
    }
  };

  const loadOperatingHours = async () => {
    if (!profile?.store_id) return;

    const { data, error } = await supabase
      .from("store_operating_hours")
      .select("*")
      .eq("store_id", profile.store_id)
      .order("day_of_week");

    if (error) {
      console.error("Erro ao carregar horários de funcionamento:", error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar horários",
        description: error.message,
      });
      return;
    }

    const fetchedHours: StoreOperatingHour[] = data || [];
    // Ensure all 7 days are present, initialize if missing
    const fullHours = daysOfWeek.map((_, index) => {
      const existing = fetchedHours.find(h => h.day_of_week === index);
      if (existing) {
        // Se existe, mas is_open é true e os horários são null, defina valores padrão
        return {
          ...existing,
          open_time: existing.is_open && !existing.open_time ? "08:00" : existing.open_time,
          close_time: existing.is_open && !existing.close_time ? "18:00" : existing.close_time,
        };
      }
      return {
        id: `new-${index}`, // Temporary ID for new entries
        store_id: profile.store_id,
        day_of_week: index,
        is_open: false,
        open_time: "08:00",
        close_time: "18:00",
      };
    });
    setOperatingHours(fullHours);
  };

  const loadSpecialDays = async () => {
    if (!profile?.store_id) return;

    const { data, error } = await supabase
      .from("store_special_days")
      .select("*")
      .eq("store_id", profile.store_id)
      .order("date");

    if (error) {
      console.error("Erro ao carregar dias especiais:", error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar dias especiais",
        description: error.message,
      });
      return;
    }
    setSpecialDays(data || []);
  };

  const handleOperatingHourChange = (index: number, field: keyof StoreOperatingHour, value: any) => {
    setOperatingHours(prev => {
      const newHours = [...prev];
      const updatedHour = { ...newHours[index], [field]: value };

      if (field === "is_open") {
        if (value === false) {
          updatedHour.open_time = null;
          updatedHour.close_time = null;
        } else { // value is true
          // Set default times if they are currently null or empty
          if (!updatedHour.open_time) updatedHour.open_time = "08:00";
          if (!updatedHour.close_time) updatedHour.close_time = "18:00";
        }
      }
      
      newHours[index] = updatedHour;
      return newHours;
    });
  };

  const handleSaveOperatingHours = async () => {
    if (!profile?.store_id) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: "Seu perfil não está vinculado a uma loja. Por favor, entre em contato com o administrador.",
      });
      return;
    }

    const updates = operatingHours.map(hour => {
      // Prepara os dados para o upsert
      const dataToSave = {
        store_id: profile.store_id,
        day_of_week: hour.day_of_week,
        is_open: hour.is_open,
        // Garante que se is_open for true, sempre tenha horários válidos
        open_time: hour.is_open ? (hour.open_time || "08:00") : null,
        close_time: hour.is_open ? (hour.close_time || "18:00") : null,
      };

      // Se o ID for um UUID real, inclua-o para garantir a atualização
      if (hour.id && !hour.id.startsWith('new-')) {
        return { ...dataToSave, id: hour.id };
      }
      
      // Se for um ID temporário, não inclua o ID para forçar a inserção (o Supabase gerará o ID)
      return dataToSave;
    });

    // Usamos upsert com conflito em store_id e day_of_week
    const { error } = await supabase
      .from("store_operating_hours")
      .upsert(updates, { onConflict: 'store_id,day_of_week' });

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar horários de funcionamento",
        description: error.message,
      });
    } else {
      toast({
        title: "Horários de funcionamento salvos!",
        description: "As alterações foram aplicadas com sucesso",
      });
      loadOperatingHours(); // Reload to get actual IDs for newly inserted rows
    }
  };

  const handleSaveDeliverySettings = async () => {
    if (!profile?.store_id) return;

    const { error } = await supabase
      .from("stores")
      .update({ motoboy_whatsapp_number: motoboyWhatsappNumber || null })
      .eq("id", profile.store_id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar número do motoboy",
        description: error.message,
      });
    } else {
      toast({
        title: "Número do motoboy salvo!",
        description: "O número de WhatsApp do motoboy foi atualizado.",
      });
    }
  };

  const openAddSpecialDayDialog = () => {
    setEditingSpecialDay(null);
    setSelectedSpecialDate(undefined);
    setSpecialDayIsOpen(true); // Default to open
    setSpecialDayOpenTime("08:00");
    setSpecialDayCloseTime("18:00");
    setShowSpecialDayDialog(true);
  };

  const openEditSpecialDayDialog = (day: StoreSpecialDay) => {
    setEditingSpecialDay(day);
    setSelectedSpecialDate(parseISO(day.date));
    setSpecialDayIsOpen(day.is_open);
    setSpecialDayOpenTime(day.open_time);
    setSpecialDayCloseTime(day.close_time);
    setShowSpecialDayDialog(true);
  };

  const handleSaveSpecialDay = async () => {
    if (!profile?.store_id || !selectedSpecialDate) {
      toast({ variant: "destructive", title: "Erro", description: "Selecione uma data válida." });
      return;
    }

    const formattedDate = format(selectedSpecialDate, "yyyy-MM-dd");

    const specialDayData = {
      store_id: profile.store_id,
      date: formattedDate,
      is_open: specialDayIsOpen,
      open_time: specialDayIsOpen ? specialDayOpenTime : null,
      close_time: specialDayIsOpen ? specialDayCloseTime : null,
    };

    if (editingSpecialDay) {
      const { error } = await supabase
        .from("store_special_days")
        .update(specialDayData)
        .eq("id", editingSpecialDay.id);

      if (error) {
        toast({ variant: "destructive", title: "Erro ao atualizar dia especial", description: error.message });
      } else {
        toast({ title: "Dia especial atualizado!" });
        setShowSpecialDayDialog(false);
        loadSpecialDays();
      }
    } else {
      const { error } = await supabase
        .from("store_special_days")
        .insert(specialDayData);

      if (error) {
        toast({ variant: "destructive", title: "Erro ao adicionar dia especial", description: error.message });
      } else {
        toast({ title: "Dia especial adicionado!" });
        setShowSpecialDayDialog(false);
        loadSpecialDays();
      }
    }
  };

  const handleDeleteSpecialDay = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este dia especial?")) return;

    const { error } = await supabase
      .from("store_special_days")
      .delete()
      .eq("id", id);

    if (error) {
      toast({ variant: "destructive", title: "Erro ao excluir dia especial", description: error.message });
    } else {
      toast({ title: "Dia especial excluído!" });
      loadSpecialDays();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "ID copiado!",
      description: "O ID foi copiado para a área de transferência",
    });
  };
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground">Gerencie as configurações do sistema</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Informações da Loja */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Informações da Loja
            </CardTitle>
            <CardDescription>
              Configure os dados básicos do estabelecimento
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="store-name">Nome da Loja</Label>
              <Input id="store-name" defaultValue={storeName} onChange={(e) => setStoreName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="store-phone">Telefone</Label>
              <Input id="store-phone" defaultValue={storePhone} onChange={(e) => setStorePhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="store-address">Endereço</Label>
              <Input id="store-address" defaultValue={storeAddress} onChange={(e) => setStoreAddress(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="store-hours">Horário de Funcionamento</Label>
              <Input id="store-hours" defaultValue={storeHours} onChange={(e) => setStoreHours(e.target.value)} />
            </div>
            <Button className="w-full shadow-soft">Salvar Alterações</Button>
          </CardContent>
        </Card>

        {/* Configurações de Entrega */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Configurações de Entrega
            </CardTitle>
            <CardDescription>
              Gerencie as opções e contatos para entregas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="motoboy-whatsapp">WhatsApp do Motoboy</Label>
              <Input 
                id="motoboy-whatsapp" 
                type="tel" 
                placeholder="+55 68 8426-4931" 
                value={motoboyWhatsappNumber}
                onChange={(e) => setMotoboyWhatsappNumber(e.target.value.replace(/\D/g, ''))}
              />
              <p className="text-xs text-muted-foreground">
                Número de WhatsApp para envio de detalhes de entrega. Apenas números.
              </p>
            </div>
            <Button onClick={handleSaveDeliverySettings} className="w-full shadow-soft">
              Salvar Configurações de Entrega
            </Button>
          </CardContent>
        </Card>

        {/* Horário de Funcionamento */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Horário de Funcionamento
            </CardTitle>
            <CardDescription>
              Defina os horários de abertura e fechamento da loja por dia da semana.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {operatingHours.map((hour, index) => (
              <div key={hour.day_of_week} className="flex items-center justify-between gap-4 p-3 bg-accent rounded-lg">
                <Label htmlFor={`day-${hour.day_of_week}`} className="flex-1 font-medium">
                  {daysOfWeek[hour.day_of_week]}
                </Label>
                <Switch
                  id={`day-${hour.day_of_week}`}
                  checked={hour.is_open}
                  onCheckedChange={(checked) => handleOperatingHourChange(index, "is_open", checked)}
                />
                {hour.is_open && (
                  <>
                    <Select
                      value={hour.open_time || ""}
                      onValueChange={(value) => handleOperatingHourChange(index, "open_time", value)}
                    >
                      <SelectTrigger className="w-[100px]">
                        <SelectValue placeholder="Abre" />
                      </SelectTrigger>
                      <SelectContent>
                        {timeOptions.map(time => (
                          <SelectItem key={time} value={time}>{time}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={hour.close_time || ""}
                      onValueChange={(value) => handleOperatingHourChange(index, "close_time", value)}
                    >
                      <SelectTrigger className="w-[100px]">
                        <SelectValue placeholder="Fecha" />
                      </SelectTrigger>
                      <SelectContent>
                        {timeOptions.map(time => (
                          <SelectItem key={time} value={time}>{time}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                )}
              </div>
            ))}
            <Button onClick={handleSaveOperatingHours} className="w-full shadow-soft">
              Salvar Horários Semanais
            </Button>

            <Separator className="my-6" />

            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                Dias Especiais
              </h3>
              <Button size="sm" onClick={openAddSpecialDayDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Dia
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Defina horários específicos para feriados ou eventos.
            </p>

            <div className="space-y-3">
              {specialDays.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">Nenhum dia especial configurado.</p>
              ) : (
                specialDays.map(day => (
                  <div key={day.id} className="flex items-center justify-between p-3 bg-accent rounded-lg">
                    <div>
                      <p className="font-medium">{format(parseISO(day.date), "dd/MM/yyyy", { locale: ptBR })}</p>
                      <p className="text-sm text-muted-foreground">
                        {day.is_open ? `Aberto das ${day.open_time} às ${day.close_time}` : "Fechado"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEditSpecialDayDialog(day)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => handleDeleteSpecialDay(day.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Configurações de Notificação */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notificações
            </CardTitle>
            <CardDescription>
              Configure alertas e notificações do sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Som ao Receber Pedido</Label>
                <p className="text-sm text-muted-foreground">
                  Reproduz um som quando um novo pedido é recebido
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Alerta de Estoque Baixo</Label>
                <p className="text-sm text-muted-foreground">
                  Notifica quando o estoque estiver acabando
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Relatório Diário Automático</Label>
                <p className="text-sm text-muted-foreground">
                  Gera relatório automaticamente ao final do dia
                </p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>

        {/* Programa de Fidelidade */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Programa de Fidelidade
            </CardTitle>
            <CardDescription>
              Configure as regras do programa de pontuação
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="points-per-chicken">Pontos por Frango</Label>
              <Input 
                id="points-per-chicken" 
                type="number" 
                defaultValue="0.5"
                step="0.1"
              />
              <p className="text-xs text-muted-foreground">
                Pontos ganhos a cada frango comprado
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="points-for-free">Pontos para Resgate</Label>
              <Input 
                id="points-for-free" 
                type="number" 
                defaultValue="9"
              />
              <p className="text-xs text-muted-foreground">
                Pontos necessários para ganhar um frango grátis
              </p>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Programa Ativo</Label>
                <p className="text-sm text-muted-foreground">
                  Habilita o programa de fidelidade
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Button className="w-full shadow-soft">Salvar Configurações</Button>
          </CardContent>
        </Card>

        {/* Segurança */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Segurança
            </CardTitle>
            <CardDescription>
              Configurações de acesso e segurança
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-password">Alterar Senha de Administrador</Label>
              <Input id="admin-password" type="password" placeholder="Nova senha" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
              <Input id="confirm-password" type="password" placeholder="Confirme a senha" />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Login Automático</Label>
                <p className="text-sm text-muted-foreground">
                  Mantém logado por 30 dias
                </p>
              </div>
              <Switch />
            </div>
            <Button className="w-full shadow-soft">Alterar Senha</Button>
          </CardContent>
        </Card>

        {/* Aparência */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Aparência
            </CardTitle>
            <CardDescription>
              Personalize a interface do sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Modo Escuro</Label>
                <p className="text-sm text-muted-foreground">
                  Alterna entre tema claro e escuro
                </p>
              </div>
              <Switch />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Sons da Interface</Label>
                <p className="text-sm text-muted-foreground">
                  Reproduz sons ao interagir com botões
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="font-size">Tamanho da Fonte</Label>
              <select className="w-full px-3 py-2 border border-input rounded-md" defaultValue="medium">
                <option value="small">Pequena</option>
                <option value="medium">Média</option>
                <option value="large">Grande</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* ID do Usuário */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Identificação
            </CardTitle>
            <CardDescription>
              Informações do seu perfil
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>ID do Usuário</Label>
              <div className="flex gap-2">
                <Input 
                  value={user?.id || ""} 
                  readOnly 
                  className="font-mono text-sm"
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => user?.id && copyToClipboard(user.id)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Use este ID para identificação em suporte técnico
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Dados e Backup */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Dados e Backup
            </CardTitle>
            <CardDescription>
              Gerencie os dados do sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Backup Automático</Label>
                <p className="text-sm text-muted-foreground">
                  Faz backup dos dados diariamente
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="space-y-2">
              <Button variant="outline" className="w-full">
                Fazer Backup Manual
              </Button>
              <Button variant="outline" className="w-full">
                Restaurar Backup
              </Button>
              <Button variant="destructive" className="w-full">
                Limpar Dados (Cuidado!)
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Instalação do Sistema (apenas para admins) */}
        {isAdmin && (
          <Card className="shadow-soft border-primary/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Instalação do Sistema
              </CardTitle>
              <CardDescription>
                Configure toda a infraestrutura do sistema (Acesso Admin)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Acesse o painel de instalação para configurar tabelas, políticas de segurança,
                edge functions e todas as funcionalidades necessárias para o funcionamento completo do sistema.
              </p>
              <Button 
                onClick={() => navigate("/setup")} 
                className="w-full"
                variant="default"
              >
                <Wrench className="h-4 w-4 mr-2" />
                Acessar Painel de Instalação
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog para Adicionar/Editar Dia Especial */}
      <Dialog open={showSpecialDayDialog} onOpenChange={(open) => {
        setShowSpecialDayDialog(open);
        if (!open) {
          setEditingSpecialDay(null);
          setSelectedSpecialDate(undefined);
          setSpecialDayIsOpen(false);
          setSpecialDayOpenTime(null);
          setSpecialDayCloseTime(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSpecialDay ? "Editar Dia Especial" : "Adicionar Dia Especial"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="specialDate">Data</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedSpecialDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {selectedSpecialDate ? format(selectedSpecialDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedSpecialDate}
                    onSelect={setSelectedSpecialDate}
                    initialFocus
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="specialDayIsOpen"
                checked={specialDayIsOpen}
                onCheckedChange={setSpecialDayIsOpen}
              />
              <Label htmlFor="specialDayIsOpen">Loja Aberta neste dia?</Label>
            </div>
            {specialDayIsOpen && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="specialOpenTime">Abre às</Label>
                  <Select
                    value={specialDayOpenTime || ""}
                    onValueChange={setSpecialDayOpenTime}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Horário de Abertura" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map(time => (
                        <SelectItem key={time} value={time}>{time}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="specialCloseTime">Fecha às</Label>
                  <Select
                    value={specialDayCloseTime || ""}
                    onValueChange={setSpecialDayCloseTime}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Horário de Fechamento" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map(time => (
                        <SelectItem key={time} value={time}>{time}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSpecialDayDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveSpecialDay}>
              {editingSpecialDay ? "Salvar Alterações" : "Adicionar Dia"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}