
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRightLeft, Diff, AlertTriangle, Check, RefreshCw } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Platform } from "@/utils/sqlValidator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { migrateQuery } from '@/utils/sqlMigrationUtil';
import QueryDiffViewer from '@/components/QueryDiffViewer';
import { toast } from "sonner";

interface PlatformMigrationToolProps {
  sql: string;
  currentPlatform: Platform;
  onApplyMigration: (sql: string) => void;
}

interface MigrationResult {
  originalQuery: string;
  convertedQuery: string;
  targetPlatform: Platform;
  issues: MigrationIssue[];
  compatibilityScore: number;
}

interface MigrationIssue {
  line?: number;
  message: string;
  suggestion: string;
  severity: 'warning' | 'error' | 'info';
}

const PlatformMigrationTool: React.FC<PlatformMigrationToolProps> = ({ 
  sql, 
  currentPlatform, 
  onApplyMigration 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [targetPlatform, setTargetPlatform] = useState<Platform | null>(null);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);
  
  // Set default target platform based on current platform
  useEffect(() => {
    if (!targetPlatform) {
      const otherPlatforms: Platform[] = ['bigquery', 'snowflake', 'databricks'].filter(
        p => p !== currentPlatform
      ) as Platform[];
      
      setTargetPlatform(otherPlatforms[0]);
    }
  }, [currentPlatform, targetPlatform]);
  
  const handleMigrate = async () => {
    if (!sql.trim()) {
      toast.error("No SQL query to migrate");
      return;
    }
    
    if (!targetPlatform) {
      toast.error("Please select a target platform");
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Wait a bit to simulate processing
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const result = migrateQuery(sql, currentPlatform, targetPlatform);
      setMigrationResult(result);
      
      if (result.issues.length > 0) {
        const warnings = result.issues.filter(issue => issue.severity === 'warning' || issue.severity === 'error').length;
        if (warnings > 0) {
          toast.warning(`Migration completed with ${warnings} warnings/errors`);
        } else {
          toast.success('Migration completed with some suggestions');
        }
      } else {
        toast.success('Migration completed successfully');
      }
    } catch (error) {
      console.error("Error migrating query:", error);
      toast.error("Failed to migrate query");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleApplyMigration = () => {
    if (migrationResult) {
      onApplyMigration(migrationResult.convertedQuery);
      toast.success(`Query migrated to ${migrationResult.targetPlatform}`);
    }
  };
  
  return (
    <Card className="glossy-card border-accent/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center">
          <ArrowRightLeft className="mr-2 h-5 w-5 text-primary" />
          Platform Migration Tool
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label className="text-sm mb-2 block text-white/80">Migrate from</Label>
            <Badge variant="outline" className="bg-primary/10 border-primary/20 text-white/90">
              {currentPlatform === 'bigquery' ? 'Google BigQuery' : 
               currentPlatform === 'snowflake' ? 'Snowflake' : 'Databricks'}
            </Badge>
          </div>
          
          <div>
            <Label className="text-sm mb-2 block text-white/80">Migrate to</Label>
            <RadioGroup 
              value={targetPlatform || undefined} 
              onValueChange={(value) => setTargetPlatform(value as Platform)}
              className="flex space-x-4"
            >
              {(['bigquery', 'snowflake', 'databricks'] as Platform[])
                .filter(platform => platform !== currentPlatform)
                .map(platform => (
                  <div key={platform} className="flex items-center space-x-2">
                    <RadioGroupItem value={platform} id={platform} className="text-primary border-white/20" />
                    <Label htmlFor={platform} className="cursor-pointer text-white/80">
                      {platform === 'bigquery' ? 'Google BigQuery' : 
                       platform === 'snowflake' ? 'Snowflake' : 'Databricks'}
                    </Label>
                  </div>
                ))
              }
            </RadioGroup>
          </div>
          
          <Button 
            onClick={handleMigrate} 
            disabled={isLoading || !targetPlatform || !sql.trim()}
            variant="gradient"
            className="w-full"
          >
            {isLoading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Migrating...
              </>
            ) : (
              <>
                <ArrowRightLeft className="mr-2 h-4 w-4" />
                Migrate Query
              </>
            )}
          </Button>
          
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full bg-white/5" />
              <Skeleton className="h-10 w-3/4 bg-white/5" />
              <Skeleton className="h-60 w-full bg-white/5" />
            </div>
          ) : migrationResult ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-medium text-white/90">Migration Results</h3>
                  <Badge 
                    variant="outline" 
                    className={
                      migrationResult.compatibilityScore >= 80 
                        ? "bg-green-900/20 text-green-400 border-green-500/30" 
                        : migrationResult.compatibilityScore >= 50 
                          ? "bg-yellow-900/20 text-yellow-400 border-yellow-500/30"
                          : "bg-red-900/20 text-red-400 border-red-500/30"
                    }
                  >
                    {migrationResult.compatibilityScore}% compatible
                  </Badge>
                </div>
                
                <Button 
                  variant="glass" 
                  size="sm" 
                  onClick={handleApplyMigration}
                  disabled={migrationResult.issues.some(i => i.severity === 'error')}
                  className="text-white"
                >
                  <Check className="mr-1 h-3 w-3" />
                  Apply Migration
                </Button>
              </div>
              
              <Tabs defaultValue="diff" className="w-full">
                <TabsList className="w-full bg-card/50 backdrop-blur-sm border border-white/10">
                  <TabsTrigger value="diff" className="flex-1 data-[state=active]:bg-primary/20 data-[state=active]:text-white">
                    Differences
                  </TabsTrigger>
                  <TabsTrigger value="issues" className="flex-1 data-[state=active]:bg-primary/20 data-[state=active]:text-white">
                    Issues 
                    {migrationResult.issues.length > 0 && (
                      <Badge className="ml-2 bg-red-900/40 text-red-400 border-red-500/30">
                        {migrationResult.issues.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="diff" className="mt-2">
                  <QueryDiffViewer
                    originalQuery={migrationResult.originalQuery}
                    comparedQuery={migrationResult.convertedQuery}
                    originalTitle={`Original (${currentPlatform})`}
                    comparedTitle={`Converted (${targetPlatform})`}
                    errors={migrationResult.issues.map(issue => ({
                      message: issue.message,
                      line: issue.line,
                      suggestion: issue.suggestion
                    }))}
                  />
                </TabsContent>
                
                <TabsContent value="issues" className="mt-2">
                  <div className="border border-white/10 rounded-lg h-64 overflow-y-auto p-4 bg-card/50 backdrop-blur-sm">
                    {migrationResult.issues.length > 0 ? (
                      <div className="space-y-3">
                        {migrationResult.issues.map((issue, index) => (
                          <div 
                            key={index} 
                            className={`p-3 rounded-md border ${
                              issue.severity === 'error' 
                                ? 'bg-red-900/10 border-red-500/30' 
                                : issue.severity === 'warning'
                                  ? 'bg-yellow-900/10 border-yellow-500/30'
                                  : 'bg-blue-900/10 border-blue-500/30'
                            }`}
                          >
                            <div className="flex gap-2 items-start">
                              {issue.severity === 'error' ? (
                                <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                              ) : issue.severity === 'warning' ? (
                                <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                              ) : (
                                <Check className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                              )}
                              <div>
                                <div className="font-medium text-sm text-white/90">
                                  {issue.message}
                                  {issue.line && <span className="ml-2 text-white/60">Line {issue.line}</span>}
                                </div>
                                <p className="text-xs mt-1 text-white/60">
                                  {issue.suggestion}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-white/60">
                        <div className="text-center">
                          <Check className="h-8 w-8 text-green-500 mx-auto mb-2" />
                          <p>No issues detected with this migration!</p>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
              
              <div className="space-y-2 mt-4">
                <h4 className="text-sm font-medium text-white/80">Platform-Specific Information</h4>
                
                {migrationResult.targetPlatform === 'bigquery' && (
                  <div className="bg-card/30 backdrop-blur-sm p-3 rounded-md text-sm space-y-2 border border-white/5">
                    <p><strong className="text-primary">BigQuery Specifics:</strong> BigQuery uses standard SQL with some Google-specific extensions.</p>
                    <ul className="list-disc pl-5 space-y-1 text-white/70">
                      <li>Date functions like <code className="text-primary/90">CURRENT_TIMESTAMP()</code> are BigQuery-specific</li>
                      <li>Table names should be in the format <code className="text-primary/90">project.dataset.table</code></li>
                      <li>BigQuery support for arrays and structs differs from other platforms</li>
                    </ul>
                  </div>
                )}
                
                {migrationResult.targetPlatform === 'snowflake' && (
                  <div className="bg-card/30 backdrop-blur-sm p-3 rounded-md text-sm space-y-2 border border-white/5">
                    <p><strong className="text-primary">Snowflake Specifics:</strong> Snowflake has its own SQL dialect with unique features.</p>
                    <ul className="list-disc pl-5 space-y-1 text-white/70">
                      <li>Use <code className="text-primary/90">DATEADD</code> instead of <code className="text-primary/90">DATE_ADD</code> for date arithmetic</li>
                      <li>Tables are referenced as <code className="text-primary/90">database.schema.table</code></li>
                      <li>Snowflake has specific semi-structured data handling with VARIANT type</li>
                    </ul>
                  </div>
                )}
                
                {migrationResult.targetPlatform === 'databricks' && (
                  <div className="bg-card/30 backdrop-blur-sm p-3 rounded-md text-sm space-y-2 border border-white/5">
                    <p><strong className="text-primary">Databricks Specifics:</strong> Databricks SQL is based on Apache Spark SQL with extensions.</p>
                    <ul className="list-disc pl-5 space-y-1 text-white/70">
                      <li>Databricks supports Delta Lake syntax for table operations</li>
                      <li>Hive-style functions may be available</li>
                      <li>OPTIMIZE and ZORDER BY are unique to Delta Lake/Databricks</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
};

export default PlatformMigrationTool;
