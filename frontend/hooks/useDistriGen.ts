import { useMutation, useQuery } from '@tanstack/react-query';
import backend from '~backend/client';
import { useToast } from '@/components/ui/use-toast';
import type { Genre } from '~backend/music/types';

export function useDistriGenExperiment() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: (data: {
      prompt: string;
      genre: Genre;
      numWorkers?: number;
      bpm?: number;
      keySignature?: string;
      duration?: number;
      culturalAuthenticity?: string;
    }) => backend.music.runDistriGenExperiment(data),
    onSuccess: (data) => {
      toast({
        title: "Distributed Generation Complete!",
        description: `Generated in ${data.totalLatency}ms with ${data.parallelizationGain.toFixed(1)}× speedup`,
      });
    }
  });
}

export function useDistriGenScaling() {
  return useMutation({
    mutationFn: (data: { gpuCounts: number[] }) => 
      backend.music.getDistriGenScalingAnalysis(data)
  });
}
