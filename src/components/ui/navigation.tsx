import React from "react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Monitor, 
  FileBarChart,
  Gift,
  Settings,
  LogOut,
  Package,
  Store as StoreIcon,
  Archive
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export function Navigation() {
  const { signOut, isAdmin } = useAuth();

  const navItems = isAdmin 
    ? [
        { to: "/", icon: LayoutDashboard, label: "Dashboard" },
        { to: "/lojas", icon: StoreIcon, label: "Lojas" },
        { to: "/relatorios", icon: FileBarChart, label: "Relatórios" },
        { to: "/configuracoes", icon: Settings, label: "Configurações" },
      ]
    : [
        { to: "/", icon: LayoutDashboard, label: "Dashboard" },
        { to: "/pdv", icon: ShoppingCart, label: "PDV" },
        { to: "/painel", icon: Monitor, label: "Painel Pedidos" },
        { to: "/fidelidade", icon: Gift, label: "Fidelidade" },
        { to: "/relatorios", icon: FileBarChart, label: "Relatórios" },
        { to: "/produtos", icon: Package, label: "Produtos" },
        { to: "/estoque", icon: Archive, label: "Estoque" },
        { to: "/minha-loja", icon: StoreIcon, label: "Minha Loja" },
        { to: "/configuracoes", icon: Settings, label: "Configurações" },
      ];
  return (
    <nav className="bg-card border-r border-border h-screen w-64 fixed left-0 top-0 z-40">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
            <ShoppingCart className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-foreground">Frango Assado</h1>
            <p className="text-sm text-muted-foreground">Sistema de Gestão</p>
          </div>
        </div>

        <div className="space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-soft"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </div>

        <div className="absolute bottom-6 left-6 right-6">
          <button 
            onClick={signOut}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent w-full transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Sair
          </button>
        </div>
      </div>
    </nav>
  );
}