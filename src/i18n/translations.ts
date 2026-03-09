export type Language = 'fr' | 'mg' | 'en';

export const translations = {
  fr: {
    // Navigation
    'nav.cours': 'Cours',
    'nav.exercices': 'Exercices IA',
    'nav.communaute': 'Communauté',
    'nav.videos': 'Vidéothèque',
    'nav.pratique': 'Pratique',
    
    // Actions communes
    'action.ajouter': 'Ajouter',
    'action.modifier': 'Modifier',
    'action.supprimer': 'Supprimer',
    'action.annuler': 'Annuler',
    'action.confirmer': 'Confirmer',
    'action.fermer': 'Fermer',
    'action.rechercher': 'Rechercher',
    'action.envoyer': 'Envoyer',
    'action.telecharger': 'Télécharger',
    'action.copier': 'Copier',
    'action.repondre': 'Répondre',
    'action.publier': 'Publier',
    'action.enregistrer': 'Enregistrer',
    
    // États
    'status.chargement': 'Chargement...',
    'status.aucun': 'Aucun résultat',
    'status.erreur': 'Une erreur est survenue',
    'status.enligne': 'en ligne',
    'status.horsligne': 'hors ligne',
    
    // Page Cours
    'courses.nouvelleMatiere': 'Nouvelle Matière',
    'courses.rechercher': 'Rechercher dans les cours...',
    'courses.chapitres': 'chapitre(s)',
    'courses.brouillon': 'Brouillon',
    'courses.publier': 'Publier',
    'courses.appris': 'Appris',
    'courses.importer': 'Importer (PDF/Image)',
    'courses.nouveauChapitre': 'Nouveau Chapitre',
    'courses.retourMatieres': 'Retour aux matières',
    'courses.retourChapitres': 'Retour aux chapitres',
    'courses.pointsCles': 'Points clés à retenir',
    'courses.conseilRevision': 'Conseil de révision',
    'courses.schemas': 'Schémas',
    
    // Difficultés
    'difficulte.facile': 'Facile',
    'difficulte.moyen': 'Moyen',
    'difficulte.difficile': 'Difficile',
    
    // Types de sections
    'section.definition': 'Définition',
    'section.retenir': 'À retenir',
    'section.attention': 'Attention',
    'section.code': 'Code',
    'section.tableau': 'Tableau',
    'section.schema': 'Schéma',
    
    // Page Exercices
    'exercices.titre': 'Exercices IA',
    'exercices.description': "L'IA génère automatiquement les questions nécessaires pour couvrir tout le chapitre",
    'exercices.matiere': 'Matière',
    'exercices.chapitre': 'Chapitre',
    'exercices.generer': 'Générer les exercices',
    'exercices.recommencer': 'Recommencer',
    'exercices.nouvelExercice': 'Nouvel exercice',
    'exercices.question': 'Question',
    'exercices.valider': 'Valider',
    'exercices.soumettre': 'Soumettre',
    'exercices.resultats': 'Voir les résultats →',
    'exercices.suivante': 'Question suivante →',
    'exercices.bonnesReponses': 'de bonnes réponses',
    'exercices.historique': 'Historique récent',
    'exercices.questionsRevoir': 'Questions à revoir',
    'exercices.taReponse': 'Ta réponse',
    'exercices.bonneReponse': 'Bonne réponse',
    
    // Types d'exercices
    'exercice.qcm': 'QCM',
    'exercice.vraiFaux': 'Vrai / Faux',
    'exercice.texteTrou': 'Compléter',
    'exercice.questionOuverte': 'Question ouverte',
    
    // Feedbacks exercices
    'feedback.excellent': 'Excellent ! 🎉',
    'feedback.parfait': 'Parfait ! 💪',
    'feedback.bravo': 'Bravo ! ⭐',
    'feedback.pasToutAFait': 'Pas tout à fait... 🤔',
    
    // Page Communauté
    'communaute.titre': 'Communauté',
    'communaute.enLigne': 'en ligne',
    'communaute.aucunMessage': 'Aucun message pour le moment',
    'communaute.premierMessage': 'Soyez le premier à écrire ! 💬',
    'communaute.placeholder': 'Écrivez un message...',
    'communaute.repondreA': 'Répondre à',
    'communaute.mentionner': 'Mentionner un utilisateur',
    'communaute.messageVocal': 'Message vocal',
    'communaute.photo': 'Photo',
    'communaute.fichier': 'Fichier',
    'communaute.modifie': 'modifié',
    'communaute.vuPar': 'Vu par',
    
    // Réactions
    'reaction.ajouter': 'Ajouter une réaction',
    
    // Page Vidéothèque
    'videos.titre': 'Vidéothèque',
    'videos.disponibles': 'vidéo(s) disponible(s)',
    'videos.ajouter': 'Ajouter une vidéo',
    'videos.toutes': 'Toutes',
    'videos.lien': 'Lien YouTube',
    'videos.titreVideo': 'Titre',
    'videos.description': 'Description',
    'videos.matiere': 'Matière associée',
    'videos.aucune': 'Aucune vidéo disponible',
    'videos.apparaitront': 'Les vidéos ajoutées apparaîtront ici',
    'videos.suivante': 'Vidéo suivante',
    
    // Page Pratique
    'pratique.titre': 'Pratique de codage',
    'pratique.exercicesDisponibles': 'Exercices disponibles',
    'pratique.aucunExercice': 'Aucun exercice pour le moment',
    'pratique.generesAuto': 'Les exercices apparaîtront automatiquement quand des chapitres seront créés.',
    'pratique.selectionne': 'Sélectionnez un exercice pour commencer',
    'pratique.executer': 'Exécuter',
    'pratique.terminal': 'Terminal',
    'pratique.apercu': 'Aperçu',
    
    // Admin
    'admin.titre': 'Espace Admin',
    'admin.actif': 'Mode Admin actif',
    'admin.password': 'Mot de passe',
    'admin.incorrect': 'Mot de passe incorrect',
    'admin.entrer': 'Entrer',
    'admin.deconnexion': 'Se déconnecter du mode Admin',
    'admin.badges': 'Badges Administrateur',
    'admin.developpeur': 'Développeur',
    'admin.effacer': 'Effacer toutes les conversations',
    'admin.confirmation': 'Supprimer tous les messages ?',
    'admin.confirmationDesc': 'Cette action est irréversible. Tous les messages de la communauté seront définitivement supprimés.',
    
    // PWA
    'pwa.installer': 'Installer UniLearn',
    'pwa.description': 'Accès rapide comme une vraie app',
    'pwa.mettreAJour': 'Nouvelle version disponible — Mettre à jour',
    'pwa.details': 'Des améliorations et correctifs vous attendent',
    
    // Profil
    'profil.monProfil': 'Mon profil',
    'profil.pseudo': 'Pseudo',
    'profil.email': 'Email',
    'profil.deconnexion': 'Se déconnecter',
    'profil.photoChanger': 'Changer la photo',
    'profil.photoSupprimer': 'Supprimer la photo',
    
    // Erreurs
    'erreur.fichierTropVolumineux': 'Fichier trop volumineux',
    'erreur.maxSize': 'Max 100 Mo.',
    'erreur.impossibleCharger': 'Impossible de charger les messages',
    'erreur.impossibleEnvoyer': 'Impossible d\'envoyer le message',
    'erreur.impossibleUpload': 'Impossible d\'uploader le fichier',
    'erreur.impossibleTelecharger': 'Impossible de télécharger.',
    
    // Succès
    'succes.copie': 'Copié !',
    'succes.messageCopie': 'Message copié dans le presse-papier.',
    'succes.messageSupprime': 'Message supprimé',
    'succes.messageModifie': 'Message modifié',
    'succes.vocalEnvoye': 'Message vocal envoyé',
    'succes.coursImporte': 'Cours importé !',
    'succes.conversationsSupprimees': 'Conversations supprimées',
    
    // Temps
    'temps.ilYA': 'il y a',
    'temps.an': 'an',
    'temps.ans': 'ans',
    'temps.mois': 'mois',
    'temps.semaine': 'semaine',
    'temps.semaines': 'semaines',
    'temps.jour': 'jour',
    'temps.jours': 'jours',
    'temps.heure': 'heure',
    'temps.heures': 'heures',
    'temps.minute': 'minute',
    'temps.minutes': 'minutes',
    'temps.instant': 'à l\'instant',
  },
  
  mg: {
    // Navigation
    'nav.cours': 'Fianarana',
    'nav.exercices': 'Fanazaran-tena IA',
    'nav.communaute': 'Fiaraha-monina',
    'nav.videos': 'Horonan-tsary',
    'nav.pratique': 'Fanazaran-tena',
    
    // Actions communes
    'action.ajouter': 'Hanampy',
    'action.modifier': 'Hanova',
    'action.supprimer': 'Hamafa',
    'action.annuler': 'Hiala',
    'action.confirmer': 'Hanamarina',
    'action.fermer': 'Hiditra',
    'action.rechercher': 'Hitady',
    'action.envoyer': 'Handefa',
    'action.telecharger': 'Haka',
    'action.copier': 'Handika',
    'action.repondre': 'Hamaly',
    'action.publier': 'Hamoaka',
    'action.enregistrer': 'Hitahiry',
    
    // États
    'status.chargement': 'Am-poakaty...',
    'status.aucun': 'Tsy misy valiny',
    'status.erreur': 'Nisy olana nitranga',
    'status.enligne': 'mifandray',
    'status.horsligne': 'tsy mifandray',
    
    // Page Cours
    'courses.nouvelleMatiere': 'Fampianarana vaovao',
    'courses.rechercher': 'Hitady amin\'ny fianarana...',
    'courses.chapitres': 'toko',
    'courses.brouillon': 'Drafitra',
    'courses.publier': 'Hamoaka',
    'courses.appris': 'Vita',
    'courses.importer': 'Hampiditra (PDF/Sary)',
    'courses.nouveauChapitre': 'Toko vaovao',
    'courses.retourMatieres': 'Hiverina any amin\'ny fampianarana',
    'courses.retourChapitres': 'Hiverina any amin\'ny toko',
    'courses.pointsCles': 'Zava-dehibe hotadidina',
    'courses.conseilRevision': 'Torohan-kevitra',
    'courses.schemas': 'Sary',
    
    // Difficultés
    'difficulte.facile': 'Mora',
    'difficulte.moyen': 'Antonontonony',
    'difficulte.difficile': 'Sarotra',
    
    // Types de sections
    'section.definition': 'Famaritana',
    'section.retenir': 'Hotadidina',
    'section.attention': 'Tandremo',
    'section.code': 'Kaody',
    'section.tableau': 'Tabilao',
    'section.schema': 'Sary',
    
    // Page Exercices
    'exercices.titre': 'Fanazaran-tena IA',
    'exercices.description': "Ny IA no mamorona fanontaniana ilaina handrakofana ny toko iray manontolo",
    'exercices.matiere': 'Fampianarana',
    'exercices.chapitre': 'Toko',
    'exercices.generer': 'Hamorona fanazaran-tena',
    'exercices.recommencer': 'Hanomboka indray',
    'exercices.nouvelExercice': 'Fanazaran-tena vaovao',
    'exercices.question': 'Fanontaniana',
    'exercices.valider': 'Hamarinina',
    'exercices.soumettre': 'Handefa',
    'exercices.resultats': 'Hijery ny vokatra →',
    'exercices.suivante': 'Fanontaniana manaraka →',
    'exercices.bonnesReponses': 'ny valiny marina',
    'exercices.historique': 'Tantara vao haingana',
    'exercices.questionsRevoir': 'Fanontaniana hodinihina indray',
    'exercices.taReponse': 'Ny valinteninao',
    'exercices.bonneReponse': 'Valiny marina',
    
    // Types d'exercices
    'exercice.qcm': 'QCM',
    'exercice.vraiFaux': 'Marina / Diso',
    'exercice.texteTrou': 'Hameno',
    'exercice.questionOuverte': 'Fanontaniana malalaka',
    
    // Feedbacks exercices
    'feedback.excellent': 'Tena tsara ! 🎉',
    'feedback.parfait': 'Tsara tarehy ! 💪',
    'feedback.bravo': 'Arahabaina ! ⭐',
    'feedback.pasToutAFait': 'Saika... 🤔',
    
    // Page Communauté
    'communaute.titre': 'Fiaraha-monina',
    'communaute.enLigne': 'mifandray',
    'communaute.aucunMessage': 'Mbola tsy misy hafatra',
    'communaute.premierMessage': 'Ianao no voalohany hanoratra ! 💬',
    'communaute.placeholder': 'Soraty eto ny hafatrao...',
    'communaute.repondreA': 'Hamaly an\'i',
    'communaute.mentionner': 'Hanonona mpampiasa',
    'communaute.messageVocal': 'Hafatra am-peo',
    'communaute.photo': 'Sary',
    'communaute.fichier': 'Rakitra',
    'communaute.modifie': 'novaina',
    'communaute.vuPar': 'Hitan\'i',
    
    // Réactions
    'reaction.ajouter': 'Hanampy fihetseham-po',
    
    // Page Vidéothèque
    'videos.titre': 'Horonan-tsary',
    'videos.disponibles': 'horonan-tsary hita',
    'videos.ajouter': 'Hanampy horonan-tsary',
    'videos.toutes': 'Rehetra',
    'videos.lien': 'Rohy YouTube',
    'videos.titreVideo': 'Lohateny',
    'videos.description': 'Famaritana',
    'videos.matiere': 'Fampianarana mifandraika',
    'videos.aucune': 'Tsy misy horonan-tsary',
    'videos.apparaitront': 'His eo ireo horonan-tsary raha vao ampiana',
    'videos.suivante': 'Horonan-tsary manaraka',
    
    // Page Pratique
    'pratique.titre': 'Fanazaran-tena amin\'ny kaody',
    'pratique.exercicesDisponibles': 'Fanazaran-tena azo atao',
    'pratique.aucunExercice': 'Mbola tsy misy fanazaran-tena',
    'pratique.generesAuto': 'Ho hita ho azy ireo fanazaran-tena rehefa misy toko vaovao.',
    'pratique.selectionne': 'Fidio fanazaran-tena iray hanombohana',
    'pratique.executer': 'Hampandeha',
    'pratique.terminal': 'Terminal',
    'pratique.apercu': 'Fijery',
    
    // Admin
    'admin.titre': 'Sehatra Admin',
    'admin.actif': 'Miasa ny mode Admin',
    'admin.password': 'Tenimiafina',
    'admin.incorrect': 'Diso ny tenimiafina',
    'admin.entrer': 'Hiditra',
    'admin.deconnexion': 'Hiala amin\'ny mode Admin',
    'admin.badges': 'Mari-pankasitrahana Admin',
    'admin.developpeur': 'Mpamorona',
    'admin.effacer': 'Hamafa ny resaka rehetra',
    'admin.confirmation': 'Hamafa ny hafatra rehetra ?',
    'admin.confirmationDesc': 'Tsy azo averina intsony izany. Ho foana tanteraka ny hafatra rehetra.',
    
    // PWA
    'pwa.installer': 'Hampiditra UniLearn',
    'pwa.description': 'Fidirana haingana toy ny app tena izy',
    'pwa.mettreAJour': 'Dika vaovao hita — Hanavao',
    'pwa.details': 'Fitsaboana sy fanatsarana maro no miandry anao',
    
    // Profil
    'profil.monProfil': 'Ny mombamomba ahy',
    'profil.pseudo': 'Anarana',
    'profil.email': 'Mailaka',
    'profil.deconnexion': 'Hiala',
    'profil.photoChanger': 'Hanova sary',
    'profil.photoSupprimer': 'Hamafa sary',
    
    // Erreurs
    'erreur.fichierTropVolumineux': 'Lehibe loatra ny rakitra',
    'erreur.maxSize': '100 Mo ny fetra.',
    'erreur.impossibleCharger': 'Tsy afaka nampiditra ny hafatra',
    'erreur.impossibleEnvoyer': 'Tsy afaka nandefa ny hafatra',
    'erreur.impossibleUpload': 'Tsy afaka nampiditra ny rakitra',
    'erreur.impossibleTelecharger': 'Tsy afaka naka ny rakitra.',
    
    // Succès
    'succes.copie': 'Voasoratra !',
    'succes.messageCopie': 'Voasoratra ny hafatra',
    'succes.messageSupprime': 'Voafafa ny hafatra',
    'succes.messageModifie': 'Voavaina ny hafatra',
    'succes.vocalEnvoye': 'Voafafa ny hafatra am-peo',
    'succes.coursImporte': 'Tafiditra ny fianarana !',
    'succes.conversationsSupprimees': 'Voafafa ny resaka',
    
    // Temps
    'temps.ilYA': 'efa',
    'temps.an': 'taona',
    'temps.ans': 'taona',
    'temps.mois': 'volana',
    'temps.semaine': 'herinandro',
    'temps.semaines': 'herinandro',
    'temps.jour': 'andro',
    'temps.jours': 'andro',
    'temps.heure': 'ora',
    'temps.heures': 'ora',
    'temps.minute': 'minitra',
    'temps.minutes': 'minitra',
    'temps.instant': 'izao izao',
  },
  
  en: {
    // Navigation
    'nav.cours': 'Courses',
    'nav.exercices': 'AI Exercises',
    'nav.communaute': 'Community',
    'nav.videos': 'Video Library',
    'nav.pratique': 'Practice',
    
    // Actions communes
    'action.ajouter': 'Add',
    'action.modifier': 'Edit',
    'action.supprimer': 'Delete',
    'action.annuler': 'Cancel',
    'action.confirmer': 'Confirm',
    'action.fermer': 'Close',
    'action.rechercher': 'Search',
    'action.envoyer': 'Send',
    'action.telecharger': 'Download',
    'action.copier': 'Copy',
    'action.repondre': 'Reply',
    'action.publier': 'Publish',
    'action.enregistrer': 'Save',
    
    // États
    'status.chargement': 'Loading...',
    'status.aucun': 'No results',
    'status.erreur': 'An error occurred',
    'status.enligne': 'online',
    'status.horsligne': 'offline',
    
    // Page Cours
    'courses.nouvelleMatiere': 'New Subject',
    'courses.rechercher': 'Search courses...',
    'courses.chapitres': 'chapter(s)',
    'courses.brouillon': 'Draft',
    'courses.publier': 'Publish',
    'courses.appris': 'Learned',
    'courses.importer': 'Import (PDF/Image)',
    'courses.nouveauChapitre': 'New Chapter',
    'courses.retourMatieres': 'Back to subjects',
    'courses.retourChapitres': 'Back to chapters',
    'courses.pointsCles': 'Key points to remember',
    'courses.conseilRevision': 'Study tip',
    'courses.schemas': 'Diagrams',
    
    // Difficultés
    'difficulte.facile': 'Easy',
    'difficulte.moyen': 'Medium',
    'difficulte.difficile': 'Hard',
    
    // Types de sections
    'section.definition': 'Definition',
    'section.retenir': 'Remember',
    'section.attention': 'Warning',
    'section.code': 'Code',
    'section.tableau': 'Table',
    'section.schema': 'Diagram',
    
    // Page Exercices
    'exercices.titre': 'AI Exercises',
    'exercices.description': "AI automatically generates questions to cover the entire chapter",
    'exercices.matiere': 'Subject',
    'exercices.chapitre': 'Chapter',
    'exercices.generer': 'Generate exercises',
    'exercices.recommencer': 'Restart',
    'exercices.nouvelExercice': 'New exercise',
    'exercices.question': 'Question',
    'exercices.valider': 'Validate',
    'exercices.soumettre': 'Submit',
    'exercices.resultats': 'See results →',
    'exercices.suivante': 'Next question →',
    'exercices.bonnesReponses': 'correct answers',
    'exercices.historique': 'Recent history',
    'exercices.questionsRevoir': 'Questions to review',
    'exercices.taReponse': 'Your answer',
    'exercices.bonneReponse': 'Correct answer',
    
    // Types d'exercices
    'exercice.qcm': 'MCQ',
    'exercice.vraiFaux': 'True / False',
    'exercice.texteTrou': 'Fill in the blank',
    'exercice.questionOuverte': 'Open question',
    
    // Feedbacks exercices
    'feedback.excellent': 'Excellent! 🎉',
    'feedback.parfait': 'Perfect! 💪',
    'feedback.bravo': 'Well done! ⭐',
    'feedback.pasToutAFait': 'Not quite... 🤔',
    
    // Page Communauté
    'communaute.titre': 'Community',
    'communaute.enLigne': 'online',
    'communaute.aucunMessage': 'No messages yet',
    'communaute.premierMessage': 'Be the first to write! 💬',
    'communaute.placeholder': 'Write a message...',
    'communaute.repondreA': 'Reply to',
    'communaute.mentionner': 'Mention a user',
    'communaute.messageVocal': 'Voice message',
    'communaute.photo': 'Photo',
    'communaute.fichier': 'File',
    'communaute.modifie': 'edited',
    'communaute.vuPar': 'Seen by',
    
    // Réactions
    'reaction.ajouter': 'Add reaction',
    
    // Page Vidéothèque
    'videos.titre': 'Video Library',
    'videos.disponibles': 'video(s) available',
    'videos.ajouter': 'Add video',
    'videos.toutes': 'All',
    'videos.lien': 'YouTube link',
    'videos.titreVideo': 'Title',
    'videos.description': 'Description',
    'videos.matiere': 'Related subject',
    'videos.aucune': 'No videos available',
    'videos.apparaitront': 'Added videos will appear here',
    'videos.suivante': 'Next video',
    
    // Page Pratique
    'pratique.titre': 'Coding Practice',
    'pratique.exercicesDisponibles': 'Available exercises',
    'pratique.aucunExercice': 'No exercises yet',
    'pratique.generesAuto': 'Exercises will appear automatically when chapters are created.',
    'pratique.selectionne': 'Select an exercise to start',
    'pratique.executer': 'Run',
    'pratique.terminal': 'Terminal',
    'pratique.apercu': 'Preview',
    
    // Admin
    'admin.titre': 'Admin Area',
    'admin.actif': 'Admin Mode active',
    'admin.password': 'Password',
    'admin.incorrect': 'Incorrect password',
    'admin.entrer': 'Enter',
    'admin.deconnexion': 'Log out of Admin Mode',
    'admin.badges': 'Admin Badges',
    'admin.developpeur': 'Developer',
    'admin.effacer': 'Clear all conversations',
    'admin.confirmation': 'Delete all messages?',
    'admin.confirmationDesc': 'This action is irreversible. All community messages will be permanently deleted.',
    
    // PWA
    'pwa.installer': 'Install UniLearn',
    'pwa.description': 'Quick access like a real app',
    'pwa.mettreAJour': 'New version available — Update',
    'pwa.details': 'Improvements and fixes await you',
    
    // Profil
    'profil.monProfil': 'My profile',
    'profil.pseudo': 'Username',
    'profil.email': 'Email',
    'profil.deconnexion': 'Log out',
    'profil.photoChanger': 'Change photo',
    'profil.photoSupprimer': 'Delete photo',
    
    // Erreurs
    'erreur.fichierTropVolumineux': 'File too large',
    'erreur.maxSize': 'Max 100 MB.',
    'erreur.impossibleCharger': 'Unable to load messages',
    'erreur.impossibleEnvoyer': 'Unable to send message',
    'erreur.impossibleUpload': 'Unable to upload file',
    'erreur.impossibleTelecharger': 'Unable to download.',
    
    // Succès
    'succes.copie': 'Copied!',
    'succes.messageCopie': 'Message copied to clipboard',
    'succes.messageSupprime': 'Message deleted',
    'succes.messageModifie': 'Message edited',
    'succes.vocalEnvoye': 'Voice message sent',
    'succes.coursImporte': 'Course imported!',
    'succes.conversationsSupprimees': 'Conversations deleted',
    
    // Temps
    'temps.ilYA': '',
    'temps.an': 'year',
    'temps.ans': 'years',
    'temps.mois': 'month',
    'temps.months': 'months',
    'temps.semaine': 'week',
    'temps.semaines': 'weeks',
    'temps.jour': 'day',
    'temps.jours': 'days',
    'temps.heure': 'hour',
    'temps.heures': 'hours',
    'temps.minute': 'minute',
    'temps.minutes': 'minutes',
    'temps.instant': 'just now',
  },
};

export type TranslationKey = keyof typeof translations.fr;
