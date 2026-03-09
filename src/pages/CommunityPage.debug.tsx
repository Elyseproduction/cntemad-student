// Version simplifiée pour diagnostiquer le problème
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Send } from 'lucide-react';

export function CommunityPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Test simple de connexion Supabase
    const testConnection = async () => {
      try {
        console.log('🔄 Test de connexion Supabase...');
        
        // Test 1: Vérifier la session
        const { data: sessionData } = await supabase.auth.getSession();
        console.log('✅ Session:', sessionData?.session?.user?.email || 'Non connecté');
        setUser(sessionData?.session?.user || null);

        // Test 2: Essayer de lire les messages
        const { data, error } = await supabase
          .from('community_messages')
          .select('*')
          .limit(5);
        
        if (error) {
          console.error('❌ Erreur Supabase:', error);
          setError(`Erreur Supabase: ${error.message}`);
        } else {
          console.log('✅ Messages chargés:', data?.length || 0);
          setMessages(data || []);
        }
      } catch (err) {
        console.error('❌ Exception:', err);
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
      } finally {
        setLoading(false);
      }
    };

    testConnection();
  }, []);

  const sendMessage = async () => {
    if (!input.trim()) return;
    
    try {
      const { error } = await supabase.from('community_messages').insert({
        auteur: user?.email?.split('@')[0] || 'Anonyme',
        avatar: 'A',
        couleur: '#6C63FF',
        contenu: input,
        type: 'text',
        reactions: {},
      });
      
      if (error) throw error;
      
      setInput('');
    } catch (err) {
      console.error('Erreur envoi:', err);
      alert('Erreur: ' + (err instanceof Error ? err.message : 'Inconnue'));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p>Chargement de la communauté...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen p-4">
        <div className="bg-destructive/10 text-destructive p-6 rounded-xl max-w-md">
          <h2 className="font-bold text-lg mb-2">❌ Erreur de chargement</h2>
          <p className="mb-4">{error}</p>
          <p className="text-sm text-muted-foreground mb-4">
            Vérifiez que la table 'community_messages' existe dans Supabase
            et que les politiques RLS sont correctement configurées.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="font-bold text-2xl mb-4">💬 Communauté</h1>
      
      <div className="border rounded-lg p-4 mb-4 h-96 overflow-y-auto bg-card">
        {messages.length === 0 ? (
          <p className="text-center text-muted-foreground mt-20">
            Aucun message pour le moment
          </p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="mb-3 p-2 bg-secondary rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-xs text-white">
                  {msg.avatar}
                </div>
                <span className="font-medium text-sm">{msg.auteur}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(msg.created_at).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-sm">{msg.contenu}</p>
            </div>
          ))
        )}
      </div>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Votre message..."
          className="flex-1 px-4 py-2 rounded-lg bg-secondary border-none focus:ring-1 focus:ring-primary outline-none"
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim()}
          className="p-2 rounded-full text-primary hover:bg-secondary disabled:opacity-30"
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );
}
