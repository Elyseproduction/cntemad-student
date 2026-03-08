import { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Plus, Trash2, X, Play, Video, Filter } from 'lucide-react';

function getYoutubeId(url: string): string {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?\s]+)/);
  return match?.[1] || '';
}

export function VideoPage() {
  const { videos, setVideos, subjects, isAdmin } = useApp();
  const [filter, setFilter] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newMatiere, setNewMatiere] = useState('');

  const filteredVideos = useMemo(() => {
    const filtered = filter ? videos.filter(v => v.matiere === filter) : videos;
    return [...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [videos, filter]);

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

  const matieres = [...new Set(videos.map(v => v.matiere).filter(Boolean))];

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
          <div key={video.id} className="glass-card-hover overflow-hidden animate-slide-up" style={{ animationDelay: `${i * 0.1}s` }}>
            <div className="relative cursor-pointer group" onClick={() => setSelectedVideo(video.id)}>
              <img
                src={`https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`}
                alt={video.titre}
                className="w-full aspect-video object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-background/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="w-14 h-14 rounded-full gradient-bg flex items-center justify-center">
                  <Play size={24} className="text-primary-foreground ml-1" />
                </div>
              </div>
            </div>
            <div className="p-4">
              <h3 className="font-medium text-sm line-clamp-2 mb-2">{video.titre}</h3>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {video.matiere && <span className="text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary">{video.matiere}</span>}
                  <span className="text-xs text-muted-foreground">{video.date}</span>
                </div>
                {isAdmin && (
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(video.id); }} className="p-1 text-destructive/60 hover:text-destructive transition-colors">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredVideos.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Video size={48} className="mx-auto mb-3 opacity-30" />
          <p>Aucune vidéo disponible</p>
        </div>
      )}

      {/* Video Modal */}
      {selectedVideo && (() => {
        const video = videos.find(v => v.id === selectedVideo);
        if (!video) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-background/90 backdrop-blur-sm" onClick={() => setSelectedVideo(null)} />
            <div className="relative w-full max-w-4xl animate-scale-in">
              <button onClick={() => setSelectedVideo(null)} className="absolute -top-10 right-0 text-muted-foreground hover:text-foreground">
                <X size={24} />
              </button>
              <div className="aspect-video rounded-xl overflow-hidden">
                <iframe
                  src={`https://www.youtube.com/embed/${video.youtubeId}?autoplay=1`}
                  title={video.titre}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>
              <div className="mt-4">
                <h2 className="font-heading font-semibold text-xl">{video.titre}</h2>
                {video.description && <p className="text-muted-foreground mt-1">{video.description}</p>}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
