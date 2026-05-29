import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Video, FileText, Layers, Search } from 'lucide-react';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';
import { useApp } from '@/contexts/AppContext';

interface SearchResult {
  id: string;
  type: 'subject' | 'chapter' | 'section' | 'video';
  title: string;
  subtitle?: string;
  tab: string;
  keywords: string;
}

export function GlobalSearch() {
  const { subjects, videos, setActiveTab } = useApp();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(v => !v);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    const handler = () => setOpen(true);
    window.addEventListener('unilearn:open-search', handler);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('unilearn:open-search', handler);
    };
  }, []);

  const results: SearchResult[] = useMemo(() => {
    const r: SearchResult[] = [];
    subjects.forEach(s => {
      r.push({
        id: `subject-${s.id}`,
        type: 'subject',
        title: `${s.icone} ${s.nom}`,
        subtitle: `${s.chapitres.length} chapitre${s.chapitres.length > 1 ? 's' : ''}`,
        tab: 'cours',
        keywords: s.nom,
      });
      s.chapitres.forEach(c => {
        r.push({
          id: `chapter-${c.id}`,
          type: 'chapter',
          title: c.titre,
          subtitle: `${s.nom} · ${c.difficulte}`,
          tab: 'cours',
          keywords: `${c.titre} ${s.nom} ${c.resume_intro} ${c.points_cles.join(' ')}`,
        });
        c.sections.forEach((sec, idx) => {
          r.push({
            id: `section-${c.id}-${idx}`,
            type: 'section',
            title: sec.titre,
            subtitle: `${c.titre} · ${sec.type}`,
            tab: 'cours',
            keywords: `${sec.titre} ${sec.contenu} ${(sec.mots_cles || []).join(' ')}`,
          });
        });
      });
    });
    videos.forEach(v => {
      r.push({
        id: `video-${v.id}`,
        type: 'video',
        title: v.titre,
        subtitle: `🎬 ${v.matiere}`,
        tab: 'videos',
        keywords: `${v.titre} ${v.description} ${v.matiere}`,
      });
    });
    return r;
  }, [subjects, videos]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return results.slice(0, 12);
    return results
      .filter(r => r.keywords.toLowerCase().includes(q) || r.title.toLowerCase().includes(q))
      .slice(0, 30);
  }, [results, query]);

  const grouped = useMemo(() => {
    const g: Record<string, SearchResult[]> = { subject: [], chapter: [], section: [], video: [] };
    filtered.forEach(r => g[r.type].push(r));
    return g;
  }, [filtered]);

  const onSelect = (r: SearchResult) => {
    setActiveTab(r.tab);
    try {
      sessionStorage.setItem('unilearn_search_target', JSON.stringify({ type: r.type, id: r.id, ts: Date.now() }));
    } catch {}
    setOpen(false);
    setQuery('');
  };

  const icons = {
    subject: <Layers className="text-primary" />,
    chapter: <BookOpen className="text-accent" />,
    section: <FileText className="text-muted-foreground" />,
    video: <Video className="text-destructive" />,
  };

  const labels = {
    subject: 'Matières',
    chapter: 'Chapitres',
    section: 'Sections',
    video: 'Vidéos',
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Rechercher matières, chapitres, vidéos…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList className="max-h-[60vh]">
        <CommandEmpty>
          <div className="py-6 text-center text-sm text-muted-foreground">
            <Search className="mx-auto mb-2 opacity-40" size={20} />
            Aucun résultat
          </div>
        </CommandEmpty>
        {(['subject', 'chapter', 'section', 'video'] as const).map(type =>
          grouped[type].length > 0 ? (
            <CommandGroup key={type} heading={labels[type]}>
              {grouped[type].map(r => (
                <CommandItem
                  key={r.id}
                  value={`${r.id}-${r.title}`}
                  onSelect={() => onSelect(r)}
                  className="gap-3 cursor-pointer"
                >
                  {icons[type]}
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="truncate text-sm font-medium">{r.title}</span>
                    {r.subtitle && (
                      <span className="truncate text-xs text-muted-foreground">{r.subtitle}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null,
        )}
      </CommandList>
      <div className="border-t px-3 py-2 text-[10px] text-muted-foreground flex items-center justify-between">
        <span>↑↓ naviguer · ↵ ouvrir · esc fermer</span>
        <span className="font-mono">Ctrl/⌘ + K</span>
      </div>
    </CommandDialog>
  );
}