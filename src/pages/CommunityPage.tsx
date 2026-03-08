import { useState, useRef, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Send, Smile, Image, Users } from 'lucide-react';

const reactionEmojis = ['👍', '❤️', '😂', '🔥'];
const emojiPicker = ['😀', '😂', '😍', '🤔', '👍', '👏', '🎉', '🔥', '❤️', '💪', '📚', '🧠', '💡', '⚡', '🎯', '✅'];

export function CommunityPage() {
  const { messages, setMessages } = useApp();
  const [input, setInput] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [username] = useState(() => {
    const names = ['Étudiant', 'User', 'Anonyme'];
    return names[Math.floor(Math.random() * names.length)] + Math.floor(Math.random() * 100);
  });
  const [userColor] = useState(() => {
    const colors = ['#6C63FF', '#00BCD4', '#FF6B6B', '#FFB74D', '#AB47BC', '#4CAF50'];
    return colors[Math.floor(Math.random() * colors.length)];
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim()) return;
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      auteur: username,
      avatar: username[0].toUpperCase(),
      couleur: userColor,
      contenu: input,
      type: 'text',
      heure: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      reactions: {},
    }]);
    setInput('');
    setShowEmoji(false);
  };

  const addReaction = (msgId: string, emoji: string) => {
    setMessages(prev => prev.map(m => {
      if (m.id !== msgId) return m;
      const reactions = { ...m.reactions };
      reactions[emoji] = (reactions[emoji] || 0) + 1;
      return { ...m, reactions };
    }));
  };

  return (
    <div className="max-w-3xl mx-auto h-[calc(100vh-10rem)] md:h-[calc(100vh-8rem)] flex flex-col animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-heading font-bold text-2xl">💬 Communauté</h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users size={16} />
          <span>{Math.floor(Math.random() * 20) + 5} en ligne</span>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pr-2">
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
                  <span className="text-xs text-muted-foreground">{!isMe && <span className="font-medium text-foreground mr-1">{msg.auteur}</span>}{msg.heure}</span>
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
