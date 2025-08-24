import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause, Rewind, FastForward, Circle, Save, FolderOpen, Upload, Download, Settings, HelpCircle, Music, Mic, GitBranch, SlidersHorizontal, Waves, Volume2, Sparkles } from 'lucide-react';

const TrackHeader = ({ name, color, icon: Icon }: { name: string, color: string, icon: React.ElementType }) => (
  <div className="flex items-center space-x-2 p-2 bg-gray-700/50 rounded-t-lg border-b border-gray-600">
    <div className={`w-2 h-full ${color}`}></div>
    <Icon className="h-4 w-4 text-gray-300" />
    <span className="text-xs font-medium text-gray-200 flex-grow">{name}</span>
    <div className="flex items-center space-x-1 text-xs text-gray-400">
      <span>S</span>
      <span>M</span>
    </div>
  </div>
);

const Track = ({ name, color, icon, children }: { name: string, color: string, icon: React.ElementType, children: React.ReactNode }) => (
  <div>
    <TrackHeader name={name} color={color} icon={icon} />
    <div className="h-20 bg-gray-800/50 relative border-b border-gray-900/50">
      {children}
    </div>
  </div>
);

const MixerChannel = ({ name, color }: { name: string, color: string }) => (
  <div className="flex flex-col items-center p-2 bg-gray-800 rounded-lg space-y-2 border border-gray-700">
    <div className="w-full h-24 bg-gray-900 rounded relative">
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-16 bg-gradient-to-t from-green-500 to-yellow-500 rounded-full"></div>
    </div>
    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs text-gray-300">PAN</div>
    <div className="flex space-x-1">
      <button className="w-6 h-6 rounded bg-gray-700 text-xs text-gray-300">S</button>
      <button className="w-6 h-6 rounded bg-gray-700 text-xs text-red-500">M</button>
    </div>
    <div className={`text-xs font-semibold ${color}`}>{name}</div>
  </div>
);

export default function DawPage() {
  return (
    <div className="space-y-8 text-white">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-white flex items-center justify-center">
          <SlidersHorizontal className="h-10 w-10 mr-4 text-yellow-400" />
          Professional Amapiano DAW
        </h1>
        <p className="text-white/80 max-w-3xl mx-auto">
          The complete, professional-grade production environment specifically designed for Amapiano music. Arrange audio, MIDI, and loops on a multi-track timeline, and use the AI Assistant to spark your creativity.
        </p>
      </div>

      <Card className="bg-black/30 border-white/10">
        <CardContent className="p-4 space-y-4">
          {/* Transport Controls */}
          <div className="flex items-center justify-between p-2 bg-gray-900/50 rounded-lg border border-gray-700">
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="icon"><FolderOpen className="h-5 w-5" /></Button>
              <Button variant="ghost" size="icon"><Save className="h-5 w-5" /></Button>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="icon"><Rewind className="h-6 w-6" /></Button>
              <Button variant="ghost" size="icon" className="bg-green-500/20 text-green-400"><Play className="h-8 w-8" /></Button>
              <Button variant="ghost" size="icon"><Pause className="h-6 w-6" /></Button>
              <Button variant="ghost" size="icon"><FastForward className="h-6 w-6" /></Button>
              <Button variant="ghost" size="icon" className="bg-red-500/20 text-red-400"><Circle className="h-6 w-6" fill="currentColor" /></Button>
            </div>
            <div className="flex items-center space-x-4 text-sm">
              <div><span className="text-gray-400">BPM:</span> 114.00</div>
              <div><span className="text-gray-400">Key:</span> F#m</div>
              <div><span className="text-gray-400">Time:</span> 4/4</div>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-gray-900/50 rounded-lg border border-gray-700 p-2">
            <div className="h-8 bg-gray-800 rounded-t-lg flex items-center px-2 text-xs text-gray-400 border-b border-gray-700">
              <span>1</span><div className="flex-grow border-t border-dashed border-gray-600 mx-2"></div>
              <span>2</span><div className="flex-grow border-t border-dashed border-gray-600 mx-2"></div>
              <span>3</span><div className="flex-grow border-t border-dashed border-gray-600 mx-2"></div>
              <span>4</span><div className="flex-grow border-t border-dashed border-gray-600 mx-2"></div>
              <span>5</span>
            </div>
            <div className="space-y-1 mt-1">
              <Track name="Log Drum" color="bg-red-500" icon={Waves}>
                <div className="absolute top-4 left-8 w-48 h-12 bg-red-500/50 rounded-lg border-2 border-red-400 flex items-center justify-center text-xs">
                  Log Drum Pattern 1
                </div>
              </Track>
              <Track name="Piano Chords" color="bg-blue-500" icon={Music}>
                <div className="absolute top-4 left-2 w-64 h-12 bg-blue-500/50 rounded-lg border-2 border-blue-400 flex items-center justify-center text-xs">
                  Jazzy Chords (MIDI)
                </div>
              </Track>
              <Track name="Shakers" color="bg-green-500" icon={GitBranch}>
                <div className="absolute top-4 left-2 w-full h-12 bg-green-500/20 rounded-lg border-2 border-green-400/50 flex items-center justify-start px-2 text-xs">
                  <div className="w-full h-1 bg-green-400"></div>
                </div>
              </Track>
              <Track name="Saxophone" color="bg-yellow-500" icon={Mic}>
                <div className="absolute top-4 left-72 w-56 h-12 bg-yellow-500/50 rounded-lg border-2 border-yellow-400 flex items-center justify-center text-xs">
                  Sax Solo Take 2
                </div>
              </Track>
            </div>
          </div>

          {/* Mixer */}
          <div className="bg-gray-900/50 rounded-lg border border-gray-700 p-4">
            <h3 className="text-lg font-semibold mb-4 flex items-center"><Volume2 className="h-5 w-5 mr-2"/>Mixer</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <MixerChannel name="Log Drum" color="text-red-400" />
              <MixerChannel name="Piano" color="text-blue-400" />
              <MixerChannel name="Shakers" color="text-green-400" />
              <MixerChannel name="Sax" color="text-yellow-400" />
              <MixerChannel name="Reverb" color="text-gray-400" />
              <MixerChannel name="Master" color="text-white" />
            </div>
          </div>

          {/* AI Assistant Panel */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Sparkles className="h-5 w-5 mr-2 text-yellow-400" />
                AI Assistant
              </CardTitle>
              <CardDescription className="text-white/70">
                Generate musical ideas directly into your project.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="w-full justify-start border-white/20 text-white">Generate Log Drum Pattern...</Button>
              <Button variant="outline" className="w-full justify-start border-white/20 text-white">Suggest Chord Progression...</Button>
              <Button variant="outline" className="w-full justify-start border-white/20 text-white">Create Percussion Loop...</Button>
              <Button variant="outline" className="w-full justify-start border-white/20 text-white">Analyze and Suggest Mix Improvements...</Button>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}
