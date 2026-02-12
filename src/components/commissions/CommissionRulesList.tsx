import { useState } from 'react';
import { Edit2, Trash2, ToggleLeft, ToggleRight, AlertCircle, User, Users, Headphones } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  CommissionRule, 
  daysOfWeekLabels, 
  calculationTypeLabels,
  calculationUnitLabels,
  beneficiaryTypeLabels,
  BeneficiaryType,
} from '@/types/commission';
import { useProfessionals } from '@/hooks/useProfessionals';
import { cn } from '@/lib/utils';

interface CommissionRulesListProps {
  rules: CommissionRule[];
  onEdit: (rule: CommissionRule) => void;
  onDelete: (ruleId: string) => void;
  onToggleActive: (ruleId: string) => void;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const getBeneficiaryIcon = (type: BeneficiaryType) => {
  switch (type) {
    case 'professional':
      return <User className="h-3 w-3" />;
    case 'seller':
      return <Users className="h-3 w-3" />;
    case 'reception':
      return <Headphones className="h-3 w-3" />;
  }
};

const getBeneficiaryColor = (type: BeneficiaryType) => {
  switch (type) {
    case 'professional':
      return 'bg-info/10 text-info border-info/20';
    case 'seller':
      return 'bg-primary/10 text-primary border-primary/20';
    case 'reception':
      return 'bg-success/10 text-success border-success/20';
  }
};

export function CommissionRulesList({
  rules,
  onEdit,
  onDelete,
  onToggleActive,
}: CommissionRulesListProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<string | null>(null);
  const { professionals } = useProfessionals();

  const getProfessionalName = (id: string) => {
    if (id === 'all') return 'Todos';
    const prof = professionals.find((p) => p.id === id);
    return prof?.name || id;
  };

  const handleDeleteClick = (ruleId: string) => {
    setRuleToDelete(ruleId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (ruleToDelete) {
      onDelete(ruleToDelete);
    }
    setDeleteDialogOpen(false);
    setRuleToDelete(null);
  };

  const sortedRules = [...rules].sort((a, b) => b.priority - a.priority);

  const formatValue = (rule: CommissionRule) => {
    if (rule.calculationType === 'percentage') {
      return `${rule.value}%`;
    }
    const unitSuffix = rule.calculationUnit !== 'appointment' 
      ? `/${rule.calculationUnit}` 
      : '';
    return `${formatCurrency(rule.value)}${unitSuffix}`;
  };

  return (
    <>
      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Beneficiário</TableHead>
              <TableHead>Profissional</TableHead>
              <TableHead>Procedimento</TableHead>
              <TableHead>Dia</TableHead>
              <TableHead>Tipo/Unidade</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-center">Prioridade</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedRules.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                  <AlertCircle className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  Nenhuma regra de comissão cadastrada
                </TableCell>
              </TableRow>
            ) : (
              sortedRules.map((rule) => (
                <TableRow
                  key={rule.id}
                  className={cn(!rule.isActive && 'opacity-50 bg-muted/30')}
                >
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge 
                        variant="outline" 
                        className={cn('gap-1 w-fit', getBeneficiaryColor(rule.beneficiaryType))}
                      >
                        {getBeneficiaryIcon(rule.beneficiaryType)}
                        {beneficiaryTypeLabels[rule.beneficiaryType]}
                      </Badge>
                      {rule.beneficiaryName && (
                        <span className="text-xs text-muted-foreground">
                          {rule.beneficiaryName}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {getProfessionalName(rule.professionalId)}
                  </TableCell>
                  <TableCell>
                    {rule.procedure === 'all' ? (
                      <Badge variant="outline">Todos</Badge>
                    ) : (
                      <span className="text-sm">{rule.procedure}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {rule.dayOfWeek === 'all' ? (
                      <Badge variant="outline">Todos</Badge>
                    ) : (
                      daysOfWeekLabels[rule.dayOfWeek]
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge
                        variant={rule.calculationType === 'percentage' ? 'default' : 'secondary'}
                        className="w-fit"
                      >
                        {calculationTypeLabels[rule.calculationType]}
                      </Badge>
                      {rule.calculationUnit !== 'appointment' && (
                        <span className="text-xs text-muted-foreground">
                          {calculationUnitLabels[rule.calculationUnit]}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatValue(rule)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge variant="outline" className="font-mono">
                          {rule.priority}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        Prioridade automática baseada na especificidade
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell className="text-center">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onToggleActive(rule.id)}
                          className={cn(
                            'h-8 w-8',
                            rule.isActive
                              ? 'text-success hover:text-success/80'
                              : 'text-muted-foreground hover:text-foreground'
                          )}
                        >
                          {rule.isActive ? (
                            <ToggleRight className="h-5 w-5" />
                          ) : (
                            <ToggleLeft className="h-5 w-5" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {rule.isActive ? 'Desativar regra' : 'Ativar regra'}
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => onEdit(rule)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Editar</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteClick(rule.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Excluir</TooltipContent>
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Regra de Comissão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta regra? Esta ação não pode ser desfeita.
              As comissões já calculadas não serão afetadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
