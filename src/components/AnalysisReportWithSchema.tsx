
import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CircleDollarSign, FileText, Zap, Database, ArrowRightLeft, Code2, GitGraph } from 'lucide-react';
import { Platform, SqlAnalysisResult } from '@/utils/sqlValidator';
import AnalysisReport from './AnalysisReport';
import SchemaVisualization from './SchemaVisualization';
import QueryCostEstimator from './QueryCostEstimator';
import PlatformMigrationTool from './PlatformMigrationTool';
import SqlSyntaxHighlighter from './SqlSyntaxHighlighter';

interface AnalysisReportWithSchemaProps {
  result: SqlAnalysisResult | null;
  platform: Platform;
  sql: string;
}

const AnalysisReportWithSchema: React.FC<AnalysisReportWithSchemaProps> = ({
  result,
  platform,
  sql
}) => {
  const [updatedSql, setUpdatedSql] = useState(sql);
  
  const handleApplyMigration = (migratedSql: string) => {
    setUpdatedSql(migratedSql);
    // You would typically want to bubble this up to the parent component
    // to update the editor, but for now we'll just track it internally
  };
  
  return (
    <Card className="border-accent/20 h-full">
      <Tabs defaultValue="report" className="h-full">
        <div className="px-4 pt-2 border-b border-border">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="report">
              <FileText className="h-4 w-4 mr-2" />
              <span>Analysis Report</span>
            </TabsTrigger>
            
            <TabsTrigger value="schema">
              <Database className="h-4 w-4 mr-2" />
              <span>Schema</span>
              <Badge variant="outline" className="ml-2 bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 text-xs">Updated</Badge>
            </TabsTrigger>

            <TabsTrigger value="syntax">
              <Code2 className="h-4 w-4 mr-2" />
              <span>Syntax Highlighting</span>
            </TabsTrigger>
            
            <TabsTrigger value="cost">
              <CircleDollarSign className="h-4 w-4 mr-2" />
              <span>Cost Estimator</span>
            </TabsTrigger>
            
            <TabsTrigger value="migration">
              <ArrowRightLeft className="h-4 w-4 mr-2" />
              <span>Migration</span>
            </TabsTrigger>
          </TabsList>
        </div>
        
        <CardContent className="p-0 pt-2 h-[calc(100%-41px)] overflow-auto">
          <TabsContent value="report" className="m-0 p-4 h-full">
            {result ? (
              <AnalysisReport 
                result={result} 
                platform={platform} 
                sql={sql} 
              />
            ) : (
              <div className="flex items-center justify-center h-full flex-col space-y-4 p-4">
                <div className="rounded-full bg-muted/60 p-3">
                  <Zap className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-medium">No Analysis Results</h3>
                  <p className="text-muted-foreground mt-1">
                    Click Analyze to evaluate your SQL query
                  </p>
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="schema" className="m-0 p-4 h-full">
            <SchemaVisualization sql={sql} platform={platform} />
          </TabsContent>

          <TabsContent value="syntax" className="m-0 p-4 h-full">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-medium">Platform-Specific Syntax Highlighting</h3>
                <Badge variant="outline" className="bg-primary/10 text-primary">
                  {platform === 'bigquery' ? 'BigQuery' : platform === 'snowflake' ? 'Snowflake' : 'Databricks'}
                </Badge>
              </div>
              
              <p className="text-sm text-muted-foreground">
                Highlighting optimized for {platform === 'bigquery' ? 'Google BigQuery' : platform === 'snowflake' ? 'Snowflake' : 'Databricks'} 
                dialect. Platform-specific syntax is highlighted with distinct colors.
              </p>
              
              <div className="border rounded-md">
                <SqlSyntaxHighlighter sql={sql} platform={platform} />
              </div>
              
              <div className="grid grid-cols-3 gap-2 mt-4">
                <div className="p-2 border rounded-md">
                  <p className="text-xs font-medium mb-1">Common SQL</p>
                  <div className="space-y-1">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-blue-600 dark:bg-blue-400 rounded-full mr-2"></div>
                      <span className="text-xs">Keywords</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-indigo-600 dark:bg-indigo-400 rounded-full mr-2"></div>
                      <span className="text-xs">Functions</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-amber-600 dark:bg-amber-400 rounded-full mr-2"></div>
                      <span className="text-xs">Strings</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-cyan-700 dark:bg-cyan-400 rounded-full mr-2"></div>
                      <span className="text-xs">Numbers</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-2 border rounded-md">
                  <p className="text-xs font-medium mb-1">Platform-Specific</p>
                  <div className="space-y-1">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-purple-700 dark:bg-purple-400 rounded-full mr-2"></div>
                      <span className="text-xs">Keywords</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-rose-600 dark:bg-rose-400 rounded-full mr-2"></div>
                      <span className="text-xs">Functions</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-pink-600 dark:bg-pink-400 rounded-full mr-2"></div>
                      <span className="text-xs">Literals</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-2 border rounded-md">
                  <p className="text-xs font-medium mb-1">Other Elements</p>
                  <div className="space-y-1">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-green-600 dark:bg-green-400 rounded-full mr-2"></div>
                      <span className="text-xs">Comments</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-gray-600 dark:bg-gray-400 rounded-full mr-2"></div>
                      <span className="text-xs">Operators</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="cost" className="m-0 p-4 h-full">
            <QueryCostEstimator sql={sql} platform={platform} />
          </TabsContent>
          
          <TabsContent value="migration" className="m-0 p-4 h-full">
            <PlatformMigrationTool 
              sql={sql} 
              currentPlatform={platform} 
              onApplyMigration={handleApplyMigration} 
            />
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
};

export default AnalysisReportWithSchema;
