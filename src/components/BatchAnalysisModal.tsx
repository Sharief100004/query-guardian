
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Play, CheckCircle, AlertCircle, ChevronsUpDown } from 'lucide-react';
import { Platform, SqlAnalysisResult, validateSql } from '@/utils/sqlValidator';
import { toast } from 'sonner';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { saveReport } from '@/utils/reportService';
import { getAllQueries, getProjects, linkAnalysisToQuery } from '@/utils/projectService';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface BatchQuery {
  id: string;
  projectId: string;
  name: string;
  sql: string;
  platform: Platform;
  selected: boolean;
  result: SqlAnalysisResult | null;
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
  projectName?: string;
}

const BatchAnalysisModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [queries, setQueries] = useState<BatchQuery[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [platformFilter, setPlatformFilter] = useState<Platform | 'all'>('all');
  const [selectedCount, setSelectedCount] = useState(0);

  useEffect(() => {
    if (isOpen) {
      loadQueries();
    }
  }, [isOpen]);

  useEffect(() => {
    const count = queries.filter(q => q.selected).length;
    setSelectedCount(count);
  }, [queries]);

  const loadQueries = async () => {
    setIsLoading(true);
    try {
      const allQueries = getAllQueries();
      const projects = getProjects();
      
      const batchQueries = allQueries.map(({ projectId, query }) => {
        const project = projects.find(p => p.id === projectId);
        
        return {
          id: query.id,
          projectId,
          name: query.name,
          sql: query.sql,
          platform: query.platform,
          selected: false,
          result: null,
          status: 'pending' as const,
          projectName: project?.name || 'Unknown Project'
        };
      });
      
      setQueries(batchQueries);
    } catch (error) {
      console.error('Error loading queries for batch analysis:', error);
      toast.error('Failed to load queries');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    setQueries(queries.map(query => ({
      ...query,
      selected: checked
    })));
  };

  const handleSelectQuery = (id: string, checked: boolean) => {
    setQueries(queries.map(query => 
      query.id === id ? { ...query, selected: checked } : query
    ));
  };

  const handleRunBatchAnalysis = async () => {
    const selectedQueries = queries.filter(q => q.selected);
    
    if (selectedQueries.length === 0) {
      toast.error('No queries selected for analysis');
      return;
    }
    
    setIsAnalyzing(true);
    setProgress(0);
    
    // Reset statuses
    setQueries(queries.map(q => ({
      ...q,
      status: q.selected ? 'pending' : 'pending',
      result: null,
      error: undefined
    })));
    
    // Process queries sequentially
    let completed = 0;
    for (const query of selectedQueries) {
      try {
        // Update status to processing
        setQueries(prevQueries => 
          prevQueries.map(q => 
            q.id === query.id 
              ? { ...q, status: 'processing' } 
              : q
          )
        );
        
        // Analyze the query
        const result = await validateSql(query.sql, query.platform);
        
        // Save report
        if (result.valid) {
          const report = saveReport(
            `Batch: ${query.name}`,
            query.platform,
            query.sql,
            result,
            ['batch-analysis'],
            true
          );
          
          // Link analysis to query
          linkAnalysisToQuery(query.projectId, query.id, report.id);
        }
        
        // Update query with result
        setQueries(prevQueries => 
          prevQueries.map(q => 
            q.id === query.id 
              ? { ...q, result, status: 'completed' } 
              : q
          )
        );
      } catch (error) {
        console.error(`Error analyzing query ${query.id}:`, error);
        
        setQueries(prevQueries => 
          prevQueries.map(q => 
            q.id === query.id 
              ? { 
                  ...q, 
                  status: 'error', 
                  error: error instanceof Error ? error.message : 'Unknown error' 
                } 
              : q
          )
        );
      }
      
      // Update progress
      completed++;
      setProgress(Math.round((completed / selectedQueries.length) * 100));
    }
    
    setIsAnalyzing(false);
    
    // Show toast with summary
    const summary = {
      total: selectedQueries.length,
      completed: queries.filter(q => q.status === 'completed').length,
      error: queries.filter(q => q.status === 'error').length
    };
    
    toast.success(
      `Batch analysis completed: ${summary.completed} successful, ${summary.error} failed`
    );
  };

  const filteredQueries = queries.filter(query => {
    const matchesSearch = 
      query.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      query.sql.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesPlatform = 
      platformFilter === 'all' || query.platform === platformFilter;
      
    return matchesSearch && matchesPlatform;
  });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Play size={14} className="mr-1" />
          <span>Batch Analysis</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Batch SQL Analysis</DialogTitle>
          <DialogDescription>
            Analyze multiple SQL queries at once
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 flex-1 overflow-hidden flex flex-col">
          <div className="mb-4 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <div className="relative flex-1">
              <Input
                placeholder="Search queries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
              <svg
                width="15"
                height="15"
                viewBox="0 0 15 15"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                <path
                  d="M10 6.5C10 8.433 8.433 10 6.5 10C4.567 10 3 8.433 3 6.5C3 4.567 4.567 3 6.5 3C8.433 3 10 4.567 10 6.5ZM9.30884 10.0159C8.53901 10.6318 7.56251 11 6.5 11C4.01472 11 2 8.98528 2 6.5C2 4.01472 4.01472 2 6.5 2C8.98528 2 11 4.01472 11 6.5C11 7.56251 10.6318 8.53901 10.0159 9.30884L12.8536 12.1464C13.0488 12.3417 13.0488 12.6583 12.8536 12.8536C12.6583 13.0488 12.3417 13.0488 12.1464 12.8536L9.30884 10.0159Z"
                  fill="currentColor"
                  fillRule="evenodd"
                  clipRule="evenodd"
                ></path>
              </svg>
            </div>
            
            <div className="w-full sm:w-48">
              <select
                className="w-full h-10 rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value as Platform | 'all')}
              >
                <option value="all">All Platforms</option>
                <option value="bigquery">Google BigQuery</option>
                <option value="snowflake">Snowflake</option>
                <option value="databricks">Databricks</option>
              </select>
            </div>
          </div>
          
          {isAnalyzing && (
            <div className="mb-4">
              <Label>Analysis Progress</Label>
              <div className="flex items-center mt-2">
                <Progress value={progress} className="h-2 flex-1 mr-4" />
                <span className="text-sm font-medium">{progress}%</span>
              </div>
            </div>
          )}
          
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="select-all"
                checked={queries.length > 0 && queries.every(q => q.selected)}
                onCheckedChange={handleSelectAll}
                disabled={isAnalyzing}
              />
              <Label htmlFor="select-all" className="text-sm">
                Select All ({queries.length})
              </Label>
            </div>
            <div className="text-sm text-muted-foreground">
              {selectedCount} selected
            </div>
          </div>
          
          <ScrollArea className="flex-1 border rounded-md">
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredQueries.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-muted-foreground">
                  {searchTerm || platformFilter !== 'all'
                    ? 'No queries match your search or filter criteria'
                    : 'No queries available for batch analysis'}
                </p>
              </div>
            ) : (
              <div className="space-y-1 p-1">
                {filteredQueries.map((query) => (
                  <Collapsible key={query.id} className="rounded-md border">
                    <div className="flex items-center p-3">
                      <Checkbox
                        id={`query-${query.id}`}
                        checked={query.selected}
                        onCheckedChange={(checked) => 
                          handleSelectQuery(query.id, !!checked)
                        }
                        className="mr-4"
                        disabled={isAnalyzing}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">
                            {query.name}
                          </span>
                          <Badge variant="outline" className="ml-2">
                            {query.platform === 'bigquery'
                              ? 'BigQuery'
                              : query.platform === 'snowflake'
                              ? 'Snowflake'
                              : 'Databricks'}
                          </Badge>
                          {query.status === 'processing' && (
                            <Badge variant="secondary" className="animate-pulse">
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              Processing
                            </Badge>
                          )}
                          {query.status === 'completed' && (
                            <Badge className="bg-green-500 text-white">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Completed
                            </Badge>
                          )}
                          {query.status === 'error' && (
                            <Badge variant="destructive">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Error
                            </Badge>
                          )}
                        </div>
                      </div>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="p-0 h-7 w-7">
                          <ChevronsUpDown size={14} />
                          <span className="sr-only">Toggle</span>
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                    <CollapsibleContent>
                      <Separator />
                      <div className="p-4">
                        <div className="mb-2">
                          <h4 className="text-sm font-medium">SQL Query</h4>
                          <pre className="mt-1 p-2 rounded bg-muted/50 text-xs overflow-x-auto">
                            {query.sql.substring(0, 500)}
                            {query.sql.length > 500 ? '...' : ''}
                          </pre>
                        </div>
                        
                        {query.status === 'error' && query.error && (
                          <Alert variant="destructive" className="mt-2">
                            <AlertDescription>
                              {query.error}
                            </AlertDescription>
                          </Alert>
                        )}
                        
                        {query.status === 'completed' && query.result && (
                          <div className="mt-4">
                            <h4 className="text-sm font-medium">Analysis Result</h4>
                            <div className="mt-2 grid grid-cols-2 gap-2">
                              <div className="p-2 rounded bg-muted/50 text-sm">
                                <div className="flex justify-between">
                                  <span>Score:</span>
                                  <span className="font-medium">
                                    {query.result.summary.score}
                                  </span>
                                </div>
                              </div>
                              <div className="p-2 rounded bg-muted/50 text-sm">
                                <div className="flex justify-between">
                                  <span>Issues:</span>
                                  <span className="font-medium">
                                    {query.result.bestPractices.length +
                                      query.result.performance.length +
                                      query.result.modularization.length +
                                      query.result.cost.length}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isAnalyzing}>
            Close
          </Button>
          <Button 
            onClick={handleRunBatchAnalysis} 
            disabled={isAnalyzing || selectedCount === 0}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Play size={14} className="mr-1" />
                Run Batch Analysis
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BatchAnalysisModal;
