import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Camera, Check, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ProfileSetupProps {
  userId: string;
  defaultName: string;
  defaultAvatar: string | null;
  onComplete: () => void;
}

export function ProfileSetup({ userId, defaultName, defaultAvatar, onComplete }: ProfileSetupProps) {
  const { toast } = useToast();
  const [pseudo, setPseudo] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(defaultAvatar);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Photo trop grande', description: 'Max 5 Mo', variant: 'destructive' });
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    const displayName = pseudo.trim() || defaultName;
    if (displayName.length < 2) {
      toast({ title: 'Pseudo trop court', description: 'Min 2 caractères', variant: 'destructive' });
      return;
    }
    if (displayName.length > 20) {
      toast({ title: 'Pseudo trop long', description: 'Max 20 caractères', variant: 'destructive' });
      return;
    }

    setSaving(true);

    let avatarUrl = defaultAvatar;

    // Upload custom avatar if selected
    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('community-media')
        .upload(`avatars/${fileName}`, avatarFile);
      if (uploadError) {
        toast({ title: 'Erreur upload', description: uploadError.message, variant: 'destructive' });
        setSaving(false);
        return;
      }
      const { data: urlData } = supabase.storage
        .from('community-media')
        .getPublicUrl(`avatars/${fileName}`);
      avatarUrl = urlData.publicUrl;
    }

    // Update profile
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName, avatar_url: avatarUrl })
      .eq('id', userId);

    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      setSaving(false);
      return;
    }

    toast({ title: '✅ Profil configuré !', description: `Bienvenue ${displayName}` });
    onComplete();
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-mesh p-4">
      <div className="w-full max-w-sm bg-card rounded-2xl border border-border p-6 space-y-6 animate-fade-in">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center text-primary-foreground font-heading font-bold text-lg mx-auto">U</div>
          <h2 className="font-heading font-bold text-xl">Configure ton profil</h2>
          <p className="text-sm text-muted-foreground">Choisis un pseudo et une photo</p>
        </div>

        {/* Avatar */}
        <div className="flex justify-center">
          <button
            onClick={() => fileRef.current?.click()}
            className="relative group"
          >
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Avatar"
                className="w-24 h-24 rounded-full object-cover border-2 border-border group-hover:border-primary transition-colors"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center border-2 border-border group-hover:border-primary transition-colors">
                <User size={32} className="text-muted-foreground" />
              </div>
            )}
            <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-lg">
              <Camera size={14} />
            </div>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Pseudo input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Pseudo</label>
          <input
            value={pseudo}
            onChange={e => setPseudo(e.target.value)}
            placeholder={defaultName}
            maxLength={20}
            className="w-full px-4 py-3 rounded-xl bg-secondary border border-border focus:border-primary outline-none text-foreground text-sm transition-colors"
          />
          <p className="text-[11px] text-muted-foreground">
            {pseudo.length}/20 — Ce nom sera visible par les autres
          </p>
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? (
            <div className="animate-spin w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full" />
          ) : (
            <>
              <Check size={18} />
              C'est parti !
            </>
          )}
        </button>

        {/* Skip */}
        <button
          onClick={onComplete}
          className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Passer pour l'instant
        </button>
      </div>
    </div>
  );
}
