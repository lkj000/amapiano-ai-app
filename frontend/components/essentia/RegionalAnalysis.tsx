import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { MapPin, Music, TrendingUp, Award, Info } from 'lucide-react';
import type { RegionalCharacteristics, SubGenreClassification } from '~backend/music/essentia-api';

interface RegionalAnalysisProps {
  regional: RegionalCharacteristics;
  subGenre: SubGenreClassification;
}

export default function RegionalAnalysis({ regional, subGenre }: RegionalAnalysisProps) {
  const confidencePercent = Math.round(regional.confidence * 100);

  const regionInfo: Record<string, { fullName: string; description: string; color: string }> = {
    gauteng: {
      fullName: 'Gauteng',
      description: 'Johannesburg & Pretoria - Urban, fast-paced, commercial amapiano (112-118 BPM)',
      color: 'bg-yellow-500'
    },
    western_cape: {
      fullName: 'Western Cape',
      description: 'Cape Town - Uptempo, energetic, club-focused (115-122 BPM)',
      color: 'bg-blue-500'
    },
    kwazulu_natal: {
      fullName: 'KwaZulu-Natal',
      description: 'Durban - Gqom-influenced, darker basslines (110-116 BPM)',
      color: 'bg-green-500'
    },
    limpopo: {
      fullName: 'Limpopo',
      description: 'Traditional influence, slower tempo, rural roots (105-115 BPM)',
      color: 'bg-purple-500'
    },
    mpumalanga: {
      fullName: 'Mpumalanga',
      description: 'Soulful, melodic emphasis, mid-tempo (108-116 BPM)',
      color: 'bg-pink-500'
    },
    eastern_cape: {
      fullName: 'Eastern Cape',
      description: 'Vocal-driven, storytelling focus, traditional elements (107-115 BPM)',
      color: 'bg-orange-500'
    },
    northern_cape: {
      fullName: 'Northern Cape',
      description: 'Sparse, minimalist production, experimental sounds (105-118 BPM)',
      color: 'bg-red-500'
    },
    free_state: {
      fullName: 'Free State',
      description: 'Gospel-influenced, uplifting harmonies (108-116 BPM)',
      color: 'bg-cyan-500'
    },
    north_west: {
      fullName: 'North West',
      description: 'Balanced traditional-modern fusion (108-118 BPM)',
      color: 'bg-indigo-500'
    },
    unknown: {
      fullName: 'Unknown Region',
      description: 'Mixed influences from multiple regions',
      color: 'bg-gray-500'
    }
  };

  const info = regionInfo[regional.region] || regionInfo.unknown;

  const subGenreInfo: Record<string, { description: string; characteristics: string[] }> = {
    classic_amapiano: {
      description: 'Traditional amapiano with signature log drums and piano',
      characteristics: ['Log drum patterns', 'Soulful piano', 'Mid-tempo groove', 'Vocal loops']
    },
    private_school: {
      description: 'Jazz-influenced, sophisticated harmonies',
      characteristics: ['Complex jazz chords', 'Saxophone elements', 'Subtle percussion', 'Deep bass']
    },
    bacardi: {
      description: 'High-energy, uptempo, party-focused',
      characteristics: ['Fast BPM (118-125)', 'Energetic percussion', 'Vocal emphasis', 'Club-ready']
    },
    sgija: {
      description: 'Street amapiano, raw and energetic',
      characteristics: ['Aggressive drums', 'Street vocals', 'High energy', 'Urban influence']
    },
    soulful_amapiano: {
      description: 'Melodic, emotional, vocal-driven',
      characteristics: ['Emotional vocals', 'Melodic emphasis', 'Gospel influence', 'Harmonic richness']
    },
    tech_amapiano: {
      description: 'Electronic, experimental, tech house influence',
      characteristics: ['Electronic sounds', 'Tech house elements', 'Experimental', 'Modern production']
    },
    kwaito_amapiano: {
      description: 'Kwaito-influenced, heritage sound',
      characteristics: ['Kwaito basslines', 'Vintage quality', 'Slower tempo', 'Historical fusion']
    }
  };

  const subGenreDesc = subGenreInfo[subGenre.primaryGenre] || { description: '', characteristics: [] };

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="text-white flex items-center">
          <MapPin className="h-5 w-5 mr-2 text-green-400" />
          Regional Classification & Sub-Genre Analysis
        </CardTitle>
        <CardDescription className="text-white/70">
          South African regional variation and sub-genre identification
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Primary Region */}
        <div>
          <h4 className="text-white font-medium mb-3">Primary Region</h4>
          <div className="p-4 bg-white/5 rounded-lg border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className={`w-4 h-4 rounded-full ${info.color}`} />
                <div>
                  <div className="text-white font-semibold text-lg">{info.fullName}</div>
                  <p className="text-white/60 text-sm">{info.description}</p>
                </div>
              </div>
              <Badge className={`${confidencePercent >= 70 ? 'bg-green-500' : 'bg-yellow-500'}`}>
                {confidencePercent}% confidence
              </Badge>
            </div>
            <Progress value={confidencePercent} className="h-2" />
          </div>
        </div>

        <Separator className="bg-white/10" />

        {/* Regional Characteristics */}
        {regional.characteristics && (
          <div>
            <h4 className="text-white font-medium mb-3 flex items-center">
              <TrendingUp className="h-4 w-4 mr-2" />
              Regional Characteristics
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-white/5 rounded-lg">
                <div className="text-white/60 text-xs mb-1">Tempo Pattern</div>
                <div className="text-sm text-white font-medium">{regional.characteristics.tempo}</div>
              </div>
              <div className="p-3 bg-white/5 rounded-lg">
                <div className="text-white/60 text-xs mb-1">Harmonic Style</div>
                <div className="text-sm text-white font-medium">{regional.characteristics.harmonicStyle}</div>
              </div>
              <div className="p-3 bg-white/5 rounded-lg">
                <div className="text-white/60 text-xs mb-1">Production Approach</div>
                <div className="text-sm text-white font-medium">{regional.characteristics.productionStyle}</div>
              </div>
              <div className="p-3 bg-white/5 rounded-lg">
                <div className="text-white/60 text-xs mb-1">Cultural Influence</div>
                <div className="text-sm text-white font-medium">{regional.characteristics.culturalInfluence}</div>
              </div>
            </div>
          </div>
        )}

        <Separator className="bg-white/10" />

        {/* Cultural Markers */}
        {regional.culturalMarkers && regional.culturalMarkers.length > 0 && (
          <div>
            <h4 className="text-white font-medium mb-3 flex items-center">
              <Award className="h-4 w-4 mr-2" />
              Cultural Markers
            </h4>
            <div className="flex flex-wrap gap-2">
              {regional.culturalMarkers.map((marker, index) => (
                <Badge key={index} variant="outline" className="border-purple-400/30 text-purple-300">
                  {marker}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <Separator className="bg-white/10" />

        {/* Sub-Genre Classification */}
        <div>
          <h4 className="text-white font-medium mb-3 flex items-center">
            <Music className="h-4 w-4 mr-2" />
            Sub-Genre Classification
          </h4>
          <div className="space-y-3">
            <div className="p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-white font-semibold capitalize">
                    {subGenre.primaryGenre.replace(/_/g, ' ')}
                  </div>
                  <p className="text-white/60 text-sm">{subGenreDesc.description}</p>
                </div>
                <Badge variant="outline" className="border-blue-400/30 text-blue-300">
                  {Math.round(subGenre.confidence * 100)}%
                </Badge>
              </div>
              {subGenreDesc.characteristics.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {subGenreDesc.characteristics.map((char, index) => (
                    <Badge key={index} variant="secondary" className="bg-white/10 text-white/70 text-xs">
                      {char}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Secondary Genres */}
            {subGenre.secondaryGenres && subGenre.secondaryGenres.length > 0 && (
              <div>
                <div className="text-white/70 text-sm mb-2">Secondary Influences:</div>
                <div className="space-y-2">
                  {subGenre.secondaryGenres.map((secondary, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-white/5 rounded">
                      <span className="text-white/80 text-sm capitalize">
                        {secondary.genre.replace(/_/g, ' ')}
                      </span>
                      <div className="flex items-center space-x-2">
                        <Progress value={secondary.probability * 100} className="w-24 h-2" />
                        <span className="text-white/60 text-xs w-10 text-right">
                          {Math.round(secondary.probability * 100)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sub-Genre Characteristics */}
        {subGenre.characteristics && (
          <>
            <Separator className="bg-white/10" />
            <div>
              <h4 className="text-white font-medium mb-3">Sub-Genre Characteristics</h4>
              <div className="space-y-2">
                {Object.entries(subGenre.characteristics).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-white/70 text-sm capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={value * 100} className="w-32 h-2" />
                      <span className="text-white/60 text-sm w-12 text-right">
                        {Math.round(value * 100)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Educational Context */}
        <Card className="bg-blue-400/10 border-blue-400/20 mt-4">
          <CardContent className="p-4">
            <div className="flex items-start space-x-2">
              <Info className="h-5 w-5 text-blue-400 mt-0.5" />
              <div className="text-blue-300 text-sm">
                <div className="font-medium mb-1">Regional Context</div>
                <div className="text-blue-200">
                  South Africa's diverse provinces have each developed distinct amapiano styles influenced by 
                  local culture, traditional music, and urban dynamics. This classification helps understand 
                  the track's cultural and geographic musical heritage within the broader amapiano movement.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}
