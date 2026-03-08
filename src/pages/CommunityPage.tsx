import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Send, Smile, Users } from 'lucide-react';

interface Message {
  id: string;
  auteur: string;
  avatar: string;
  couleur: string;
  contenu: string;
  type: string;
  image_url?: string;
  created_at: string;
  reactions: Record<string, number>;
}

const reactionEmojis = ['👍', '❤️', '😂', '🔥'];
const emojiPicker = ['😀', '😂', '😍', '🤔', '👍', '👏', '🎉', '🔥', '❤️', '💪', '📚', '🧠', '💡', '⚡', '🎯', '✅'];

export function CommunityPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [loading, setLoading] = useState(true);
  const [onlineCount, setOnlineCount] = useState(0);
  const [username] = useState(() => {
    const stored = localStorage.getItem('community_username');
    if (stored) return stored;
    const names = ['Étudiant', 'User', 'Anonyme'];
    const name = names[Math.floor(Math.random() * names.length)] + Math.floor(Math.random() * 100);
    localStorage.setItem('community_username', name);
    return name;
  });
  const [userColor] = useState(() => {
    const stored = localStorage.getItem('community_color');
    if (stored) return stored;
    const colors = ['#6C63FF', '#00BCD4', '#FF6B6B', '#FFB74D', '#AB47BC', '#4CAF50'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    localStorage.setItem('community_color', color);
    return color;
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    const { data, error } = await supabase
      .from('community_messages')
      .select('*')
      .order('created_at', { ascending: true });
    if (!error && data) {
      setMessages(data.map(m => ({
        ...m,
        reactions: (m.reactions as Record<string, number>) || {},
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMessages();

    // Realtime for messages
    const msgChannel = supabase
      .channel('community_messages_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_messages' }, () => {
        fetchMessages();
      })
      .subscribe();

    // Presence for online count
    const presenceChannel = supabase.channel('community_presence', {
      config: { presence: { key: username } },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        setOnlineCount(Object.keys(state).length);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({ username, color: userColor });
        }
      });

    return () => {
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(presenceChannel);
    };
  }, [fetchMessages, username, userColor]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const text = input;
    setInput('');
    setShowEmoji(false);

    await supabase.from('community_messages').insert({
      auteur: username,
      avatar: username[0].toUpperCase(),
      couleur: userColor,
      contenu: text,
      type: 'text',
      reactions: {},
    });
  };

  const addReaction = async (msgId: string, emoji: string) => {
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;
    const reactions = { ...msg.reactions };
    reactions[emoji] = (reactions[emoji] || 0) + 1;
    await supabase.from('community_messages').update({ reactions }).eq('id', msgId);
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto h-[calc(100vh-10rem)] md:h-[calc(100vh-8rem)] flex flex-col animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-heading font-bold text-2xl">💬 Communauté</h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users size={16} />
          <span>{onlineCount} en ligne</span>
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
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-fade-in`}>
              <div className={`max-w-[80%] ${isMe ? 'order-2' : ''}`}>
                <div className="flex items-center gap-2 mb-1">
                  {!isMe && (
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0" style={{ backgroundColor: msg.couleur }}>
                      {msg.avatar}
                    </div>
                  )}
                  <span className="text-xs text-muted-foreground">{!isMe && <span className="font-medium text-foreground mr-1">{msg.auteur}</span>}{formatTime(msg.created_at)}</span>
                </div>
                <div className={`p-3 rounded-2xl ${isMe ? 'bg-primary text-primary-foreground rounded-br-md' : 'bg-secondary rounded-bl-md'}`}>
                  <p className="text-sm leading-relaxed">{msg.contenu}</p>
                </div>
                {/* Reactions */}
                <div className="flex items-center gap-1 mt-1 flex-wrap">
                  {Object.entries(msg.reactions).filter(([, count]) => count > 0).map(([emoji, count]) => (
                    <button key={emoji} onClick={() => addReaction(msg.id, emoji)} className="text-xs px-2 py-0.5 rounded-full bg-muted hover:bg-muted/80 transition-colors">
                      {emoji} {count}
                    </button>
                  ))}
                  <div className="flex gap-0.5 opacity-0 hover:opacity-100 transition-opacity">
                    {reactionEmojis.map(e => (
                      <button key={e} onClick={() => addReaction(msg.id, e)} className="text-xs p-1 hover:bg-muted rounded transition-colors">
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
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

      {/* Input */}
      <div className="flex items-center gap-2 pt-3 border-t border-border">
        <button onClick={() => setShowEmoji(!showEmoji)} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
          <Smile size={20} />
        </button>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder="Écrire un message..."
          className="flex-1 px-4 py-3 rounded-xl bg-secondary border border-border focus:border-primary outline-none text-foreground"
        />
        <button onClick={sendMessage} disabled={!input.trim()} className="p-3 rounded-xl gradient-bg text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50">
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
