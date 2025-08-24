import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Radio, Search, Library, Layers, Music, Sparkles, SlidersHorizontal } from 'lucide-react';

export default function HomePage() {
  const features = [
    {
      icon: SlidersHorizontal,
      title: 'Professional Amapiano DAW',
      description: 'A full-featured Digital Audio Workstation designed specifically for amapiano production.',
      link: '/daw',
      color: 'text-orange-400'
    },
    {
      icon: Radio,
      title: 'AI Music Generation',
      description: 'Generate authentic amapiano and private school amapiano tracks from text prompts.',
      link: '/generate',
      color: 'text-yellow-400'
    },
    {
      icon: Search,
      title: 'Audio Analysis',
      description: 'Analyze YouTube videos and audio files to extract stems and patterns.',
      link: '/analyze',
      color: 'text-blue-400'
    },
    {
      icon: Library,
      title: 'Sample Library',
      description: 'Browse curated samples from Kabza De Small, Kelvin Momo, and more.',
      link: '/samples',
      color: 'text-green-400'
    },
    {
      icon: Layers,
      title: 'Pattern Library',
      description: 'Explore chord progressions, drum patterns, and musical structures.',
      link: '/patterns',
      color: 'text-purple-400'
    }
  ];

  const genres = [
    {
      name: 'Classic Amapiano',
      description: 'Traditional amapiano with signature log drums and soulful piano melodies',
      artists: ['Kabza De Small', 'DJ Maphorisa', 'Focalistic'],
      characteristics: ['Log drum basslines', 'Soulful piano', 'Percussive elements', 'Kwaito influences']
    },
    {
      name: 'Private School Amapiano',
      description: 'Sophisticated, jazz-influenced amapiano with live instrumentation',
      artists: ['Kelvin Momo', 'Babalwa M', 'Mellow & Sleazy'],
      characteristics: ['Jazz harmonies', 'Live instruments', 'Complex chords', 'Refined sound']
    }
  ];

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="text-center space-y-6">
        <div className="flex items-center justify-center space-x-3">
          <Music className="h-12 w-12 text-yellow-400" />
          <h1 className="text-5xl font-bold text-white">Amapiano AI</h1>
          <Sparkles className="h-12 w-12 text-yellow-400" />
        </div>
        <p className="text-xl text-white/80 max-w-3xl mx-auto">
          The ultimate AI-powered platform for creating, analyzing, and producing amapiano music. 
          From idea to finished track, all in one place.
        </p>
        <div className="flex items-center justify-center space-x-4">
          <Link to="/daw">
            <Button size="lg" className="bg-yellow-400 hover:bg-yellow-500 text-black">
              Open DAW
            </Button>
          </Link>
          <Link to="/generate">
            <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10">
              Generate with AI
            </Button>
          </Link>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {features.map((feature, index) => (
          <Link key={index} to={feature.link}>
            <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors cursor-pointer h-full flex flex-col">
              <CardHeader className="text-center">
                <feature.icon className={`h-12 w-12 mx-auto ${feature.color}`} />
                <CardTitle className="text-white mt-4">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex-grow">
                <CardDescription className="text-white/70 text-center">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Genre Information */}
      <div className="space-y-8">
        <h2 className="text-3xl font-bold text-white text-center">Amapiano Genres</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {genres.map((genre, index) => (
            <Card key={index} className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-xl">{genre.name}</CardTitle>
                <CardDescription className="text-white/70">
                  {genre.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-white font-semibold mb-2">Key Artists:</h4>
                  <div className="flex flex-wrap gap-2">
                    {genre.artists.map((artist, i) => (
                      <span key={i} className="bg-yellow-400/20 text-yellow-400 px-2 py-1 rounded text-sm">
                        {artist}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-2">Characteristics:</h4>
                  <ul className="text-white/70 text-sm space-y-1">
                    {genre.characteristics.map((char, i) => (
                      <li key={i} className="flex items-center space-x-2">
                        <span className="w-1 h-1 bg-yellow-400 rounded-full"></span>
                        <span>{char}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Call to Action */}
      <div className="text-center space-y-4 bg-gradient-to-r from-yellow-400/10 to-orange-400/10 rounded-lg p-8">
        <h3 className="text-2xl font-bold text-white">Ready to Create Your Amapiano Masterpiece?</h3>
        <p className="text-white/80">
          Join thousands of producers and musicians using Amapiano AI to create authentic South African music.
        </p>
        <Link to="/daw">
          <Button size="lg" className="bg-yellow-400 hover:bg-yellow-500 text-black">
            Start Producing in the DAW
          </Button>
        </Link>
      </div>
    </div>
  );
}
