import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import backend from '~backend/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorMessage from '@/components/ErrorMessage';
import {
  Activity,
  BarChart3,
  Brain,
  Cpu,
  Database,
  Gauge,
  GitBranch,
  LineChart,
  Network,
  TrendingUp,
  Zap
} from 'lucide-react';

export default function ResearchDashboardPage() {
  const [timePeriod, setTimePeriod] = useState<7 | 30 | 90>(30);

  const { data: dashboard, isLoading: dashboardLoading, error: dashboardError } = useQuery({
    queryKey: ['researchDashboard'],
    queryFn: () => backend.music.getResearchDashboard()
  });

  const { data: timeSeries, isLoading: timeSeriesLoading } = useQuery({
    queryKey: ['researchTimeSeries', timePeriod],
    queryFn: () => backend.music.getResearchTimeSeries({ days: timePeriod })
  });

  const { data: learningStats } = useQuery({
    queryKey: ['learningStats'],
    queryFn: () => backend.music.getLearningStatistics()
  });

  const { data: recommenderStats } = useQuery({
    queryKey: ['recommenderStats'],
    queryFn: () => backend.music.getRecommenderStatistics()
  });

  if (dashboardLoading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <LoadingSpinner />
      </div>
    );
  }

  if (dashboardError) {
    return <ErrorMessage error={dashboardError} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Research Dashboard</h1>
          <p className="text-gray-400">Doctoral Thesis Research Infrastructure</p>
        </div>
        <div className="flex gap-2">
          <Button variant={timePeriod === 7 ? 'default' : 'outline'} onClick={() => setTimePeriod(7)}>
            7 Days
          </Button>
          <Button variant={timePeriod === 30 ? 'default' : 'outline'} onClick={() => setTimePeriod(30)}>
            30 Days
          </Button>
          <Button variant={timePeriod === 90 ? 'default' : 'outline'} onClick={() => setTimePeriod(90)}>
            90 Days
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">
              Total Experiments
            </CardTitle>
            <Activity className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {dashboard?.overview.totalExperiments || 0}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {dashboard?.overview.activeExperiments || 0} active
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">
              Average Latency
            </CardTitle>
            <Gauge className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {dashboard?.performance.averageLatency.toFixed(0)}ms
            </div>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3 text-green-400" />
              <p className="text-xs text-green-400">
                {dashboard?.performance.latencyReduction.toFixed(1)}% reduction
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">
              Cultural Authenticity
            </CardTitle>
            <Brain className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {(dashboard?.cultural.averageAuthenticity * 100 || 0).toFixed(1)}%
            </div>
            <Progress 
              value={dashboard?.cultural.averageAuthenticity * 100 || 0} 
              className="mt-2 h-2"
            />
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">
              Overall Quality
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {(dashboard?.quality.averageOverallScore * 100 || 0).toFixed(1)}%
            </div>
            <Progress 
              value={dashboard?.quality.averageOverallScore * 100 || 0} 
              className="mt-2 h-2"
            />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-gray-800">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="caq">CAQ Framework</TabsTrigger>
          <TabsTrigger value="distrigen">DistriGen</TabsTrigger>
          <TabsTrigger value="learning">Continuous Learning</TabsTrigger>
          <TabsTrigger value="patterns">Pattern Recommender</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Performance Metrics</CardTitle>
                <CardDescription>System performance overview</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Average Throughput</span>
                  <Badge>{dashboard?.performance.averageThroughput.toFixed(1)} tracks/hr</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Memory Usage</span>
                  <Badge variant="outline">{dashboard?.performance.averageMemoryUsage.toFixed(0)} MB</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">CPU Usage</span>
                  <Progress value={dashboard?.performance.averageCpuUsage * 100 || 0} className="w-32" />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">GPU Utilization</span>
                  <Progress value={dashboard?.performance.averageGpuUtilization * 100 || 0} className="w-32" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Cultural Metrics</CardTitle>
                <CardDescription>Cultural authenticity tracking</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Average Authenticity</span>
                  <Badge className="bg-purple-600">
                    {(dashboard?.cultural.averageAuthenticity * 100 || 0).toFixed(1)}%
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Expert Panel Size</span>
                  <Badge variant="outline">{dashboard?.cultural.expertPanelSize || 0} experts</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Elements Preserved</span>
                  <span className="text-white">
                    {dashboard?.cultural.culturalElementsPreserved}/{dashboard?.cultural.culturalElementsDetected}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Preservation Rate</span>
                  <Progress 
                    value={(dashboard?.cultural.culturalElementsPreserved / dashboard?.cultural.culturalElementsDetected * 100) || 0} 
                    className="w-32" 
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <LineChart className="h-5 w-5" />
                Top Performing Experiments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboard?.topExperiments.slice(0, 5).map((exp, idx) => (
                  <div key={exp.experimentId} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge className="bg-blue-600">#{idx + 1}</Badge>
                      <div>
                        <p className="text-white font-medium">{exp.experimentName}</p>
                        <p className="text-xs text-gray-400">{exp.experimentId}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-bold">{(exp.overallScore * 100).toFixed(1)}%</p>
                      <p className="text-xs text-gray-400">Overall Score</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="caq" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Cpu className="h-5 w-5 text-blue-400" />
                  Compression
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">
                  {dashboard?.caq.averageCompression.toFixed(1)}×
                </div>
                <p className="text-sm text-gray-400 mt-2">
                  {dashboard?.caq.efficiencyGain.toFixed(1)}% efficiency gain vs naive
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Brain className="h-5 w-5 text-purple-400" />
                  Cultural Preservation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">
                  {(dashboard?.caq.culturalPreservation * 100 || 0).toFixed(1)}%
                </div>
                <Progress 
                  value={dashboard?.caq.culturalPreservation * 100 || 0} 
                  className="mt-3 h-2"
                />
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Gauge className="h-5 w-5 text-green-400" />
                  Processing Speed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">
                  {dashboard?.caq.averageProcessingTime.toFixed(0)}ms
                </div>
                <p className="text-sm text-gray-400 mt-2">
                  Per quantization operation
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="distrigen" className="space-y-4">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Network className="h-5 w-5 text-blue-400" />
                Distributed Generation System
              </CardTitle>
              <CardDescription>Multi-GPU parallelization performance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm text-gray-400">Expected Parallelization Gain</p>
                  <div className="text-2xl font-bold text-white">4.2×</div>
                  <p className="text-xs text-gray-400">On 8-GPU configuration</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-gray-400">Latency Reduction</p>
                  <div className="text-2xl font-bold text-white">76%</div>
                  <p className="text-xs text-gray-400">vs single-GPU baseline</p>
                </div>
              </div>
              <div className="p-4 bg-gray-700/50 rounded-lg">
                <p className="text-sm text-gray-300 mb-2">Stem-Aware Work Distribution:</p>
                <div className="space-y-1 text-xs text-gray-400">
                  <div className="flex justify-between">
                    <span>• Log Drums → GPU 0</span>
                    <Badge variant="outline">Priority: High</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>• Piano → GPU 1</span>
                    <Badge variant="outline">Priority: High</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>• Bass → GPU 2</span>
                    <Badge variant="outline">Priority: Medium</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>• Vocals → GPU 3</span>
                    <Badge variant="outline">Priority: Low</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="learning" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Database className="h-5 w-5 text-green-400" />
                  Learning Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Total Examples</span>
                  <Badge>{learningStats?.totalLearningExamples || 0}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Expert Validated</span>
                  <Badge variant="outline">{learningStats?.expertValidatedExamples || 0}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Adaptation Sessions</span>
                  <Badge className="bg-purple-600">{learningStats?.successfulAdaptations || 0}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <GitBranch className="h-5 w-5 text-yellow-400" />
                  Recent Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300">Last 24 Hours</span>
                    <span className="text-white">{learningStats?.recentPerformance.last24Hours.count || 0} examples</span>
                  </div>
                  <Progress value={(learningStats?.recentPerformance.last24Hours.avgQuality || 0) * 100} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300">Last 7 Days</span>
                    <span className="text-white">{learningStats?.recentPerformance.last7Days.count || 0} examples</span>
                  </div>
                  <Progress value={(learningStats?.recentPerformance.last7Days.avgQuality || 0) * 100} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300">Last 30 Days</span>
                    <span className="text-white">{learningStats?.recentPerformance.last30Days.count || 0} examples</span>
                  </div>
                  <Progress value={(learningStats?.recentPerformance.last30Days.avgQuality || 0) * 100} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-400" />
                Pattern Recommender Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-400">Total Patterns Tracked</p>
                  <div className="text-2xl font-bold text-white mt-1">
                    {recommenderStats?.totalPatternsTracked || 0}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Usage Events</p>
                  <div className="text-2xl font-bold text-white mt-1">
                    {recommenderStats?.totalUsageEvents || 0}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Success Rate</p>
                  <div className="text-2xl font-bold text-white mt-1">
                    {((recommenderStats?.averageSuccessRate || 0) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-700">
                <p className="text-sm font-medium text-gray-300 mb-3">Top Patterns</p>
                <div className="space-y-2">
                  {recommenderStats?.topPatterns.slice(0, 5).map((pattern, idx) => (
                    <div key={pattern.patternId} className="flex items-center justify-between p-2 bg-gray-700/30 rounded">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-blue-600">#{idx + 1}</Badge>
                        <span className="text-white text-sm">Pattern {pattern.patternId}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400">{pattern.usage} uses</span>
                        <Badge variant="outline">{(pattern.successRate * 100).toFixed(0)}%</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
