import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getReportByShareId, SavedReport } from '@/utils/reportService';
import Layout from '@/components/Layout';
import AnalysisReport from '@/components/AnalysisReport';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, Clock, Database, Download, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from "sonner";

const SharedReport = () => {
  const { shareId } = useParams<{ shareId: string }>();
  const [report, setReport] = useState<SavedReport | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  useEffect(() => {
    if (shareId) {
      const foundReport = getReportByShareId(shareId);
      setReport(foundReport || null);
      setLoading(false);
    }
  }, [shareId]);
  
  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  };
  
  const handleDownload = (format: 'json' | 'csv') => {
    if (!report) return;
    
    let content: string;
    let filename: string;
    let type: string;
    
    if (format === 'json') {
      content = JSON.stringify(report, null, 2);
      filename = `report_${report.id}.json`;
      type = 'application/json';
    } else {
      // Basic CSV implementation
      content = 'Category,Issue,Description\n';
      
      // Add best practices
      report.result.bestPractices.forEach(issue => {
        content += `"Best Practice","${issue.message.replace(/"/g, '""')}","${issue.recommendation.replace(/"/g, '""')}"\n`;
      });
      
      // Add performance issues
      report.result.performance.forEach(issue => {
        content += `"Performance","${issue.message.replace(/"/g, '""')}","${issue.recommendation.replace(/"/g, '""')}"\n`;
      });
      
      // Add modularization issues
      report.result.modularization.forEach(issue => {
        content += `"Modularization","${issue.message.replace(/"/g, '""')}","${issue.recommendation.replace(/"/g, '""')}"\n`;
      });
      
      // Add cost issues
      report.result.cost.forEach(issue => {
        content += `"Cost","${issue.message.replace(/"/g, '""')}","${issue.recommendation.replace(/"/g, '""')}"\n`;
      });
      
      filename = `report_${report.id}.csv`;
      type = 'text/csv';
    }
    
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success(`Report downloaded as ${format.toUpperCase()}`);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[calc(100vh-100px)]">
          <div className="animate-pulse">Loading shared report...</div>
        </div>
      </Layout>
    );
  }
  
  if (!report) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)]">
          <h1 className="text-xl font-bold mb-4">Report Not Found</h1>
          <p className="text-muted-foreground mb-6">The shared report you're looking for doesn't exist or has been removed.</p>
          <Button onClick={() => navigate('/')}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Return to Home
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back to Home
        </Button>
        <div className="flex justify-between items-center mt-4">
          <div>
            <h1 className="text-2xl font-bold">{report.name}</h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
              <div className="flex items-center">
                <Clock className="mr-1 h-4 w-4" />
                {format(new Date(report.timestamp), 'MMM d, yyyy h:mm a')}
              </div>
              <div className="flex items-center">
                <Database className="mr-1 h-4 w-4" />
                {report.platform}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCopyLink}>
              <Copy className="mr-1 h-4 w-4" />
              Copy Link
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleDownload('json')}>
              <Download className="mr-1 h-4 w-4" />
              JSON
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleDownload('csv')}>
              <Download className="mr-1 h-4 w-4" />
              CSV
            </Button>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5">
          <Card>
            <CardContent className="p-4">
              <h2 className="text-lg font-medium mb-2">SQL Query</h2>
              <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm">
                <code>{report.sql}</code>
              </pre>
            </CardContent>
          </Card>
        </div>
        
        <div className="lg:col-span-7">
          <AnalysisReport 
            result={report.result}
            platform={report.platform}
            sql={report.sql}
          />
        </div>
      </div>
    </Layout>
  );
};

export default SharedReport;
