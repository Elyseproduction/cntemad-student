import { useState, useMemo } from 'react';
import { useApp, ExerciseHistory } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { Brain, RotateCcw, BookOpen, Sparkles, ChevronRight, Trophy, Star, BookMarked, Flame } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type ExerciseType = 'qcm' | 'vrai_faux' | 'texte_trou' | 'question_ouverte';

interface Exercise {
  id: number;
  enonce: string;
  type: ExerciseType;
  options?: string[];
  reponseCorrecte: string;
  explicationCorrecte: string;
  explicationFausse: string;
}

const typeLabels: Record<ExerciseType, { label: string; color: string }> = {
  qcm: { label: '🔵 QCM', color: 'text-primary' },
  vrai_faux: { label: '🟣 Vrai / Faux', color: 'text-accent' },
  texte_trou: { label: '🟡 Compléter', color: 'text-warning' },
  question_ouverte: { label: '🔴 Question ouverte', color: 'text-destructive' },
};

export function ExercisesPage() {
  const { subjects, exerciseHistory, addExerciseHistory } = useApp();
  const { toast } = useToast();
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answer, setAnswer] = useState('');
  const [answered, setAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const [wrongAnswers, setWrongAnswers] = useState<{ exercise: Exercise; userAnswer: string }[]>([]);
  const [phase, setPhase] = useState<'setup' | 'quiz' | 'results'>('setup');

  const publishedSubjects = useMemo(() =>
    subjects.filter(s => s.chapitres.some(c => c.published)),
    [subjects]
  );

  const chapters = useMemo(() => {
    const subject = subjects.find(s => s.id === selectedSubject);
    return subject?.chapitres.filter(c => c.published) || [];
  }, [subjects, selectedSubject]);

  const [loadingStep, setLoadingStep] = useState('');

  const handleGenerate = async () => {
    const chapter = chapters.find(c => c.id === selectedChapter);
    const subject = subjects.find(s => s.id === selectedSubject);
    if (!chapter || !subject) return;

    setLoading(true);
    setLoadingStep('Analyse du chapitre en cours...');

    const chapterContent = chapter.sections
      .map(s => `[${s.type}] ${s.titre}: ${s.contenu}`)
      .join('\n\n');

    try {
      setLoadingStep('🤖 L\'IA génère vos exercices...');
      
      const { data, error } = await supabase.functions.invoke('generate-exercises', {
        body: {
          chapterTitle: chapter.titre,
          subjectName: subject.nom,
          chapterContent,
          pointsCles: chapter.points_cles,
        },
      });

      if (error) throw error;

      if (data?.error) {
        toast({ title: 'Erreur IA', description: data.error, variant: 'destructive' });
        setLoading(false);
        setLoadingStep('');
        return;
      }

      setLoadingStep('Préparation du quiz...');

      const generated: Exercise[] = (data?.exercices || []).map((ex: any, i: number) => ({
        ...ex,
        id: i + 1,
        type: ex.type as ExerciseType,
      }));

      if (generated.length === 0) {
        toast({ title: 'Erreur', description: "L'IA n'a pas pu générer d'exercices. Réessayez.", variant: 'destructive' });
        setLoading(false);
        setLoadingStep('');
        return;
      }

      setExercises(generated);
      setCurrentIdx(0);
      setScore(0);
      setAnswer('');
      setAnswered(false);
      setWrongAnswers([]);
      setPhase('quiz');
    } catch (e: any) {
      console.error('Exercise generation error:', e);
      toast({ title: 'Erreur', description: e.message || "Impossible de générer les exercices", variant: 'destructive' });
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  const handleAnswer = (ans: string) => {
    if (answered) return;
    setAnswer(ans);
    setAnswered(true);
    const exercise = exercises[currentIdx];
    const correct = exercise.type === 'question_ouverte' || ans.toLowerCase().trim() === exercise.reponseCorrecte.toLowerCase().trim();
    setIsCorrect(correct);
    if (correct) setScore(s => s + 1);
    else setWrongAnswers(prev => [...prev, { exercise, userAnswer: ans }]);
  };

  const handleNext = () => {
    if (currentIdx < exercises.length - 1) {
      setCurrentIdx(i => i + 1);
      setAnswer('');
      setAnswered(false);
    } else {
      const ch = chapters.find(c => c.id === selectedChapter);
      addExerciseHistory({
        date: new Date().toLocaleDateString('fr-FR'),
        chapitre: ch?.titre || '',
        score,
        total: exercises.length,
        type: 'Mixte IA',
      });
      setPhase('results');
    }
  };

  const resetQuiz = () => {
    setPhase('setup');
    setExercises([]);
    setCurrentIdx(0);
    setScore(0);
    setAnswer('');
    setAnswered(false);
    setWrongAnswers([]);
  };

  const getEvaluation = () => {
    const pct = (score / exercises.length) * 100;
    if (pct >= 90) return { icon: <Trophy className="text-warning" size={32} />, text: '🏆 Excellent ! Tu maîtrises ce chapitre !', color: 'text-warning' };
    if (pct >= 70) return { icon: <Star className="text-primary" size={32} />, text: '⭐ Bien joué ! Encore un peu de révision', color: 'text-primary' };
    if (pct >= 50) return { icon: <BookMarked className="text-accent" size={32} />, text: '📚 Continue ! Relis les points clés', color: 'text-accent' };
    return { icon: <Flame className="text-destructive" size={32} />, text: '💪 Ne lâche pas ! Relis ce chapitre en entier', color: 'text-destructive' };
  };

  // Results Screen
  if (phase === 'results') {
    const evaluation = getEvaluation();
    const pct = Math.round((score / exercises.length) * 100);
    return (
      <div className="max-w-2xl mx-auto animate-fade-in">
        <div className="glass-card p-8 text-center mb-6">
          <div className="mb-4">{evaluation.icon}</div>
          <div className="text-6xl font-heading font-bold gradient-text mb-2">{score} / {exercises.length}</div>
          <p className="text-lg text-muted-foreground mb-2">{pct}% de bonnes réponses</p>
          <p className={`font-semibold text-lg ${evaluation.color}`}>{evaluation.text}</p>

          {pct === 100 && (
            <div className="mt-4 p-4 rounded-xl bg-success/10 border border-success/20 animate-fade-in">
              <p className="text-success font-semibold text-lg">✅ Tu as tout compris sur ce chapitre !</p>
              <p className="text-sm text-muted-foreground mt-1">L'IA a vérifié chaque concept clé et tu les maîtrises tous.</p>
            </div>
          )}

          {/* Circle chart */}
          <div className="flex justify-center my-6">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="hsl(var(--primary))" strokeWidth="3" strokeDasharray={`${pct}, 100`} className="transition-all duration-1000" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center font-bold text-xl">{pct}%</div>
            </div>
          </div>
        </div>

        {wrongAnswers.length > 0 && (
          <div className="glass-card p-6 mb-6">
            <h3 className="font-heading font-semibold text-lg mb-4">Questions à revoir</h3>
            <div className="space-y-3">
              {wrongAnswers.map((wa, i) => (
                <div key={i} className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-sm font-medium mb-1">{wa.exercise.enonce}</p>
                  <p className="text-xs text-destructive">Ta réponse : {wa.userAnswer}</p>
                  <p className="text-xs text-success">Bonne réponse : {wa.exercise.reponseCorrecte}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3 justify-center">
          <button onClick={handleGenerate} className="px-6 py-3 rounded-xl gradient-bg text-primary-foreground font-medium hover:opacity-90 transition-opacity flex items-center gap-2">
            <RotateCcw size={18} /> Recommencer
          </button>
          <button onClick={resetQuiz} className="px-6 py-3 rounded-xl bg-secondary text-foreground font-medium hover:bg-muted transition-colors flex items-center gap-2">
            <Sparkles size={18} /> Nouvel exercice
          </button>
        </div>
      </div>
    );
  }

  // Quiz Screen
  if (phase === 'quiz' && exercises.length > 0) {
    const exercise = exercises[currentIdx];
    const progress = ((currentIdx + (answered ? 1 : 0)) / exercises.length) * 100;

    return (
      <div className="max-w-2xl mx-auto animate-fade-in">
        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <span>Question {currentIdx + 1} / {exercises.length}</span>
            <span className="px-2 py-0.5 rounded-full bg-muted text-xs">
              {typeLabels[exercise.type]?.label || exercise.type}
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full gradient-bg transition-all duration-500 rounded-full" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Question Card */}
        <div className={`glass-card p-6 md:p-8 mb-6 transition-all ${answered ? (isCorrect ? 'border-success/50 animate-pulse-glow' : 'border-destructive/50 animate-shake') : ''}`}>
          <p className="text-lg md:text-xl font-medium leading-relaxed mb-6">{exercise.enonce}</p>

          {/* QCM */}
          {exercise.type === 'qcm' && exercise.options && (
            <div className="space-y-3">
              {exercise.options.map((opt, i) => {
                let cls = 'w-full p-4 rounded-xl text-left transition-all border ';
                if (answered) {
                  if (opt === exercise.reponseCorrecte) cls += 'bg-success/20 border-success text-success';
                  else if (opt === answer) cls += 'bg-destructive/20 border-destructive text-destructive';
                  else cls += 'bg-muted/30 border-border opacity-50';
                } else {
                  cls += 'bg-secondary/50 border-border hover:border-primary hover:bg-primary/10 cursor-pointer';
                }
                return (
                  <button key={i} onClick={() => handleAnswer(opt)} className={cls} disabled={answered}>
                    <span className="font-medium mr-2">{String.fromCharCode(65 + i)}.</span> {opt}
                  </button>
                );
              })}
            </div>
          )}

          {/* Vrai/Faux */}
          {exercise.type === 'vrai_faux' && (
            <div className="flex gap-4">
              {['Vrai', 'Faux'].map(opt => {
                let cls = 'flex-1 p-4 rounded-xl font-medium transition-all border text-center ';
                if (answered) {
                  if (opt === exercise.reponseCorrecte) cls += 'bg-success/20 border-success text-success';
                  else if (opt === answer) cls += 'bg-destructive/20 border-destructive text-destructive';
                  else cls += 'bg-muted/30 border-border opacity-50';
                } else {
                  cls += 'bg-secondary/50 border-border hover:border-primary hover:bg-primary/10 cursor-pointer';
                }
                return <button key={opt} onClick={() => handleAnswer(opt)} className={cls} disabled={answered}>{opt}</button>;
              })}
            </div>
          )}

          {/* Texte à trou */}
          {exercise.type === 'texte_trou' && (
            <div className="flex gap-3">
              <input
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                placeholder="Votre réponse..."
                className="flex-1 px-4 py-3 rounded-xl bg-secondary border border-border focus:border-primary outline-none text-foreground"
                disabled={answered}
                onKeyDown={e => e.key === 'Enter' && !answered && answer && handleAnswer(answer)}
              />
              {!answered && (
                <button onClick={() => handleAnswer(answer)} disabled={!answer} className="px-6 py-3 rounded-xl gradient-bg text-primary-foreground font-medium disabled:opacity-50">
                  Valider
                </button>
              )}
            </div>
          )}

          {/* Question ouverte */}
          {exercise.type === 'question_ouverte' && (
            <div>
              <textarea
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                placeholder="Votre réponse..."
                rows={4}
                className="w-full px-4 py-3 rounded-xl bg-secondary border border-border focus:border-primary outline-none text-foreground resize-none"
                disabled={answered}
              />
              {!answered && (
                <button onClick={() => handleAnswer(answer)} disabled={!answer} className="mt-3 px-6 py-3 rounded-xl gradient-bg text-primary-foreground font-medium disabled:opacity-50">
                  Soumettre
                </button>
              )}
            </div>
          )}

          {/* Feedback */}
          {answered && (
            <div className={`mt-6 p-4 rounded-xl ${isCorrect ? 'bg-success/10 border border-success/20' : 'bg-destructive/10 border border-destructive/20'} animate-fade-in`}>
              <p className="font-semibold mb-1">
                {isCorrect
                  ? ['Excellent ! 🎉', 'Parfait ! 💪', 'Bravo ! ⭐'][Math.floor(Math.random() * 3)]
                  : 'Pas tout à fait... 🤔'}
              </p>
              <p className="text-sm text-muted-foreground">
                {isCorrect ? exercise.explicationCorrecte : exercise.explicationFausse}
              </p>
            </div>
          )}
        </div>

        {answered && (
          <div className="flex justify-end">
            <button onClick={handleNext} className="px-6 py-3 rounded-xl gradient-bg text-primary-foreground font-medium hover:opacity-90 transition-opacity flex items-center gap-2">
              {currentIdx < exercises.length - 1 ? 'Question suivante →' : 'Voir les résultats →'}
            </button>
          </div>
        )}
      </div>
    );
  }

  // Setup Screen
  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="text-center mb-8">
        <h1 className="font-heading font-bold text-2xl md:text-3xl mb-2">🧠 Exercices IA</h1>
        <p className="text-muted-foreground">L'IA génère automatiquement les questions nécessaires pour couvrir tout le chapitre</p>
      </div>

      <div className="glass-card p-6 space-y-6">
        {/* Subject */}
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-2 block">Matière</label>
          <select value={selectedSubject} onChange={e => { setSelectedSubject(e.target.value); setSelectedChapter(''); }} className="w-full px-4 py-3 rounded-xl bg-secondary border border-border focus:border-primary outline-none text-foreground">
            <option value="">Choisir une matière</option>
            {publishedSubjects.map(s => <option key={s.id} value={s.id}>{s.icone} {s.nom}</option>)}
          </select>
        </div>

        {/* Chapter */}
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-2 block">Chapitre</label>
          <select value={selectedChapter} onChange={e => setSelectedChapter(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-secondary border border-border focus:border-primary outline-none text-foreground" disabled={!selectedSubject}>
            <option value="">Choisir un chapitre</option>
            {chapters.map(c => <option key={c.id} value={c.id}>{c.titre}</option>)}
          </select>
        </div>

        {/* Info box */}
        {selectedChapter && (
          <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 animate-fade-in">
            <p className="text-sm text-primary font-medium flex items-center gap-2">
              <Brain size={16} />
              L'IA va analyser le chapitre et générer le nombre exact de questions (mélange QCM, Vrai/Faux, texte à trou et questions ouvertes) pour couvrir tous les concepts.
            </p>
          </div>
        )}

        <button onClick={handleGenerate} disabled={!selectedSubject || !selectedChapter || loading} className="w-full py-4 rounded-xl gradient-bg text-primary-foreground font-semibold text-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
          {loading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-3">
                <div className="animate-spin w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full" />
                <span>{loadingStep}</span>
              </div>
              <div className="w-48 h-1.5 rounded-full bg-primary-foreground/20 overflow-hidden">
                <div className="h-full bg-primary-foreground/60 rounded-full animate-pulse" style={{ width: '60%' }} />
              </div>
            </div>
          ) : (
            <><Sparkles size={20} /> Générer les exercices</>
          )}
        </button>
      </div>

      {/* History */}
      {exerciseHistory.length > 0 && (
        <div className="glass-card p-6 mt-6">
          <h3 className="font-heading font-semibold text-lg mb-4">📊 Historique récent</h3>
          <div className="space-y-2">
            {exerciseHistory.map((h, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                <div>
                  <p className="text-sm font-medium">{h.chapitre}</p>
                  <p className="text-xs text-muted-foreground">{h.date} • {h.type}</p>
                </div>
                <span className={`font-bold ${(h.score / h.total) >= 0.7 ? 'text-success' : 'text-destructive'}`}>
                  {h.score}/{h.total}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
