import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Send, Smile, Users, Image, Download, X, Copy, Reply, Pencil, Trash2, Check, MoreVertical, Paperclip, FileText, LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useOnlineCount } from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { GoogleLoginButton } from '@/components/GoogleLoginButton';

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
}

const reactionEmojis = ['👍', '❤️', '😂', '🔥'];
const emojiPicker = ['😀', '😂', '😍', '🤔', '👍', '👏', '🎉', '🔥', '❤️', '💪', '📚', '🧠', '💡', '⚡', '🎯', '✅'];

const MAX_FILE_SIZE = 100 * 1024 * 1024;

export function CommunityPage() {
  const { toast } = useToast();
  const onlineCount = useOnlineCount();
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ url: string; type: 'image' | 'video' } | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [editingMsg, setEditingMsg] = useState<string | null>(null);
  const [editInput, setEditInput] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const username = profile?.display_name || user?.email?.split('@')[0] || 'Anonyme';
  const userAvatar = profile?.avatar_url || '';
  const userColor = '#6C63FF';
  const scrollRef = useRef<HTMLDivElement>(null);

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
    fetchMessages();
    const msgChannel = supabase
      .channel('community_messages_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_messages' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newMsg = payload.new as any;
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

    const pollInterval = setInterval(() => { fetchMessages(); }, 1000);

    return () => {
      supabase.removeChannel(msgChannel);
      clearInterval(pollInterval);
    };
  }, [fetchMessages]);

  const prevMsgCount = useRef(0);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Only auto-scroll if user is near bottom or new messages were added
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

  // Close menu on outside click
  useEffect(() => {
    if (!activeMenu) return;
    const handler = () => setActiveMenu(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [activeMenu]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const text = input;
    setInput('');
    setShowEmoji(false);
    const replyId = replyTo?.id || null;
    setReplyTo(null);

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
    if (file.size > MAX_FILE_SIZE) { toast({ title: 'Fichier trop volumineux', description: 'Max 100 Mo.', variant: 'destructive' }); return; }
    setUploading(true);
    const ext = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('community-media').upload(fileName, file);
    if (uploadError) { toast({ title: 'Erreur upload', description: uploadError.message, variant: 'destructive' }); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from('community-media').getPublicUrl(fileName);
    const fileType = getFileType(file);
    await supabase.from('community_messages').insert({
      auteur: username, avatar: userAvatar || username[0].toUpperCase(), couleur: userColor,
      contenu: getFileLabel(file), type: fileType,
      image_url: urlData.publicUrl, reactions: {}, user_id: user?.id,
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
    // Remove user from ALL other emojis first (1 emoji per user per message)
    for (const key of Object.keys(reactions)) {
      if (key !== emoji) {
        reactions[key] = reactions[key].filter(u => u !== username);
        if (reactions[key].length === 0) delete reactions[key];
      }
    }
    const users = reactions[emoji] || [];
    if (users.includes(username)) {
      // Toggle off same emoji
      reactions[emoji] = users.filter(u => u !== username);
      if (reactions[emoji].length === 0) delete reactions[emoji];
    } else {
      // Set this emoji
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

  if (!user) {
    return <GoogleLoginButton />;
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
          <div className="flex items-center gap-2">
            {userAvatar && <img src={userAvatar} alt="" className="w-6 h-6 rounded-full" />}
            <span className="text-xs text-muted-foreground hidden sm:inline">{username}</span>
            <button onClick={signOut} className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Déconnexion">
              <LogOut size={14} />
            </button>
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
                  <span className="text-xs text-muted-foreground">
                    {!isMe && <span className="font-medium text-foreground mr-1">{msg.auteur}</span>}
                    {formatTime(msg.created_at)}
                    {msg.is_edited && !isDeleted && <span className="ml-1 italic">(modifié)</span>}
                  </span>

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
                          {/* Reply */}
                          <button onClick={() => replyToMessage(msg)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors">
                            <Reply size={14} /> Répondre
                          </button>
                          {/* Copy */}
                          {msg.type === 'text' && (
                            <button onClick={() => copyMessage(msg)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors">
                              <Copy size={14} /> Copier
                            </button>
                          )}
                          {/* Edit (own messages only) */}
                          {isMe && msg.type === 'text' && (
                            <button onClick={() => startEdit(msg)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors">
                              <Pencil size={14} /> Modifier
                            </button>
                          )}
                          {/* Delete (own messages only) */}
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
                            <p className="text-sm leading-relaxed">{msg.contenu}</p>
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
      <div className="flex items-center gap-2 py-2 border-t border-border bg-background" style={{ flexShrink: 0 }}>
        <input ref={fileInputRef} type="file" accept="*/*" onChange={handleFileUpload} className="hidden" />
        <div className="flex items-center shrink-0">
          <button onClick={() => setShowEmoji(!showEmoji)} className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            <Smile size={20} />
          </button>
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-50">
            <Paperclip size={20} />
          </button>
        </div>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder={replyTo ? `Répondre à ${replyTo.auteur}...` : 'Aa'}
          className="flex-1 min-w-0 px-4 py-2 rounded-full bg-secondary border-none focus:ring-1 focus:ring-primary outline-none text-foreground text-sm"
        />
        <button onClick={sendMessage} disabled={!input.trim()} className="p-2 rounded-full text-primary hover:bg-secondary transition-colors disabled:opacity-30 shrink-0">
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
