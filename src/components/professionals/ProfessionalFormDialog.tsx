import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Stethoscope } from 'lucide-react';
import { toast } from 'sonner';

interface Professional {
  id?: string;
  name: string;
  specialty: string;
  cro: string;
  email: string;
  phone: string;
  is_active: boolean;
  hire_date: string;
}

interface ProfessionalFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  professional?: Professional | null;
  onSave: (professional: Professional) => void;
}

const SPECIALTIES = [
  'Clínico Geral',
  'Ortodontia',
  'Endodontia',
  'Periodontia',
  'Implantodontia',
  'Odontopediatria',
  'Cirurgia Bucomaxilofacial',
  'Prótese Dentária',
  'Dentística',
  'Radiologia Odontológica',
];

export function ProfessionalFormDialog({
  open,
  onOpenChange,
  professional,
  onSave,
}: ProfessionalFormDialogProps) {
  const [formData, setFormData] = useState<Professional>({
    name: '',
    specialty: '',
    cro: '',
    email: '',
    phone: '',
    is_active: true,
    hire_date: new Date().toISOString().split('T')[0],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      if (professional) {
        setFormData({
          id: professional.id,
          name: professional.name,
          specialty: professional.specialty,
          cro: professional.cro,
          email: professional.email || '',
          phone: professional.phone || '',
          is_active: professional.is_active,
          hire_date: professional.hire_date || new Date().toISOString().split('T')[0],
        });
      } else {
        setFormData({
          name: '',
          specialty: '',
          cro: '',
          email: '',
          phone: '',
          is_active: true,
          hire_date: new Date().toISOString().split('T')[0],
        });
      }
    }
  }, [open, professional]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.specialty || !formData.cro) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(formData);
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving professional:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary" />
            {professional ? 'Editar Profissional' : 'Novo Profissional'}
          </DialogTitle>
          <DialogDescription>
            {professional
              ? 'Atualize os dados do profissional'
              : 'Cadastre um novo profissional odontológico'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome Completo *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Dr. João Silva"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="specialty">Especialidade *</Label>
              <Select
                value={formData.specialty}
                onValueChange={(v) => setFormData({ ...formData, specialty: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {SPECIALTIES.map((spec) => (
                    <SelectItem key={spec} value={spec}>
                      {spec}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cro">CRO *</Label>
              <Input
                id="cro"
                value={formData.cro}
                onChange={(e) => setFormData({ ...formData, cro: e.target.value })}
                placeholder="SP-12345"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="profissional@clinica.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(11) 99999-9999"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hire_date">Data de Contratação</Label>
              <Input
                id="hire_date"
                type="date"
                value={formData.hire_date}
                onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="is_active">Profissional Ativo</Label>
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, is_active: checked })
              }
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : professional ? 'Salvar Alterações' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
