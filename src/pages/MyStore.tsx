import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Store, Link as LinkIcon } from "lucide-react";
import { supabase as sb } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const supabase: any = sb;

interface StoreData {
  id: string;
  name: string;
  slug: string | null;
  display_name: string | null;
  is_active: boolean;
  image_url?: string; // Added image_url
}

export default function MyStore() {
  const [storeData, setStoreData] = useState<StoreData | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [slug, setSlug] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [imageUrl, setImageUrl] = useState(""); // New state for image URL
  const [loading, setLoading] = useState(true);
  const { profile, isAdmin } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (profile?.store_id) {
      loadStoreData();
    } else {
      setLoading(false);
    }
  }, [profile]);

  const loadStoreData = async () => {
    if (!profile?.store_id) return;

    const { data, error } = await supabase
      .from("stores")
      .select("*")
      .eq("id", profile.store_id)
      .maybeSingle();

    if (error) {
      console.error("Erro ao carregar dados da loja:", error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar dados da loja",
        description: error.message,
      });
      setLoading(false);
      return;
    }

    if (data) {
      setStoreData(data);
      setDisplayName(data.display_name || data.name);
      setSlug(data.slug || "");
      setIsActive(data.is_active ?? true);
      setImageUrl(data.image_url || "");
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!storeData) return;

    // Validar slug
    const slugRegex = /^[a-z0-9-]+$/;
    if (slug && !slugRegex.test(slug)) {
      toast({
        variant: "destructive",
        title: "URL inválida",
        description: "Use apenas letras minúsculas, números e hífens",
      });
      return;
    }

    const { error } = await supabase
      .from("stores")
      .update({
        display_name: displayName,
        slug: slug || null,
        is_active: isActive,
        image_url: imageUrl || null, // Save image URL
      })
      .eq("id", storeData.id);

    if (error) {
      console.error("Erro ao salvar dados da loja:", error);
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: error.message,
      });
      return;
    }

    toast({
      title: "Configurações salvas!",
      description: "As alterações foram aplicadas com sucesso",
    });

    loadStoreData();
  };

  const getStoreUrl = () => {
    const baseUrl = window.location.origin;
    if (slug) {
      return `${baseUrl}/loja/${slug}`;
    }
    return `${baseUrl}/loja`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              Esta página é para usuários de loja. Acesse "Lojas" para gerenciar as lojas do sistema.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!storeData) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">Nenhuma loja encontrada</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Minha Loja</h1>
        <p className="text-muted-foreground">Configure sua loja online</p>
      </div>

      <div className="grid gap-6 max-w-2xl">
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Informações da Loja
            </CardTitle>
            <CardDescription>
              Personalize o nome e a aparência da sua loja
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Nome da Loja</Label>
              <Input
                id="displayName"
                placeholder="Ex: Frango Assado do João"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Este nome será exibido para seus clientes
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="imageUrl">URL da Logo (opcional)</Label>
              <Input
                id="imageUrl"
                type="url"
                placeholder="https://exemplo.com/logo.png"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Cole a URL da imagem da sua logo
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">URL Personalizada</Label>
              <div className="flex gap-2 items-center">
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {window.location.origin}/loja/
                </span>
                <Input
                  id="slug"
                  placeholder="frangoassadodojoao"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Use apenas letras minúsculas, números e hífens
              </p>
            </div>

            {slug && (
              <div className="p-3 bg-accent rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <LinkIcon className="h-4 w-4 text-primary" />
                  <p className="text-sm font-medium">URL da sua loja:</p>
                </div>
                <a
                  href={getStoreUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline break-all"
                >
                  {getStoreUrl()}
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Status da Loja</CardTitle>
            <CardDescription>
              Controle quando sua loja está disponível para pedidos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-accent rounded-lg">
              <div>
                <p className="font-medium">
                  {isActive ? "Loja Aberta" : "Loja Fechada"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isActive
                    ? "Clientes podem fazer pedidos"
                    : "Clientes não podem fazer novos pedidos"}
                </p>
              </div>
              <Switch
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSave} className="w-full shadow-soft">
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
}