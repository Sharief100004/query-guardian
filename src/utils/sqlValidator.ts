import { toast } from "sonner";

export type Platform = 'bigquery' | 'snowflake' | 'databricks';

export type SqlAnalysisResult = {
  valid: boolean;
  bestPractices: BestPracticeIssue[];
  performance: PerformanceIssue[];
  modularization: ModularizationIssue[];
  cost: CostIssue[];
  summary: {
    score: number;
    bestPracticesScore: number;
    performanceScore: number;
    modularizationScore: number;
    costScore: number;
  }
};

export type BestPracticeIssue = {
  id: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
  name: string;
  description: string;
  line?: number;
  col?: number;
  recommendation: string;
};

export type PerformanceIssue = {
  id: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
  name: string;
  description: string;
  line?: number;
  col?: number;
  recommendation: string;
  estimatedImpact: string;
};

export type ModularizationIssue = {
  id: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
  name: string;
  description: string;
  line?: number;
  col?: number;
  recommendation: string;
};

export type CostIssue = {
  id: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
  name: string;
  description: string;
  line?: number;
  col?: number;
  recommendation: string;
  estimatedSavings: string;
};

export async function validateSql(
  sql: string, 
  platform: Platform, 
  customRules?: Record<string, any>
): Promise<SqlAnalysisResult> {
  if (!sql.trim()) {
    toast.error("SQL query cannot be empty");
    return createEmptyResult();
  }

  try {
    await new Promise(resolve => setTimeout(resolve, 1200));

    const bestPractices = customRules 
      ? analyzeWithCustomRules(sql, platform, 'Best Practices', customRules)
      : analyzeBestPractices(sql, platform);
      
    const performance = customRules
      ? analyzeWithCustomRules(sql, platform, 'Performance', customRules)
      : analyzePerformance(sql, platform);
      
    const modularization = customRules
      ? analyzeWithCustomRules(sql, platform, 'Modularization', customRules)
      : analyzeModularization(sql, platform);
      
    const cost = customRules
      ? analyzeWithCustomRules(sql, platform, 'Cost', customRules)
      : analyzeCost(sql, platform);

    const bestPracticesScore = calculateScore(bestPractices);
    const performanceScore = calculateScore(performance);
    const modularizationScore = calculateScore(modularization);
    const costScore = calculateScore(cost);
    
    const score = Math.round(
      (bestPracticesScore * 0.25) + 
      (performanceScore * 0.3) + 
      (modularizationScore * 0.2) + 
      (costScore * 0.25)
    );

    return {
      valid: true,
      bestPractices,
      performance,
      modularization,
      cost,
      summary: {
        score,
        bestPracticesScore,
        performanceScore,
        modularizationScore,
        costScore
      }
    };
  } catch (error) {
    console.error("Error validating SQL:", error);
    toast.error("Failed to analyze SQL query");
    return createEmptyResult();
  }
}

function createEmptyResult(): SqlAnalysisResult {
  return {
    valid: false,
    bestPractices: [],
    performance: [],
    modularization: [],
    cost: [],
    summary: {
      score: 0,
      bestPracticesScore: 0,
      performanceScore: 0,
      modularizationScore: 0,
      costScore: 0
    }
  };
}

function calculateScore(issues: Array<BestPracticeIssue | PerformanceIssue | ModularizationIssue | CostIssue>): number {
  let score = 100;
  
  for (const issue of issues) {
    switch (issue.severity) {
      case 'high':
        score -= 15;
        break;
      case 'medium':
        score -= 10;
        break;
      case 'low':
        score -= 5;
        break;
    }
  }
  
  return Math.max(0, score);
}

function analyzeWithCustomRules(
  sql: string, 
  platform: Platform, 
  categoryName: string,
  customRules: Record<string, any>
): any[] {
  const sqlLower = sql.toLowerCase();
  const issues: any[] = [];
  
  if (!customRules || !customRules.rules) {
    return issues;
  }
  
  const category = customRules.rules.find((cat: any) => cat.name === categoryName);
  if (!category || !category.rules) {
    return issues;
  }
  
  const enabledRules = category.rules.filter((rule: any) => rule.enabled);
  
  for (const rule of enabledRules) {
    let matched = false;
    
    switch (rule.id) {
      case "BP001": // Avoid SELECT *
        if (sqlLower.includes("select *")) {
          matched = true;
          const lineNum = getLineNumber(sql, "select *");
          issues.push({
            id: rule.id,
            severity: rule.severity,
            message: rule.name,
            name: rule.name,
            description: rule.description,
            line: lineNum,
            recommendation: rule.description
          });
        }
        break;
        
      case "BP002": // Schema Qualification
        if (platform === 'bigquery' && sqlLower.includes("from ") && 
            !sqlLower.includes("from `")) {
          matched = true;
          issues.push({
            id: rule.id,
            severity: rule.severity,
            message: rule.name,
            name: rule.name,
            description: rule.description,
            recommendation: rule.description
          });
        } else if (platform === 'snowflake' && sqlLower.includes("from ") && 
                  !sqlLower.includes("from database.schema.")) {
          matched = true;
          issues.push({
            id: rule.id,
            severity: rule.severity,
            message: rule.name,
            name: rule.name,
            description: rule.description,
            recommendation: rule.description
          });
        }
        break;
        
      case "PERF001": // Subquery detection
        if (sqlLower.includes("select") && sqlLower.includes("(select")) {
          matched = true;
          issues.push({
            id: rule.id,
            severity: rule.severity,
            message: rule.name,
            name: rule.name,
            description: rule.description,
            recommendation: rule.description,
            estimatedImpact: "Could improve query time by 15-30%"
          });
        }
        break;
        
      case "PERF002": // Check for joins without conditions
        if ((sqlLower.includes(" join ") || sqlLower.includes(" inner join ")) && 
            !sqlLower.includes(" on ") && !sqlLower.includes(" using ")) {
          matched = true;
          issues.push({
            id: rule.id,
            severity: rule.severity,
            message: rule.name,
            name: rule.name,
            description: rule.description,
            recommendation: rule.description,
            estimatedImpact: "Could prevent exponential performance degradation"
          });
        }
        break;
        
      case "MOD001": // Check for complex query without CTEs
        if (sql.length > 300 && !sqlLower.includes("with ")) {
          matched = true;
          issues.push({
            id: rule.id,
            severity: rule.severity,
            message: rule.name,
            name: rule.name,
            description: rule.description,
            recommendation: rule.description
          });
        }
        break;
        
      case "MOD002": // Check for nested subqueries
        let count = 0;
        let pos = -1;
        
        while ((pos = sqlLower.indexOf("select", pos + 1)) !== -1) {
          count++;
        }
        
        if (count > 3) {
          matched = true;
          issues.push({
            id: rule.id,
            severity: rule.severity,
            message: rule.name,
            name: rule.name,
            description: rule.description,
            recommendation: rule.description
          });
        }
        break;
        
      case "COST001": // Check for full table scans
        if (!sqlLower.includes("where") && sqlLower.includes("from")) {
          matched = true;
          issues.push({
            id: rule.id,
            severity: rule.severity,
            message: rule.name,
            name: rule.name,
            description: rule.description,
            recommendation: rule.description,
            estimatedSavings: "Could reduce costs by 40-80%"
          });
        }
        break;
        
      case "COST002": // Check for ORDER BY without LIMIT
        if (sqlLower.includes("order by") && !sqlLower.includes("limit")) {
          matched = true;
          issues.push({
            id: rule.id,
            severity: rule.severity,
            message: rule.name,
            name: rule.name,
            description: rule.description,
            recommendation: rule.description,
            estimatedSavings: "Could reduce computational costs by 10-20%"
          });
        }
        break;
        
      default:
        if (rule.custom && rule.description) {
          const keywords = rule.description.toLowerCase()
            .split(' ')
            .filter((word: string) => word.length > 3)
            .slice(0, 3);
            
          if (keywords.some((keyword: string) => sqlLower.includes(keyword))) {
            matched = true;
            const issueObj: any = {
              id: rule.id,
              severity: rule.severity,
              message: rule.name,
              name: rule.name,
              description: rule.description,
              recommendation: rule.description
            };
            
            if (categoryName === 'Performance') {
              issueObj.estimatedImpact = "Impact varies based on query complexity";
            } else if (categoryName === 'Cost') {
              issueObj.estimatedSavings = "Savings depend on data volume and query frequency";
            }
            
            issues.push(issueObj);
          }
        }
        break;
    }
  }
  
  return issues;
}

function getLineNumber(sql: string, searchText: string): number | undefined {
  const lines = sql.toLowerCase().split('\n');
  const lineIndex = lines.findIndex(line => line.includes(searchText.toLowerCase()));
  return lineIndex !== -1 ? lineIndex + 1 : undefined;
}

function analyzeBestPractices(sql: string, platform: Platform): BestPracticeIssue[] {
  const issues: BestPracticeIssue[] = [];
  const sqlLower = sql.toLowerCase();
  
  if (sqlLower.includes("select *")) {
    issues.push({
      id: "BP001",
      severity: "medium",
      message: "Using SELECT * is not recommended",
      name: "Using SELECT * is not recommended",
      description: "Explicitly specify only the columns you need",
      line: getLineNumber(sql, "select *"),
      recommendation: "Explicitly specify only the columns you need"
    });
  }
  
  if (platform === "bigquery") {
    if (sqlLower.includes("select") && !sqlLower.includes("from")) {
      issues.push({
        id: "BP002",
        severity: "high",
        message: "Missing FROM clause in SELECT statement",
        name: "Missing FROM clause in SELECT statement",
        description: "Add a FROM clause to your SELECT statement",
        recommendation: "Add a FROM clause to your SELECT statement"
      });
    }
  }
  
  if (platform === "snowflake" && sqlLower.includes("date_trunc")) {
    issues.push({
      id: "BP003",
      severity: "low",
      message: "DATE_TRUNC function usage can be optimized in Snowflake",
      name: "DATE_TRUNC function usage can be optimized",
      description: "Consider using Snowflake's specific time functions for better performance",
      recommendation: "Consider using Snowflake's specific time functions for better performance"
    });
  }
  
  return issues;
}

function analyzePerformance(sql: string, platform: Platform): PerformanceIssue[] {
  const issues: PerformanceIssue[] = [];
  const sqlLower = sql.toLowerCase();
  
  if (sqlLower.includes("select") && sqlLower.includes("(select")) {
    issues.push({
      id: "PERF001",
      severity: "medium",
      message: "Subquery detected which may impact performance",
      name: "Subquery detected",
      description: "Subqueries may impact performance in certain scenarios",
      recommendation: "Consider using CTEs or JOINs instead of subqueries where possible",
      estimatedImpact: "Could improve query time by 15-30%"
    });
  }
  
  if ((sqlLower.includes(" join ") || sqlLower.includes(" inner join ")) && 
      !sqlLower.includes(" on ") && !sqlLower.includes(" using ")) {
    issues.push({
      id: "PERF002",
      severity: "high",
      message: "JOIN without condition found (potential Cartesian product)",
      name: "JOIN without condition",
      description: "Joins without conditions can result in Cartesian products",
      recommendation: "Add a JOIN condition with ON or USING clause",
      estimatedImpact: "Could prevent exponential performance degradation"
    });
  }
  
  if (platform === "bigquery" && sqlLower.includes("group by")) {
    const groupByPos = sqlLower.indexOf("group by");
    const wherePos = sqlLower.indexOf("where");
    
    if (wherePos < 0 || wherePos > groupByPos) {
      issues.push({
        id: "PERF003",
        severity: "medium",
        message: "Consider filtering before GROUP BY for better BigQuery performance",
        name: "Filtering after GROUP BY",
        description: "Filtering after GROUP BY processes more data than necessary",
        recommendation: "Add a WHERE clause before GROUP BY to reduce the amount of data processed",
        estimatedImpact: "Could reduce processed bytes by 40-60%"
      });
    }
  }
  
  return issues;
}

function analyzeModularization(sql: string, platform: Platform): ModularizationIssue[] {
  const issues: ModularizationIssue[] = [];
  const sqlLower = sql.toLowerCase();
  
  if (sql.length > 300 && !sqlLower.includes("with ")) {
    issues.push({
      id: "MOD001",
      severity: "medium",
      message: "Complex query without Common Table Expressions (CTEs)",
      name: "Complex query without CTEs",
      description: "Large queries without CTEs can be hard to read and maintain",
      recommendation: "Break down complex logic using WITH clauses for better readability and maintenance"
    });
  }
  
  let count = 0;
  let pos = -1;
  
  while ((pos = sqlLower.indexOf("select", pos + 1)) !== -1) {
    count++;
  }
  
  if (count > 3) {
    issues.push({
      id: "MOD002",
      severity: "high",
      message: "Multiple nested SELECT statements detected",
      name: "Multiple nested SELECTs",
      description: "Deeply nested SELECT statements can be difficult to read and maintain",
      recommendation: "Refactor using CTEs or views to simplify query structure",
    });
  }
  
  if (platform === "snowflake" && !sqlLower.includes("create or replace")) {
    issues.push({
      id: "MOD003",
      severity: "low",
      message: "Consider using Snowflake's object creation capabilities for better modularization",
      name: "Missing object creation",
      description: "Snowflake offers powerful object creation features that improve modularization",
      recommendation: "Create reusable views or user-defined functions for complex logic"
    });
  }
  
  return issues;
}

function analyzeCost(sql: string, platform: Platform): CostIssue[] {
  const issues: CostIssue[] = [];
  const sqlLower = sql.toLowerCase();
  
  if (!sqlLower.includes("where") && sqlLower.includes("from")) {
    issues.push({
      id: "COST001",
      severity: "high",
      message: "Full table scan without filtering criteria",
      name: "Full table scan",
      description: "Scanning an entire table without filters can be costly",
      recommendation: "Add appropriate WHERE clauses to limit data processed",
      estimatedSavings: "Could reduce costs by 40-80%"
    });
  }
  
  if (sqlLower.includes("order by") && !sqlLower.includes("limit")) {
    issues.push({
      id: "COST002",
      severity: "medium",
      message: "ORDER BY without LIMIT can be expensive",
      name: "ORDER BY without LIMIT",
      description: "Sorting without limiting results processes unnecessary data",
      recommendation: "Add a LIMIT clause when using ORDER BY",
      estimatedSavings: "Could reduce computational costs by 10-20%"
    });
  }
  
  if (platform === "bigquery") {
    if (sqlLower.includes("join") && !sqlLower.includes("partition by") && !sqlLower.includes("_partitiontime")) {
      issues.push({
        id: "COST003",
        severity: "medium",
        message: "BigQuery query might not be using partitioning efficiently",
        name: "Inefficient partitioning",
        description: "Not using partitioning in BigQuery can increase costs significantly",
        recommendation: "Use partitioned tables and partition pruning to reduce data scanned",
        estimatedSavings: "Could reduce BigQuery costs by 30-70%"
      });
    }
  } else if (platform === "snowflake") {
    if (sqlLower.includes("select") && !sqlLower.includes("sample(")) {
      issues.push({
        id: "COST004",
        severity: "low",
        message: "Consider using Snowflake's SAMPLE feature for exploratory queries",
        name: "Missing SAMPLE clause",
        description: "Snowflake's SAMPLE feature can reduce costs for exploratory work",
        recommendation: "Use SAMPLE() clause for ad-hoc analysis to reduce compute costs",
        estimatedSavings: "Could reduce warehouse costs by 40-90% for exploratory work"
      });
    }
  }
  
  return issues;
}
