import { useState, useMemo } from 'react';
import { useApp, Subject, Chapter } from '@/contexts/AppContext';
import { ArrowLeft, Plus, Trash2, Search, ChevronRight, Upload, CheckCircle, RotateCcw, BookOpen } from 'lucide-react';

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
    case 'h1':
      return (
        <div className="mt-8 mb-4">
          <h2 className="section-h1 pb-2 border-b border-primary/30">{section.titre}</h2>
          <p className="mt-3 leading-relaxed whitespace-pre-wrap">{renderContent(section.contenu, section.mots_cles)}</p>
        </div>
      );
    case 'h2':
      return (
        <div className="mt-6 mb-3">
          <h3 className="section-h2">{section.titre}</h3>
          <p className="mt-2 leading-relaxed whitespace-pre-wrap">{renderContent(section.contenu, section.mots_cles)}</p>
        </div>
      );
    case 'h3':
      return (
        <div className="mt-4 mb-2">
          <h4 className="section-h3">{section.titre}</h4>
          <p className="mt-1 leading-relaxed whitespace-pre-wrap">{renderContent(section.contenu, section.mots_cles)}</p>
        </div>
      );
    case 'definition':
      return (
        <div className="my-4 p-4 rounded-xl border-l-4 border-accent bg-accent/10">
          <p className="font-semibold text-accent mb-1">📌 {section.titre}</p>
          <p className="leading-relaxed">{renderContent(section.contenu, section.mots_cles)}</p>
        </div>
      );
    case 'retenir':
      return (
        <div className="my-4 p-4 rounded-xl bg-primary/10 border border-primary/20">
          <p className="font-semibold text-primary mb-1">💡 {section.titre}</p>
          <p className="leading-relaxed">{renderContent(section.contenu, section.mots_cles)}</p>
        </div>
      );
    case 'attention':
      return (
        <div className="my-4 p-4 rounded-xl bg-warning/10 border border-warning/20">
          <p className="font-semibold text-warning mb-1">⚠️ {section.titre}</p>
          <p className="leading-relaxed">{renderContent(section.contenu, section.mots_cles)}</p>
        </div>
      );
    case 'code':
      return (
        <div className="my-4">
          <p className="text-sm text-muted-foreground mb-1">{section.titre}</p>
          <pre className="p-4 rounded-xl bg-muted/50 border border-border overflow-x-auto font-mono text-sm leading-relaxed">
            <code>{section.contenu}</code>
          </pre>
        </div>
      );
    case 'tableau':
      return (
        <div className="my-4">
          <p className="font-semibold mb-2">{section.titre}</p>
          <div className="p-4 rounded-xl bg-muted/30 border border-border overflow-x-auto">
            <pre className="font-mono text-sm">{section.contenu}</pre>
          </div>
        </div>
      );
    case 'schema':
      return (
        <div className="my-4 p-4 rounded-xl bg-muted/30 border border-dashed border-primary/30">
          <p className="font-semibold text-primary mb-2">🔷 {section.titre}</p>
          <pre className="font-mono text-sm leading-relaxed">{section.contenu}</pre>
        </div>
      );
    default:
      return null;
  }
}

// Create subject modal
function CreateSubjectModal({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (nom: string, couleur: string, icone: string) => void }) {
  const [nom, setNom] = useState('');
  const [couleur, setCouleur] = useState('#6C63FF');
  const [icone, setIcone] = useState('📘');
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
            <label className="text-sm text-muted-foreground mb-2 block">Couleur</label>
            <input type="color" value={couleur} onChange={e => setCouleur(e.target.value)} className="w-12 h-10 rounded cursor-pointer" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Icône</label>
            <div className="flex flex-wrap gap-2">
              {icons.map(ic => (
                <button key={ic} onClick={() => setIcone(ic)} className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${icone === ic ? 'bg-primary/20 ring-2 ring-primary' : 'bg-secondary hover:bg-muted'}`}>
                  {ic}
                </button>
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

export function CoursesPage() {
  const { subjects, setSubjects, isAdmin, setActiveTab } = useApp();
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [search, setSearch] = useState('');
  const [showCreateSubject, setShowCreateSubject] = useState(false);
  const [showCreateChapter, setShowCreateChapter] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [readProgress, setReadProgress] = useState(0);

  const publishedSubjects = useMemo(() => {
    if (isAdmin) return subjects;
    return subjects.map(s => ({ ...s, chapitres: s.chapitres.filter(c => c.published) })).filter(s => s.chapitres.length > 0);
  }, [subjects, isAdmin]);

  const filteredSubjects = useMemo(() => {
    if (!search) return publishedSubjects;
    const q = search.toLowerCase();
    return publishedSubjects.filter(s =>
      s.nom.toLowerCase().includes(q) ||
      s.chapitres.some(c => c.titre.toLowerCase().includes(q))
    );
  }, [publishedSubjects, search]);

  const handleCreateSubject = (nom: string, couleur: string, icone: string) => {
    setSubjects(prev => [...prev, { id: Date.now().toString(), nom, couleur, icone, chapitres: [] }]);
  };

  const handleDeleteSubject = (id: string) => {
    setSubjects(prev => prev.filter(s => s.id !== id));
    setSelectedSubject(null);
  };

  const handleCreateChapter = () => {
    if (!selectedSubject || !newChapterTitle.trim()) return;
    const newChapter: Chapter = {
      id: Date.now().toString(),
      titre: newChapterTitle,
      difficulte: 'Facile',
      resume_intro: '',
      sections: [],
      schemas_detectes: [],
      points_cles: [],
      conseil_revision: '',
      published: false,
    };
    setSubjects(prev => prev.map(s =>
      s.id === selectedSubject.id ? { ...s, chapitres: [...s.chapitres, newChapter] } : s
    ));
    setNewChapterTitle('');
    setShowCreateChapter(false);
  };

  const handleDeleteChapter = (chapterId: string) => {
    if (!selectedSubject) return;
    setSubjects(prev => prev.map(s =>
      s.id === selectedSubject.id ? { ...s, chapitres: s.chapitres.filter(c => c.id !== chapterId) } : s
    ));
  };

  const handlePublishChapter = (chapterId: string) => {
    if (!selectedSubject) return;
    setSubjects(prev => prev.map(s =>
      s.id === selectedSubject.id ? { ...s, chapitres: s.chapitres.map(c => c.id === chapterId ? { ...c, published: !c.published } : c) } : s
    ));
  };

  const handleMarkLearned = () => {
    if (!selectedSubject || !selectedChapter) return;
    setSubjects(prev => prev.map(s =>
      s.id === selectedSubject.id ? {
        ...s, chapitres: s.chapitres.map(c => c.id === selectedChapter.id ? { ...c, learned: !c.learned } : c)
      } : s
    ));
    setSelectedChapter(prev => prev ? { ...prev, learned: !prev.learned } : prev);
  };

  // Chapter View
  if (selectedChapter && selectedSubject) {
    return (
      <div className="max-w-4xl mx-auto animate-fade-in" onScroll={(e) => {
        const el = e.target as HTMLElement;
        setReadProgress(Math.round((el.scrollTop / (el.scrollHeight - el.clientHeight)) * 100));
      }}>
        {/* Progress bar */}
        <div className="fixed top-0 left-0 right-0 h-1 bg-muted z-50">
          <div className="h-full gradient-bg transition-all duration-300" style={{ width: `${readProgress}%` }} />
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6 flex-wrap">
          <button onClick={() => { setSelectedSubject(null); setSelectedChapter(null); }} className="hover:text-foreground transition-colors">Accueil</button>
          <ChevronRight size={14} />
          <button onClick={() => setSelectedChapter(null)} className="hover:text-foreground transition-colors">{selectedSubject.nom}</button>
          <ChevronRight size={14} />
          <span className="text-foreground">{selectedChapter.titre}</span>
        </div>

        {/* Header */}
        <div className="glass-card p-6 mb-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="section-h1 mb-2">{selectedChapter.titre}</h1>
              <div className="flex items-center gap-3">
                {difficultyBadge(selectedChapter.difficulte)}
                {selectedChapter.learned && <span className="text-xs px-2 py-0.5 rounded-full bg-success/20 text-success">✅ Appris</span>}
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={handleMarkLearned} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedChapter.learned ? 'bg-success/20 text-success' : 'bg-secondary text-foreground hover:bg-muted'}`}>
                <CheckCircle size={16} className="inline mr-1" /> {selectedChapter.learned ? 'Appris ✅' : 'Marquer comme appris'}
              </button>
              <button onClick={() => setActiveTab('exercices')} className="px-4 py-2 rounded-lg gradient-bg text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
                🧠 Générer des exercices
              </button>
            </div>
          </div>
          {selectedChapter.resume_intro && <p className="mt-4 text-muted-foreground leading-relaxed">{selectedChapter.resume_intro}</p>}
        </div>

        {/* Sections */}
        <div className="glass-card p-6 mb-6">
          {selectedChapter.sections.map((section, i) => (
            <SectionRenderer key={i} section={section} />
          ))}
        </div>

        {/* Schemas */}
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

        {/* Points clés */}
        {selectedChapter.points_cles.length > 0 && (
          <div className="glass-card p-6 mb-6 bg-primary/5">
            <h3 className="font-heading font-semibold text-lg text-primary mb-3">📋 Points clés à retenir</h3>
            <ul className="space-y-2">
              {selectedChapter.points_cles.map((p, i) => (
                <li key={i} className="flex items-start gap-2"><span className="text-primary mt-0.5">•</span> {p}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Conseil */}
        {selectedChapter.conseil_revision && (
          <div className="glass-card p-6 mb-6 bg-accent/5 border-accent/20">
            <h3 className="font-heading font-semibold text-lg text-accent mb-2">💡 Conseil de révision</h3>
            <p className="text-muted-foreground">{selectedChapter.conseil_revision}</p>
          </div>
        )}

        <button onClick={() => setSelectedChapter(null)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft size={18} /> Retour aux chapitres
        </button>
      </div>
    );
  }

  // Chapter List
  if (selectedSubject) {
    const currentSubject = subjects.find(s => s.id === selectedSubject.id) || selectedSubject;
    const chapitres = isAdmin ? currentSubject.chapitres : currentSubject.chapitres.filter(c => c.published);

    return (
      <div className="max-w-4xl mx-auto animate-fade-in">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <button onClick={() => setSelectedSubject(null)} className="hover:text-foreground transition-colors">Accueil</button>
          <ChevronRight size={14} />
          <span className="text-foreground">{currentSubject.nom}</span>
        </div>

        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{currentSubject.icone}</span>
            <h1 className="font-heading font-bold text-2xl">{currentSubject.nom}</h1>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
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
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold shrink-0" style={{ backgroundColor: currentSubject.couleur + '20', color: currentSubject.couleur }}>
                    {i + 1}
                  </div>
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
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteChapter(ch.id); }} className="p-1 text-destructive/60 hover:text-destructive transition-colors">
                        <Trash2 size={16} />
                      </button>
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
      </div>
    );
  }

  // Subjects Grid
  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="font-heading font-bold text-2xl md:text-3xl">📚 Cours</h1>
          <p className="text-muted-foreground mt-1">Explorez vos matières et chapitres</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowCreateSubject(true)} className="px-4 py-2 rounded-lg gradient-bg text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2">
            <Plus size={16} /> Nouvelle Matière
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher dans les cours..." className="w-full pl-11 pr-4 py-3 rounded-xl bg-card/60 backdrop-blur-sm border border-border focus:border-primary outline-none transition-all text-foreground" />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSubjects.map((subject, i) => (
          <div
            key={subject.id}
            onClick={() => setSelectedSubject(subject)}
            className="glass-card-hover p-6 cursor-pointer animate-slide-up"
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ backgroundColor: subject.couleur + '20' }}>
                {subject.icone}
              </div>
              <div>
                <h3 className="font-heading font-semibold text-lg">{subject.nom}</h3>
                <p className="text-sm text-muted-foreground">{subject.chapitres.filter(c => isAdmin || c.published).length} chapitre(s)</p>
              </div>
            </div>
            <div className="h-1 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{
                backgroundColor: subject.couleur,
                width: `${Math.max(10, (subject.chapitres.filter(c => c.learned).length / Math.max(1, subject.chapitres.length)) * 100)}%`
              }} />
            </div>
          </div>
        ))}
      </div>

      {filteredSubjects.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Search size={48} className="mx-auto mb-3 opacity-30" />
          <p>Aucun résultat trouvé</p>
        </div>
      )}

      <CreateSubjectModal open={showCreateSubject} onClose={() => setShowCreateSubject(false)} onCreate={handleCreateSubject} />
    </div>
  );
}
