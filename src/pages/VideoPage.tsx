import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, X, Play, Video, Filter, ChevronLeft, ChevronRight, Calendar, BookOpen, Maximize2, Minimize2, Upload, FileVideo, Loader2 } from 'lucide-react';

function extractVideoThumbnail(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';

    const cleanup = () => URL.revokeObjectURL(url);

    video.onloadedmetadata = () => {
      // Seek to 10% of duration (or 3s max) to get a meaningful frame
      video.currentTime = Math.min(video.duration * 0.1, 3);
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 600;
        canvas.height = 338;
        const ctx = canvas.getContext('2d');
        if (!ctx) { cleanup(); resolve(null); return; }
        ctx.drawImage(video, 0, 0, 600, 338);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        cleanup();
        resolve(dataUrl);
      } catch {
        cleanup();
        resolve(null);
      }
    };

    video.onerror = () => { cleanup(); resolve(null); };
    // Timeout fallback after 8 seconds
    setTimeout(() => { cleanup(); resolve(null); }, 8000);

    video.src = url;
    video.load();
  });
}

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
  const [addMode, setAddMode] = useState<'youtube' | 'local'>('youtube');
  const [localFile, setLocalFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredVideos = useMemo(() => {
    const filtered = filter ? videos.filter(v => v.matiere === filter) : videos;
    return [...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [videos, filter]);

  const currentVideoIndex = useMemo(() => {
    if (!selectedVideo) return -1;
    return filteredVideos.findIndex(v => v.id === selectedVideo);
  }, [selectedVideo, filteredVideos]);

  const handleAdd = async () => {
    if (addMode === 'youtube') {
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
        videoType: 'youtube',
      }]);
      setNewTitle(''); setNewDesc(''); setNewUrl(''); setNewMatiere('');
      setShowAdd(false);
    } else {
      if (!newTitle || !localFile) return;
      setUploading(true);
      setUploadProgress(10);
      const ext = localFile.name.split('.').pop();
      const fileName = `videos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      setUploadProgress(30);
      const { error } = await supabase.storage.from('community-media').upload(fileName, localFile, {
        cacheControl: '3600',
        upsert: false,
      });
      if (error) {
        alert('Erreur upload : ' + error.message);
        setUploading(false);
        setUploadProgress(0);
        return;
      }
      setUploadProgress(80);
      const { data: urlData } = supabase.storage.from('community-media').getPublicUrl(fileName);

      // Extraire une frame de la vidéo comme miniature
      let finalThumbUrl: string | undefined;
      const thumbDataUrl = await extractVideoThumbnail(localFile);
      if (thumbDataUrl) {
        try {
          const res = await fetch(thumbDataUrl);
          const blob = await res.blob();
          const thumbFileName = `thumbnails/${Date.now()}-thumb.jpg`;
          const { error: thumbErr } = await supabase.storage.from('community-media').upload(thumbFileName, blob, {
            contentType: 'image/jpeg',
            cacheControl: '3600',
            upsert: false,
          });
          if (!thumbErr) {
            const { data: thumbUrl } = supabase.storage.from('community-media').getPublicUrl(thumbFileName);
            finalThumbUrl = thumbUrl.publicUrl;
          }
        } catch { /* si ça échoue, on continue sans miniature */ }
      }

      setVideos(prev => [...prev, {
        id: Date.now().toString(),
        titre: newTitle,
        description: newDesc,
        youtubeUrl: '',
        youtubeId: '',
        matiere: newMatiere,
        date: new Date().toISOString().split('T')[0],
        localUrl: urlData.publicUrl,
        videoType: 'local',
        thumbnailUrl: finalThumbUrl,
      }]);
      setUploadProgress(100);
      setUploading(false);
      setUploadProgress(0);
      setLocalFile(null);
      setNewTitle(''); setNewDesc(''); setNewMatiere('');
      setShowAdd(false);
    }
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

          {/* Toggle YouTube / Fichier local */}
          <div className="flex gap-2 mb-4 p-1 bg-secondary rounded-lg">
            <button
              onClick={() => setAddMode('youtube')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${addMode === 'youtube' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Video size={15} /> YouTube
            </button>
            <button
              onClick={() => setAddMode('local')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${addMode === 'local' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Upload size={15} /> Depuis mon appareil
            </button>
          </div>

          <div className="space-y-3">
            {addMode === 'youtube' ? (
              <input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="Lien YouTube (ex: https://youtube.com/watch?v=...)" className="w-full px-4 py-3 rounded-lg bg-secondary border border-border focus:border-primary outline-none text-foreground" />
            ) : (
              <>
                <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={e => setLocalFile(e.target.files?.[0] || null)} />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${localFile ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-secondary/50'}`}
                >
                  {localFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <FileVideo size={24} className="text-primary shrink-0" />
                      <div className="text-left min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{localFile.name}</p>
                        <p className="text-xs text-muted-foreground">{(localFile.size / (1024 * 1024)).toFixed(1)} Mo</p>
                      </div>
                      <button onClick={e => { e.stopPropagation(); setLocalFile(null); }} className="ml-auto p-1 hover:bg-muted rounded shrink-0"><X size={14} /></button>
                    </div>
                  ) : (
                    <div>
                      <Upload size={32} className="mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm font-medium">Cliquez pour choisir une vidéo</p>
                      <p className="text-xs text-muted-foreground mt-1">MP4, MOV, AVI, MKV...</p>
                    </div>
                  )}
                </div>
                {uploading && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Upload en cours...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  </div>
                )}
              </>
            )}
            <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Titre de la vidéo" className="w-full px-4 py-3 rounded-lg bg-secondary border border-border focus:border-primary outline-none text-foreground" />
            <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description (optionnel)" rows={2} className="w-full px-4 py-3 rounded-lg bg-secondary border border-border focus:border-primary outline-none text-foreground resize-none" />
            <select value={newMatiere} onChange={e => setNewMatiere(e.target.value)} className="w-full px-4 py-3 rounded-lg bg-secondary border border-border focus:border-primary outline-none text-foreground">
              <option value="">Matière associée</option>
              {subjects.map(s => <option key={s.id} value={s.nom}>{s.nom}</option>)}
            </select>
            <div className="flex gap-3">
              <button onClick={() => { setShowAdd(false); setLocalFile(null); setAddMode('youtube'); }} className="flex-1 py-2 rounded-lg bg-secondary text-foreground" disabled={uploading}>Annuler</button>
              <button
                onClick={handleAdd}
                disabled={uploading || (addMode === 'youtube' ? (!newTitle || !newUrl) : (!newTitle || !localFile))}
                className="flex-1 py-2 rounded-lg gradient-bg text-primary-foreground font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {uploading ? <><Loader2 size={16} className="animate-spin" /> Upload...</> : '➕ Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVideos.map((video, i) => (
          <div key={video.id} className="glass-card-hover overflow-hidden animate-slide-up" style={{ animationDelay: `${i * 0.05}s` }}>
            <div className="relative cursor-pointer group" onClick={() => setSelectedVideo(video.id)}>
              {video.videoType === 'local' ? (
                video.thumbnailUrl ? (
                  <img
                    src={video.thumbnailUrl}
                    alt={video.titre}
                    className="w-full aspect-video object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full aspect-video bg-secondary flex items-center justify-center">
                    <FileVideo size={40} className="text-primary/50" />
                  </div>
                )
              ) : (
                <img
                  src={`https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`}
                  alt={video.titre}
                  className="w-full aspect-video object-cover"
                  loading="lazy"
                />
              )}
              <div className="absolute inset-0 bg-background/50 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full gradient-bg flex items-center justify-center shadow-lg scale-90 group-hover:scale-100 transition-transform duration-300">
                  <Play size={28} className="text-primary-foreground ml-1" fill="currentColor" />
                </div>
              </div>
              <div className="absolute bottom-2 right-2 bg-background/80 backdrop-blur-sm text-foreground text-xs px-2 py-0.5 rounded font-medium">
                {video.videoType === 'local' ? '📁 Local' : 'YouTube'}
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

      {/* Professional Video Player Modal — rendered via portal to escape any z-index stacking context */}
      {selectedVideo && (() => {
        const video = videos.find(v => v.id === selectedVideo);
        if (!video) return null;
        return createPortal(
          <div
            style={{
              position: 'fixed',
              top: 0, left: 0,
              width: '100vw', height: '100vh',
              zIndex: 99999,
              display: 'flex', flexDirection: 'column',
              backgroundColor: '#000',
              overflow: 'hidden',
            }}
          >
            {/* Top bar */}
            <div
              className="relative z-10 flex items-center justify-between px-4 md:px-6 py-3 flex-shrink-0"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => setSelectedVideo(null)}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
                >
                  <X size={20} className="text-white/80" />
                </button>
                <div className="min-w-0">
                  <h2 className="font-heading font-semibold text-sm md:text-base truncate text-white">{video.titre}</h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    {video.matiere && (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/30 text-primary">
                        <BookOpen size={10} />
                        {video.matiere}
                      </span>
                    )}
                    <span className="text-xs text-white/50">{video.date}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="hidden sm:flex items-center gap-1 mr-2">
                  <span className="text-xs text-white/50">
                    {currentVideoIndex + 1} / {filteredVideos.length}
                  </span>
                </div>
                <button
                  onClick={() => navigateVideo('prev')}
                  disabled={!hasPrev}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-white"
                  title="Vidéo précédente (←)"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={() => navigateVideo('next')}
                  disabled={!hasNext}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-white"
                  title="Vidéo suivante (→)"
                >
                  <ChevronRight size={18} />
                </button>
                <button
                  onClick={() => setIsTheaterMode(p => !p)}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors hidden md:flex text-white"
                  title="Mode cinéma (F)"
                >
                  {isTheaterMode ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                </button>
              </div>
            </div>

            {/* Player area — perfectly centered on all devices */}
            <div
              className="relative z-10 flex-1 flex items-center justify-center"
              style={{ padding: '12px' }}
            >
              <div
                style={{
                  width: '100%',
                  maxWidth: isTheaterMode ? '100%' : '900px',
                  position: 'relative',
                  paddingTop: isTheaterMode ? '56.25%' : undefined,
                }}
              >
                {video.videoType === 'local' && video.localUrl ? (
                  <div style={{ position: 'relative', paddingTop: '56.25%' }}>
                    <video
                      key={video.localUrl}
                      src={video.localUrl}
                      controls
                      autoPlay
                      playsInline
                      style={{
                        position: 'absolute',
                        top: 0, left: 0,
                        width: '100%',
                        height: '100%',
                        borderRadius: '12px',
                        backgroundColor: '#000',
                      }}
                    />
                  </div>
                ) : isTheaterMode ? (
                  <iframe
                    key={video.youtubeId + '-theater'}
                    src={`https://www.youtube.com/embed/${video.youtubeId}?autoplay=1&rel=0&modestbranding=1&playsinline=1&enablejsapi=1&fs=1`}
                    title={video.titre}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                    allowFullScreen
                    style={{
                      position: 'absolute',
                      top: 0, left: 0,
                      width: '100%',
                      height: '100%',
                      border: 'none',
                      borderRadius: '12px',
                      backgroundColor: '#000',
                    }}
                  />
                ) : (
                  <div style={{ position: 'relative', paddingTop: '56.25%' }}>
                    <iframe
                      key={video.youtubeId}
                      src={`https://www.youtube.com/embed/${video.youtubeId}?autoplay=1&rel=0&modestbranding=1&playsinline=1&enablejsapi=1&fs=1`}
                      title={video.titre}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                      allowFullScreen
                      style={{
                        position: 'absolute',
                        top: 0, left: 0,
                        width: '100%',
                        height: '100%',
                        border: 'none',
                        borderRadius: '12px',
                        backgroundColor: '#000',
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Bottom info bar */}
            <div
              className="relative z-10 flex-shrink-0 px-4 pb-4 pt-2"
              style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                {video.description && (
                  <p className="text-xs text-white/50 mb-2 line-clamp-1">{video.description}</p>
                )}
                {hasNext && (() => {
                  const nextVid = filteredVideos[currentVideoIndex + 1];
                  return (
                    <button
                      onClick={() => navigateVideo('next')}
                      className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 transition-all group text-left"
                    >
                      {nextVid.videoType === 'local' ? (
                        <div className="w-16 aspect-video bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <FileVideo size={18} className="text-white/50" />
                        </div>
                      ) : (
                        <img
                          src={`https://img.youtube.com/vi/${nextVid.youtubeId}/mqdefault.jpg`}
                          alt=""
                          className="w-16 aspect-video object-cover rounded-lg flex-shrink-0"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-white/40 mb-0.5">Vidéo suivante</p>
                        <h4 className="text-sm font-medium truncate text-white/80 group-hover:text-white transition-colors">
                          {nextVid.titre}
                        </h4>
                      </div>
                      <ChevronRight size={16} className="text-white/40 flex-shrink-0" />
                    </button>
                  );
                })()}
              </div>
            </div>
          </div>
        , document.body);
      })()}
    </div>
  );
}
