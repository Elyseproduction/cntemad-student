import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Send, Smile, Users, Image, Download, X, Copy, Reply, Pencil, Trash2, Check, MoreVertical, Paperclip, FileText, LogOut, AtSign, ShieldCheck, Code, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useOnlineCount, useOnlineUsers } from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { useMessageViews } from '@/hooks/useMessageViews';
import { useTyping } from '@/hooks/useTyping';
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
const MAX_TEXTAREA_HEIGHT = 120; // 120px = environ 4-5 lignes

export function CommunityPage() {
  const { toast } = useToast();
  const onlineCount = useOnlineCount();
  const { users: onlineUsers } = useOnlineUsers();
  const { user, profile, loading: authLoading } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [allProfiles, setAllProfiles] = useState<{ display_name: string; avatar_url: string | null; is_admin_badge: boolean; is_developer?: boolean }[]>([]);
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
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Détection mobile
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    setIsMobile(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
  }, []);

  const username = profile?.display_name || user?.email?.split('@')[0] || 'Anonyme';
  const userAvatar = profile?.avatar_url || '';
  const userColor = '#6C63FF';

  const { startTyping, stopTyping } = useTyping();
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Détection de l'ouverture/fermeture du clavier sur mobile
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

  const fetchMessages = useCallback(async () => {
    const { data, error } = await supabase
      .from('community_messages')
      .select('*')
      .order('created_at', { ascending: true });
    if (!error && data) {
      setMessages(data.map(m => ({
        ...m,
        reactions: (m.reactions as Record<string, string[]>) || {},
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const fetchProfiles = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('display_name, avatar_url, is_admin_badge, is_developer');
      if (data) setAllProfiles(data.filter(p => p.display_name).map(p => ({ 
        display_name: p.display_name!, 
        avatar_url: p.avatar_url, 
        is_admin_badge: (p as any).is_admin_badge ?? false, 
        is_developer: (p as any).is_developer ?? false 
      })));
    };
    fetchProfiles();
  }, []);

  useEffect(() => {
    fetchMessages();
    const msgChannel = supabase
      .channel('community_messages_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_messages' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newMsg = payload.new as any;
          if (newMsg.auteur !== username && newMsg.contenu?.includes(`@${username}`)) {
            toast({ title: `💬 ${newMsg.auteur} vous a mentionné`, description: newMsg.contenu.slice(0, 80) });
          }
          setMessages(prev => {
            const exists = prev.some(m => m.id === newMsg.id);
            const filtered = prev.filter(m => !(m.id.startsWith('temp-') && m.auteur === newMsg.auteur && m.contenu === newMsg.contenu));
            if (exists) return prev;
            return [...filtered, { ...newMsg, reactions: (newMsg.reactions as Record<string, string[]>) || {} }];
          });
        } else if (payload.eventType === 'UPDATE') {
          const updated = payload.new as any;
          setMessages(prev => prev.map(m => m.id === updated.id ? { ...m, ...updated, reactions: (updated.reactions as Record<string, string[]>) || {} } : m));
        } else if (payload.eventType === 'DELETE') {
          const old = payload.old as any;
          if (old?.id) setMessages(prev => prev.filter(m => m.id !== old.id));
        }
      })
      .subscribe();

    const pollInterval = setInterval(() => { fetchMessages(); }, 10000);

    return () => {
      supabase.removeChannel(msgChannel);
      clearInterval(pollInterval);
    };
  }, [fetchMessages]);

  const prevMsgCount = useRef(0);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
    const hasNewMessages = messages.length > prevMsgCount.current;
    if (isNearBottom && hasNewMessages) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
    prevMsgCount.current = messages.length;
  }, [messages]);

  useEffect(() => {
    if (editingMsg && editInputRef.current) editInputRef.current.focus();
  }, [editingMsg]);

  useEffect(() => {
    if (!activeMenu) return;
    const handler = () => setActiveMenu(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [activeMenu]);

  const onlineNames = new Set(onlineUsers.map(u => u.username));
  const filteredMentionUsers = allProfiles
    .filter(u => u.display_name !== username)
    .filter(u => !mentionFilter || u.display_name.toLowerCase().includes(mentionFilter.toLowerCase()))
    .map(u => ({ username: u.display_name, avatar_url: u.avatar_url, isOnline: onlineNames.has(u.display_name), is_developer: u.is_developer }));

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);

    // Auto-resize avec limite
    e.target.style.height = 'auto';
    const newHeight = Math.min(e.target.scrollHeight, MAX_TEXTAREA_HEIGHT);
    e.target.style.height = newHeight + 'px';
    
    // Gestion du scroll interne si on dépasse la limite
    if (e.target.scrollHeight > MAX_TEXTAREA_HEIGHT) {
      e.target.style.overflowY = 'auto';
    } else {
      e.target.style.overflowY = 'hidden';
    }

    // Scroll automatique des messages quand on dépasse
    if (scrollRef.current && e.target.scrollHeight > MAX_TEXTAREA_HEIGHT) {
      const isNearBottom = scrollRef.current.scrollHeight - scrollRef.current.scrollTop - scrollRef.current.clientHeight < 50;
      if (isNearBottom) {
        setTimeout(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }
        }, 10);
      }
    }

    startTyping();
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 2000);

    // Détection des mentions
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
    
    // Gestion intelligente de la touche Entrée
    if (e.key === 'Enter') {
      if (isMobile) {
        // Sur mobile, Entrée = saut de ligne
        return;
      } else {
        // Sur PC, Entrée seul = rien, Shift+Entrée = saut de ligne
        if (!e.shiftKey) {
          e.preventDefault();
        }
      }
    }
  };

  const notifyMentionedUsers = (text: string) => {
    const mentions = text.match(/@(\w+)/g);
    if (!mentions) return;
    const mentionedNames = mentions.map(m => m.slice(1));
    const onlineNames = onlineUsers.map(u => u.username);
    const notified = mentionedNames.filter(n => onlineNames.includes(n) && n !== username);
    if (notified.length > 0) {
      toast({ title: '📢 Mention envoyée', description: `${notified.join(', ')} sera notifié(e)` });
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    const text = input;
    setInput('');
    setShowEmoji(false);
    setShowMentions(false);
    
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    
    const replyId = replyTo?.id || null;
    setReplyTo(null);
    stopTyping();

    notifyMentionedUsers(text);

    const optimisticMsg: Message = {
      id: `temp-${Date.now()}`,
      auteur: username,
      avatar: userAvatar || username[0].toUpperCase(),
      couleur: userColor,
      contenu: text,
      type: 'text',
      created_at: new Date().toISOString(),
      reactions: {},
      reply_to: replyId,
      user_id: user?.id,
    };
    setMessages(prev => [...prev, optimisticMsg]);

    await supabase.from('community_messages').insert({
      auteur: username,
      avatar: userAvatar || username[0].toUpperCase(),
      couleur: userColor,
      contenu: text,
      type: 'text',
      reactions: {},
      reply_to: replyId,
      user_id: user?.id,
    });
  };

  const handleVoiceMessage = async (audioBlob: Blob) => {
    setUploading(true);
    
    const fileName = `voice-${Date.now()}.webm`;
    const { error: uploadError } = await supabase.storage
      .from('community-media')
      .upload(fileName, audioBlob);
      
    if (uploadError) {
      toast({ title: 'Erreur', description: uploadError.message, variant: 'destructive' });
      setUploading(false);
      return;
    }
    
    const { data: urlData } = supabase.storage
      .from('community-media')
      .getPublicUrl(fileName);
      
    await supabase.from('community_messages').insert({
      auteur: username,
      avatar: userAvatar || username[0].toUpperCase(),
      couleur: userColor,
      contenu: '🎤 Message vocal',
      type: 'audio',
      image_url: urlData.publicUrl,
      reactions: {},
      user_id: user?.id,
    });
    
    setUploading(false);
  };

  const getFileType = (file: File): 'image' | 'video' | 'file' => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    return 'file';
  };

  const getFileLabel = (file: File): string => {
    const ext = file.name.split('.').pop()?.toUpperCase() || 'FICHIER';
    if (file.type.startsWith('image/')) return '📷 Photo';
    if (file.type.startsWith('video/')) return '🎥 Vidéo';
    return `📎 ${file.name}`;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) { 
      toast({ title: 'Fichier trop volumineux', description: 'Max 100 Mo.', variant: 'destructive' }); 
      return; 
    }
    setUploading(true);
    const ext = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('community-media').upload(fileName, file);
    if (uploadError) { 
      toast({ title: 'Erreur upload', description: uploadError.message, variant: 'destructive' }); 
      setUploading(false); 
      return; 
    }
    const { data: urlData } = supabase.storage.from('community-media').getPublicUrl(fileName);
    const fileType = getFileType(file);
    await supabase.from('community_messages').insert({
      auteur: username, 
      avatar: userAvatar || username[0].toUpperCase(), 
      couleur: userColor,
      contenu: getFileLabel(file), 
      type: fileType,
      image_url: urlData.publicUrl, 
      reactions: {}, 
      user_id: user?.id,
    });
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const addReaction = async (msgId: string, emoji: string) => {
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;
    const reactions: Record<string, string[]> = {};
    for (const [key, val] of Object.entries(msg.reactions)) {
      reactions[key] = Array.isArray(val) ? [...val] : [];
    }
    for (const key of Object.keys(reactions)) {
      if (key !== emoji) {
        reactions[key] = reactions[key].filter(u => u !== username);
        if (reactions[key].length === 0) delete reactions[key];
      }
    }
    const users = reactions[emoji] || [];
    if (users.includes(username)) {
      reactions[emoji] = users.filter(u => u !== username);
      if (reactions[emoji].length === 0) delete reactions[emoji];
    } else {
      reactions[emoji] = [...users, username];
    }
    await supabase.from('community_messages').update({ reactions }).eq('id', msgId);
  };

  const deleteMessage = async (msg: Message) => {
    setActiveMenu(null);
    await supabase.from('community_messages').update({
      is_deleted: true,
      contenu: `🗑️ ${msg.auteur} a supprimé son message`,
      type: 'text',
      image_url: null,
    }).eq('id', msg.id);
  };

  const startEdit = (msg: Message) => {
    setActiveMenu(null);
    setEditingMsg(msg.id);
    setEditInput(msg.contenu);
  };

  const confirmEdit = async () => {
    if (!editingMsg || !editInput.trim()) return;
    await supabase.from('community_messages').update({
      contenu: editInput.trim(),
      is_edited: true,
    }).eq('id', editingMsg);
    setEditingMsg(null);
    setEditInput('');
  };

  const cancelEdit = () => {
    setEditingMsg(null);
    setEditInput('');
  };

  const copyMessage = (msg: Message) => {
    setActiveMenu(null);
    navigator.clipboard.writeText(msg.contenu);
    toast({ title: 'Copié !', description: 'Message copié dans le presse-papier.' });
  };

  const replyToMessage = (msg: Message) => {
    setActiveMenu(null);
    setReplyTo(msg);
  };

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
      return part;
    });
  };

  const formatTime = (dateStr: string) => new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const getReplyMsg = (id: string | null | undefined) => id ? messages.find(m => m.id === id) : null;

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
      toast({ title: 'Erreur', description: 'Impossible de télécharger.', variant: 'destructive' });
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col animate-fade-in h-full px-2 pt-4 overflow-hidden">
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
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pr-2 touch-pan-y overscroll-contain">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <p className="text-lg">Aucun message pour le moment</p>
            <p className="text-sm">Soyez le premier à écrire ! 💬</p>
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.auteur === username;
          const isDeleted = msg.is_deleted;
          const replyMsg = getReplyMsg(msg.reply_to);
          const viewers = useMessageViews(msg.id);

          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-fade-in group/msg`}>
              <div className={`max-w-[80%] ${isMe ? 'order-2' : ''} relative`}>
                {/* Author info */}
                <div className="flex items-center gap-2 mb-1">
                  {!isMe && (
                    msg.avatar?.startsWith('http') ? (
                      <img src={msg.avatar} alt={msg.auteur} className="w-7 h-7 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0" style={{ backgroundColor: msg.couleur }}>
                        {msg.avatar}
                      </div>
                    )
                  )}
                   <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                     {!isMe && (
                       <>
                         <span className="font-medium text-foreground mr-1">{msg.auteur}</span>
                         {allProfiles.find(p => p.display_name === msg.auteur)?.is_developer && (
                           <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-accent/20 text-accent font-semibold"><Code size={11} /> Dev</span>
                         )}
                         {allProfiles.find(p => p.display_name === msg.auteur)?.is_admin_badge && (
                           <ShieldCheck size={12} className="text-primary shrink-0" />
                         )}
                       </>
                     )}
                    {formatTime(msg.created_at)}
                    {msg.is_edited && !isDeleted && <span className="ml-1 italic">(modifié)</span>}
                  </span>

                  {/* Views indicator */}
                  {viewers.length > 0 && (
                    <div className="flex items-center gap-1 ml-2">
                      <Eye size={12} className="text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{viewers.length}</span>
                      <div className="flex -space-x-2">
                        {viewers.slice(0, 3).map((viewer, i) => (
                          <img
                            key={i}
                            src={viewer.user.avatar_url || `https://ui-avatars.com/api/?name=${viewer.user.display_name}&background=6C63FF&color=fff`}
                            alt={viewer.user.display_name}
                            className="w-5 h-5 rounded-full border-2 border-background"
                            title={`Vu par ${viewer.user.display_name} ${new Date(viewer.viewed_at).toLocaleTimeString()}`}
                          />
                        ))}
                        {viewers.length > 3 && (
                          <span className="text-xs text-muted-foreground ml-1">+{viewers.length - 3}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Context menu button */}
                  {!isDeleted && !msg.id.startsWith('temp-') && (
                    <div className="relative">
                      <button
                        onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === msg.id ? null : msg.id); }}
                        className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted opacity-0 group-hover/msg:opacity-100 transition-opacity"
                      >
                        <MoreVertical size={14} />
                      </button>

                      {activeMenu === msg.id && (
                        <div className="absolute z-40 top-6 right-0 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[150px] animate-fade-in" onClick={e => e.stopPropagation()}>
                          <button onClick={() => replyToMessage(msg)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors">
                            <Reply size={14} /> Répondre
                          </button>
                          {msg.type === 'text' && (
                            <button onClick={() => copyMessage(msg)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors">
                              <Copy size={14} /> Copier
                            </button>
                          )}
                          {isMe && msg.type === 'text' && (
                            <button onClick={() => startEdit(msg)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors">
                              <Pencil size={14} /> Modifier
                            </button>
                          )}
                          {isMe && (
                            <button onClick={() => deleteMessage(msg)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-destructive hover:bg-muted transition-colors">
                              <Trash2 size={14} /> Supprimer
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Reply preview */}
                {replyMsg && (
                  <div className="mb-1 pl-3 border-l-2 border-primary/50 text-xs text-muted-foreground truncate max-w-full">
                    <span className="font-medium text-foreground">{replyMsg.auteur}</span>: {replyMsg.is_deleted ? 'Message supprimé' : replyMsg.contenu}
                  </div>
                )}

                <div className={`rounded-2xl overflow-hidden ${isMe ? 'rounded-br-md' : 'rounded-bl-md'}`}>
                  {/* Deleted message */}
                  {isDeleted ? (
                    <div className="p-3 bg-muted/50 italic text-muted-foreground text-sm">
                      {isMe ? '🗑️ Vous avez supprimé ce message' : msg.contenu}
                    </div>
                  ) : (
                    <>
                      {msg.type === 'image' && msg.image_url && (
                        <div className="relative group">
                          <img src={msg.image_url} alt="Photo" className="max-w-full max-h-72 rounded-2xl cursor-pointer object-cover" onClick={() => setPreviewFile({ url: msg.image_url!, type: 'image' })} />
                          <button onClick={() => handleDownload(msg.image_url!, 'photo')} className="absolute top-2 right-2 p-2 rounded-full bg-background/70 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background/90" title="Télécharger">
                            <Download size={16} />
                          </button>
                        </div>
                      )}
                      {msg.type === 'video' && msg.image_url && (
                        <div className="relative group">
                          <video src={msg.image_url} controls className="max-w-full max-h-72 rounded-2xl" preload="metadata" />
                          <button onClick={() => handleDownload(msg.image_url!, 'video')} className="absolute top-2 right-2 p-2 rounded-full bg-background/70 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background/90" title="Télécharger">
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
                        <div className="p-3 bg-secondary rounded-2xl flex items-center gap-3 group cursor-pointer" onClick={() => handleDownload(msg.image_url!, 'file')}>
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
                              onKeyDown={e => { if (e.key === 'Enter') confirmEdit(); if (e.key === 'Escape') cancelEdit(); }}
                              className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-background border border-border focus:border-primary outline-none text-foreground text-sm"
                            />
                            <button onClick={confirmEdit} className="p-2 text-primary hover:bg-muted rounded-lg"><Check size={16} /></button>
                            <button onClick={cancelEdit} className="p-2 text-muted-foreground hover:bg-muted rounded-lg"><X size={16} /></button>
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

                {/* Reactions */}
                {!isDeleted && (
                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                    {Object.entries(msg.reactions).filter(([, users]) => Array.isArray(users) && users.length > 0).map(([emoji, users]) => {
                      const userList = Array.isArray(users) ? users : [];
                      const iReacted = userList.includes(username);
                      return (
                        <button key={emoji} onClick={() => addReaction(msg.id, emoji)} className={`text-xs px-2 py-0.5 rounded-full transition-colors ${iReacted ? 'bg-primary/20 ring-1 ring-primary/50' : 'bg-muted hover:bg-muted/80'}`}>
                          {emoji} {userList.length}
                        </button>
                      );
                    })}
                    <div className="flex gap-0.5 opacity-0 group-hover/msg:opacity-100 transition-opacity">
                      {reactionEmojis.map(e => (
                        <button key={e} onClick={() => addReaction(msg.id, e)} className="text-xs p-1 hover:bg-muted rounded transition-colors">
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

      {/* Typing indicator */}
      <TypingIndicator />

      {/* Emoji picker */}
      {showEmoji && (
        <div className="glass-card p-3 mb-2 animate-scale-in">
          <div className="flex flex-wrap gap-2">
            {emojiPicker.map(e => (
              <button key={e} onClick={() => { setInput(prev => prev + e); setShowEmoji(false); }} className="text-xl hover:scale-125 transition-transform">
                {e}
              </button>
            ))}
          </div>
        </div>
      )}

      {uploading && (
        <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground animate-fade-in">
          <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
          Envoi en cours...
        </div>
      )}

      {/* Mention dropdown */}
      {showMentions && filteredMentionUsers.length > 0 && (
        <div className="bg-popover border border-border rounded-xl shadow-lg py-1 mb-1 max-h-40 overflow-y-auto animate-fade-in">
          <div className="px-3 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Mentionner un utilisateur</div>
          {filteredMentionUsers.map((u, i) => (
            <button
              key={u.username}
              onClick={() => insertMention(u.username)}
              className={`flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors ${i === mentionIndex ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'}`}
            >
              {u.avatar_url ? (
                <img src={u.avatar_url} alt={u.username} className="w-6 h-6 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold bg-primary text-primary-foreground shrink-0">
                  {u.username[0]?.toUpperCase()}
                </div>
              )}
              <span className="truncate">{u.username}</span>
              {u.is_developer && <span className="text-xs px-1.5 py-0.5 rounded bg-accent/20 text-accent font-semibold shrink-0">Dev</span>}
              {u.isOnline && <span className="ml-auto w-2 h-2 rounded-full bg-green-500 shrink-0" title="En ligne" />}
            </button>
          ))}
        </div>
      )}

      {/* Reply banner */}
      {replyTo && (
        <div className="flex items-center gap-2 px-3 py-2 bg-secondary/80 rounded-t-xl border-l-2 border-primary text-sm animate-fade-in">
          <Reply size={14} className="text-primary shrink-0" />
          <span className="truncate text-muted-foreground">
            Répondre à <span className="font-medium text-foreground">{replyTo.auteur}</span>: {replyTo.contenu}
          </span>
          <button onClick={() => setReplyTo(null)} className="ml-auto shrink-0 p-1 hover:bg-muted rounded">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Input */}
      <div className={`sticky bottom-0 flex items-end gap-2 py-2 border-t border-border bg-background z-10 transition-all duration-300 ${
        keyboardVisible ? 'pb-2' : 'pb-[calc(3.5rem+env(safe-area-inset-bottom))]'
      }`} style={{ flexShrink: 0 }}>
        <input ref={fileInputRef} type="file" accept="*/*" onChange={handleFileUpload} className="hidden" />
        <div className="flex items-center shrink-0">
          <button onClick={() => setShowEmoji(!showEmoji)} className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            <Smile size={20} />
          </button>
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-50">
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
            onFocus={() => {
              if (isMobile && scrollRef.current) {
                setTimeout(() => {
                  if (scrollRef.current) {
                    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                  }
                }, 300);
              }
            }}
            placeholder={replyTo ? `Répondre à ${replyTo.auteur}...` : 'Tapez @ pour mentionner'}
            className="w-full px-4 py-2 rounded-xl bg-secondary border-none focus:ring-1 focus:ring-primary outline-none text-foreground text-sm resize-none overflow-y-auto"
            rows={1}
            style={{ 
              maxHeight: MAX_TEXTAREA_HEIGHT + 'px',
              height: 'auto'
            }}
          />
          {input.length > 0 && textareaRef.current?.scrollHeight > MAX_TEXTAREA_HEIGHT && (
            <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-secondary/50 to-transparent pointer-events-none" />
          )}
        </div>
        <button 
          onClick={sendMessage} 
          disabled={!input.trim()} 
          className="p-2 rounded-full text-primary hover:bg-secondary transition-colors disabled:opacity-30 shrink-0"
          title="Envoyer"
        >
          <Send size={20} />
        </button>
      </div>

      {/* Fullscreen preview */}
      {previewFile && (
        <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPreviewFile(null)}>
          <button onClick={() => setPreviewFile(null)} className="absolute top-4 right-4 p-2 rounded-full bg-secondary hover:bg-muted transition-colors z-10"><X size={24} /></button>
          <button onClick={(e) => { e.stopPropagation(); handleDownload(previewFile.url, previewFile.type); }} className="absolute top-4 right-16 p-2 rounded-full bg-secondary hover:bg-muted transition-colors z-10" title="Télécharger"><Download size={24} /></button>
          {previewFile.type === 'image' ? (
            <img src={previewFile.url} alt="Preview" className="max-w-full max-h-[90vh] object-contain rounded-xl" onClick={e => e.stopPropagation()} />
          ) : (
            <video src={previewFile.url} controls autoPlay className="max-w-full max-h-[90vh] rounded-xl" onClick={e => e.stopPropagation()} />
          )}
        </div>
      )}
    </div>
  );
}

function TypingIndicator() {
  const [typingUsers, setTypingUsers] = useState<any[]>([]);
  
  useEffect(() => {
    const channel = supabase
      .channel('typing_status')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'typing_status' },
        async () => {
          const { data } = await supabase
            .from('typing_status')
            .select('user_id, profiles(display_name, avatar_url)')
            .gt('updated_at', new Date(Date.now() - 3000).toISOString());
          setTypingUsers(data || []);
        }
      )
      .subscribe();
      
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('typing_status')
        .select('user_id, profiles(display_name, avatar_url)')
        .gt('updated_at', new Date(Date.now() - 3000).toISOString());
      setTypingUsers(data || []);
    }, 1000);
    
    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);
  
  if (typingUsers.length === 0) return null;
  
  return (
    <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground animate-fade-in">
      <div className="flex -space-x-2">
        {typingUsers.slice(0, 3).map((user) => (
          <img
            key={user.user_id}
            src={user.profiles.avatar_url || `https://ui-avatars.com/api/?name=${user.profiles.display_name}&background=6C63FF&color=fff`}
            alt={user.profiles.display_name}
            className="w-6 h-6 rounded-full border-2 border-background"
          />
        ))}
      </div>
      <span>
        {typingUsers.length === 1 
          ? `${typingUsers[0].profiles.display_name} écrit...`
          : `${typingUsers.length} personnes écrivent...`}
      </span>
      <div className="flex gap-1">
        <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
        <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
        <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
      </div>
    </div>
  );
}
