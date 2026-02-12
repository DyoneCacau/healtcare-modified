import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PendingCorrection {
  id: string;
  user_id: string;
  user_name: string;
  entry_type: string;
  timestamp: string;
  correction_reason: string;
  created_at: string;
}

interface PendingCorrectionsProps {
  corrections: PendingCorrection[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

const ENTRY_TYPE_LABELS: Record<string, string> = {
  clock_in: 'Entrada',
  clock_out: 'Saída',
  lunch_start: 'Início Intervalo',
  lunch_end: 'Fim Intervalo',
};

export function PendingCorrections({
  corrections,
  onApprove,
  onReject,
}: PendingCorrectionsProps) {
  if (corrections.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Correções Pendentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <CheckCircle className="mr-2 h-5 w-5 text-emerald-500" />
            Nenhuma correção pendente de aprovação
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-amber-500" />
          Correções Pendentes
          <Badge variant="secondary" className="ml-2">
            {corrections.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Funcionário</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Data/Hora</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead>Solicitado em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {corrections.map((correction) => (
              <TableRow key={correction.id}>
                <TableCell className="font-medium">
                  {correction.user_name}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {ENTRY_TYPE_LABELS[correction.entry_type] || correction.entry_type}
                  </Badge>
                </TableCell>
                <TableCell>
                  {format(new Date(correction.timestamp), "dd/MM/yyyy 'às' HH:mm", {
                    locale: ptBR,
                  })}
                </TableCell>
                <TableCell className="max-w-[200px] truncate">
                  {correction.correction_reason}
                </TableCell>
                <TableCell>
                  {format(new Date(correction.created_at), 'dd/MM/yyyy', {
                    locale: ptBR,
                  })}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => onApprove(correction.id)}
                    >
                      <CheckCircle className="mr-1 h-4 w-4" />
                      Aprovar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => onReject(correction.id)}
                    >
                      <XCircle className="mr-1 h-4 w-4" />
                      Rejeitar
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
