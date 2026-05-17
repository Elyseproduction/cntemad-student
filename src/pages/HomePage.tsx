import { useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/hooks/useAuth';
import {
  BookOpen, Brain, Video, MessageCircle, Flame, Trophy, Sparkles,
  ArrowRight, Clock, Target, TrendingUp, Zap, GraduationCap, ChevronRight,
} from 'lucide-react';

function StatCard({
  icon: Icon, label, value, accent, delay,
}: { icon: any; label: string; value: string | number; accent: string; delay: number }) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-4 bg-card/60 backdrop-blur-xl border border-white/5 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 animate-fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div
        className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-40"
        style={{ background: accent }}
      />
      <div className="relative flex flex-col gap-2">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: `${accent}33`, color: accent }}
        >
          <Icon size={18} strokeWidth={2.2} />
        </div>
        <div className="text-2xl font-heading font-bold leading-none">{value}</div>
        <div className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">{label}</div>
      </div>
    </div>
  );
}

export function HomePage() {
  const { subjects, videos, messages, exerciseHistory, setActiveTab } = useApp();
  const { profile, user } = useAuth();

  const stats = useMemo(() => {
    const chapters = subjects.flatMap(s => s.chapitres || []);
    const learned = chapters.filter((c: any) => c.learned).length;
    const exos = exerciseHistory.length;
    const avg = exos
      ? Math.round(exerciseHistory.reduce((a, h) => a + (h.score / Math.max(1, h.total)) * 100, 0) / exos)
      : 0;
    const xp = learned * 50 + exos * 20;
    const streak = parseInt(localStorage.getItem('unilearn_streak') || '1', 10);
    return { totalChapters: chapters.length, learned, exos, avg, xp, streak, videos: videos.length };
  }, [subjects, exerciseHistory, videos]);

  const lastChapter = useMemo(() => {
    for (const s of subjects) {
      const c = (s.chapitres || []).find((c: any) => !c.learned);
      if (c) return { subject: s, chapter: c };
    }
    return null;
  }, [subjects]);

  const recentMessages = messages.slice(-3).reverse();
  const name = profile?.display_name || user?.user_metadata?.full_name?.split(' ')[0] || 'Étudiant';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';

  const progress = stats.totalChapters
    ? Math.round((stats.learned / stats.totalChapters) * 100)
    : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-5 pb-4">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl p-5 md:p-7 border border-primary/20 animate-fade-in"
        style={{
          background:
            'radial-gradient(ellipse at top left, hsl(var(--primary) / 0.35), transparent 60%),' +
            'radial-gradient(ellipse at bottom right, hsl(var(--accent) / 0.25), transparent 60%),' +
            'linear-gradient(135deg, hsl(var(--card) / 0.8), hsl(var(--card) / 0.4))',
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,white_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.03]" />
        <div className="relative flex items-start gap-4">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-14 h-14 rounded-2xl object-cover ring-2 ring-primary/40 shadow-lg shadow-primary/20" />
          ) : (
            <div className="w-14 h-14 rounded-2xl gradient-bg flex items-center justify-center text-primary-foreground font-heading font-bold text-xl ring-2 ring-primary/40">
              {name[0]?.toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{greeting}</p>
            <h1 className="font-heading font-bold text-2xl md:text-3xl truncate">
              {name} <span className="inline-block animate-float">👋</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
              <Sparkles size={13} className="text-accent" />
              Prêt à apprendre quelque chose de nouveau ?
            </p>
          </div>
        </div>

        {/* Progress global */}
        <div className="relative mt-5 p-3 rounded-2xl bg-background/40 backdrop-blur-md border border-white/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Progression globale</span>
            <span className="text-sm font-heading font-bold gradient-text">{progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-secondary/60 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] animate-[shine_3s_linear_infinite] transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-[11px] text-muted-foreground">
            <span>{stats.learned} / {stats.totalChapters} chapitres</span>
            <span className="flex items-center gap-1"><Zap size={11} className="text-warning" /> {stats.xp} XP</span>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={BookOpen}  label="Chapitres"   value={stats.totalChapters} accent="hsl(245 80% 65%)" delay={50} />
        <StatCard icon={Brain}     label="Exercices"   value={stats.exos}          accent="hsl(185 80% 55%)" delay={100} />
        <StatCard icon={Flame}     label="Streak"      value={`${stats.streak}j`}  accent="hsl(20 90% 60%)"  delay={150} />
        <StatCard icon={Trophy}    label="Moyenne"     value={`${stats.avg}%`}     accent="hsl(45 90% 55%)"  delay={200} />
      </div>

      {/* Continue learning */}
      {lastChapter && (
        <button
          onClick={() => setActiveTab('cours')}
          className="group w-full text-left relative overflow-hidden rounded-2xl p-5 border border-white/5 bg-card/60 backdrop-blur-xl hover:border-primary/40 transition-all duration-300 animate-fade-in"
          style={{ animationDelay: '250ms' }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0 shadow-lg"
              style={{ background: `${lastChapter.subject.couleur}33`, color: lastChapter.subject.couleur }}
            >
              {lastChapter.subject.icone || '📖'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] text-accent font-bold uppercase tracking-widest flex items-center gap-1">
                <Clock size={11} /> Continuer
              </div>
              <h3 className="font-heading font-semibold text-base truncate mt-0.5">{lastChapter.chapter.titre}</h3>
              <p className="text-xs text-muted-foreground truncate">{lastChapter.subject.nom}</p>
            </div>
            <ArrowRight size={20} className="text-primary group-hover:translate-x-1 transition-transform shrink-0" />
          </div>
        </button>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { tab: 'exercices',  icon: Brain,         label: 'Exercices IA', desc: 'Quiz adaptatifs',     accent: 'hsl(185 80% 55%)' },
          { tab: 'videos',     icon: Video,         label: 'Vidéothèque',  desc: `${stats.videos} vidéos`,    accent: 'hsl(0 75% 60%)' },
          { tab: 'communaute', icon: MessageCircle, label: 'Communauté',   desc: 'Échangez',            accent: 'hsl(245 80% 65%)' },
          { tab: 'guide',      icon: GraduationCap, label: 'Guide',        desc: "Comment l'utiliser",  accent: 'hsl(140 60% 50%)' },
        ].map((a, i) => (
          <button
            key={a.tab}
            onClick={() => setActiveTab(a.tab)}
            className="group relative overflow-hidden rounded-2xl p-4 border border-white/5 bg-card/60 backdrop-blur-xl hover:border-primary/30 hover:-translate-y-0.5 transition-all duration-300 text-left animate-fade-in"
            style={{ animationDelay: `${300 + i * 60}ms` }}
          >
            <div
              className="absolute -bottom-6 -right-6 w-20 h-20 rounded-full blur-2xl opacity-50 group-hover:opacity-80 transition-opacity"
              style={{ background: a.accent }}
            />
            <div className="relative">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-2"
                style={{ background: `${a.accent}33`, color: a.accent }}
              >
                <a.icon size={18} />
              </div>
              <div className="font-heading font-semibold text-sm">{a.label}</div>
              <div className="text-[11px] text-muted-foreground">{a.desc}</div>
            </div>
          </button>
        ))}
      </div>

      {/* AI recommendation */}
      <div
        className="relative overflow-hidden rounded-2xl p-4 border border-accent/30 animate-fade-in"
        style={{
          background:
            'linear-gradient(135deg, hsl(var(--accent) / 0.15), hsl(var(--primary) / 0.1))',
          animationDelay: '500ms',
        }}
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/20 text-accent flex items-center justify-center shrink-0 animate-pulse-glow">
            <Sparkles size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-accent">Recommandation IA</span>
            </div>
            <p className="text-sm leading-snug">
              {lastChapter
                ? <>Tu devrais réviser <strong className="text-foreground">{lastChapter.chapter.titre}</strong> aujourd'hui pour consolider tes acquis.</>
                : 'Bravo, tous tes chapitres sont terminés ! Lance un quiz IA pour réviser.'}
            </p>
          </div>
        </div>
      </div>

      {/* Recent community */}
      {recentMessages.length > 0 && (
        <div className="space-y-2 animate-fade-in" style={{ animationDelay: '600ms' }}>
          <div className="flex items-center justify-between px-1">
            <h2 className="font-heading font-semibold text-base flex items-center gap-2">
              <TrendingUp size={16} className="text-primary" /> Activité communauté
            </h2>
            <button
              onClick={() => setActiveTab('communaute')}
              className="text-xs text-primary font-medium flex items-center gap-0.5 hover:gap-1.5 transition-all"
            >
              Voir tout <ChevronRight size={13} />
            </button>
          </div>
          <div className="space-y-2">
            {recentMessages.map(m => (
              <div key={m.id} className="rounded-xl p-3 bg-card/60 backdrop-blur-xl border border-white/5 flex items-start gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ background: m.couleur }}
                >
                  {m.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold text-sm truncate">{m.auteur}</span>
                    <span className="text-[10px] text-muted-foreground">{m.heure}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{m.contenu}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Daily goal */}
      <div className="rounded-2xl p-4 border border-white/5 bg-card/60 backdrop-blur-xl animate-fade-in" style={{ animationDelay: '700ms' }}>
        <div className="flex items-center gap-2 mb-3">
          <Target size={16} className="text-primary" />
          <h2 className="font-heading font-semibold text-base">Objectif du jour</h2>
        </div>
        <div className="space-y-2.5">
          {[
            { label: 'Lire 1 chapitre',  done: stats.learned > 0 },
            { label: 'Faire 1 quiz IA',  done: stats.exos > 0 },
            { label: 'Regarder 1 vidéo', done: false },
          ].map((g, i) => (
            <div key={i} className="flex items-center gap-3">
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  g.done ? 'bg-success border-success' : 'border-muted-foreground/30'
                }`}
              >
                {g.done && <span className="text-white text-[10px]">✓</span>}
              </div>
              <span className={`text-sm ${g.done ? 'line-through text-muted-foreground' : ''}`}>{g.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
