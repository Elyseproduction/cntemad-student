import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Send, Trash2, Play, Pause } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VoiceRecorderProps { onSend: (audioBlob: Blob) => void; }

const MAX_RECORDING_SECONDS = 120;

export function VoiceRecorder({ onSend }: VoiceRecorderProps) {
  const [isRecording,   setIsRecording]   = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob,     setAudioBlob]     = useState<Blob | null>(null);
  const [audioUrl,      setAudioUrl]      = useState<string | null>(null);
  const [isProcessing,  setIsProcessing]  = useState(false);
  const [isPlaying,     setIsPlaying]     = useState(false);
  const [audioLevels,   setAudioLevels]   = useState<number[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef        = useRef<BlobPart[]>([]);
  const timerRef         = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const audioContextRef  = useRef<AudioContext | null>(null);
  const analyserRef      = useRef<AnalyserNode | null>(null);
  const sourceRef        = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationRef     = useRef<number | undefined>(undefined);
  const audioRef         = useRef<HTMLAudioElement | null>(null);
  const { toast }        = useToast();

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioContextRef.current?.state !== 'closed') audioContextRef.current?.close();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [audioUrl]);

  const updateAudioLevel = () => {
    if (!analyserRef.current) return;
    const data = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(data);
    const avg = data.reduce((a, b) => a + b, 0) / data.length;
    setAudioLevels(prev => {
      const next = [...prev, Math.min(100, avg * 2)];
      return next.length > 30 ? next.slice(-30) : next;
    });
    animationRef.current = requestAnimationFrame(updateAudioLevel);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 128_000 });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      audioContextRef.current = new AudioContext();
      analyserRef.current     = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      sourceRef.current.connect(analyserRef.current);
      updateAudioLevel();

      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
        setIsProcessing(false);
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
        setAudioLevels([]);
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev + 1 >= MAX_RECORDING_SECONDS) { stopRecording(); }
          return prev + 1;
        });
      }, 1000);
    } catch {
      toast({ title: 'Erreur microphone', description: "Impossible d'accéder au microphone. Vérifiez les permissions.", variant: 'destructive' });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      setIsProcessing(true);
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      sourceRef.current?.disconnect();
    }
  };

  const cancelRecording = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    audioRef.current?.pause();
    setAudioBlob(null); setAudioUrl(null); setRecordingTime(0);
    setIsProcessing(false); setAudioLevels([]); setIsPlaying(false);
  };

  const sendRecording = () => { if (audioBlob) { onSend(audioBlob); cancelRecording(); } };

  const togglePlayback = () => {
    if (!audioRef.current || !audioUrl) return;
    if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); }
    else           { audioRef.current.play();  setIsPlaying(true);  }
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  if (audioUrl) {
    return (
      <div className="flex items-center gap-1.5 p-2 bg-secondary rounded-xl animate-fade-in">
        <audio ref={audioRef} src={audioUrl} onEnded={() => setIsPlaying(false)} className="hidden" />
        <button onClick={togglePlayback} aria-label={isPlaying ? 'Pause' : 'Lire'}
          className="p-1.5 rounded-full text-primary hover:bg-muted transition-colors">
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <span className="text-xs font-mono text-muted-foreground min-w-[36px]">{fmt(recordingTime)}</span>
        <button onClick={sendRecording} disabled={isProcessing} aria-label="Envoyer"
          className="p-1.5 rounded-full text-primary hover:bg-muted transition-colors disabled:opacity-50">
          <Send size={16} />
        </button>
        <button onClick={cancelRecording} disabled={isProcessing} aria-label="Supprimer"
          className="p-1.5 rounded-full text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50">
          <Trash2 size={16} />
        </button>
      </div>
    );
  }

  if (isRecording) {
    const progress = (recordingTime / MAX_RECORDING_SECONDS) * 100;
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-[2px] h-6 min-w-[60px]" aria-hidden="true">
          {audioLevels.map((level, i) => (
            <div key={i} className="w-[3px] bg-primary rounded-full transition-all duration-75"
              style={{ height: `${Math.max(3, level / 2)}px` }} />
          ))}
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <span className={`text-xs font-mono ${recordingTime >= MAX_RECORDING_SECONDS * 0.9 ? 'text-destructive' : 'text-muted-foreground'}`}>
            {fmt(recordingTime)}
          </span>
          <div className="w-12 h-0.5 bg-muted rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${progress > 90 ? 'bg-destructive' : 'bg-primary'}`}
              style={{ width: `${progress}%` }} />
          </div>
        </div>
        <button onClick={stopRecording} disabled={isProcessing} aria-label="Arrêter l'enregistrement"
          className="p-2 rounded-full text-destructive bg-destructive/10 hover:bg-destructive/20 transition-colors disabled:opacity-50">
          <Square size={14} fill="currentColor" />
        </button>
      </div>
    );
  }

  return (
    <button onClick={startRecording} disabled={isProcessing} aria-label="Enregistrer un message vocal" title="Message vocal"
      className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-50">
      <Mic size={20} />
    </button>
  );
}
