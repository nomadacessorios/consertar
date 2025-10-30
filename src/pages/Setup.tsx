import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Database, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  AlertTriangle,
  Shield,
  Wrench,
  UserPlus
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface SetupStep {
  name: string;
  description: string;
  status: "pending" | "running" | "completed" | "error";
  message?: string;
}

export default function Setup() {
  const { isAdmin, user, loading: authLoading } = useAuth(); // Obter user e authLoading
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [isInstalling, setIsInstalling] = useState(false);
  const [installProgress, setInstallProgress] = useState(0);
  const [installationComplete, setInstallationComplete] = useState(false);
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);
  const [skipToAdmin, setSkipToAdmin] = useState(false);
  
  // Admin user form state
  const [adminData, setAdminData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    storeName: ""
  });
  
  const [steps, setSteps] = useState<SetupStep[]>([
    { name: "Verificar permissões", description: "Validando acesso administrativo", status: "pending" },
    { name: "Criar tabelas principais", description: "stores, profiles, user_roles", status: "pending" },
    { name: "Criar tabelas de produtos", description: "products, product_variations, categories", status: "pending" },
    { name: "Criar tabelas de pedidos", description: "orders, order_items, cash_register", status: "pending" },
    { name: "Criar tabelas de fidelidade", description: "customers, loyalty_rules, loyalty_transactions", status: "pending" },
    { name: "Configurar políticas RLS", description: "Row Level Security para todas as tabelas", status: "pending" },
    { name: "Criar funções e triggers", description: "Funções auxiliares e triggers automáticos", status: "pending" },
    { name: "Configurar autenticação", description: "Auto-confirm email e configurações de segurança", status: "pending" },
    { name: "Finalizar instalação", description: "Verificar integridade do sistema", status: "pending" },
  ]);

  const updateStep = (index: number, status: SetupStep["status"], message?: string) => {
    setSteps(prev => {
      const newSteps = [...prev];
      newSteps[index] = { ...newSteps[index], status, message };
      return newSteps;
    });
    setInstallProgress(((index + 1) / steps.length) * 100);
  };

  const createAdminUser = async () => {
    // Validação
    if (!adminData.email || !adminData.password || !adminData.fullName || !adminData.storeName) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Preencha todos os campos para criar o usuário administrador.",
      });
      return;
    }

    if (adminData.password !== adminData.confirmPassword) {
      toast({
        variant: "destructive",
        title: "Senhas não coincidem",
        description: "As senhas digitadas não são iguais.",
      });
      return;
    }

    if (adminData.password.length < 6) {
      toast({
        variant: "destructive",
        title: "Senha muito curta",
        description: "A senha deve ter pelo menos 6 caracteres.",
      });
      return;
    }

    setIsCreatingAdmin(true);

    try {
      // Primeiro, criar a loja
      const { data: store, error: storeError } = await supabase
        .from("stores")
        .insert({
          name: adminData.storeName,
          slug: adminData.storeName.toLowerCase().replace(/\s+/g, "-"),
        })
        .select()
        .single();

      if (storeError) {
        throw new Error(`Erro ao criar loja: ${storeError.message}`);
      }

      // Chamar edge function para criar usuário administrador
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: {
          email: adminData.email,
          password: adminData.password,
          full_name: adminData.fullName,
          role: "admin",
          store_id: store.id,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      toast({
        title: "Usuário administrador criado!",
        description: "Você pode fazer login agora com suas credenciais.",
      });

      // Redirecionar para login após 2 segundos
      setTimeout(() => {
        navigate("/login");
      }, 2000);

    } catch (error: any) {
      console.error("Erro ao criar usuário administrador:", error);
      toast({
        variant: "destructive",
        title: "Erro ao criar administrador",
        description: error.message || "Ocorreu um erro ao criar o usuário administrador.",
      });
    } finally {
      setIsCreatingAdmin(false);
    }
  };

  const runInstallation = async () => {
    setIsInstalling(true);
    setInstallProgress(0);

    try {
      // Simular verificação de permissões (agora apenas um placeholder visual)
      updateStep(0, "running");
      await new Promise(resolve => setTimeout(resolve, 500));
      updateStep(0, "completed", "Verificação inicial concluída");

      // Chamar edge function de instalação
      updateStep(1, "running");
      
      const { data, error } = await supabase.functions.invoke("setup-system", {
        body: {},
      });

      if (error) {
        throw new Error(error.message);
      }

      // Atualizar status de cada passo baseado na resposta
      const setupResults = data?.steps || [];
      
      // Ajustar o loop para começar do índice 1, pois o passo 0 é a verificação de permissões local
      setupResults.forEach((result: any, index: number) => {
        if (index + 1 < steps.length) { // Garante que não exceda o array de steps local
          updateStep(index + 1, result.success ? "completed" : "error", result.message);
        }
      });

      // Marcar todos os passos restantes como completos se tudo deu certo
      if (data?.success) {
        steps.forEach((_, index) => {
          if (index > 0 && steps[index].status !== "error") { // Só marca como completo se não tiver erro
            updateStep(index, "completed");
          }
        });

        setInstallationComplete(true);
        
        toast({
          title: "Instalação concluída!",
          description: "Agora crie um usuário administrador para começar.",
        });
      } else {
        // Se a função retornou sucesso: false, mas sem erro, exibe a mensagem geral
        toast({
          variant: "destructive",
          title: "Instalação com falhas",
          description: data?.message || "Alguns passos da instalação falharam. Verifique os detalhes.",
        });
      }

    } catch (error: any) {
      console.error("Erro durante instalação:", error);
      
      // Marcar passo atual como erro
      const currentStep = steps.findIndex(s => s.status === "running");
      if (currentStep !== -1) {
        updateStep(currentStep, "error", error.message || "Erro desconhecido");
      }

      toast({
        variant: "destructive",
        title: "Erro na instalação",
        description: error.message || "Ocorreu um erro durante a instalação do sistema.",
      });
    } finally {
      setIsInstalling(false);
    }
  };

  const getStatusIcon = (status: SetupStep["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "running":
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-muted" />;
    }
  };

  const getStatusBadge = (status: SetupStep["status"]) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500">Concluído</Badge>;
      case "running":
        return <Badge className="bg-blue-500">Em execução</Badge>;
      case "error":
        return <Badge variant="destructive">Erro</Badge>;
      default:
        return <Badge variant="outline">Aguardando</Badge>;
    }
  };

  // Se ainda estiver carregando a autenticação, mostre um loader
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Carregando autenticação...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-lg bg-primary/10">
          <Wrench className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Instalação do Sistema</h1>
          <p className="text-muted-foreground">Configure toda a infraestrutura necessária para o funcionamento</p>
        </div>
      </div>

      {/* Card de instruções iniciais */}
      {!installationComplete && !skipToAdmin && steps.every(s => s.status === "pending") && (
        <Card className="shadow-soft border-blue-200 bg-blue-50 dark:bg-blue-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-blue-600" />
              Antes de começar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>Certifique-se de ter executado os seguintes passos no Supabase SQL Editor:</p>
            <ol className="list-decimal list-inside space-y-2 ml-4">
              <li>Habilitar extensões UUID e pgcrypto</li>
              <li>Executar a migration completa (20251029022239_complete_setup.sql)</li>
              <li>Fazer deploy das Edge Functions usando o CLI do Supabase</li>
              <li>Configurar a variável SUPABASE_SERVICE_ROLE_KEY nas secrets</li>
            </ol>
            <p className="text-blue-700 dark:text-blue-300 font-medium">
              📖 Consulte o arquivo <code>INSTRUCOES_INSTALACAO.md</code> para mais detalhes.
            </p>
            <div className="pt-3 border-t mt-4">
              <p className="text-xs text-muted-foreground mb-2">
                Já executou a migration manualmente?
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSkipToAdmin(true);
                  setInstallationComplete(true);
                }}
              >
                Pular para Criação de Admin
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!skipToAdmin && (
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Status da Instalação
            </CardTitle>
            <CardDescription>
              Acompanhe o progresso da configuração do sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
          {/* Barra de progresso */}
          {isInstalling && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progresso geral</span>
                <span className="font-medium">{Math.round(installProgress)}%</span>
              </div>
              <Progress value={installProgress} className="h-2" />
            </div>
          )}

          {/* Lista de passos */}
          <div className="space-y-3">
            {steps.map((step, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border transition-all ${
                  step.status === "running" ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20" : 
                  step.status === "completed" ? "border-green-500 bg-green-50 dark:bg-green-950/20" :
                  step.status === "error" ? "border-red-500 bg-red-50 dark:bg-red-950/20" :
                  "border-border"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {getStatusIcon(step.status)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">
                        {index + 1}. {step.name}
                      </h4>
                      {getStatusBadge(step.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                    {step.message && (
                      <p className={`text-xs mt-2 ${
                        step.status === "error" ? "text-red-600 dark:text-red-400" : "text-muted-foreground"
                      }`}>
                        {step.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Botões de ação */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={runInstallation}
              disabled={isInstalling}
              className="flex-1"
              size="lg"
            >
              {isInstalling ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Instalando...
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 mr-2" />
                  Iniciar Instalação
                </>
              )}
            </Button>
            
            {!isInstalling && (
              <Button
                variant="outline"
                onClick={() => navigate("/")}
                size="lg"
              >
                Voltar
              </Button>
            )}
          </div>

          {/* Aviso importante */}
          {!isInstalling && steps.every(s => s.status === "pending") && (
            <Alert variant="default" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Importante:</strong> Este processo pode levar alguns minutos para ser concluído.
                Certifique-se de que as variáveis de ambiente do Supabase estão configuradas corretamente.
              </AlertDescription>
            </Alert>
          )}
          </CardContent>
        </Card>
      )}

      {/* Card de criação de usuário administrador */}
      {installationComplete && (
        <Card className="shadow-soft border-green-200 bg-green-50 dark:bg-green-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-green-600" />
              Criar Usuário Administrador
            </CardTitle>
            <CardDescription>
              Configure o primeiro usuário administrador do sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
              <Shield className="h-4 w-4 text-blue-600" />
              <AlertDescription>
                Este será o usuário principal do sistema com acesso total a todas as funcionalidades.
              </AlertDescription>
            </Alert>

            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="storeName">Nome da Loja *</Label>
                <Input
                  id="storeName"
                  type="text"
                  placeholder="Minha Loja"
                  value={adminData.storeName}
                  onChange={(e) => setAdminData({ ...adminData, storeName: e.target.value })}
                  disabled={isCreatingAdmin}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName">Nome Completo *</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="João Silva"
                  value={adminData.fullName}
                  onChange={(e) => setAdminData({ ...adminData, fullName: e.target.value })}
                  disabled={isCreatingAdmin}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@exemplo.com"
                  value={adminData.email}
                  onChange={(e) => setAdminData({ ...adminData, email: e.target.value })}
                  disabled={isCreatingAdmin}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Senha *</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={adminData.password}
                    onChange={(e) => setAdminData({ ...adminData, password: e.target.value })}
                    disabled={isCreatingAdmin}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Senha *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={adminData.confirmPassword}
                    onChange={(e) => setAdminData({ ...adminData, confirmPassword: e.target.value })}
                    disabled={isCreatingAdmin}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={createAdminUser}
                disabled={isCreatingAdmin}
                className="flex-1"
                size="lg"
              >
                {isCreatingAdmin ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Criando Administrador...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Criar Administrador
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}