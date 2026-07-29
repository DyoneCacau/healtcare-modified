import { useRef, useState, type DragEvent, type ChangeEvent } from 'react';
import { ImagePlus, Loader2, Trash2, Replace } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { SmartHubAssetKind } from '@/types/smartHub';
import { SMART_HUB_IMAGE_LIMITS, validateSmartHubImage } from '@/services/smartHub/imageUtils';

export interface SmartHubImageUploadProps {
  kind: SmartHubAssetKind;
  currentUrl?: string | null;
  clinicId: string;
  hubId: string;
  disabled?: boolean;
  className?: string;
  onUpload: (file: File) => Promise<string | void>;
  onRemove?: () => Promise<void> | void;
}

export function SmartHubImageUpload({
  kind,
  currentUrl,
  disabled,
  className,
  onUpload,
  onRemove,
}: SmartHubImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const meta = SMART_HUB_IMAGE_LIMITS[kind];
  const aspectClass =
    kind === 'banner' || kind === 'background' ? 'aspect-[16/9]' : 'aspect-square';

  const runUpload = async (file: File) => {
    setError(null);
    const check = validateSmartHubImage(file, kind);
    if (check.ok === false) {
      setError(check.message);
      return;
    }

    setUploading(true);
    setProgress(12);
    const timer = window.setInterval(() => {
      setProgress((p) => (p >= 88 ? p : p + 8));
    }, 180);

    try {
      await onUpload(file);
      setProgress(100);
    } catch (err) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : 'Não foi possível enviar a imagem.';
      setError(message);
    } finally {
      window.clearInterval(timer);
      setUploading(false);
      setTimeout(() => setProgress(0), 400);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void runUpload(file);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void runUpload(file);
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div
        role="button"
        tabIndex={0}
        aria-label={`Enviar ${meta.label}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'relative overflow-hidden rounded-xl border border-dashed bg-muted/30 transition',
          aspectClass,
          dragging && 'border-primary bg-primary/5',
          (disabled || uploading) && 'pointer-events-none opacity-70'
        )}
      >
        {currentUrl ? (
          <img
            src={currentUrl}
            alt={meta.label}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center text-sm text-muted-foreground">
            <ImagePlus className="h-6 w-6" />
            <span>Arraste uma imagem ou toque para selecionar</span>
            <span className="text-xs">
              {meta.aspectHint} · até {Math.round(meta.maxBytes / (1024 * 1024))} MB
            </span>
          </div>
        )}

        {uploading && (
          <div className="absolute inset-x-0 bottom-0 bg-background/80 p-2">
            <Progress value={progress} className="h-1.5" />
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : currentUrl ? (
            <Replace className="mr-2 h-4 w-4" />
          ) : (
            <ImagePlus className="mr-2 h-4 w-4" />
          )}
          {currentUrl ? 'Substituir' : `Enviar ${meta.label.toLowerCase()}`}
        </Button>
        {currentUrl && onRemove && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled || uploading}
            onClick={() => void onRemove()}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Remover
          </Button>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="hidden"
        onChange={onFileChange}
      />
    </div>
  );
}
