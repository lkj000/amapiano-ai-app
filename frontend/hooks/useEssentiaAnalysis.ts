import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import backend from '~backend/client';

export function useEssentiaAnalysis() {
  const [kwaitoFeatures, setKwaitoFeatures] = useState<any>(null);
  const [regionalData, setRegionalData] = useState<any>(null);
  const [subGenreData, setSubGenreData] = useState<any>(null);

  const kwaitoMutation = useMutation({
    mutationFn: (audioUrl: string) => backend.music.detectKwaitoInfluence({ audioUrl }),
    onSuccess: (data) => {
      setKwaitoFeatures(data.kwaitoFeatures);
      toast.success(`Kwaito analysis complete (${data.processingTime}ms)`);
    },
    onError: (error: any) => {
      console.error('Kwaito detection error:', error);
      toast.error('Kwaito Detection Failed', { description: error.message });
    }
  });

  const regionalMutation = useMutation({
    mutationFn: (req: { audioUrl: string; kwaitoFeatures?: any }) => 
      backend.music.classifyRegion(req),
    onSuccess: (data) => {
      setRegionalData(data.regional);
      setSubGenreData(data.subGenre);
      toast.success(`Regional classification complete (${data.processingTime}ms)`);
    },
    onError: (error: any) => {
      console.error('Regional classification error:', error);
      toast.error('Regional Classification Failed', { description: error.message });
    }
  });

  const analyzeAll = async (audioUrl: string) => {
    try {
      const kwaitoResult = await kwaitoMutation.mutateAsync(audioUrl);
      
      await regionalMutation.mutateAsync({
        audioUrl,
        kwaitoFeatures: kwaitoResult.kwaitoFeatures
      });
      
      toast.success('Complete Essentia analysis finished');
    } catch (error) {
      console.error('Full Essentia analysis error:', error);
    }
  };

  return {
    kwaitoFeatures,
    regionalData,
    subGenreData,
    kwaitoMutation,
    regionalMutation,
    analyzeAll,
    isAnalyzing: kwaitoMutation.isPending || regionalMutation.isPending
  };
}
