import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  Send, Smile, Paperclip, X, MoreVertical, Users, Download, Eye,
  ChevronDown, Trash2, Reply, Copy, Pencil, Check
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import { useMessageViews } from '@/hooks/useMessageViews';
import { useTyping } from '@/hooks/useTyping';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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
  const { user, profile, loading: authLoading } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMsg, setEditingMsg] = useState<string | null>(null);
  const [editInput, setEditInput] = useState('');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  const [allProfiles, setAllProfiles] = useState<any[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const username = profile?.display_name || user?.email?.split('@')[0] || 'Vous';
  const userAvatar = profile?.avatar_url || `https://ui-avatars.com/api/?name=${username}&background=6C63FF&color=fff`;
  const userColor = '#6C63FF';

  const { startTyping, stopTyping } = useTyping();
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Charger les profils pour les mentions
  useEffect(() => {
    const fetchProfiles = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('display_name, avatar_url, is_developer');
      if (data) setAllProfiles(data);
    };
    fetchProfiles();
  }, []);

  // Charger les messages
  const fetchMessages = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('community_messages')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      setMessages(data?.map(m => ({ ...m, reactions: (m.reactions || {}) as Record<string, string[]> })) || []);
    } catch (err) {
      console.error('❌ Erreur chargement messages:', err);
      toast({ title: 'Erreur', description: 'Impossible de charger les messages', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Charger le nombre de personnes en ligne
  const fetchOnlineCount = useCallback(async () => {
    try {
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      setOnlineCount(count || 0);
    } catch (err) {
      console.error('❌ Erreur chargement en ligne:', err);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
    fetchOnlineCount();

    const channel = supabase
      .channel('community_messages_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_messages' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newMsg = payload.new as Message;
          setMessages(prev => [...prev, { ...newMsg, reactions: newMsg.reactions || {} }]);
        } else if (payload.eventType === 'UPDATE') {
          const updated = payload.new as Message;
          setMessages(prev => prev.map(m => m.id === updated.id ? { ...m, ...updated, reactions: updated.reactions || {} } : m));
        } else if (payload.eventType === 'DELETE') {
          const old = payload.old as Message;
          setMessages(prev => prev.filter(m => m.id !== old.id));
        }
      })
      .subscribe();

    const interval = setInterval(fetchOnlineCount, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [fetchMessages, fetchOnlineCount]);

  // Détection du clavier mobile
  useEffect(() => {
    const handleResize = () => {
      const isKeyboard = window.innerHeight < window.outerHeight * 0.8;
      setKeyboardVisible(isKeyboard);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Détection du scroll
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollButton(!isNearBottom);
  }, []);

  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (scrollElement) {
      scrollElement.addEventListener('scroll', handleScroll);
      return () => scrollElement.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  useEffect(() => {
    if (editingMsg && editInputRef.current) editInputRef.current.focus();
  }, [editingMsg]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatMessageTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const isToday = date.toDateString() === new Date().toDateString();
      return isToday ? format(date, 'HH:mm') : format(date, 'dd/MM HH:mm');
    } catch {
      return '';
    }
  };

  // Gestion des mentions
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);

    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, MAX_TEXTAREA_HEIGHT) + 'px';
    e.target.style.overflowY = e.target.scrollHeight > MAX_TEXTAREA_HEIGHT ? 'auto' : 'hidden';

    startTyping();
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(stopTyping, 2000);

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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // PAS d'envoi par Entrée
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    
    const text = input;
    setInput('');
    setShowEmoji(false);
    
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    
    try {
      await supabase.from('community_messages').insert({
        auteur: username,
        avatar: userAvatar,
        couleur: userColor,
        contenu: text,
        type: 'text',
        reactions: {},
        reply_to: replyingTo?.id || null,
        user_id: user?.id,
      });
      
      setReplyingTo(null);
      stopTyping();
      setTimeout(scrollToBottom, 100);
      
    } catch (err) {
      console.error('❌ Erreur envoi message:', err);
      toast({ title: 'Erreur', description: 'Impossible d\'envoyer le message', variant: 'destructive' });
    }
  };

  const addReaction = async (msgId: string, emoji: string) => {
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;
    
    const reactions = { ...msg.reactions };
    Object.keys(reactions).forEach(key => {
      if (key !== emoji) {
        reactions[key] = (reactions[key] || []).filter(u => u !== username);
        if (reactions[key].length === 0) delete reactions[key];
      }
    });
    
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
    toast({ title: 'Message supprimé', duration: 2000 });
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
    toast({ title: '✅ Copié !', duration: 2000 });
  };

  const replyToMessage = (msg: Message) => {
    setActiveMenu(null);
    setReplyingTo(msg);
    textareaRef.current?.focus();
  };

  const handleVoiceMessage = async (audioBlob: Blob) => {
    setUploading(true);
    try {
      const fileName = `voice-${Date.now()}.webm`;
      await supabase.storage.from('community-media').upload(fileName, audioBlob);
      const { data: urlData } = supabase.storage.from('community-media').getPublicUrl(fileName);
      await supabase.from('community_messages').insert({
        auteur: username,
        avatar: userAvatar,
        couleur: userColor,
        contenu: '🎤 Message vocal',
        type: 'audio',
        image_url: urlData.publicUrl,
        reactions: {},
        user_id: user?.id,
      });
      scrollToBottom();
    } catch (err) {
      console.error('❌ Erreur envoi vocal:', err);
      toast({ title: 'Erreur', description: 'Impossible d\'envoyer le message vocal', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const filteredMentionUsers = allProfiles
    .filter(p => p.display_name && p.display_name !== username)
    .filter(p => !mentionFilter || p.display_name.toLowerCase().includes(mentionFilter.toLowerCase()));

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* En-tête simple */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Users size={16} />
          <span>{onlineCount} en ligne</span>
        </div>
      </div>

      {/* Zone des messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-2"
        style={{ paddingBottom: keyboardVisible ? '80px' : 'calc(80px + env(safe-area-inset-bottom))' }}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <p className="text-lg">Aucun message pour le moment</p>
            <p className="text-sm">Soyez le premier à écrire ! 💬</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.auteur === username;
            const isDeleted = msg.is_deleted;
            const showAvatar = index === 0 || messages[index - 1]?.auteur !== msg.auteur;
            const viewers = useMessageViews(msg.id);

            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group/msg`}>
                <div className={`flex max-w-[70%] ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end gap-2`}>
                  {!isMe && showAvatar && (
                    <img src={msg.avatar} alt={msg.auteur} className="w-8 h-8 rounded-full mb-1 object-cover flex-shrink-0" />
                  )}
                  {!isMe && !showAvatar && <div className="w-8 flex-shrink-0" />}

                  <div className="flex flex-col">
                    {!isMe && showAvatar && (
                      <span className="text-xs text-muted-foreground ml-2 mb-1">{msg.auteur}</span>
                    )}

                    {isDeleted ? (
                      <div className="px-3 py-2 bg-muted/50 italic text-muted-foreground text-sm rounded-2xl">
                        {isMe ? '🗑️ Vous avez supprimé ce message' : msg.contenu}
                      </div>
                    ) : (
                      <>
                        {editingMsg === msg.id ? (
                          <div className="flex items-center gap-1 p-1 bg-secondary rounded-xl">
                            <input
                              ref={editInputRef}
                              value={editInput}
                              onChange={e => setEditInput(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') confirmEdit(); if (e.key === 'Escape') cancelEdit(); }}
                              className="flex-1 px-3 py-2 rounded-lg bg-background border border-border focus:border-primary outline-none text-sm"
                            />
                            <button onClick={confirmEdit} className="p-2 text-primary"><Check size={16} /></button>
                            <button onClick={cancelEdit} className="p-2 text-muted-foreground"><X size={16} /></button>
                          </div>
                        ) : (
                          <div className={`px-3 py-2 rounded-2xl break-words ${
                            isMe ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-secondary text-foreground rounded-bl-none'
                          }`}>
                            {msg.type === 'text' && <p className="text-sm whitespace-pre-wrap">{msg.contenu}</p>}
                            {msg.type === 'image' && msg.image_url && (
                              <img src={msg.image_url} alt="Image" className="max-w-full max-h-60 rounded-lg cursor-pointer" onClick={() => window.open(msg.image_url)} />
                            )}
                            {msg.type === 'audio' && msg.image_url && <audio src={msg.image_url} controls className="w-full max-w-[200px]" />}
                          </div>
                        )}
                      </>
                    )}

                    <div className={`flex items-center gap-2 mt-1 text-[10px] text-muted-foreground ${isMe ? 'justify-end' : 'justify-start'} px-1`}>
                      <span>{formatMessageTime(msg.created_at)}</span>
                      {msg.is_edited && !isDeleted && <span className="italic">(modifié)</span>}
                      
                      {/* Vues du message */}
                      {viewers.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Eye size={10} />
                          <span>{viewers.length}</span>
                          <div className="flex -space-x-1">
                            {viewers.slice(0, 3).map((v, i) => (
                              <img key={i} src={v.user.avatar_url} alt="" className="w-4 h-4 rounded-full border border-background" title={`Vu par ${v.user.display_name}`} />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Menu contextuel */}
                  {!isDeleted && !msg.id.startsWith('temp-') && (
                    <div className="relative">
                      <button
                        onClick={() => setActiveMenu(activeMenu === msg.id ? null : msg.id)}
                        className="p-1 rounded opacity-0 group-hover/msg:opacity-100 transition-opacity"
                      >
                        <MoreVertical size={14} />
                      </button>
                      {activeMenu === msg.id && (
                        <div className="absolute z-40 bottom-6 right-0 bg-popover border rounded-lg shadow-lg py-1 min-w-[150px]">
                          <button onClick={() => replyToMessage(msg)} className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted"><Reply size={14} /> Répondre</button>
                          <button onClick={() => copyMessage(msg)} className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted"><Copy size={14} /> Copier</button>
                          {isMe && (
                            <>
                              <button onClick={() => startEdit(msg)} className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted"><Pencil size={14} /> Modifier</button>
                              <button onClick={() => deleteMessage(msg)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-destructive hover:bg-muted"><Trash2 size={14} /> Supprimer</button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {isMe && <div className="w-8 flex-shrink-0" />}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />

        {/* Typing indicator */}
        <TypingIndicator />
      </div>

      {/* Bouton pour descendre */}
      {showScrollButton && messages.length > 0 && (
        <button
          onClick={scrollToBottom}
          className="fixed bottom-24 right-4 z-20 w-10 h-10 rounded-full bg-card/80 backdrop-blur-sm border shadow-lg flex items-center justify-center hover:bg-card transition-all"
        >
          <ChevronDown size={20} />
        </button>
      )}

      {/* Mentions dropdown */}
      {showMentions && filteredMentionUsers.length > 0 && (
        <div className="absolute bottom-24 left-4 right-4 z-30 bg-popover border rounded-xl shadow-lg max-h-40 overflow-y-auto">
          {filteredMentionUsers.map((u, i) => (
            <button
              key={u.id}
              onClick={() => insertMention(u.display_name)}
              className={`flex items-center gap-2 w-full px-3 py-2 text-sm ${i === mentionIndex ? 'bg-primary/10' : 'hover:bg-muted'}`}
            >
              <img src={u.avatar_url} alt="" className="w-6 h-6 rounded-full" />
              <span>{u.display_name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Barre de saisie */}
      <div className="sticky bottom-0 bg-card/80 backdrop-blur-sm border-t">
        {replyingTo && (
          <div className="flex items-center gap-2 px-4 py-2 bg-secondary/50 border-l-4 border-primary">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-primary">Réponse à {replyingTo.auteur}</p>
              <p className="text-xs text-muted-foreground truncate">{replyingTo.contenu}</p>
            </div>
            <button onClick={() => setReplyingTo(null)}><X size={14} /></button>
          </div>
        )}

        <div className="flex items-end gap-2 p-3">
          <input ref={fileInputRef} type="file" className="hidden" onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setUploading(true);
            try {
              const ext = file.name.split('.').pop();
              const fileName = `${Date.now()}.${ext}`;
              await supabase.storage.from('community-media').upload(fileName, file);
              const { data: urlData } = supabase.storage.from('community-media').getPublicUrl(fileName);
              await supabase.from('community_messages').insert({
                auteur: username,
                avatar: userAvatar,
                couleur: userColor,
                contenu: file.type.startsWith('image/') ? '📷 Photo' : `📎 ${file.name}`,
                type: file.type.startsWith('image/') ? 'image' : 'file',
                image_url: urlData.publicUrl,
                reactions: {},
                user_id: user?.id,
              });
            } catch (err) {
              toast({ title: 'Erreur', variant: 'destructive' });
            } finally {
              setUploading(false);
            }
          }} />
          
          <button onClick={() => setShowEmoji(!showEmoji)} className="p-2.5 rounded-full hover:bg-secondary">
            <Smile size={20} />
          </button>
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="p-2.5 rounded-full hover:bg-secondary disabled:opacity-50">
            <Paperclip size={20} />
          </button>
          <VoiceRecorder onSend={handleVoiceMessage} />

          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
            placeholder="Écrivez un message..."
            className="flex-1 px-4 py-2.5 rounded-2xl bg-secondary border-none focus:ring-1 focus:ring-primary outline-none resize-none"
            rows={1}
            style={{ maxHeight: MAX_TEXTAREA_HEIGHT + 'px' }}
          />

          <button onClick={sendMessage} disabled={!input.trim()} className="p-2.5 rounded-full bg-primary text-primary-foreground disabled:opacity-30">
            <Send size={18} />
          </button>
        </div>

        {showEmoji && (
          <div className="px-3 pb-3">
            <div className="bg-secondary rounded-2xl p-3 flex flex-wrap gap-2">
              {emojiPicker.map(e => (
                <button key={e} onClick={() => { setInput(prev => prev + e); setShowEmoji(false); }} className="text-xl hover:scale-125">
                  {e}
                </button>
              ))}
            </div>
          </div>
        )}

        {uploading && (
          <div className="px-4 pb-3 text-xs text-muted-foreground">
            <div className="animate-spin w-3 h-3 border-2 border-primary border-t-transparent rounded-full inline-block mr-2" />
            Envoi...
          </div>
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  const [typingUsers, setTypingUsers] = useState<any[]>([]);
  
  useEffect(() => {
    const channel = supabase
      .channel('typing_status')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'typing_status' }, async () => {
        const { data } = await supabase
          .from('typing_status' as any)
          .select('user_id, updated_at')
          .gt('updated_at', new Date(Date.now() - 3000).toISOString());
        if (data) {
          const userIds = (data as any[]).map((d: any) => d.user_id);
          const { data: profiles } = await supabase.from('profiles').select('id, display_name, avatar_url').in('id', userIds);
          setTypingUsers((data as any[]).map((d: any) => ({ user_id: d.user_id, profiles: profiles?.find(p => p.id === d.user_id) || { display_name: '...', avatar_url: '' } })));
        }
      })
      .subscribe();
      
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('typing_status' as any)
        .select('user_id, updated_at')
        .gt('updated_at', new Date(Date.now() - 3000).toISOString());
      if (data) {
        const userIds = (data as any[]).map((d: any) => d.user_id);
        if (userIds.length > 0) {
          const { data: profiles } = await supabase.from('profiles').select('id, display_name, avatar_url').in('id', userIds);
          setTypingUsers((data as any[]).map((d: any) => ({ user_id: d.user_id, profiles: profiles?.find(p => p.id === d.user_id) || { display_name: '...', avatar_url: '' } })));
        } else {
          setTypingUsers([]);
        }
      }
    }, 1000);
    
    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);
  
  if (typingUsers.length === 0) return null;
  
  return (
    <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
      <div className="flex -space-x-2">
        {typingUsers.slice(0, 3).map((user) => (
          <img key={user.user_id} src={user.profiles.avatar_url} alt="" className="w-6 h-6 rounded-full border-2 border-background" />
        ))}
      </div>
      <span>
        {typingUsers.length === 1 ? `${typingUsers[0].profiles.display_name} écrit...` : `${typingUsers.length} personnes écrivent...`}
      </span>
      <div className="flex gap-1">
        <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
        <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
        <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
      </div>
    </div>
  );
}
