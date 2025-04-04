
import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, RefreshCw, Trash2, Download } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { clearQueryHistory, getReportCount } from '@/utils/reportService';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

const Settings = () => {
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const [isAutomaticAnalysis, setIsAutomaticAnalysis] = useState(false);
  const [saveReports, setSaveReports] = useState(true);
  const [reportCount, setReportCount] = useState(0);
  const [clearHistoryDialog, setClearHistoryDialog] = useState(false);
  
  useEffect(() => {
    // Load existing settings
    const darkThemePreference = localStorage.getItem('darkTheme');
    if (darkThemePreference !== null) {
      setIsDarkTheme(darkThemePreference === 'true');
    }
    
    const autoAnalysisPreference = localStorage.getItem('autoAnalysis');
    if (autoAnalysisPreference !== null) {
      setIsAutomaticAnalysis(autoAnalysisPreference === 'true');
    }
    
    const saveReportsPreference = localStorage.getItem('saveReports');
    if (saveReportsPreference !== null) {
      setSaveReports(saveReportsPreference === 'true');
    }
    
    // Get report count
    setReportCount(getReportCount());
  }, []);
  
  const handleSave = () => {
    // Save settings to localStorage
    localStorage.setItem('darkTheme', isDarkTheme.toString());
    localStorage.setItem('autoAnalysis', isAutomaticAnalysis.toString());
    localStorage.setItem('saveReports', saveReports.toString());
    
    // Apply dark theme
    if (isDarkTheme) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    toast.success("Settings saved successfully");
  };
  
  const handleReset = () => {
    setIsDarkTheme(true);
    setIsAutomaticAnalysis(false);
    setSaveReports(true);
    toast.info("Settings reset to defaults");
  };
  
  const handleClearHistory = () => {
    clearQueryHistory();
    setClearHistoryDialog(false);
    toast.success("Query history cleared successfully");
  };
  
  const handleExportData = () => {
    const allData = {
      savedReports: JSON.parse(localStorage.getItem('savedReports') || '[]'),
      queryHistory: JSON.parse(localStorage.getItem('queryHistory') || '[]'),
      settings: {
        darkTheme: isDarkTheme,
        autoAnalysis: isAutomaticAnalysis,
        saveReports: saveReports
      }
    };
    
    const dataStr = JSON.stringify(allData, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
    
    const exportFileName = `query_guardian_export_${new Date().toISOString().slice(0, 10)}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileName);
    linkElement.click();
    
    toast.success("Application data exported successfully");
  };

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Configure application preferences
        </p>
      </div>

      <div className="grid gap-6">
        <Tabs defaultValue="general">
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="analyzer">Analyzer</TabsTrigger>
            <TabsTrigger value="data">Data Management</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>
          
          <TabsContent value="general">
            <Card className="border-accent/20">
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>
                  Configure application appearance and behavior
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Dark Theme</Label>
                    <p className="text-sm text-muted-foreground">
                      Use dark mode for the application interface
                    </p>
                  </div>
                  <Switch 
                    checked={isDarkTheme} 
                    onCheckedChange={setIsDarkTheme}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Automatic Analysis</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically analyze SQL queries as you type
                    </p>
                  </div>
                  <Switch 
                    checked={isAutomaticAnalysis} 
                    onCheckedChange={setIsAutomaticAnalysis}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Auto-Save Reports</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically save analysis reports
                    </p>
                  </div>
                  <Switch 
                    checked={saveReports} 
                    onCheckedChange={setSaveReports}
                  />
                </div>
                
                <Separator className="my-4" />
                
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Keyboard Shortcuts</h3>
                  <div className="rounded-md border overflow-hidden">
                    <table className="w-full text-sm">
                      <tbody>
                        <tr className="border-b">
                          <td className="p-2 font-medium">Analyze Query</td>
                          <td className="p-2 text-right">
                            <kbd className="px-2 py-1 rounded bg-muted">Ctrl/Cmd + Enter</kbd>
                          </td>
                        </tr>
                        <tr className="border-b">
                          <td className="p-2 font-medium">Save Report</td>
                          <td className="p-2 text-right">
                            <kbd className="px-2 py-1 rounded bg-muted">Ctrl/Cmd + S</kbd>
                          </td>
                        </tr>
                        <tr>
                          <td className="p-2 font-medium">Keyboard Shortcuts</td>
                          <td className="p-2 text-right">
                            <kbd className="px-2 py-1 rounded bg-muted">Ctrl/Cmd + K</kbd>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="analyzer">
            <Card className="border-accent/20">
              <CardHeader>
                <CardTitle>Analyzer Settings</CardTitle>
                <CardDescription>
                  Configure SQL analysis behavior and rules
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>BigQuery Rule Sets</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch id="bigquery-best-practices" defaultChecked />
                      <Label htmlFor="bigquery-best-practices">Best Practices</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="bigquery-performance" defaultChecked />
                      <Label htmlFor="bigquery-performance">Performance</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="bigquery-modularization" defaultChecked />
                      <Label htmlFor="bigquery-modularization">Modularization</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="bigquery-cost" defaultChecked />
                      <Label htmlFor="bigquery-cost">Cost</Label>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Snowflake Rule Sets</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch id="snowflake-best-practices" defaultChecked />
                      <Label htmlFor="snowflake-best-practices">Best Practices</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="snowflake-performance" defaultChecked />
                      <Label htmlFor="snowflake-performance">Performance</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="snowflake-modularization" defaultChecked />
                      <Label htmlFor="snowflake-modularization">Modularization</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="snowflake-cost" defaultChecked />
                      <Label htmlFor="snowflake-cost">Cost</Label>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Databricks Rule Sets</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch id="databricks-best-practices" defaultChecked />
                      <Label htmlFor="databricks-best-practices">Best Practices</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="databricks-performance" defaultChecked />
                      <Label htmlFor="databricks-performance">Performance</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="databricks-modularization" defaultChecked />
                      <Label htmlFor="databricks-modularization">Modularization</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="databricks-cost" defaultChecked />
                      <Label htmlFor="databricks-cost">Cost</Label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="data">
            <Card className="border-accent/20">
              <CardHeader>
                <CardTitle>Data Management</CardTitle>
                <CardDescription>
                  Manage your saved reports and query history
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Saved Reports</CardTitle>
                      <CardDescription>
                        You have {reportCount} saved reports
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          Manage your saved analysis reports
                        </p>
                        <div className="flex flex-col space-y-2">
                          <Button variant="outline" size="sm" className="justify-start">
                            <Download className="mr-2 h-4 w-4" />
                            Export All Reports
                          </Button>
                          <Button variant="outline" size="sm" className="justify-start">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Clear All Reports
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Query History</CardTitle>
                      <CardDescription>
                        Manage your query history
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          Your query history is stored locally in your browser
                        </p>
                        <div className="flex flex-col space-y-2">
                          <Button variant="outline" size="sm" className="justify-start" onClick={() => setClearHistoryDialog(true)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Clear Query History
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="pt-4">
                  <Button variant="outline" onClick={handleExportData}>
                    <Download className="mr-2 h-4 w-4" />
                    Export All Data
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Exports all saved reports, query history, and settings as a JSON file
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="advanced">
            <Card className="border-accent/20">
              <CardHeader>
                <CardTitle>Advanced Settings</CardTitle>
                <CardDescription>
                  Configure technical and advanced options
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="api-endpoint">API Endpoint</Label>
                  <Input 
                    id="api-endpoint" 
                    placeholder="https://api.example.com/analyze" 
                    defaultValue="https://api.queryguardian.com/analyze"
                  />
                  <p className="text-xs text-muted-foreground">
                    Endpoint for SQL analysis service
                  </p>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="timeout">Analysis Timeout (ms)</Label>
                  <Input 
                    id="timeout" 
                    type="number" 
                    placeholder="5000" 
                    defaultValue="5000"
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum time to wait for analysis results
                  </p>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Debug Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable detailed logging for troubleshooting
                    </p>
                  </div>
                  <Switch id="debug-mode" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={handleReset}>
            <RefreshCw size={16} className="mr-2" />
            Reset to Defaults
          </Button>
          <Button onClick={handleSave}>
            <Save size={16} className="mr-2" />
            Save Settings
          </Button>
        </div>
      </div>
      
      <Dialog open={clearHistoryDialog} onOpenChange={setClearHistoryDialog}>
        <DialogContent>
          <DialogTitle>Clear Query History</DialogTitle>
          <DialogDescription>
            Are you sure you want to clear your query history? This action cannot be undone.
          </DialogDescription>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearHistoryDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleClearHistory}>
              Clear History
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Settings;
