import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Music, Disc, TrendingUp, Calendar, Award } from 'lucide-react';
import type { KwaitoFeatures } from '~backend/music/essentia-api';

interface KwaitoAnalysisProps {
  kwaitoFeatures: KwaitoFeatures;
}

export default function KwaitoAnalysis({ kwaitoFeatures }: KwaitoAnalysisProps) {
  const influencePercent = Math.round(kwaitoFeatures.kwaitoInfluence * 100);
  const hasSignificantInfluence = kwaitoFeatures.kwaitoInfluence > 0.5;

  const getInfluenceColor = (influence: number) => {
    if (influence < 0.3) return 'text-gray-400';
    if (influence < 0.6) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getEraInfo = (era: string) => {
    const eraMap: Record<string, { label: string; years: string; color: string }> = {
      classic_90s: { label: 'Classic 90s', years: '1994-1999', color: 'bg-purple-500' },
      early_2000s: { label: 'Early 2000s', years: '2000-2005', color: 'bg-blue-500' },
      modern_revival: { label: 'Modern Revival', years: '2015-Present', color: 'bg-green-500' },
      kwaito_house: { label: 'Kwaito House', years: '2008-2015', color: 'bg-yellow-500' },
      not_kwaito: { label: 'No Kwaito Influence', years: 'N/A', color: 'bg-gray-500' }
    };
    return eraMap[era] || eraMap.not_kwaito;
  };

  const eraInfo = kwaitoFeatures.era ? getEraInfo(kwaitoFeatures.era.era) : null;

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="text-white flex items-center">
          <Disc className="h-5 w-5 mr-2 text-purple-400" />
          Kwaito Influence Detection
        </CardTitle>
        <CardDescription className="text-white/70">
          Analysis of Kwaito (amapiano predecessor genre) influence and characteristics
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Influence Score */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-white font-medium">Overall Kwaito Influence</h4>
            <Badge className={`${hasSignificantInfluence ? 'bg-green-500' : 'bg-gray-500'}`}>
              {influencePercent}%
            </Badge>
          </div>
          <Progress value={influencePercent} className="h-3" />
          <p className="text-white/60 text-sm mt-2">
            {influencePercent < 30 && 'Minimal Kwaito influence detected'}
            {influencePercent >= 30 && influencePercent < 60 && 'Moderate Kwaito influence present'}
            {influencePercent >= 60 && 'Strong Kwaito influence detected'}
          </p>
        </div>

        <Separator className="bg-white/10" />

        {/* Era Classification */}
        {eraInfo && (
          <div>
            <h4 className="text-white font-medium mb-3 flex items-center">
              <Calendar className="h-4 w-4 mr-2" />
              Era Classification
            </h4>
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <div>
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${eraInfo.color}`} />
                  <span className="text-white font-medium">{eraInfo.label}</span>
                </div>
                <p className="text-white/60 text-sm mt-1">{eraInfo.years}</p>
              </div>
              {kwaitoFeatures.era && (
                <Badge variant="outline" className="border-white/20 text-white/70">
                  {Math.round(kwaitoFeatures.era.confidence * 100)}% confidence
                </Badge>
              )}
            </div>
          </div>
        )}

        <Separator className="bg-white/10" />

        {/* Tempo Characteristics */}
        {kwaitoFeatures.tempoCharacteristics && (
          <div>
            <h4 className="text-white font-medium mb-3 flex items-center">
              <TrendingUp className="h-4 w-4 mr-2" />
              Tempo Characteristics
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-white/5 rounded-lg">
                <div className="text-white/60 text-xs mb-1">Kwaito BPM Range</div>
                <div className={`text-lg font-bold ${getInfluenceColor(kwaitoFeatures.tempoCharacteristics.kwaitoBpmAlignment)}`}>
                  {Math.round(kwaitoFeatures.tempoCharacteristics.kwaitoBpmAlignment * 100)}%
                </div>
                <div className="text-white/50 text-xs mt-1">88-115 BPM alignment</div>
              </div>
              <div className="p-3 bg-white/5 rounded-lg">
                <div className="text-white/60 text-xs mb-1">Groove Pattern</div>
                <div className={`text-lg font-bold ${getInfluenceColor(kwaitoFeatures.tempoCharacteristics.groovePattern)}`}>
                  {Math.round(kwaitoFeatures.tempoCharacteristics.groovePattern * 100)}%
                </div>
                <div className="text-white/50 text-xs mt-1">Kwaito groove match</div>
              </div>
            </div>
          </div>
        )}

        <Separator className="bg-white/10" />

        {/* Bassline Characteristics */}
        {kwaitoFeatures.basslineCharacteristics && (
          <div>
            <h4 className="text-white font-medium mb-3 flex items-center">
              <Music className="h-4 w-4 mr-2" />
              Bassline Characteristics
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-white/70 text-sm">Deep Bass Presence</span>
                <div className="flex items-center space-x-2">
                  <Progress 
                    value={kwaitoFeatures.basslineCharacteristics.deepBassPresence * 100} 
                    className="w-32 h-2" 
                  />
                  <span className={`text-sm ${getInfluenceColor(kwaitoFeatures.basslineCharacteristics.deepBassPresence)}`}>
                    {Math.round(kwaitoFeatures.basslineCharacteristics.deepBassPresence * 100)}%
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/70 text-sm">Repetitive Patterns</span>
                <div className="flex items-center space-x-2">
                  <Progress 
                    value={kwaitoFeatures.basslineCharacteristics.repetitivePatterns * 100} 
                    className="w-32 h-2" 
                  />
                  <span className={`text-sm ${getInfluenceColor(kwaitoFeatures.basslineCharacteristics.repetitivePatterns)}`}>
                    {Math.round(kwaitoFeatures.basslineCharacteristics.repetitivePatterns * 100)}%
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/70 text-sm">Synth Bass Character</span>
                <div className="flex items-center space-x-2">
                  <Progress 
                    value={kwaitoFeatures.basslineCharacteristics.synthBassCharacter * 100} 
                    className="w-32 h-2" 
                  />
                  <span className={`text-sm ${getInfluenceColor(kwaitoFeatures.basslineCharacteristics.synthBassCharacter)}`}>
                    {Math.round(kwaitoFeatures.basslineCharacteristics.synthBassCharacter * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <Separator className="bg-white/10" />

        {/* Production Style */}
        {kwaitoFeatures.productionStyle && (
          <div>
            <h4 className="text-white font-medium mb-3 flex items-center">
              <Award className="h-4 w-4 mr-2" />
              Production Style
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-white/5 rounded-lg">
                <div className="text-white/60 text-xs mb-1">Loop-Based Structure</div>
                <div className={`text-lg font-bold ${getInfluenceColor(kwaitoFeatures.productionStyle.loopBased)}`}>
                  {Math.round(kwaitoFeatures.productionStyle.loopBased * 100)}%
                </div>
              </div>
              <div className="p-3 bg-white/5 rounded-lg">
                <div className="text-white/60 text-xs mb-1">Minimalist Approach</div>
                <div className={`text-lg font-bold ${getInfluenceColor(kwaitoFeatures.productionStyle.minimalist)}`}>
                  {Math.round(kwaitoFeatures.productionStyle.minimalist * 100)}%
                </div>
              </div>
              <div className="p-3 bg-white/5 rounded-lg">
                <div className="text-white/60 text-xs mb-1">Vintage Quality</div>
                <div className={`text-lg font-bold ${getInfluenceColor(kwaitoFeatures.productionStyle.vintageQuality)}`}>
                  {Math.round(kwaitoFeatures.productionStyle.vintageQuality * 100)}%
                </div>
              </div>
              <div className="p-3 bg-white/5 rounded-lg">
                <div className="text-white/60 text-xs mb-1">Sample-Heavy</div>
                <div className={`text-lg font-bold ${getInfluenceColor(kwaitoFeatures.productionStyle.sampleHeavy)}`}>
                  {Math.round(kwaitoFeatures.productionStyle.sampleHeavy * 100)}%
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cultural Context */}
        {hasSignificantInfluence && (
          <Card className="bg-blue-400/10 border-blue-400/20 mt-4">
            <CardContent className="p-4">
              <div className="flex items-start space-x-2">
                <Award className="h-5 w-5 text-blue-400 mt-0.5" />
                <div className="text-blue-300 text-sm">
                  <div className="font-medium mb-1">Cultural Context</div>
                  <div className="text-blue-200">
                    This track shows significant influence from Kwaito, the pioneering South African electronic 
                    music genre that emerged in Soweto in the early 1990s. Kwaito laid the foundation for modern 
                    Amapiano, introducing the slower tempo (88-115 BPM), deep bass lines, and loop-based production 
                    style that characterize the genre.
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
