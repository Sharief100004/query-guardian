
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CircleDollarSign, PieChart, TrendingUp, Scale, Clock, Calculator, AlertCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Platform } from "@/utils/sqlValidator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { estimateQueryCost, CostEstimate } from '@/utils/sqlCostEstimator';

interface QueryCostEstimatorProps {
  sql: string;
  platform: Platform;
}

const QueryCostEstimator: React.FC<QueryCostEstimatorProps> = ({ sql, platform }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [costEstimate, setCostEstimate] = useState<CostEstimate | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Create a lowercase version of SQL for pattern matching
  const sqlLower = sql.toLowerCase();
  
  // Estimate costs when SQL changes
  useEffect(() => {
    if (!sql.trim()) {
      setIsLoading(false);
      setErrorMessage("No SQL query to analyze");
      return;
    }
    
    setIsLoading(true);
    setErrorMessage(null);
    
    const estimateCost = async () => {
      try {
        // Delay to simulate cost calculation
        await new Promise(resolve => setTimeout(resolve, 600));
        const result = estimateQueryCost(sql, platform);
        setCostEstimate(result);
        setErrorMessage(null);
      } catch (error) {
        console.error("Error estimating cost:", error);
        setErrorMessage("Failed to estimate query cost");
        setCostEstimate(null);
      } finally {
        setIsLoading(false);
      }
    };
    
    estimateCost();
  }, [sql, platform]);
  
  // Helper function to get complexity badge color
  const getComplexityColor = (complexity: 'low' | 'medium' | 'high'): string => {
    switch (complexity) {
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default: return '';
    }
  };
  
  // Platform-specific labels
  const getPlatformCostUnit = (): string => {
    switch (platform) {
      case 'bigquery': return 'Data Processed';
      case 'snowflake': return 'Credits';
      case 'databricks': return 'DBUs';
      default: return 'Units';
    }
  };

  // Platform-specific rate info
  const getPlatformRateInfo = (): string => {
    switch (platform) {
      case 'bigquery': return '$5.00 per TB processed';
      case 'snowflake': return '$2.50 per credit (Medium warehouse)';
      case 'databricks': return '$0.55 per DBU-hour (All-Purpose)';
      default: return '';
    }
  };
  
  // Get specific compute resources info
  const getComputeResourceInfo = (): string => {
    switch (platform) {
      case 'bigquery': return 'Slot allocation: Auto';
      case 'snowflake': return 'Warehouse size: Medium (2 credits/hr)';
      case 'databricks': return 'Cluster size: Auto-scaling';
      default: return '';
    }
  };
  
  return (
    <Card className="border-accent/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center">
          <CircleDollarSign className="mr-2 h-5 w-5 text-primary" />
          {platform === 'bigquery' ? 'BigQuery' : platform === 'snowflake' ? 'Snowflake' : 'Databricks'} Cost Estimator
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-10 w-1/2" />
          </div>
        ) : errorMessage ? (
          <div className="text-center py-4 text-muted-foreground">
            <p>{errorMessage}</p>
          </div>
        ) : costEstimate ? (
          <Tabs defaultValue="overview">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="recommendations">Optimizations</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="py-2">
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div className="bg-muted/40 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Estimated Cost</h4>
                      <div className="text-2xl font-bold mt-1">
                        ${costEstimate.estimatedCost.toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {getPlatformRateInfo()}
                      </div>
                    </div>
                    <CircleDollarSign className="h-5 w-5 text-primary" />
                  </div>
                </div>
                
                <div className="bg-muted/40 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Complexity</h4>
                      <div className="mt-1">
                        <Badge className={getComplexityColor(costEstimate.complexity)}>
                          {costEstimate.complexity.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {getComputeResourceInfo()}
                      </div>
                    </div>
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                </div>
                
                <div className="bg-muted/40 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">{getPlatformCostUnit()}</h4>
                      <div className="text-xl font-bold mt-1">
                        {platform === 'bigquery' 
                          ? costEstimate.dataScanned 
                          : costEstimate.processingUnits.toFixed(2)}
                      </div>
                      {platform !== 'bigquery' && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {costEstimate.dataScanned} data processed
                        </div>
                      )}
                    </div>
                    <Scale className="h-5 w-5 text-primary" />
                  </div>
                </div>
                
                <div className="bg-muted/40 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Est. Runtime</h4>
                      <div className="text-xl font-bold mt-1">
                        {costEstimate.executionTime}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Estimated execution time
                      </div>
                    </div>
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="details" className="py-2">
              <div className="space-y-4 mt-2">
                <div className="bg-muted/40 rounded-lg p-4">
                  <h4 className="text-sm font-medium">Cost Breakdown</h4>
                  
                  <div className="mt-2 space-y-2">
                    {platform === 'bigquery' && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Data Processed:</span>
                          <span>{costEstimate.dataScanned}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">On-demand Rate:</span>
                          <span>$5.00 per TB</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Calculate Cost:</span>
                          <span className="flex items-center">
                            <Calculator className="h-3 w-3 mr-1" />
                            <span>{costEstimate.dataScanned} × $5/TB ÷ 1000</span>
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Query Complexity:</span>
                          <Badge className={getComplexityColor(costEstimate.complexity)}>
                            {costEstimate.complexity.toUpperCase()}
                          </Badge>
                        </div>
                      </>
                    )}
                    
                    {platform === 'snowflake' && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Estimated Credits:</span>
                          <span>{costEstimate.processingUnits.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Warehouse Size:</span>
                          <span>Medium (2 credits/hour)</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Calculate Cost:</span>
                          <span className="flex items-center">
                            <Calculator className="h-3 w-3 mr-1" />
                            <span>{costEstimate.processingUnits.toFixed(2)} credits × $2.50</span>
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Runtime Factor:</span>
                          <span>{costEstimate.executionTime} / 3600 × 2 credits/hour</span>
                        </div>
                      </>
                    )}
                    
                    {platform === 'databricks' && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Estimated DBUs:</span>
                          <span>{costEstimate.processingUnits.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Compute Type:</span>
                          <span>All-Purpose ($0.55/DBU-hour)</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Calculate Cost:</span>
                          <span className="flex items-center">
                            <Calculator className="h-3 w-3 mr-1" />
                            <span>{costEstimate.processingUnits.toFixed(2)} DBUs × runtime × $0.55</span>
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Runtime Factor:</span>
                          <span>{costEstimate.executionTime} runtime</span>
                        </div>
                      </>
                    )}
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Execution Time:</span>
                      <span>{costEstimate.executionTime}</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-muted/40 rounded-lg p-4">
                  <h4 className="text-sm font-medium">Platform-Specific Details</h4>
                  <div className="mt-2 space-y-2 text-sm">
                    {platform === 'bigquery' && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Slots Utilized:</span>
                          <span>{200 + Math.round(Math.random() * 800)} slots</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Storage Format:</span>
                          <span>Capacitor (columnar)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Shuffle Data:</span>
                          <span>{Math.round(parseInt(costEstimate.dataScanned) * 0.12)} MB</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Cost Optimized:</span>
                          <span>{costEstimate.recommendations.length > 0 ? 'No' : 'Yes'}</span>
                        </div>
                      </>
                    )}
                    
                    {platform === 'snowflake' && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Cache Utilization:</span>
                          <span>{Math.round(Math.random() * 60)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Pruning Efficiency:</span>
                          <span>{30 + Math.round(Math.random() * 50)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Partitioning:</span>
                          <span>{sqlLower.includes('partition') ? 'Used' : 'Not Used'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Micro-partitions:</span>
                          <span>{Math.round(Math.random() * 200 + 50)}</span>
                        </div>
                      </>
                    )}
                    
                    {platform === 'databricks' && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Photon Acceleration:</span>
                          <span>{sqlLower.includes('select *') ? 'Partial' : 'Full'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Delta Lake Features:</span>
                          <span>{sqlLower.includes('delta') ? 'Enabled' : 'Not Used'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">I/O Skipping:</span>
                          <span>{sqlLower.includes('where') ? '50-70%' : 'Minimal'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Workers:</span>
                          <span>{2 + Math.round(Math.random() * 6)} worker nodes</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="recommendations" className="py-2">
              <div className="space-y-3 mt-2">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold">Cost Optimization Recommendations</h4>
                  {costEstimate.recommendations.length > 0 && (
                    <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
                      {costEstimate.recommendations.length} improvement{costEstimate.recommendations.length > 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
                
                {costEstimate.recommendations.length > 0 ? (
                  <ul className="space-y-2">
                    {costEstimate.recommendations.map((rec, index) => (
                      <li key={index} className="bg-muted/40 p-3 rounded-md text-sm flex items-start">
                        <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mr-2 mt-0.5 flex-shrink-0" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="bg-green-100/50 dark:bg-green-900/20 text-green-800 dark:text-green-400 p-3 rounded-md text-sm flex items-start">
                    <span>No specific cost optimization recommendations for this query. Your query is well optimized!</span>
                  </div>
                )}
                
                <div className="mt-4">
                  <h4 className="text-sm font-semibold mb-2">Platform Best Practices</h4>
                  
                  {platform === 'bigquery' && (
                    <ul className="space-y-2">
                      <li className="bg-muted/40 p-3 rounded-md text-sm">
                        Use partitioned tables to reduce data scanned (up to 80% cost reduction)
                      </li>
                      <li className="bg-muted/40 p-3 rounded-md text-sm">
                        Apply clustering to improve filter and aggregation performance (~40% cost reduction)
                      </li>
                      <li className="bg-muted/40 p-3 rounded-md text-sm">
                        Consider using BI Engine for frequently run queries (faster results, fixed-cost model)
                      </li>
                      <li className="bg-muted/40 p-3 rounded-md text-sm">
                        Use a slot commitment for predictable workloads (up to 70% cost savings vs on-demand)
                      </li>
                    </ul>
                  )}
                  
                  {platform === 'snowflake' && (
                    <ul className="space-y-2">
                      <li className="bg-muted/40 p-3 rounded-md text-sm">
                        Use auto-suspend to avoid idle warehouse costs (recommended 5-10 min idle timeout)
                      </li>
                      <li className="bg-muted/40 p-3 rounded-md text-sm">
                        Leverage auto-scaling to handle varying workloads efficiently
                      </li>
                      <li className="bg-muted/40 p-3 rounded-md text-sm">
                        Use clustering keys for frequently filtered columns (30-60% performance gain)
                      </li>
                      <li className="bg-muted/40 p-3 rounded-md text-sm">
                        Consider using materialized views for complex, frequent queries
                      </li>
                    </ul>
                  )}
                  
                  {platform === 'databricks' && (
                    <ul className="space-y-2">
                      <li className="bg-muted/40 p-3 rounded-md text-sm">
                        Use Delta Lake format for better performance and data reliability
                      </li>
                      <li className="bg-muted/40 p-3 rounded-md text-sm">
                        Optimize Delta tables with Z-Ordering on frequently filtered columns
                      </li>
                      <li className="bg-muted/40 p-3 rounded-md text-sm">
                        Use cluster auto-scaling to match resources with workload demands
                      </li>
                      <li className="bg-muted/40 p-3 rounded-md text-sm">
                        Consider SQL warehouses for interactive queries (automatic scaling)
                      </li>
                    </ul>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default QueryCostEstimator;
