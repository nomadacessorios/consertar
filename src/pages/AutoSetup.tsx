import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function AutoSetup() {
  const [status, setStatus] = useState<"pending" | "running" | "success" | "error">("pending");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const createAdminUser = async () => {
    setStatus("running");
    setMessage("Criando usuário administrador...");

    try {
      // Get store ID
      const { data: store, error: storeError } = await supabase
        .from("stores")
        .select("id")
        .eq("slug", "neto")
        .single();

      if (storeError) {
        throw new Error(`Erro ao buscar loja: ${storeError.message}`);
      }

      // Create admin user
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: {
          email: "neto@admin.com",
          password: "123as123",
          full_name: "Neto",
          role: "admin",
          store_id: store.id,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      setStatus("success");
      setMessage("Usuário administrador criado com sucesso!");
    } catch (error: any) {
      console.error("Erro ao criar usuário:", error);
      setStatus("error");
      setMessage(error.message || "Erro ao criar usuário administrador");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-6">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Setup Automático</CardTitle>
          <CardDescription>
            Criar usuário administrador do sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "pending" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Email: neto@admin.com<br />
                Senha: 123as123<br />
                Nome: Neto<br />
                Loja: Neto
              </p>
              <Button onClick={createAdminUser} className="w-full">
                Criar Usuário Admin
              </Button>
            </div>
          )}

          {status === "running" && (
            <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
              <p className="text-sm">{message}</p>
            </div>
          )}

          {status === "success" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <p className="text-sm">{message}</p>
              </div>
              <Button onClick={() => navigate("/login")} className="w-full">
                Ir para Login
              </Button>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/20 rounded-lg">
                <XCircle className="h-5 w-5 text-red-500" />
                <p className="text-sm">{message}</p>
              </div>
              <Button onClick={createAdminUser} variant="outline" className="w-full">
                Tentar Novamente
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
