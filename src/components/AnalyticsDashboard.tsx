
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSavedReports, SavedReport } from '@/utils/reportService';
import { getProjects, getAllQueries } from '@/utils/projectService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, CheckCircle, Info, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

interface AnalyticsSummary {
  totalReports: number;
  totalProjects: number;
  totalQueries: number;
  avgScore: number;
  bestPracticesAvg: number;
  performanceAvg: number;
  modularizationAvg: number;
  costAvg: number;
  platformDistribution: {name: string, value: number}[];
  scoreDistribution: {name: string, value: number}[];
  issuesByCategory: {name: string, value: number}[];
  scoreOverTime: {date: string, score: number}[];
}

const AnalyticsDashboard = () => {
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const calculateAnalytics = () => {
      setIsLoading(true);
      const reports = getSavedReports();
      const projects = getProjects();
      const queries = getAllQueries();
      
      if (reports.length === 0) {
        setAnalytics({
          totalReports: 0,
          totalProjects: projects.length,
          totalQueries: queries.length,
          avgScore: 0,
          bestPracticesAvg: 0,
          performanceAvg: 0,
          modularizationAvg: 0,
          costAvg: 0,
          platformDistribution: [],
          scoreDistribution: [],
          issuesByCategory: [],
          scoreOverTime: []
        });
        setIsLoading(false);
        return;
      }
      
      // Calculate averages
      const scores = reports.map(r => r.result.summary.score);
      const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      
      const bestPracticesScores = reports.map(r => r.result.summary.bestPracticesScore);
      const bestPracticesAvg = bestPracticesScores.reduce((sum, score) => sum + score, 0) / bestPracticesScores.length;
      
      const performanceScores = reports.map(r => r.result.summary.performanceScore);
      const performanceAvg = performanceScores.reduce((sum, score) => sum + score, 0) / performanceScores.length;
      
      const modularizationScores = reports.map(r => r.result.summary.modularizationScore);
      const modularizationAvg = modularizationScores.reduce((sum, score) => sum + score, 0) / modularizationScores.length;
      
      const costScores = reports.map(r => r.result.summary.costScore);
      const costAvg = costScores.reduce((sum, score) => sum + score, 0) / costScores.length;
      
      // Platform distribution
      const platforms = reports.map(r => r.platform);
      const platformCounts: Record<string, number> = {};
      platforms.forEach(platform => {
        platformCounts[platform] = (platformCounts[platform] || 0) + 1;
      });
      
      const platformDistribution = Object.entries(platformCounts).map(([name, value]) => ({
        name: name === 'bigquery' ? 'BigQuery' : name === 'snowflake' ? 'Snowflake' : 'Databricks',
        value
      }));
      
      // Score distribution
      const scoreRanges = {
        'Excellent (90-100)': 0,
        'Good (70-89)': 0,
        'Average (50-69)': 0,
        'Poor (30-49)': 0,
        'Critical (<30)': 0
      };
      
      scores.forEach(score => {
        if (score >= 90) scoreRanges['Excellent (90-100)']++;
        else if (score >= 70) scoreRanges['Good (70-89)']++;
        else if (score >= 50) scoreRanges['Average (50-69)']++;
        else if (score >= 30) scoreRanges['Poor (30-49)']++;
        else scoreRanges['Critical (<30)']++;
      });
      
      const scoreDistribution = Object.entries(scoreRanges).map(([name, value]) => ({
        name,
        value
      }));
      
      // Issues by category
      let bestPracticeIssues = 0;
      let performanceIssues = 0;
      let modularizationIssues = 0;
      let costIssues = 0;
      
      reports.forEach(report => {
        bestPracticeIssues += report.result.bestPractices.length;
        performanceIssues += report.result.performance.length;
        modularizationIssues += report.result.modularization.length;
        costIssues += report.result.cost.length;
      });
      
      const issuesByCategory = [
        { name: 'Best Practices', value: bestPracticeIssues },
        { name: 'Performance', value: performanceIssues },
        { name: 'Modularization', value: modularizationIssues },
        { name: 'Cost', value: costIssues }
      ];
      
      // Score over time
      const reportsByDate: Record<string, number[]> = {};
      reports.forEach(report => {
        const date = new Date(report.timestamp).toISOString().split('T')[0];
        if (!reportsByDate[date]) reportsByDate[date] = [];
        reportsByDate[date].push(report.result.summary.score);
      });
      
      const scoreOverTime = Object.entries(reportsByDate)
        .map(([date, scores]) => ({
          date,
          score: scores.reduce((sum, score) => sum + score, 0) / scores.length
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      setAnalytics({
        totalReports: reports.length,
        totalProjects: projects.length,
        totalQueries: queries.length,
        avgScore,
        bestPracticesAvg,
        performanceAvg,
        modularizationAvg,
        costAvg,
        platformDistribution,
        scoreDistribution,
        issuesByCategory,
        scoreOverTime
      });
      
      setIsLoading(false);
    };
    
    calculateAnalytics();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">No analytics data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Total Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{analytics.totalReports}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{analytics.totalProjects}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Queries</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{analytics.totalQueries}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Avg. Score</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{analytics.avgScore.toFixed(1)}</p>
            <div className="flex items-center mt-2">
              {analytics.avgScore >= 80 ? (
                <><CheckCircle className="h-4 w-4 text-green-500 mr-1" /> Excellent</>
              ) : analytics.avgScore >= 60 ? (
                <><Info className="h-4 w-4 text-blue-500 mr-1" /> Good</>
              ) : analytics.avgScore >= 40 ? (
                <><AlertTriangle className="h-4 w-4 text-yellow-500 mr-1" /> Needs improvement</>
              ) : (
                <><AlertCircle className="h-4 w-4 text-red-500 mr-1" /> Critical</>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="scores">
        <TabsList className="grid w-full md:w-auto md:inline-flex grid-cols-2 md:grid-cols-none">
          <TabsTrigger value="scores">Score Analysis</TabsTrigger>
          <TabsTrigger value="trends">Trends & History</TabsTrigger>
          <TabsTrigger value="distribution">Distributions</TabsTrigger>
          <TabsTrigger value="issues">Issues Analysis</TabsTrigger>
        </TabsList>
        
        <TabsContent value="scores" className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>SQL Quality Score Breakdown</CardTitle>
                <CardDescription>Average scores across all analyzed queries</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: 'Best Practices', score: analytics.bestPracticesAvg },
                      { name: 'Performance', score: analytics.performanceAvg },
                      { name: 'Modularization', score: analytics.modularizationAvg },
                      { name: 'Cost', score: analytics.costAvg }
                    ]}
                    margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip 
                      formatter={(value) => [`${Number(value).toFixed(1)}`, 'Score']}
                      labelFormatter={(name) => `${name} Score`}
                    />
                    <Bar dataKey="score" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Score Distribution</CardTitle>
                <CardDescription>How many queries fall into each score range</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.scoreDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {analytics.scoreDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} queries`, 'Count']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="trends" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Score Trends Over Time</CardTitle>
              <CardDescription>Average score of queries analyzed each day</CardDescription>
            </CardHeader>
            <CardContent className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={analytics.scoreOverTime}
                  margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip 
                    formatter={(value) => [`${Number(value).toFixed(1)}`, 'Avg Score']}
                    labelFormatter={(date) => `Date: ${date}`}
                  />
                  <Bar dataKey="score" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="distribution" className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>SQL Platform Distribution</CardTitle>
                <CardDescription>Analysis across different SQL platforms</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.platformDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {analytics.platformDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} queries`, 'Count']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Issue Distribution</CardTitle>
                <CardDescription>Types of issues found across all queries</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.issuesByCategory}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {analytics.issuesByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} issues`, 'Count']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="issues" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Issue Analysis</CardTitle>
              <CardDescription>Breakdown of issues found by category</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={analytics.issuesByCategory}
                  margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => [`${value}`, 'Issues Found']}
                    labelFormatter={(name) => `${name} Issues`}
                  />
                  <Bar dataKey="value" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalyticsDashboard;
