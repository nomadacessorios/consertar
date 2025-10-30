import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Store, Link2, Check, X, Trash2, UserPlus, Search } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const supabase: any = sb;

interface StoreData {
  id: string;
  name: string;
  created_at: string;
}

interface UserProfile {
  id: string;
  full_name: string | null;
  store_id: string | null;
  approved: boolean; // Added 'approved' column
  email?: string;
}

export default function Stores() {
  const [stores, setStores] = useState<StoreData[]>([]);
  const [storeName, setStoreName] = useState("");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchEmail, setSearchEmail] = useState("");
  const [selectedStore, setSelectedStore] = useState<string>("");
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserStore, setNewUserStore] = useState("");
  const { isAdmin } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (isAdmin) {
      loadStores();
      loadUsers();
    }
  }, [isAdmin]);

  const loadStores = async () => {
    const { data, error } = await supabase
      .from("stores")
      .select("*")
      .order("name");

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar lojas",
        description: error.message,
      });
    } else {
      setStores(data || []);
    }
  };

  const loadUsers = async () => {
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, store_id, approved, email");

    if (profilesError) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar usuários",
        description: profilesError.message,
      });
      return;
    }

    setUsers((profilesData || []) as UserProfile[]);
  };

  const handleAddStore = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase.from("stores").insert({
      name: storeName,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao adicionar loja",
        description: error.message,
      });
    } else {
      toast({
        title: "Loja adicionada com sucesso!",
      });
      setStoreName("");
      loadStores();
    }
  };

  const handleDeleteStore = async (storeId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta loja? Todos os dados associados (produtos, pedidos, clientes e usuários vinculados) serão perdidos permanentemente.")) {
      return;
    }

    console.log("Attempting to invoke admin-delete-store for storeId:", storeId); // Adicionado para depuração

    // Call the new admin-delete-store edge function
    const { data, error } = await supabase.functions.invoke('admin-delete-store', {
      body: { storeId }
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir loja",
        description: error.message,
      });
    } else if (data && data.success) {
      toast({
        title: "Loja excluída com sucesso!",
      });
      loadStores();
      loadUsers(); // Reload users as some might have been linked to this store
    } else {
      toast({
        variant: "destructive",
        title: "Erro ao excluir loja",
        description: data?.error || "Ocorreu um erro desconhecido.",
      });
    }
  };

  const handleLinkUserToStore = async () => {
    if (!selectedUser || !selectedStore) {
      toast({
        variant: "destructive",
        title: "Selecione um usuário e uma loja",
      });
      return;
    }

    // Verificar se o usuário já está vinculado a alguma loja
    const { data: userData } = await supabase
      .from("profiles")
      .select("store_id")
      .eq("id", selectedUser)
      .single();

    if (userData?.store_id) {
      toast({
        variant: "destructive",
        title: "Usuário já vinculado a uma loja",
        description: "Um usuário não pode ser reatribuído a outra loja após o vínculo inicial.",
      });
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ store_id: selectedStore })
      .eq("id", selectedUser);

    if (error) {
      const isReassignmentError = error.message.includes("não pode ser reatribuído") || 
                                   error.message.includes("já está vinculado");
      toast({
        variant: "destructive",
        title: "Erro ao vincular usuário",
        description: isReassignmentError 
          ? "Este usuário já está vinculado a uma loja e não pode ser reatribuído."
          : error.message,
      });
    } else {
      toast({
        title: "Usuário vinculado com sucesso!",
      });
      setIsLinkDialogOpen(false);
      setSelectedUser("");
      setSelectedStore("");
      loadUsers();
    }
  };

  const handleApproveUser = async (userId: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ approved: true })
      .eq("id", userId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao aprovar usuário",
        description: error.message,
      });
    } else {
      toast({
        title: "Usuário aprovado!",
      });
      loadUsers();
    }
  };

  const handleRejectUser = async (userId: string) => {
    const { error } = await supabase.functions.invoke('admin-delete-user', {
      body: { userId }
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao rejeitar usuário",
        description: error.message,
      });
    } else {
      toast({
        title: "Usuário rejeitado",
      });
      loadUsers();
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const { error } = await supabase.functions.invoke('admin-delete-user', {
      body: { userId }
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir usuário",
        description: error.message,
      });
    } else {
      toast({
        title: "Usuário excluído",
      });
      loadUsers();
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase.functions.invoke('admin-create-user', {
      body: {
        email: newUserEmail,
        password: newUserPassword,
        fullName: newUserName,
        storeId: newUserStore && newUserStore !== "none" ? newUserStore : undefined,
      }
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao criar usuário",
        description: error.message,
      });
      return;
    }

    toast({
      title: "Usuário criado e aprovado!",
    });
    setNewUserEmail("");
    setNewUserPassword("");
    setNewUserName("");
    setNewUserStore("");
    loadUsers();
  };

  const filteredUsers = users.filter(user => 
    user.email?.toLowerCase().includes(searchEmail.toLowerCase())
  );

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              Você não tem permissão para acessar esta página.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Gerenciar Lojas</h1>
        <p className="text-muted-foreground">Cadastre e gerencie lojas do sistema</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Adicionar Nova Loja</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddStore} className="flex gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="storeName">Nome da Loja</Label>
              <Input
                id="storeName"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="Ex: Filial Centro"
                required
              />
            </div>
            <div className="flex items-end">
              <Button type="submit">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cadastrar Novo Usuário</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="newUserName">Nome Completo</Label>
                <Input
                  id="newUserName"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Nome do usuário"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newUserEmail">Email</Label>
                <Input
                  id="newUserEmail"
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newUserPassword">Senha</Label>
                <Input
                  id="newUserPassword"
                  type="password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="Senha"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newUserStore">Loja (opcional)</Label>
                <Select value={newUserStore} onValueChange={setNewUserStore}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma loja" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma loja</SelectItem>
                    {stores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit">
              <UserPlus className="h-4 w-4 mr-2" />
              Criar Usuário
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lojas Cadastradas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stores.length === 0 ? (
              <p className="col-span-full text-center text-muted-foreground py-8">
                Nenhuma loja cadastrada
              </p>
            ) : (
              stores.map((store) => (
                <Card key={store.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-3 rounded-full">
                          <Store className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold">{store.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(store.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Dialog open={isLinkDialogOpen && selectedStore === store.id} onOpenChange={(open) => {
                          setIsLinkDialogOpen(open);
                          if (open) setSelectedStore(store.id);
                        }}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Link2 className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Vincular Usuário à Loja</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <Label>Usuário</Label>
                                <Select value={selectedUser} onValueChange={setSelectedUser}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione um usuário" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {users.filter(u => u.approved && !u.store_id).map((user) => (
                                      <SelectItem key={user.id} value={user.id}>
                                        {user.full_name} ({user.email})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {users.filter(u => u.approved && !u.store_id).length === 0 && (
                                  <p className="text-sm text-muted-foreground mt-2">
                                    Todos os usuários aprovados já estão vinculados a lojas
                                  </p>
                                )}
                              </div>
                              <Button onClick={handleLinkUserToStore}>
                                Vincular
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteStore(store.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usuários Cadastrados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por email..."
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              {filteredUsers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum usuário encontrado
                </p>
              ) : (
                filteredUsers.map((user) => (
                  <Card key={user.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{user.full_name || "Sem nome"}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                          <p className="text-xs text-muted-foreground">
                            Loja: {stores.find(s => s.id === user.store_id)?.name || "Não vinculado"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {!user.approved ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleApproveUser(user.id)}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Permitir
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleRejectUser(user.id)}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Não Permitir
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteUser(user.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Excluir
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}