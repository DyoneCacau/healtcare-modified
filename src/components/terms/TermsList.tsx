import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConsentTerm } from '@/types/terms';
import { Edit, Printer, Trash2, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TermsListProps {
  terms: ConsentTerm[];
  onEdit: (term: ConsentTerm) => void;
  onPrint: (term: ConsentTerm) => void;
  onDelete: (termId: string) => void;
}

const typeLabels: Record<ConsentTerm['type'], string> = {
  consent: 'Consentimento',
  awareness: 'Ciência',
  authorization: 'Autorização',
  treatment: 'Tratamento',
};

const typeColors: Record<ConsentTerm['type'], string> = {
  consent: 'bg-blue-100 text-blue-800',
  awareness: 'bg-amber-100 text-amber-800',
  authorization: 'bg-purple-100 text-purple-800',
  treatment: 'bg-emerald-100 text-emerald-800',
};

export function TermsList({ terms, onEdit, onPrint, onDelete }: TermsListProps) {
  if (terms.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Nenhum termo cadastrado</h3>
          <p className="text-muted-foreground">
            Crie seu primeiro termo de consentimento clicando no botão acima.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {terms.map((term) => (
        <Card key={term.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <Badge className={typeColors[term.type]}>
                  {typeLabels[term.type]}
                </Badge>
                <CardTitle className="text-base mt-2 line-clamp-2">
                  {term.title}
                </CardTitle>
              </div>
              {term.isActive ? (
                <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
              {term.content.substring(0, 150)}...
            </p>
            
            <div className="text-xs text-muted-foreground mb-4">
              <p>Atualizado em: {format(parseISO(term.updatedAt), "dd/MM/yyyy", { locale: ptBR })}</p>
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={() => onPrint(term)}
              >
                <Printer className="h-4 w-4 mr-1" />
                Imprimir
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onEdit(term)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onDelete(term.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
