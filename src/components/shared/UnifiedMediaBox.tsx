import { useState, useRef, useCallback, useEffect } from 'react';
import { ImagePlus, X, Upload, ZoomIn, ZoomOut, Maximize2, Video, Link2, Loader2, Globe, ExternalLink, Play } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

export interface MediaItem {
  type: 'image' | 'video' | 'url';
  value: string; // data URL, blob URL, or external URL
  meta?: { title?: string; description?: string; image?: string; domain?: string; youtubeId?: string };
}

interface UnifiedMediaBoxProps {
  /** For backward compat: single string value (image data URL or video blob) */
  value?: string;
  onChange: (value: string) => void;
  label: string;
  /** Accept types: defaults to all */
  accept?: ('image' | 'video' | 'url')[];
  /** Max image height in preview */
  maxPreviewHeight?: string;
}

function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

function isImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?|$)/i.test(url);
}

function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov)(\?|$)/i.test(url) || url.includes('youtube.com') || url.includes('youtu.be') || url.includes('vimeo.com');
}

export function UnifiedMediaBox({ value, onChange, label, accept = ['image', 'video', 'url'], maxPreviewHeight = '420px' }: UnifiedMediaBoxProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlMeta, setUrlMeta] = useState<MediaItem['meta'] | null>(null);
  const [urlLoading, setUrlLoading] = useState(false);
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'url' | null>(null);

  // Detect type from current value
  useEffect(() => {
    if (!value) { setMediaType(null); setUrlMeta(null); return; }
    if (value.startsWith('data:image') || value.startsWith('blob:')) {
      // Check if it was a video blob
      setMediaType(value.startsWith('data:image') ? 'image' : 'video');
    } else if (isImageUrl(value)) {
      setMediaType('image');
    } else if (isVideoUrl(value)) {
      setMediaType('video');
    } else if (value.startsWith('http')) {
      setMediaType('url');
    } else if (value.startsWith('data:video')) {
      setMediaType('video');
    } else {
      setMediaType('image'); // fallback for data URLs
    }
  }, [value]);

  const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const file = files instanceof FileList ? files[0] : files[0];
    if (!file) return;

    if (file.type.startsWith('image/') && accept.includes('image')) {
      const dataUrl = await readFileAsDataUrl(file);
      onChange(dataUrl);
    } else if (file.type.startsWith('video/') && accept.includes('video')) {
      const url = URL.createObjectURL(file);
      onChange(url);
    }
  }, [accept, onChange]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(e.target.files);
  };

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    // Check for images in clipboard
    for (const item of e.clipboardData.items) {
      if (item.type.startsWith('image/') && accept.includes('image')) {
        const file = item.getAsFile();
        if (file) { handleFiles([file]); e.preventDefault(); return; }
      }
    }
    // Check for URL text
    const text = e.clipboardData.getData('text/plain').trim();
    if (text && /^https?:\/\//i.test(text) && accept.includes('url')) {
      e.preventDefault();
      handleUrlSubmit(text);
    }
  }, [accept, handleFiles]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFiles([file]);
      return;
    }
    // Check for dropped URL
    const url = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
    if (url && /^https?:\/\//i.test(url.trim()) && accept.includes('url')) {
      handleUrlSubmit(url.trim());
    }
  }, [accept, handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragging(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragging(false); }, []);

  const handleUrlSubmit = async (url?: string) => {
    const finalUrl = (url || urlInput).trim();
    if (!finalUrl) return;

    // Direct image URL
    if (isImageUrl(finalUrl)) {
      onChange(finalUrl);
      setUrlInput('');
      setShowUrlInput(false);
      return;
    }

    // Direct video / YouTube
    if (isVideoUrl(finalUrl)) {
      onChange(finalUrl);
      setUrlInput('');
      setShowUrlInput(false);
      return;
    }

    // Fetch metadata for article URLs
    setUrlLoading(true);
    try {
      const { data } = await supabase.functions.invoke('fetch-url-metadata', { body: { url: finalUrl } });
      if (data?.success) {
        setUrlMeta({ title: data.title, description: data.description, image: data.image, domain: data.domain, youtubeId: data.youtubeId });
        onChange(data.url || finalUrl);
      } else {
        onChange(finalUrl);
      }
    } catch {
      onChange(finalUrl);
    } finally {
      setUrlLoading(false);
      setUrlInput('');
      setShowUrlInput(false);
    }
  };

  const fileAccept = [
    ...(accept.includes('image') ? ['image/*'] : []),
    ...(accept.includes('video') ? ['video/mp4', 'video/webm'] : []),
  ].join(',');

  const ytId = value ? getYouTubeId(value) : null;

  // ── PREVIEW ──────────────────────────────────
  if (value) {
    return (
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground tracking-wide uppercase">{label}</Label>
        <div className="relative group rounded-xl overflow-hidden border border-border/50 bg-muted/5">

          {/* YouTube embed */}
          {ytId ? (
            <div className="aspect-video">
              <iframe src={`https://www.youtube.com/embed/${ytId}`} className="w-full h-full" allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
            </div>
          ) : mediaType === 'video' || value.startsWith('blob:') || value.startsWith('data:video') ? (
            <video src={value} controls className="w-full rounded-xl bg-black" style={{ maxHeight: maxPreviewHeight }} />
          ) : mediaType === 'url' && urlMeta ? (
            /* Rich URL preview card */
            <a href={value} target="_blank" rel="noopener noreferrer" className="flex overflow-hidden hover:bg-muted/10 transition-colors">
              {urlMeta.image && (
                <div className="w-32 h-28 shrink-0 bg-muted/20">
                  <img src={urlMeta.image} alt="" className="w-full h-full object-cover" loading="lazy" />
                </div>
              )}
              <div className="flex-1 min-w-0 p-4 flex flex-col justify-center gap-1.5">
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
                  <Globe className="h-3 w-3" /> {urlMeta.domain}
                </div>
                {urlMeta.title && <p className="text-sm font-semibold text-foreground line-clamp-2">{urlMeta.title}</p>}
                {urlMeta.description && <p className="text-xs text-muted-foreground line-clamp-2">{urlMeta.description}</p>}
              </div>
              <div className="shrink-0 flex items-center px-3">
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </a>
          ) : mediaType === 'url' ? (
            /* Simple URL card */
            <a href={value} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 hover:bg-muted/10 transition-colors">
              <div className="h-10 w-10 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                <Link2 className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{value}</p>
                <p className="text-[10px] text-muted-foreground">Click to open</p>
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            </a>
          ) : (
            /* Image preview */
            <img
              src={value}
              alt={label}
              className="w-full object-contain bg-muted/10 cursor-pointer"
              style={{ maxHeight: maxPreviewHeight }}
              onClick={() => { setZoom(1); setViewerOpen(true); }}
              loading="lazy"
            />
          )}

          {/* Overlay controls */}
          <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200">
            {(mediaType === 'image' || (!ytId && mediaType !== 'video' && mediaType !== 'url')) && (
              <button onClick={() => { setZoom(1); setViewerOpen(true); }} className="h-8 w-8 rounded-lg bg-background/90 border border-border/50 flex items-center justify-center hover:bg-primary/10 hover:border-primary/30 transition-colors">
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
            )}
            <button onClick={() => { onChange(''); setUrlMeta(null); }} className="h-8 w-8 rounded-lg bg-background/90 border border-border/50 flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Image viewer dialog */}
        {mediaType === 'image' && (
          <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
            <DialogContent className="max-w-[95vw] max-h-[95vh] p-2 sm:p-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setZoom(z => Math.max(0.25, z - 0.25))}><ZoomOut className="h-4 w-4" /></Button>
                <span className="text-xs font-mono text-muted-foreground min-w-[3rem] text-center">{Math.round(zoom * 100)}%</span>
                <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setZoom(z => Math.min(5, z + 0.25))}><ZoomIn className="h-4 w-4" /></Button>
                <Button variant="outline" size="sm" className="h-8 text-xs rounded-lg" onClick={() => setZoom(1)}>Reset</Button>
              </div>
              <div className="overflow-auto max-h-[80vh] flex items-center justify-center">
                <img src={value} alt={label} style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }} className="max-w-full transition-transform duration-200" />
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    );
  }

  // ── EMPTY STATE / UPLOAD ─────────────────────
  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium text-muted-foreground tracking-wide uppercase">{label}</Label>
      <div
        onPaste={handlePaste}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        tabIndex={0}
        className={cn(
          'relative border-2 border-dashed rounded-xl text-center transition-all duration-300 focus:outline-none focus:border-primary/50 focus:bg-primary/[0.02]',
          dragging ? 'border-primary bg-primary/10 scale-[1.01]' : 'border-border/50 hover:border-primary/40 hover:bg-primary/[0.02]'
        )}
      >
        {urlLoading ? (
          <div className="flex items-center justify-center gap-2 p-8">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Loading preview…</span>
          </div>
        ) : showUrlInput ? (
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleUrlSubmit(); } }}
                placeholder="https://example.com or YouTube link..."
                className="h-9 text-xs rounded-lg flex-1"
                autoFocus
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="ghost" size="sm" className="text-xs h-8 rounded-lg" onClick={() => setShowUrlInput(false)}>Cancel</Button>
              <Button type="button" size="sm" className="text-xs h-8 rounded-lg gap-1" onClick={() => handleUrlSubmit()}>
                <ExternalLink className="h-3 w-3" /> Embed
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-3">
            <div className="flex justify-center gap-3">
              {accept.includes('image') && (
                <div className="h-10 w-10 rounded-lg bg-muted/50 flex items-center justify-center">
                  <ImagePlus className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              {accept.includes('video') && (
                <div className="h-10 w-10 rounded-lg bg-muted/50 flex items-center justify-center">
                  <Video className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              {accept.includes('url') && (
                <div className="h-10 w-10 rounded-lg bg-muted/50 flex items-center justify-center">
                  <Link2 className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {dragging ? 'Drop here!' : 'Drop, paste, or upload'}
              </p>
              <p className="text-[10px] text-muted-foreground/60 mt-1">
                {[
                  accept.includes('image') && 'Images',
                  accept.includes('video') && 'Videos',
                  accept.includes('url') && 'URLs',
                ].filter(Boolean).join(' · ')}
                {' · Ctrl+V to paste'}
              </p>
            </div>
            <div className="flex justify-center gap-2">
              <Button type="button" variant="outline" size="sm" className="rounded-lg text-xs font-semibold gap-1.5"
                onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}>
                <Upload className="h-3.5 w-3.5" /> Choose File
              </Button>
              {accept.includes('url') && (
                <Button type="button" variant="outline" size="sm" className="rounded-lg text-xs font-semibold gap-1.5"
                  onClick={(e) => { e.stopPropagation(); setShowUrlInput(true); }}>
                  <Link2 className="h-3.5 w-3.5" /> Paste URL
                </Button>
              )}
            </div>
          </div>
        )}
        <input ref={fileRef} type="file" accept={fileAccept} onChange={handleFileInput} className="hidden" />
      </div>
    </div>
  );
}
