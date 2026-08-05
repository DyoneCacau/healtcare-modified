import { Phone, Mail, MapPin, Calendar, AlertCircle, MessageSquare } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Patient } from '@/types/patient';
import {
  formatOptionalAge,
  formatOptionalDate,
  formatOptionalText,
} from '@/lib/optionalDate';

interface PatientCardProps {
  patient: Patient;
  onView: (patient: Patient) => void;
  onEdit: (patient: Patient) => void;
  onWhatsApp: (patient: Patient) => void;
}

export const PatientCard = ({ patient, onView, onEdit, onWhatsApp }: PatientCardProps) => {
  const ageLabel = formatOptionalAge(patient.birthDate);
  const cpfLabel = formatOptionalText(patient.cpf);
  const subtitle =
    ageLabel === 'Não informado'
      ? `Idade não informada • CPF: ${cpfLabel}`
      : `${ageLabel} • CPF: ${cpfLabel}`;

  return (
    <Card className="shadow-card hover:shadow-card-hover transition-all duration-200 cursor-pointer group">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-lg font-semibold text-primary">
                {patient.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                {patient.name}
              </h3>
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            </div>
          </div>
          <Badge
            variant={patient.status === 'active' ? 'default' : 'secondary'}
            className={patient.status === 'active' ? 'bg-success hover:bg-success/90' : ''}
          >
            {patient.status === 'active' ? 'Ativo' : 'Inativo'}
          </Badge>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="h-4 w-4" />
            <span>{formatOptionalText(patient.phone)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-4 w-4" />
            <span>{formatOptionalText(patient.email)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span className="truncate">{formatOptionalText(patient.address)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              Cadastrado em {formatOptionalDate(patient.createdAt, "dd 'de' MMM 'de' yyyy")}
            </span>
          </div>
        </div>

        {Array.isArray(patient.allergies) && patient.allergies.length > 0 && (
          <div className="flex items-center gap-2 mb-4 p-2 bg-destructive/10 rounded-lg">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="text-sm text-destructive font-medium">
              Alergias: {patient.allergies.join(', ')}
            </span>
          </div>
        )}

        <div className="flex gap-2 pt-3 border-t">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onView(patient)}
          >
            Ver Detalhes
          </Button>
          <Button size="sm" className="flex-1" onClick={() => onEdit(patient)}>
            Editar
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="bg-success/10 border-success/30 hover:bg-success/20 text-success"
                onClick={() => onWhatsApp(patient)}
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Confirmar consulta via WhatsApp</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </CardContent>
    </Card>
  );
};
