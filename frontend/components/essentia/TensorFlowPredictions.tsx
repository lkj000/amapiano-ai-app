import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Brain, Cpu, Zap, Award, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import backend from '~backend/client';
import type { ModelPrediction } from '~backend/music/essentia-api';

interface TensorFlowPredictionsProps {
  audioUrl?: string;
}

export default function TensorFlowPredictions({ audioUrl }: TensorFlowPredictionsProps) {
  const [selectedModel, setSelectedModel] = useState<string>('genre_classifier');
  const [prediction, setPrediction] = useState<ModelPrediction | null>(null);
  const [modelMetadata, setModelMetadata] = useState<any>(null);

  const { data: modelsData, isLoading: modelsLoading } = useQuery({
    queryKey: ['tensorflowModels'],
    queryFn: () => backend.music.listAvailableModels()
  });

  const predictMutation = useMutation({
    mutationFn: (modelName: string) => backend.music.predictWithModel({ modelName, audioUrl }),
    onSuccess: (data) => {
      setPrediction(data.prediction);
      setModelMetadata(data.modelMetadata);
      toast.success(`Prediction complete: ${data.prediction.label} (${Math.round(data.prediction.confidence * 100)}% confidence)`);
    },
    onError: (error: any) => {
      console.error('Prediction error:', error);
      toast.error('Prediction Failed', { description: error.message });
    }
  });

  const handlePredict = () => {
    if (!selectedModel) {
      toast.error('Please select a model');
      return;
    }
    if (!audioUrl) {
      toast.error('No audio provided');
      return;
    }
    predictMutation.mutate(selectedModel);
  };

  const selectedModelInfo = modelsData?.models.find(m => m.name === selectedModel);

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="text-white flex items-center">
          <Brain className="h-5 w-5 mr-2 text-blue-400" />
          TensorFlow Model Predictions
        </CardTitle>
        <CardDescription className="text-white/70">
          AI-powered classification using pre-trained TensorFlow models
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Model Selection */}
        <div>
          <h4 className="text-white font-medium mb-3">Select Model</h4>
          {modelsLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-white/60" />
            </div>
          ) : (
            <div className="space-y-3">
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {modelsData?.models.map((model) => (
                    <SelectItem key={model.name} value={model.name}>
                      {model.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedModelInfo && (
                <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium">{selectedModelInfo.displayName}</span>
                    <Badge className="bg-green-500">
                      {Math.round(selectedModelInfo.accuracy * 100)}% accuracy
                    </Badge>
                  </div>
                  <p className="text-white/60 text-sm mb-2">{selectedModelInfo.description}</p>
                  <div className="flex items-center space-x-4 text-xs text-white/50">
                    <span>Version: {selectedModelInfo.version}</span>
                    <span>•</span>
                    <span>Input: {selectedModelInfo.inputShape.join('×')}</span>
                    <span>•</span>
                    <span>Output: {selectedModelInfo.outputShape.join('×')}</span>
                  </div>
                </div>
              )}

              <Button
                onClick={handlePredict}
                disabled={predictMutation.isPending || !audioUrl}
                className="w-full bg-blue-500 hover:bg-blue-600"
              >
                {predictMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Running Prediction...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Run Prediction
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Prediction Results */}
        {prediction && modelMetadata && (
          <>
            <Separator className="bg-white/10" />
            <div>
              <h4 className="text-white font-medium mb-3 flex items-center">
                <Award className="h-4 w-4 mr-2" />
                Prediction Results
              </h4>

              <div className="p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-400/20 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-white/60 text-xs mb-1">Predicted Label</div>
                    <div className="text-white font-bold text-xl capitalize">
                      {prediction.label.replace(/_/g, ' ')}
                    </div>
                  </div>
                  <Badge className={`${prediction.confidence >= 0.8 ? 'bg-green-500' : prediction.confidence >= 0.6 ? 'bg-yellow-500' : 'bg-orange-500'}`}>
                    {Math.round(prediction.confidence * 100)}% confident
                  </Badge>
                </div>
                <Progress value={prediction.confidence * 100} className="h-2" />
              </div>

              {/* All Class Probabilities */}
              {prediction.probabilities && prediction.probabilities.length > 0 && (
                <div>
                  <div className="text-white/70 text-sm mb-3">All Class Probabilities:</div>
                  <div className="space-y-2">
                    {prediction.probabilities
                      .sort((a, b) => b.probability - a.probability)
                      .map((prob, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-white/5 rounded">
                          <div className="flex items-center space-x-2">
                            {index === 0 && <Award className="h-3 w-3 text-yellow-400" />}
                            <span className={`text-sm capitalize ${index === 0 ? 'text-white font-medium' : 'text-white/70'}`}>
                              {prob.label.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Progress value={prob.probability * 100} className="w-32 h-2" />
                            <span className="text-white/60 text-sm w-12 text-right">
                              {Math.round(prob.probability * 100)}%
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>

            <Separator className="bg-white/10" />

            {/* Model Metadata */}
            <div>
              <h4 className="text-white font-medium mb-3 flex items-center">
                <Cpu className="h-4 w-4 mr-2" />
                Model Information
              </h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 bg-white/5 rounded-lg">
                  <div className="text-white/60 text-xs mb-1">Model Name</div>
                  <div className="text-white text-sm font-medium">{modelMetadata.name}</div>
                </div>
                <div className="p-3 bg-white/5 rounded-lg">
                  <div className="text-white/60 text-xs mb-1">Accuracy</div>
                  <div className="text-green-400 text-sm font-medium">
                    {Math.round(modelMetadata.accuracy * 100)}%
                  </div>
                </div>
                <div className="p-3 bg-white/5 rounded-lg">
                  <div className="text-white/60 text-xs mb-1">Version</div>
                  <div className="text-white text-sm font-medium">{modelMetadata.version}</div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Available Models Info */}
        {!prediction && !modelsLoading && modelsData && (
          <Card className="bg-blue-400/10 border-blue-400/20">
            <CardContent className="p-4">
              <div className="flex items-start space-x-2">
                <Brain className="h-5 w-5 text-blue-400 mt-0.5" />
                <div className="text-blue-300 text-sm">
                  <div className="font-medium mb-1">Pre-Trained Models Available</div>
                  <div className="text-blue-200">
                    {modelsData.models.length} professional-grade TensorFlow models are available for 
                    audio classification. These models have been trained on thousands of tracks and 
                    provide accurate predictions for genre classification, cultural authenticity, 
                    log drum detection, and regional classification.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}
