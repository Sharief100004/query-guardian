
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { X, Check, AlertTriangle, AlertCircle, Zap } from "lucide-react";
import { ComparisonQueryItem } from "./QueryComparisonModal";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ComparisonItemProps {
  query: ComparisonQueryItem;
  onRemove: (id: string) => void;
}

const ComparisonItem = ({ query, onRemove }: ComparisonItemProps) => {
  // Calculate issue counts for each category
  const bestPracticesCount = query.result.bestPractices.length;
  const performanceCount = query.result.performance.length;
  const modularizationCount = query.result.modularization.length;
  const costCount = query.result.cost.length;
  
  // Calculate color based on score
  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    if (score >= 60) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
  };

  // Get icon based on issue count
  const getIssueIcon = (count: number) => {
    if (count === 0) return <Check className="h-3 w-3 text-green-500" />;
    if (count <= 2) return <AlertTriangle className="h-3 w-3 text-yellow-500" />;
    return <AlertCircle className="h-3 w-3 text-red-500" />;
  };
  
  // Format SQL with syntax highlighting (basic version)
  const formatSql = (sql: string) => {
    // Simple regex-based highlighting for SQL keywords
    const sqlWithHighlights = sql
      .replace(/\b(SELECT|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|OUTER|FULL|ON|GROUP BY|ORDER BY|HAVING|LIMIT|OFFSET|UNION|ALL|AS|AND|OR|NOT|IN|EXISTS|BETWEEN|LIKE|IS NULL|IS NOT NULL|ASC|DESC|DISTINCT|COUNT|SUM|AVG|MIN|MAX|WITH|CASE|WHEN|THEN|ELSE|END|CAST|COALESCE|NULLIF)\b/gi, 
        match => `<span class="text-blue-600 dark:text-blue-400 font-medium">${match}</span>`)
      .replace(/('.*?'|".*?")/g, 
        match => `<span class="text-green-600 dark:text-green-400">${match}</span>`)
      .replace(/\b(\d+)\b/g, 
        match => `<span class="text-purple-600 dark:text-purple-400">${match}</span>`)
      .replace(/--.*$/gm, 
        match => `<span class="text-gray-500 dark:text-gray-400">${match}</span>`);
      
    return <div dangerouslySetInnerHTML={{ __html: sqlWithHighlights }} />;
  };
  
  return (
    <div className="flex flex-col h-full border-r dark:border-gray-800">
      <div className="flex items-center justify-between p-3 border-b dark:border-gray-800">
        <div className="flex flex-col">
          <h3 className="font-medium truncate">{query.name}</h3>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">
              {query.platform}
            </span>
            <Badge variant="outline" className="text-[9px] h-4 px-1 rounded-sm">
              {new Date(query.timestamp).toLocaleDateString()}
            </Badge>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRemove(query.id)}
          className="h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Remove</span>
        </Button>
      </div>
      <ScrollArea className="flex-1 p-3">
        <div className="text-xs font-mono whitespace-pre-wrap break-all rounded bg-muted/50 p-2">
          {formatSql(query.sql)}
        </div>
        <div className="mt-3 border-t pt-2 dark:border-gray-800">
          <h4 className="text-xs font-medium mb-1">Key SQL Elements:</h4>
          <div className="flex flex-wrap gap-1 text-[10px]">
            {query.sql.includes("SELECT") && <Badge variant="secondary" className="h-5">SELECT</Badge>}
            {query.sql.includes("JOIN") && <Badge variant="secondary" className="h-5">JOIN</Badge>}
            {query.sql.includes("WHERE") && <Badge variant="secondary" className="h-5">WHERE</Badge>}
            {query.sql.includes("GROUP BY") && <Badge variant="secondary" className="h-5">GROUP BY</Badge>}
            {query.sql.includes("ORDER BY") && <Badge variant="secondary" className="h-5">ORDER BY</Badge>}
            {query.sql.includes("LIMIT") && <Badge variant="secondary" className="h-5">LIMIT</Badge>}
            {query.sql.includes("HAVING") && <Badge variant="secondary" className="h-5">HAVING</Badge>}
            {query.sql.includes("UNION") && <Badge variant="secondary" className="h-5">UNION</Badge>}
            {query.sql.includes("CASE") && <Badge variant="secondary" className="h-5">CASE</Badge>}
            {query.sql.includes("DISTINCT") && <Badge variant="secondary" className="h-5">DISTINCT</Badge>}
          </div>
        </div>
      </ScrollArea>
      <div className="p-3 border-t dark:border-gray-800 bg-muted/40">
        <div className="flex justify-between mb-2">
          <span className="text-sm">Overall Score:</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span 
                  className={`inline-flex items-center justify-center w-12 h-6 text-sm rounded-md ${
                    getScoreColor(query.result.summary.score)
                  }`}
                >
                  {query.result.summary.score}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Combined score based on all categories</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {getIssueIcon(bestPracticesCount)}
              <span>Best Practices:</span>
            </div>
            <div className="flex items-center gap-1">
              <span>{query.result.summary.bestPracticesScore}</span>
              {bestPracticesCount > 0 && (
                <Badge variant="outline" className="text-[10px] h-4 rounded-sm">
                  {bestPracticesCount} {bestPracticesCount === 1 ? 'issue' : 'issues'}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {getIssueIcon(performanceCount)}
              <span>Performance:</span>
            </div>
            <div className="flex items-center gap-1">
              <span>{query.result.summary.performanceScore}</span>
              {performanceCount > 0 && (
                <Badge variant="outline" className="text-[10px] h-4 rounded-sm">
                  {performanceCount} {performanceCount === 1 ? 'issue' : 'issues'}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {getIssueIcon(modularizationCount)}
              <span>Modularization:</span>
            </div>
            <div className="flex items-center gap-1">
              <span>{query.result.summary.modularizationScore}</span>
              {modularizationCount > 0 && (
                <Badge variant="outline" className="text-[10px] h-4 rounded-sm">
                  {modularizationCount} {modularizationCount === 1 ? 'issue' : 'issues'}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {getIssueIcon(costCount)}
              <span>Cost:</span>
            </div>
            <div className="flex items-center gap-1">
              <span>{query.result.summary.costScore}</span>
              {costCount > 0 && (
                <Badge variant="outline" className="text-[10px] h-4 rounded-sm">
                  {costCount} {costCount === 1 ? 'issue' : 'issues'}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComparisonItem;
