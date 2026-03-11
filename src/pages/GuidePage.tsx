import { useState } from 'react';
import { 
  BookOpen, Brain, MessageCircle, Video, Settings, 
  ChevronDown, ChevronRight, Upload, Search, CheckCircle,
  Download, Users, Moon, Sun, Camera, Send, Smile,
  FileUp, Play, ArrowLeft, HelpCircle
} from 'lucide-react';

interface GuideSection {
  id: string;
  icon: React.ReactNode;
  title: string;
  content: React.ReactNode;
}

function Collapsible({ title, icon, children, defaultOpen = false }: { 
  title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="glass-card overflow-hidden mb-3">
      <button 
        onClick={() => setOpen(!open)} 
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-secondary/30 transition-colors"
      >
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-primary">
          {icon}
        </div>
        <span className="font-medium text-sm flex-1">{title}</span>
        {open ? <ChevronDown size={16} className="text-muted-foreground" /> : <ChevronRight size={16} className="text-muted-foreground" />}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 text-sm text-muted-foreground leading-relaxed space-y-3 animate-fade-in">
          {children}
        </div>
      )}
    </div>
  );
}

export function GuidePage({ onBack }: { onBack: () => void }) {
  return (
    <div className="max-w-2xl mx-auto animate-fade-in pb-8">
      <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4">
        <ArrowLeft size={18} /> Retour
      </button>

      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center text-primary-foreground font-heading font-bold text-2xl mx-auto mb-3 shadow-lg">
          U
        </div>
        <h1 className="font-heading font-bold text-2xl mb-2">Guide UniLearn</h1>
        <p className="text-sm text-muted-foreground">Tout ce que vous devez savoir pour bien utiliser l'application</p>
      </div>

      {/* Cours */}
      <Collapsible title="📚 Cours — Vos leçons complètes" icon={<BookOpen size={18} />} defaultOpen={true}>
        <div className="space-y-2">
          <p><strong className="text-foreground">Les cours sont organisés en 3 niveaux :</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong className="text-foreground">Sessions</strong> — Regroupent les matières par semestre ou thème (ex: "Informatique", "S2 2025")</li>
            <li><strong className="text-foreground">Matières</strong> — Les disciplines (ex: Algorithmique, Réseaux, Base de Données)</li>
            <li><strong className="text-foreground">Chapitres</strong> — Les leçons détaillées avec tout le contenu du cours</li>
          </ul>
          
          <p className="mt-3"><strong className="text-foreground">Navigation :</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Cliquez sur une <strong className="text-foreground">session</strong> pour voir ses matières</li>
            <li>Cliquez sur une <strong className="text-foreground">matière</strong> pour voir ses chapitres</li>
            <li>Cliquez sur un <strong className="text-foreground">chapitre</strong> pour lire le cours complet</li>
            <li>Utilisez le <strong className="text-foreground">fil d'Ariane</strong> en haut pour revenir en arrière</li>
          </ul>

          <p className="mt-3"><strong className="text-foreground">Fonctionnalités du chapitre :</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li>📌 <strong className="text-foreground">Définitions</strong> — Encadrées en bleu pour les repérer facilement</li>
            <li>💡 <strong className="text-foreground">À retenir</strong> — Les points essentiels à mémoriser</li>
            <li>⚠️ <strong className="text-foreground">Attention</strong> — Les pièges courants à éviter</li>
            <li>✅ <strong className="text-foreground">Marquer comme appris</strong> — Suivez votre progression</li>
            <li>La <strong className="text-foreground">barre de progression</strong> en haut indique votre avancée dans la lecture</li>
          </ul>

          <p className="mt-3"><strong className="text-foreground">Import de cours par l'IA :</strong></p>
          <p>L'administrateur peut importer des fichiers (PDF, images, Word) et l'IA analyse <strong className="text-foreground">page par page</strong> pour créer un cours structuré et complet. L'IA ajoute aussi des explications et exemples supplémentaires si nécessaire.</p>
        </div>
      </Collapsible>

      {/* Exercices IA */}
      <Collapsible title="🧠 Exercices IA — Testez vos connaissances" icon={<Brain size={18} />}>
        <div className="space-y-2">
          <p>Les exercices sont <strong className="text-foreground">générés automatiquement par l'IA</strong> à partir du contenu de vos cours.</p>
          
          <p><strong className="text-foreground">Comment ça marche :</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Sélectionnez une <strong className="text-foreground">matière</strong> et un <strong className="text-foreground">chapitre</strong></li>
            <li>Choisissez le <strong className="text-foreground">type d'exercice</strong> : QCM, Vrai/Faux, Texte à trous, etc.</li>
            <li>Choisissez le nombre de questions</li>
            <li>L'IA génère des questions basées sur le contenu exact du chapitre</li>
          </ul>

          <p className="mt-3"><strong className="text-foreground">Après l'exercice :</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Vous voyez votre <strong className="text-foreground">score</strong> et les corrections détaillées</li>
            <li>L'<strong className="text-foreground">historique</strong> de vos exercices est sauvegardé</li>
            <li>Vous pouvez refaire les exercices autant de fois que souhaité</li>
          </ul>
        </div>
      </Collapsible>

      {/* Communauté */}
      <Collapsible title="💬 Communauté — Échangez entre étudiants" icon={<MessageCircle size={18} />}>
        <div className="space-y-2">
          <p>Un espace de <strong className="text-foreground">discussion en temps réel</strong> pour échanger avec les autres étudiants.</p>
          
          <p><strong className="text-foreground">Fonctionnalités :</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li>💬 <strong className="text-foreground">Messages texte</strong> — Posez vos questions et partagez vos idées</li>
            <li>📷 <strong className="text-foreground">Images</strong> — Envoyez des captures d'écran ou photos</li>
            <li>🎤 <strong className="text-foreground">Messages vocaux</strong> — Enregistrez et envoyez des audios</li>
            <li>😊 <strong className="text-foreground">Réactions</strong> — Réagissez aux messages avec des émojis</li>
            <li>↩️ <strong className="text-foreground">Réponses</strong> — Répondez directement à un message</li>
            <li>✏️ <strong className="text-foreground">Modifier/Supprimer</strong> — Éditez ou supprimez vos propres messages</li>
            <li>👥 <strong className="text-foreground">Utilisateurs en ligne</strong> — Voyez qui est connecté en temps réel</li>
          </ul>

          <p className="mt-3"><strong className="text-foreground">Indicateur d'écriture :</strong></p>
          <p>Quand quelqu'un est en train d'écrire, vous verrez "... est en train d'écrire" en bas du chat.</p>
        </div>
      </Collapsible>

      {/* Vidéothèque */}
      <Collapsible title="🎬 Vidéothèque — Cours en vidéo" icon={<Video size={18} />}>
        <div className="space-y-2">
          <p>Accédez à des <strong className="text-foreground">vidéos éducatives</strong> organisées par matière et session.</p>
          
          <p><strong className="text-foreground">Types de vidéos :</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li>🎬 <strong className="text-foreground">Vidéos YouTube</strong> — Intégrées directement dans l'app</li>
            <li>📤 <strong className="text-foreground">Vidéos locales</strong> — Uploadées par l'administrateur</li>
            <li>🤖 <strong className="text-foreground">Suggestions IA</strong> — L'IA trouve automatiquement des vidéos YouTube pertinentes pour chaque chapitre</li>
          </ul>

          <p className="mt-3"><strong className="text-foreground">Lecteur vidéo :</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li>🖥️ <strong className="text-foreground">Mode cinéma</strong> — Agrandit le lecteur (touche F)</li>
            <li>📱 <strong className="text-foreground">Plein écran</strong> — Rotation automatique selon la vidéo</li>
            <li>⬅️➡️ <strong className="text-foreground">Navigation</strong> — Flèches pour passer à la vidéo suivante/précédente</li>
            <li>Filtrez par <strong className="text-foreground">session</strong> ou <strong className="text-foreground">matière</strong> avec les onglets</li>
          </ul>
        </div>
      </Collapsible>

      {/* Profil */}
      <Collapsible title="👤 Profil — Personnalisez votre compte" icon={<Camera size={18} />}>
        <div className="space-y-2">
          <p>Cliquez sur votre <strong className="text-foreground">photo de profil</strong> en haut à droite pour accéder aux paramètres.</p>
          
          <p><strong className="text-foreground">Vous pouvez :</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li>📸 <strong className="text-foreground">Changer votre photo</strong> — Depuis la galerie ou l'appareil photo</li>
            <li>✏️ <strong className="text-foreground">Modifier votre pseudo</strong> — Visible par les autres membres (2-20 caractères)</li>
            <li>📊 <strong className="text-foreground">Voir vos statistiques</strong> — Nombre de messages envoyés, date d'inscription</li>
            <li>🚪 <strong className="text-foreground">Se déconnecter</strong> — En bas du panneau de profil</li>
          </ul>

          <p className="mt-3"><strong className="text-foreground">Badges :</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li>🛡️ <strong className="text-foreground">Admin</strong> — Badge bleu pour les administrateurs</li>
            <li>💻 <strong className="text-foreground">Dev</strong> — Badge pour les développeurs</li>
          </ul>
        </div>
      </Collapsible>

      {/* Installation PWA */}
      <Collapsible title="📱 Installation — Utilisez comme une vraie app" icon={<Download size={18} />}>
        <div className="space-y-2">
          <p>UniLearn peut être <strong className="text-foreground">installée comme une application native</strong> sur votre téléphone ou ordinateur.</p>
          
          <p><strong className="text-foreground">Sur Android :</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Une bannière d'installation apparaît automatiquement</li>
            <li>Ou : Menu ⋮ → "Ajouter à l'écran d'accueil"</li>
          </ul>

          <p className="mt-3"><strong className="text-foreground">Sur iPhone :</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Ouvrez dans Safari</li>
            <li>Bouton partage ↗ → "Sur l'écran d'accueil"</li>
          </ul>

          <p className="mt-3"><strong className="text-foreground">Avantages :</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li>🚀 Lancement rapide depuis l'écran d'accueil</li>
            <li>📱 Interface plein écran sans barre du navigateur</li>
            <li>🔔 Mises à jour automatiques</li>
          </ul>
        </div>
      </Collapsible>

      {/* Mode sombre */}
      <Collapsible title="🌙 Thème — Mode sombre / clair" icon={<Moon size={18} />}>
        <div className="space-y-2">
          <p>Basculez entre le <strong className="text-foreground">mode sombre</strong> et le <strong className="text-foreground">mode clair</strong> :</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Sur <strong className="text-foreground">mobile</strong> : Menu hamburger → Bouton soleil/lune</li>
            <li>Sur <strong className="text-foreground">ordinateur</strong> : Dans la barre latérale gauche</li>
          </ul>
        </div>
      </Collapsible>

      {/* FAQ */}
      <Collapsible title="❓ Questions fréquentes" icon={<HelpCircle size={18} />}>
        <div className="space-y-4">
          <div>
            <p className="font-medium text-foreground">Comment accéder aux cours ?</p>
            <p>Allez dans l'onglet "Cours" → Choisissez une session → Une matière → Un chapitre</p>
          </div>
          <div>
            <p className="font-medium text-foreground">Je ne vois pas de chapitres dans une matière ?</p>
            <p>Les chapitres doivent être publiés par l'administrateur. Si aucun chapitre n'est publié, la matière apparaîtra vide.</p>
          </div>
          <div>
            <p className="font-medium text-foreground">Comment fonctionne la notation des exercices ?</p>
            <p>Chaque bonne réponse vaut 1 point. Le score final est affiché en pourcentage. Vous pouvez refaire les exercices pour améliorer votre score.</p>
          </div>
          <div>
            <p className="font-medium text-foreground">Mes messages sont-ils visibles par tous ?</p>
            <p>Oui, la communauté est un espace partagé. Tous les utilisateurs connectés peuvent lire les messages.</p>
          </div>
          <div>
            <p className="font-medium text-foreground">Comment signaler un problème ?</p>
            <p>Contactez l'administrateur via la communauté ou directement.</p>
          </div>
        </div>
      </Collapsible>

      <div className="text-center text-xs text-muted-foreground mt-8">
        <p>UniLearn — Application d'apprentissage universitaire</p>
        <p className="mt-1">Version 2.0 • Conçue avec ❤️ pour les étudiants</p>
      </div>
    </div>
  );
}
