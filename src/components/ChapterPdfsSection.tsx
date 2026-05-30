import { useState, useRef, useEffect, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import {
  FileText, Upload, Trash2, Download, Eye, Loader2, X as XIcon,
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2, Minimize2, Search,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Chapter, ChapterPdf } from '@/contexts/AppContext';

// Worker setup — bundle pdfjs worker via Vite
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const formatBytes = (bytes: number) => {
  if (!bytes) return '0 o';
  const k = 1024;
  const units = ['o', 'Ko', 'Mo', 'Go'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), units.length - 1);
  return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

const formatDate = (iso: string) => {
  try { return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return ''; }
};

const lastPageKey = (id: string) => `pdf_last_page_${id}`;

// ── PDF Reader Modal ─────────────────────────────────────────────────────────
function PdfReader({ pdf, onClose }: { pdf: ChapterPdf; onClose: () => void }) {
  const { toast } = useToast();
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(() => {
    const saved = localStorage.getItem(lastPageKey(pdf.id));
    return saved ? Math.max(1, parseInt(saved, 10) || 1) : 1;
  });
  const [scale, setScale] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [pageWidth, setPageWidth] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Compute responsive page width
  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        setPageWidth(Math.min(containerRef.current.clientWidth - 16, 1100));
      }
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [fullscreen]);

  // Save last page
  useEffect(() => {
    if (numPages > 0) localStorage.setItem(lastPageKey(pdf.id), String(pageNumber));
  }, [pageNumber, numPages, pdf.id]);

  // Keyboard nav
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setPageNumber(p => Math.min(numPages || p, p + 1));
      if (e.key === 'ArrowLeft') setPageNumber(p => Math.max(1, p - 1));
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') { e.preventDefault(); setShowSearch(s => !s); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [numPages, onClose]);

  const onLoad = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    // Clamp saved page within range
    setPageNumber(p => Math.min(Math.max(1, p), numPages));
  }, []);

  const onError = (err: Error) => {
    toast({ title: 'Erreur de lecture', description: err.message || 'Impossible de charger le PDF.', variant: 'destructive' });
  };

  const customTextRenderer = useCallback(({ str }: { str: string }) => {
    if (!search.trim()) return str;
    const re = new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return str.replace(re, '<mark style="background:#ffeb3b;color:#000;padding:0 2px;border-radius:2px;">$1</mark>');
  }, [search]);

  return (
    <div className={`fixed inset-0 z-[60] flex flex-col bg-background ${fullscreen ? '' : 'p-0 md:p-4'}`}>
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <FileText size={18} className="text-primary shrink-0" />
          <span className="text-sm font-medium truncate" title={pdf.name}>{pdf.name}</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setShowSearch(s => !s)} title="Rechercher (Ctrl+F)" className="p-2 rounded-md hover:bg-muted">
            <Search size={16} />
          </button>
          <button onClick={() => setScale(s => Math.max(0.5, s - 0.2))} title="Zoom -" className="p-2 rounded-md hover:bg-muted">
            <ZoomOut size={16} />
          </button>
          <span className="text-xs w-12 text-center tabular-nums">{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale(s => Math.min(3, s + 0.2))} title="Zoom +" className="p-2 rounded-md hover:bg-muted">
            <ZoomIn size={16} />
          </button>
          <button onClick={() => setFullscreen(f => !f)} title="Plein écran" className="hidden md:inline-flex p-2 rounded-md hover:bg-muted">
            {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <button onClick={onClose} title="Fermer (Échap)" className="p-2 rounded-md hover:bg-muted">
            <XIcon size={18} />
          </button>
        </div>
      </div>

      {showSearch && (
        <div className="px-3 py-2 border-b border-border bg-card/60 shrink-0">
          <input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher dans la page…"
            className="w-full px-3 py-1.5 text-sm rounded-md bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      )}

      <div ref={containerRef} className="flex-1 overflow-auto bg-muted/30 flex justify-center py-3">
        <Document
          file={pdf.url}
          onLoadSuccess={onLoad}
          onLoadError={onError}
          loading={<div className="flex flex-col items-center gap-2 py-12 text-muted-foreground"><Loader2 className="animate-spin" /> Chargement du PDF…</div>}
          error={<div className="py-12 text-destructive text-sm text-center px-4">Impossible de charger le document. Vérifiez votre connexion ou retéléchargez le fichier.</div>}
        >
          {pageWidth > 0 && (
            <Page
              pageNumber={pageNumber}
              width={pageWidth}
              scale={scale}
              renderAnnotationLayer
              renderTextLayer
              customTextRenderer={customTextRenderer}
              loading={<div className="py-8 text-muted-foreground text-sm">Page {pageNumber}…</div>}
            />
          )}
        </Document>
      </div>

      <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-border bg-card shrink-0">
        <button
          onClick={() => setPageNumber(p => Math.max(1, p - 1))}
          disabled={pageNumber <= 1}
          className="p-2 rounded-md hover:bg-muted disabled:opacity-30"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="text-xs tabular-nums">
          Page <input
            type="number"
            value={pageNumber}
            min={1}
            max={numPages || 1}
            onChange={e => {
              const v = parseInt(e.target.value, 10);
              if (!isNaN(v)) setPageNumber(Math.min(Math.max(1, v), numPages || 1));
            }}
            className="w-14 mx-1 px-1 py-0.5 text-center rounded bg-muted border border-border"
          /> / {numPages || '?'}
        </div>
        <button
          onClick={() => setPageNumber(p => Math.min(numPages || p, p + 1))}
          disabled={!!numPages && pageNumber >= numPages}
          className="p-2 rounded-md hover:bg-muted disabled:opacity-30"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}

// ── Section ──────────────────────────────────────────────────────────────────
export default function ChapterPdfsSection({
  chapter, isAdmin, onUpdate,
}: {
  chapter: Chapter;
  isAdmin: boolean;
  onUpdate: (pdfs: ChapterPdf[]) => void;
}) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ name: string; pct: number } | null>(null);
  const [reading, setReading] = useState<ChapterPdf | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadPct, setDownloadPct] = useState(0);
  const pdfs = chapter.pdfs || [];

  // Count pages by loading with pdfjs (best effort)
  const countPages = async (file: File): Promise<number | undefined> => {
    try {
      const buf = await file.arrayBuffer();
      const doc = await pdfjs.getDocument({ data: buf }).promise;
      const n = doc.numPages;
      doc.destroy();
      return n;
    } catch { return undefined; }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      const added: ChapterPdf[] = [];
      for (const file of files) {
        if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
          toast({ title: 'Format invalide', description: `${file.name} n'est pas un PDF.`, variant: 'destructive' });
          continue;
        }
        if (file.size > 100 * 1024 * 1024) {
          toast({ title: 'Fichier trop volumineux', description: `${file.name} dépasse 100 Mo.`, variant: 'destructive' });
          continue;
        }
        setUploadProgress({ name: file.name, pct: 0 });
        const pages = await countPages(file);
        setUploadProgress({ name: file.name, pct: 30 });

        const path = `courses/${chapter.id}/pdfs/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const { error } = await supabase.storage.from('community-media').upload(path, file, {
          cacheControl: '3600', upsert: false, contentType: 'application/pdf',
        });
        setUploadProgress({ name: file.name, pct: 90 });
        if (error) {
          toast({ title: 'Erreur upload', description: error.message, variant: 'destructive' });
          continue;
        }
        const { data } = supabase.storage.from('community-media').getPublicUrl(path);
        added.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          url: data.publicUrl,
          name: file.name,
          size: file.size,
          pages,
          uploaded_at: new Date().toISOString(),
        });
        setUploadProgress({ name: file.name, pct: 100 });
      }
      if (added.length) {
        onUpdate([...(chapter.pdfs || []), ...added]);
        toast({ title: '✅ PDF ajouté(s)', description: `${added.length} document(s) publié(s).` });
      }
    } finally {
      setUploading(false);
      setUploadProgress(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleDelete = (pdf: ChapterPdf) => {
    if (!confirm(`Supprimer "${pdf.name}" ?`)) return;
    onUpdate(pdfs.filter(p => p.id !== pdf.id));
    toast({ title: 'Document supprimé' });
  };

  const handleDownload = async (pdf: ChapterPdf) => {
    setDownloading(pdf.id);
    setDownloadPct(0);
    try {
      const res = await fetch(pdf.url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const total = Number(res.headers.get('content-length')) || pdf.size || 0;
      const reader = res.body?.getReader();
      if (!reader) {
        const blob = await res.blob();
        triggerDownload(blob, pdf.name);
        return;
      }
      const chunks: Uint8Array[] = [];
      let received = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          received += value.length;
          if (total) setDownloadPct(Math.round((received / total) * 100));
        }
      }
      const blob = new Blob(chunks as BlobPart[], { type: 'application/pdf' });
      // Integrity check
      if (pdf.size && Math.abs(blob.size - pdf.size) > 1024) {
        toast({ title: 'Avertissement', description: 'La taille du fichier téléchargé diffère de la taille attendue.', variant: 'destructive' });
      }
      triggerDownload(blob, pdf.name);
      toast({ title: '✅ Téléchargé', description: pdf.name });
    } catch (err: any) {
      toast({ title: 'Erreur de téléchargement', description: err?.message || 'Réseau indisponible.', variant: 'destructive' });
      window.open(pdf.url, '_blank');
    } finally {
      setDownloading(null);
      setDownloadPct(0);
    }
  };

  const triggerDownload = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleShare = async (pdf: ChapterPdf) => {
    try {
      if (navigator.share) {
        await navigator.share({ title: pdf.name, url: pdf.url });
      } else {
        await navigator.clipboard.writeText(pdf.url);
        toast({ title: 'Lien copié' });
      }
    } catch { /* user cancelled */ }
  };

  if (!isAdmin && pdfs.length === 0) return null;

  return (
    <>
      <div className="glass-card p-3 md:p-6 mb-4 md:mb-6">
        <div className="flex items-center justify-between mb-3 md:mb-4 flex-wrap gap-2">
          <h3 className="font-heading font-semibold text-base md:text-lg flex items-center gap-2">
            <FileText size={18} className="text-primary" />
            Documents PDF
            <span className="text-muted-foreground text-sm font-normal">({pdfs.length})</span>
          </h3>
          {isAdmin && (
            <label className="px-3 py-2 rounded-lg gradient-bg text-primary-foreground text-xs md:text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2 cursor-pointer">
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {uploading ? 'Upload…' : 'Ajouter un PDF'}
              <input ref={fileRef} type="file" accept="application/pdf,.pdf" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
            </label>
          )}
        </div>

        {uploadProgress && (
          <div className="mb-3 text-xs">
            <div className="flex justify-between mb-1">
              <span className="truncate">{uploadProgress.name}</span>
              <span className="text-muted-foreground">{uploadProgress.pct}%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full gradient-bg transition-all" style={{ width: `${uploadProgress.pct}%` }} />
            </div>
          </div>
        )}

        {pdfs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucun document. Ajoutez des PDF (cours, exercices…) pour les rendre consultables hors ligne.
          </p>
        ) : (
          <div className="space-y-2 md:space-y-3">
            {pdfs.map(pdf => (
              <div key={pdf.id} className="rounded-xl border border-border bg-card/50 hover:bg-card transition-colors p-3 md:p-4">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-10 h-12 md:w-12 md:h-14 rounded-md bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white text-[10px] md:text-xs font-bold shadow-sm">
                    PDF
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm md:text-base truncate" title={pdf.name}>{pdf.name}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[11px] md:text-xs text-muted-foreground">
                      <span>{formatBytes(pdf.size)}</span>
                      {pdf.pages && <span>{pdf.pages} pages</span>}
                      <span>Ajouté le {formatDate(pdf.uploaded_at)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <button
                    onClick={() => setReading(pdf)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg gradient-bg text-primary-foreground text-xs md:text-sm font-medium hover:opacity-90"
                  >
                    <Eye size={14} /> Lire
                  </button>
                  <button
                    onClick={() => handleDownload(pdf)}
                    disabled={downloading === pdf.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-foreground text-xs md:text-sm font-medium hover:bg-muted disabled:opacity-60"
                  >
                    {downloading === pdf.id
                      ? <><Loader2 size={14} className="animate-spin" /> {downloadPct || 0}%</>
                      : <><Download size={14} /> Télécharger</>}
                  </button>
                  <button
                    onClick={() => handleShare(pdf)}
                    className="px-3 py-1.5 rounded-lg bg-secondary text-foreground text-xs md:text-sm font-medium hover:bg-muted"
                  >
                    Partager
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => handleDelete(pdf)}
                      className="ml-auto p-1.5 rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20"
                      title="Supprimer"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {reading && <PdfReader pdf={reading} onClose={() => setReading(null)} />}
    </>
  );
}