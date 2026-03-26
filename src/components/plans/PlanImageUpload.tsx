import { ImagePlus, X } from 'lucide-react';
import { Label } from '@/components/ui/label';

interface PlanImageUploadProps {
  value?: string;
  onChange: (v: string) => void;
  label: string;
}

export function PlanImageUpload({ value, onChange, label }: PlanImageUploadProps) {
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (!file) continue;
        const reader = new FileReader();
        reader.onload = () => onChange(reader.result as string);
        reader.readAsDataURL(file);
        e.preventDefault();
        break;
      }
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium text-muted-foreground tracking-wide uppercase">{label}</Label>
      {value ? (
        <div className="relative group rounded-xl overflow-hidden border border-border/50">
          <img
            src={value}
            alt={label}
            className="w-full max-h-[420px] object-contain bg-muted/10"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <button
            onClick={() => onChange('')}
            className="absolute top-3 right-3 h-8 w-8 rounded-lg bg-background/90 border border-border/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div
          onPaste={handlePaste}
          tabIndex={0}
          className="relative border-2 border-dashed border-border/50 rounded-xl p-10 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/[0.02] transition-all duration-300 focus:outline-none focus:border-primary/50 focus:bg-primary/[0.02] group/upload"
        >
          <div className="flex flex-col items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-muted/50 flex items-center justify-center group-hover/upload:bg-primary/10 transition-colors">
              <ImagePlus className="h-5 w-5 text-muted-foreground group-hover/upload:text-primary transition-colors" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Drop, paste, or click to upload</p>
              <p className="text-[11px] text-muted-foreground/60 mt-1">PNG, JPG up to 10MB</p>
            </div>
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={handleFile}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
        </div>
      )}
    </div>
  );
}
