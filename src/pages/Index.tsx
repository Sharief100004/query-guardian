
import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import CodeEditor from '@/components/CodeEditor';
import PlatformSelector from '@/components/PlatformSelector';
import { Platform, SqlAnalysisResult, validateSql } from '@/utils/sqlValidator';
import { toast } from "sonner";
import RuleConfigurationModal from '@/components/RuleConfigurationModal';
import CustomRuleSetModal from '@/components/CustomRuleSetModal';
import BatchAnalysisModal from '@/components/BatchAnalysisModal';
import { saveReport, saveAutoReport, addToQueryHistory } from '@/utils/reportService';
import { Button } from '@/components/ui/button';
import { FilePlus, Save, History, Book, Keyboard, GitCompare, Code, FolderOpen, Plus, Wand2, Sparkles, ScrollText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import QueryTemplatesModal from '@/components/QueryTemplatesModal';
import QueryHistoryModal from '@/components/QueryHistoryModal';
import KeyboardShortcutsModal from '@/components/KeyboardShortcutsModal';
import QueryComparisonModal, { ComparisonQueryItem } from '@/components/QueryComparisonModal';
import AnalysisReportWithSchema from '@/components/AnalysisReportWithSchema';
import SqlModelConversionDialog from '@/components/SqlModelConversionDialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { nanoid } from 'nanoid';
import { 
  ensureDefaultProject, 
  getProject, 
  addQueryToProject, 
  updateQueryInProject 
} from '@/utils/projectService';
import { useNavigate } from 'react-router-dom';

const defaultSql = `-- Enter your SQL query here
SELECT 
  user_id,
  COUNT(*) as visit_count,
  MAX(timestamp) as last_visit
FROM 
  web_events
WHERE 
  event_type = 'page_view'
GROUP BY 
  user_id
ORDER BY 
  visit_count DESC
LIMIT 100`;

const Index = () => {
  const [sql, setSql] = useState(defaultSql);
  const [platform, setPlatform] = useState<Platform>('bigquery');
  const [result, setResult] = useState<SqlAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [reportName, setReportName] = useState('');
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [rules, setRules] = useState<Record<string, any>>(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [templatesModalOpen, setTemplatesModalOpen] = useState(false);
  const [keyboardShortcutsOpen, setKeyboardShortcutsOpen] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const [autoAnalysis, setAutoAnalysis] = useState(false);
  const [autoAnalysisTimeout, setAutoAnalysisTimeout] = useState<NodeJS.Timeout | null>(null);
  
  const [comparisonQueries, setComparisonQueries] = useState<ComparisonQueryItem[]>([]);
  const [comparisonModalOpen, setComparisonModalOpen] = useState(false);
  const [addToCompareDialogOpen, setAddToCompareDialogOpen] = useState(false);
  const [compareQueryName, setCompareQueryName] = useState('');
  
  const [modelConversionOpen, setModelConversionOpen] = useState(false);
  const [currentQueryId, setCurrentQueryId] = useState<string | null>(null);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [queryName, setQueryName] = useState('Untitled Query');
  const [saveToProjectDialogOpen, setSaveToProjectDialogOpen] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    const savedRules = localStorage.getItem(`${platform}Rules`);
    if (savedRules) {
      setRules(JSON.parse(savedRules));
    }
    
    const themePreference = localStorage.getItem('darkTheme');
    if (themePreference !== null) {
      setIsDarkTheme(themePreference === 'true');
    }
    
    const autoAnalysisPreference = localStorage.getItem('autoAnalysis');
    if (autoAnalysisPreference !== null) {
      setAutoAnalysis(autoAnalysisPreference === 'true');
    }
    
    if (themePreference === 'true') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleAnalyze();
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (currentProjectId && currentQueryId) {
          handleUpdateProjectQuery();
        } else {
          setSaveToProjectDialogOpen(true);
        }
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setKeyboardShortcutsOpen(true);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [platform, result, currentProjectId, currentQueryId, sql]);

  useEffect(() => {
    if (autoAnalysis && sql.trim()) {
      if (autoAnalysisTimeout) {
        clearTimeout(autoAnalysisTimeout);
      }
      
      const timeout = setTimeout(() => {
        handleAnalyze();
      }, 2000);
      
      setAutoAnalysisTimeout(timeout);
    }
    
    return () => {
      if (autoAnalysisTimeout) {
        clearTimeout(autoAnalysisTimeout);
      }
    };
  }, [sql, autoAnalysis]);

  const handleAnalyze = async () => {
    if (!sql.trim()) {
      toast.error("Please enter a SQL query");
      return;
    }

    setIsAnalyzing(true);
    try {
      const analysisResult = await validateSql(sql, platform, rules);
      setResult(analysisResult);
      
      addToQueryHistory(sql, platform);
      
      if (analysisResult.valid) {
        if (currentProjectId && currentQueryId) {
          const reportId = saveAutoReport(platform, sql, analysisResult).id;
          
          updateQueryInProject(currentProjectId, currentQueryId, {
            lastAnalysisId: reportId,
            sql,
            platform
          });
        } else {
          saveAutoReport(platform, sql, analysisResult);
        }
        
        const issueCount = 
          analysisResult.bestPractices.length + 
          analysisResult.performance.length + 
          analysisResult.modularization.length + 
          analysisResult.cost.length;
        
        if (issueCount === 0) {
          toast.success("Analysis complete: No issues found! Report saved.");
        } else {
          toast.info(`Analysis complete: Found ${issueCount} improvement ${issueCount === 1 ? 'opportunity' : 'opportunities'}. Report saved.`);
        }
      } else {
        toast.error("Failed to analyze SQL query");
      }
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error("An error occurred during analysis");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveRules = (updatedRules: Record<string, any>) => {
    setRules(updatedRules);
  };

  const handleSaveReport = () => {
    if (!result) {
      toast.error("No analysis result to save");
      return;
    }

    if (!reportName.trim()) {
      toast.error("Please enter a name for this report");
      return;
    }

    saveReport(reportName, platform, sql, result);
    toast.success(`Report "${reportName}" saved successfully`);
    setSaveDialogOpen(false);
    setReportName('');
  };
  
  const handleLoadQuery = (querySql: string, queryPlatform: Platform) => {
    setSql(querySql);
    setPlatform(queryPlatform);
    setHistoryModalOpen(false);
    
    setCurrentProjectId(null);
    setCurrentQueryId(null);
    setQueryName('Untitled Query');
  };
  
  const handleLoadTemplate = (template: string) => {
    setSql(template);
    setTemplatesModalOpen(false);
    
    setCurrentProjectId(null);
    setCurrentQueryId(null);
    setQueryName('Untitled Query');
  };

  const handleAddToComparison = () => {
    if (!result) {
      toast.error("You need to analyze a query before adding it for comparison");
      return;
    }
    
    if (!compareQueryName.trim()) {
      toast.error("Please enter a name for this comparison query");
      return;
    }
    
    const newComparisonQuery: ComparisonQueryItem = {
      id: nanoid(),
      name: compareQueryName,
      sql,
      platform,
      result,
      timestamp: Date.now()
    };
    
    setComparisonQueries(prev => [...prev, newComparisonQuery]);
    setAddToCompareDialogOpen(false);
    setCompareQueryName('');
    toast.success(`Query "${compareQueryName}" added to comparison`);
    
    if (comparisonQueries.length >= 1) {
      setComparisonModalOpen(true);
    }
  };

  const handleRemoveFromComparison = (id: string) => {
    setComparisonQueries(prev => prev.filter(q => q.id !== id));
    
    if (comparisonQueries.length <= 1) {
      setComparisonModalOpen(false);
    }
  };
  
  const handleSaveToProject = () => {
    if (!sql.trim()) {
      toast.error("SQL query is empty");
      return;
    }
    
    const defaultProject = ensureDefaultProject();
    
    try {
      const newQuery = addQueryToProject(defaultProject.id, {
        name: queryName,
        sql,
        platform,
        description: ''
      });
      
      if (newQuery) {
        setCurrentProjectId(defaultProject.id);
        setCurrentQueryId(newQuery.id);
        
        toast.success(`Query "${queryName}" saved to project`);
        setSaveToProjectDialogOpen(false);
        
        if (result) {
          const reportId = saveAutoReport(platform, sql, result).id;
          updateQueryInProject(defaultProject.id, newQuery.id, {
            lastAnalysisId: reportId
          });
        }
      } else {
        toast.error("Failed to save query to project");
      }
    } catch (error) {
      console.error('Error saving to project:', error);
      toast.error("Failed to save query to project");
    }
  };
  
  const handleUpdateProjectQuery = () => {
    if (!currentProjectId || !currentQueryId) {
      toast.error("No current query to update");
      return;
    }
    
    try {
      const updatedQuery = updateQueryInProject(currentProjectId, currentQueryId, {
        sql,
        platform
      });
      
      if (updatedQuery) {
        toast.success("Query updated successfully");
        
        if (result) {
          const reportId = saveAutoReport(platform, sql, result).id;
          updateQueryInProject(currentProjectId, currentQueryId, {
            lastAnalysisId: reportId
          });
        }
      } else {
        toast.error("Failed to update query");
      }
    } catch (error) {
      console.error('Error updating query:', error);
      toast.error("Failed to update query");
    }
  };
  
  const handleBrowseProjects = () => {
    navigate('/projects');
  };

  const handleApplyMigration = (newSql: string) => {
    setSql(newSql);
    toast.success("Migration applied to editor");
  };

  return (
    <Layout>
      <div className="glass-nav px-6 py-4 border-b border-white/10 flex justify-between items-center sticky top-0 z-10 mb-6">
        <div>
          <div className="flex items-center">
            <Code size={24} className="text-primary mr-3" />
            <div>
              <h1 className="text-2xl font-bold blue-gradient-text">SQL Query Guardian</h1>
              {currentProjectId && currentQueryId && (
                <div className="flex items-center ml-3 text-sm bg-primary/10 px-2 py-1 rounded-full">
                  <span className="text-white/60">Editing:</span>
                  <span className="font-medium ml-1 text-white">{queryName}</span>
                </div>
              )}
            </div>
          </div>
          <p className="text-white/60 text-sm mt-1">
            Analyze SQL queries for best practices, performance, modularization, and cost efficiency
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="glass" size="sm" onClick={() => setKeyboardShortcutsOpen(true)}>
            <Keyboard size={16} className="text-primary" />
            <span className="hidden md:inline">Shortcuts</span>
          </Button>
          
          <Button variant="glass" size="sm" onClick={() => setHistoryModalOpen(true)}>
            <History size={16} className="text-primary" />
            <span className="hidden md:inline">History</span>
          </Button>
          
          <Button variant="glass" size="sm" onClick={() => setTemplatesModalOpen(true)}>
            <Book size={16} className="text-primary" />
            <span className="hidden md:inline">Templates</span>
          </Button>
          
          <Button 
            variant="glass" 
            size="sm" 
            onClick={() => setComparisonModalOpen(true)}
            disabled={comparisonQueries.length < 2}
            className={comparisonQueries.length < 2 ? "opacity-50" : ""}
          >
            <GitCompare size={16} className="text-primary" />
            <span className="hidden md:inline">Compare</span>
            {comparisonQueries.length > 0 && (
              <span className="ml-1 bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {comparisonQueries.length}
              </span>
            )}
          </Button>
          
          <Button 
            variant="glass" 
            size="sm" 
            onClick={handleBrowseProjects}
          >
            <FolderOpen size={16} className="text-primary" />
            <span className="hidden md:inline">Projects</span>
          </Button>
        
          <BatchAnalysisModal />
          <CustomRuleSetModal />
          <RuleConfigurationModal 
            platform={platform} 
            onSaveRules={handleSaveRules} 
          />
        </div>
      </div>
      
      <div className="px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <PlatformSelector platform={platform} onChange={setPlatform} />
              </div>
              
              <div className="flex space-x-2">
                {currentProjectId && currentQueryId ? (
                  <Button 
                    variant="gradient" 
                    size="sm"
                    onClick={handleUpdateProjectQuery}
                    className="whitespace-nowrap"
                  >
                    <Save size={14} className="mr-1" />
                    <span>Update</span>
                  </Button>
                ) : (
                  <Dialog open={saveToProjectDialogOpen} onOpenChange={setSaveToProjectDialogOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="gradient" 
                        size="sm"
                        className="whitespace-nowrap"
                      >
                        <FolderOpen size={14} className="mr-1" />
                        <span>Save</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-card/95 backdrop-blur-md border border-white/10">
                      <DialogHeader>
                        <DialogTitle className="text-white">Save to Project</DialogTitle>
                      </DialogHeader>
                      <div className="py-4">
                        <label htmlFor="query-name" className="block text-sm font-medium mb-2 text-white/80">
                          Query Name
                        </label>
                        <Input
                          id="query-name"
                          value={queryName}
                          onChange={(e) => setQueryName(e.target.value)}
                          placeholder="My SQL Query"
                          className="bg-background/30 text-white border-white/10"
                        />
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setSaveToProjectDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleSaveToProject} variant="gradient">
                          <Save size={14} className="mr-2" />
                          Save Query
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>
            
            <div className="glossy-card overflow-hidden">
              <CodeEditor 
                code={sql}
                onChange={setSql}
                onExecute={handleAnalyze}
                isLoading={isAnalyzing}
                platform={platform}
              />
            </div>
            
            <Button 
              variant="gradient" 
              onClick={handleAnalyze} 
              disabled={isAnalyzing}
              className="w-full"
            >
              {isAnalyzing ? (
                <>Analyzing...</>
              ) : (
                <>
                  <Sparkles size={16} className="mr-2" />
                  Analyze Query
                </>
              )}
            </Button>
          </div>
          
          <div className="lg:col-span-7">
            <div className="glossy-card h-full">
              <AnalysisReportWithSchema 
                result={result}
                platform={platform}
                sql={sql}
              />
            </div>
          </div>
        </div>
      </div>
      
      <QueryHistoryModal 
        isOpen={historyModalOpen} 
        onClose={() => setHistoryModalOpen(false)}
        onSelect={handleLoadQuery}
      />
      
      <QueryTemplatesModal
        isOpen={templatesModalOpen}
        onClose={() => setTemplatesModalOpen(false)}
        platform={platform}
        onSelect={handleLoadTemplate}
      />
      
      <KeyboardShortcutsModal
        isOpen={keyboardShortcutsOpen}
        onClose={() => setKeyboardShortcutsOpen(false)}
      />
      
      <QueryComparisonModal
        isOpen={comparisonModalOpen}
        onClose={() => setComparisonModalOpen(false)}
        comparisonQueries={comparisonQueries}
        onRemoveQuery={handleRemoveFromComparison}
      />
      
      <SqlModelConversionDialog
        isOpen={modelConversionOpen}
        onClose={() => setModelConversionOpen(false)}
        sql={sql}
        platform={platform}
      />
      
      {result && (
        <>
          <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className="hidden"
              >
                <Save size={14} className="mr-1" />
                <span>Save Report</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card/95 backdrop-blur-md border border-white/10">
              <DialogHeader>
                <DialogTitle className="text-white">Save Analysis Report</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <label htmlFor="report-name" className="block text-sm font-medium mb-2 text-white/80">
                  Report Name
                </label>
                <Input
                  id="report-name"
                  value={reportName}
                  onChange={(e) => setReportName(e.target.value)}
                  placeholder="My SQL Analysis Report"
                  className="bg-background/30 text-white border-white/10"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveReport} variant="gradient">
                  <FilePlus size={14} className="mr-2" />
                  Save Report
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <Dialog open={addToCompareDialogOpen} onOpenChange={setAddToCompareDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className="hidden"
              >
                <GitCompare size={14} className="mr-1" />
                <span>Add to Compare</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card/95 backdrop-blur-md border border-white/10">
              <DialogHeader>
                <DialogTitle className="text-white">Add Query to Comparison</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <label htmlFor="compare-name" className="block text-sm font-medium mb-2 text-white/80">
                  Name for this Query Variant
                </label>
                <Input
                  id="compare-name"
                  value={compareQueryName}
                  onChange={(e) => setCompareQueryName(e.target.value)}
                  placeholder="Original Query"
                  className="bg-background/30 text-white border-white/10"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddToCompareDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddToComparison} variant="gradient">
                  <GitCompare size={14} className="mr-2" />
                  Add to Comparison
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </Layout>
  );
};

export default Index;
