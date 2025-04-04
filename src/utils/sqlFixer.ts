import { Platform } from './sqlValidator';
import { toast } from "sonner";

type FixResult = {
  fixed: boolean;
  originalQuery: string;
  fixedQuery: string;
  errors: FixError[];
};

type FixError = {
  message: string;
  line?: number;
  position?: number;
  suggestion: string;
  severity?: string;
};

type FixFunction = (match: string, p1?: string, p2?: string, offset?: number, str?: string) => string;

type FixPattern = {
  pattern: RegExp;
  message: string;
} & (
  | { fix: FixFunction; checkOnly?: never; suggestion?: string; }
  | { checkOnly: boolean; fix?: never; suggestion: string; }
);

const commonErrors: FixPattern[] = [
  // Keyword misspellings
  {
    pattern: /select\s+(.+?)\s+form\b/gi,
    fix: (match: string, p1: string) => `SELECT ${p1} FROM`,
    message: 'Keyword "form" should be "FROM"'
  },
  {
    pattern: /\bwhere\s+(.+?)\s+nad\b/gi,
    fix: (match: string, p1: string) => `WHERE ${p1} AND`,
    message: 'Keyword "nad" should be "AND"'
  },
  {
    pattern: /\bwhere\s+(.+?)\s+ro\b/gi,
    fix: (match: string, p1: string) => `WHERE ${p1} OR`,
    message: 'Keyword "ro" should be "OR"'
  },
  {
    pattern: /\bgorup\s+by\b/gi,
    fix: () => "GROUP BY",
    message: 'Keyword "gorup by" should be "GROUP BY"'
  },
  {
    pattern: /\bgroup\s+bye\b/gi,
    fix: () => "GROUP BY",
    message: 'Keyword "group bye" should be "GROUP BY"'
  },
  {
    pattern: /\border\s+bye\b/gi,
    fix: () => "ORDER BY",
    message: 'Keyword "order bye" should be "ORDER BY"'
  },
  {
    pattern: /\bjion\b/gi,
    fix: () => "JOIN",
    message: 'Keyword "jion" should be "JOIN"'
  },
  {
    pattern: /\bliek\b/gi,
    fix: () => "LIKE",
    message: 'Keyword "liek" should be "LIKE"'
  },
  {
    pattern: /\blimti\b/gi,
    fix: () => "LIMIT",
    message: 'Keyword "limti" should be "LIMIT"'
  },
  {
    pattern: /\bdistcint\b/gi,
    fix: () => "DISTINCT",
    message: 'Keyword "distcint" should be "DISTINCT"'
  },
  
  // Syntax structure fixes
  {
    pattern: /\bon\s+(.+?)\s+=\s+(.+?)\s*(?:where|group|order|limit|having|$)/gi,
    fix: (match: string, p1: string, p2: string, offset: number, str: string) => {
      const suffix = str?.substring(offset + match.length).trim() || '';
      return `ON ${p1} = ${p2} ${suffix ? suffix : ''}`;
    },
    message: 'JOIN condition is missing proper syntax'
  },
  {
    pattern: /;\s*select/gi,
    fix: (match: string) => ";\nSELECT",
    message: 'Multiple statements should be on separate lines'
  },
  {
    pattern: /([^,\s])\s*\n\s*(from\b)/gi,
    fix: (match: string, p1: string, p2: string) => `${p1}\n${p2}`,
    message: 'Missing comma in column list'
  },
  {
    pattern: /\bWHERE\s+([^=<>!]+?)\s*=\s*\n/gi,
    fix: (match: string, p1: string) => `WHERE ${p1} = `,
    message: 'Incomplete WHERE condition'
  },
  {
    pattern: /,\s*\)/gi,
    fix: () => ")",
    message: 'Trailing comma in list'
  },
  {
    pattern: /\(\s*,/gi,
    fix: () => "(",
    message: 'Leading comma in list'
  },
  {
    pattern: /\bSELECT\s+\*/gi,
    checkOnly: true,
    message: 'Using SELECT * is generally not recommended for production code',
    suggestion: 'Explicitly specify needed columns instead of using *'
  },
  {
    pattern: /\bLIMIT\s+([^0-9])/gi,
    checkOnly: true,
    message: 'LIMIT clause expects a numeric value',
    suggestion: 'Add a numeric value after LIMIT'
  },
  
  // New error patterns
  {
    pattern: /\bFROM\b\s+[a-zA-Z0-9_]+\s+[a-zA-Z0-9_]+\s+\bWHERE\b/gi,
    checkOnly: true,
    message: 'Missing alias definition with AS keyword',
    suggestion: 'Use AS keyword between table name and alias, e.g., FROM table AS alias'
  },
  {
    pattern: /\bHAVING\b(?!\s+(?:SUM|COUNT|AVG|MIN|MAX|COUNT))/gi,
    checkOnly: true,
    message: 'HAVING clause typically requires an aggregate function',
    suggestion: 'Use aggregate functions like SUM, COUNT, AVG in HAVING clause'
  },
  
  // NULL handling
  {
    pattern: /\bWHERE\b\s+\bNULL\b/gi,
    fix: (match: string) => match.replace("NULL", "IS NULL"),
    message: 'Incorrect NULL comparison',
    suggestion: 'Use IS NULL instead of WHERE NULL'
  },
  {
    pattern: /\bWHERE\b\s+.+?\s*=\s*\bNULL\b/gi,
    fix: (match: string) => match.replace("= NULL", "IS NULL"),
    message: 'Incorrect NULL comparison with equals',
    suggestion: 'Use IS NULL instead of = NULL'
  },
  {
    pattern: /\bWHERE\b\s+.+?\s*!=\s*\bNULL\b/gi,
    fix: (match: string) => match.replace("!= NULL", "IS NOT NULL"),
    message: 'Incorrect NULL comparison with not equals',
    suggestion: 'Use IS NOT NULL instead of != NULL'
  },
  {
    pattern: /\bWHERE\b\s+.+?\s*<>\s*\bNULL\b/gi,
    fix: (match: string) => match.replace("<> NULL", "IS NOT NULL"),
    message: 'Incorrect NULL comparison with not equals',
    suggestion: 'Use IS NOT NULL instead of <> NULL'
  },
  
  // Positional references
  {
    pattern: /\bGROUP BY\b\s+[0-9]+/gi,
    checkOnly: true,
    message: 'Using positional references in GROUP BY',
    suggestion: 'Use column names instead of positions for better readability and maintenance'
  },
  {
    pattern: /\bORDER BY\b\s+[0-9]+/gi,
    checkOnly: true,
    message: 'Using positional references in ORDER BY',
    suggestion: 'Use column names instead of positions for better readability and maintenance'
  },
  
  // Comma placement
  {
    pattern: /\n\s*,\s*([a-zA-Z0-9_]+)/gi,
    fix: (match: string, p1: string) => `\n  ${p1}`,
    message: 'Comma should be at the end of the previous line, not the beginning of the next line',
    suggestion: 'Place commas at the end of lines, not at the beginning'
  },
  
  // Function syntax
  {
    pattern: /([A-Za-z0-9_]+)\(\s*\)/gi,
    checkOnly: true,
    message: 'Empty function call',
    suggestion: 'Function calls should include appropriate arguments'
  },
  
  // Common syntax errors
  {
    pattern: /\bWHERE\b\s+\bIN\b\s*\(([^)]*)\)/gi,
    fix: (match: string, p1: string) => {
      // If IN clause is empty or just has whitespace
      if (!p1.trim()) {
        return match.replace(/\bIN\b\s*\(\s*\)/, "IN (NULL)");
      }
      return match;
    },
    message: 'Empty IN clause',
    suggestion: 'IN clause must contain at least one value'
  },
  
  // String concatenation issues
  {
    pattern: /'([^']*)'\s*\|\|\s*'([^']*)'/gi,
    fix: (match: string, p1: string, p2: string) => `'${p1}${p2}'`,
    message: 'Inefficient string concatenation',
    suggestion: 'Consider combining string literals'
  },
  
  // Date and timestamp formatting issues
  {
    pattern: /\b(\d{4}-\d{2}-\d{2})\b(?!\s+AS)/gi,
    fix: (match: string, p1: string) => `DATE '${p1}'`,
    message: 'Untyped date literal',
    suggestion: 'Use explicit DATE type for date literals'
  },
  
  // Nested queries
  {
    pattern: /\(\s*SELECT\b(?![^()]*\bFROM\b)/gi,
    checkOnly: true,
    message: 'Subquery missing FROM clause',
    suggestion: 'Every SELECT statement should have a FROM clause'
  }
];

const platformErrors: Record<Platform, Array<FixPattern>> = {
  bigquery: [
    {
      pattern: /\bDATE_DIFF\s*\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^)]+)\s*\)/gi,
      checkOnly: true,
      message: 'In BigQuery, DATE_DIFF parameters are (end_date, start_date, part)',
      suggestion: 'Ensure parameters are in the right order for BigQuery'
    },
    {
      pattern: /\bFROM\s+(?!`)[a-zA-Z0-9_]+\.[a-zA-Z0-9_]+\.[a-zA-Z0-9_]+/gi,
      fix: (match: string) => {
        return match.replace(/\bFROM\s+([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)/i, 'FROM `$1.$2.$3`');
      },
      message: 'BigQuery table references should use backticks',
      suggestion: 'Use `project.dataset.table` format with backticks'
    },
    {
      pattern: /\bCAST\s*\(\s*(.+?)\s+AS\s+VARCHAR\s*\)/gi,
      fix: (match: string, p1: string) => `CAST(${p1} AS STRING)`,
      message: 'BigQuery uses STRING instead of VARCHAR',
      suggestion: 'Use STRING instead of VARCHAR in BigQuery'
    },
    {
      pattern: /\bSUBSTRING\s*\(\s*(.+?)\s*,\s*(.+?)\s*,\s*(.+?)\s*\)/gi,
      checkOnly: true,
      message: 'Check SUBSTRING syntax for BigQuery',
      suggestion: 'In BigQuery, SUBSTRING takes form of SUBSTRING(string, starting_position, length)'
    },
    {
      pattern: /\bCURRENT_DATE\(\)/gi,
      fix: () => "CURRENT_DATE",
      message: 'In BigQuery, CURRENT_DATE is used without parentheses',
      suggestion: 'Use CURRENT_DATE without parentheses in BigQuery'
    },
    {
      pattern: /\bGETDATE\(\)/gi,
      fix: () => "CURRENT_TIMESTAMP()",
      message: 'BigQuery does not support GETDATE()',
      suggestion: 'Use CURRENT_TIMESTAMP() instead of GETDATE() in BigQuery'
    }
  ],
  snowflake: [
    {
      pattern: /\bvarchar\b/gi,
      fix: () => "VARCHAR",
      message: 'In Snowflake, use VARCHAR instead of varchar',
      suggestion: 'Use VARCHAR (uppercase) in Snowflake'
    },
    {
      pattern: /\btable\s+(\w+)\s+as\b/gi,
      fix: (match: string, p1: string) => `TABLE ${p1} AS`,
      message: 'In Snowflake, capitalize SQL keywords',
      suggestion: 'Capitalize SQL keywords in Snowflake'
    },
    {
      pattern: /\bDATE_TRUNC\s*\(\s*([^,]+)\s*,\s*([^)]+)\s*\)/gi,
      checkOnly: true,
      message: 'Check DATE_TRUNC syntax for Snowflake',
      suggestion: 'In Snowflake, DATE_TRUNC takes form of DATE_TRUNC(date_part, date)'
    },
    {
      pattern: /\bTO_TIMESTAMP\s*\(\s*([^,]+?)\s*\)/gi,
      checkOnly: true,
      message: 'TO_TIMESTAMP may need format parameter in Snowflake',
      suggestion: 'Consider using TO_TIMESTAMP(string, format) in Snowflake'
    },
    {
      pattern: /\bSTRING\b/gi,
      fix: () => "VARCHAR",
      message: 'Snowflake uses VARCHAR instead of STRING',
      suggestion: 'Use VARCHAR instead of STRING in Snowflake'
    },
    {
      pattern: /\bCURRENT_DATE\b/gi,
      fix: () => "CURRENT_DATE()",
      message: 'In Snowflake, CURRENT_DATE requires parentheses',
      suggestion: 'Use CURRENT_DATE() instead of CURRENT_DATE in Snowflake'
    }
  ],
  databricks: [
    {
      pattern: /\bcreate\s+or\s+replace\s+temp\s+view\b/gi, 
      fix: () => "CREATE OR REPLACE TEMPORARY VIEW",
      message: 'In Databricks, use TEMPORARY instead of TEMP',
      suggestion: 'Use TEMPORARY instead of TEMP in Databricks'
    },
    {
      pattern: /\bCURRENT_DATE\s*\(\s*\)/gi,
      fix: () => "CURRENT_DATE",
      message: 'In Databricks, CURRENT_DATE is a function without parentheses',
      suggestion: 'Use CURRENT_DATE without parentheses'
    },
    {
      pattern: /\bDATEDIFF\s*\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^)]+)\s*\)/gi,
      checkOnly: true,
      message: 'Check DATEDIFF syntax for Databricks',
      suggestion: 'In Databricks, DATEDIFF takes form of DATEDIFF(unit, start_date, end_date)'
    },
    {
      pattern: /\bVARCHAR\s*\(\s*\d+\s*\)/gi,
      fix: (match: string) => "STRING",
      message: 'Databricks uses STRING instead of VARCHAR(n)',
      suggestion: 'Use STRING instead of VARCHAR(n) in Databricks'
    },
    {
      pattern: /\bGETDATE\(\)/gi,
      fix: () => "CURRENT_TIMESTAMP()",
      message: 'Databricks does not support GETDATE()',
      suggestion: 'Use CURRENT_TIMESTAMP() instead of GETDATE() in Databricks'
    }
  ]
};

function validateSqlStructure(sql: string): FixError[] {
  const errors: FixError[] = [];
  const sqlLower = sql.toLowerCase();
  
  // Check basic structure of SELECT statement
  if (sqlLower.includes('select') && !sqlLower.includes('from')) {
    errors.push({
      message: 'SELECT statement missing FROM clause',
      suggestion: 'Add FROM clause to specify the data source'
    });
  }
  
  // Check for JOIN without ON or USING
  if ((/\bjoin\b/gi.test(sqlLower)) && 
      !(/\bjoin\b.+?\b(on|using)\b/gi.test(sqlLower))) {
    errors.push({
      message: 'JOIN without ON or USING clause',
      suggestion: 'Add ON or USING clause to specify join condition'
    });
  }
  
  // Check ORDER BY after GROUP BY logic
  const hasGroupBy = sqlLower.includes('group by');
  const hasOrderBy = sqlLower.includes('order by');
  
  if (hasGroupBy && hasOrderBy) {
    const groupByPos = sqlLower.indexOf('group by');
    const orderByPos = sqlLower.indexOf('order by');
    
    if (orderByPos < groupByPos) {
      errors.push({
        message: 'ORDER BY should come after GROUP BY',
        suggestion: 'Move ORDER BY clause after GROUP BY clause'
      });
    }
  }
  
  // Check for missing semicolons between statements
  const selectCount = (sql.match(/\bselect\b/gi) || []).length;
  const semicolonCount = (sql.match(/;/g) || []).length;
  
  if (selectCount > 1 && semicolonCount < selectCount - 1) {
    errors.push({
      message: 'Multiple statements should be separated by semicolons',
      suggestion: 'Add semicolons between SQL statements'
    });
  }
  
  // Check for columns in GROUP BY matching non-aggregated columns in SELECT
  const selectMatch = sql.match(/\bSELECT\b(.*?)(?=\bFROM\b)/gis);
  const groupByMatch = sql.match(/\bGROUP BY\b(.*?)(?=\b(HAVING|ORDER|LIMIT|$)\b)/gis);
  
  if (selectMatch && groupByMatch) {
    const selectStr = selectMatch[0];
    // Check if there are non-aggregated columns in SELECT that aren't in GROUP BY
    // This is just a basic check, a more comprehensive check would parse the SQL
    if (!/\b(COUNT|SUM|AVG|MIN|MAX)\s*\(/gi.test(selectStr)) {
      errors.push({
        message: 'Potential column mismatch in GROUP BY',
        suggestion: 'Ensure all non-aggregated columns in SELECT are included in GROUP BY clause'
      });
    }
  }
  
  // Check for table used in FROM without alias in joins
  const joinMatches = [...sql.matchAll(/\bJOIN\b\s+([a-z0-9_\.]+)(?:\s+AS\s+|\s+)?([a-z0-9_]+)?\s+\bON\b/gi)];
  if (joinMatches.length > 0) {
    for (const match of joinMatches) {
      const hasAlias = match[2] !== undefined;
      if (!hasAlias) {
        errors.push({
          message: 'JOIN table without alias',
          suggestion: 'Add alias to JOIN tables for better readability'
        });
        break; // Just report this once
      }
    }
  }
  
  return errors;
}

function getErrorLocation(sql: string, errorPattern: RegExp): { line?: number, position?: number } {
  const match = sql.match(errorPattern);
  if (!match || !match.index) return {};
  
  const textBeforeMatch = sql.substring(0, match.index);
  const lines = textBeforeMatch.split('\n');
  
  return {
    line: lines.length,
    position: lines[lines.length - 1].length + 1
  };
}

export function fixSqlSyntax(sql: string, platform: Platform): FixResult {
  if (!sql || sql.trim() === '') {
    return {
      fixed: false,
      originalQuery: sql,
      fixedQuery: sql,
      errors: []
    };
  }

  let fixedQuery = sql;
  const errors: FixError[] = [];
  const allPatterns = [...commonErrors, ...platformErrors[platform]];
  
  // Check for missing semicolons at the end
  if (!sql.trim().endsWith(';') && !sql.trim().startsWith('--')) {
    const position = sql.length;
    const lineCount = (sql.match(/\n/g) || []).length + 1;
    
    errors.push({
      message: 'Query should end with a semicolon',
      line: lineCount,
      position,
      suggestion: 'Add a semicolon at the end of the query',
      severity: 'info'
    });
    
    fixedQuery = fixedQuery + ';';
  }
  
  // Process each pattern
  allPatterns.forEach(pattern => {
    const matches = [...fixedQuery.matchAll(pattern.pattern)];
    
    matches.forEach(match => {
      const location = getErrorLocation(fixedQuery, new RegExp(match[0], 'g'));
      
      // Determine severity based on pattern type
      let severity = 'info';
      if ('checkOnly' in pattern && pattern.checkOnly) {
        severity = 'warning';
      } else {
        severity = 'error';
      }
      
      // Add error
      errors.push({
        message: pattern.message,
        line: location.line,
        position: location.position,
        suggestion: pattern.suggestion || 'Fix syntax error',
        severity
      });
      
      // Apply fix if not checkOnly and fix function exists
      if (!('checkOnly' in pattern) && 'fix' in pattern) {
        // Use a type assertion to ensure TypeScript knows we have a fix function
        const fixFunction = pattern.fix as FixFunction;
        
        fixedQuery = fixedQuery.replace(
          pattern.pattern, 
          function(match, p1, p2, offset, str) {
            // Call the fix function with the extracted arguments
            return fixFunction(match, p1, p2, offset, str);
          }
        );
      }
    });
  });

  // Add structure validation errors
  const structureErrors = validateSqlStructure(fixedQuery);
  errors.push(...structureErrors.map(error => ({
    ...error,
    severity: 'warning'
  })));
  
  // Basic unmatched parentheses check
  const openCount = (fixedQuery.match(/\(/g) || []).length;
  const closeCount = (fixedQuery.match(/\)/g) || []).length;
  
  if (openCount > closeCount) {
    errors.push({
      message: `Missing ${openCount - closeCount} closing parenthesis`,
      suggestion: 'Add missing closing parenthesis'
    });
    
    // Add missing closing parentheses
    fixedQuery = fixedQuery + ')'.repeat(openCount - closeCount);
  } else if (closeCount > openCount) {
    errors.push({
      message: `Missing ${closeCount - openCount} opening parenthesis`,
      suggestion: 'Remove extra closing parenthesis or add opening ones'
    });
    
    // We don't auto-fix this as it's harder to determine where to add opening parentheses
  }
  
  // Detect unclosed quotes
  const singleQuotes = (fixedQuery.match(/'/g) || []).length;
  if (singleQuotes % 2 !== 0) {
    errors.push({
      message: 'Unclosed single quote',
      suggestion: 'Add missing single quote'
    });
    
    // Add closing quote at the end if needed
    fixedQuery = fixedQuery + "'";
  }
  
  const doubleQuotes = (fixedQuery.match(/"/g) || []).length;
  if (doubleQuotes % 2 !== 0) {
    errors.push({
      message: 'Unclosed double quote',
      suggestion: 'Add missing double quote'
    });
    
    // Add closing quote at the end if needed
    fixedQuery = fixedQuery + "\"";
  }
  
  // Format keywords based on platform conventions
  if (platform === 'snowflake') {
    // Snowflake prefers uppercase keywords
    const keywordsToCapitalize = [
      'select', 'from', 'where', 'and', 'or', 'group by', 'order by', 
      'having', 'join', 'left join', 'right join', 'inner join', 'outer join',
      'union', 'except', 'intersect', 'limit', 'offset', 'with'
    ];
    
    let formattedQuery = fixedQuery;
    keywordsToCapitalize.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      formattedQuery = formattedQuery.replace(regex, keyword.toUpperCase());
    });
    
    fixedQuery = formattedQuery;
  }
  
  return {
    fixed: errors.length > 0,
    originalQuery: sql,
    fixedQuery: fixedQuery,
    errors: errors
  };
}
