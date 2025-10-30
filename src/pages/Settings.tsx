import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
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

interface OrderStatusConfig {
  id: string;
  store_id: string;
  status_key: string;
  status_label: string;
  is_active: boolean;
  display_order: number;
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

// Helper function to normalize time format from HH:MM:SS to HH:MM
const normalizeTimeFormat = (time: string | null): string | null => {
  if (!time) return null;
  // If time is in HH:MM:SS format, convert to HH:MM
  if (time.length === 8 && time.split(':').length === 3) {
    return time.substring(0, 5);
  }
  return time;
};

// Helper function to validate that close time is after open time
const isCloseTimeValid = (openTime: string | null, closeTime: string | null): boolean => {
  if (!openTime || !closeTime) return true; // If either is null, skip validation
  
  const [openHour, openMin] = openTime.split(':').map(Number);
  const [closeHour, closeMin] = closeTime.split(':').map(Number);
  
  const openMinutes = openHour * 60 + openMin;
  const closeMinutes = closeHour * 60 + closeMin;
  
  return closeMinutes > openMinutes;
};

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
  const [orderStatusConfigs, setOrderStatusConfigs] = useState<OrderStatusConfig[]>([]);
  const [editingStatusLabel, setEditingStatusLabel] = useState<string | null>(null);
  const [tempStatusLabel, setTempStatusLabel] = useState("");

  useEffect(() => {
    if (profile?.store_id) {
      loadStoreSettings();
      loadOperatingHours();
      loadSpecialDays();
      loadOrderStatusConfigs();
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
        // Normalize time format and set defaults if needed
        const normalizedOpenTime = normalizeTimeFormat(existing.open_time);
        const normalizedCloseTime = normalizeTimeFormat(existing.close_time);
        
        return {
          ...existing,
          open_time: existing.is_open && !normalizedOpenTime ? "08:00" : normalizedOpenTime,
          close_time: existing.is_open && !normalizedCloseTime ? "18:00" : normalizedCloseTime,
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

    // Validar horários antes de salvar
    for (const hour of operatingHours) {
      if (hour.is_open) {
        const openTime = hour.open_time || "08:00";
        const closeTime = hour.close_time || "18:00";
        
        if (!isCloseTimeValid(openTime, closeTime)) {
          toast({
            variant: "destructive",
            title: "Horário inválido",
            description: `${daysOfWeek[hour.day_of_week]}: O horário de fechamento (${closeTime}) deve ser posterior ao horário de abertura (${openTime}).`,
          });
          return;
        }
      }
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

  const loadOrderStatusConfigs = async () => {
    if (!profile?.store_id) return;

    const { data, error } = await supabase
      .from("order_status_config")
      .select("*")
      .eq("store_id", profile.store_id)
      .order("display_order");

    if (error) {
      console.error("Erro ao carregar configurações de status:", error);
      // Se a tabela não existir ainda, cria os defaults
      if (error.code === "42P01") {
        await initializeDefaultStatusConfigs();
      }
    } else {
      setOrderStatusConfigs(data || []);
    }
  };

  const initializeDefaultStatusConfigs = async () => {
    if (!profile?.store_id) return;

    const defaults = [
      { status_key: "pending", status_label: "Pendente", is_active: true, display_order: 1 },
      { status_key: "preparing", status_label: "Em Preparo", is_active: true, display_order: 2 },
      { status_key: "ready", status_label: "Pronto", is_active: true, display_order: 3 },
      { status_key: "delivered", status_label: "Entregue", is_active: true, display_order: 4 },
      { status_key: "cancelled", status_label: "Cancelado", is_active: true, display_order: 5 },
    ];

    const { error } = await supabase
      .from("order_status_config")
      .insert(defaults.map(d => ({ ...d, store_id: profile.store_id })));

    if (!error) {
      loadOrderStatusConfigs();
    }
  };

  const handleToggleStatusActive = async (statusId: string, isActive: boolean) => {
    const { error } = await supabase
      .from("order_status_config")
      .update({ is_active: isActive })
      .eq("id", statusId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar status",
        description: error.message,
      });
    } else {
      toast({
        title: "Status atualizado!",
        description: `Status ${isActive ? "ativado" : "desativado"} com sucesso.`,
      });
      loadOrderStatusConfigs();
    }
  };

  const handleUpdateStatusLabel = async (statusId: string, newLabel: string) => {
    if (!newLabel.trim()) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "O nome do status não pode estar vazio.",
      });
      return;
    }

    const { error } = await supabase
      .from("order_status_config")
      .update({ status_label: newLabel })
      .eq("id", statusId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao renomear status",
        description: error.message,
      });
    } else {
      toast({
        title: "Status renomeado!",
        description: "O nome do status foi atualizado com sucesso.",
      });
      setEditingStatusLabel(null);
      setTempStatusLabel("");
      loadOrderStatusConfigs();
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
    setSpecialDayOpenTime(normalizeTimeFormat(day.open_time));
    setSpecialDayCloseTime(normalizeTimeFormat(day.close_time));
    setShowSpecialDayDialog(true);
  };

  const handleSaveSpecialDay = async () => {
    if (!profile?.store_id || !selectedSpecialDate) {
      toast({ variant: "destructive", title: "Erro", description: "Selecione uma data válida." });
      return;
    }

    // Validar horários se o dia estiver aberto
    if (specialDayIsOpen) {
      const openTime = specialDayOpenTime || "08:00";
      const closeTime = specialDayCloseTime || "18:00";
      
      if (!isCloseTimeValid(openTime, closeTime)) {
        toast({
          variant: "destructive",
          title: "Horário inválido",
          description: `O horário de fechamento (${closeTime}) deve ser posterior ao horário de abertura (${openTime}).`,
        });
        return;
      }
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

            <Separator className="my-6" />

            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Status de Pedidos</h3>
              <p className="text-sm text-muted-foreground">
                Personalize os status exibidos no painel de pedidos. Desative status desnecessários para simplificar o fluxo.
              </p>

              {orderStatusConfigs.map((status) => (
                <div key={status.id} className="flex items-center justify-between p-3 bg-accent rounded-lg">
                  <div className="flex items-center gap-3 flex-1">
                    <Switch
                      checked={status.is_active}
                      onCheckedChange={(checked) => handleToggleStatusActive(status.id, checked)}
                      disabled={status.status_key === "pending" || status.status_key === "cancelled"}
                    />
                    
                    {editingStatusLabel === status.id ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          value={tempStatusLabel}
                          onChange={(e) => setTempStatusLabel(e.target.value)}
                          className="h-8"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleUpdateStatusLabel(status.id, tempStatusLabel);
                            } else if (e.key === "Escape") {
                              setEditingStatusLabel(null);
                              setTempStatusLabel("");
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleUpdateStatusLabel(status.id, tempStatusLabel)}
                        >
                          Salvar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingStatusLabel(null);
                            setTempStatusLabel("");
                          }}
                        >
                          Cancelar
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-1">
                        <span className={cn("font-medium", !status.is_active && "text-muted-foreground line-through")}>
                          {status.status_label}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => {
                            setEditingStatusLabel(status.id);
                            setTempStatusLabel(status.status_label);
                          }}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <Badge variant={status.is_active ? "default" : "secondary"} className="ml-2">
                    {status.is_active ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
              ))}

              {orderStatusConfigs.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  Nenhuma configuração de status encontrada.
                </p>
              )}

              <p className="text-xs text-muted-foreground">
                💡 Dica: Status desativados serão pulados automaticamente no painel de pedidos.
                Por exemplo, desativar "Em Preparo" fará os pedidos irem direto de "Pendente" para "Pronto".
              </p>
            </div>
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
            {operatingHours.map((hour, index) => {
              const hasInvalidTime = hour.is_open && hour.open_time && hour.close_time && !isCloseTimeValid(hour.open_time, hour.close_time);
              
              return (
                <div key={hour.day_of_week} className={cn("flex items-center justify-between gap-4 p-3 rounded-lg", hasInvalidTime ? "bg-red-50 dark:bg-red-950" : "bg-accent")}>
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
                        <SelectTrigger className={cn("w-[100px]", hasInvalidTime && "border-red-500")}>
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
                        <SelectTrigger className={cn("w-[100px]", hasInvalidTime && "border-red-500")}>
                          <SelectValue placeholder="Fecha" />
                        </SelectTrigger>
                        <SelectContent>
                          {timeOptions.map(time => (
                            <SelectItem key={time} value={time}>{time}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {hasInvalidTime && (
                        <span className="text-xs text-red-600 dark:text-red-400">⚠️</span>
                      )}
                    </>
                  )}
                </div>
              );
            })}
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
                        {day.is_open ? `Aberto das ${normalizeTimeFormat(day.open_time)} às ${normalizeTimeFormat(day.close_time)}` : "Fechado"}
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