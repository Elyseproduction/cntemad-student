import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Camera, Check, User, LogOut, AlertCircle,
  ImagePlus, Trash2, Calendar, MessageSquare,
  ShieldCheck, Code, ChevronRight,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

const MAX_PSEUDO = 20;

function charCountColor(len: number): string {
  if (len >= MAX_PSEUDO)       return 'text-destructive';
  if (len >= MAX_PSEUDO * 0.8) return 'text-yellow-500';
  return 'text-muted-foreground';
}

async function compressImage(file: File, maxPx = 512, quality = 0.85): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width  * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width  = w;
      canvas.height = h;
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          resolve(new File([blob], 'avatar.jpg', { type: 'image/jpeg' }));
        },
        'image/jpeg', quality,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

function PhotoActionSheet({ open, onClose, onGallery, onCamera, onRemove, hasAvatar }: {
  open: boolean; onClose: () => void;
  onGallery: () => void; onCamera: () => void;
  onRemove: () => void; hasAvatar: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md bg-card rounded-t-3xl border-t border-border p-4 pb-8 space-y-2 shadow-2xl"
        style={{ animation: 'slideUp 0.22s ease' }}
        onClick={e => e.stopPropagation()}
      >
        <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
        <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-4" />
        <p className="text-center text-sm font-semibold text-foreground mb-3">Photo de profil</p>

        <button onClick={onCamera} className="flex items-center gap-3 w-full px-4 py-3.5 rounded-2xl bg-secondary hover:bg-secondary/80 transition-colors">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Camera size={20} className="text-primary" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-foreground">Prendre une photo</p>
            <p className="text-xs text-muted-foreground">Utiliser l'appareil photo</p>
          </div>
          <ChevronRight size={16} className="ml-auto text-muted-foreground" />
        </button>

        <button onClick={onGallery} className="flex items-center gap-3 w-full px-4 py-3.5 rounded-2xl bg-secondary hover:bg-secondary/80 transition-colors">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <ImagePlus size={20} className="text-primary" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-foreground">Choisir depuis la galerie</p>
            <p className="text-xs text-muted-foreground">Toutes vos photos et images</p>
          </div>
          <ChevronRight size={16} className="ml-auto text-muted-foreground" />
        </button>

        {hasAvatar && (
          <button onClick={onRemove} className="flex items-center gap-3 w-full px-4 py-3.5 rounded-2xl bg-destructive/10 hover:bg-destructive/20 transition-colors">
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
              <Trash2 size={20} className="text-destructive" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-destructive">Supprimer la photo</p>
              <p className="text-xs text-muted-foreground">Revenir à l'avatar par défaut</p>
            </div>
          </button>
        )}

        <button onClick={onClose} className="w-full mt-2 py-3 rounded-2xl bg-muted text-foreground text-sm font-medium hover:bg-muted/80 transition-colors">
          Annuler
        </button>
      </div>
    </div>
  );
}

export function ProfileMenu() {
  const { user, profile, signOut } = useAuth();
  const { toast } = useToast();

  const [open,           setOpen]           = useState(false);
  const [pseudo,         setPseudo]         = useState('');
  const [avatarPreview,  setAvatarPreview]  = useState<string | null>(null);
  const [avatarFile,     setAvatarFile]     = useState<File | null>(null);
  const [removeAvatar,   setRemoveAvatar]   = useState(false);
  const [saving,         setSaving]         = useState(false);
  const [pseudoError,    setPseudoError]    = useState('');
  const [showPhotoSheet, setShowPhotoSheet] = useState(false);
  const [msgCount,       setMsgCount]       = useState<number | null>(null);
  const [uploading,      setUploading]      = useState(false);

  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && profile) {
      setPseudo(profile.display_name || '');
      setAvatarPreview(profile.avatar_url);
      setAvatarFile(null);
      setRemoveAvatar(false);
      setPseudoError('');
    }
  }, [open, profile]);

  useEffect(() => {
    if (!open || !profile?.display_name) return;
    supabase
      .from('community_messages')
      .select('*', { count: 'exact', head: true })
      .eq('auteur', profile.display_name)
      .eq('is_deleted', false)
      .then(({ count }) => setMsgCount(count ?? 0));
  }, [open, profile]);

  const processFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Type invalide', description: 'Seules les images sont acceptées.', variant: 'destructive' });
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: 'Fichier trop lourd', description: 'Max 20 Mo.', variant: 'destructive' });
      return;
    }
    setUploading(true);
    try {
      const compressed = await compressImage(file);
      setAvatarFile(compressed);
      setAvatarPreview(URL.createObjectURL(compressed));
      setRemoveAvatar(false);
    } finally {
      setUploading(false);
    }
  }, [toast]);

  const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const handleCameraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const handleRemoveAvatar = () => {
    setAvatarPreview(null);
    setAvatarFile(null);
    setRemoveAvatar(true);
    setShowPhotoSheet(false);
  };

  const hasChanges = useCallback(() => {
    if (avatarFile || removeAvatar) return true;
    return pseudo.trim() !== (profile?.display_name || '');
  }, [pseudo, avatarFile, removeAvatar, profile]);

  const handleSave = async () => {
    if (!user) return;
    if (!hasChanges()) { setOpen(false); return; }
    const displayName = pseudo.trim();
    if (displayName.length < 2) { setPseudoError('Minimum 2 caractères.'); return; }
    if (displayName.length > MAX_PSEUDO) { setPseudoError(`Maximum ${MAX_PSEUDO} caractères.`); return; }

    setSaving(true);
    let avatarUrl: string | null = removeAvatar ? null : (profile?.avatar_url ?? null);

    if (avatarFile) {
      const fileName = `${user.id}-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('community-media').upload(`avatars/${fileName}`, avatarFile, { contentType: 'image/jpeg', upsert: true });
      if (uploadError) {
        toast({ title: 'Erreur upload', description: uploadError.message, variant: 'destructive' });
        setSaving(false); return;
      }
      const { data: urlData } = supabase.storage.from('community-media').getPublicUrl(`avatars/${fileName}`);
      avatarUrl = urlData.publicUrl;
    }

    const { error } = await supabase.from('profiles')
      .update({ display_name: displayName, avatar_url: avatarUrl }).eq('id', user.id);

    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      setSaving(false); return;
    }

    toast({ title: '✅ Profil mis à jour !' });
    setSaving(false);
    setOpen(false);
    if (avatarFile || removeAvatar) window.location.reload();
  };

  if (!user || !profile) return null;

  const joinDate = (profile as any).created_at
    ? new Date((profile as any).created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    : null;

  const initials = (profile.display_name || user.email || '?')[0].toUpperCase();

  return (
    <>
      <input ref={galleryRef} type="file" accept="image/*" onChange={handleGalleryChange} className="hidden" />
      <input ref={cameraRef}  type="file" accept="image/*" capture="environment" onChange={handleCameraChange} className="hidden" />

      <PhotoActionSheet
        open={showPhotoSheet}
        onClose={() => setShowPhotoSheet(false)}
        onGallery={() => { setShowPhotoSheet(false); setTimeout(() => galleryRef.current?.click(), 120); }}
        onCamera={() => { setShowPhotoSheet(false); setTimeout(() => cameraRef.current?.click(), 120); }}
        onRemove={handleRemoveAvatar}
        hasAvatar={!!(avatarPreview || profile.avatar_url)}
      />

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button className="flex items-center gap-2 rounded-full hover:bg-secondary/80 transition-colors pr-2 pl-1 py-1" aria-label="Ouvrir le profil">
            {profile.avatar_url
              ? <img src={profile.avatar_url} alt="Photo de profil" className="w-8 h-8 rounded-full object-cover border-2 border-border" />
              : <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center border-2 border-border text-primary font-bold text-sm">{initials}</div>
            }
            <span className="text-sm font-medium text-foreground hidden sm:inline max-w-[100px] truncate">
              {profile.display_name || 'Profil'}
            </span>
          </button>
        </SheetTrigger>

        <SheetContent side="right" className="w-full sm:w-96 flex flex-col p-0 overflow-hidden">
          <SheetHeader className="sr-only"><SheetTitle>Mon profil</SheetTitle></SheetHeader>

          <div className="flex-1 overflow-y-auto">
            {/* Bannière gradient */}
            <div className="h-24 w-full bg-gradient-to-br from-primary/50 via-primary/20 to-transparent" />

            {/* Avatar + badges */}
            <div className="px-5 -mt-12 pb-2 flex items-end justify-between">
              <button
                onClick={() => setShowPhotoSheet(true)}
                aria-label="Changer la photo"
                disabled={uploading}
                className="relative group"
              >
                {uploading ? (
                  <div className="w-20 h-20 rounded-full border-4 border-card bg-secondary flex items-center justify-center shadow-lg">
                    <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="w-20 h-20 rounded-full object-cover border-4 border-card shadow-lg group-hover:brightness-90 transition-all" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-primary/20 border-4 border-card shadow-lg flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                    <span className="text-primary font-bold text-2xl">{initials}</span>
                  </div>
                )}
                <div className="absolute bottom-0.5 right-0.5 w-7 h-7 rounded-full bg-primary border-2 border-card flex items-center justify-center shadow group-hover:scale-110 transition-transform">
                  <Camera size={13} className="text-primary-foreground" />
                </div>
              </button>

              <div className="flex flex-col items-end gap-1.5 pb-1">
                {(profile as any).is_developer && (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent/20 text-accent text-[11px] font-semibold border border-accent/20">
                    <Code size={11} /> Dev
                  </span>
                )}
                {(profile as any).is_admin_badge && (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-semibold border border-primary/20">
                    <ShieldCheck size={11} /> Admin
                  </span>
                )}
              </div>
            </div>

            {/* Nom + stats */}
            <div className="px-5 pb-4">
              <p className="font-heading font-bold text-lg text-foreground leading-tight">{profile.display_name || 'Sans pseudo'}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              <div className="flex flex-wrap gap-3 mt-2">
                {joinDate && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar size={12} /><span>Membre depuis {joinDate}</span>
                  </div>
                )}
                {msgCount !== null && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MessageSquare size={12} /><span>{msgCount} message{msgCount !== 1 ? 's' : ''}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="h-px bg-border mx-5" />

            {/* Formulaire */}
            <div className="px-5 py-5 space-y-4">
              <p className="text-sm font-semibold text-foreground">Modifier le profil</p>

              {/* Pseudo */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground" htmlFor="profile-pseudo">Pseudo</label>
                <input
                  id="profile-pseudo"
                  value={pseudo}
                  onChange={e => { setPseudo(e.target.value); setPseudoError(''); }}
                  maxLength={MAX_PSEUDO}
                  className={`w-full px-4 py-3 rounded-xl bg-secondary border focus:outline-none text-foreground text-sm transition-colors ${
                    pseudoError ? 'border-destructive' : 'border-border focus:border-primary'
                  }`}
                />
                <div className="flex items-center justify-between">
                  {pseudoError
                    ? <p className="text-destructive text-[11px] flex items-center gap-1"><AlertCircle size={11} />{pseudoError}</p>
                    : <span className="text-[11px] text-muted-foreground">Visible par les autres membres</span>
                  }
                  <span className={`text-[11px] font-mono ${charCountColor(pseudo.length)}`}>{pseudo.length}/{MAX_PSEUDO}</span>
                </div>
              </div>

              {/* Enregistrer */}
              <button
                onClick={handleSave}
                disabled={saving || uploading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 shadow-sm shadow-primary/20"
              >
                {saving
                  ? <div className="animate-spin w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full" />
                  : <><Check size={18} /> {hasChanges() ? 'Enregistrer' : 'Fermer'}</>
                }
              </button>

              {/* Déconnexion */}
              <button
                onClick={signOut}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-destructive hover:bg-destructive/10 transition-colors text-sm"
              >
                <LogOut size={16} /> Se déconnecter
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
