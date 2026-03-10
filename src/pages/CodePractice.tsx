import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Code2 } from 'lucide-react';

export function CodePractice() {
  const { subjects } = useApp();

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading font-bold text-2xl md:text-3xl">💻 Pratique de codage</h1>
      </div>

      <div className="glass-card flex items-center justify-center py-16 text-muted-foreground">
        <div className="text-center">
          <Code2 size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">Bientôt disponible</p>
          <p className="text-sm mt-1">Les exercices de codage seront disponibles prochainement.</p>
        </div>
      </div>
    </div>
  );
}
