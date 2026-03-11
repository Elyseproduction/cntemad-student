import { useState, useMemo, useRef } from 'react';
import { useApp, Subject, Chapter, Session, DEFAULT_SESSION } from '@/contexts/AppContext';
import { ArrowLeft, Plus, Trash2, Search, ChevronRight, Upload, CheckCircle, RotateCcw, BookOpen, FileUp, Loader2, FolderOpen, Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const difficultyBadge = (d: string) => {
  if (d === 'Facile') return <span className="text-xs px-2 py-0.5 rounded-full bg-success/20 text-success">🟢 Facile</span>;
  if (d === 'Moyen') return <span className="text-xs px-2 py-0.5 rounded-full bg-warning/20 text-warning">🟡 Moyen</span>;
  return <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/20 text-destructive">🔴 Difficile</span>;
};

function SectionRenderer({ section }: { section: Chapter['sections'][0] }) {
  const highlightKeywords = (text: string, keywords?: string[]) => {
    if (!keywords?.length) return text;
    let result = text;
    keywords.forEach(kw => {
      const regex = new RegExp(`(${kw})`, 'gi');
      result = result.replace(regex, '«$1»');
    });
    return result;
  };

  const renderContent = (content: string, keywords?: string[]) => {
    const highlighted = highlightKeywords(content, keywords);
    return highlighted.split('«').map((part, i) => {
      if (part.includes('»')) {
        const [kw, rest] = part.split('»');
        return <span key={i}><span className="keyword-highlight">{kw}</span>{rest}</span>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  switch (section.type) {
    case 'h1': return (
      <div className="mt-6 md:mt-8 mb-3 md:mb-4 overflow-hidden">
        <h2 className="section-h1 pb-2 border-b border-primary/30 break-words">{section.titre}</h2>
        <p className="mt-2 md:mt-3 text-sm md:text-base leading-relaxed whitespace-pre-wrap break-words overflow-hidden">{renderContent(section.contenu, section.mots_cles)}</p>
      </div>
    );
    case 'h2': return (
      <div className="mt-4 md:mt-6 mb-2 md:mb-3">
        <h3 className="section-h2">{section.titre}</h3>
        <p className="mt-1.5 md:mt-2 text-sm md:text-base leading-relaxed whitespace-pre-wrap break-words">{renderContent(section.contenu, section.mots_cles)}</p>
      </div>
    );
    case 'h3': return (
      <div className="mt-3 md:mt-4 mb-1.5 md:mb-2">
        <h4 className="section-h3">{section.titre}</h4>
        <p className="mt-1 text-sm md:text-base leading-relaxed whitespace-pre-wrap break-words">{renderContent(section.contenu, section.mots_cles)}</p>
      </div>
    );
    case 'definition': return (
      <div className="my-3 md:my-4 p-3 md:p-4 rounded-xl border-l-4 border-accent bg-accent/10">
        <p className="font-semibold text-accent mb-1 text-sm md:text-base">📌 {section.titre}</p>
        <p className="text-sm md:text-base leading-relaxed break-words">{renderContent(section.contenu, section.mots_cles)}</p>
      </div>
    );
    case 'retenir': return (
      <div className="my-3 md:my-4 p-3 md:p-4 rounded-xl bg-primary/10 border border-primary/20">
        <p className="font-semibold text-primary mb-1 text-sm md:text-base">💡 {section.titre}</p>
        <p className="text-sm md:text-base leading-relaxed break-words">{renderContent(section.contenu, section.mots_cles)}</p>
      </div>
    );
    case 'attention': return (
      <div className="my-3 md:my-4 p-3 md:p-4 rounded-xl bg-warning/10 border border-warning/20">
        <p className="font-semibold text-warning mb-1 text-sm md:text-base">⚠️ {section.titre}</p>
        <p className="text-sm md:text-base leading-relaxed break-words">{renderContent(section.contenu, section.mots_cles)}</p>
      </div>
    );
    case 'code': return (
      <div className="my-3 md:my-4">
        <p className="text-xs md:text-sm text-muted-foreground mb-1">{section.titre}</p>
        <div className="rounded-xl bg-muted/50 border border-border overflow-auto max-h-[60vh] -mx-1 md:mx-0">
          <pre className="p-3 md:p-4 font-mono text-xs md:text-sm leading-relaxed min-w-0">
            <code className="break-all md:break-normal whitespace-pre-wrap">{section.contenu}</code>
          </pre>
        </div>
      </div>
    );
    case 'tableau': return (
      <div className="my-3 md:my-4">
        <p className="font-semibold mb-2 text-sm md:text-base">{section.titre}</p>
        <div className="rounded-xl bg-muted/30 border border-border overflow-auto max-h-[60vh] -mx-1 md:mx-0">
          <pre className="p-3 md:p-4 font-mono text-xs md:text-sm min-w-0 whitespace-pre-wrap">{section.contenu}</pre>
        </div>
      </div>
    );
    case 'schema': return (
      <div className="my-3 md:my-4 p-3 md:p-4 rounded-xl bg-muted/30 border border-dashed border-primary/30 overflow-auto max-h-[60vh]">
        <p className="font-semibold text-primary mb-2 text-sm md:text-base">🔷 {section.titre}</p>
        <pre className="font-mono text-xs md:text-sm leading-relaxed min-w-0 whitespace-pre-wrap">{section.contenu}</pre>
      </div>
    );
    default: return null;
  }
}

// ── Create Session Modal ──────────────────────────────────────────────────────
function CreateSessionModal({ open, onClose, onCreate }: {
  open: boolean; onClose: () => void;
  onCreate: (nom: string, couleur: string, icone: string) => void;
}) {
  const [nom, setNom] = useState('');
  const [couleur, setCouleur] = useState('#00BCD4');
  const [icone, setIcone] = useState('📂');
  const icons = ['📂', '🎓', '🔬', '🏛️', '📐', '🌍', '🎨', '⚕️', '⚙️', '📊', '🧬', '🏗️'];
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-card p-6 max-w-md w-full mx-4 animate-scale-in">
        <h2 className="font-heading font-bold text-xl mb-4">Nouvelle session</h2>
        <div className="space-y-4">
          <input value={nom} onChange={e => setNom(e.target.value)} placeholder="Nom de la session (ex: Mathématiques)" className="w-full px-4 py-3 rounded-lg bg-secondary border border-border focus:border-primary outline-none text-foreground" />
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Couleur</label>
            <input type="color" value={couleur} onChange={e => setCouleur(e.target.value)} className="w-12 h-10 rounded cursor-pointer" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Icône</label>
            <div className="flex flex-wrap gap-2">
              {icons.map(ic => (
                <button key={ic} onClick={() => setIcone(ic)} className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${icone === ic ? 'bg-primary/20 ring-2 ring-primary' : 'bg-secondary hover:bg-muted'}`}>{ic}</button>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2 rounded-lg bg-secondary text-foreground hover:bg-muted transition-colors">Annuler</button>
            <button onClick={() => { if (nom.trim()) { onCreate(nom, couleur, icone); setNom(''); onClose(); } }} className="flex-1 py-2 rounded-lg gradient-bg text-primary-foreground font-medium hover:opacity-90 transition-opacity">Créer</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Create Subject Modal ──────────────────────────────────────────────────────
function CreateSubjectModal({ open, onClose, onCreate, sessions, currentSessionId }: {
  open: boolean; onClose: () => void;
  onCreate: (nom: string, couleur: string, icone: string, sessionId: string) => void;
  sessions: Session[]; currentSessionId: string;
}) {
  const [nom, setNom] = useState('');
  const [couleur, setCouleur] = useState('#6C63FF');
  const [icone, setIcone] = useState('📘');
  const [sessionId, setSessionId] = useState(currentSessionId);
  const icons = ['📘', '📗', '📕', '📙', '🧮', '🌐', '🗄️', '💻', '🔒', '📊', '🎯', '⚙️'];
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-card p-6 max-w-md w-full mx-4 animate-scale-in">
        <h2 className="font-heading font-bold text-xl mb-4">Nouvelle matière</h2>
        <div className="space-y-4">
          <input value={nom} onChange={e => setNom(e.target.value)} placeholder="Nom de la matière" className="w-full px-4 py-3 rounded-lg bg-secondary border border-border focus:border-primary outline-none text-foreground" />
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Session</label>
            <select value={sessionId} onChange={e => setSessionId(e.target.value)} className="w-full px-4 py-3 rounded-lg bg-secondary border border-border focus:border-primary outline-none text-foreground">
              {sessions.map(s => <option key={s.id} value={s.id}>{s.icone} {s.nom}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Couleur</label>
            <input type="color" value={couleur} onChange={e => setCouleur(e.target.value)} className="w-12 h-10 rounded cursor-pointer" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Icône</label>
            <div className="flex flex-wrap gap-2">
              {icons.map(ic => (
                <button key={ic} onClick={() => setIcone(ic)} className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${icone === ic ? 'bg-primary/20 ring-2 ring-primary' : 'bg-secondary hover:bg-muted'}`}>{ic}</button>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2 rounded-lg bg-secondary text-foreground hover:bg-muted transition-colors">Annuler</button>
            <button onClick={() => { if (nom.trim()) { onCreate(nom, couleur, icone, sessionId); setNom(''); onClose(); } }} className="flex-1 py-2 rounded-lg gradient-bg text-primary-foreground font-medium hover:opacity-90 transition-opacity">Créer</button>
          </div>
        </div>
      </div>
    </div>
  );
}


// ── Rename Session Modal ──────────────────────────────────────────────────────
function RenameSessionModal({ open, onClose, session, onRename }: {
  open: boolean; onClose: () => void;
  session: Session | null;
  onRename: (id: string, nom: string, couleur: string, icone: string) => void;
}) {
  const [nom, setNom] = useState(session?.nom || '');
  const [couleur, setCouleur] = useState(session?.couleur || '#6C63FF');
  const [icone, setIcone] = useState(session?.icone || '📂');
  const icons = ['📂', '🎓', '🔬', '🏛️', '📐', '🌍', '🎨', '⚕️', '⚙️', '📊', '🧬', '🏗️', '💻', '📘'];

  // Sync with session prop when it changes
  useState(() => { if (session) { setNom(session.nom); setCouleur(session.couleur); setIcone(session.icone); } });

  if (!open || !session) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-card p-6 max-w-md w-full mx-4 animate-scale-in">
        <h2 className="font-heading font-bold text-xl mb-4">Modifier la session</h2>
        <div className="space-y-4">
          <input value={nom} onChange={e => setNom(e.target.value)} placeholder="Nom de la session" className="w-full px-4 py-3 rounded-lg bg-secondary border border-border focus:border-primary outline-none text-foreground" />
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Couleur</label>
            <input type="color" value={couleur} onChange={e => setCouleur(e.target.value)} className="w-12 h-10 rounded cursor-pointer" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Icône</label>
            <div className="flex flex-wrap gap-2">
              {icons.map(ic => (
                <button key={ic} onClick={() => setIcone(ic)} className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${icone === ic ? 'bg-primary/20 ring-2 ring-primary' : 'bg-secondary hover:bg-muted'}`}>{ic}</button>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2 rounded-lg bg-secondary text-foreground hover:bg-muted transition-colors">Annuler</button>
            <button onClick={() => { if (nom.trim()) { onRename(session.id, nom, couleur, icone); onClose(); } }} className="flex-1 py-2 rounded-lg gradient-bg text-primary-foreground font-medium hover:opacity-90">Enregistrer</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Import Course Modal ───────────────────────────────────────────────────────
function ImportCourseModal({ open, onClose, subjectName, onImport, onVideosFound }: { open: boolean; onClose: () => void; subjectName: string; onImport: (chapter: Chapter) => void; onVideosFound?: (videos: any[]) => void }) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const extractTextFromFile = async (file: File): Promise<string> => {
    const type = file.type;
    if (type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.md')) return await file.text();
    if (type.startsWith('image/')) {
      const buffer = await file.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
      return `[IMAGE:${file.name}] Ce fichier est une image. Voici le contenu encodé en base64 pour extraction OCR: ${base64.substring(0, 5000)}... (L'IA devra extraire le texte de cette image)`;
    }
    const text = await file.text();
    const readable = text.replace(/[^\x20-\x7E\xA0-\xFF\u0100-\uFFFF\n\r\t]/g, ' ').replace(/\s{3,}/g, '\n');
    if (readable.trim().length > 50) return readable;
    return `Fichier: ${file.name}\nType: ${type}\nContenu non extractible directement.`;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { toast({ title: 'Fichier trop volumineux', description: 'Maximum 20 Mo autorisé.', variant: 'destructive' }); return; }
    setLoading(true); setStatus('📄 Extraction du contenu...');
    try {
      const textContent = await extractTextFromFile(file);
      if (textContent.length < 50) { toast({ title: 'Contenu insuffisant', variant: 'destructive' }); setLoading(false); setStatus(''); return; }
      setStatus("🤖 Analyse complète par l'IA (page par page)...");
      const { data, error } = await supabase.functions.invoke('extract-course', { body: { textContent, fileName: file.name, subjectName } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const chapter: Chapter = { id: Date.now().toString(), titre: data.titre || file.name.replace(/\.[^.]+$/, ''), difficulte: data.difficulte || 'Moyen', resume_intro: data.resume_intro || '', sections: data.sections || [], schemas_detectes: data.schemas_detectes || [], points_cles: data.points_cles || [], conseil_revision: data.conseil_revision || '', published: false };
      onImport(chapter);
      
      // Show what AI added
      if (data.contenu_ajoute && data.contenu_ajoute.length > 0) {
        const added = data.contenu_ajoute.map((c: any) => c.titre).join(', ');
        toast({ title: '✅ Cours importé avec enrichissements !', description: `"${chapter.titre}" créé. L'IA a ajouté : ${added}` });
      } else {
        toast({ title: '✅ Cours importé !', description: `"${chapter.titre}" a été créé. Vérifiez et publiez-le.` });
      }

      // Auto-search YouTube videos for this chapter
      setStatus("🔍 Recherche de vidéos YouTube...");
      try {
        const { data: ytData } = await supabase.functions.invoke('search-youtube', { 
          body: { chapterTitle: chapter.titre, subjectName } 
        });
        if (ytData?.videos?.length > 0 && onVideosFound) {
          onVideosFound(ytData.videos);
          toast({ title: '🎬 Vidéos trouvées !', description: `${ytData.videos.length} suggestion(s) de vidéos ajoutée(s) à la vidéothèque.` });
        }
      } catch { /* ignore video search errors */ }
      
      onClose();
    } catch (err: any) {
      toast({ title: "Erreur d'importation", description: err.message || 'Une erreur est survenue.', variant: 'destructive' });
    } finally {
      setLoading(false); setStatus('');
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={loading ? undefined : onClose} />
      <div className="relative glass-card p-6 max-w-md w-full mx-4 animate-scale-in">
        <h2 className="font-heading font-bold text-xl mb-2">📤 Importer un cours</h2>
        <p className="text-muted-foreground text-sm mb-6">Uploadez un fichier (PDF, image, texte) et l'IA structurera le contenu automatiquement.</p>
        {loading ? (
          <div className="text-center py-8">
            <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin mb-4" />
            <p className="text-sm font-medium text-foreground">{status}</p>
          </div>
        ) : (
          <>
            <label className="flex flex-col items-center justify-center w-full h-40 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 cursor-pointer transition-colors">
              <FileUp className="w-10 h-10 text-primary/60 mb-3" />
              <span className="text-sm font-medium text-foreground">Cliquez pour sélectionner un fichier</span>
              <span className="text-xs text-muted-foreground mt-1">PDF, Image, TXT, Word (max 20 Mo)</span>
              <input ref={fileRef} type="file" accept=".pdf,.txt,.md,.doc,.docx,.png,.jpg,.jpeg,.webp" className="hidden" onChange={handleFileSelect} />
            </label>
            <button onClick={onClose} className="w-full mt-4 py-2 rounded-lg bg-secondary text-foreground hover:bg-muted transition-colors text-sm">Annuler</button>
          </>
        )}
      </div>
    </div>
  );
}


// ── Rename Session Modal ──────────────────────────────────────────────────────
// ── Main CoursesPage ──────────────────────────────────────────────────────────
export function CoursesPage() {
  const { subjects, setSubjects, sessions, setSessions, isAdmin, setActiveTab } = useApp();
  const { toast } = useToast();

  // Navigation levels: null = sessions grid | string = selected session id
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [search, setSearch] = useState('');
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [renameSession, setRenameSession] = useState<Session | null>(null);
  const [showCreateSubject, setShowCreateSubject] = useState(false);
  const [showCreateChapter, setShowCreateChapter] = useState(false);
  const [showImportCourse, setShowImportCourse] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [readProgress, setReadProgress] = useState(0);

  const currentSession = useMemo(() =>
    sessions.find(s => s.id === selectedSessionId) || null,
    [sessions, selectedSessionId]
  );

  // Subjects filtered by session, with published filter
  const sessionSubjects = useMemo(() => {
    const sId = selectedSessionId || 'default';
    const filtered = subjects.filter(s => (s.session_id || 'default') === sId);
    if (isAdmin) return filtered.map(s => ({ ...s, chapitres: [...s.chapitres].sort((a, b) => parseInt(b.id) - parseInt(a.id)) }));
    return filtered.map(s => ({ ...s, chapitres: s.chapitres.filter(c => c.published) })).filter(s => s.chapitres.length > 0);
  }, [subjects, selectedSessionId, isAdmin]);

  const filteredSubjects = useMemo(() => {
    if (!search) return sessionSubjects;
    const q = search.toLowerCase();
    return sessionSubjects.filter(s => s.nom.toLowerCase().includes(q) || s.chapitres.some(c => c.titre.toLowerCase().includes(q)));
  }, [sessionSubjects, search]);

  // Count subjects per session (for grid display)
  const subjectsCountBySession = useMemo(() => {
    const map: Record<string, number> = {};
    subjects.forEach(s => {
      const sid = s.session_id || 'default';
      map[sid] = (map[sid] || 0) + 1;
    });
    return map;
  }, [subjects]);

  const handleRenameSession = (id: string, nom: string, couleur: string, icone: string) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, nom, couleur, icone } : s));
  };

  const handleCreateSession = (nom: string, couleur: string, icone: string) => {
    setSessions(prev => [...prev, { id: Date.now().toString(), nom, couleur, icone }]);
  };


  const handleDeleteSession = (id: string) => {
    if (id === 'default') { toast({ title: 'Impossible', description: 'La session Informatique ne peut pas être supprimée.', variant: 'destructive' }); return; }
    // Move subjects to default session before deleting
    setSubjects(prev => prev.map(s => s.session_id === id ? { ...s, session_id: 'default' } : s));
    setSessions(prev => prev.filter(s => s.id !== id));
    setSelectedSessionId(null);
  };

  const handleCreateSubject = (nom: string, couleur: string, icone: string, sessionId: string) => {
    setSubjects(prev => [...prev, { id: Date.now().toString(), nom, couleur, icone, chapitres: [], session_id: sessionId }]);
  };

  const handleDeleteSubject = (id: string) => {
    setSubjects(prev => prev.filter(s => s.id !== id));
    setSelectedSubject(null);
  };

  const handleCreateChapter = () => {
    if (!selectedSubject || !newChapterTitle.trim()) return;
    const newChapter: Chapter = { id: Date.now().toString(), titre: newChapterTitle, difficulte: 'Facile', resume_intro: '', sections: [], schemas_detectes: [], points_cles: [], conseil_revision: '', published: false };
    setSubjects(prev => prev.map(s => s.id === selectedSubject.id ? { ...s, chapitres: [...s.chapitres, newChapter] } : s));
    setNewChapterTitle(''); setShowCreateChapter(false);
  };

  const handleImportChapter = (chapter: Chapter) => {
    if (!selectedSubject) return;
    setSubjects(prev => prev.map(s => s.id === selectedSubject.id ? { ...s, chapitres: [...s.chapitres, chapter] } : s));
  };

  const handleDeleteChapter = (chapterId: string) => {
    if (!selectedSubject) return;
    setSubjects(prev => prev.map(s => s.id === selectedSubject.id ? { ...s, chapitres: s.chapitres.filter(c => c.id !== chapterId) } : s));
  };

  const handlePublishChapter = (chapterId: string) => {
    if (!selectedSubject) return;
    setSubjects(prev => prev.map(s => s.id === selectedSubject.id ? { ...s, chapitres: s.chapitres.map(c => c.id === chapterId ? { ...c, published: !c.published } : c) } : s));
  };

  const handleMarkLearned = () => {
    if (!selectedSubject || !selectedChapter) return;
    setSubjects(prev => prev.map(s => s.id === selectedSubject.id ? { ...s, chapitres: s.chapitres.map(c => c.id === selectedChapter.id ? { ...c, learned: !c.learned } : c) } : s));
    setSelectedChapter(prev => prev ? { ...prev, learned: !prev.learned } : prev);
  };

  // ── Chapter View ────────────────────────────────────────────────────────────
  if (selectedChapter && selectedSubject) {
    return (
      <div className="max-w-4xl mx-auto animate-fade-in" onScroll={(e) => {
        const el = e.target as HTMLElement;
        setReadProgress(Math.round((el.scrollTop / (el.scrollHeight - el.clientHeight)) * 100));
      }}>
        <div className="fixed top-0 left-0 right-0 h-1 bg-muted z-50">
          <div className="h-full gradient-bg transition-all duration-300" style={{ width: `${readProgress}%` }} />
        </div>
        <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm text-muted-foreground mb-4 md:mb-6 flex-wrap">
          <button onClick={() => { setSelectedSessionId(null); setSelectedSubject(null); setSelectedChapter(null); }} className="hover:text-foreground transition-colors">Accueil</button>
          <ChevronRight size={12} />
          <button onClick={() => { setSelectedSubject(null); setSelectedChapter(null); }} className="hover:text-foreground transition-colors truncate max-w-[80px]">{currentSession?.nom || 'Session'}</button>
          <ChevronRight size={12} />
          <button onClick={() => setSelectedChapter(null)} className="hover:text-foreground transition-colors truncate max-w-[120px]">{selectedSubject.nom}</button>
          <ChevronRight size={12} />
          <span className="text-foreground truncate max-w-[150px]">{selectedChapter.titre}</span>
        </div>

        <div className="glass-card p-4 md:p-6 mb-4 md:mb-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 md:gap-4">
            <div>
              <h1 className="section-h1 mb-2">{selectedChapter.titre}</h1>
              <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                {difficultyBadge(selectedChapter.difficulte)}
                {selectedChapter.learned && <span className="text-xs px-2 py-0.5 rounded-full bg-success/20 text-success">✅ Appris</span>}
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={handleMarkLearned} className={`px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all flex-1 md:flex-none ${selectedChapter.learned ? 'bg-success/20 text-success' : 'bg-secondary text-foreground hover:bg-muted'}`}>
                <CheckCircle size={14} className="inline mr-1" /> {selectedChapter.learned ? 'Appris ✅' : 'Appris'}
              </button>
              <button onClick={() => setActiveTab('exercices')} className="px-3 md:px-4 py-2 rounded-lg gradient-bg text-primary-foreground text-xs md:text-sm font-medium hover:opacity-90 transition-opacity flex-1 md:flex-none">
                🧠 Exercices
              </button>
            </div>
          </div>
          {selectedChapter.resume_intro && <p className="mt-3 md:mt-4 text-sm md:text-base text-muted-foreground leading-relaxed">{selectedChapter.resume_intro}</p>}
        </div>

        <div className="glass-card p-3 md:p-6 mb-4 md:mb-6 overflow-hidden w-full max-w-full">
          {selectedChapter.sections.map((section, i) => <SectionRenderer key={i} section={section} />)}
        </div>

        {selectedChapter.schemas_detectes.length > 0 && (
          <div className="glass-card p-6 mb-6">
            <h3 className="section-h2 mb-4">Schémas</h3>
            {selectedChapter.schemas_detectes.map((s, i) => (
              <div key={i} className="p-4 rounded-xl bg-muted/30 border border-dashed border-primary/30 mb-4">
                <p className="text-sm text-muted-foreground mb-2">{s.description}</p>
                <pre className="font-mono text-sm">{s.representation_texte}</pre>
              </div>
            ))}
          </div>
        )}

        {selectedChapter.points_cles.length > 0 && (
          <div className="glass-card p-3 md:p-6 mb-4 md:mb-6 bg-primary/5">
            <h3 className="font-heading font-semibold text-base md:text-lg text-primary mb-2 md:mb-3">📋 Points clés à retenir</h3>
            <ul className="space-y-1.5 md:space-y-2">
              {selectedChapter.points_cles.map((p, i) => <li key={i} className="flex items-start gap-2 text-sm md:text-base"><span className="text-primary mt-0.5">•</span> {p}</li>)}
            </ul>
          </div>
        )}

        {selectedChapter.conseil_revision && (
          <div className="glass-card p-3 md:p-6 mb-4 md:mb-6 bg-accent/5 border-accent/20">
            <h3 className="font-heading font-semibold text-base md:text-lg text-accent mb-2">💡 Conseil de révision</h3>
            <p className="text-sm md:text-base text-muted-foreground">{selectedChapter.conseil_revision}</p>
          </div>
        )}

        <button onClick={() => setSelectedChapter(null)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft size={18} /> Retour aux chapitres
        </button>
      </div>
    );
  }

  // ── Subject / Chapter List ──────────────────────────────────────────────────
  if (selectedSubject && selectedSessionId !== null) {
    const currentSubject = subjects.find(s => s.id === selectedSubject.id) || selectedSubject;
    const chapitres = isAdmin ? currentSubject.chapitres : currentSubject.chapitres.filter(c => c.published);
    return (
      <div className="max-w-4xl mx-auto animate-fade-in">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6 flex-wrap">
          <button onClick={() => { setSelectedSessionId(null); setSelectedSubject(null); }} className="hover:text-foreground transition-colors">Accueil</button>
          <ChevronRight size={14} />
          <button onClick={() => setSelectedSubject(null)} className="hover:text-foreground transition-colors">{currentSession?.nom}</button>
          <ChevronRight size={14} />
          <span className="text-foreground">{currentSubject.nom}</span>
        </div>

        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{currentSubject.icone}</span>
            <h1 className="font-heading font-bold text-2xl">{currentSubject.nom}</h1>
          </div>
          {isAdmin && (
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setShowImportCourse(true)} className="px-4 py-2 rounded-lg bg-accent/20 text-accent text-sm font-medium hover:bg-accent/30 transition-colors flex items-center gap-2">
                <FileUp size={16} /> Importer (PDF/Image)
              </button>
              <button onClick={() => setShowCreateChapter(true)} className="px-4 py-2 rounded-lg gradient-bg text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2">
                <Plus size={16} /> Nouveau Chapitre
              </button>
              <button onClick={() => handleDeleteSubject(currentSubject.id)} className="px-4 py-2 rounded-lg bg-destructive/20 text-destructive text-sm hover:bg-destructive/30 transition-colors flex items-center gap-2">
                <Trash2 size={16} /> Supprimer
              </button>
            </div>
          )}
        </div>

        {showCreateChapter && (
          <div className="glass-card p-4 mb-6 animate-scale-in">
            <div className="flex gap-3">
              <input value={newChapterTitle} onChange={e => setNewChapterTitle(e.target.value)} placeholder="Titre du chapitre" className="flex-1 px-4 py-2 rounded-lg bg-secondary border border-border focus:border-primary outline-none text-foreground" />
              <button onClick={handleCreateChapter} className="px-4 py-2 rounded-lg gradient-bg text-primary-foreground text-sm font-medium">Créer</button>
              <button onClick={() => setShowCreateChapter(false)} className="px-4 py-2 rounded-lg bg-secondary text-foreground text-sm">Annuler</button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {chapitres.map((ch, i) => (
            <div key={ch.id} className="glass-card-hover p-4 cursor-pointer" onClick={() => setSelectedChapter(ch)} style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold shrink-0" style={{ backgroundColor: currentSubject.couleur + '20', color: currentSubject.couleur }}>{i + 1}</div>
                  <div className="min-w-0">
                    <h3 className="font-medium truncate">{ch.titre}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {difficultyBadge(ch.difficulte)}
                      {!ch.published && <span className="text-xs px-2 py-0.5 rounded-full bg-warning/20 text-warning">Brouillon</span>}
                      {ch.learned && <span className="text-xs text-success">✅</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isAdmin && (
                    <>
                      <button onClick={(e) => { e.stopPropagation(); handlePublishChapter(ch.id); }} className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${ch.published ? 'bg-success/20 text-success' : 'bg-primary/20 text-primary'}`}>
                        {ch.published ? '✅ Publié' : '📤 Publier'}
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteChapter(ch.id); }} className="p-1 text-destructive/60 hover:text-destructive transition-colors"><Trash2 size={16} /></button>
                    </>
                  )}
                  <ChevronRight size={18} className="text-muted-foreground" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {chapitres.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <BookOpen size={48} className="mx-auto mb-3 opacity-30" />
            <p>Aucun chapitre {isAdmin ? '' : 'publié'} pour cette matière</p>
          </div>
        )}

        <button onClick={() => setSelectedSubject(null)} className="flex items-center gap-2 mt-6 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={18} /> Retour aux matières
        </button>

        {showImportCourse && (
          <ImportCourseModal open={showImportCourse} onClose={() => setShowImportCourse(false)} subjectName={currentSubject.nom} onImport={handleImportChapter} />
        )}
      </div>
    );
  }

  // ── Subjects Grid (inside a session) ───────────────────────────────────────
  if (selectedSessionId !== null) {
    return (
      <div className="max-w-6xl mx-auto animate-fade-in">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4 flex-wrap">
          <button onClick={() => setSelectedSessionId(null)} className="hover:text-foreground transition-colors">Accueil</button>
          <ChevronRight size={14} />
          <span className="text-foreground">{currentSession?.nom}</span>
        </div>

        <div className="flex items-center justify-end mb-4 flex-wrap gap-2">
          {isAdmin && (
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setShowCreateSubject(true)} className="px-4 py-2 rounded-lg gradient-bg text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2">
                <Plus size={16} /> Nouvelle Matière
              </button>
              {selectedSessionId !== 'default' && (
                <button onClick={() => handleDeleteSession(selectedSessionId)} className="px-4 py-2 rounded-lg bg-destructive/20 text-destructive text-sm hover:bg-destructive/30 flex items-center gap-2">
                  <Trash2 size={16} /> Supprimer la session
                </button>
              )}
            </div>
          )}
        </div>

        <div className="relative mb-6">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher dans les cours..." className="w-full pl-11 pr-4 py-3 rounded-xl bg-card/60 backdrop-blur-sm border border-border focus:border-primary outline-none transition-all text-foreground" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSubjects.map((subject, i) => (
            <div key={subject.id} onClick={() => setSelectedSubject(subject)} className="glass-card p-6 cursor-pointer animate-slide-up hover:shadow-md transition-shadow" style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ backgroundColor: subject.couleur + '20' }}>{subject.icone}</div>
                <div>
                  <h3 className="font-heading font-semibold text-lg">{subject.nom}</h3>
                  <p className="text-sm text-muted-foreground">{subject.chapitres.filter(c => isAdmin || c.published).length} chapitre(s)</p>
                </div>
              </div>
              <div className="h-1 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ backgroundColor: subject.couleur, width: `${Math.max(10, (subject.chapitres.filter(c => c.learned).length / Math.max(1, subject.chapitres.length)) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>

        {filteredSubjects.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <BookOpen size={48} className="mx-auto mb-3 opacity-30" />
            <p>{isAdmin ? 'Aucune matière dans cette session' : 'Aucun cours disponible'}</p>
          </div>
        )}

        <CreateSubjectModal
          open={showCreateSubject}
          onClose={() => setShowCreateSubject(false)}
          onCreate={handleCreateSubject}
          sessions={sessions}
          currentSessionId={selectedSessionId}
        />
      </div>
    );
  }

  // ── Sessions Grid (home) ────────────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      {isAdmin && (
        <div className="flex justify-end mb-4">
          <button onClick={() => setShowCreateSession(true)} className="px-4 py-2 rounded-lg gradient-bg text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2">
            <Plus size={16} /> Nouvelle Session
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sessions.map((session, i) => {
          const count = subjectsCountBySession[session.id] || 0;
          const sessionSubs = subjects.filter(s => (s.session_id || 'default') === session.id);
          const totalChapters = sessionSubs.reduce((acc, s) => acc + (isAdmin ? s.chapitres.length : s.chapitres.filter(c => c.published).length), 0);
          const learnedChapters = sessionSubs.reduce((acc, s) => acc + s.chapitres.filter(c => c.learned).length, 0);
          const allChapters = sessionSubs.reduce((acc, s) => acc + s.chapitres.length, 0);
          return (
            <div key={session.id} onClick={() => setSelectedSessionId(session.id)} className="glass-card p-6 cursor-pointer animate-slide-up hover:shadow-md transition-all hover:scale-[1.02] relative" style={{ animationDelay: `${i * 0.1}s` }}>
              {isAdmin && (
                <button
                  onClick={e => { e.stopPropagation(); setRenameSession(session); }}
                  className="absolute top-3 right-3 p-1.5 rounded-lg bg-secondary/80 hover:bg-muted transition-colors z-10"
                  title="Renommer la session"
                >
                  <Pencil size={13} className="text-muted-foreground" />
                </button>
              )}
              <div className="flex items-start justify-between mb-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl" style={{ backgroundColor: session.couleur + '20' }}>{session.icone}</div>
                <span className="text-xs px-2 py-1 rounded-full bg-secondary text-muted-foreground mr-6">{count} matière{count > 1 ? 's' : ''}</span>
              </div>
              <h3 className="font-heading font-bold text-xl mb-1">{session.nom}</h3>
              <p className="text-sm text-muted-foreground mb-4">{totalChapters} chapitre{totalChapters > 1 ? 's' : ''} disponible{totalChapters > 1 ? 's' : ''}</p>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ backgroundColor: session.couleur, width: `${Math.max(5, allChapters > 0 ? (learnedChapters / allChapters) * 100 : 5)}%` }} />
              </div>
              {allChapters > 0 && <p className="text-xs text-muted-foreground mt-1.5">{learnedChapters}/{allChapters} appris</p>}
            </div>
          );
        })}
      </div>

      {sessions.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <FolderOpen size={48} className="mx-auto mb-3 opacity-30" />
          <p>Aucune session créée</p>
        </div>
      )}

      <CreateSessionModal open={showCreateSession} onClose={() => setShowCreateSession(false)} onCreate={handleCreateSession} />
      <RenameSessionModal open={!!renameSession} onClose={() => setRenameSession(null)} session={renameSession} onRename={handleRenameSession} />
    </div>
  );
}
