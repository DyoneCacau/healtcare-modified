import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ConsentTerm } from '@/types/terms';
import { Save, X } from 'lucide-react';

interface TermEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  term?: ConsentTerm | null;
  clinicId: string;
  onSave: (term: Partial<ConsentTerm>) => void;
}

const termTypes = [
  { value: 'consent', label: 'Consentimento' },
  { value: 'awareness', label: 'Ciência' },
  { value: 'authorization', label: 'Autorização' },
  { value: 'treatment', label: 'Tratamento' },
];

export function TermEditor({ open, onOpenChange, term, clinicId, onSave }: TermEditorProps) {
  const [title, setTitle] = useState(term?.title || '');
  const [type, setType] = useState<ConsentTerm['type']>(term?.type || 'consent');
  const [content, setContent] = useState(term?.content || '');

  const handleSave = () => {
    if (!title.trim() || !content.trim()) return;

    onSave({
      id: term?.id || `term-${Date.now()}`,
      clinicId,
      title: title.trim(),
      type,
      content: content.trim(),
      isActive: true,
      createdAt: term?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {term ? 'Editar Termo' : 'Novo Termo'}
          </DialogTitle>
          <DialogDescription>
            {term ? 'Edite o termo de consentimento' : 'Crie um novo termo de consentimento para sua clínica'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">Título do Termo</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Termo de Consentimento para Tratamento"
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo de Termo</Label>
              <Select value={type} onValueChange={(v) => setType(v as ConsentTerm['type'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {termTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Conteúdo do Termo</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Digite o conteúdo completo do termo..."
              className="min-h-[300px] font-mono text-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="mr-2 h-4 w-4" />
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!title.trim() || !content.trim()}>
            <Save className="mr-2 h-4 w-4" />
            Salvar Termo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
