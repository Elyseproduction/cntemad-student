import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Camera, Check, User, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ProfileSetupProps {
  userId: string;
  defaultName: string;
  defaultAvatar: string | null;
  onComplete: () => void;
}

function charCountColor(len: number, max: number): string {
  const ratio = len / max;
  if (ratio >= 0.95) return 'text-destructive';
  if (ratio >= 0.75) return 'text-yellow-500';
  return 'text-muted-foreground';
}

export function ProfileSetup({ userId, defaultName, defaultAvatar, onComplete }: ProfileSetupProps) {
  const { toast } = useToast();
  const [pseudo,        setPseudo]        = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(defaultAvatar);
  const [avatarFile,    setAvatarFile]    = useState<File | null>(null);
  const [saving,        setSaving]        = useState(false);
  const [pseudoError,   setPseudoError]   = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const MAX = 20;
  const displayName = pseudo.trim() || defaultName;

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

  const validatePseudo = (value: string): string => {
    const name = value.trim() || defaultName;
    if (name.length < 2)  return 'Le pseudo doit faire au moins 2 caractères.';
    if (name.length > MAX) return `Le pseudo ne peut pas dépasser ${MAX} caractères.`;
    return '';
  };

  const handleSave = async () => {
    const err = validatePseudo(pseudo);
    if (err) { setPseudoError(err); return; }

    setSaving(true);
    let avatarUrl = defaultAvatar;

    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${ext}`;
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
      .update({ display_name: displayName, avatar_url: avatarUrl }).eq('id', userId);

    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      setSaving(false); return;
    }

    toast({ title: '✅ Profil configuré !', description: `Bienvenue ${displayName} 🎉` });
    onComplete();
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-mesh p-4">
      <div className="w-full max-w-sm bg-card rounded-2xl border border-border p-6 space-y-5 animate-scale-in shadow-xl">

        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center text-primary-foreground font-heading font-bold text-lg mx-auto shadow-md">U</div>
          <h2 className="font-heading font-bold text-xl">Configure ton profil</h2>
          <p className="text-sm text-muted-foreground">Choisis un pseudo et une photo de profil</p>
        </div>

        {/* Avatar */}
        <div className="flex justify-center">
          <button onClick={() => fileRef.current?.click()} aria-label="Changer la photo" className="relative group">
            {avatarPreview ? (
              <img src={avatarPreview} alt="Aperçu" className="w-24 h-24 rounded-full object-cover border-2 border-border group-hover:border-primary transition-colors" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center border-2 border-border group-hover:border-primary transition-colors">
                <User size={32} className="text-muted-foreground" />
              </div>
            )}
            <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-lg group-hover:scale-110 transition-transform">
              <Camera size={14} />
            </div>
          </button>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/bmp,image/heic,image/heif,.png,.jpg,.jpeg,.gif,.webp,.bmp,.heic,.heif" onChange={handleFileChange} className="hidden" />
        </div>

        {/* Pseudo */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground" htmlFor="pseudo-input">Pseudo</label>
          <input id="pseudo-input" value={pseudo}
            onChange={e => { setPseudo(e.target.value); setPseudoError(''); }}
            onBlur={() => setPseudoError(validatePseudo(pseudo))}
            placeholder={defaultName} maxLength={MAX}
            className={`w-full px-4 py-3 rounded-xl bg-secondary border focus:outline-none text-foreground text-sm transition-colors ${
              pseudoError ? 'border-destructive' : 'border-border focus:border-primary'
            }`}
          />
          <div className="flex items-center justify-between">
            {pseudoError ? (
              <p className="text-destructive text-[11px] flex items-center gap-1"><AlertCircle size={11} /> {pseudoError}</p>
            ) : (
              <p className="text-[11px] text-muted-foreground">Ce nom sera visible par les autres</p>
            )}
            <span className={`text-[11px] font-mono ${charCountColor(pseudo.length, MAX)}`}>{pseudo.length}/{MAX}</span>
          </div>
        </div>

        <button onClick={handleSave} disabled={saving}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 shadow-sm shadow-primary/25">
          {saving
            ? <div className="animate-spin w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full" />
            : <><Check size={18} /> C'est parti !</>}
        </button>

        <button onClick={onComplete} className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-1">
          Passer pour l'instant
        </button>
      </div>
    </div>
  );
}
