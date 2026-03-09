import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  Send, Smile, Paperclip, X, MoreVertical, Users,
  ChevronDown
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { VoiceRecorder } from '@/components/VoiceRecorder';
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

const emojiPicker = ['😀', '😂', '😍', '🤔', '👍', '👏', '🎉', '🔥', '❤️', '💪', '📚', '🧠', '💡', '⚡', '🎯', '✅'];
const MAX_FILE_SIZE = 100 * 1024 * 1024;
const MAX_TEXTAREA_HEIGHT = 100;

export function CommunityPage() {
  const { toast } = useToast();
  const { user, profile, loading: authLoading } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const username = profile?.display_name || user?.email?.split('@')[0] || 'Vous';
  const userAvatar = profile?.avatar_url || `https://ui-avatars.com/api/?name=${username}&background=6C63FF&color=fff`;
  const userColor = '#6C63FF';

  // Charger les messages depuis Supabase
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
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les messages',
        variant: 'destructive',
      });
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

    // Realtime pour les nouveaux messages
    const channel = supabase
      .channel('community_messages_realtime')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'community_messages' },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages(prev => {
            const exists = prev.some(m => m.id === newMsg.id);
            if (exists) return prev;
            return [...prev, { ...newMsg, reactions: newMsg.reactions || {} }];
          });
        }
      )
      .subscribe();

    // Mise à jour périodique du compteur en ligne
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

  // Détection du scroll pour afficher/masquer le bouton
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatMessageTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const isToday = date.toDateString() === now.toDateString();
      
      if (isToday) {
        return format(date, 'HH:mm');
      } else {
        return format(date, 'dd/MM HH:mm');
      }
    } catch {
      return '';
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);

    e.target.style.height = 'auto';
    const newHeight = Math.min(e.target.scrollHeight, MAX_TEXTAREA_HEIGHT);
    e.target.style.height = newHeight + 'px';
    e.target.style.overflowY = e.target.scrollHeight > MAX_TEXTAREA_HEIGHT ? 'auto' : 'hidden';
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    
    const text = input;
    setInput('');
    setShowEmoji(false);
    
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    
    try {
      const { error } = await supabase.from('community_messages').insert({
        auteur: username,
        avatar: userAvatar,
        couleur: userColor,
        contenu: text,
        type: 'text',
        reactions: {},
        reply_to: replyingTo?.id || null,
        user_id: user?.id,
      });
      
      if (error) throw error;
      
      setReplyingTo(null);
      
      // Scroll en bas après envoi
      setTimeout(scrollToBottom, 100);
      
    } catch (err) {
      console.error('❌ Erreur envoi message:', err);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'envoyer le message',
        variant: 'destructive',
      });
    }
  };

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
      
      const fileType = file.type.startsWith('image/') ? 'image' : 'file';
      const fileLabel = file.type.startsWith('image/') ? '📷 Photo' : `📎 ${file.name}`;
      
      const { error: insertError } = await supabase.from('community_messages').insert({
        auteur: username,
        avatar: userAvatar,
        couleur: userColor,
        contenu: fileLabel,
        type: fileType,
        image_url: urlData.publicUrl,
        reactions: {},
        user_id: user?.id,
      });
      
      if (insertError) throw insertError;
      
      scrollToBottom();
      
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
        avatar: userAvatar,
        couleur: userColor,
        contenu: '🎤 Message vocal',
        type: 'audio',
        image_url: urlData.publicUrl,
        reactions: {},
        user_id: user?.id,
      });
      
      if (insertError) throw insertError;
      
      scrollToBottom();
      
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

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* En-tête avec compteur en ligne */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="font-heading font-semibold text-foreground">Communauté</h2>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users size={12} />
              <span>{onlineCount} en ligne</span>
            </div>
          </div>
        </div>
      </div>

      {/* Zone des messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-2 relative"
        style={{ 
          paddingBottom: keyboardVisible ? '80px' : 'calc(80px + env(safe-area-inset-bottom))'
        }}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <p className="text-lg">Aucun message pour le moment</p>
            <p className="text-sm">Soyez le premier à écrire ! 💬</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.auteur === username;
            const showAvatar = index === 0 || messages[index - 1]?.auteur !== msg.auteur;
            const isFirstOfGroup = showAvatar;
            
            return (
              <div
                key={msg.id}
                className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-fade-in`}
              >
                <div className={`flex max-w-[70%] ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end gap-2`}>
                  {/* Avatar */}
                  {!isMe && showAvatar && (
                    <img
                      src={msg.avatar || `https://ui-avatars.com/api/?name=${msg.auteur}&background=00BCD4&color=fff`}
                      alt={msg.auteur}
                      className="w-8 h-8 rounded-full mb-1 object-cover flex-shrink-0"
                    />
                  )}
                  {!isMe && !showAvatar && (
                    <div className="w-8 flex-shrink-0" />
                  )}
                  
                  {/* Bulle de message */}
                  <div className="flex flex-col">
                    {/* Nom de l'auteur (premier message seulement) */}
                    {!isMe && showAvatar && (
                      <span className="text-xs text-muted-foreground ml-2 mb-1">
                        {msg.auteur}
                      </span>
                    )}
                    
                    <div
                      className={`
                        px-3 py-2 rounded-2xl break-words
                        ${isMe 
                          ? 'bg-primary text-primary-foreground rounded-br-none' 
                          : 'bg-secondary text-foreground rounded-bl-none'
                        }
                        ${!isFirstOfGroup && isMe ? 'rounded-tr-none' : ''}
                        ${!isFirstOfGroup && !isMe ? 'rounded-tl-none' : ''}
                      `}
                    >
                      {msg.type === 'text' && (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {msg.contenu}
                        </p>
                      )}
                      
                      {msg.type === 'image' && msg.image_url && (
                        <img
                          src={msg.image_url}
                          alt="Image"
                          className="max-w-full max-h-60 rounded-lg cursor-pointer"
                          onClick={() => window.open(msg.image_url, '_blank')}
                        />
                      )}
                      
                      {msg.type === 'audio' && msg.image_url && (
                        <audio src={msg.image_url} controls className="w-full max-w-[200px]" />
                      )}
                    </div>
                    
                    {/* Heure */}
                    <div className={`flex items-center mt-1 text-[10px] text-muted-foreground ${isMe ? 'justify-end' : 'justify-start'} px-1`}>
                      <span>{formatMessageTime(msg.created_at)}</span>
                      {msg.is_edited && <span className="ml-1 italic">(modifié)</span>}
                    </div>
                  </div>
                  
                  {/* Espace pour les messages de l'utilisateur */}
                  {isMe && (
                    <div className="w-8 flex-shrink-0" />
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Bouton discret pour descendre */}
      {showScrollButton && messages.length > 0 && (
        <button
          onClick={scrollToBottom}
          className="fixed bottom-24 right-4 z-20 w-10 h-10 rounded-full bg-card/80 backdrop-blur-sm border border-border shadow-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-card transition-all animate-fade-in"
          aria-label="Descendre en bas"
        >
          <ChevronDown size={20} />
        </button>
      )}

      {/* Barre de saisie */}
      <div className="sticky bottom-0 bg-card/80 backdrop-blur-sm border-t border-border">
        {replyingTo && (
          <div className="flex items-center gap-2 px-4 py-2 bg-secondary/50 border-l-4 border-primary">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-primary">Réponse à {replyingTo.auteur}</p>
              <p className="text-xs text-muted-foreground truncate">{replyingTo.contenu}</p>
            </div>
            <button onClick={() => setReplyingTo(null)} className="p-1">
              <X size={14} />
            </button>
          </div>
        )}

        <div className="flex items-end gap-2 p-3">
          <input 
            ref={fileInputRef} 
            type="file" 
            accept="*/*" 
            onChange={handleFileUpload} 
            className="hidden" 
          />
          
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setShowEmoji(!showEmoji)} 
              className="p-2.5 rounded-full hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
            >
              <Smile size={20} />
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()} 
              disabled={uploading}
              className="p-2.5 rounded-full hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
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
              placeholder="Écrivez un message..."
              className="w-full px-4 py-2.5 rounded-2xl bg-secondary border-none focus:ring-1 focus:ring-primary outline-none text-foreground text-sm resize-none"
              rows={1}
              style={{ maxHeight: MAX_TEXTAREA_HEIGHT + 'px' }}
            />
          </div>

          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            className="p-2.5 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-30 flex-shrink-0"
          >
            <Send size={18} />
          </button>
        </div>

        {/* Emoji picker */}
        {showEmoji && (
          <div className="px-3 pb-3 animate-fade-in">
            <div className="bg-secondary rounded-2xl p-3">
              <div className="flex flex-wrap gap-2">
                {emojiPicker.map(e => (
                  <button
                    key={e}
                    onClick={() => {
                      setInput(prev => prev + e);
                      setShowEmoji(false);
                      textareaRef.current?.focus();
                    }}
                    className="text-xl hover:scale-125 transition-transform"
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Indicateur d'upload */}
        {uploading && (
          <div className="px-4 pb-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="animate-spin w-3 h-3 border-2 border-primary border-t-transparent rounded-full" />
              Envoi en cours...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
