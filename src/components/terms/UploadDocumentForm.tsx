import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileUp, Upload } from 'lucide-react';
import { useClinicDocuments } from '@/hooks/useTerms';
import { useClinic } from '@/hooks/useClinic';
import { ClinicDocumentType } from '@/types/terms';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function UploadDocumentForm() {
  const { clinicId } = useClinic();
  const { uploadDocument } = useClinicDocuments();
  const [uploadName, setUploadName] = useState('');
  const [uploadType, setUploadType] = useState<ClinicDocumentType>('outro');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = () => {
    if (!selectedFile || !uploadName.trim()) return;
    uploadDocument.mutate(
      { file: selectedFile, name: uploadName.trim(), type: uploadType },
      {
        onSuccess: () => {
          setUploadName('');
          setUploadType('outro');
          setSelectedFile(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
        },
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileUp className="h-5 w-5" />
          Enviar Documento
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Envie PDF, Word ou imagens para usar como modelo da clínica. Máx. 10MB.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!clinicId && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-4 text-sm text-amber-800 dark:text-amber-200">
            Selecione uma clínica no menu superior para enviar documentos.
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Nome do documento</Label>
            <Input
              value={uploadName}
              onChange={(e) => setUploadName(e.target.value)}
              placeholder="Ex: Termo de responsabilidade"
            />
          </div>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={uploadType} onValueChange={(v) => setUploadType(v as ClinicDocumentType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="atestado">Atestado</SelectItem>
                <SelectItem value="declaracao">Declaração</SelectItem>
                <SelectItem value="termo_ciencia">Termo de Ciência</SelectItem>
                <SelectItem value="recibo">Recibo</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,image/*"
            className="hidden"
            onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={!clinicId}
          >
            <Upload className="mr-2 h-4 w-4" />
            Selecionar arquivo
          </Button>
          {selectedFile && (
            <span className="text-sm text-muted-foreground truncate max-w-[200px]" title={selectedFile.name}>
              {selectedFile.name}
            </span>
          )}
          <Button
            onClick={handleUpload}
            disabled={!clinicId || !uploadName.trim() || !selectedFile || uploadDocument.isPending}
            className={(!clinicId || !uploadName.trim() || !selectedFile || uploadDocument.isPending) ? '' : 'gradient-primary text-primary-foreground hover:opacity-90'}
          >
            {uploadDocument.isPending ? 'Enviando...' : 'Enviar'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
