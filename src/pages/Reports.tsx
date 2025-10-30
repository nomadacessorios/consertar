import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileBarChart, 
  Download, 
  TrendingUp,
  Calendar,
  DollarSign,
  Package,
  Clock,
  Users
} from "lucide-react";

export default function Reports() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Relatórios</h1>
          <p className="text-muted-foreground">Análise detalhada de vendas e desempenho</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            Período Customizado
          </Button>
          <Button className="shadow-soft">
            <Download className="h-4 w-4 mr-2" />
            Exportar Excel
          </Button>
        </div>
      </div>

      {/* Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendas Hoje</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">R$ 0,00</div>
            <p className="text-xs text-muted-foreground">Nenhuma venda hoje</p>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Nenhum pedido hoje</p>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">Sem dados</p>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Únicos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Nenhum cliente hoje</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vendas por Período */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Vendas por Período</CardTitle>
            <CardDescription>
              Comparativo de vendas, pedidos e tempo médio
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground py-8">
              Nenhum dado de vendas disponível
            </p>
          </CardContent>
        </Card>

        {/* Produtos Mais Vendidos */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Produtos Mais Vendidos</CardTitle>
            <CardDescription>
              Ranking de produtos por quantidade e receita
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground py-8">
              Nenhum produto vendido ainda
            </p>
          </CardContent>
        </Card>

        {/* Horários de Pico */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Horários de Pico</CardTitle>
            <CardDescription>
              Períodos com maior volume de pedidos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground py-8">
              Nenhum dado de horários disponível
            </p>
          </CardContent>
        </Card>

        {/* Estoque */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Movimentação de Estoque</CardTitle>
            <CardDescription>
              Histórico de entrada e saída de produtos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground py-8">
              Nenhum dado de estoque disponível
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}