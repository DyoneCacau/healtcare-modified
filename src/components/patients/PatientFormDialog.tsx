import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Badge } from '@/components/ui/badge';
import { Patient } from '@/types/patient';
import { toast } from 'sonner';
import { useClinic } from '@/hooks/useClinic';

interface PatientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient?: Patient | null;
  onSave: (patient: Omit<Patient, 'id' | 'createdAt'> & { id?: string }) => void | Promise<void>;
}

const formatCPF = (value: string) => {
  const numbers = value.replace(/\D/g, '');
  return numbers
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .slice(0, 14);
};

const validateCPF = (cpf: string): boolean => {
  const numbers = cpf.replace(/\D/g, '');
  
  if (numbers.length !== 11) return false;
  
  // Check for known invalid patterns
  if (/^(\d)\1{10}$/.test(numbers)) return false;
  
  // Validate first check digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(numbers[i]) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(numbers[9])) return false;
  
  // Validate second check digit
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(numbers[i]) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(numbers[10])) return false;
  
  return true;
};

const formatPhone = (value: string) => {
  const numbers = value.replace(/\D/g, '');
  return numbers
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .slice(0, 15);
};

export const PatientFormDialog = ({
  open,
  onOpenChange,
  patient,
  onSave,
}: PatientFormDialogProps) => {
  const [formData, setFormData] = useState({
    name: '',
    cpf: '',
    phone: '',
    email: '',
    address: '',
    birthDate: '',
    clinicalNotes: '',
    status: 'active' as 'active' | 'inactive',
  });
  const [allergies, setAllergies] = useState<string[]>([]);
  const [newAllergy, setNewAllergy] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (patient) {
      setFormData({
        name: patient.name,
        cpf: patient.cpf,
        phone: patient.phone,
        email: patient.email,
        address: patient.address,
        birthDate: patient.birthDate,
        clinicalNotes: patient.clinicalNotes,
        status: patient.status,
      });
      setAllergies(patient.allergies);
    } else {
      setFormData({
        name: '',
        cpf: '',
        phone: '',
        email: '',
        address: '',
        birthDate: '',
        clinicalNotes: '',
        status: 'active',
      });
      setAllergies([]);
    }
  }, [patient, open]);

  const handleAddAllergy = () => {
    if (newAllergy.trim() && !allergies.includes(newAllergy.trim())) {
      setAllergies([...allergies, newAllergy.trim()]);
      setNewAllergy('');
    }
  };

  const handleRemoveAllergy = (allergy: string) => {
    setAllergies(allergies.filter((a) => a !== allergy));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    if (!formData.cpf.trim()) {
      toast.error('CPF é obrigatório');
      return;
    }
    if (!validateCPF(formData.cpf)) {
      toast.error('CPF inválido. Por favor, verifique o número informado.');
      return;
    }
    if (!formData.phone.trim()) {
      toast.error('Telefone é obrigatório');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        ...formData,
        allergies,
        ...(patient?.id && { id: patient.id }),
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving patient:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {patient ? 'Editar Paciente' : 'Novo Paciente'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="name">Nome Completo *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome completo do paciente"
              />
            </div>

            <div>
              <Label htmlFor="cpf">CPF *</Label>
              <Input
                id="cpf"
                value={formData.cpf}
                onChange={(e) => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
                placeholder="000.000.000-00"
                maxLength={14}
              />
            </div>

            <div>
              <Label htmlFor="phone">Telefone *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                placeholder="(00) 00000-0000"
                maxLength={15}
              />
            </div>

            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@exemplo.com"
              />
            </div>

            <div>
              <Label htmlFor="birthDate">Data de Nascimento</Label>
              <Input
                id="birthDate"
                type="date"
                value={formData.birthDate}
                onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="address">Endereço</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Rua, número, bairro, cidade - UF"
              />
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: 'active' | 'inactive') =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Alergias</Label>
            <div className="flex gap-2 mt-2">
              <Input
                value={newAllergy}
                onChange={(e) => setNewAllergy(e.target.value)}
                placeholder="Digite uma alergia"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddAllergy();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={handleAddAllergy}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {allergies.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {allergies.map((allergy) => (
                  <Badge
                    key={allergy}
                    variant="destructive"
                    className="flex items-center gap-1 cursor-pointer"
                    onClick={() => handleRemoveAllergy(allergy)}
                  >
                    {allergy}
                    <X className="h-3 w-3" />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="clinicalNotes">Observações Clínicas</Label>
            <Textarea
              id="clinicalNotes"
              value={formData.clinicalNotes}
              onChange={(e) => setFormData({ ...formData, clinicalNotes: e.target.value })}
              placeholder="Informações clínicas relevantes sobre o paciente..."
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : patient ? 'Salvar Alterações' : 'Cadastrar Paciente'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
