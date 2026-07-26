import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ClinicBranding } from '@/types/terms';
import { Save, Upload, Image } from 'lucide-react';
import { toast } from 'sonner';
import type { UseMutationResult } from '@tanstack/react-query';

interface ClinicBrandingEditorProps {
  branding: ClinicBranding;
  onSave: (branding: ClinicBranding) => void;
  onUploadLogo?: UseMutationResult<string, Error, File, unknown>;
}

export function ClinicBrandingEditor({ branding, onSave, onUploadLogo }: ClinicBrandingEditorProps) {
  const [logo, setLogo] = useState(branding.logo || '');
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLogo(branding.logo || '');
  }, [branding.logo]);

  // Edição de cor desativada por pedido do cliente (fica sempre no padrão
  // preto). Se reativar, volte os campos de "Cor Principal" removidos abaixo.
  const handleSave = () => {
    onSave({
      ...branding,
      logo: logo.trim() || undefined,
      primaryColor: null,
    });
    toast.success('Identidade visual atualizada com sucesso!');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image className="h-5 w-5" />
          Identidade Visual
        </CardTitle>
        <CardDescription>
          Personalize a aparência dos termos impressos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="logo">Logo da Clinica</Label>
          <div className="flex gap-2 flex-wrap">
            <Input
              id="logo"
              value={logo}
              onChange={(e) => setLogo(e.target.value)}
              placeholder="URL ou envie uma imagem (PNG, JPG, GIF, WEBP, SVG)"
            />
            {onUploadLogo && (
              <>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept=".png,.jpg,.jpeg,.gif,.webp,.svg,image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      onUploadLogo.mutate(file, {
                        onSuccess: (url) => setLogo(url),
                      });
                      e.target.value = '';
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={onUploadLogo.isPending}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {onUploadLogo.isPending ? 'Enviando...' : 'Enviar imagem'}
                </Button>
              </>
            )}
            {logo && (
              <div className="flex-shrink-0 w-12 h-12 border rounded flex items-center justify-center overflow-hidden">
                <img src={logo} alt="Preview" className="max-w-full max-h-full object-contain" />
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Envie uma imagem (PNG, JPG, GIF, WEBP ou SVG) ou cole a URL
          </p>
        </div>

        <Button onClick={handleSave} className="w-full">
          <Save className="mr-2 h-4 w-4" />
          Salvar Identidade Visual
        </Button>
      </CardContent>
    </Card>
  );
}
