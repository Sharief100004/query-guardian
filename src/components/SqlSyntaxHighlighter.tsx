
import React, { useMemo } from 'react';
import { Platform } from "@/utils/sqlValidator";

interface SqlSyntaxHighlighterProps {
  sql: string;
  platform: Platform;
}

const SqlSyntaxHighlighter: React.FC<SqlSyntaxHighlighterProps> = ({ sql, platform }) => {
  // SQL keywords common to all platforms
  const commonKeywords = [
    'SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER',
    'FULL', 'ON', 'GROUP', 'BY', 'ORDER', 'HAVING', 'LIMIT', 'OFFSET',
    'UNION', 'ALL', 'INTERSECT', 'EXCEPT', 'AS', 'AND', 'OR', 'NOT',
    'IN', 'EXISTS', 'BETWEEN', 'LIKE', 'IS', 'NULL', 'ASC', 'DESC',
    'DISTINCT', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'WITH'
  ];
  
  // Platform-specific keywords
  const platformKeywords: Record<Platform, string[]> = {
    bigquery: [
      'PARTITION', 'CLUSTER', 'QUALIFY', 'WINDOW', 'OVER', 'STRUCT', 'ARRAY',
      'UNNEST', 'GENERATE_ARRAY', 'GENERATE_DATE_ARRAY', 'DATE_TRUNC'
    ],
    snowflake: [
      'SAMPLE', 'QUALIFY', 'PIVOT', 'UNPIVOT', 'MATCH_RECOGNIZE', 'IFF',
      'FLATTEN', 'LATERAL', 'VARIANT', 'OBJECT', 'ARRAY', 'COPY', 'MERGE'
    ],
    databricks: [
      'OPTIMIZE', 'ZORDER', 'DELTA', 'VACUUM', 'STREAM', 'STREAMING', 
      'TEMPORARY', 'UNCACHED', 'SKEW', 'USING', 'CATALOG', 'SCHEMA'
    ]
  };
  
  // Common SQL functions
  const functions = [
    'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'UPPER', 'LOWER', 'CAST', 'CONCAT',
    'TRIM', 'LTRIM', 'RTRIM', 'LENGTH', 'SUBSTR', 'SUBSTRING', 'REPLACE',
    'ROUND', 'FLOOR', 'CEIL', 'ABS', 'CURRENT_DATE', 'CURRENT_TIMESTAMP'
  ];
  
  // Platform-specific functions
  const platformFunctions: Record<Platform, string[]> = {
    bigquery: [
      'ARRAY_AGG', 'STRING_AGG', 'ROW_NUMBER', 'RANK', 'DENSE_RANK', 'DATE_ADD',
      'DATE_SUB', 'TIMESTAMP_ADD', 'TIMESTAMP_SUB', 'TIMESTAMP_DIFF', 'JSON_EXTRACT',
      'PARSE_DATE', 'FORMAT_DATE', 'ST_GEOGPOINT', 'ST_DISTANCE', 'ML.PREDICT'
    ],
    snowflake: [
      'DATEADD', 'DATEDIFF', 'TO_VARIANT', 'PARSE_JSON', 'GET_PATH', 'TRY_CAST',
      'CONVERT_TIMEZONE', 'TO_CHAR', 'IFF', 'IFNULL', 'NVL', 'LISTAGG',
      'OBJECT_CONSTRUCT', 'ARRAY_CONSTRUCT', 'SPLIT_TO_TABLE'
    ],
    databricks: [
      'EXPLODE', 'FROM_JSON', 'TO_JSON', 'DATE_FORMAT', 'FROM_UNIXTIME',
      'ARRAY_CONTAINS', 'MAP_KEYS', 'MAP_VALUES', 'TRANSFORM', 'REDUCE',
      'VERSION', 'CURRENT_CATALOG', 'CURRENT_USER', 'NEXT_DAY'
    ]
  };
  
  // SQL operators
  const operators = [
    '=', '<>', '!=', '>', '<', '>=', '<=', '+', '-', '*', '/', '%'
  ];
  
  // SQL literals and constants
  const literals = ['TRUE', 'FALSE', 'NULL'];
  
  // Process SQL to add syntax highlighting
  const highlightedCode = useMemo(() => {
    if (!sql) return null;
    
    // Split SQL into lines to process line by line
    const lines = sql.split('\n');
    const processingResult = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip empty lines
      if (!line.trim()) {
        processingResult.push(<div key={`line-${i}`} className="h-6"></div>);
        continue;
      }
      
      // Process comments first
      if (line.trim().startsWith('--')) {
        processingResult.push(
          <div key={`line-${i}`} className="leading-6">
            <span className="text-green-600 dark:text-green-400">{line}</span>
          </div>
        );
        continue;
      }
      
      // Find inline comments
      const commentIndex = line.indexOf('--');
      
      if (commentIndex !== -1) {
        // Process the part before the comment and the comment separately
        const beforeComment = line.substring(0, commentIndex);
        const commentPart = line.substring(commentIndex);
        
        processingResult.push(
          <div key={`line-${i}`} className="leading-6">
            {processLinePart(beforeComment, i)}
            <span className="text-green-600 dark:text-green-400">{commentPart}</span>
          </div>
        );
      } else {
        // Process regular line
        processingResult.push(
          <div key={`line-${i}`} className="leading-6">
            {processLinePart(line, i)}
          </div>
        );
      }
    }
    
    return processingResult;
  }, [sql, platform]);
  
  // Function to process a part of a line (non-comment)
  function processLinePart(text: string, lineIndex: number): React.ReactNode[] {
    const parts: React.ReactNode[] = [];
    let currentIndex = 0;
    
    // Process string literals
    const stringRegex = /'([^']*)'|"([^"]*)"|`([^`]*)`/g;
    let match;
    let lastIndex = 0;
    
    while ((match = stringRegex.exec(text)) !== null) {
      // Add the text before the string literal
      if (match.index > lastIndex) {
        const beforeText = text.substring(lastIndex, match.index);
        parts.push(...processTextTokens(beforeText, `${lineIndex}-${currentIndex++}`));
      }
      
      // Add the string literal
      parts.push(
        <span 
          key={`${lineIndex}-string-${currentIndex++}`} 
          className="text-amber-600 dark:text-amber-400"
        >
          {match[0]}
        </span>
      );
      
      lastIndex = match.index + match[0].length;
    }
    
    // Process the remaining text
    if (lastIndex < text.length) {
      const remainingText = text.substring(lastIndex);
      parts.push(...processTextTokens(remainingText, `${lineIndex}-${currentIndex++}`));
    }
    
    return parts;
  }
  
  // Function to process text (non-string-literal, non-comment)
  function processTextTokens(text: string, keyPrefix: string): React.ReactNode[] {
    const parts: React.ReactNode[] = [];
    
    // Split by whitespace and special characters
    const tokens = text.split(/(\s+|[,.;:(){}[\]<>])/);
    let tokenIndex = 0;
    
    for (const token of tokens) {
      // Skip empty tokens
      if (!token) continue;
      
      // Check if it's just whitespace
      if (/^\s+$/.test(token)) {
        parts.push(<span key={`${keyPrefix}-ws-${tokenIndex++}`}>{token}</span>);
        continue;
      }
      
      // Check for numbers
      if (/^-?\d+(\.\d+)?$/.test(token)) {
        parts.push(
          <span 
            key={`${keyPrefix}-num-${tokenIndex++}`} 
            className="text-cyan-700 dark:text-cyan-400"
          >
            {token}
          </span>
        );
        continue;
      }
      
      // Check for operators
      if (operators.includes(token)) {
        parts.push(
          <span 
            key={`${keyPrefix}-op-${tokenIndex++}`} 
            className="text-gray-600 dark:text-gray-400"
          >
            {token}
          </span>
        );
        continue;
      }
      
      // Check for literals
      const upperToken = token.toUpperCase();
      if (literals.includes(upperToken)) {
        parts.push(
          <span 
            key={`${keyPrefix}-lit-${tokenIndex++}`} 
            className="text-pink-600 dark:text-pink-400"
          >
            {token}
          </span>
        );
        continue;
      }
      
      // Check for platform-specific keywords
      if (platformKeywords[platform].some(kw => kw.toUpperCase() === upperToken)) {
        parts.push(
          <span 
            key={`${keyPrefix}-pkw-${tokenIndex++}`} 
            className="text-purple-700 dark:text-purple-400 font-bold"
          >
            {token}
          </span>
        );
        continue;
      }
      
      // Check for common keywords
      if (commonKeywords.some(kw => kw.toUpperCase() === upperToken)) {
        parts.push(
          <span 
            key={`${keyPrefix}-kw-${tokenIndex++}`} 
            className="text-blue-600 dark:text-blue-400 font-medium"
          >
            {token}
          </span>
        );
        continue;
      }
      
      // Check for platform-specific functions
      if (platformFunctions[platform].some(fn => fn.toUpperCase() === upperToken)) {
        parts.push(
          <span 
            key={`${keyPrefix}-pfn-${tokenIndex++}`} 
            className="text-rose-600 dark:text-rose-400"
          >
            {token}
          </span>
        );
        continue;
      }
      
      // Check for common functions
      if (functions.some(fn => fn.toUpperCase() === upperToken)) {
        parts.push(
          <span 
            key={`${keyPrefix}-fn-${tokenIndex++}`} 
            className="text-indigo-600 dark:text-indigo-400"
          >
            {token}
          </span>
        );
        continue;
      }
      
      // Default text
      parts.push(
        <span key={`${keyPrefix}-text-${tokenIndex++}`}>
          {token}
        </span>
      );
    }
    
    return parts;
  }
  
  return (
    <div className="font-mono text-sm whitespace-pre-wrap overflow-auto p-4 bg-muted/30 rounded-md">
      {highlightedCode}
    </div>
  );
};

export default SqlSyntaxHighlighter;
