import { useState, useMemo } from 'react';
import { useApp, ExerciseHistory } from '@/contexts/AppContext';
import { Brain, RotateCcw, BookOpen, Sparkles, ChevronRight, Trophy, Star, BookMarked, Flame } from 'lucide-react';

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

// Generate mock exercises for demo
function generateMockExercises(type: ExerciseType, count: number, chapterTitle: string): Exercise[] {
  const exercises: Exercise[] = [];
  const templates: Record<ExerciseType, () => Exercise> = {
    qcm: () => ({
      id: 0, type: 'qcm',
      enonce: `Quelle est la caractéristique principale étudiée dans "${chapterTitle}" ?`,
      options: ['La performance', 'La structure', 'La sécurité', 'La rapidité'],
      reponseCorrecte: 'La structure',
      explicationCorrecte: "La structure est en effet un concept fondamental de ce chapitre.",
      explicationFausse: "Revoyez la section d'introduction du chapitre pour mieux comprendre.",
    }),
    vrai_faux: () => ({
      id: 0, type: 'vrai_faux',
      enonce: `Les concepts présentés dans "${chapterTitle}" sont utilisés uniquement en théorie.`,
      options: ['Vrai', 'Faux'],
      reponseCorrecte: 'Faux',
      explicationCorrecte: "Ces concepts ont des applications pratiques importantes.",
      explicationFausse: "Ces concepts sont largement utilisés en pratique.",
    }),
    texte_trou: () => ({
      id: 0, type: 'texte_trou',
      enonce: `Dans le chapitre "${chapterTitle}", le concept principal est la _____.`,
      reponseCorrecte: 'structure',
      explicationCorrecte: "Bonne réponse ! C'est bien le concept central.",
      explicationFausse: "La bonne réponse était 'structure'. Relisez le chapitre.",
    }),
    question_ouverte: () => ({
      id: 0, type: 'question_ouverte',
      enonce: `Expliquez brièvement le concept principal du chapitre "${chapterTitle}".`,
      reponseCorrecte: '',
      explicationCorrecte: "Votre réponse sera évaluée selon la compréhension des concepts clés.",
      explicationFausse: '',
    }),
  };

  for (let i = 0; i < count; i++) {
    const ex = templates[type]();
    ex.id = i + 1;
    ex.enonce = i === 0 ? ex.enonce : `Question ${i + 1} sur "${chapterTitle}" : ${ex.enonce}`;
    exercises.push(ex);
  }
  return exercises;
}

export function ExercisesPage() {
  const { subjects, exerciseHistory, addExerciseHistory } = useApp();
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [exerciseType, setExerciseType] = useState<ExerciseType>('qcm');
  const [nbQuestions, setNbQuestions] = useState(5);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answer, setAnswer] = useState('');
  const [answered, setAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);
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

  const handleGenerate = async () => {
    const chapter = chapters.find(c => c.id === selectedChapter);
    if (!chapter) return;

    setLoading(true);
    // Simulate AI generation delay
    await new Promise(r => setTimeout(r, 1500));
    const generated = generateMockExercises(exerciseType, nbQuestions, chapter.titre);
    setExercises(generated);
    setCurrentIdx(0);
    setScore(0);
    setAnswer('');
    setAnswered(false);
    setWrongAnswers([]);
    setLoading(false);
    setPhase('quiz');
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
        score: score + (isCorrect ? 0 : 0), // already counted
        total: exercises.length,
        type: typeLabels[exerciseType].label,
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
            <span>{Math.round(progress)}%</span>
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
        <p className="text-muted-foreground">Testez vos connaissances avec des exercices générés par l'IA</p>
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

        {/* Type */}
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-2 block">Type d'exercice</label>
          <div className="grid grid-cols-2 gap-3">
            {(Object.entries(typeLabels) as [ExerciseType, { label: string }][]).map(([key, val]) => (
              <button key={key} onClick={() => setExerciseType(key)} className={`p-3 rounded-xl text-sm font-medium transition-all border ${exerciseType === key ? 'bg-primary/15 border-primary text-primary' : 'bg-secondary border-border hover:border-primary/50'}`}>
                {val.label}
              </button>
            ))}
          </div>
        </div>

        {/* Count */}
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-2 block">Nombre de questions</label>
          <div className="flex gap-3">
            {[3, 5, 10].map(n => (
              <button key={n} onClick={() => setNbQuestions(n)} className={`flex-1 p-3 rounded-xl font-medium transition-all border ${nbQuestions === n ? 'bg-primary/15 border-primary text-primary' : 'bg-secondary border-border hover:border-primary/50'}`}>
                {n}
              </button>
            ))}
          </div>
        </div>

        <button onClick={handleGenerate} disabled={!selectedSubject || !selectedChapter || loading} className="w-full py-4 rounded-xl gradient-bg text-primary-foreground font-semibold text-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
          {loading ? (
            <><span className="animate-spin">🤖</span> L'IA prépare vos exercices...</>
          ) : (
            <><Sparkles size={20} /> Générer avec l'IA</>
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
