import { useMutation, useQuery } from '@tanstack/react-query';
import backend from '~backend/client';
import { useToast } from '@/components/ui/use-toast';

export function useCollectFeedback() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: (data: {
      generationId: string;
      signalType: 'user_rating' | 'expert_validation' | 'objective_metric' | 'cultural_assessment';
      signalValue: number;
      signalData?: any;
    }) => backend.music.collectFeedback(data),
    onSuccess: () => {
      toast({
        title: "Feedback Collected",
        description: "Thank you! Your feedback helps improve the AI",
      });
    }
  });
}

export function useCollectLearningExample() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: (data: {
      generationId: string;
      audioData: string;
      metadata: any;
    }) => backend.music.collectLearningExample(data),
    onSuccess: () => {
      toast({
        title: "Learning Example Collected",
        description: "This generation will help improve future results",
      });
    }
  });
}

export function useLearningStatistics() {
  return useQuery({
    queryKey: ['learningStats'],
    queryFn: () => backend.music.getLearningStatistics()
  });
}

export function useAdaptationRecommendations() {
  return useQuery({
    queryKey: ['adaptationRecommendations'],
    queryFn: () => backend.music.getAdaptationRecommendations()
  });
}
