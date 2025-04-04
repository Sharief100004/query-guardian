
import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getSavedReports, deleteSavedReport, SavedReport } from '@/utils/reportService';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Trash2, ArrowUpDown, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { 
  Dialog, DialogContent, DialogHeader, 
  DialogTitle, DialogTrigger 
} from '@/components/ui/dialog';
import AnalysisReport from '@/components/AnalysisReport';

const Reports = () => {
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReport, setSelectedReport] = useState<SavedReport | null>(null);
  const [sortField, setSortField] = useState<'timestamp' | 'name'>('timestamp');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = () => {
    const savedReports = getSavedReports();
    setReports(savedReports);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this report?')) {
      const success = deleteSavedReport(id);
      if (success) {
        toast.success('Report deleted successfully');
        loadReports();
      } else {
        toast.error('Failed to delete report');
      }
    }
  };

  const handleSort = (field: 'timestamp' | 'name') => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const filteredReports = reports.filter(report => {
    return (
      report.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.sql.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const sortedReports = [...filteredReports].sort((a, b) => {
    if (sortField === 'timestamp') {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
    } else {
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();
      return sortDirection === 'asc' 
        ? nameA.localeCompare(nameB) 
        : nameB.localeCompare(nameA);
    }
  });

  const getPlatformName = (platform: string) => {
    switch (platform) {
      case 'bigquery': return 'Google BigQuery';
      case 'snowflake': return 'Snowflake';
      case 'databricks': return 'Databricks';
      default: return platform;
    }
  };

  const getReportScore = (report: SavedReport) => {
    return report.result.summary.score;
  };

  const groupReportsByDate = () => {
    const grouped: { [key: string]: SavedReport[] } = {};
    
    sortedReports.forEach(report => {
      const date = new Date(report.timestamp).toLocaleDateString();
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(report);
    });
    
    return grouped;
  };

  const groupedReports = groupReportsByDate();

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Saved Reports</h1>
        <p className="text-muted-foreground">
          View and manage your saved SQL analysis reports
        </p>
      </div>

      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search reports..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleSort('timestamp')}
            className={sortField === 'timestamp' ? 'border-primary' : ''}
          >
            Date
            <ArrowUpDown size={14} className="ml-1" />
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleSort('name')}
            className={sortField === 'name' ? 'border-primary' : ''}
          >
            Name
            <ArrowUpDown size={14} className="ml-1" />
          </Button>
        </div>

        {sortedReports.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No reports found</p>
              <p className="text-muted-foreground">
                {searchTerm ? 'Try a different search term.' : 'Save an analysis report to see it here.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedReports).map(([date, dateReports]) => (
              <div key={date} className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">{date}</h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {dateReports.map((report) => (
                    <Card key={report.id} className="border-accent/20 hover:border-accent/40 transition-colors">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-base">{report.name}</CardTitle>
                            <CardDescription>
                              {getPlatformName(report.platform)}
                            </CardDescription>
                          </div>
                          <div className="flex items-center space-x-1">
                            <span 
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                getReportScore(report) >= 80 ? 'bg-green-100 text-green-800' :
                                getReportScore(report) >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                getReportScore(report) >= 40 ? 'bg-orange-100 text-orange-800' :
                                'bg-red-100 text-red-800'
                              }`}
                            >
                              Score: {getReportScore(report)}
                            </span>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pb-3">
                        <p className="text-xs text-muted-foreground font-mono line-clamp-2">
                          {report.sql}
                        </p>
                        <div className="flex justify-between items-center mt-4">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedReport(report)}
                              >
                                View Report
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>{report.name}</DialogTitle>
                              </DialogHeader>
                              {selectedReport && (
                                <AnalysisReport
                                  result={selectedReport.result}
                                  platform={selectedReport.platform}
                                  sql={selectedReport.sql}
                                />
                              )}
                            </DialogContent>
                          </Dialog>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(report.id)}
                            className="text-destructive hover:text-destructive/80"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Reports;
