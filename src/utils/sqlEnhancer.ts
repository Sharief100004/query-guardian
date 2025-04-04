
import { format } from 'sql-formatter';
import { Platform } from './sqlValidator';
import { toast } from 'sonner';

type SqlFormatterDialect = 'sql' | 'bigquery' | 'db2' | 'hive' | 'mariadb' | 'mysql' | 'n1ql' | 'plsql' | 'postgresql' | 'redshift' | 'spark' | 'sqlite' | 'tsql';

// Map our platform types to sql-formatter dialect types
const platformToDialect = (platform: Platform): SqlFormatterDialect => {
  switch (platform) {
    case 'bigquery':
      return 'bigquery';
    case 'snowflake':
      return 'sql'; // Use standard SQL for Snowflake
    case 'databricks':
      return 'spark'; // Databricks uses Spark SQL
    default:
      return 'sql';
  }
};

export type SqlEnhancerResult = {
  originalQuery: string;
  formattedQuery: string;
  issues: SqlIssue[];
  fixed: boolean;
};

export type SqlIssue = {
  message: string;
  line?: number;
  position?: number;
  suggestion: string;
  severity: 'error' | 'warning' | 'info';
};

// Simple SQL syntax validation
const validateSqlSyntax = (sql: string): SqlIssue[] => {
  const issues: SqlIssue[] = [];
  
  // Check for unbalanced parentheses
  const openParenCount = (sql.match(/\(/g) || []).length;
  const closeParenCount = (sql.match(/\)/g) || []).length;
  
  if (openParenCount !== closeParenCount) {
    issues.push({
      message: 'Unbalanced parentheses detected',
      suggestion: 'Ensure all opening parentheses have matching closing parentheses',
      severity: 'error'
    });
  }
  
  // Check for missing semicolons at the end of statements
  if (!sql.trim().endsWith(';') && sql.trim().length > 0) {
    issues.push({
      message: 'Query may be missing a semicolon at the end',
      suggestion: 'Add a semicolon at the end of your SQL statement',
      severity: 'warning'
    });
  }
  
  // Check for common SQL issues
  if (sql.toLowerCase().includes('select *') && !sql.toLowerCase().includes('limit')) {
    const lineNumber = sql.toLowerCase().split('\n').findIndex(line => line.includes('select *')) + 1;
    issues.push({
      message: 'SELECT * without LIMIT clause detected',
      line: lineNumber,
      suggestion: 'Consider adding a LIMIT clause or selecting specific columns',
      severity: 'warning'
    });
  }
  
  // Check for JOIN without ON or USING
  if ((sql.toLowerCase().includes(' join ') || sql.toLowerCase().includes(' inner join ')) && 
      !sql.toLowerCase().includes(' on ') && !sql.toLowerCase().includes(' using ')) {
    const lines = sql.toLowerCase().split('\n');
    const joinLineIndex = lines.findIndex(line => 
      line.includes(' join ') || line.includes(' inner join ')
    );
    
    issues.push({
      message: 'JOIN without conditions found',
      line: joinLineIndex >= 0 ? joinLineIndex + 1 : undefined,
      suggestion: 'Add an ON or USING clause to prevent Cartesian product',
      severity: 'error'
    });
  }
  
  // Check for WHERE clause after GROUP BY
  const wherePos = sql.toLowerCase().indexOf('where');
  const groupByPos = sql.toLowerCase().indexOf('group by');
  
  if (wherePos > 0 && groupByPos > 0 && wherePos > groupByPos) {
    const lines = sql.toLowerCase().split('\n');
    const whereLineIndex = lines.findIndex(line => line.includes('where'));
    
    issues.push({
      message: 'WHERE clause after GROUP BY',
      line: whereLineIndex >= 0 ? whereLineIndex + 1 : undefined,
      suggestion: 'Move WHERE clause before GROUP BY for better performance',
      severity: 'warning'
    });
  }
  
  // Check for nested subqueries
  const subqueryMatches = sql.match(/select.*select/gi);
  if (subqueryMatches && subqueryMatches.length > 2) {
    issues.push({
      message: 'Multiple nested subqueries detected',
      suggestion: 'Consider using CTEs (WITH clause) for better readability',
      severity: 'info'
    });
  }
  
  // Check for potentially slow function usage
  const slowFunctions = ['regex_match', 'json_extract', 'like \'%'];
  for (const func of slowFunctions) {
    if (sql.toLowerCase().includes(func)) {
      const lines = sql.toLowerCase().split('\n');
      const funcLineIndex = lines.findIndex(line => line.includes(func));
      
      issues.push({
        message: `Potentially slow function "${func}" detected`,
        line: funcLineIndex >= 0 ? funcLineIndex + 1 : undefined,
        suggestion: 'Consider alternatives or ensure proper indexing',
        severity: 'info'
      });
    }
  }
  
  return issues;
};

// Format the SQL query and perform some basic syntax validation
export const enhanceSql = (
  sql: string, 
  platform: Platform,
  options: { fixSyntax: boolean } = { fixSyntax: true }
): SqlEnhancerResult => {
  if (!sql.trim()) {
    return {
      originalQuery: sql,
      formattedQuery: sql,
      issues: [],
      fixed: false
    };
  }
  
  try {
    // Detect and validate SQL syntax issues
    const issues = validateSqlSyntax(sql);
    
    // Format the SQL query
    const dialect = platformToDialect(platform);
    const formattedSql = format(sql, {
      language: dialect,
      tabWidth: 2,
      keywordCase: 'upper', // SQL keywords in uppercase
      indentStyle: 'standard',
      logicalOperatorNewline: 'before',
    });
    
    // Make sure we're marking it as fixed if there are changes or issues
    const hasChanges = formattedSql !== sql;
    
    return {
      originalQuery: sql,
      formattedQuery: formattedSql,
      issues,
      fixed: hasChanges || issues.length > 0
    };
  } catch (error) {
    console.error("Error enhancing SQL:", error);
    
    let errorMessage = "Unknown error";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return {
      originalQuery: sql,
      formattedQuery: sql,
      issues: [{
        message: `SQL parsing error: ${errorMessage}`,
        suggestion: 'Check your SQL syntax',
        severity: 'error'
      }],
      fixed: false
    };
  }
};
