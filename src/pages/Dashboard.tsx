
import { useState } from 'react';
import Layout from '@/components/Layout';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getSavedReports } from '@/utils/reportService';
import { getProjects } from '@/utils/projectService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, FolderOpen, BarChart2, TrendingUp, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const navigate = useNavigate();
  
  const recentReports = getSavedReports().slice(0, 5);
  const projects = getProjects().slice(0, 5);

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          SQL Query Guardian analytics dashboard
        </p>
      </div>

      <Tabs defaultValue="overview" onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="overview">
            <BarChart2 size={16} className="mr-1" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <Activity size={16} className="mr-1" />
            Analytics
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard 
              title="Total Reports" 
              value={getSavedReports().length.toString()}
              icon={<FileText className="h-5 w-5" />}
              description="SQL analysis reports"
              trend="up"
              onClick={() => navigate('/reports')}
            />
            
            <SummaryCard 
              title="Projects" 
              value={getProjects().length.toString()}
              icon={<FolderOpen className="h-5 w-5" />}
              description="SQL project collections"
              trend="up"
              onClick={() => navigate('/projects')}
            />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Recent Reports
                </CardTitle>
                <CardDescription>
                  Your most recently analyzed SQL queries
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentReports.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-muted-foreground">No reports yet</p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => navigate('/')}
                    >
                      Analyze your first query
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentReports.map(report => (
                      <div 
                        key={report.id}
                        className="p-3 border rounded-md cursor-pointer hover:bg-accent/10 transition-colors"
                        onClick={() => navigate('/reports')}
                      >
                        <div className="flex justify-between">
                          <div>
                            <h4 className="font-medium text-sm">{report.name}</h4>
                            <p className="text-xs text-muted-foreground">
                              {report.platform === 'bigquery' 
                                ? 'Google BigQuery' 
                                : report.platform === 'snowflake'
                                ? 'Snowflake'
                                : 'Databricks'}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">
                              Score: {report.result.summary.score}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(report.timestamp).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => navigate('/reports')}
                    >
                      View All Reports
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FolderOpen className="h-5 w-5 mr-2" />
                  Projects
                </CardTitle>
                <CardDescription>
                  Your SQL query project collections
                </CardDescription>
              </CardHeader>
              <CardContent>
                {projects.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-muted-foreground">No projects yet</p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => navigate('/projects')}
                    >
                      Create your first project
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {projects.map(project => (
                      <div 
                        key={project.id}
                        className="p-3 border rounded-md cursor-pointer hover:bg-accent/10 transition-colors"
                        onClick={() => navigate('/projects')}
                      >
                        <div className="flex justify-between">
                          <div>
                            <h4 className="font-medium text-sm">{project.name}</h4>
                            {project.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {project.description}
                              </p>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground text-right">
                            {project.queries.length} queries
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => navigate('/projects')}
                    >
                      View All Projects
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="analytics">
          <AnalyticsDashboard />
        </TabsContent>
      </Tabs>
    </Layout>
  );
};

interface SummaryCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  description: string;
  trend?: 'up' | 'down' | 'neutral';
  onClick?: () => void;
}

const SummaryCard = ({ title, value, icon, description, trend, onClick }: SummaryCardProps) => {
  return (
    <Card 
      className={onClick ? "cursor-pointer hover:border-primary transition-colors" : ""}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground flex items-center">
          <span className="text-primary mr-2">{icon}</span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-end">
          <div>
            <div className="text-2xl font-bold">{value}</div>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          </div>
          {trend && (
            <div>
              {trend === 'up' && <TrendingUp className="h-5 w-5 text-green-500" />}
              {trend === 'down' && <TrendingUp className="h-5 w-5 text-red-500 transform rotate-180" />}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default Dashboard;
