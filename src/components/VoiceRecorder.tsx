import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Send, X, Trash2, Play, Pause } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VoiceRecorderProps {
  onSend: (audioBlob: Blob) => void;
}

export function VoiceRecorder({ onSend }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioLevel, setAudioLevel] = useState<number[]>([]);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<NodeJS.Timeout>();
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationRef = useRef<number>();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  // Nettoyage
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioContextRef.current?.state !== 'closed') {
        audioContextRef.current?.close();
      }
    };
  }, [audioUrl]);

  // Analyser le niveau audio pour l'animation
  const updateAudioLevel = () => {
    if (!analyserRef.current) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    // Calculer le niveau moyen
    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    const normalized = Math.min(100, Math.max(0, average * 2));
    
    setAudioLevel(prev => {
      const newLevels = [...prev, normalized];
      if (newLevels.length > 30) newLevels.shift();
      return newLevels;
    });
    
    animationRef.current = requestAnimationFrame(updateAudioLevel);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      
      // Configuration pour meilleure qualité
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 128000, // 128 kbps pour meilleure qualité
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      // Configuration de l'analyseur audio pour l'animation
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      sourceRef.current.connect(analyserRef.current);
      
      updateAudioLevel();

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        
        stream.getTracks().forEach(track => track.stop());
        setIsProcessing(false);
        
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
        setAudioLevel([]);
      };

      mediaRecorder.start(100); // Collecter des données toutes les 100ms
      setIsRecording(true);
      setIsProcessing(false);
      
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Erreur microphone:', err);
      toast({
        title: 'Erreur microphone',
        description: 'Impossible d\'accéder au microphone. Vérifiez les permissions.',
        variant: 'destructive',
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      setIsProcessing(true);
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect();
      }
    }
  };

  const cancelRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setIsProcessing(false);
    setAudioLevel([]);
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const sendRecording = () => {
    if (audioBlob) {
      onSend(audioBlob);
      cancelRecording();
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current || !audioUrl) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Animation des barres de son
  const renderWaveform = () => {
    if (isRecording) {
      return (
        <div className="flex items-center gap-[2px] h-8">
          {audioLevel.map((level, i) => (
            <div
              key={i}
              className="w-1 bg-primary rounded-full transition-all duration-75"
              style={{ height: `${Math.max(4, level / 2)}px` }}
            />
          ))}
        </div>
      );
    }
    return null;
  };

  if (audioUrl) {
    return (
      <div className="flex items-center gap-2 p-2 bg-secondary rounded-xl animate-fade-in">
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        />
        
        <button
          onClick={togglePlayback}
          className="p-2 rounded-full text-primary hover:bg-muted transition-colors"
        >
          {isPlaying ? <Pause size={18} /> : <Play size={18} />}
        </button>
        
        <div className="text-xs font-mono">
          {formatTime(recordingTime)}
        </div>
        
        <button
          onClick={sendRecording}
          disabled={isProcessing}
          className="p-2 rounded-full text-primary hover:bg-muted transition-colors disabled:opacity-50"
          title="Envoyer"
        >
          <Send size={18} />
        </button>
        
        <button
          onClick={cancelRecording}
          disabled={isProcessing}
          className="p-2 rounded-full text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
          title="Supprimer"
        >
          <Trash2 size={18} />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={isRecording ? stopRecording : startRecording}
      disabled={isProcessing}
      className={`p-2 rounded-full transition-colors relative ${
        isRecording 
          ? 'text-destructive bg-destructive/10' 
          : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
      } disabled:opacity-50`}
      title={isRecording ? 'Arrêter l\'enregistrement' : 'Message vocal'}
    >
      {isRecording ? (
        <div className="flex items-center gap-2">
          <Square size={16} fill="currentColor" />
          <span className="text-xs font-mono">{formatTime(recordingTime)}</span>
          {renderWaveform()}
        </div>
      ) : (
        <Mic size={20} />
      )}
    </button>
  );
}
