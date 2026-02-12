import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ClinicBranding } from '@/types/terms';
import { Save, Upload, Image } from 'lucide-react';
import { toast } from 'sonner';

interface ClinicBrandingEditorProps {
  branding: ClinicBranding;
  onSave: (branding: ClinicBranding) => void;
}

export function ClinicBrandingEditor({ branding, onSave }: ClinicBrandingEditorProps) {
  const [logo, setLogo] = useState(branding.logo || '');
  const [headerText, setHeaderText] = useState(branding.headerText || '');
  const [footerText, setFooterText] = useState(branding.footerText || '');
  const [primaryColor, setPrimaryColor] = useState(branding.primaryColor || '#0ea5e9');

  const handleSave = () => {
    onSave({
      ...branding,
      logo: logo.trim() || undefined,
      headerText: headerText.trim() || undefined,
      footerText: footerText.trim() || undefined,
      primaryColor,
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
          <Label htmlFor="logo">URL do Logo</Label>
          <div className="flex gap-2">
            <Input
              id="logo"
              value={logo}
              onChange={(e) => setLogo(e.target.value)}
              placeholder="https://exemplo.com/logo.png"
            />
            {logo && (
              <div className="flex-shrink-0 w-12 h-12 border rounded flex items-center justify-center overflow-hidden">
                <img src={logo} alt="Preview" className="max-w-full max-h-full object-contain" />
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Insira a URL de uma imagem para ser usada como logo
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="headerText">Texto do Cabeçalho</Label>
          <Input
            id="headerText"
            value={headerText}
            onChange={(e) => setHeaderText(e.target.value)}
            placeholder="Ex: Clínica Central - Excelência em Saúde"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="footerText">Texto do Rodapé</Label>
          <Input
            id="footerText"
            value={footerText}
            onChange={(e) => setFooterText(e.target.value)}
            placeholder="Ex: CNPJ: 00.000.000/0001-00 | Endereço completo"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="primaryColor">Cor Principal</Label>
          <div className="flex gap-2">
            <Input
              id="primaryColor"
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="w-16 h-10 p-1 cursor-pointer"
            />
            <Input
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              placeholder="#0ea5e9"
              className="flex-1"
            />
          </div>
        </div>

        <Button onClick={handleSave} className="w-full">
          <Save className="mr-2 h-4 w-4" />
          Salvar Identidade Visual
        </Button>
      </CardContent>
    </Card>
  );
}
