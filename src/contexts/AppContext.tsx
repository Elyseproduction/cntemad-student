import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Types
export interface Section {
  type: 'h1' | 'h2' | 'h3' | 'definition' | 'retenir' | 'attention' | 'code' | 'tableau' | 'schema';
  titre: string;
  contenu: string;
  mots_cles?: string[];
}

export interface Schema {
  description: string;
  representation_texte: string;
}

export interface Chapter {
  id: string;
  titre: string;
  difficulte: 'Facile' | 'Moyen' | 'Difficile';
  resume_intro: string;
  sections: Section[];
  schemas_detectes: Schema[];
  points_cles: string[];
  conseil_revision: string;
  published: boolean;
  learned?: boolean;
}

export interface Subject {
  id: string;
  nom: string;
  couleur: string;
  icone: string;
  chapitres: Chapter[];
}

export interface CommunityMessage {
  id: string;
  auteur: string;
  avatar: string;
  couleur: string;
  contenu: string;
  type: 'text' | 'image';
  imageUrl?: string;
  heure: string;
  reactions: Record<string, number>;
}

export interface Video {
  id: string;
  titre: string;
  description: string;
  youtubeUrl: string;
  youtubeId: string;
  matiere: string;
  date: string;
}

export interface ExerciseHistory {
  date: string;
  chapitre: string;
  score: number;
  total: number;
  type: string;
}

export interface AppNotification {
  id: string;
  message: string;
  tab: string;
  timestamp: number;
}

interface AppContextType {
  isAdmin: boolean;
  login: (password: string) => boolean;
  logout: () => void;
  subjects: Subject[];
  setSubjects: React.Dispatch<React.SetStateAction<Subject[]>>;
  messages: CommunityMessage[];
  setMessages: React.Dispatch<React.SetStateAction<CommunityMessage[]>>;
  videos: Video[];
  setVideos: React.Dispatch<React.SetStateAction<Video[]>>;
  exerciseHistory: ExerciseHistory[];
  addExerciseHistory: (h: ExerciseHistory) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  notifications: AppNotification[];
  dismissNotification: (id: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};

const defaultSubjects: Subject[] = [
  {
    id: '1',
    nom: 'Algorithmique',
    couleur: '#6C63FF',
    icone: '🧮',
    chapitres: [
      {
        id: '1-1',
        titre: 'Introduction aux algorithmes',
        difficulte: 'Facile',
        resume_intro: "Un algorithme est une suite finie d'instructions permettant de résoudre un problème. Ce chapitre pose les bases de la pensée algorithmique.",
        sections: [
          { type: 'h1', titre: "Qu'est-ce qu'un algorithme ?", contenu: "Un algorithme est une suite finie et ordonnée d'opérations élémentaires permettant de résoudre un problème donné. Il prend des données en entrée et produit un résultat en sortie.", mots_cles: ['algorithme', 'entrée', 'sortie'] },
          { type: 'definition', titre: 'Définition formelle', contenu: "Un algorithme est un procédé de calcul bien défini qui prend en entrée une ou plusieurs valeurs et produit en sortie une ou plusieurs valeurs.", mots_cles: ['procédé', 'calcul'] },
          { type: 'h2', titre: 'Propriétés fondamentales', contenu: "Un bon algorithme doit être : 1) Fini (se termine), 2) Défini (sans ambiguïté), 3) Efficace (utilise des ressources raisonnables), 4) Correct (produit le bon résultat).", mots_cles: ['fini', 'défini', 'efficace', 'correct'] },
          { type: 'retenir', titre: 'À retenir', contenu: "Tout algorithme doit avoir une condition d'arrêt. Un algorithme qui ne se termine pas est une boucle infinie.", mots_cles: ['boucle infinie', 'terminaison'] },
          { type: 'code', titre: 'Exemple : Algorithme de recherche', contenu: "fonction recherche(tableau T, élément x):\n  pour i de 0 à longueur(T)-1:\n    si T[i] == x:\n      retourner i\n  retourner -1", mots_cles: ['recherche', 'linéaire'] },
          { type: 'attention', titre: 'Attention', contenu: "Ne confondez pas algorithme et programme. Un algorithme est une description abstraite, un programme est son implémentation dans un langage spécifique.", mots_cles: ['programme', 'implémentation'] },
        ],
        schemas_detectes: [{ description: "Flux d'exécution d'un algorithme", representation_texte: "Entrée → Traitement → Sortie\n  ↑          ↓\n  └── Boucle ─┘" }],
        points_cles: ["Un algorithme est fini et déterministe", "Il prend des entrées et produit des sorties", "La complexité mesure l'efficacité"],
        conseil_revision: "Essayez d'écrire vos propres algorithmes pour des problèmes simples du quotidien.",
        published: true,
      },
      {
        id: '1-2',
        titre: 'Complexité algorithmique',
        difficulte: 'Moyen',
        resume_intro: "La complexité algorithmique permet de mesurer l'efficacité d'un algorithme en termes de temps et d'espace mémoire.",
        sections: [
          { type: 'h1', titre: 'Notation Big-O', contenu: "La notation O(n) décrit le comportement asymptotique d'un algorithme. Elle donne une borne supérieure sur le temps d'exécution.", mots_cles: ['Big-O', 'asymptotique', 'borne supérieure'] },
          { type: 'h2', titre: 'Complexités courantes', contenu: "O(1) - Constant\nO(log n) - Logarithmique\nO(n) - Linéaire\nO(n log n) - Quasi-linéaire\nO(n²) - Quadratique\nO(2^n) - Exponentiel", mots_cles: ['constant', 'linéaire', 'quadratique', 'exponentiel'] },
          { type: 'tableau', titre: 'Comparaison des complexités', contenu: "n=10: O(1)=1, O(n)=10, O(n²)=100, O(2^n)=1024\nn=100: O(1)=1, O(n)=100, O(n²)=10000, O(2^n)=1.27×10³⁰", mots_cles: ['comparaison'] },
          { type: 'retenir', titre: 'Règle d\'or', contenu: "Toujours chercher l'algorithme avec la meilleure complexité possible. Un algorithme O(n log n) est toujours préférable à O(n²) pour de grandes entrées.", mots_cles: ['optimisation'] },
        ],
        schemas_detectes: [],
        points_cles: ["Big-O mesure le pire cas", "Préférer O(n log n) à O(n²)", "L'espace mémoire compte aussi"],
        conseil_revision: "Calculez la complexité de chaque algorithme que vous écrivez.",
        published: true,
      },
    ],
  },
  {
    id: '2',
    nom: 'Réseaux',
    couleur: '#00BCD4',
    icone: '🌐',
    chapitres: [
      {
        id: '2-1',
        titre: 'Modèle OSI',
        difficulte: 'Moyen',
        resume_intro: "Le modèle OSI (Open Systems Interconnection) est un modèle de référence qui décompose les communications réseau en 7 couches.",
        sections: [
          { type: 'h1', titre: 'Les 7 couches du modèle OSI', contenu: "Le modèle OSI organise les protocoles réseau en 7 couches, de la plus basse (physique) à la plus haute (application).", mots_cles: ['OSI', 'couches', 'protocoles'] },
          { type: 'schema', titre: 'Architecture en couches', contenu: "7. Application  (HTTP, FTP, SMTP)\n6. Présentation (SSL, JPEG)\n5. Session      (NetBIOS)\n4. Transport    (TCP, UDP)\n3. Réseau       (IP, ICMP)\n2. Liaison      (Ethernet, Wi-Fi)\n1. Physique     (Câbles, ondes)", mots_cles: ['TCP', 'IP', 'HTTP'] },
          { type: 'definition', titre: 'Encapsulation', contenu: "Chaque couche ajoute un en-tête aux données reçues de la couche supérieure. Ce processus s'appelle l'encapsulation.", mots_cles: ['encapsulation', 'en-tête'] },
          { type: 'attention', titre: 'Piège courant', contenu: "Ne confondez pas le modèle OSI (7 couches, théorique) avec le modèle TCP/IP (4 couches, pratique).", mots_cles: ['TCP/IP', 'modèle'] },
        ],
        schemas_detectes: [{ description: "Encapsulation des données", representation_texte: "Application: [Données]\nTransport:   [En-tête TCP][Données]\nRéseau:      [En-tête IP][En-tête TCP][Données]\nLiaison:     [En-tête ETH][En-tête IP][En-tête TCP][Données][FCS]" }],
        points_cles: ["7 couches de physique à application", "Encapsulation ajoute des en-têtes", "TCP/IP est le modèle pratique"],
        conseil_revision: "Mémorisez les couches avec: 'Please Do Not Throw Sausage Pizza Away'",
        published: true,
      },
      {
        id: '2-2',
        titre: 'Protocole TCP/IP',
        difficulte: 'Difficile',
        resume_intro: "TCP/IP est la suite de protocoles fondamentale d'Internet, assurant la transmission fiable des données.",
        sections: [
          { type: 'h1', titre: 'TCP vs UDP', contenu: "TCP (Transmission Control Protocol) assure une transmission fiable avec accusé de réception. UDP (User Datagram Protocol) est plus rapide mais sans garantie de livraison.", mots_cles: ['TCP', 'UDP', 'fiabilité'] },
          { type: 'h2', titre: 'Le three-way handshake', contenu: "1. SYN: Le client envoie une demande\n2. SYN-ACK: Le serveur accepte\n3. ACK: Le client confirme\nLa connexion est établie.", mots_cles: ['SYN', 'ACK', 'handshake'] },
          { type: 'code', titre: 'Exemple de communication', contenu: "Client → SYN (seq=100) → Serveur\nClient ← SYN-ACK (seq=300, ack=101) ← Serveur\nClient → ACK (seq=101, ack=301) → Serveur\n// Connexion établie !", mots_cles: ['séquence', 'accusé'] },
        ],
        schemas_detectes: [],
        points_cles: ["TCP = fiable, UDP = rapide", "Three-way handshake pour TCP", "IP gère l'adressage"],
        conseil_revision: "Utilisez Wireshark pour observer de vrais paquets TCP en action.",
        published: true,
      },
    ],
  },
  {
    id: '3',
    nom: 'Base de Données',
    couleur: '#FF6B6B',
    icone: '🗄️',
    chapitres: [
      {
        id: '3-1',
        titre: 'Introduction au SQL',
        difficulte: 'Facile',
        resume_intro: "SQL (Structured Query Language) est le langage standard pour interagir avec les bases de données relationnelles.",
        sections: [
          { type: 'h1', titre: 'Les commandes SQL de base', contenu: "SQL se divise en plusieurs catégories : DDL (CREATE, ALTER, DROP), DML (SELECT, INSERT, UPDATE, DELETE), DCL (GRANT, REVOKE).", mots_cles: ['DDL', 'DML', 'DCL'] },
          { type: 'code', titre: 'Requêtes fondamentales', contenu: "-- Créer une table\nCREATE TABLE etudiants (\n  id INT PRIMARY KEY,\n  nom VARCHAR(50),\n  age INT\n);\n\n-- Insérer des données\nINSERT INTO etudiants VALUES (1, 'Alice', 20);\n\n-- Sélectionner\nSELECT * FROM etudiants WHERE age > 18;", mots_cles: ['CREATE', 'SELECT', 'INSERT'] },
          { type: 'definition', titre: 'Clé primaire', contenu: "Une clé primaire est un attribut (ou ensemble d'attributs) qui identifie de manière unique chaque enregistrement dans une table.", mots_cles: ['clé primaire', 'unique', 'identifiant'] },
          { type: 'retenir', titre: 'Bonnes pratiques', contenu: "Toujours définir une clé primaire. Utiliser des noms explicites pour les tables et colonnes. Éviter SELECT * en production.", mots_cles: ['bonnes pratiques'] },
        ],
        schemas_detectes: [],
        points_cles: ["SQL = langage des BDD relationnelles", "DDL pour la structure, DML pour les données", "Clé primaire = identifiant unique"],
        conseil_revision: "Pratiquez avec SQLite ou un outil en ligne comme DB Fiddle.",
        published: true,
      },
      {
        id: '3-2',
        titre: 'Normalisation',
        difficulte: 'Difficile',
        resume_intro: "La normalisation est le processus d'organisation des données pour minimiser la redondance et les anomalies.",
        sections: [
          { type: 'h1', titre: 'Les formes normales', contenu: "La normalisation passe par plusieurs formes normales (1NF, 2NF, 3NF, BCNF) pour structurer correctement une base de données.", mots_cles: ['1NF', '2NF', '3NF', 'BCNF'] },
          { type: 'h2', titre: 'Première forme normale (1NF)', contenu: "Une table est en 1NF si : tous les attributs sont atomiques (pas de valeurs multiples), il existe une clé primaire.", mots_cles: ['atomique', '1NF'] },
          { type: 'h2', titre: 'Deuxième forme normale (2NF)', contenu: "Une table est en 2NF si elle est en 1NF et que tous les attributs non-clé dépendent de la totalité de la clé primaire.", mots_cles: ['dépendance fonctionnelle', '2NF'] },
          { type: 'attention', titre: 'Piège', contenu: "Sur-normaliser peut nuire aux performances. En pratique, la 3NF est souvent suffisante.", mots_cles: ['performance', 'sur-normalisation'] },
        ],
        schemas_detectes: [],
        points_cles: ["1NF: attributs atomiques", "2NF: pas de dépendance partielle", "3NF: pas de dépendance transitive"],
        conseil_revision: "Prenez un exemple concret (bibliothèque, e-commerce) et normalisez-le étape par étape.",
        published: true,
      },
    ],
  },
];

const defaultMessages: CommunityMessage[] = [
  { id: '1', auteur: 'Alice', avatar: 'A', couleur: '#6C63FF', contenu: "Salut tout le monde ! Quelqu'un a compris le chapitre sur la normalisation ? 😅", type: 'text', heure: '14:32', reactions: { '👍': 3, '😂': 1 } },
  { id: '2', auteur: 'Bob', avatar: 'B', couleur: '#00BCD4', contenu: "Oui ! La 3NF c'est quand il n'y a pas de dépendance transitive. En gros, chaque attribut dépend directement de la clé primaire.", type: 'text', heure: '14:35', reactions: { '👍': 5, '❤️': 2 } },
  { id: '3', auteur: 'Clara', avatar: 'C', couleur: '#FF6B6B', contenu: "J'ai trouvé une super vidéo sur le modèle OSI, je la partage dans la vidéothèque ! 🎬", type: 'text', heure: '14:40', reactions: { '🔥': 4 } },
  { id: '4', auteur: 'David', avatar: 'D', couleur: '#FFB74D', contenu: "Les exercices IA sur l'algorithmique sont top, j'ai eu 9/10 ! 💪", type: 'text', heure: '15:02', reactions: { '🔥': 6, '👍': 3 } },
  { id: '5', auteur: 'Emma', avatar: 'E', couleur: '#AB47BC', contenu: "Qui est motivé pour réviser ensemble ce weekend ? On pourrait faire un appel et bosser les réseaux 🌐", type: 'text', heure: '15:15', reactions: { '❤️': 4, '👍': 2 } },
];

const defaultVideos: Video[] = [
  { id: '1', titre: "Comprendre les algorithmes de tri", description: "Explication visuelle des principaux algorithmes de tri", youtubeUrl: 'https://www.youtube.com/watch?v=kPRA0W1kECg', youtubeId: 'kPRA0W1kECg', matiere: 'Algorithmique', date: '2024-01-15' },
  { id: '2', titre: "Le modèle OSI expliqué simplement", description: "Les 7 couches du modèle OSI avec des exemples concrets", youtubeUrl: 'https://www.youtube.com/watch?v=7IS7gigunyI', youtubeId: '7IS7gigunyI', matiere: 'Réseaux', date: '2024-02-20' },
  { id: '3', titre: "SQL pour débutants - Cours complet", description: "Apprenez SQL de zéro avec des exercices pratiques", youtubeUrl: 'https://www.youtube.com/watch?v=HXV3zeQKqGY', youtubeId: 'HXV3zeQKqGY', matiere: 'Base de Données', date: '2024-03-10' },
];

// Helper to load/save config from Supabase
async function loadConfig(key: string): Promise<any | null> {
  const { data } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', key)
    .maybeSingle();
  return data?.value ?? null;
}

async function saveConfig(key: string, value: any) {
  // Upsert: insert or update
  const { error } = await supabase
    .from('app_config')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) console.error(`Failed to save config "${key}":`, error.message);
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem('app_admin') === 'true');
  const [subjects, setSubjects] = useState<Subject[]>(defaultSubjects);
  const [messages, setMessages] = useState<CommunityMessage[]>(defaultMessages);
  const [videos, setVideos] = useState<Video[]>(defaultVideos);
  const [exerciseHistory, setExerciseHistory] = useState<ExerciseHistory[]>([]);
  const [darkMode, setDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState('cours');
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const initialLoadDone = useRef(false);
  const isAdminRef = useRef(isAdmin);
  isAdminRef.current = isAdmin;

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Load subjects & videos from database on mount
  useEffect(() => {
    async function load() {
      const [dbSubjects, dbVideos] = await Promise.all([
        loadConfig('subjects'),
        loadConfig('videos'),
      ]);
      if (dbSubjects && Array.isArray(dbSubjects)) setSubjects(dbSubjects);
      if (dbVideos && Array.isArray(dbVideos)) setVideos(dbVideos);
      initialLoadDone.current = true;
    }
    load();
  }, []);

  // Realtime subscription: detect admin changes from other clients
  useEffect(() => {
    const channel = supabase
      .channel('app_config_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_config' },
        async (payload) => {
          // Don't notify if this client is the admin making changes
          if (isAdminRef.current) return;

          const record = payload.new as { key: string; value: any } | undefined;
          if (!record) return;

          if (record.key === 'subjects' && Array.isArray(record.value)) {
            const oldSubjects = subjectsRef.current;
            const newSubjects = record.value as Subject[];
            setSubjects(newSubjects);
            subjectsRef.current = newSubjects;

            // Detect changes
            const oldIds = new Set(oldSubjects.flatMap(s => s.chapitres.filter(c => c.published).map(c => c.id)));
            const newIds = new Set(newSubjects.flatMap(s => s.chapitres.filter(c => c.published).map(c => c.id)));
            const oldSubjectIds = new Set(oldSubjects.map(s => s.id));
            const newSubjectIds = new Set(newSubjects.map(s => s.id));

            // New subjects
            for (const s of newSubjects) {
              if (!oldSubjectIds.has(s.id)) {
                setNotifications(prev => [...prev, {
                  id: `subject-${s.id}-${Date.now()}`,
                  message: `📚 Nouvelle matière ajoutée : ${s.nom}`,
                  tab: 'cours',
                  timestamp: Date.now(),
                }]);
              }
            }
            // Deleted subjects
            for (const s of oldSubjects) {
              if (!newSubjectIds.has(s.id)) {
                setNotifications(prev => [...prev, {
                  id: `subject-del-${s.id}-${Date.now()}`,
                  message: `🗑️ Matière supprimée : ${s.nom}`,
                  tab: 'cours',
                  timestamp: Date.now(),
                }]);
              }
            }
            // New chapters
            for (const s of newSubjects) {
              for (const c of s.chapitres) {
                if (c.published && !oldIds.has(c.id)) {
                  setNotifications(prev => [...prev, {
                    id: `chapter-${c.id}-${Date.now()}`,
                    message: `📖 Nouveau cours publié : ${c.titre} (${s.nom})`,
                    tab: 'cours',
                    timestamp: Date.now(),
                  }]);
                }
              }
            }
          }

          if (record.key === 'videos' && Array.isArray(record.value)) {
            const oldVideos = videosRef.current;
            const newVideos = record.value as Video[];
            setVideos(newVideos);
            videosRef.current = newVideos;

            const oldVideoIds = new Set(oldVideos.map(v => v.id));
            const newVideoIds = new Set(newVideos.map(v => v.id));

            for (const v of newVideos) {
              if (!oldVideoIds.has(v.id)) {
                setNotifications(prev => [...prev, {
                  id: `video-${v.id}-${Date.now()}`,
                  message: `🎬 Nouvelle vidéo ajoutée : ${v.titre}`,
                  tab: 'videos',
                  timestamp: Date.now(),
                }]);
              }
            }
            for (const v of oldVideos) {
              if (!newVideoIds.has(v.id)) {
                setNotifications(prev => [...prev, {
                  id: `video-del-${v.id}-${Date.now()}`,
                  message: `🗑️ Vidéo supprimée : ${v.titre}`,
                  tab: 'videos',
                  timestamp: Date.now(),
                }]);
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Save subjects to DB when changed (skip initial load)
  const subjectsRef = useRef(subjects);
  useEffect(() => {
    if (!initialLoadDone.current) return;
    if (subjectsRef.current === subjects) return;
    subjectsRef.current = subjects;
    saveConfig('subjects', subjects);
  }, [subjects]);

  // Save videos to DB when changed
  const videosRef = useRef(videos);
  useEffect(() => {
    if (!initialLoadDone.current) return;
    if (videosRef.current === videos) return;
    videosRef.current = videos;
    saveConfig('videos', videos);
  }, [videos]);

  // Keep exercise history in localStorage (per-user)
  useEffect(() => {
    try {
      const stored = localStorage.getItem('app_exercise_history');
      if (stored) setExerciseHistory(JSON.parse(stored));
    } catch {}
  }, []);
  useEffect(() => {
    localStorage.setItem('app_exercise_history', JSON.stringify(exerciseHistory));
  }, [exerciseHistory]);

  const login = useCallback((password: string) => {
    if (password === 'ZahGasy1') {
      setIsAdmin(true);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => setIsAdmin(false), []);

  const toggleDarkMode = useCallback(() => {
    setDarkMode(prev => {
      const next = !prev;
      document.documentElement.classList.toggle('dark', next);
      return next;
    });
  }, []);

  const addExerciseHistory = useCallback((h: ExerciseHistory) => {
    setExerciseHistory(prev => [h, ...prev].slice(0, 5));
  }, []);

  return (
    <AppContext.Provider value={{
      isAdmin, login, logout,
      subjects, setSubjects,
      messages, setMessages,
      videos, setVideos,
      exerciseHistory, addExerciseHistory,
      darkMode, toggleDarkMode,
      activeTab, setActiveTab,
      notifications, dismissNotification,
    }}>
      {children}
    </AppContext.Provider>
  );
}
