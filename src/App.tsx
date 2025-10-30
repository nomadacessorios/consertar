import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Navigation } from "@/components/ui/navigation";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Dashboard from "./pages/Dashboard";
import PDV from "./pages/PDV";
import OrderPanel from "./pages/OrderPanel";
import Loyalty from "./pages/Loyalty";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Products from "./pages/Products";
import Stores from "./pages/Stores";
import Stock from "./pages/Stock";
import MyStore from "./pages/MyStore";
import CustomerStore from "./pages/CustomerStore";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Totem from "./pages/Totem";
import Setup from "./pages/Setup";
import InitAdmin from "./pages/InitAdmin";
import AutoSetup from "./pages/AutoSetup";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

const AppRoutes = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }

  // A loja do cliente é apenas para paths que começam com '/loja' e não são '/lojas' (o painel de admin)
  const isCustomerStore = location.pathname.startsWith('/loja') && !location.pathname.startsWith('/lojas');
  // O totem é para paths que começam com '/totem'
  const isTotem = location.pathname.startsWith('/totem');
  // A página de setup não deve ter navegação lateral
  const isSetupPage = location.pathname.startsWith('/setup');
  const isInitAdmin = location.pathname.startsWith('/init-admin');
  const isAutoSetup = location.pathname.startsWith('/auto-setup');


  return (
    <div className="flex min-h-screen bg-background">
      {user && !isCustomerStore && !isTotem && !isSetupPage && !isInitAdmin && !isAutoSetup && <Navigation />}
      <main className={`flex-1 ${user && !isCustomerStore && !isTotem && !isSetupPage && !isInitAdmin && !isAutoSetup ? 'ml-64' : ''} p-6`}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/loja" element={<CustomerStore />} />
          <Route path="/loja/:slug" element={<CustomerStore />} />
          <Route path="/totem" element={<Totem />} /> {/* Nova rota para o totem */}
          <Route path="/totem/:slug" element={<Totem />} /> {/* Rota para totem com slug */}
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/pdv" element={<ProtectedRoute><PDV /></ProtectedRoute>} />
          <Route path="/painel" element={<ProtectedRoute><OrderPanel /></ProtectedRoute>} />
          <Route path="/fidelidade" element={<ProtectedRoute><Loyalty /></ProtectedRoute>} />
          <Route path="/relatorios" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
          <Route path="/produtos" element={<ProtectedRoute><Products /></ProtectedRoute>} />
          <Route path="/estoque" element={<ProtectedRoute><Stock /></ProtectedRoute>} />
          <Route path="/minha-loja" element={<ProtectedRoute><MyStore /></ProtectedRoute>} />
          <Route path="/lojas" element={<ProtectedRoute><Stores /></ProtectedRoute>} />
          <Route path="/configuracoes" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/setup" element={<Setup />} />
          <Route path="/init-admin" element={<InitAdmin />} />
          <Route path="/auto-setup" element={<AutoSetup />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;