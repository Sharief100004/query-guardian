import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  SqlAnalysisResult,
  BestPracticeIssue,
  PerformanceIssue,
  ModularizationIssue,
  CostIssue,
  Platform,
} from "@/utils/sqlValidator";
import { toast } from "sonner";

interface AnalysisReportProps {
  result: SqlAnalysisResult | null;
  platform: Platform;
  sql: string;
}

const AnalysisReport = ({ result, platform, sql }: AnalysisReportProps) => {
  const [activeTab, setActiveTab] = useState("summary");

  if (!result) {
    return (
      <Card className="border-accent/20 h-96 flex items-center justify-center animate-pulse">
        <CardContent className="text-center">
          <p className="text-muted-foreground">
            Run the SQL analyzer to see results
          </p>
        </CardContent>
      </Card>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    if (score >= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  const getSeverityIcon = (severity: "low" | "medium" | "high") => {
    switch (severity) {
      case "high":
        return <AlertCircle className="h-5 w-5 text-destructive" />;
      case "medium":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case "low":
        return <Info className="h-5 w-5 text-blue-500" />;
      default:
        return null;
    }
  };

  const exportReport = () => {
    if (!result) return;

    const platformName = {
      bigquery: "Google BigQuery",
      snowflake: "Snowflake",
      databricks: "Databricks",
    }[platform];

    const reportData = {
      timestamp: new Date().toISOString(),
      platform: platformName,
      sql,
      scores: result.summary,
      issues: {
        bestPractices: result.bestPractices,
        performance: result.performance,
        modularization: result.modularization,
        cost: result.cost,
      },
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sql-analysis-report-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("Report exported successfully");
  };

  return (
    <Card className="border-accent/20">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>SQL Analysis Report</CardTitle>
            <CardDescription>
              {platform === "bigquery"
                ? "Google BigQuery"
                : platform === "snowflake"
                ? "Snowflake"
                : "Databricks"}{" "}
              query analysis
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
            onClick={exportReport}
          >
            <Download size={14} />
            <span>Export</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs
          defaultValue="summary"
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="grid grid-cols-5 w-full rounded-none border-b">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="bestPractices">Best Practices</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="modularization">Modularization</TabsTrigger>
            <TabsTrigger value="cost">Cost</TabsTrigger>
          </TabsList>

          <div className="p-4">
            <TabsContent value="summary" className="mt-0">
              <div className="space-y-6">
                <div className="text-center py-4">
                  <div className="inline-flex items-center justify-center h-24 w-24 rounded-full bg-card border-4 border-primary mb-4">
                    <span className="text-3xl font-bold">
                      {result.summary.score}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold">
                    Overall SQL Quality Score
                  </h3>
                </div>

                <div className="grid gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Best Practices</span>
                      <span className="text-sm font-medium">
                        {result.summary.bestPracticesScore}/100
                      </span>
                    </div>
                    <Progress
                      value={result.summary.bestPracticesScore}
                      max={100}
                      className={`h-2 ${getScoreColor(result.summary.bestPracticesScore)}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Performance</span>
                      <span className="text-sm font-medium">
                        {result.summary.performanceScore}/100
                      </span>
                    </div>
                    <Progress
                      value={result.summary.performanceScore}
                      max={100}
                      className={`h-2 ${getScoreColor(result.summary.performanceScore)}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">
                        Modularization
                      </span>
                      <span className="text-sm font-medium">
                        {result.summary.modularizationScore}/100
                      </span>
                    </div>
                    <Progress
                      value={result.summary.modularizationScore}
                      max={100}
                      className={`h-2 ${getScoreColor(result.summary.modularizationScore)}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Cost Efficiency</span>
                      <span className="text-sm font-medium">
                        {result.summary.costScore}/100
                      </span>
                    </div>
                    <Progress
                      value={result.summary.costScore}
                      max={100}
                      className={`h-2 ${getScoreColor(result.summary.costScore)}`}
                    />
                  </div>
                </div>

                <div className="rounded-md bg-muted/50 p-4">
                  <h4 className="font-medium mb-2">Key Findings:</h4>
                  <div className="space-y-3">
                    {result.bestPractices.length > 0 || 
                     result.performance.length > 0 || 
                     result.modularization.length > 0 || 
                     result.cost.length > 0 ? (
                      <>
                        {result.bestPractices.length > 0 && (
                          <p className="text-sm">
                            <span className="text-yellow-400">• </span>
                            Found {result.bestPractices.length} best practice {result.bestPractices.length === 1 ? 'issue' : 'issues'}
                          </p>
                        )}
                        {result.performance.length > 0 && (
                          <p className="text-sm">
                            <span className="text-red-400">• </span>
                            Identified {result.performance.length} performance {result.performance.length === 1 ? 'concern' : 'concerns'}
                          </p>
                        )}
                        {result.modularization.length > 0 && (
                          <p className="text-sm">
                            <span className="text-blue-400">• </span>
                            Detected {result.modularization.length} modularization {result.modularization.length === 1 ? 'improvement' : 'improvements'}
                          </p>
                        )}
                        {result.cost.length > 0 && (
                          <p className="text-sm">
                            <span className="text-green-400">• </span>
                            Found {result.cost.length} cost optimization {result.cost.length === 1 ? 'opportunity' : 'opportunities'}
                          </p>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center gap-2 text-green-400">
                        <CheckCircle2 size={16} />
                        <span className="text-sm">No issues found. Great job!</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="bestPractices" className="mt-0">
              <IssuesList
                issues={result.bestPractices}
                type="Best Practices"
                emptyMessage="No best practice issues found. Your query follows recommended guidelines."
              />
            </TabsContent>

            <TabsContent value="performance" className="mt-0">
              <IssuesList
                issues={result.performance}
                type="Performance"
                emptyMessage="No performance issues found. Your query is optimized for speed."
              />
            </TabsContent>

            <TabsContent value="modularization" className="mt-0">
              <IssuesList
                issues={result.modularization}
                type="Modularization"
                emptyMessage="No modularization issues found. Your query is well-structured."
              />
            </TabsContent>

            <TabsContent value="cost" className="mt-0">
              <IssuesList
                issues={result.cost}
                type="Cost Efficiency"
                emptyMessage="No cost issues found. Your query is optimized for resource usage."
              />
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
};

type IssuesListProps = {
  issues: Array<BestPracticeIssue | PerformanceIssue | ModularizationIssue | CostIssue>;
  type: string;
  emptyMessage: string;
};

const IssuesList = ({ issues, type, emptyMessage }: IssuesListProps) => {
  const getSeverityIcon = (severity: "low" | "medium" | "high") => {
    switch (severity) {
      case "high":
        return <AlertCircle className="h-5 w-5 text-destructive" />;
      case "medium":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case "low":
        return <Info className="h-5 w-5 text-blue-500" />;
      default:
        return null;
    }
  };

  if (issues.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-green-500 mb-2" />
          <p className="text-muted-foreground">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">{type} Issues</h3>
      <div className="space-y-3">
        {issues.map((issue) => (
          <div
            key={issue.id}
            className="p-4 border border-border rounded-md bg-card hover:bg-muted/20 transition-colors"
          >
            <div className="flex gap-3">
              <div className="mt-0.5">{getSeverityIcon(issue.severity)}</div>
              <div className="space-y-2 flex-1">
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium flex items-center">
                      <span>{issue.message}</span>
                    </h4>
                    <span className="text-xs uppercase bg-muted px-2 py-1 rounded-full font-medium">
                      {issue.severity}
                    </span>
                  </div>
                  {issue.line && (
                    <p className="text-xs text-muted-foreground">
                      Line: {issue.line}
                      {issue.col ? `, Column: ${issue.col}` : ""}
                    </p>
                  )}
                </div>
                <p className="text-sm">{issue.recommendation}</p>
                {"estimatedImpact" in issue && (
                  <p className="text-xs text-primary">
                    Impact: {issue.estimatedImpact}
                  </p>
                )}
                {"estimatedSavings" in issue && (
                  <p className="text-xs text-green-400">
                    Potential savings: {issue.estimatedSavings}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AnalysisReport;
