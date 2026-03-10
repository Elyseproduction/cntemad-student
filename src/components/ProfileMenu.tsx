import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Camera, Check, User, LogOut, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

const MAX_PSEUDO = 20;

function charCountColor(len: number): string {
  if (len >= MAX_PSEUDO)        return 'text-destructive';
  if (len >= MAX_PSEUDO * 0.8)  return 'text-yellow-500';
  return 'text-muted-foreground';
}

export function ProfileMenu() {
  const { user, profile, signOut } = useAuth();
  const { toast } = useToast();
  const [open,          setOpen]          = useState(false);
  const [pseudo,        setPseudo]        = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile,    setAvatarFile]    = useState<File | null>(null);
  const [saving,        setSaving]        = useState(false);
  const [pseudoError,   setPseudoError]   = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && profile) {
      setPseudo(profile.display_name || '');
      setAvatarPreview(profile.avatar_url);
      setAvatarFile(null);
      setPseudoError('');
    }
  }, [open, profile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Photo trop grande', description: 'Maximum 5 Mo autorisé.', variant: 'destructive' });
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  // Détecte si quelque chose a réellement changé pour éviter le reload inutile
  const hasChanges = useCallback(() => {
    if (avatarFile) return true;
    return pseudo.trim() !== (profile?.display_name || '');
  }, [pseudo, avatarFile, profile]);

  const handleSave = async () => {
    if (!user) return;
    if (!hasChanges()) { setOpen(false); return; }

    const displayName = pseudo.trim();
    if (displayName.length < 2) { setPseudoError('Le pseudo doit faire au moins 2 caractères.'); return; }
    if (displayName.length > MAX_PSEUDO) { setPseudoError(`Maximum ${MAX_PSEUDO} caractères.`); return; }

    setSaving(true);
    let avatarUrl = profile?.avatar_url || null;

    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('community-media').upload(`avatars/${fileName}`, avatarFile);
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
    // Reload uniquement si l'avatar a changé (nouvelle URL)
    if (avatarFile) window.location.reload();
  };

  if (!user || !profile) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="flex items-center gap-2 rounded-full hover:bg-secondary/80 transition-colors pr-3 pl-1 py-1" aria-label="Ouvrir le profil">
          {profile.avatar_url
            ? <img src={profile.avatar_url} alt="Photo de profil" className="w-8 h-8 rounded-full object-cover border border-border" />
            : <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center border border-border"><User size={16} className="text-muted-foreground" /></div>
          }
          <span className="text-sm font-medium text-foreground hidden sm:inline max-w-[100px] truncate">
            {profile.display_name || 'Profil'}
          </span>
        </button>
      </SheetTrigger>

      <SheetContent side="right" className="w-80 sm:w-96 flex flex-col">
        <SheetHeader><SheetTitle className="font-heading">Mon profil</SheetTitle></SheetHeader>

        <div className="mt-6 space-y-5 flex-1">
          {/* Avatar */}
          <div className="flex justify-center">
            <button onClick={() => fileRef.current?.click()} aria-label="Changer la photo" className="relative group">
              {avatarPreview
                ? <img src={avatarPreview} alt="Photo de profil" className="w-24 h-24 rounded-full object-cover border-2 border-border group-hover:border-primary transition-colors" />
                : <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center border-2 border-border group-hover:border-primary transition-colors"><User size={32} className="text-muted-foreground" /></div>
              }
              <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-lg group-hover:scale-110 transition-transform">
                <Camera size={14} />
              </div>
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          </div>

          {/* Pseudo */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="profile-pseudo">Pseudo</label>
            <input id="profile-pseudo" value={pseudo}
              onChange={e => { setPseudo(e.target.value); setPseudoError(''); }}
              maxLength={MAX_PSEUDO}
              className={`w-full px-4 py-3 rounded-xl bg-secondary border focus:outline-none text-foreground text-sm transition-colors ${pseudoError ? 'border-destructive' : 'border-border focus:border-primary'}`}
            />
            <div className="flex items-center justify-between">
              {pseudoError
                ? <p className="text-destructive text-[11px] flex items-center gap-1"><AlertCircle size={11} /> {pseudoError}</p>
                : <span />
              }
              <span className={`text-[11px] font-mono ${charCountColor(pseudo.length)}`}>{pseudo.length}/{MAX_PSEUDO}</span>
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Email</label>
            <p className="text-sm text-foreground/70 px-4 py-3 rounded-xl bg-muted/50 border border-border select-all">{user.email}</p>
          </div>

          <button onClick={handleSave} disabled={saving}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 shadow-sm shadow-primary/20">
            {saving
              ? <div className="animate-spin w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full" />
              : <><Check size={18} /> {hasChanges() ? 'Enregistrer' : 'Fermer'}</>
            }
          </button>

          <button onClick={signOut} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-destructive hover:bg-destructive/10 transition-colors text-sm">
            <LogOut size={16} /> Se déconnecter
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
