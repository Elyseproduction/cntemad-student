import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Plus, Trash2, X, Play, Video, Filter,
  ChevronLeft, ChevronRight, Calendar, BookOpen,
  Upload, FileVideo, Loader2, Maximize2, Minimize2, Smartphone,
} from 'lucide-react';

/* ─── Extract a JPEG frame from a local video file ─────────────────────────── */
function extractVideoThumbnail(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const vid = document.createElement('video');
    vid.preload = 'metadata';
    vid.muted = true;
    vid.playsInline = true;
    vid.crossOrigin = 'anonymous';
    const cleanup = () => URL.revokeObjectURL(url);
    vid.onloadedmetadata = () => { vid.currentTime = Math.min(vid.duration * 0.1, 3); };
    vid.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 600; canvas.height = 338;
        const ctx = canvas.getContext('2d');
        if (!ctx) { cleanup(); resolve(null); return; }
        ctx.drawImage(vid, 0, 0, 600, 338);
        cleanup();
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      } catch { cleanup(); resolve(null); }
    };
    vid.onerror = () => { cleanup(); resolve(null); };
    setTimeout(() => { cleanup(); resolve(null); }, 8000);
    vid.src = url;
    vid.load();
  });
}

/* ─── YouTube ID extractor ─────────────────────────────────────────────────── */
function getYoutubeId(url: string): string {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?\s]+)/);
  return match?.[1] || '';
}

/* ─── Fullscreen helpers ─────────────────────────────────────────────────────*/
function requestFSon(el: HTMLElement) {
  if (el.requestFullscreen) return el.requestFullscreen({ navigationUI: 'hide' } as any);
  if ((el as any).webkitRequestFullscreen) return (el as any).webkitRequestFullscreen();
  if ((el as any).mozRequestFullScreen) return (el as any).mozRequestFullScreen();
}
function exitFS() {
  if (document.exitFullscreen) return document.exitFullscreen();
  if ((document as any).webkitExitFullscreen) return (document as any).webkitExitFullscreen();
  if ((document as any).mozCancelFullScreen) return (document as any).mozCancelFullScreen();
}
function isFSActive() {
  return !!(document.fullscreenElement || (document as any).webkitFullscreenElement || (document as any).mozFullScreenElement);
}

/* ─── Main component ────────────────────────────────────────────────────────── */
export function VideoPage() {
  const { videos, setVideos, subjects, sessions, isAdmin } = useApp();
  const [activeSession, setActiveSession] = useState('all');
  const [filter, setFilter] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [videoOrientation, setVideoOrientation] = useState<'landscape' | 'portrait'>('landscape'); // detected from video metadata
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
  const playerContainerRef = useRef<HTMLDivElement>(null);

  // Get matières that belong to the active session
  const sessionMatieres = useMemo(() => {
    if (activeSession === 'all') return null; // null = no session filter
    const subs = subjects.filter(s => (s.session_id || 'default') === activeSession);
    return new Set(subs.map(s => s.nom));
  }, [activeSession, subjects]);

  const filteredVideos = useMemo(() => {
    let filtered = videos;
    // Session filter
    if (sessionMatieres !== null) {
      filtered = filtered.filter(v => !v.matiere || sessionMatieres.has(v.matiere));
    }
    // Matière filter (secondary)
    if (filter) filtered = filtered.filter(v => v.matiere === filter);
    return [...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [videos, filter, sessionMatieres]);

  const currentVideoIndex = useMemo(() => {
    if (!selectedVideo) return -1;
    return filteredVideos.findIndex(v => v.id === selectedVideo);
  }, [selectedVideo, filteredVideos]);

  const hasPrev = currentVideoIndex > 0;
  const hasNext = currentVideoIndex < filteredVideos.length - 1;
  const matieres = [...new Set(
    (sessionMatieres !== null
      ? videos.filter(v => !v.matiere || sessionMatieres.has(v.matiere))
      : videos
    ).map(v => v.matiere).filter(Boolean)
  )];

  /* ── Upload local video ────────────────────────────────────────────────────*/
  const handleAdd = async () => {
    if (addMode === 'youtube') {
      const ytId = getYoutubeId(newUrl);
      if (!newTitle || !newUrl || !ytId) return;
      setVideos(prev => [...prev, {
        id: Date.now().toString(), titre: newTitle, description: newDesc,
        youtubeUrl: newUrl, youtubeId: ytId, matiere: newMatiere,
        date: new Date().toISOString().split('T')[0], videoType: 'youtube',
      }]);
      setNewTitle(''); setNewDesc(''); setNewUrl(''); setNewMatiere('');
      setShowAdd(false);
    } else {
      if (!newTitle || !localFile) return;
      setUploading(true); setUploadProgress(10);
      const ext = localFile.name.split('.').pop();
      const fileName = `videos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      setUploadProgress(30);
      const { error } = await supabase.storage.from('community-media').upload(fileName, localFile, {
        cacheControl: '3600', upsert: false,
      });
      if (error) {
        alert('Erreur upload : ' + error.message);
        setUploading(false); setUploadProgress(0); return;
      }
      setUploadProgress(70);
      const { data: urlData } = supabase.storage.from('community-media').getPublicUrl(fileName);

      setUploadProgress(80);
      let finalThumbUrl: string | undefined;
      const thumbDataUrl = await extractVideoThumbnail(localFile);
      if (thumbDataUrl) {
        try {
          const res = await fetch(thumbDataUrl);
          const blob = await res.blob();
          const thumbFileName = `thumbnails/${Date.now()}-thumb.jpg`;
          const { error: thumbErr } = await supabase.storage.from('community-media').upload(thumbFileName, blob, {
            contentType: 'image/jpeg', cacheControl: '3600', upsert: false,
          });
          if (!thumbErr) {
            const { data: thumbUrl } = supabase.storage.from('community-media').getPublicUrl(thumbFileName);
            finalThumbUrl = thumbUrl.publicUrl;
          }
        } catch { /* continue without thumbnail */ }
      }

      setVideos(prev => [...prev, {
        id: Date.now().toString(), titre: newTitle, description: newDesc,
        youtubeUrl: '', youtubeId: '', matiere: newMatiere,
        date: new Date().toISOString().split('T')[0],
        localUrl: urlData.publicUrl, videoType: 'local', thumbnailUrl: finalThumbUrl,
      }]);
      setUploadProgress(100); setUploading(false); setUploadProgress(0);
      setLocalFile(null); setNewTitle(''); setNewDesc(''); setNewMatiere('');
      setShowAdd(false);
    }
  };

  const handleDelete = (id: string) => setVideos(prev => prev.filter(v => v.id !== id));

  const navigateVideo = useCallback((direction: 'prev' | 'next') => {
    if (currentVideoIndex === -1) return;
    const newIndex = direction === 'prev' ? currentVideoIndex - 1 : currentVideoIndex + 1;
    if (newIndex >= 0 && newIndex < filteredVideos.length)
      setSelectedVideo(filteredVideos[newIndex].id);
  }, [currentVideoIndex, filteredVideos]);

  /* ── Detect video orientation from metadata (local videos) ──────────────*/
  const detectVideoOrientation = useCallback((videoEl: HTMLVideoElement) => {
    const w = videoEl.videoWidth;
    const h = videoEl.videoHeight;
    if (w > 0 && h > 0) {
      setVideoOrientation(w >= h ? 'landscape' : 'portrait');
    }
  }, []);

  /* ── Toggle fullscreen with smart orientation ─────────────────────────────*/
  const toggleFullscreen = useCallback(async () => {
    if (!playerContainerRef.current) return;
    if (isFSActive()) {
      await exitFS();
      try { (screen.orientation as any).unlock?.(); } catch { /* ignore */ }
    } else {
      await requestFSon(playerContainerRef.current);
      // Try native lock first (works in installed PWA / Chrome Android)
      try {
        const lockTarget = videoOrientation === 'portrait' ? 'portrait-primary' : 'landscape';
        await (screen.orientation as any).lock?.(lockTarget);
      } catch {
        // Fallback: CSS transform rotation for landscape videos on portrait devices
        // Browser will handle portrait videos natively (no rotation needed)
        // Nothing to do — the video fills the screen correctly
      }
    }
  }, [videoOrientation]);

  /* ── Auto fullscreen when phone rotates to landscape (landscape videos only) */
  useEffect(() => {
    if (!selectedVideo) return;
    const handleOrientation = async () => {
      const isLandscape = window.matchMedia('(orientation: landscape)').matches;
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      // Auto enter fullscreen on rotation only for landscape videos
      if (isMobile && isLandscape && videoOrientation === 'landscape' && playerContainerRef.current && !isFSActive()) {
        try {
          await requestFSon(playerContainerRef.current);
          await (screen.orientation as any).lock?.('landscape');
        } catch { /* ignore */ }
      }
    };
    const mq = window.matchMedia('(orientation: landscape)');
    mq.addEventListener('change', handleOrientation);
    return () => mq.removeEventListener('change', handleOrientation);
  }, [selectedVideo, videoOrientation]);

  /* ── Track fullscreen state ───────────────────────────────────────────────*/
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(isFSActive());
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
    };
  }, []);

  /* ── Keyboard shortcuts ───────────────────────────────────────────────────*/
  useEffect(() => {
    if (!selectedVideo) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isFSActive()) setSelectedVideo(null);
      if (e.key === 'ArrowLeft') navigateVideo('prev');
      if (e.key === 'ArrowRight') navigateVideo('next');
      if (e.key === 'f' || e.key === 'F') setIsTheaterMode(p => !p);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectedVideo, navigateVideo]);

  /* ── Reset orientation when changing video ───────────────────────────────*/
  useEffect(() => {
    const vid = videos.find(v => v.id === selectedVideo);
    // YouTube = always landscape by default
    if (!vid || vid.videoType !== 'local') setVideoOrientation('landscape');
    // Local videos: orientation detected via onLoadedMetadata
  }, [selectedVideo, videos]);

  /* ── Body scroll lock ─────────────────────────────────────────────────────*/
  useEffect(() => {
    if (selectedVideo) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setIsTheaterMode(false);
      setIsFullscreen(false);
      try { (screen.orientation as any).unlock?.(); } catch { /* ignore */ }
    }
    return () => { document.body.style.overflow = ''; };
  }, [selectedVideo]);

  /* ─────────────────────────────────────────────────────────────────────────
     RENDER
  ─────────────────────────────────────────────────────────────────────────── */
  return (
    <div className="max-w-6xl mx-auto animate-fade-in">

      {/* Page header */}
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

      {/* Session tabs */}
      {sessions.length > 1 && (
        <div className="flex gap-0 overflow-x-auto mb-4 border-b border-border" style={{ scrollbarWidth: 'none' }}>
          <button
            onClick={() => { setActiveSession('all'); setFilter(''); }}
            style={{
              padding: '8px 16px', fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap',
              border: 'none', borderBottom: activeSession === 'all' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeSession === 'all' ? 'var(--primary)' : 'var(--muted-foreground)',
              background: 'transparent', cursor: 'pointer', flexShrink: 0,
            }}
          >🎬 Toutes</button>
          {sessions.map(session => (
            <button key={session.id}
              onClick={() => { setActiveSession(session.id); setFilter(''); }}
              style={{
                padding: '8px 16px', fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap',
                border: 'none', borderBottom: activeSession === session.id ? '2px solid var(--primary)' : '2px solid transparent',
                color: activeSession === session.id ? 'var(--primary)' : 'var(--muted-foreground)',
                background: 'transparent', cursor: 'pointer', flexShrink: 0,
              }}
            >{session.icone} {session.nom}</button>
          ))}
        </div>
      )}

      {/* Filter bar */}
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

      {/* Add video form */}
      {showAdd && (
        <div className="glass-card p-6 mb-6 animate-scale-in">
          <h3 className="font-heading font-semibold text-lg mb-4">Ajouter une vidéo</h3>
          <div className="flex gap-2 mb-4 p-1 bg-secondary rounded-lg">
            <button onClick={() => setAddMode('youtube')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${addMode === 'youtube' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:text-foreground'}`}>
              <Video size={15} /> YouTube
            </button>
            <button onClick={() => setAddMode('local')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${addMode === 'local' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:text-foreground'}`}>
              <Upload size={15} /> Depuis mon appareil
            </button>
          </div>
          <div className="space-y-3">
            {addMode === 'youtube' ? (
              <input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="Lien YouTube (ex: https://youtube.com/watch?v=...)" className="w-full px-4 py-3 rounded-lg bg-secondary border border-border focus:border-primary outline-none text-foreground" />
            ) : (
              <>
                <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={e => setLocalFile(e.target.files?.[0] || null)} />
                <div onClick={() => fileInputRef.current?.click()} className={`w-full border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${localFile ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-secondary/50'}`}>
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
                      <span className="flex items-center gap-1">
                        <Loader2 size={12} className="animate-spin" />
                        {uploadProgress >= 80 ? '🖼️ Extraction miniature...' : 'Upload en cours...'}
                      </span>
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
              <button onClick={() => { setShowAdd(false); setLocalFile(null); setAddMode('youtube'); }} disabled={uploading} className="flex-1 py-2 rounded-lg bg-secondary text-foreground">Annuler</button>
              <button onClick={handleAdd} disabled={uploading || (addMode === 'youtube' ? (!newTitle || !newUrl) : (!newTitle || !localFile))} className="flex-1 py-2 rounded-lg gradient-bg text-primary-foreground font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                {uploading ? <><Loader2 size={16} className="animate-spin" /> Upload...</> : '➕ Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVideos.map((video, i) => (
          <div key={video.id} className="glass-card-hover overflow-hidden animate-slide-up" style={{ animationDelay: `${i * 0.05}s` }}>
            <div className="relative cursor-pointer group" onClick={() => setSelectedVideo(video.id)}>
              {video.videoType === 'local' ? (
                video.thumbnailUrl ? (
                  <img src={video.thumbnailUrl} alt={video.titre} className="w-full aspect-video object-cover" loading="lazy" />
                ) : (
                  <div className="w-full aspect-video bg-secondary flex items-center justify-center">
                    <FileVideo size={40} className="text-primary/50" />
                  </div>
                )
              ) : (
                <img src={`https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`} alt={video.titre} className="w-full aspect-video object-cover" loading="lazy" />
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
              {video.description && <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{video.description}</p>}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {video.matiere && (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                      <BookOpen size={10} /> {video.matiere}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar size={10} /> {video.date}
                  </span>
                </div>
                {isAdmin && (
                  <button onClick={e => { e.stopPropagation(); handleDelete(video.id); }} className="p-1.5 rounded-md text-destructive/60 hover:text-destructive hover:bg-destructive/10 transition-colors">
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

      {/* ── Video Player Modal ─────────────────────────────────────────────── */}
      {selectedVideo && (() => {
        const video = videos.find(v => v.id === selectedVideo);
        if (!video) return null;
        // On mobile fullscreen: bars hidden, pure video experience
        const hideBars = isFullscreen;
        return createPortal(
          <div
            ref={playerContainerRef}
            style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 99999, display: 'flex', flexDirection: 'column', backgroundColor: '#000', overflow: 'hidden' }}
          >
            {/* Top bar — hidden in fullscreen landscape */}
            {!hideBars && (
              <div className="relative z-10 flex items-center justify-between px-3 md:px-6 py-2 md:py-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <div className="flex items-center gap-2 min-w-0">
                  <button onClick={() => setSelectedVideo(null)} className="p-2 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0">
                    <X size={20} className="text-white/80" />
                  </button>
                  <div className="min-w-0">
                    <h2 className="font-heading font-semibold text-sm md:text-base truncate text-white">{video.titre}</h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      {video.matiere && (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/30 text-primary">
                          <BookOpen size={10} /> {video.matiere}
                        </span>
                      )}
                      <span className="text-xs text-white/50">{video.date}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className="text-xs text-white/40 mr-1 hidden sm:inline">{currentVideoIndex + 1} / {filteredVideos.length}</span>
                  <button onClick={() => navigateVideo('prev')} disabled={!hasPrev} className="p-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-white">
                    <ChevronLeft size={18} />
                  </button>
                  <button onClick={() => navigateVideo('next')} disabled={!hasNext} className="p-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-white">
                    <ChevronRight size={18} />
                  </button>
                  {/* Theater mode (desktop only) */}
                  <button onClick={() => setIsTheaterMode(p => !p)} className="p-2 rounded-lg hover:bg-white/10 transition-colors hidden md:flex text-white" title="Mode cinéma (F)">
                    {isTheaterMode ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                  </button>
                  {/* Fullscreen landscape button */}
                  <button onClick={toggleFullscreen} className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white" title="Plein écran paysage">
                    <Maximize2 size={18} />
                  </button>
                </div>
              </div>
            )}

            {/* Fullscreen overlay: back + exit buttons on top */}
            {hideBars && (
              <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-3 py-2 pointer-events-none">
                <button
                  onClick={() => exitFS().then(() => setSelectedVideo(null))}
                  className="pointer-events-auto p-2 rounded-full bg-black/40 backdrop-blur-sm text-white/70 hover:text-white hover:bg-black/60 transition-all"
                >
                  <X size={18} />
                </button>
                <div className="flex items-center gap-1">
                  <button onClick={() => navigateVideo('prev')} disabled={!hasPrev} className="pointer-events-auto p-2 rounded-full bg-black/40 backdrop-blur-sm text-white/70 hover:text-white disabled:opacity-20 transition-all">
                    <ChevronLeft size={18} />
                  </button>
                  <button onClick={() => navigateVideo('next')} disabled={!hasNext} className="pointer-events-auto p-2 rounded-full bg-black/40 backdrop-blur-sm text-white/70 hover:text-white disabled:opacity-20 transition-all">
                    <ChevronRight size={18} />
                  </button>
                  <button onClick={() => exitFS()} className="pointer-events-auto p-2 rounded-full bg-black/40 backdrop-blur-sm text-white/70 hover:text-white transition-all">
                    <Minimize2 size={18} />
                  </button>
                </div>
              </div>
            )}

            {/* Player area — adapts to video orientation */}
            <div className="relative z-10 flex-1 flex items-center justify-center" style={{ padding: hideBars ? '0' : '12px', overflow: 'hidden' }}>
              <div style={{
                // Portrait 9:16: narrow centered, fill height. Landscape 16:9: fill width.
                width: hideBars && videoOrientation === 'portrait' ? 'auto' : '100%',
                height: hideBars && videoOrientation === 'portrait' ? '100%' : (hideBars ? '100%' : undefined),
                maxWidth: hideBars
                  ? (videoOrientation === 'portrait' ? 'calc(100vh * 9 / 16)' : '100%')
                  : (isTheaterMode ? '100%' : '900px'),
                position: 'relative',
              }}>
                {video.videoType === 'local' && video.localUrl ? (
                  <div style={{
                    position: 'relative',
                    paddingTop: hideBars ? '0' : (videoOrientation === 'portrait' ? '177.78%' : '56.25%'),
                    height: hideBars ? '100%' : undefined,
                  }}>
                    <video
                      key={video.localUrl}
                      src={video.localUrl}
                      controls
                      autoPlay
                      playsInline
                      preload="auto"
                      onLoadedMetadata={e => detectVideoOrientation(e.currentTarget)}
                      style={{
                        position: hideBars ? 'static' : 'absolute',
                        top: 0, left: 0,
                        width: '100%',
                        height: hideBars ? '100%' : '100%',
                        borderRadius: hideBars ? '0' : '12px',
                        backgroundColor: '#000',
                        objectFit: 'contain',
                      }}
                    />
                  </div>
                ) : (
                  // YouTube: always 16:9
                  <div style={{ position: 'relative', paddingTop: hideBars ? '0' : '56.25%', height: hideBars ? '100%' : undefined }}>
                    <iframe
                      key={video.youtubeId + (isTheaterMode ? '-t' : '') + (hideBars ? '-fs' : '')}
                      src={`https://www.youtube.com/embed/${video.youtubeId}?autoplay=1&rel=0&modestbranding=1&playsinline=1&enablejsapi=1&fs=1`}
                      title={video.titre}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                      allowFullScreen
                      style={{ position: hideBars ? 'static' : 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none', borderRadius: hideBars ? '0' : '12px', backgroundColor: '#000' }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Bottom bar — hidden in fullscreen */}
            {!hideBars && (
              <div className="relative z-10 flex-shrink-0 px-4 pb-4 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                  {video.description && <p className="text-xs text-white/50 mb-2 line-clamp-1">{video.description}</p>}
                  {/* Mobile hint */}
                  <p className="text-xs text-white/25 mb-2 flex items-center gap-1 md:hidden">
                    <Smartphone size={11} /> Tournez le téléphone ou tapez <Maximize2 size={11} className="inline" /> pour le plein écran paysage
                  </p>
                  {hasNext && (() => {
                    const nextVid = filteredVideos[currentVideoIndex + 1];
                    return (
                      <button onClick={() => navigateVideo('next')} className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 transition-all group text-left">
                        {nextVid.videoType === 'local' ? (
                          nextVid.thumbnailUrl ? (
                            <img src={nextVid.thumbnailUrl} alt="" className="w-16 aspect-video object-cover rounded-lg flex-shrink-0" />
                          ) : (
                            <div className="w-16 aspect-video bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                              <FileVideo size={18} className="text-white/50" />
                            </div>
                          )
                        ) : (
                          <img src={`https://img.youtube.com/vi/${nextVid.youtubeId}/mqdefault.jpg`} alt="" className="w-16 aspect-video object-cover rounded-lg flex-shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-white/40 mb-0.5">Vidéo suivante</p>
                          <h4 className="text-sm font-medium truncate text-white/80 group-hover:text-white transition-colors">{nextVid.titre}</h4>
                        </div>
                        <ChevronRight size={16} className="text-white/40 flex-shrink-0" />
                      </button>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>,
          document.body
        );
      })()}
    </div>
  );
}
