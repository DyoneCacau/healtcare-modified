import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { TermsList } from '@/components/terms/TermsList';
import { TermEditor } from '@/components/terms/TermEditor';
import { TermPrintPreview } from '@/components/terms/TermPrintPreview';
import { ClinicBrandingEditor } from '@/components/terms/ClinicBrandingEditor';
import { Button } from '@/components/ui/button';
import { useTerms, useTermMutations, useClinicBranding } from '@/hooks/useTerms';
import { useClinic } from '@/hooks/useClinic';
import { usePatients } from '@/hooks/usePatients';
import { ConsentTerm, ClinicBranding } from '@/types/terms';
import { Patient } from '@/types/patient';
import { FileText, Plus, Building2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function Terms() {
  const { clinic, clinicId } = useClinic();
  const { terms, isLoading } = useTerms();
  const { createTerm, updateTerm, deleteTerm } = useTermMutations();
  const { branding, updateBranding } = useClinicBranding();
  const { patients } = usePatients();
  
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState<ConsentTerm | null>(null);
  const [printPreviewOpen, setPrintPreviewOpen] = useState(false);
  const [printingTerm, setPrintingTerm] = useState<ConsentTerm | null>(null);

  // Map database patient to Patient type
  const samplePatient: Patient | null = patients[0] ? {
    id: patients[0].id,
    name: patients[0].name,
    cpf: patients[0].cpf || '',
    phone: patients[0].phone || '',
    email: patients[0].email || '',
    address: patients[0].address || '',
    birthDate: patients[0].birth_date || '',
    clinicalNotes: patients[0].clinical_notes || '',
    allergies: patients[0].allergies || [],
    createdAt: patients[0].created_at,
    status: patients[0].status as 'active' | 'inactive',
  } : null;

  const handleNewTerm = () => {
    setEditingTerm(null);
    setEditorOpen(true);
  };

  const handleEditTerm = (term: ConsentTerm) => {
    setEditingTerm(term);
    setEditorOpen(true);
  };

  const handlePrintTerm = (term: ConsentTerm) => {
    setPrintingTerm(term);
    setPrintPreviewOpen(true);
  };

  const handleDeleteTerm = (termId: string) => {
    deleteTerm.mutate(termId);
  };

  const handleSaveTerm = (termData: Partial<ConsentTerm>) => {
    if (editingTerm) {
      updateTerm.mutate({ id: editingTerm.id, ...termData });
    } else {
      createTerm.mutate(termData as Omit<ConsentTerm, 'id' | 'createdAt' | 'updatedAt'>);
    }
  };

  const handleSaveBranding = (brandingData: ClinicBranding) => {
    updateBranding.mutate(brandingData);
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Skeleton className="h-64" />
            </div>
            <Skeleton className="h-64" />
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-7 w-7 text-primary" />
              Termos de Consentimento
            </h1>
            <p className="text-muted-foreground">Gerencie os termos e documentos da clínica</p>
          </div>
          <div className="flex items-center gap-3">
            {clinic && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building2 className="h-4 w-4" />
                {clinic.name}
              </div>
            )}
            <Button onClick={handleNewTerm}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Termo
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <TermsList terms={terms} onEdit={handleEditTerm} onPrint={handlePrintTerm} onDelete={handleDeleteTerm} />
          </div>
          <div>
            <ClinicBrandingEditor branding={branding} onSave={handleSaveBranding} />
          </div>
        </div>
      </div>

      <TermEditor 
        open={editorOpen} 
        onOpenChange={setEditorOpen} 
        term={editingTerm} 
        clinicId={clinicId || ''} 
        onSave={handleSaveTerm} 
      />
      
      {printingTerm && samplePatient && (
        <TermPrintPreview 
          open={printPreviewOpen} 
          onOpenChange={setPrintPreviewOpen} 
          term={printingTerm} 
          branding={branding} 
          patient={samplePatient} 
          clinicName={clinic?.name || ''} 
        />
      )}
    </MainLayout>
  );
}
