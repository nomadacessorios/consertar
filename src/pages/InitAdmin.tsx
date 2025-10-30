import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

export default function InitAdmin() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    createAdminUser();
  }, []);

  const createAdminUser = async () => {
    try {
      // Get the store ID
      const { data: stores, error: storeError } = await supabase
        .from("stores")
        .select("id")
        .eq("slug", "loja-principal")
        .single();

      if (storeError || !stores) {
        throw new Error("Erro ao buscar loja: " + (storeError?.message || "Loja não encontrada"));
      }

      // Create admin user
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: {
          email: "neto@admin.com",
          password: "123as123",
          full_name: "Neto",
          role: "admin",
          store_id: stores.id,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      setStatus("success");
      setMessage("Usuário administrador criado com sucesso! Email: neto@admin.com");
    } catch (error: any) {
      console.error("Erro ao criar usuário:", error);
      setStatus("error");
      setMessage(error.message || "Erro ao criar usuário administrador");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-background to-muted">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Inicialização do Sistema</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {status === "loading" && (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-center text-muted-foreground">
                Criando usuário administrador...
              </p>
            </div>
          )}

          {status === "success" && (
            <div className="flex flex-col items-center gap-4">
              <CheckCircle className="h-12 w-12 text-green-500" />
              <p className="text-center text-foreground font-medium">{message}</p>
              <div className="w-full space-y-2 p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium">Credenciais de acesso:</p>
                <p className="text-sm">Email: <span className="font-mono">neto@admin.com</span></p>
                <p className="text-sm">Senha: <span className="font-mono">123as123</span></p>
              </div>
              <Button 
                onClick={() => navigate("/login")} 
                className="w-full"
                size="lg"
              >
                Ir para Login
              </Button>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center gap-4">
              <XCircle className="h-12 w-12 text-destructive" />
              <p className="text-center text-destructive">{message}</p>
              <Button 
                onClick={createAdminUser}
                variant="outline" 
                className="w-full"
              >
                Tentar Novamente
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
