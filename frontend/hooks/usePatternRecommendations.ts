import { useMutation, useQuery } from '@tanstack/react-query';
import backend from '~backend/client';
import { useToast } from '@/components/ui/use-toast';

export function usePatternRecommendations(context: any, enabled: boolean = false) {
  return useQuery({
    queryKey: ['patternRecommendations', context],
    queryFn: () => backend.music.getPatternRecommendations({ context, limit: 10 }),
    enabled
  });
}

export function useTrackPatternUsage() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: (data: { patternId: string; success: boolean }) => 
      backend.music.trackPatternUsage(data),
    onSuccess: () => {
      toast({
        title: "Usage Tracked",
        description: "Pattern usage recorded for improving recommendations",
      });
    }
  });
}

export function useRecommenderStatistics() {
  return useQuery({
    queryKey: ['recommenderStats'],
    queryFn: () => backend.music.getRecommenderStatistics()
  });
}
