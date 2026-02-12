import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ConsentTerm, ClinicBranding } from '@/types/terms';
import { Patient } from '@/types/patient';
import { Printer, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TermPrintPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  term: ConsentTerm;
  branding: ClinicBranding;
  patient: Patient;
  clinicName: string;
}

export function TermPrintPreview({
  open,
  onOpenChange,
  term,
  branding,
  patient,
  clinicName,
}: TermPrintPreviewProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${term.title}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Times New Roman', serif;
              font-size: 12pt;
              line-height: 1.6;
              padding: 2cm;
              max-width: 21cm;
              margin: 0 auto;
            }
            .header {
              text-align: center;
              margin-bottom: 2cm;
              padding-bottom: 1cm;
              border-bottom: 2px solid ${branding.primaryColor || '#000'};
            }
            .logo {
              max-width: 150px;
              max-height: 80px;
              margin-bottom: 0.5cm;
            }
            .clinic-name {
              font-size: 16pt;
              font-weight: bold;
              color: ${branding.primaryColor || '#000'};
              margin-bottom: 0.3cm;
            }
            .header-text {
              font-size: 10pt;
              color: #666;
            }
            .title {
              text-align: center;
              font-size: 14pt;
              font-weight: bold;
              margin-bottom: 1cm;
              text-transform: uppercase;
            }
            .patient-info {
              background: #f5f5f5;
              padding: 0.5cm;
              margin-bottom: 1cm;
              border-radius: 4px;
            }
            .patient-info p {
              margin: 0.2cm 0;
            }
            .content {
              text-align: justify;
              margin-bottom: 2cm;
              white-space: pre-wrap;
            }
            .signatures {
              margin-top: 3cm;
              display: flex;
              justify-content: space-between;
            }
            .signature-box {
              text-align: center;
              width: 45%;
            }
            .signature-line {
              border-top: 1px solid #000;
              margin-top: 2cm;
              padding-top: 0.3cm;
            }
            .footer {
              position: fixed;
              bottom: 1cm;
              left: 2cm;
              right: 2cm;
              text-align: center;
              font-size: 9pt;
              color: #666;
              border-top: 1px solid #ddd;
              padding-top: 0.3cm;
            }
            .date {
              text-align: right;
              margin-bottom: 1cm;
              font-style: italic;
            }
            @media print {
              body {
                padding: 0;
              }
              .footer {
                position: fixed;
                bottom: 0;
              }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const currentDate = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pré-visualização do Termo</DialogTitle>
        </DialogHeader>

        <div 
          ref={printRef}
          className="bg-white p-8 border rounded-lg shadow-inner min-h-[600px]"
          style={{ fontFamily: "'Times New Roman', serif" }}
        >
          {/* Header */}
          <div className="text-center mb-8 pb-4 border-b-2" style={{ borderColor: branding.primaryColor || '#000' }}>
            {branding.logo && (
              <img 
                src={branding.logo} 
                alt="Logo" 
                className="mx-auto mb-2 max-w-[150px] max-h-[80px] object-contain"
              />
            )}
            <h1 
              className="text-xl font-bold mb-1"
              style={{ color: branding.primaryColor || '#000' }}
            >
              {clinicName}
            </h1>
            {branding.headerText && (
              <p className="text-sm text-muted-foreground">{branding.headerText}</p>
            )}
          </div>

          {/* Date */}
          <p className="text-right italic mb-4">
            São Paulo, {currentDate}
          </p>

          {/* Title */}
          <h2 className="text-center text-lg font-bold mb-6 uppercase">
            {term.title}
          </h2>

          {/* Patient Info */}
          <div className="bg-muted/30 p-4 rounded mb-6">
            <p><strong>Paciente:</strong> {patient.name}</p>
            <p><strong>CPF:</strong> {patient.cpf}</p>
            <p><strong>Data de Nascimento:</strong> {patient.birthDate}</p>
            <p><strong>Telefone:</strong> {patient.phone}</p>
          </div>

          {/* Content */}
          <div className="text-justify whitespace-pre-wrap mb-12 leading-relaxed">
            {term.content}
          </div>

          {/* Signatures */}
          <div className="flex justify-between mt-16">
            <div className="text-center w-[45%]">
              <div className="border-t border-foreground mt-16 pt-2">
                <p className="font-medium">{patient.name}</p>
                <p className="text-sm text-muted-foreground">Paciente / Responsável</p>
              </div>
            </div>
            <div className="text-center w-[45%]">
              <div className="border-t border-foreground mt-16 pt-2">
                <p className="font-medium">_______________________</p>
                <p className="text-sm text-muted-foreground">Recepcionista / Testemunha</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          {branding.footerText && (
            <div className="mt-12 pt-4 border-t text-center text-xs text-muted-foreground">
              {branding.footerText}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="mr-2 h-4 w-4" />
            Fechar
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
