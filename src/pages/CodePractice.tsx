import { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { Play, RefreshCw, Code2, Terminal as TerminalIcon, Globe } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

interface CodeExercise {
  id: string;
  chapter_id: string;
  title: string;
  instructions: string;
  starter_code: string;
  expected_output?: string;
  language: 'python' | 'javascript' | 'html' | 'css';
  chapter_title?: string;
  subject_name?: string;
}

export function CodePractice() {
  const { subjects } = useApp();
  const [exercises, setExercises] = useState<CodeExercise[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<CodeExercise | null>(null);
  const [code, setCode] = useState('');
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [terminal, setTerminal] = useState<Terminal | null>(null);
  const [isPreview, setIsPreview] = useState(false);

  // Charger les exercices depuis Supabase
  useEffect(() => {
    const loadExercises = async () => {
      const { data } = await supabase
        .from('code_exercises')
        .select(`
          *,
          chapters:chapter_id (
            titre,
            subject:subject_id (nom)
          )
        `)
        .order('created_at', { ascending: false });
      
      if (data) {
        setExercises(data.map(ex => ({
          ...ex,
          chapter_title: ex.chapters?.titre,
          subject_name: ex.chapters?.subject?.nom
        })));
      }
    };
    loadExercises();
  }, []);

  // Initialiser le terminal
  useEffect(() => {
    if (!selectedExercise || selectedExercise.language === 'html') return;
    
    const term = new Terminal({
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
      },
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      cursorBlink: true,
    });
    
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    
    setTimeout(() => {
      const terminalElement = document.getElementById('terminal');
      if (terminalElement) {
        term.open(terminalElement);
        fitAddon.fit();
        term.writeln('Bienvenue dans le terminal interactif !');
        term.writeln('Cliquez sur "Exécuter" pour voir le résultat.');
      }
    }, 100);
    
    setTerminal(term);
    
    return () => {
      term.dispose();
    };
  }, [selectedExercise]);

  const runCode = async () => {
    if (!selectedExercise) return;
    
    setIsRunning(true);
    terminal?.clear();
    terminal?.writeln(`\x1b[36mExécution du code ${selectedExercise.language}...\x1b[0m`);
    
    try {
      const { data, error } = await supabase.functions.invoke('execute-code', {
        body: {
          code,
          language: selectedExercise.language,
        },
      });
      
      if (error) throw error;
      
      setOutput(data.output);
      
      if (terminal) {
        terminal.writeln('\n\x1b[32m' + (data.output || 'Aucune sortie') + '\x1b[0m');
        
        // Vérifier si le résultat correspond à l'attendu
        if (selectedExercise.expected_output) {
          const isCorrect = data.output?.trim() === selectedExercise.expected_output.trim();
          if (isCorrect) {
            terminal.writeln('\n\x1b[32m✅ Résultat correct ! Bravo !\x1b[0m');
          } else {
            terminal.writeln('\n\x1b[33m⚠️ Le résultat ne correspond pas exactement à l\'attendu.\x1b[0m');
          }
        }
      }
    } catch (err: any) {
      terminal?.writeln('\n\x1b[31m❌ Erreur : ' + err.message + '\x1b[0m');
    } finally {
      setIsRunning(false);
    }
  };

  // Filtrer les exercices par matière programmation
  const programmingExercises = exercises.filter(ex => 
    ['python', 'javascript', 'html', 'css'].includes(ex.language)
  );

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-heading font-bold text-2xl md:text-3xl">💻 Pratique de codage</h1>
      </div>

      <div className="flex gap-4 h-full">
        {/* Sidebar des exercices */}
        <div className="w-80 glass-card p-4 overflow-y-auto">
          <h2 className="font-heading font-semibold text-lg mb-4">Exercices disponibles</h2>
          {programmingExercises.length === 0 ? (
            <p className="text-muted-foreground text-sm">Aucun exercice pour le moment. Les exercices apparaîtront automatiquement quand des chapitres seront créés.</p>
          ) : (
            <div className="space-y-2">
              {programmingExercises.map((ex) => (
                <button
                  key={ex.id}
                  onClick={() => {
                    setSelectedExercise(ex);
                    setCode(ex.starter_code || '');
                    setOutput('');
                  }}
                  className={`w-full text-left p-3 rounded-lg transition-all ${
                    selectedExercise?.id === ex.id
                      ? 'bg-primary/20 border border-primary/30'
                      : 'bg-secondary/50 hover:bg-secondary'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Code2 size={16} className="text-primary" />
                    <span className="font-medium text-sm truncate">{ex.title}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="px-1.5 py-0.5 rounded bg-muted">
                      {ex.language}
                    </span>
                    <span>{ex.subject_name} • {ex.chapter_title}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Zone principale */}
        {selectedExercise ? (
          <div className="flex-1 flex flex-col gap-4">
            {/* Instructions */}
            <div className="glass-card p-4">
              <h3 className="font-heading font-semibold text-lg mb-2">{selectedExercise.title}</h3>
              <p className="text-muted-foreground whitespace-pre-wrap">{selectedExercise.instructions}</p>
            </div>

            {/* Éditeur et terminal */}
            <div className="flex-1 flex gap-4">
              {/* Éditeur */}
              <div className="flex-1 glass-card overflow-hidden">
                <div className="flex items-center justify-between p-2 border-b border-border bg-secondary/50">
                  <span className="text-sm font-medium">{selectedExercise.language}</span>
                  <div className="flex gap-2">
                    {selectedExercise.language === 'html' && (
                      <button
                        onClick={() => setIsPreview(!isPreview)}
                        className="px-3 py-1 rounded-lg bg-secondary hover:bg-muted text-xs flex items-center gap-1"
                      >
                        <Globe size={14} />
                        {isPreview ? 'Code' : 'Aperçu'}
                      </button>
                    )}
                    <button
                      onClick={runCode}
                      disabled={isRunning}
                      className="px-4 py-1.5 rounded-lg gradient-bg text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                    >
                      {isRunning ? (
                        <RefreshCw size={14} className="animate-spin" />
                      ) : (
                        <Play size={14} />
                      )}
                      Exécuter
                    </button>
                  </div>
                </div>

                {selectedExercise.language === 'html' && isPreview ? (
                  <iframe
                    srcDoc={code}
                    className="w-full h-[calc(100%-48px)] bg-white"
                    title="preview"
                    sandbox="allow-scripts allow-same-origin"
                  />
                ) : (
                  <Editor
                    height="calc(100% - 48px)"
                    language={selectedExercise.language}
                    value={code}
                    onChange={(value) => setCode(value || '')}
                    theme="vs-dark"
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      lineNumbers: 'on',
                      automaticLayout: true,
                    }}
                  />
                )}
              </div>

              {/* Terminal */}
              {selectedExercise.language !== 'html' && (
                <div className="w-96 glass-card overflow-hidden">
                  <div className="flex items-center gap-2 p-2 border-b border-border bg-secondary/50">
                    <TerminalIcon size={16} />
                    <span className="text-sm font-medium">Terminal</span>
                  </div>
                  <div id="terminal" className="h-[calc(100%-48px)] p-2" />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 glass-card flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Code2 size={48} className="mx-auto mb-4 opacity-30" />
              <p>Sélectionnez un exercice pour commencer</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
