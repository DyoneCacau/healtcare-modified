import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { ClinicDocument, ClinicDocumentType } from '@/types/terms';
import { Printer, Pencil, Trash2, FileText, ExternalLink } from 'lucide-react';

const typeLabels: Record<ClinicDocumentType, string> = {
  atestado: 'Atestado',
  declaracao: 'Declaração',
  termo_ciencia: 'Termo de Ciência',
  recibo: 'Recibo',
  outro: 'Outro',
};

function getFileType(fileUrl: string | null | undefined): 'pdf' | 'image' | 'word' | 'other' {
  if (!fileUrl) return 'other';
  const url = fileUrl.toLowerCase();
  if (url.includes('.pdf')) return 'pdf';
  if (url.includes('.jpg') || url.includes('.jpeg') || url.includes('.png') || url.includes('.webp') || url.includes('.gif') || url.includes('.svg')) return 'image';
  if (url.includes('.doc')) return 'word';
  return 'other';
}

interface UploadedDocumentsCardsProps {
  documents: ClinicDocument[];
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  isRenaming?: boolean;
  isDeleting?: boolean;
}

export function UploadedDocumentsCards({
  documents,
  onRename,
  onDelete,
  isRenaming,
  isDeleting,
}: UploadedDocumentsCardsProps) {
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<ClinicDocument | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const openRename = (doc: ClinicDocument) => {
    setSelectedDoc(doc);
    setRenameValue(doc.name);
    setRenameDialogOpen(true);
  };

  const openDelete = (doc: ClinicDocument) => {
    setSelectedDoc(doc);
    setDeleteDialogOpen(true);
  };

  const handleRenameConfirm = () => {
    if (selectedDoc && renameValue.trim()) {
      onRename(selectedDoc.id, renameValue.trim());
      setRenameDialogOpen(false);
      setSelectedDoc(null);
    }
  };

  const handleDeleteConfirm = () => {
    if (selectedDoc) {
      onDelete(selectedDoc.id);
      setDeleteDialogOpen(false);
      setSelectedDoc(null);
    }
  };

  const handlePrint = (doc: ClinicDocument) => {
    if (!doc.fileUrl) return;
    const win = window.open(doc.fileUrl, '_blank', 'width=800,height=600');
    if (win) {
      win.onload = () => win.print();
    }
  };

  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Nenhum modelo enviado</h3>
          <p className="text-muted-foreground">
            Envie documentos na aba &quot;Modelos e Documentos&quot; para visualizá-los aqui.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {documents.map((doc) => {
          const fileType = getFileType(doc.fileUrl);
          return (
            <Card key={doc.id} className="overflow-hidden hover:shadow-md transition-shadow flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-muted-foreground">{typeLabels[doc.type]}</span>
                    <h3 className="font-semibold truncate mt-0.5" title={doc.name}>
                      {doc.name}
                    </h3>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-3">
                {/* Preview */}
                <div className="rounded-lg border bg-muted/30 overflow-hidden min-h-[180px] flex items-center justify-center">
                  {doc.fileUrl ? (
                    fileType === 'pdf' ? (
                      <iframe
                        src={`${doc.fileUrl}#toolbar=0`}
                        title={doc.name}
                        className="w-full h-[180px] border-0"
                      />
                    ) : fileType === 'image' ? (
                      <img
                        src={doc.fileUrl}
                        alt={doc.name}
                        className="max-w-full max-h-[180px] object-contain"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 p-4 text-center">
                        <FileText className="h-12 w-12 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Documento não visualizável</p>
                        <p className="text-xs text-muted-foreground">Clique em Abrir para visualizar</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(doc.fileUrl!, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Abrir
                        </Button>
                      </div>
                    )
                  ) : (
                    <div className="flex flex-col items-center gap-2 p-4 text-muted-foreground">
                      <FileText className="h-12 w-12" />
                      <p className="text-sm">Sem preview</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handlePrint(doc)}
                    disabled={!doc.fileUrl}
                  >
                    <Printer className="h-4 w-4 mr-1" />
                    Imprimir
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openRename(doc)}
                    disabled={!!isRenaming}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openDelete(doc)}
                    disabled={!!isDeleting}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear documento</DialogTitle>
            <DialogDescription>Altere o nome do documento</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                placeholder="Nome do documento"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleRenameConfirm}
              disabled={!renameValue.trim() || isRenaming}
            >
              {isRenaming ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir documento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir &quot;{selectedDoc?.name}&quot;? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
