import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Send, Smile, Users, Download, X, Copy, Reply, Pencil, Trash2, Check, MoreVertical, Paperclip, FileText, ShieldCheck, Code, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useOnlineCount, useOnlineUsers } from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { VoiceRecorder } from '@/components/VoiceRecorder';

interface Message {
  id: string;
  auteur: string;
  avatar: string;
  couleur: string;
  contenu: string;
  type: string;
  image_url?: string;
  created_at: string;
  reactions: Record<string, string[]>;
  is_deleted?: boolean;
  is_edited?: boolean;
  reply_to?: string | null;
  user_id?: string;
}

const reactionEmojis = ['👍', '❤️', '😂', '🔥'];
const emojiPicker = ['😀', '😂', '😍', '🤔', '👍', '👏', '🎉', '🔥', '❤️', '💪', '📚', '🧠', '💡', '⚡', '🎯', '✅'];

const MAX_FILE_SIZE = 100 * 1024 * 1024;
const MAX_TEXTAREA_HEIGHT = 120;

export function CommunityPage() {
  const { toast } = useToast();
  const onlineCount = useOnlineCount();
  const { users: onlineUsers } = useOnlineUsers();
  const { user, profile, loading: authLoading } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [allProfiles, setAllProfiles] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ url: string; type: 'image' | 'video' } | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [editingMsg, setEditingMsg] = useState<string | null>(null);
  const [editInput, setEditInput] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [savedScrollPosition, setSavedScrollPosition] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    setIsMobile(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
  }, []);

  const username = profile?.display_name || user?.email?.split('@')[0] || 'Anonyme';
  const userAvatar = profile?.avatar_url || '';
  const userColor = '#6C63FF';

  // Détection du clavier mobile
  useEffect(() => {
    const handleResize = () => {
      const isKeyboard = window.innerHeight < window.outerHeight * 0.8;
      setKeyboardVisible(isKeyboard);
      
      if (isKeyboard && scrollRef.current) {
        setSavedScrollPosition(scrollRef.current.scrollTop);
      } else if (!isKeyboard && savedScrollPosition > 0) {
        setTimeout(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = savedScrollPosition;
          }
        }, 100);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [savedScrollPosition]);

  // Charger les messages
  const fetchMessages = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('community_messages')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      setMessages(data?.map(m => ({
        ...m,
        reactions: (m.reactions as Record<string, string[]>) || {},
      })) || []);
    } catch (err) {
      console.error('❌ Erreur chargement messages:', err);
      setError('Impossible de charger les messages');
    } finally {
      setLoading(false);
    }
  }, []);

  // Charger les profils
  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('display_name, avatar_url, is_admin_badge, is_developer');
        
        if (data) {
          setAllProfiles(data.filter(p => p.display_name).map(p => ({ 
            display_name: p.display_name!, 
            avatar_url: p.avatar_url, 
            is_admin_badge: p.is_admin_badge ?? false, 
            is_developer: p.is_developer ?? false 
          })));
        }
      } catch (err) {
        console.error('❌ Erreur chargement profils:', err);
      }
    };
    fetchProfiles();
  }, []);

  // Initial load et Realtime
  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel('community_messages_realtime')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'community_messages' }, 
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMsg = payload.new as any;
            setMessages(prev => {
              const exists = prev.some(m => m.id === newMsg.id);
              if (exists) return prev;
              return [...prev, { ...newMsg, reactions: newMsg.reactions || {} }];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as any;
            setMessages(prev => prev.map(m => 
              m.id === updated.id ? { ...m, ...updated, reactions: updated.reactions || {} } : m
            ));
          } else if (payload.eventType === 'DELETE') {
            const old = payload.old as any;
            if (old?.id) {
              setMessages(prev => prev.filter(m => m.id !== old.id));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchMessages]);

  // Auto-scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
    if (isNearBottom) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  // Fermer le menu
  useEffect(() => {
    if (!activeMenu) return;
    const handler = () => setActiveMenu(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [activeMenu]);

  // Filtrer les mentions
  const onlineNames = new Set(onlineUsers.map(u => u.username));
  const filteredMentionUsers = allProfiles
    .filter(u => u.display_name !== username)
    .filter(u => !mentionFilter || u.display_name.toLowerCase().includes(mentionFilter.toLowerCase()))
    .map(u => ({ 
      username: u.display_name, 
      avatar_url: u.avatar_url, 
      isOnline: onlineNames.has(u.display_name), 
      is_developer: u.is_developer 
    }));

  // Gestion du textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);

    e.target.style.height = 'auto';
    const newHeight = Math.min(e.target.scrollHeight, MAX_TEXTAREA_HEIGHT);
    e.target.style.height = newHeight + 'px';
    
    e.target.style.overflowY = e.target.scrollHeight > MAX_TEXTAREA_HEIGHT ? 'auto' : 'hidden';

    const cursorPos = e.target.selectionStart || val.length;
    const textBeforeCursor = val.slice(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@(\w*)$/);
    
    if (atMatch) {
      setShowMentions(true);
      setMentionFilter(atMatch[1]);
      setMentionIndex(0);
    } else {
      setShowMentions(false);
      setMentionFilter('');
    }
  };

  const insertMention = (mentionUsername: string) => {
    const cursorPos = textareaRef.current?.selectionStart || input.length;
    const textBeforeCursor = input.slice(0, cursorPos);
    const textAfterCursor = input.slice(cursorPos);
    const newBefore = textBeforeCursor.replace(/@(\w*)$/, `@${mentionUsername} `);
    setInput(newBefore + textAfterCursor);
    setShowMentions(false);
    setMentionFilter('');
    textareaRef.current?.focus();
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentions && filteredMentionUsers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex(prev => (prev + 1) % filteredMentionUsers.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex(prev => (prev - 1 + filteredMentionUsers.length) % filteredMentionUsers.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(filteredMentionUsers[mentionIndex].username);
        return;
      }
      if (e.key === 'Escape') {
        setShowMentions(false);
        return;
      }
    }
    
    if (e.key === 'Enter') {
      if (isMobile) {
        return; // Sur mobile, Entrée = saut de ligne
      } else {
        if (!e.shiftKey) {
          e.preventDefault(); // Sur PC, Entrée seul = rien
        }
      }
    }
  };

  // Envoyer un message
  const sendMessage = async () => {
    if (!input.trim()) return;
    
    const text = input;
    setInput('');
    setShowEmoji(false);
    setShowMentions(false);
    
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    
    try {
      const { error } = await supabase.from('community_messages').insert({
        auteur: username,
        avatar: userAvatar || username[0].toUpperCase(),
        couleur: userColor,
        contenu: text,
        type: 'text',
        reactions: {},
        reply_to: replyTo?.id || null,
        user_id: user?.id,
      });
      
      if (error) throw error;
      
      setReplyTo(null);
      
    } catch (err) {
      console.error('❌ Erreur envoi message:', err);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'envoyer le message',
        variant: 'destructive',
      });
    }
  };

  // Message vocal
  const handleVoiceMessage = async (audioBlob: Blob) => {
    setUploading(true);
    
    try {
      const fileName = `voice-${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage
        .from('community-media')
        .upload(fileName, audioBlob);
        
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabase.storage
        .from('community-media')
        .getPublicUrl(fileName);
        
      const { error: insertError } = await supabase.from('community_messages').insert({
        auteur: username,
        avatar: userAvatar || username[0].toUpperCase(),
        couleur: userColor,
        contenu: '🎤 Message vocal',
        type: 'audio',
        image_url: urlData.publicUrl,
        reactions: {},
        user_id: user?.id,
      });
      
      if (insertError) throw insertError;
      
    } catch (err) {
      console.error('❌ Erreur envoi vocal:', err);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'envoyer le message vocal',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  // Upload de fichier
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > MAX_FILE_SIZE) { 
      toast({ 
        title: 'Fichier trop volumineux', 
        description: 'Max 100 Mo.', 
        variant: 'destructive' 
      }); 
      return; 
    }
    
    setUploading(true);
    
    try {
      const ext = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      
      const { error: uploadError } = await supabase.storage
        .from('community-media')
        .upload(fileName, file);
        
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabase.storage
        .from('community-media')
        .getPublicUrl(fileName);
      
      const fileType = file.type.startsWith('image/') ? 'image' : 
                      file.type.startsWith('video/') ? 'video' : 'file';
      
      const fileLabel = file.type.startsWith('image/') ? '📷 Photo' :
                       file.type.startsWith('video/') ? '🎥 Vidéo' : 
                       `📎 ${file.name}`;
      
      const { error: insertError } = await supabase.from('community_messages').insert({
        auteur: username, 
        avatar: userAvatar || username[0].toUpperCase(), 
        couleur: userColor,
        contenu: fileLabel, 
        type: fileType,
        image_url: urlData.publicUrl, 
        reactions: {}, 
        user_id: user?.id,
      });
      
      if (insertError) throw insertError;
      
    } catch (err) {
      console.error('❌ Erreur upload:', err);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'uploader le fichier',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Réactions
  const addReaction = async (msgId: string, emoji: string) => {
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;
    
    try {
      const reactions = { ...msg.reactions };
      
      // Retirer l'utilisateur des autres réactions
      Object.keys(reactions).forEach(key => {
        if (key !== emoji) {
          reactions[key] = (reactions[key] || []).filter(u => u !== username);
          if (reactions[key].length === 0) delete reactions[key];
        }
      });
      
      // Ajouter/retirer la réaction
      const users = reactions[emoji] || [];
      if (users.includes(username)) {
        reactions[emoji] = users.filter(u => u !== username);
        if (reactions[emoji].length === 0) delete reactions[emoji];
      } else {
        reactions[emoji] = [...users, username];
      }
      
      await supabase.from('community_messages').update({ reactions }).eq('id', msgId);
      
    } catch (err) {
      console.error('❌ Erreur réaction:', err);
    }
  };

  // Supprimer un message
  const deleteMessage = async (msg: Message) => {
    setActiveMenu(null);
    
    try {
      await supabase.from('community_messages').update({
        is_deleted: true,
        contenu: `🗑️ ${msg.auteur} a supprimé son message`,
        type: 'text',
        image_url: null,
      }).eq('id', msg.id);
      
    } catch (err) {
      console.error('❌ Erreur suppression:', err);
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer le message',
        variant: 'destructive',
      });
    }
  };

  // Éditer un message
  const startEdit = (msg: Message) => {
    setActiveMenu(null);
    setEditingMsg(msg.id);
    setEditInput(msg.contenu);
  };

  const confirmEdit = async () => {
    if (!editingMsg || !editInput.trim()) return;
    
    try {
      await supabase.from('community_messages').update({
        contenu: editInput.trim(),
        is_edited: true,
      }).eq('id', editingMsg);
      
      setEditingMsg(null);
      setEditInput('');
      
    } catch (err) {
      console.error('❌ Erreur édition:', err);
      toast({
        title: 'Erreur',
        description: 'Impossible de modifier le message',
        variant: 'destructive',
      });
    }
  };

  const cancelEdit = () => {
    setEditingMsg(null);
    setEditInput('');
  };

  // Copier un message
  const copyMessage = (msg: Message) => {
    setActiveMenu(null);
    navigator.clipboard.writeText(msg.contenu);
    toast({ title: 'Copié !', description: 'Message copié dans le presse-papier.' });
  };

  // Répondre à un message
  const replyToMessage = (msg: Message) => {
    setActiveMenu(null);
    setReplyTo(msg);
  };

  // Télécharger un fichier
  const handleDownload = async (url: string, type: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `community-${type}-${Date.now()}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      toast({ 
        title: 'Erreur', 
        description: 'Impossible de télécharger.', 
        variant: 'destructive' 
      });
    }
  };

  // Formatage du temps
  const formatTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleTimeString('fr-FR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      return '';
    }
  };

  // Rendu du texte avec mentions
  const renderMentionText = (text: string, isMe: boolean) => {
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, i) => {
      if (part.match(/^@\w+$/)) {
        return (
          <span key={i} className={`font-semibold ${isMe ? 'text-primary-foreground/90 underline' : 'text-primary'}`}>
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-destructive">
          <p className="text-lg font-medium">❌ Erreur</p>
          <p className="text-sm">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col animate-fade-in h-full px-2 pt-4 overflow-hidden">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-heading font-bold text-2xl">💬 Communauté</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users size={16} />
            <span>{onlineCount} en ligne</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pr-2">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <p className="text-lg">Aucun message pour le moment</p>
            <p className="text-sm">Soyez le premier à écrire ! 💬</p>
          </div>
        )}
        
        {messages.map((msg) => {
          const isMe = msg.auteur === username;
          const isDeleted = msg.is_deleted;
          
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] relative group`}>
                {/* Informations auteur */}
                <div className="flex items-center gap-2 mb-1">
                  {!isMe && (
                    msg.avatar?.startsWith('http') ? (
                      <img src={msg.avatar} alt={msg.auteur} className="w-7 h-7 rounded-full object-cover shrink-0" />
                    ) : (
                      <div 
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0"
                        style={{ backgroundColor: msg.couleur }}
                      >
                        {msg.avatar}
                      </div>
                    )
                  )}
                  
                  <span className="text-xs text-muted-foreground">
                    {!isMe && (
                      <span className="font-medium text-foreground mr-1">{msg.auteur}</span>
                    )}
                    {formatTime(msg.created_at)}
                    {msg.is_edited && !isDeleted && <span className="ml-1 italic">(modifié)</span>}
                  </span>
                </div>

                {/* Contenu du message */}
                <div className={`rounded-2xl overflow-hidden ${isMe ? 'rounded-br-md' : 'rounded-bl-md'}`}>
                  {isDeleted ? (
                    <div className="p-3 bg-muted/50 italic text-muted-foreground text-sm">
                      {isMe ? '🗑️ Vous avez supprimé ce message' : msg.contenu}
                    </div>
                  ) : (
                    <>
                      {msg.type === 'image' && msg.image_url && (
                        <div className="relative group">
                          <img 
                            src={msg.image_url} 
                            alt="Photo" 
                            className="max-w-full max-h-72 rounded-2xl cursor-pointer object-cover"
                            onClick={() => setPreviewFile({ url: msg.image_url!, type: 'image' })}
                          />
                          <button 
                            onClick={() => handleDownload(msg.image_url!, 'photo')}
                            className="absolute top-2 right-2 p-2 rounded-full bg-background/70 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Download size={16} />
                          </button>
                        </div>
                      )}
                      
                      {msg.type === 'video' && msg.image_url && (
                        <div className="relative group">
                          <video src={msg.image_url} controls className="max-w-full max-h-72 rounded-2xl" />
                          <button 
                            onClick={() => handleDownload(msg.image_url!, 'video')}
                            className="absolute top-2 right-2 p-2 rounded-full bg-background/70 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Download size={16} />
                          </button>
                        </div>
                      )}
                      
                      {msg.type === 'audio' && msg.image_url && (
                        <div className="p-3 bg-secondary rounded-2xl">
                          <audio src={msg.image_url} controls className="w-full" />
                        </div>
                      )}
                      
                      {msg.type === 'file' && msg.image_url && (
                        <div 
                          className="p-3 bg-secondary rounded-2xl flex items-center gap-3 group cursor-pointer"
                          onClick={() => handleDownload(msg.image_url!, 'file')}
                        >
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <FileText size={20} className="text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{msg.contenu}</p>
                            <p className="text-xs text-muted-foreground">Cliquer pour télécharger</p>
                          </div>
                          <Download size={16} className="text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      )}
                      
                      {msg.type === 'text' && (
                        editingMsg === msg.id ? (
                          <div className="flex items-center gap-1 p-1 bg-secondary rounded-xl">
                            <input
                              ref={editInputRef}
                              value={editInput}
                              onChange={e => setEditInput(e.target.value)}
                              onKeyDown={e => { 
                                if (e.key === 'Enter') confirmEdit(); 
                                if (e.key === 'Escape') cancelEdit(); 
                              }}
                              className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-background border border-border focus:border-primary outline-none text-foreground text-sm"
                            />
                            <button onClick={confirmEdit} className="p-2 text-primary hover:bg-muted rounded-lg">
                              <Check size={16} />
                            </button>
                            <button onClick={cancelEdit} className="p-2 text-muted-foreground hover:bg-muted rounded-lg">
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <div className={`p-3 ${isMe ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                              {renderMentionText(msg.contenu, isMe)}
                            </p>
                          </div>
                        )
                      )}
                    </>
                  )}
                </div>

                {/* Réactions */}
                {!isDeleted && (
                  <div className="flex items-center gap-1 mt-1">
                    {Object.entries(msg.reactions)
                      .filter(([, users]) => users?.length > 0)
                      .map(([emoji, users]) => {
                        const iReacted = users.includes(username);
                        return (
                          <button
                            key={emoji}
                            onClick={() => addReaction(msg.id, emoji)}
                            className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
                              iReacted ? 'bg-primary/20 ring-1 ring-primary/50' : 'bg-muted hover:bg-muted/80'
                            }`}
                          >
                            {emoji} {users.length}
                          </button>
                        );
                      })}
                    
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {reactionEmojis.map(e => (
                        <button
                          key={e}
                          onClick={() => addReaction(msg.id, e)}
                          className="text-xs p-1 hover:bg-muted rounded transition-colors"
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Zone de saisie */}
      <div className={`sticky bottom-0 flex items-end gap-2 py-2 border-t border-border bg-background z-10 transition-all duration-300 ${
        keyboardVisible ? 'pb-2' : 'pb-[calc(3.5rem+env(safe-area-inset-bottom))]'
      }`}>
        <input ref={fileInputRef} type="file" accept="*/*" onChange={handleFileUpload} className="hidden" />
        
        <div className="flex items-center shrink-0">
          <button 
            onClick={() => setShowEmoji(!showEmoji)} 
            className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <Smile size={20} />
          </button>
          <button 
            onClick={() => fileInputRef.current?.click()} 
            disabled={uploading} 
            className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
          >
            <Paperclip size={20} />
          </button>
          <VoiceRecorder onSend={handleVoiceMessage} />
        </div>
        
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
            placeholder={replyTo ? `Répondre à ${replyTo.auteur}...` : 'Tapez @ pour mentionner'}
            className="w-full px-4 py-2 rounded-xl bg-secondary border-none focus:ring-1 focus:ring-primary outline-none text-foreground text-sm resize-none overflow-y-auto"
            rows={1}
            style={{ maxHeight: MAX_TEXTAREA_HEIGHT + 'px' }}
          />
        </div>
        
        <button 
          onClick={sendMessage} 
          disabled={!input.trim() || uploading} 
          className="p-2 rounded-full text-primary hover:bg-secondary transition-colors disabled:opacity-30 shrink-0"
        >
          <Send size={20} />
        </button>
      </div>

      {/* Aperçu plein écran */}
      {previewFile && (
        <div 
          className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewFile(null)}
        >
          <button 
            onClick={() => setPreviewFile(null)} 
            className="absolute top-4 right-4 p-2 rounded-full bg-secondary hover:bg-muted transition-colors z-10"
          >
            <X size={24} />
          </button>
          
          {previewFile.type === 'image' ? (
            <img 
              src={previewFile.url} 
              alt="Preview" 
              className="max-w-full max-h-[90vh] object-contain rounded-xl"
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <video 
              src={previewFile.url} 
              controls 
              autoPlay 
              className="max-w-full max-h-[90vh] rounded-xl"
              onClick={e => e.stopPropagation()}
            />
          )}
        </div>
      )}
    </div>
  );
}
