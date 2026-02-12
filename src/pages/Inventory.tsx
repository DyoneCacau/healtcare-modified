import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Package,
  Search,
  Plus,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  Edit,
  ArrowDownToLine,
  ArrowUpFromLine,
} from 'lucide-react';
import { useInventoryProducts, useInventoryMovements, useInventoryMutations } from '@/hooks/useInventory';
import { inventoryCategoryLabels, movementTypeLabels } from '@/types/inventory';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { FeatureButton } from '@/components/subscription/FeatureButton';
import { Skeleton } from '@/components/ui/skeleton';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export default function Inventory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [movementDialogOpen, setMovementDialogOpen] = useState(false);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [movementType, setMovementType] = useState<'entrada' | 'saida'>('entrada');
  const [movementQuantity, setMovementQuantity] = useState('');
  const [movementReason, setMovementReason] = useState('');
  const [movementNotes, setMovementNotes] = useState('');
  
  // Product form fields
  const [productName, setProductName] = useState('');
  const [productSku, setProductSku] = useState('');
  const [productCategory, setProductCategory] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productCostPrice, setProductCostPrice] = useState('');
  const [productSalePrice, setProductSalePrice] = useState('');
  const [productCurrentStock, setProductCurrentStock] = useState('');
  const [productMinimumStock, setProductMinimumStock] = useState('');
  const [productUnit, setProductUnit] = useState('un');

  const { products, isLoading: isLoadingProducts } = useInventoryProducts();
  const { movements, isLoading: isLoadingMovements } = useInventoryMovements();
  const { createMovement, createProduct } = useInventoryMutations();


  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.sku || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
      const matchesStock = stockFilter === 'all' || 
        (stockFilter === 'low' && product.current_stock <= (product.minimum_stock || 0)) ||
        (stockFilter === 'ok' && product.current_stock > (product.minimum_stock || 0));
      return matchesSearch && matchesCategory && matchesStock && product.is_active;
    });
  }, [products, searchTerm, categoryFilter, stockFilter]);

  const stats = useMemo(() => {
    const activeProducts = products.filter(p => p.is_active);
    const totalProducts = activeProducts.length;
    const lowStock = activeProducts.filter(p => p.current_stock <= (p.minimum_stock || 0)).length;
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayMovements = movements.filter(m => m.created_at.startsWith(today)).length;
    return { totalProducts, lowStock, todayMovements };
  }, [products, movements]);

  const handleMovement = (product: any, type: 'entrada' | 'saida') => {
    setSelectedProduct(product);
    setMovementType(type);
    setMovementQuantity('');
    setMovementReason('');
    setMovementNotes('');
    setMovementDialogOpen(true);
  };

  const handleConfirmMovement = async () => {
    if (!selectedProduct || !movementQuantity || !movementReason) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const qty = parseInt(movementQuantity);
    if (isNaN(qty) || qty <= 0) {
      toast.error('Quantidade inválida');
      return;
    }

    if (movementType === 'saida' && qty > selectedProduct.current_stock) {
      toast.error('Quantidade maior que o estoque disponível');
      return;
    }

    const previousStock = selectedProduct.current_stock;
    const newStock = movementType === 'entrada' 
      ? previousStock + qty 
      : previousStock - qty;

    await createMovement.mutateAsync({
      product_id: selectedProduct.id,
      type: movementType,
      quantity: qty,
      previous_stock: previousStock,
      new_stock: newStock,
      reason: movementReason,
      notes: movementNotes || undefined,
    });

    setMovementDialogOpen(false);
  };

  const handleOpenProductDialog = () => {
    setProductName('');
    setProductSku('');
    setProductCategory('');
    setProductDescription('');
    setProductCostPrice('');
    setProductSalePrice('');
    setProductCurrentStock('0');
    setProductMinimumStock('0');
    setProductUnit('un');
    setProductDialogOpen(true);
  };

  const handleSaveProduct = async () => {
    if (!productName.trim()) {
      toast.error('Nome do produto é obrigatório');
      return;
    }

    try {
      await createProduct.mutateAsync({
        name: productName,
        sku: productSku || null,
        description: productDescription || null,
        category: productCategory || null,
        current_stock: parseInt(productCurrentStock) || 0,
        minimum_stock: parseInt(productMinimumStock) || 0,
        cost_price: parseFloat(productCostPrice) || 0,
        sale_price: parseFloat(productSalePrice) || 0,
        unit: productUnit || 'un',
        is_active: true,
      });
      setProductDialogOpen(false);
    } catch (error) {
      console.error('Error creating product:', error);
    }
  };

  if (isLoadingProducts || isLoadingMovements) {
    return (
      <MainLayout>
        <div className="space-y-6 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Package className="h-7 w-7 text-primary" />
                Controle de Estoque
              </h1>
              <p className="text-muted-foreground">Carregando...</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Package className="h-7 w-7 text-primary" />
              Controle de Estoque
            </h1>
            <p className="text-muted-foreground">Gerencie os produtos e movimentações</p>
          </div>
          <FeatureButton feature="estoque" onClick={handleOpenProductDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Produto
          </FeatureButton>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                  <Package className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total de Produtos</p>
                  <p className="text-2xl font-bold">{stats.totalProducts}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Estoque Baixo</p>
                  <p className="text-2xl font-bold text-red-600">{stats.lowStock}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                  <ArrowUpDown className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Movimentações Hoje</p>
                  <p className="text-2xl font-bold">{stats.todayMovements}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou SKU..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Categorias</SelectItem>
                  {Object.entries(inventoryCategoryLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={stockFilter} onValueChange={setStockFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Status Estoque" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="low">Estoque Baixo</SelectItem>
                  <SelectItem value="ok">Estoque OK</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Products Table */}
        <Card>
          <CardHeader>
            <CardTitle>Produtos ({filteredProducts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredProducts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Nenhum produto encontrado
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-center">Estoque Atual</TableHead>
                    <TableHead className="text-center">Mínimo</TableHead>
                    <TableHead className="text-right">Custo Unit.</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => {
                    const isLowStock = product.current_stock <= (product.minimum_stock || 0);
                    return (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{product.name}</p>
                            {product.description && (
                              <p className="text-xs text-muted-foreground">{product.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{product.sku || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {inventoryCategoryLabels[product.category as keyof typeof inventoryCategoryLabels] || product.category || 'Outros'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={isLowStock ? 'destructive' : 'secondary'}>
                            {product.current_stock} {product.unit || 'un'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          {product.minimum_stock || 0}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(product.cost_price || 0)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(product.current_stock * (product.cost_price || 0))}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <FeatureButton
                              feature="estoque"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-emerald-600"
                              onClick={() => handleMovement(product, 'entrada')}
                              title="Entrada"
                            >
                              <ArrowDownToLine className="h-4 w-4" />
                            </FeatureButton>
                            <FeatureButton
                              feature="estoque"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600"
                              onClick={() => handleMovement(product, 'saida')}
                              title="Saída"
                            >
                              <ArrowUpFromLine className="h-4 w-4" />
                            </FeatureButton>
                            <FeatureButton feature="estoque" variant="ghost" size="icon" className="h-8 w-8">
                              <Edit className="h-4 w-4" />
                            </FeatureButton>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Recent Movements */}
        <Card>
          <CardHeader>
            <CardTitle>Movimentações Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {movements.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Nenhuma movimentação registrada
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-center">Quantidade</TableHead>
                    <TableHead>Estoque Anterior → Novo</TableHead>
                    <TableHead>Motivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.slice(0, 10).map((movement: any) => (
                    <TableRow key={movement.id}>
                      <TableCell className="text-sm">
                        {format(new Date(movement.created_at), 'dd/MM/yyyy HH:mm')}
                      </TableCell>
                      <TableCell className="font-medium">{movement.product?.name || 'Produto'}</TableCell>
                      <TableCell>
                        <Badge variant={movement.type === 'entrada' ? 'default' : 'destructive'}>
                          {movement.type === 'entrada' ? (
                            <TrendingUp className="mr-1 h-3 w-3" />
                          ) : (
                            <TrendingDown className="mr-1 h-3 w-3" />
                          )}
                          {movementTypeLabels[movement.type as keyof typeof movementTypeLabels] || movement.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {movement.type === 'entrada' ? '+' : '-'}{movement.quantity}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {movement.previous_stock} → {movement.new_stock}
                      </TableCell>
                      <TableCell>{movement.reason || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Movement Dialog */}
      <Dialog open={movementDialogOpen} onOpenChange={setMovementDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {movementType === 'entrada' ? (
                <ArrowDownToLine className="h-5 w-5 text-emerald-600" />
              ) : (
                <ArrowUpFromLine className="h-5 w-5 text-red-600" />
              )}
              {movementType === 'entrada' ? 'Entrada de Estoque' : 'Saída de Estoque'}
            </DialogTitle>
            <DialogDescription>
              {selectedProduct?.name} - Estoque atual: {selectedProduct?.current_stock} {selectedProduct?.unit || 'un'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="quantity">Quantidade *</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                max={movementType === 'saida' ? selectedProduct?.current_stock : undefined}
                value={movementQuantity}
                onChange={(e) => setMovementQuantity(e.target.value)}
                placeholder="0"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="reason">Motivo *</Label>
              <Select value={movementReason} onValueChange={setMovementReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o motivo" />
                </SelectTrigger>
                <SelectContent>
                  {movementType === 'entrada' ? (
                    <>
                      <SelectItem value="compra">Compra</SelectItem>
                      <SelectItem value="devolucao">Devolução</SelectItem>
                      <SelectItem value="ajuste">Ajuste de Inventário</SelectItem>
                      <SelectItem value="transferencia">Transferência</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="uso">Uso em Procedimento</SelectItem>
                      <SelectItem value="venda">Venda</SelectItem>
                      <SelectItem value="perda">Perda/Vencimento</SelectItem>
                      <SelectItem value="ajuste">Ajuste de Inventário</SelectItem>
                      <SelectItem value="transferencia">Transferência</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={movementNotes}
                onChange={(e) => setMovementNotes(e.target.value)}
                placeholder="Observações adicionais..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMovementDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmMovement}
              className={movementType === 'entrada' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
              variant={movementType === 'saida' ? 'destructive' : 'default'}
              disabled={createMovement.isPending}
            >
              {createMovement.isPending ? 'Registrando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Dialog */}
      <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Produto</DialogTitle>
            <DialogDescription>Cadastre um novo produto no estoque</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="productName">Nome *</Label>
              <Input id="productName" value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Nome do produto" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="productSku">SKU</Label>
                <Input id="productSku" value={productSku} onChange={(e) => setProductSku(e.target.value)} placeholder="Código" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="productCategory">Categoria</Label>
                <Select value={productCategory} onValueChange={setProductCategory}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(inventoryCategoryLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="productDescription">Descrição</Label>
              <Textarea 
                id="productDescription" 
                value={productDescription} 
                onChange={(e) => setProductDescription(e.target.value)} 
                placeholder="Descrição do produto" 
                rows={2}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Estoque Inicial</Label>
                <Input type="number" value={productCurrentStock} onChange={(e) => setProductCurrentStock(e.target.value)} placeholder="0" />
              </div>
              <div className="grid gap-2">
                <Label>Estoque Mínimo</Label>
                <Input type="number" value={productMinimumStock} onChange={(e) => setProductMinimumStock(e.target.value)} placeholder="0" />
              </div>
              <div className="grid gap-2">
                <Label>Unidade</Label>
                <Input value={productUnit} onChange={(e) => setProductUnit(e.target.value)} placeholder="un" />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setProductDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveProduct} disabled={createProduct.isPending}>
              {createProduct.isPending ? 'Salvando...' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
