import React, { useState } from 'react';
import { Star, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useCollectFeedback } from '@/hooks/useLearning';

interface FeedbackCollectorProps {
  generationId: string;
  generationType: 'track' | 'loop';
  qualityScore?: number;
  culturalScore?: number;
}

export default function FeedbackCollector({ 
  generationId, 
  generationType, 
  qualityScore, 
  culturalScore 
}: FeedbackCollectorProps) {
  const [rating, setRating] = useState<number | null>(null);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');
  const [culturalRating, setCulturalRating] = useState<'authentic' | 'good' | 'needs-work' | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const collectFeedbackMutation = useCollectFeedback();

  const handleSubmit = () => {
    if (!rating) return;

    collectFeedbackMutation.mutate({
      generationId,
      signalType: 'user_rating',
      signalValue: rating / 5,
      signalData: {
        feedback,
        culturalRating,
        generationType,
        qualityScore,
        culturalScore
      }
    });

    setSubmitted(true);
  };

  if (submitted) {
    return (
      <Card className="bg-green-500/10 border-green-500/30">
        <CardContent className="p-4 flex items-center gap-2">
          <ThumbsUp className="h-5 w-5 text-green-400" />
          <span className="text-green-400 font-medium">
            Thank you for your feedback! This helps improve the AI.
          </span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-purple-500/10 border-purple-500/30">
      <CardHeader>
        <CardTitle className="text-white text-sm">Rate This Generation</CardTitle>
        <CardDescription className="text-sm">
          Your feedback helps improve future generations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Star Rating */}
        <div>
          <div className="flex items-center gap-1 mb-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(null)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={`h-6 w-6 ${
                    star <= (hoveredRating || rating || 0)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-500'
                  }`}
                />
              </button>
            ))}
          </div>
          {rating && (
            <p className="text-sm text-white/70">
              {rating === 5 && "Excellent! Perfect generation"}
              {rating === 4 && "Great! Very good quality"}
              {rating === 3 && "Good, but could be better"}
              {rating === 2 && "Fair, needs improvement"}
              {rating === 1 && "Poor quality"}
            </p>
          )}
        </div>

        {/* Cultural Authenticity Rating */}
        <div>
          <p className="text-sm text-white/90 mb-2">Cultural Authenticity:</p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={culturalRating === 'authentic' ? 'default' : 'outline'}
              onClick={() => setCulturalRating('authentic')}
              className={culturalRating === 'authentic' ? 'bg-green-600' : 'border-white/20 text-white'}
            >
              Authentic
            </Button>
            <Button
              size="sm"
              variant={culturalRating === 'good' ? 'default' : 'outline'}
              onClick={() => setCulturalRating('good')}
              className={culturalRating === 'good' ? 'bg-yellow-600' : 'border-white/20 text-white'}
            >
              Good
            </Button>
            <Button
              size="sm"
              variant={culturalRating === 'needs-work' ? 'default' : 'outline'}
              onClick={() => setCulturalRating('needs-work')}
              className={culturalRating === 'needs-work' ? 'bg-orange-600' : 'border-white/20 text-white'}
            >
              Needs Work
            </Button>
          </div>
        </div>

        {/* Optional Feedback */}
        <div>
          <Label className="text-white/90 text-sm mb-2">Additional Feedback (Optional)</Label>
          <Textarea
            placeholder="What did you like or what could be improved?"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            className="bg-white/10 border-white/20 text-white resize-none"
            rows={3}
          />
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={!rating || collectFeedbackMutation.isPending}
          className="w-full bg-purple-600 hover:bg-purple-700"
        >
          {collectFeedbackMutation.isPending ? (
            'Submitting...'
          ) : (
            <>
              <ThumbsUp className="h-4 w-4 mr-2" />
              Submit Feedback
            </>
          )}
        </Button>

        {/* Quality Indicators */}
        {(qualityScore || culturalScore) && (
          <div className="flex gap-2 pt-2 border-t border-white/10">
            {qualityScore && (
              <Badge variant="outline" className="text-xs">
                Quality: {(qualityScore * 100).toFixed(0)}%
              </Badge>
            )}
            {culturalScore && (
              <Badge variant="outline" className="text-xs">
                Cultural: {(culturalScore * 100).toFixed(0)}%
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
