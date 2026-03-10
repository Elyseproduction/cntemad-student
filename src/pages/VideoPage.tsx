import { useState, useMemo, useCallback, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Plus, Trash2, X, Play, Video, Filter, ChevronLeft, ChevronRight, Calendar, BookOpen, Maximize2, Minimize2 } from 'lucide-react';

function getYoutubeId(url: string): string {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?\s]+)/);
  return match?.[1] || '';
}

export function VideoPage() {
  const { videos, setVideos, subjects, isAdmin } = useApp();
  const [filter, setFilter] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newMatiere, setNewMatiere] = useState('');

  const filteredVideos = useMemo(() => {
    const filtered = filter ? videos.filter(v => v.matiere === filter) : videos;
    return [...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [videos, filter]);

  const currentVideoIndex = useMemo(() => {
    if (!selectedVideo) return -1;
    return filteredVideos.findIndex(v => v.id === selectedVideo);
  }, [selectedVideo, filteredVideos]);

  const handleAdd = () => {
    const ytId = getYoutubeId(newUrl);
    if (!newTitle || !newUrl || !ytId) return;
    setVideos(prev => [...prev, {
      id: Date.now().toString(),
      titre: newTitle,
      description: newDesc,
      youtubeUrl: newUrl,
      youtubeId: ytId,
      matiere: newMatiere,
      date: new Date().toISOString().split('T')[0],
    }]);
    setNewTitle(''); setNewDesc(''); setNewUrl(''); setNewMatiere('');
    setShowAdd(false);
  };

  const handleDelete = (id: string) => {
    setVideos(prev => prev.filter(v => v.id !== id));
  };

  const navigateVideo = useCallback((direction: 'prev' | 'next') => {
    if (currentVideoIndex === -1) return;
    const newIndex = direction === 'prev' ? currentVideoIndex - 1 : currentVideoIndex + 1;
    if (newIndex >= 0 && newIndex < filteredVideos.length) {
      setSelectedVideo(filteredVideos[newIndex].id);
    }
  }, [currentVideoIndex, filteredVideos]);

  // Keyboard navigation
  useEffect(() => {
    if (!selectedVideo) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedVideo(null);
      if (e.key === 'ArrowLeft') navigateVideo('prev');
      if (e.key === 'ArrowRight') navigateVideo('next');
      if (e.key === 'f' || e.key === 'F') setIsTheaterMode(p => !p);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectedVideo, navigateVideo]);

  // Lock body scroll when modal open
  useEffect(() => {
    if (selectedVideo) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setIsTheaterMode(false);
    }
    return () => { document.body.style.overflow = ''; };
  }, [selectedVideo]);

  const matieres = [...new Set(videos.map(v => v.matiere).filter(Boolean))];

  const hasPrev = currentVideoIndex > 0;
  const hasNext = currentVideoIndex < filteredVideos.length - 1;

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="font-heading font-bold text-2xl md:text-3xl">🎬 Vidéothèque</h1>
          <p className="text-muted-foreground mt-1">{videos.length} vidéo(s) disponible(s)</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowAdd(true)} className="px-4 py-2 rounded-lg gradient-bg text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2">
            <Plus size={16} /> Ajouter une vidéo
          </button>
        )}
      </div>

      {/* Filter */}
      {matieres.length > 0 && (
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <Filter size={16} className="text-muted-foreground" />
          <button onClick={() => setFilter('')} className={`px-3 py-1.5 rounded-lg text-sm transition-all ${!filter ? 'bg-primary/15 text-primary border border-primary/20' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>
            Toutes
          </button>
          {matieres.map(m => (
            <button key={m} onClick={() => setFilter(m)} className={`px-3 py-1.5 rounded-lg text-sm transition-all ${filter === m ? 'bg-primary/15 text-primary border border-primary/20' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>
              {m}
            </button>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <div className="glass-card p-6 mb-6 animate-scale-in">
          <h3 className="font-heading font-semibold text-lg mb-4">Ajouter une vidéo</h3>
          <div className="space-y-3">
            <input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="Lien YouTube" className="w-full px-4 py-3 rounded-lg bg-secondary border border-border focus:border-primary outline-none text-foreground" />
            <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Titre" className="w-full px-4 py-3 rounded-lg bg-secondary border border-border focus:border-primary outline-none text-foreground" />
            <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description" rows={2} className="w-full px-4 py-3 rounded-lg bg-secondary border border-border focus:border-primary outline-none text-foreground resize-none" />
            <select value={newMatiere} onChange={e => setNewMatiere(e.target.value)} className="w-full px-4 py-3 rounded-lg bg-secondary border border-border focus:border-primary outline-none text-foreground">
              <option value="">Matière associée</option>
              {subjects.map(s => <option key={s.id} value={s.nom}>{s.nom}</option>)}
            </select>
            <div className="flex gap-3">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-2 rounded-lg bg-secondary text-foreground">Annuler</button>
              <button onClick={handleAdd} className="flex-1 py-2 rounded-lg gradient-bg text-primary-foreground font-medium">➕ Ajouter</button>
            </div>
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVideos.map((video, i) => (
          <div key={video.id} className="glass-card-hover overflow-hidden animate-slide-up" style={{ animationDelay: `${i * 0.05}s` }}>
            <div className="relative cursor-pointer group" onClick={() => setSelectedVideo(video.id)}>
              <img
                src={`https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`}
                alt={video.titre}
                className="w-full aspect-video object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-background/50 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full gradient-bg flex items-center justify-center shadow-lg scale-90 group-hover:scale-100 transition-transform duration-300">
                  <Play size={28} className="text-primary-foreground ml-1" fill="currentColor" />
                </div>
              </div>
              {/* Duration-style badge */}
              <div className="absolute bottom-2 right-2 bg-background/80 backdrop-blur-sm text-foreground text-xs px-2 py-0.5 rounded font-medium">
                YouTube
              </div>
            </div>
            <div className="p-4">
              <h3 className="font-heading font-medium text-sm line-clamp-2 mb-2">{video.titre}</h3>
              {video.description && (
                <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{video.description}</p>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {video.matiere && (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                      <BookOpen size={10} />
                      {video.matiere}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar size={10} />
                    {video.date}
                  </span>
                </div>
                {isAdmin && (
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(video.id); }} className="p-1.5 rounded-md text-destructive/60 hover:text-destructive hover:bg-destructive/10 transition-colors">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredVideos.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Video size={56} className="mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium">Aucune vidéo disponible</p>
          <p className="text-sm mt-1">Les vidéos ajoutées apparaîtront ici</p>
        </div>
      )}

      {/* Professional Video Player Modal */}
      {selectedVideo && (() => {
        const video = videos.find(v => v.id === selectedVideo);
        if (!video) return null;
        return (
          <div className="fixed inset-0 z-50 flex flex-col animate-fade-in" style={{ animationDuration: '0.2s' }}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-background/95 backdrop-blur-md" onClick={() => setSelectedVideo(null)} />

            {/* Top bar */}
            <div className="relative z-10 flex items-center justify-between px-4 md:px-6 py-3 border-b border-border/50">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => setSelectedVideo(null)}
                  className="p-2 rounded-lg hover:bg-secondary transition-colors flex-shrink-0"
                >
                  <X size={20} className="text-muted-foreground" />
                </button>
                <div className="min-w-0">
                  <h2 className="font-heading font-semibold text-sm md:text-base truncate">{video.titre}</h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    {video.matiere && (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                        <BookOpen size={10} />
                        {video.matiere}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">{video.date}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Navigation */}
                <div className="hidden sm:flex items-center gap-1 mr-2">
                  <span className="text-xs text-muted-foreground">
                    {currentVideoIndex + 1} / {filteredVideos.length}
                  </span>
                </div>
                <button
                  onClick={() => navigateVideo('prev')}
                  disabled={!hasPrev}
                  className="p-2 rounded-lg hover:bg-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Vidéo précédente (←)"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={() => navigateVideo('next')}
                  disabled={!hasNext}
                  className="p-2 rounded-lg hover:bg-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Vidéo suivante (→)"
                >
                  <ChevronRight size={18} />
                </button>
                <button
                  onClick={() => setIsTheaterMode(p => !p)}
                  className="p-2 rounded-lg hover:bg-secondary transition-colors hidden md:flex"
                  title="Mode cinéma (F)"
                >
                  {isTheaterMode ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                </button>
              </div>
            </div>

            {/* Player area */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-2 md:p-6 overflow-auto">
              <div className={`w-full transition-all duration-300 ${isTheaterMode ? 'max-w-full' : 'max-w-5xl'}`}>
                <div className="aspect-video rounded-xl overflow-hidden bg-background shadow-2xl shadow-primary/10 border border-border/30">
                  <iframe
                    src={`https://www.youtube.com/embed/${video.youtubeId}?autoplay=1&rel=0&modestbranding=1&playsinline=1&enablejsapi=1`}
                    title={video.titre}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                    allowFullScreen
                    className="w-full h-full"
                    style={{ border: 'none' }}
                  />
                </div>

                {/* Video info below player */}
                {video.description && (
                  <div className="mt-4 p-4 rounded-xl bg-secondary/50 border border-border/30">
                    <p className="text-sm text-muted-foreground leading-relaxed">{video.description}</p>
                  </div>
                )}

                {/* Suggested next videos */}
                {hasNext && (
                  <div className="mt-4">
                    <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wider">Vidéo suivante</p>
                    <button
                      onClick={() => navigateVideo('next')}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary/50 border border-border/30 hover:border-primary/30 hover:bg-secondary transition-all group text-left"
                    >
                      <img
                        src={`https://img.youtube.com/vi/${filteredVideos[currentVideoIndex + 1].youtubeId}/mqdefault.jpg`}
                        alt=""
                        className="w-28 md:w-36 aspect-video object-cover rounded-lg flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <h4 className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                          {filteredVideos[currentVideoIndex + 1].titre}
                        </h4>
                        {filteredVideos[currentVideoIndex + 1].matiere && (
                          <span className="text-xs text-muted-foreground">{filteredVideos[currentVideoIndex + 1].matiere}</span>
                        )}
                      </div>
                      <ChevronRight size={18} className="text-muted-foreground flex-shrink-0 ml-auto" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
