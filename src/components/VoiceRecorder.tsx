import { useState, useRef } from 'react';
import { Mic, Square, Send, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VoiceRecorderProps {
  onSend: (audioBlob: Blob) => void;
}

export function VoiceRecorder({ onSend }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<NodeJS.Timeout>();
  const { toast } = useToast();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

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
        
        // Arrêter toutes les pistes
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      
      // Timer
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'accéder au microphone',
        variant: 'destructive',
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
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
  };

  const sendRecording = () => {
    if (audioBlob) {
      onSend(audioBlob);
      cancelRecording();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (audioUrl) {
    return (
      <div className="flex items-center gap-2 p-2 bg-secondary rounded-xl animate-fade-in">
        <audio src={audioUrl} controls className="h-10 w-48" />
        <button
          onClick={sendRecording}
          className="p-2 rounded-full text-primary hover:bg-muted transition-colors"
          title="Envoyer"
        >
          <Send size={18} />
        </button>
        <button
          onClick={cancelRecording}
          className="p-2 rounded-full text-muted-foreground hover:bg-muted transition-colors"
          title="Annuler"
        >
          <X size={18} />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={isRecording ? stopRecording : startRecording}
      className={`p-2 rounded-full transition-colors ${
        isRecording 
          ? 'text-destructive animate-pulse bg-destructive/10' 
          : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
      }`}
      title={isRecording ? 'Arrêter l\'enregistrement' : 'Message vocal'}
    >
      {isRecording ? (
        <div className="flex items-center gap-1">
          <Square size={16} fill="currentColor" />
          <span className="text-xs font-mono">{formatTime(recordingTime)}</span>
        </div>
      ) : (
        <Mic size={20} />
      )}
    </button>
  );
}
