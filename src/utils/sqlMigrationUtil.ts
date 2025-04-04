import { Platform } from './sqlValidator';

// Types
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

/**
 * Migrate a SQL query from one platform to another
 */
export function migrateQuery(sql: string, sourcePlatform: Platform, targetPlatform: Platform): MigrationResult {
  // If source and target are the same, return the original query
  if (sourcePlatform === targetPlatform) {
    return {
      originalQuery: sql,
      convertedQuery: sql,
      targetPlatform,
      issues: [],
      compatibilityScore: 100
    };
  }
  
  // Initialize result
  const result: MigrationResult = {
    originalQuery: sql,
    convertedQuery: sql,
    targetPlatform,
    issues: [],
    compatibilityScore: 100
  };
  
  // Split the SQL by lines to track line numbers for issues
  const sqlLines = sql.split('\n');
  let convertedLines = [...sqlLines];
  
  // Collection of migration transformations
  const sourceToPlatformTransformations = {
    // BigQuery to Snowflake transformations
    'bigquery-snowflake': [
      transformBQDateFunctionsToSnowflake,
      transformBQArraysToSnowflake,
      transformBQTableNamesToSnowflake,
      transformBQPartitionByToSnowflake,
      transformBQIntervalToSnowflake,
      transformBQUnnestToSnowflake
    ],
    
    // BigQuery to Databricks transformations
    'bigquery-databricks': [
      transformBQDateFunctionsToDatabricks,
      transformBQArraysToDatabricks,
      transformBQTableNamesToDatabricks,
      transformBQPartitionByToDatabricks,
      transformBQIntervalToDatabricks,
      transformBQUnnestToDatabricks
    ],
    
    // Snowflake to BigQuery transformations
    'snowflake-bigquery': [
      transformSFDateFunctionsToBigQuery,
      transformSFVariantToBigQuery,
      transformSFTableNamesToBigQuery,
      transformSFSemiStructuredToBigQuery,
      transformSFMergeToBigQuery
    ],
    
    // Snowflake to Databricks transformations
    'snowflake-databricks': [
      transformSFDateFunctionsToDatabricks,
      transformSFVariantToDatabricks,
      transformSFTableNamesToDatabricks,
      transformSFSemiStructuredToDatabricks,
      transformSFMergeToDatabricks
    ],
    
    // Databricks to BigQuery transformations
    'databricks-bigquery': [
      transformDBDateFunctionsToBigQuery,
      transformDBDeltaToBigQuery,
      transformDBTableNamesToBigQuery,
      transformDBZOrderToBigQuery,
      transformDBCatalogToBigQuery
    ],
    
    // Databricks to Snowflake transformations
    'databricks-snowflake': [
      transformDBDateFunctionsToSnowflake,
      transformDBDeltaToSnowflake,
      transformDBTableNamesToSnowflake,
      transformDBZOrderToSnowflake,
      transformDBCatalogToSnowflake
    ]
  };
  
  // Get the right set of transformations based on source and target platforms
  const transformationKey = `${sourcePlatform}-${targetPlatform}` as keyof typeof sourceToPlatformTransformations;
  const transformations = sourceToPlatformTransformations[transformationKey] || [];
  
  // Apply each transformation in sequence
  for (const transform of transformations) {
    const transformResult = transform(convertedLines, result.issues);
    convertedLines = transformResult.lines;
    if (transformResult.compatibilityImpact) {
      result.compatibilityScore -= transformResult.compatibilityImpact;
    }
  }
  
  // Handle common SQL transformations
  const commonTransformResult = handleCommonTransformations(convertedLines, sourcePlatform, targetPlatform, result.issues);
  convertedLines = commonTransformResult.lines;
  
  // Ensure compatibility score is within bounds
  result.compatibilityScore = Math.max(0, Math.min(100, result.compatibilityScore));
  
  // Update the converted query
  result.convertedQuery = convertedLines.join('\n');
  
  return result;
}

/**
 * Handle common transformations that apply to all platform migrations
 */
function handleCommonTransformations(
  lines: string[], 
  sourcePlatform: Platform, 
  targetPlatform: Platform,
  issues: MigrationIssue[]
): {
  lines: string[];
  compatibilityImpact?: number;
} {
  // Deep copy the lines
  const newLines = [...lines];
  let compatibilityImpact = 0;
  
  // Check for unsupported features
  for (let i = 0; i < newLines.length; i++) {
    const line = newLines[i];
    
    // Detect comments and handle them
    if (line.trim().startsWith('--')) {
      // Handle comment metadata or platform-specific comment syntax
      if (line.toLowerCase().includes(`${sourcePlatform} specific`)) {
        newLines[i] = line.replace(
          new RegExp(`${sourcePlatform} specific`, 'i'), 
          `${targetPlatform} specific (migrated)`
        );
      }
      continue;
    }
    
    // Function transformations that apply to all platforms
    for (const [sourcePattern, replacement, platformSpecific] of commonFunctionTransformations) {
      if (platformSpecific && !platformSpecific.includes(targetPlatform)) {
        continue;
      }
      
      const regex = new RegExp(sourcePattern, 'gi');
      if (regex.test(line)) {
        // Add an issue if this is a complex transformation
        if (platformSpecific) {
          issues.push({
            line: i + 1,
            message: `Function syntax differs between platforms`,
            suggestion: `Transformed '${sourcePattern}' pattern to '${replacement}' syntax for ${targetPlatform}`,
            severity: 'info'
          });
        }
        
        newLines[i] = line.replace(regex, replacement);
      }
    }
    
    // CHECK SQL ANTIPATTERNS
    // Detect SQL antipatterns that should be addressed in migrations
    
    // 1. SELECT * usage
    if (/SELECT\s+\*/i.test(line)) {
      issues.push({
        line: i + 1,
        message: `Using SELECT * is not recommended for cross-platform compatibility`,
        suggestion: `Explicitly list the columns you need to ensure consistent behavior across platforms`,
        severity: 'warning'
      });
      compatibilityImpact += 5;
    }
    
    // 2. Non-standard SQL functions
    const nonStandardFunctionPatterns = [
      { regex: /\bREGEXP_CONTAINS\b/i, platform: 'bigquery' },
      { regex: /\bARRAY_AGG\b/i, platform: 'bigquery' },
      { regex: /\bGENERATE_UUID\b/i, platform: 'bigquery' },
      { regex: /\bLATERAL\s+FLATTEN\b/i, platform: 'snowflake' },
      { regex: /\bIFF\b/i, platform: 'snowflake' },
      { regex: /\bTRY_PARSE_JSON\b/i, platform: 'snowflake' },
      { regex: /\bZORDER\s+BY\b/i, platform: 'databricks' },
      { regex: /\bOPTIMIZE\b/i, platform: 'databricks' },
      { regex: /\bDELTA\b/i, platform: 'databricks' },
    ];
    
    for (const { regex, platform } of nonStandardFunctionPatterns) {
      if (regex.test(line) && sourcePlatform === platform) {
        issues.push({
          line: i + 1,
          message: `Non-standard SQL function or feature specific to ${platform}`,
          suggestion: `This feature may need manual adjustment for ${targetPlatform}`,
          severity: 'warning'
        });
        compatibilityImpact += 5;
      }
    }
    
    // 3. LIMIT/OFFSET vs. TOP syntax
    if (/\bLIMIT\b/i.test(line) && targetPlatform === 'snowflake') {
      // Snowflake supports LIMIT, but some legacy code might use TOP
      issues.push({
        line: i + 1,
        message: `LIMIT clause usage`,
        suggestion: `LIMIT is supported in Snowflake, but some legacy code might use TOP syntax`,
        severity: 'info'
      });
    }
    
    // 4. Data type incompatibilities
    const dataTypeIncompatibilities = [
      { regex: /\bBYTES\b/i, source: 'bigquery', target: ['snowflake', 'databricks'], replacement: 'BINARY' },
      { regex: /\bSTRUCT\b/i, source: 'bigquery', target: ['snowflake'], replacement: 'OBJECT' },
      { regex: /\bVARIANT\b/i, source: 'snowflake', target: ['bigquery'], replacement: 'JSON' },
      { regex: /\bGEOGRAPHY\b/i, source: 'bigquery', target: ['databricks'], issue: true },
    ];
    
    for (const { regex, source, target, replacement, issue } of dataTypeIncompatibilities) {
      if (regex.test(line) && source === sourcePlatform && target.includes(targetPlatform)) {
        if (replacement && !issue) {
          newLines[i] = line.replace(regex, replacement);
          issues.push({
            line: i + 1,
            message: `Data type incompatibility: ${regex.source}`,
            suggestion: `Converted to ${replacement} for ${targetPlatform}`,
            severity: 'info'
          });
        } else {
          issues.push({
            line: i + 1,
            message: `Data type incompatibility: ${regex.source}`,
            suggestion: `This data type doesn't have a direct equivalent in ${targetPlatform}. Manual adjustment needed.`,
            severity: 'warning'
          });
          compatibilityImpact += 8;
        }
      }
    }
  }
  
  return { lines: newLines, compatibilityImpact };
}

// Common function transformations applicable across platforms
// [regex pattern, replacement, applicable target platforms (if restricted)]
const commonFunctionTransformations: [string, string, Platform[] | null][] = [
  // Date/time functions
  ['CURRENT_DATE\\(\\)', 'CURRENT_DATE()', null],
  ['CURRENT_TIMESTAMP\\(\\)', 'CURRENT_TIMESTAMP()', null],
  
  // String functions
  ['CONCAT\\(([^)]+)\\)', 'CONCAT($1)', null],
  ['SUBSTR\\(([^,]+),\\s*([^,)]+)\\)', 'SUBSTRING($1, $2)', null],
  ['UPPER\\(([^)]+)\\)', 'UPPER($1)', null],
  ['LOWER\\(([^)]+)\\)', 'LOWER($1)', null],
  
  // Numeric functions
  ['ROUND\\(([^,)]+)\\)', 'ROUND($1)', null],
  ['ROUND\\(([^,]+),\\s*([^,)]+)\\)', 'ROUND($1, $2)', null],
  
  // NULL handling
  ['COALESCE\\(([^)]+)\\)', 'COALESCE($1)', null],
  ['NULLIF\\(([^,]+),\\s*([^,)]+)\\)', 'NULLIF($1, $2)', null],
];

/**
 * BigQuery date functions to Snowflake syntax
 */
function transformBQDateFunctionsToSnowflake(
  lines: string[], 
  issues: MigrationIssue[]
): {
  lines: string[];
  compatibilityImpact?: number;
} {
  const newLines = [...lines];
  
  // Define transformations: regex pattern -> replacement
  const transformations: [RegExp, string, string][] = [
    [/DATE_ADD\(([^,]+),\s*INTERVAL\s+(\d+)\s+DAY\)/gi, 'DATEADD(DAY, $2, $1)', 'DATE_ADD to DATEADD'],
    [/DATE_SUB\(([^,]+),\s*INTERVAL\s+(\d+)\s+DAY\)/gi, 'DATEADD(DAY, -$2, $1)', 'DATE_SUB to DATEADD'],
    [/TIMESTAMP_ADD\(([^,]+),\s*INTERVAL\s+(\d+)\s+(\w+)\)/gi, 'DATEADD($3, $2, $1)', 'TIMESTAMP_ADD to DATEADD'],
    [/DATE_DIFF\(([^,]+),\s*([^,)]+),\s*(\w+)\)/gi, 'DATEDIFF($3, $2, $1)', 'DATE_DIFF to DATEDIFF'],
    [/FORMAT_DATE\(['"]([^'"]+)['"]\s*,\s*([^)]+)\)/gi, 'TO_CHAR($2, \'$1\')', 'FORMAT_DATE to TO_CHAR'],
    [/EXTRACT\((\w+)\s+FROM\s+([^)]+)\)/gi, 'EXTRACT($1 FROM $2)', 'EXTRACT format'],
  ];
  
  let compatibilityImpact = 0;
  
  for (let i = 0; i < newLines.length; i++) {
    const line = newLines[i];
    
    for (const [pattern, replacement, description] of transformations) {
      if (pattern.test(line)) {
        newLines[i] = line.replace(pattern, replacement);
        
        issues.push({
          line: i + 1,
          message: `BigQuery date function needs conversion for Snowflake`,
          suggestion: `Converted ${description}`,
          severity: 'info'
        });
        
        // Small compatibility impact for each date function change
        compatibilityImpact += 1;
      }
    }
    
    // Check for more complex patterns that might need manual adjustment
    if (/PARSE_DATE|PARSE_TIMESTAMP|FORMAT_TIMESTAMP/i.test(line)) {
      issues.push({
        line: i + 1,
        message: `Complex BigQuery date function may need manual adjustment`,
        suggestion: `Functions like PARSE_DATE and FORMAT_TIMESTAMP have different syntax in Snowflake. Use TO_DATE, TO_TIMESTAMP, or TO_CHAR.`,
        severity: 'warning'
      });
      compatibilityImpact += 5;
    }
  }
  
  return { lines: newLines, compatibilityImpact };
}

/**
 * BigQuery array syntax to Snowflake
 */
function transformBQArraysToSnowflake(
  lines: string[], 
  issues: MigrationIssue[]
): {
  lines: string[];
  compatibilityImpact?: number;
} {
  const newLines = [...lines];
  let compatibilityImpact = 0;
  
  // Array transformations: regex pattern -> replacement
  const transformations: [RegExp, string, string][] = [
    [/ARRAY_AGG\(([^)]+)\)/gi, 'ARRAY_AGG($1)', 'ARRAY_AGG syntax'],
    [/ARRAY\[(.*?)\]/gi, 'ARRAY_CONSTRUCT($1)', 'ARRAY[] to ARRAY_CONSTRUCT'],
    [/ARRAY_LENGTH\(([^)]+)\)/gi, 'ARRAY_SIZE($1)', 'ARRAY_LENGTH to ARRAY_SIZE'],
  ];
  
  for (let i = 0; i < newLines.length; i++) {
    const line = newLines[i];
    
    for (const [pattern, replacement, description] of transformations) {
      if (pattern.test(line)) {
        newLines[i] = line.replace(pattern, replacement);
        
        issues.push({
          line: i + 1,
          message: `BigQuery array syntax needs conversion for Snowflake`,
          suggestion: `Converted ${description}`,
          severity: 'info'
        });
        
        compatibilityImpact += 2;
      }
    }
    
    // Check for array indexing
    if (/\[(\d+)\]/i.test(line)) {
      newLines[i] = line.replace(/(\w+)\[(\d+)\]/gi, 'GET($1, $2)');
      
      issues.push({
        line: i + 1,
        message: `Array indexing syntax differs in Snowflake`,
        suggestion: `Converted array[index] to GET(array, index)`,
        severity: 'info'
      });
      
      compatibilityImpact += 2;
    }
    
    // Check for more complex array operations
    if (/UNNEST|ARRAY_CONCAT|GENERATE_ARRAY/i.test(line)) {
      issues.push({
        line: i + 1,
        message: `Complex BigQuery array operation may need manual adjustment`,
        suggestion: `Functions like UNNEST, ARRAY_CONCAT, or GENERATE_ARRAY have different equivalents in Snowflake. Consider using FLATTEN, ARRAY_CAT, or other Snowflake array functions.`,
        severity: 'warning'
      });
      compatibilityImpact += 5;
    }
  }
  
  return { lines: newLines, compatibilityImpact };
}

/**
 * BigQuery table naming to Snowflake
 */
function transformBQTableNamesToSnowflake(
  lines: string[], 
  issues: MigrationIssue[]
): {
  lines: string[];
  compatibilityImpact?: number;
} {
  const newLines = [...lines];
  let compatibilityImpact = 0;
  
  // Pattern for BigQuery table references with backticks
  const bqTablePattern = /`([^`]+)\.([^`]+)\.([^`]+)`/g;
  
  for (let i = 0; i < newLines.length; i++) {
    const line = newLines[i];
    
    if (bqTablePattern.test(line)) {
      newLines[i] = line.replace(bqTablePattern, '"$1"."$2"."$3"');
      
      issues.push({
        line: i + 1,
        message: `BigQuery table reference format converted for Snowflake`,
        suggestion: `Converted backtick quotes to double quotes for database objects`,
        severity: 'info'
      });
      
      compatibilityImpact += 1;
    }
    
    // Check for dataset references without project (common in BigQuery)
    if (/\b(\w+)\.(\w+)\b/.test(line) && !/"\w+"\."\w+"/.test(line)) {
      issues.push({
        line: i + 1,
        message: `Possible incomplete table reference for Snowflake`,
        suggestion: `In Snowflake, fully qualified references use database.schema.table format. You may need to add the appropriate database name.`,
        severity: 'info'
      });
    }
  }
  
  return { lines: newLines, compatibilityImpact };
}

/**
 * BigQuery PARTITION BY and CLUSTER BY clauses to Snowflake
 */
function transformBQPartitionByToSnowflake(
  lines: string[], 
  issues: MigrationIssue[]
): {
  lines: string[];
  compatibilityImpact?: number;
} {
  const newLines = [...lines];
  let compatibilityImpact = 0;
  
  // Find CREATE TABLE statements with PARTITION BY
  for (let i = 0; i < newLines.length; i++) {
    const line = newLines[i].trim().toUpperCase();
    
    if (line.includes('PARTITION BY')) {
      issues.push({
        line: i + 1,
        message: `BigQuery PARTITION BY clause needs different approach in Snowflake`,
        suggestion: `In Snowflake, partitioning is defined during table creation with clustering keys. Consider using "CREATE TABLE ... CLUSTER BY" instead.`,
        severity: 'warning'
      });
      compatibilityImpact += 10;
    }
    
    if (line.includes('CLUSTER BY')) {
      // Try to convert CLUSTER BY to Snowflake's equivalent
      const clusterByPattern = /CLUSTER\s+BY\s+([^)]+)/i;
      const match = newLines[i].match(clusterByPattern);
      
      if (match) {
        // Remove the original CLUSTER BY and prepare to add Snowflake version
        newLines[i] = newLines[i].replace(clusterByPattern, '');
        
        // Look for the end of CREATE TABLE statement to add CLUSTER BY
        let j = i;
        let foundEnd = false;
        
        while (j < newLines.length && !foundEnd) {
          if (newLines[j].includes(');')) {
            newLines[j] = newLines[j].replace(');', `) CLUSTER BY (${match[1]});`);
            foundEnd = true;
          }
          j++;
        }
        
        if (foundEnd) {
          issues.push({
            line: i + 1,
            message: `Converted BigQuery CLUSTER BY to Snowflake syntax`,
            suggestion: `Moved clustering definition to end of CREATE TABLE statement`,
            severity: 'info'
          });
          compatibilityImpact += 3;
        } else {
          issues.push({
            line: i + 1,
            message: `Could not fully convert BigQuery CLUSTER BY clause`,
            suggestion: `In Snowflake, add "CLUSTER BY (columns)" at the end of the CREATE TABLE statement`,
            severity: 'warning'
          });
          compatibilityImpact += 8;
        }
      }
    }
  }
  
  return { lines: newLines, compatibilityImpact };
}

/**
 * BigQuery INTERVAL syntax to Snowflake
 */
function transformBQIntervalToSnowflake(
  lines: string[], 
  issues: MigrationIssue[]
): {
  lines: string[];
  compatibilityImpact?: number;
} {
  const newLines = [...lines];
  let compatibilityImpact = 0;
  
  // Pattern for BigQuery interval expressions
  const intervalPattern = /INTERVAL\s+(\d+)\s+(\w+)/gi;
  
  for (let i = 0; i < newLines.length; i++) {
    const line = newLines[i];
    
    if (intervalPattern.test(line)) {
      issues.push({
        line: i + 1,
        message: `BigQuery INTERVAL syntax needs conversion for Snowflake`,
        suggestion: `Use Snowflake's DATEADD function instead of INTERVAL syntax`,
        severity: 'warning'
      });
      
      // This is a complex conversion that might need manual adjustment
      // We won't attempt to automatically convert all possible usages
      compatibilityImpact += 8;
    }
  }
  
  return { lines: newLines, compatibilityImpact };
}

/**
 * BigQuery UNNEST to Snowflake FLATTEN
 */
function transformBQUnnestToSnowflake(
  lines: string[], 
  issues: MigrationIssue[]
): {
  lines: string[];
  compatibilityImpact?: number;
} {
  const newLines = [...lines];
  let compatibilityImpact = 0;
  
  // Pattern for BigQuery UNNEST
  const unnestPattern = /UNNEST\(([^)]+)\)(\s+AS\s+(\w+))?/gi;
  
  for (let i = 0; i < newLines.length; i++) {
    const line = newLines[i];
    
    if (unnestPattern.test(line)) {
      // This is a simplistic replacement that works for some cases
      // Complex UNNEST usage might need manual adjustment
      newLines[i] = line.replace(unnestPattern, (match, array, _, alias) => {
        return `LATERAL FLATTEN(input => ${array})${alias ? ` AS ${alias}` : ''}`;
      });
      
      issues.push({
        line: i + 1,
        message: `BigQuery UNNEST converted to Snowflake FLATTEN`,
        suggestion: `Check the conversion as complex UNNEST scenarios may need manual adjustment`,
        severity: 'warning'
      });
      
      compatibilityImpact += 7;
    }
  }
  
  return { lines: newLines, compatibilityImpact };
}

/**
 * BigQuery date functions to Databricks syntax
 */
function transformBQDateFunctionsToDatabricks(
  lines: string[], 
  issues: MigrationIssue[]
): {
  lines: string[];
  compatibilityImpact?: number;
} {
  const newLines = [...lines];
  let compatibilityImpact = 0;
  
  // Define transformations: regex pattern -> replacement
  const transformations: [RegExp, string, string][] = [
    [/DATE_ADD\(([^,]+),\s*INTERVAL\s+(\d+)\s+DAY\)/gi, 'DATE_ADD($1, $2)', 'DATE_ADD format'],
    [/DATE_SUB\(([^,]+),\s*INTERVAL\s+(\d+)\s+DAY\)/gi, 'DATE_SUB($1, $2)', 'DATE_SUB format'],
    [/TIMESTAMP_ADD\(([^,]+),\s*INTERVAL\s+(\d+)\s+HOUR\)/gi, 'DATE_ADD($1, INTERVAL $2 HOURS)', 'TIMESTAMP_ADD to DATE_ADD'],
    [/TIMESTAMP_ADD\(([^,]+),\s*INTERVAL\s+(\d+)\s+MINUTE\)/gi, 'DATE_ADD($1, INTERVAL $2 MINUTES)', 'TIMESTAMP_ADD to DATE_ADD'],
    [/TIMESTAMP_ADD\(([^,]+),\s*INTERVAL\s+(\d+)\s+SECOND\)/gi, 'DATE_ADD($1, INTERVAL $2 SECONDS)', 'TIMESTAMP_ADD to DATE_ADD'],
    [/DATE_DIFF\(([^,]+),\s*([^,)]+),\s*DAY\)/gi, 'DATEDIFF(DAY, $2, $1)', 'DATE_DIFF to DATEDIFF'],
    [/FORMAT_DATE\(['"]([^'"]+)['"]\s*,\s*([^)]+)\)/gi, 'DATE_FORMAT($2, \'$1\')', 'FORMAT_DATE to DATE_FORMAT'],
    [/EXTRACT\((\w+)\s+FROM\s+([^)]+)\)/gi, 'EXTRACT($1 FROM $2)', 'EXTRACT format'],
  ];
  
  for (let i = 0; i < newLines.length; i++) {
    const line = newLines[i];
    
    for (const [pattern, replacement, description] of transformations) {
      if (pattern.test(line)) {
        newLines[i] = line.replace(pattern, replacement);
        
        issues.push({
          line: i + 1,
          message: `BigQuery date function needs conversion for Databricks`,
          suggestion: `Converted ${description}`,
          severity: 'info'
        });
        
        compatibilityImpact += 1;
      }
    }
    
    // Check for more complex patterns that might need manual adjustment
    if (/PARSE_DATE|PARSE_TIMESTAMP|FORMAT_TIMESTAMP/i.test(line)) {
      issues.push({
        line: i + 1,
        message: `Complex BigQuery date function may need manual adjustment`,
        suggestion: `Functions like PARSE_DATE and FORMAT_TIMESTAMP have different syntax in Databricks. Use TO_DATE, TO_TIMESTAMP, or DATE_FORMAT.`,
        severity: 'warning'
      });
      compatibilityImpact += 5;
    }
  }
  
  return { lines: newLines, compatibilityImpact };
}

/**
 * BigQuery array syntax to Databricks
 */
function transformBQArraysToDatabricks(
  lines: string[], 
  issues: MigrationIssue[]
): {
  lines: string[];
  compatibilityImpact?: number;
} {
  const newLines = [...lines];
  let compatibilityImpact = 0;
  
  // Array transformations: regex pattern -> replacement
  const transformations: [RegExp, string, string][] = [
    [/ARRAY_AGG\(([^)]+)\)/gi, 'COLLECT_LIST($1)', 'ARRAY_AGG to COLLECT_LIST'],
    [/ARRAY\[(.*?)\]/gi, 'ARRAY($1)', 'ARRAY[] to ARRAY()'],
    [/ARRAY_LENGTH\(([^)]+)\)/gi, 'SIZE($1)', 'ARRAY_LENGTH to SIZE'],
  ];
  
  for (let i = 0; i < newLines.length; i++) {
    const line = newLines[i];
    
    for (const [pattern, replacement, description] of transformations) {
      if (pattern.test(line)) {
        newLines[i] = line.replace(pattern, replacement);
        
        issues.push({
          line: i + 1,
          message: `BigQuery array syntax needs conversion for Databricks`,
          suggestion: `Converted ${description}`,
          severity: 'info'
        });
        
        compatibilityImpact += 2;
      }
    }
    
    // Check for array indexing - Databricks uses the same syntax as BigQuery
    
    // Check for more complex array operations
    if (/UNNEST|ARRAY_CONCAT|GENERATE_ARRAY/i.test(line)) {
      issues.push({
        line: i + 1,
        message: `Complex BigQuery array operation may need manual adjustment`,
        suggestion: `Functions like UNNEST, ARRAY_CONCAT, or GENERATE_ARRAY have different equivalents in Databricks. Consider using EXPLODE, CONCAT, or other Databricks array functions.`,
        severity: 'warning'
      });
      compatibilityImpact += 5;
    }
  }
  
  return { lines: newLines, compatibilityImpact };
}

/**
 * BigQuery table naming to Databricks
 */
function transformBQTableNamesToDatabricks(
  lines: string[], 
  issues: MigrationIssue[]
): {
  lines: string[];
  compatibilityImpact?: number;
} {
  const newLines = [...lines];
  let compatibilityImpact = 0;
  
  // Pattern for BigQuery table references with backticks
  const bqTablePattern = /`([^`]+)\.([^`]+)\.([^`]+)`/g;
  
  for (let i = 0; i < newLines.length; i++) {
    const line = newLines[i];
    
    if (bqTablePattern.test(line)) {
      // In Databricks, we can use either backticks or no quotes at all
      newLines[i] = line.replace(bqTablePattern, '$1.$2.$3');
      
      issues.push({
        line: i + 1,
        message: `BigQuery table reference format converted for Databricks`,
        suggestion: `Removed backtick quotes for database objects`,
        severity: 'info'
      });
      
      compatibilityImpact += 1;
    }
    
    // Check for dataset references without project (common in BigQuery)
    if (/\b(\w+)\.(\w+)\b/.test(line) && !/`\w+`\.`\w+`/.test(line)) {
      issues.push({
        line: i + 1,
        message: `Table reference may need catalog prefix for Databricks`,
        suggestion: `In Databricks with Unity Catalog, fully qualified references use catalog.schema.table format. You may need to add the appropriate catalog name.`,
        severity: 'info'
      });
    }
  }
  
  return { lines: newLines, compatibilityImpact };
}

/**
 * BigQuery PARTITION BY and CLUSTER BY clauses to Databricks
 */
function transformBQPartitionByToDatabricks(
  lines: string[], 
  issues: MigrationIssue[]
): {
  lines: string[];
  compatibilityImpact?: number;
} {
  const newLines = [...lines];
  let compatibilityImpact = 0;
  
  // Find CREATE TABLE statements with PARTITION BY
  for (let i = 0; i < newLines.length; i++) {
    const line = newLines[i].trim().toUpperCase();
    
    if (line.includes('PARTITION BY')) {
      // Try to convert PARTITION BY to Databricks' equivalent
      const partitionByPattern = /PARTITION\s+BY\s+([^)]+)/i;
      const match = newLines[i].match(partitionByPattern);
      
      if (match) {
        // Remove the original PARTITION BY and prepare to add Databricks version
        newLines[i] = newLines[i].replace(partitionByPattern, '');
        
        // Look for the end of CREATE TABLE statement to add PARTITIONED BY
        let j = i;
        let foundEnd = false;
        
        while (j < newLines.length && !foundEnd) {
          if (newLines[j].includes(');')) {
            newLines[j] = newLines[j].replace(');', `) PARTITIONED BY (${match[1]});`);
            foundEnd = true;
          }
          j++;
        }
        
        if (foundEnd) {
          issues.push({
            line: i + 1,
            message: `Converted BigQuery PARTITION BY to Databricks syntax`,
            suggestion: `Moved partitioning definition to end of CREATE TABLE statement`,
            severity: 'info'
          });
          compatibilityImpact += 3;
        } else {
          issues.push({
            line: i + 1,
            message: `Could not fully convert BigQuery PARTITION BY clause`,
            suggestion: `In Databricks, add "PARTITIONED BY (columns)" at the end of the CREATE TABLE statement`,
            severity: 'warning'
          });
          compatibilityImpact += 8;
        }
      }
    }
    
    if (line.includes('CLUSTER BY')) {
      // Try to convert CLUSTER BY to Databricks' equivalent (CLUSTERED BY)
      const clusterByPattern = /CLUSTER\s+BY\s+([^)]+)/i;
      const match = newLines[i].match(clusterByPattern);
      
      if (match) {
        // Remove the original CLUSTER BY and prepare to add Databricks version
        newLines[i] = newLines[i].replace(clusterByPattern, '');
        
        // Look for the end of CREATE TABLE statement to add CLUSTERED BY
        let j = i;
        let foundEnd = false;
        
        while (j < newLines.length && !foundEnd) {
          if (newLines[j].includes(');')) {
            newLines[j] = newLines[j].replace(');', `) CLUSTERED BY (${match[1]});`);
            foundEnd = true;
          }
          j++;
        }
        
        if (foundEnd) {
          issues.push({
            line: i + 1,
            message: `Converted BigQuery CLUSTER BY to Databricks syntax`,
            suggestion: `Moved clustering definition to end of CREATE TABLE statement`,
            severity: 'info'
          });
          compatibilityImpact += 3;
        } else {
          issues.push({
            line: i + 1,
            message: `Could not fully convert BigQuery CLUSTER BY clause`,
            suggestion: `In Databricks, add "CLUSTERED BY (columns)" at the end of the CREATE TABLE statement`,
            severity: 'warning'
          });
          compatibilityImpact += 8;
        }
      }
    }
  }
  
  return { lines: newLines, compatibilityImpact };
}

/**
 * BigQuery INTERVAL syntax to Databricks
 */
function transformBQIntervalToDatabricks(
  lines: string[], 
  issues: MigrationIssue[]
): {
  lines: string[];
  compatibilityImpact?: number;
} {
  const newLines = [...lines];
  let compatibilityImpact = 0;
  
  // Pattern for BigQuery interval expressions
  const intervalPattern = /INTERVAL\s+(\d+)\s+(\w+)/gi;
  
  for (let i = 0; i < newLines.length; i++) {
    const line = newLines[i];
    
    if (intervalPattern.test(line)) {
      // Databricks supports INTERVAL syntax but with a slightly different format
      newLines[i] = line.replace(intervalPattern, 'INTERVAL $1 $2');
      
      issues.push({
        line: i + 1,
        message: `BigQuery INTERVAL syntax adjusted for Databricks`,
        suggestion: `Databricks supports INTERVAL syntax with a similar format`,
        severity: 'info'
      });
      
      compatibilityImpact += 1;
    }
  }
  
  return { lines: newLines, compatibilityImpact };
}

/**
 * BigQuery UNNEST to Databricks EXPLODE
 */
function transformBQUnnestToDatabricks(
  lines: string[], 
  issues: MigrationIssue[]
): {
  lines: string[];
  compatibilityImpact?: number;
} {
  const newLines = [...lines];
  let compatibilityImpact = 0;
  
  // Pattern for BigQuery UNNEST
  const unnestPattern = /UNNEST\(([^)]+)\)(\s+AS\s+(\w+))?/gi;
  
  for (let i = 0; i < newLines.length; i++) {
    const line = newLines[i];
    
    if (unnestPattern.test(line)) {
      // This is a simplistic replacement that works for some cases
      // Complex UNNEST usage might need manual adjustment
      newLines[i] = line.replace(unnestPattern, (match, array, _, alias) => {
        return `LATERAL VIEW EXPLODE(${array}) ${alias || 'exploded_table'} AS ${alias || 'item'}`;
      });
      
      issues.push({
        line: i + 1,
        message: `BigQuery UNNEST converted to Databricks LATERAL VIEW EXPLODE`,
        suggestion: `Check the conversion as complex UNNEST scenarios may need manual adjustment`,
        severity: 'warning'
      });
      
      compatibilityImpact += 7;
    }
  }
  
  return { lines: newLines, compatibilityImpact };
}

/**
 * Snowflake date functions to BigQuery syntax
 */
function transformSFDateFunctionsToBigQuery(
  lines: string[], 
  issues: MigrationIssue[]
): {
  lines: string[];
  compatibilityImpact?: number;
} {
  const newLines = [...lines];
  let compatibilityImpact = 0;
  
  // Define transformations: regex pattern -> replacement
  const transformations: [RegExp, string, string][] = [
    [/DATEADD\(DAY,\s*(\d+),\s*([^)]+)\)/gi, 'DATE_ADD($2, INTERVAL $1 DAY)', 'DATEADD to DATE_ADD'],
    [/DATEADD\(DAY,\s*-(\d+),\s*([^)]+)\)/gi, 'DATE_SUB($2, INTERVAL $1 DAY)', 'DATEADD with negative to DATE_SUB'],
    [/DATEADD\(HOUR,\s*(\d+),\s*([^)]+)\)/gi, 'TIMESTAMP_ADD($2, INTERVAL $1 HOUR)', 'DATEADD to TIMESTAMP_ADD'],
    [/DATEADD\(MINUTE,\s*(\d+),\s*([^)]+)\)/gi, 'TIMESTAMP_ADD($2, INTERVAL $1 MINUTE)', 'DATEADD to TIMESTAMP_ADD'],
    [/DATEADD\(SECOND,\s*(\d+),\s*([^)]+)\)/gi, 'TIMESTAMP_ADD($2, INTERVAL $1 SECOND)', 'DATEADD to TIMESTAMP_ADD'],
    [/DATEDIFF\(DAY,\s*([^,]+),\s*([^)]+)\)/gi, 'DATE_DIFF($2, $1, DAY)', 'DATEDIFF to DATE_DIFF'],
    [/TO_CHAR\(([^,]+),\s*'([^']+)'\)/gi, 'FORMAT_DATE(\'$2\', $1)', 'TO_CHAR to FORMAT_DATE'],
  ];
  
  for (let i = 0; i < newLines.length; i++) {
    const line = newLines[i];
    
    for (const [pattern, replacement, description] of transformations) {
      if (pattern.test(line)) {
        newLines[i] = line.replace(pattern, replacement);
        
        issues.push({
          line: i + 1,
          message: `Snowflake date function needs conversion for BigQuery`,
          suggestion: `Converted ${description}`,
          severity: 'info'
        });
        
        compatibilityImpact += 1;
      }
    }
    
    // Check for more complex patterns that might need manual adjustment
    if (/TO_DATE|TO_TIMESTAMP|CONVERT_TIMEZONE/i.test(line)) {
      issues.push({
        line: i + 1,
        message: `Complex Snowflake date function may need manual adjustment`,
        suggestion: `Functions like TO_DATE, TO_TIMESTAMP, and CONVERT_TIMEZONE have different syntax in BigQuery. Use PARSE_DATE, PARSE_TIMESTAMP, or other BigQuery functions.`,
        severity: 'warning'
      });
      compatibilityImpact += 5;
    }
  }
  
  return { lines: newLines, compatibilityImpact };
}

/**
 * Snowflake VARIANT type to BigQuery JSON
 */
function transformSFVariantToBigQuery(
  lines: string[], 
  issues: MigrationIssue[]
): {
  lines: string[];
  compatibilityImpact?: number;
} {
  const newLines = [...lines];
  let compatibilityImpact = 0;
  
  // Pattern for Snowflake VARIANT type
  const variantPattern = /VARIANT/gi;
  
  // Pattern for Snowflake JSON access with colon
  const colonAccessPattern = /(\w+):(\w+)/g;
  
  // Pattern for Snowflake GET function
  const getPattern = /GET\(([^,]+),\s*'([^']+)'\)/gi;
  
  for (let i = 0; i < newLines.length; i++) {
    const line = newLines[i];
    
    // Convert VARIANT type to JSON
    if (variantPattern.test(line)) {
      newLines[i] = line.replace(variantPattern, 'JSON');
      
      issues.push({
        line: i + 1,
        message: `Snowflake VARIANT type converted to BigQuery JSON`,
        suggestion: `BigQuery uses JSON type instead of VARIANT`,
        severity: 'info'
      });
      
      compatibilityImpact += 2;
    }
    
    // Convert colon access to JSON_EXTRACT
    if (colonAccessPattern.test(line)) {
      newLines[i] = line.replace(colonAccessPattern, 'JSON_EXTRACT($1, \'$.$2\')');
      
      issues.push({
        line: i + 1,
        message: `Snowflake JSON access syntax converted for BigQuery`,
        suggestion: `Converted column:attribute to JSON_EXTRACT(column, '$.attribute')`,
        severity: 'info'
      });
      
      compatibilityImpact += 3;
    }
    
    // Convert GET function to JSON_EXTRACT
    if (getPattern.test(line)) {
      newLines[i] = line.replace(getPattern, 'JSON_EXTRACT($1, \'$.$2\')');
      
      issues.push({
        line: i + 1,
        message: `Snowflake GET function converted to BigQuery JSON_EXTRACT`,
        suggestion: `Converted GET(column, 'attribute') to JSON_EXTRACT(column, '$.attribute')`,
        severity: 'info'
      });
      
      compatibilityImpact += 3;
    }
    
    // Check for more complex JSON operations
    if (/PARSE_JSON|TRY_PARSE_JSON|FLATTEN|LATERAL/i.test(line)) {
      issues.push({
        line: i + 1,
        message: `Complex Snowflake JSON operation may need manual adjustment`,
        suggestion: `Functions like PARSE_JSON, TRY_PARSE_JSON, FLATTEN, or LATERAL have different equivalents in BigQuery. Consider using JSON_EXTRACT, UNNEST, or other BigQuery functions.`,
        severity: 'warning'
      });
      compatibilityImpact += 5;
    }
  }
  
  return { lines: newLines, compatibilityImpact };
}

/**
 * Snowflake table naming to BigQuery
 */
function transformSFTableNamesToBigQuery(
  lines: string[], 
  issues: MigrationIssue[]
): {
  lines: string[];
  compatibilityImpact?: number;
} {
  const newLines = [...lines];
  let compatibilityImpact = 0;
  
  // Pattern for Snowflake table references with double quotes
  const sfTablePattern = /"([^"]+)"\."([^"]+)"\."([^"]+)"/g;
  
  for (let i = 0; i < newLines.length; i++) {
    const line = newLines[i];
    
    if (sfTablePattern.test(line)) {
      newLines[i] = line.replace(sfTablePattern, '`$1.$2.$3`');
      
      issues.push({
        line: i + 1,
        message: `Snowflake table reference format converted for BigQuery`,
        suggestion: `Converted double quotes to backtick quotes for database objects`,
        severity: 'info'
      });
      
      compatibilityImpact += 1;
    }
    
    // Check for database references (Snowflake uses three-part naming)
    if (/\b(\w+)\.(\w+)\.(\w+)\b/.test(line) && !/`\w+\.\w+\.\w+`/.test(line)) {
      newLines[i] = line.replace(/\b(\w+)\.(\w+)\.(\w+)\b/g, '`$1.$2.$3`');
      
      issues.push({
        line: i + 1,
        message: `Snowflake table reference format converted for BigQuery`,
        suggestion: `Added backtick quotes around fully qualified table names`,
        severity: 'info'
      });
      
      compatibilityImpact += 1;
    }
  }
  
  return { lines: newLines, compatibilityImpact };
}

/**
 * Snowflake semi-structured data handling to BigQuery
 */
function transformSFSemiStructuredToBigQuery(
  lines: string[], 
  issues: MigrationIssue[]
): {
  lines: string[];
  compatibilityImpact?: number;
} {
  const newLines = [...lines];
  let compatibilityImpact = 0;
  
  // Pattern for Snowflake FLATTEN function
  const flattenPattern = /LATERAL\s+FLATTEN\s*\(\s*input\s*=>\s*([^)]+)\)(\s+AS\s+(\w+))?/gi;
  
  for (let i = 0; i < newLines.length; i++) {
    const line = newLines[i];
    
    // Convert FLATTEN to UNNEST
    if (flattenPattern.test(line)) {
      newLines[i] = line.replace(flattenPattern, (match, array, _, alias) => {
        return `UNNEST(${array})${alias ? ` AS ${alias}` : ''}`;
      });
      
      issues.push({
        line: i + 1,
        message: `Snowflake FLATTEN converted to BigQuery UNNEST`,
        suggestion: `Check the conversion as complex FLATTEN scenarios may need manual adjustment`,
        severity: 'warning'
      });
      
      compatibilityImpact += 7;
    }
    
    // Check for other semi-structured data functions
    if (/OBJECT_CONSTRUCT|ARRAY_CONSTRUCT|ARRAY_SIZE|ARRAY_CONTAINS/i.test(line)) {
      issues.push({
        line: i + 1,
        message: `Snowflake semi-structured data function may need manual adjustment`,
        suggestion: `Functions like OBJECT_CONSTRUCT, ARRAY_CONSTRUCT, ARRAY_SIZE, or ARRAY_CONTAINS have different equivalents in BigQuery. Consider using STRUCT, ARRAY, ARRAY_LENGTH, or other BigQuery functions.`,
        severity: 'warning'
      });
      compatibilityImpact += 5;
    }
  }
  
  return { lines: newLines, compatibilityImpact };
}

/**
 * Snowflake MERGE to BigQuery
 */
function transformSFMergeToBigQuery(
  lines: string[], 
  issues: MigrationIssue[]
): {
  lines: string[];
  compatibilityImpact?: number;
} {
  const newLines = [...lines];
  let compatibilityImpact = 0;
  
  // Check for MERGE statements
  for (let i = 0; i < newLines.length; i++) {
    const line = newLines[i].trim().toUpperCase();
    
    if (line.startsWith('MERGE INTO')) {
      issues.push({
        line: i + 1,
        message: `Snowflake MERGE statement may need adjustment for BigQuery`,
        suggestion: `BigQuery supports MERGE but with some syntax differences. Review the MERGE statement carefully.`,
        severity: 'warning'
      });
      compatibilityImpact += 5;
    }
  }
  
  return { lines: newLines, compatibilityImpact };
}

/**
 * Snowflake date functions to Databricks syntax
 */
function transformSFDateFunctionsToDatabricks(
  lines: string[], 
  issues: MigrationIssue[]
): {
  lines: string[];
  compatibilityImpact?: number;
} {
  const newLines = [...lines];
  let compatibilityImpact = 0;
  
  // Define transformations: regex pattern -> replacement
  const transformations: [RegExp, string, string][] = [
    [/DATEADD\(DAY,\s*(\d+),\s*([^)]+)\)/gi, 'DATE_ADD($2, $1)', 'DATEADD to DATE_ADD'],
    [/DATEADD\(DAY,\s*-(\d+),\s*([^)]+)\)/gi, 'DATE_SUB($2, $1)', 'DATEADD with negative to DATE_SUB'],
    [/DATEADD\(HOUR,\s*(\d+),\s*([^)]+)\)/gi, 'DATE_ADD($2, INTERVAL $1 HOURS)', 'DATEADD to DATE_ADD with INTERVAL'],
    [/DATEADD\(MINUTE,\s*(\d+),\s*([^)]+)\)/gi, 'DATE_ADD($2, INTERVAL $1 MINUTES)', 'DATEADD to DATE_ADD with INTERVAL'],
    [/DATEADD\(SECOND,\s*(\d+),\s*([^)]+)\)/gi, 'DATE_ADD($2, INTERVAL $1 SECONDS)', 'DATEADD to DATE_ADD with INTERVAL'],
    [/DATEDIFF\(DAY,\s*([^,]+),\s*([^)]+)\)/gi, 'DATEDIFF($2, $1)', 'DATEDIFF parameter order'],
    [/TO_CHAR\(([^,]+),\s*'([^']+)'\)/gi, 'DATE_FORMAT($1, \'$2\')', 'TO_CHAR to DATE_FORMAT'],
  ];
  
  for (let i = 0; i < newLines.length; i++) {
    const line = newLines[i];
    
    for (const [pattern, replacement, description] of transformations) {
      if (pattern.test(line)) {
        newLines[i] = line.replace(pattern, replacement);
        
        issues.push({
          line: i + 1,
          message: `Snowflake date function needs conversion for Databricks`,
          suggestion: `Converted ${description}`,
          severity: 'info'
        });
        
        compatibilityImpact += 1;
      }
    }
    
    // Check for more complex patterns that might need manual adjustment
    if (/TO_DATE|TO_TIMESTAMP|CONVERT_TIMEZONE/i.test(line)) {
      issues.push({
        line: i + 1,
        message: `Complex Snowflake date function may need manual adjustment`,
        suggestion: `Functions like TO_DATE, TO_TIMESTAMP, and CONVERT_TIMEZONE have different syntax in Databricks. Use TO_DATE, TO_TIMESTAMP, or other Databricks functions.`,
        severity: 'warning'
      });
      compatibilityImpact += 5;
    }
  }
  
  return { lines: newLines, compatibilityImpact };
}

/**
 * Snowflake VARIANT type to Databricks
 */
function transformSFVariantToDatabricks(
  lines: string[], 
  issues: MigrationIssue[]
): {
  lines: string[];
  compatibilityImpact?: number;
} {
  const newLines = [...lines];
  let compatibilityImpact = 0;
  
  // Pattern for Snowflake VARIANT type
  const variantPattern = /VARIANT/gi;
  
  // Pattern for Snowflake JSON access with colon
  const colonAccessPattern = /(\w+):(\w+)/g;
  
  // Pattern for Snowflake GET function
  const getPattern = /GET\(([^,]+),\s*'([^']+)'\)/gi;
  
  for (let i = 0; i < newLines.length; i++) {
    const line = newLines[i];
    
    // Convert VARIANT type to STRING
    if (variantPattern.test(line)) {
      newLines[i] = line.replace(variantPattern, 'STRING');
      
      issues.push({
        line: i + 1,
        message: `Snowflake VARIANT type converted to Databricks STRING`,
        suggestion: `Databricks typically uses STRING for JSON data, but you may need to parse it with from_json()`,
        severity: 'warning'
      });
      
      compatibilityImpact += 5;
    }
    
    // Convert colon access to get_json_object
    if (colonAccessPattern.test(line)) {
      newLines[i] = line.replace(colonAccessPattern, 'get_json_object($1, \'$.$2\')');
      
      issues.push({
        line: i + 1,
        message: `Snowflake JSON access syntax converted for Databricks`,
        suggestion: `Converted column:attribute to get_json_object(column, '$.attribute')`,
        severity: 'info'
      });
      
      compatibilityImpact += 3;
    }
    
    // Convert GET function to get_json_object
    if (getPattern.test(line)) {
      newLines[i] = line.replace(getPattern, 'get_json_object($1, \'$.$2\')');
      
      issues.push({
        line: i + 1,
        message: `Snowflake GET function converted to Databricks get_json_object`,
        suggestion: `Converted GET(column, 'attribute') to get_json_object(column, '$.attribute')`,
        severity: 'info'
      });
      
      compatibilityImpact += 3;
    }
    
    // Check for more complex JSON operations
    if (/PARSE_JSON|TRY_PARSE_JSON|FLATTEN|LATERAL/i.test(line)) {
      issues.push({
        line: i + 1,
        message: `Complex Snowflake JSON operation may need manual adjustment`,
        suggestion: `Functions like PARSE_JSON, TRY_PARSE_JSON, FLATTEN, or LATERAL have different equivalents in Databricks. Consider using from_json, to_json, explode, or other Databricks functions.`,
        severity: 'warning'
      });
      compatibilityImpact += 5;
    }
  }
  
  return { lines: newLines, compatibilityImpact };
}

/**
 * Snowflake table naming to Databricks
 */
function transformSFTableNamesToDatabricks(
  lines: string[], 
  issues: MigrationIssue[]
): {
  lines: string[];
  compatibilityImpact?: number;
} {
  const newLines = [...lines];
  let compatibilityImpact = 0;
  
  // Pattern for Snowflake table references with double quotes
  const sfTablePattern = /"([^"]+)"\."([^"]+)"\."([^"]+)"/g;
  
  for (let i = 0; i < newLines.length; i++) {
    const line = newLines[i];
    
    if (sfTablePattern.test(line)) {
      newLines[i] = line.replace(sfTablePattern, '$1.$2.$3');
      
      issues.push({
        line: i + 1,
        message: `Snowflake table reference format converted for Databricks`,
        suggestion: `Removed double quotes from database objects`,
        severity: 'info'
      });
      
      compatibilityImpact += 1;
    }
    
    // Check for database references (both use three-part naming)
    if (/\b(\w+)\.(\w+)\.(\w+)\b/.test(line)) {
      issues.push({
        line: i + 1,
        message: `Table reference format may need adjustment for Databricks`,
        suggestion: `In Databricks with Unity Catalog, references use catalog.schema.table format. Ensure the catalog name is appropriate.`,
        severity: 'info'
      });
    }
  }
  
  return { lines: newLines, compatibilityImpact };
}

/**
 * Snowflake semi-structured data handling to Databricks
 */
function transformSFSemiStructuredToDatabricks(
  lines: string[], 
  issues: MigrationIssue[]
): {
  lines: string[];
  compatibilityImpact?: number;
} {
  const newLines = [...lines];
  let compatibilityImpact = 0;
  
  // Pattern for Snowflake FLATTEN function
  const flattenPattern = /LATERAL\s+FLATTEN\s*\(\s*input\s*=>\s*([^)]+)\)(\s+AS\s+(\w+))?/gi;
  
  for (let i = 0; i < newLines.length; i++) {
    const line = newLines[i];
    
    // Convert FLATTEN to LATERAL VIEW EXPLODE
    if (flattenPattern.test(line)) {
      newLines[i] = line.replace(flattenPattern, (match, array, _, alias) => {
        return `LATERAL VIEW EXPLODE(${array}) ${alias || 'exploded_table'} AS ${alias || 'item'}`;
      });
      
      issues.push({
        line: i + 1,
        message: `Snowflake FLATTEN converted to Databricks LATERAL VIEW EXPLODE`,
        suggestion: `Check the conversion as complex FLATTEN scenarios may need manual adjustment`,
        severity: 'warning'
      });
      
      compatibilityImpact += 7;
    }
    
    // Check for other semi-structured data functions
    if (/OBJECT_CONSTRUCT|ARRAY_CONSTRUCT|ARRAY_SIZE|ARRAY_CONTAINS/i.test(line)) {
      issues.push({
        line: i + 1,
        message: `Snowflake semi-structured data function may need manual adjustment`,
        suggestion: `Functions like OBJECT_CONSTRUCT, ARRAY_CONSTRUCT, ARRAY_SIZE, or ARRAY_CONTAINS have different equivalents in Databricks. Consider using struct, array, size, array_contains, or other Databricks functions.`,
        severity: 'warning'
      });
      compatibilityImpact += 5;
    }
  }
  
  return { lines: newLines, compatibilityImpact };
}

/**
 * Snowflake MERGE to Databricks
 */
function transformSFMergeToDatabricks(
  lines: string[], 
  issues: MigrationIssue[]
): {
  lines: string[];
  compatibilityImpact?: number;
} {
  const newLines = [...lines];
  let compatibilityImpact = 0;
  
  // Check for MERGE statements
  for (let i = 0; i < newLines.length; i++) {
    const line = newLines[i].trim().toUpperCase();
    
    if (line.startsWith('MERGE INTO')) {
      // Databricks uses MERGE INTO as well, but with some syntax differences
      issues.push({
        line: i + 1,
        message: `Snowflake MERGE statement may need adjustment for Databricks`,
        suggestion: `Databricks supports MERGE INTO but with some syntax differences. Review the MERGE statement carefully.`,
        severity: 'warning'
      });
      compatibilityImpact += 5;
      
      // Try to convert "MERGE INTO target USING source" to "MERGE INTO target USING source"
      // This is a simple case that should work in both platforms
    }
  }
  
  return { lines: newLines, compatibilityImpact };
}

/**
 * Databricks date functions to BigQuery syntax
 */
function transformDBDateFunctionsToBigQuery(
  lines: string[], 
  issues: MigrationIssue[]
): {
  lines: string[];
  compatibilityImpact?: number;
} {
  const newLines = [...lines];
  let compatibilityImpact = 0;
  
  // Define transformations: regex pattern -> replacement
  const transformations: [RegExp, string, string][] = [
    [/DATE_ADD\(([^,]+),\s*(\d+)\)/gi, 'DATE_ADD($1, INTERVAL $2 DAY)', 'DATE_ADD to BigQuery DATE_ADD'],
    [/DATE_SUB\(([^,]+),\s*(\d+)\)/gi, 'DATE_SUB($1, INTERVAL $2 DAY)', 'DATE_SUB to BigQuery DATE_SUB'],
    [/DATE_ADD\(([^,]+),\s*INTERVAL\s+(\d+)\s+HOURS\)/gi, 'TIMESTAMP_ADD($1, INTERVAL $2 HOUR)', 'DATE_ADD with INTERVAL to TIMESTAMP_ADD'],
    [/DATE_ADD\(([^,]+),\s*INTERVAL\s+(\d+)\s+MINUTES\)/gi, 'TIMESTAMP_ADD($1, INTERVAL $2 MINUTE)', 'DATE_ADD with INTERVAL to TIMESTAMP_ADD'],
    [/DATE_ADD\(([^,]+),\s*INTERVAL\s+(\d+)\s+SECONDS\)/gi, 'TIMESTAMP_ADD($1, INTERVAL $2 SECOND)', 'DATE_ADD with INTERVAL to TIMESTAMP_ADD'],
    [/DATEDIFF\(([^,]+),\s*([^)]+)\)/gi, 'DATE_DIFF($1, $2, DAY)', 'DATEDIFF to DATE_DIFF'],
    [/DATE_FORMAT\(([^,]+),\s*'([^']+)'\)/gi, 'FORMAT_DATE(\'$2\', $1)', 'DATE_FORMAT to FORMAT_DATE'],
  ];
  
  for (let i = 0; i < newLines.length; i++) {
    const line = newLines[i];
    
    for (const [pattern, replacement, description] of transformations) {
      if (pattern.test(line)) {
        newLines[i] = line.replace(pattern, replacement);
        
        issues.push({
          line: i + 1,
          message: `Databricks date function needs conversion for BigQuery`,
          suggestion: `Converted ${description}`,
          severity: 'info'
        });
        
        compatibilityImpact += 1;
      }
    }
    
    // Check for more complex patterns that might need manual adjustment
    if (/TO_UTC_TIMESTAMP|FROM_UTC_TIMESTAMP|NEXT_DAY|ADD_MONTHS/i.test(line)) {
      issues.push({
        line: i + 1,
        message: `Complex Databricks date function may need manual adjustment`,
        suggestion: `Functions like TO_UTC_TIMESTAMP, FROM_UTC_TIMESTAMP, NEXT_DAY, or ADD_MONTHS have different equivalents in BigQuery.`,
        severity: 'warning'
      });
      compatibilityImpact += 5;
    }
  }
  
  return { lines: newLines, compatibilityImpact };
}

/**
 * Databricks Delta Lake to BigQuery
 */
function transformDBDeltaToBigQuery(
  lines: string[], 
  issues: MigrationIssue[]
): {
  lines: string[];
  compatibilityImpact?: number;
} {
  const newLines = [...lines];
  let compatibilityImpact = 0;
  
  // Check for Delta Lake specific syntax
  for (let i = 0; i < newLines.length; i++) {
    const line = newLines[i];
    
    if (/\bDELTA\b/i.test(line)) {
      issues.push({
        line: i + 1,
        message: `Databricks Delta Lake syntax detected`,
        suggestion: `BigQuery doesn't support Delta Lake. Consider using BigQuery's native table format.`,
        severity: 'warning'
      });
      compatibilityImpact += 8;
    }
    
    if (/\bVACUUM\b/i.test(line)) {
      issues.push({
        line: i + 1,
        message: `Databricks VACUUM command not supported in BigQuery`,
        suggestion: `BigQuery handles storage optimization automatically. Remove VACUUM commands.`,
        severity: 'warning'
      });
      compatibilityImpact += 5;
    }
    
    if (/\bOPTIMIZE\b/i.test(line)) {
      issues.push({
        line: i + 1,
        message: `Databricks OPTIMIZE command not supported in BigQuery`,
        suggestion: `BigQuery handles file compaction automatically. Remove OPTIMIZE commands.`,
        severity: 'warning'
      });
      compatibilityImpact += 5;
    }
  }
  
  return { lines: newLines, compatibilityImpact };
}

/**
 * Databricks table naming to BigQuery
 */
function transformDBTableNamesToBigQuery(
  lines: string[], 
  issues: MigrationIssue[]
): {
  lines: string[];
  compatibilityImpact?: number;
} {
  const newLines = [...lines];
  let compatibilityImpact = 0;
  
  // Pattern for Databricks table references with three parts
  const dbTablePattern = /\b(\w+)\.(\w+)\.(\w+)\b/g;
  
  for (let i = 0; i < newLines.length; i++) {
    const line = newLines[i];
    
    if (dbTablePattern.test(line)) {
      newLines[i] = line.replace(dbTablePattern, '`$1.$2.$3`');
      
      issues.push({
        line: i + 1,
        message: `Databricks table reference format converted for BigQuery`,
        suggestion: `Added backtick quotes around fully qualified table names`,
        severity: 'info'
      });
      
      compatibilityImpact += 1;
    }
  }
  
  return { lines: newLines, compatibilityImpact };
}

/**
 * Databricks ZORDER BY to BigQuery
 */
function transformDBZOrderToBigQuery(
  lines: string[], 
  issues: MigrationIssue[]
): {
  lines: string[];
  compatibilityImpact?: number;
} {
  const newLines = [...lines];
  let compatibilityImpact = 0;
  
  // Pattern for ZORDER BY
  const zorderPattern = /ZORDER\s+BY\s+\(([^)]+)\)/i;
  
  for (let i = 0; i < newLines.length; i++) {
    const line = newLines[i];
    
    if (zorderPattern.test(line)) {
      const match = line.match(zorderPattern);
      if (match) {
        // Try to convert to CLUSTER BY
        newLines[i] = line.replace(zorderPattern, 'CLUSTER BY ($1)');
        
        issues.push({
          line: i + 1,
          message: `Databricks ZORDER BY converted to BigQuery CLUSTER BY`,
          suggestion: `ZORDER BY in Databricks is similar to CLUSTER BY in BigQuery, but they have some differences in behavior`,
          severity: 'warning'
        });
        
        compatibilityImpact += 5;
      }
    }
  }
  
  return { lines: newLines, compatibilityImpact };
}

/**
 * Databricks catalog references to BigQuery
 */
function transformDBCatalogToBigQuery(
  lines: string[], 
  issues: MigrationIssue[]
): {
  lines: string[];
  compatibilityImpact?: number;
} {
  const newLines = [...lines];
  let compatibilityImpact = 0;
  
  // Check for Databricks catalog-specific functions
  for (let i = 0; i < newLines.length; i++) {
    const line = newLines[i];
    
    if (/\bCURRENT_CATALOG\(\)|\bCURRENT_DATABASE\(\)/i.test(line)) {
      issues.push({
        line: i + 1,
        message: `Databricks catalog function not directly supported in BigQuery`,
        suggestion: `BigQuery doesn't have direct equivalents for CURRENT_CATALOG() or CURRENT_DATABASE(). Consider hardcoding the project and dataset names.`,
        severity: 'warning'
      });
      compatibilityImpact += 5;
    }
  }
  
  return { lines: newLines, compatibilityImpact };
}

/**
 * Databricks date functions to Snowflake syntax
 */
function transformDBDateFunctionsToSnowflake(
  lines: string[], 
  issues: MigrationIssue[]
): {
  lines: string[];
  compatibilityImpact?: number;
} {
  const newLines = [...lines];
  let compatibilityImpact = 0;
  
  // Define transformations: regex pattern -> replacement
  const transformations: [RegExp, string, string][] = [
    [/DATE_ADD\(([^,]+),\s*(\d+)\)/gi, 'DATEADD(DAY, $2, $1)', 'DATE_ADD to DATEADD'],
    [/DATE_SUB\(([^,]+),\s*(\d+)\)/gi, 'DATEADD(DAY, -$2, $1)', 'DATE_SUB to DATEADD with negative'],
    [/DATE_ADD\(([^,]+),\s*INTERVAL\s+(\d+)\s+HOURS\)/gi, 'DATEADD(HOUR, $2, $1)', 'DATE_ADD with INTERVAL to DATEADD'],
    [/DATE_ADD\(([^,]+),\s*INTERVAL\s+(\d+)\s+MINUTES\)/gi, 'DATEADD(MINUTE, $2, $1)', 'DATE_ADD with INTERVAL to DATEADD'],
    [/DATE_ADD\(([^,]+),\s*INTERVAL\s+(\d+)\s+SECONDS\)/gi, 'DATEADD(SECOND, $2, $1)', 'DATE_ADD with INTERVAL to DATEADD'],
    [/DATEDIFF\(([^,]+),\s*([^)]+)\)/gi, 'DATEDIFF(DAY, $2, $1)', 'DATEDIFF to Snowflake DATEDIFF'],
    [/DATE_FORMAT\(([^,]+),\s*'([^']+)'\)/gi, 'TO_CHAR($1, \'$2\')', 'DATE_FORMAT to TO_CHAR'],
  ];
  
  for (let i = 0; i < newLines.length; i++) {
    const line = newLines[i];
    
    for (const [pattern, replacement, description] of transformations) {
      if (pattern.test(line)) {
        newLines[i] = line.replace(pattern, replacement);
        
        issues.push({
          line: i + 1,
          message: `Databricks date function needs conversion for Snowflake`,
          suggestion: `Converted ${description}`,
          severity: 'info'
        });
        
        compatibilityImpact += 1;
      }
    }
    
    // Check for more complex patterns that might need manual adjustment
    if (/TO_UTC_TIMESTAMP|FROM_UTC_TIMESTAMP|NEXT_DAY|ADD_MONTHS/i.test(line)) {
      issues.push({
        line: i + 1,
        message: `Complex Databricks date function may need manual adjustment`,
        suggestion: `Functions like TO_UTC_TIMESTAMP, FROM_UTC_TIMESTAMP, NEXT_DAY, or ADD_MONTHS have different equivalents in Snowflake.`,
        severity: 'warning'
      });
      compatibilityImpact += 5;
    }
  }
  
  return { lines: newLines, compatibilityImpact };
}

/**
 * Databricks Delta Lake to Snowflake
 */
function transformDBDeltaToSnowflake(
  lines: string[], 
  issues: MigrationIssue[]
): {
  lines: string[];
  compatibilityImpact?: number;
} {
  const newLines = [...lines];
  let compatibilityImpact = 0;
  
  // Check for Delta Lake specific syntax
  for (let i = 0; i < newLines.length; i++) {
    const line = newLines[i];
    
    if (/\bDELTA\b/i.test(line)) {
      issues.push({
        line: i + 1,
        message: `Databricks Delta Lake syntax detected`,
        suggestion: `Snowflake doesn't support Delta Lake. Consider using Snowflake's native table format.`,
        severity: 'warning'
      });
      compatibilityImpact += 8;
    }
    
    if (/\bVACUUM\b/i.test(line)) {
      issues.push({
        line: i + 1,
        message: `Databricks VACUUM command not supported in Snowflake`,
        suggestion: `Snowflake handles storage optimization differently. Consider using TIME TRAVEL or zero-copy cloning instead.`,
        severity: 'warning'
      });
      compatibilityImpact += 5;
    }
    
    if (/\bOPTIMIZE\b/i.test(line)) {
      issues.push({
        line: i + 1,
        message: `Databricks OPTIMIZE command not supported in Snowflake`,
        suggestion: `Snowflake handles file compaction automatically. Remove OPTIMIZE commands.`,
        severity: 'warning'
      });
      compatibilityImpact += 5;
    }
  }
  
  return { lines: newLines, compatibilityImpact };
}

/**
 * Databricks table naming to Snowflake
 */
function transformDBTableNamesToSnowflake(
  lines: string[], 
  issues: MigrationIssue[]
): {
  lines: string[];
  compatibilityImpact?: number;
} {
  const newLines = [...lines];
  let compatibilityImpact = 0;
  
  // Pattern for Databricks table references with three parts
  const dbTablePattern = /\b(\w+)\.(\w+)\.(\w+)\b/g;
  
  for (let i = 0; i < newLines.length; i++) {
    const line = newLines[i];
    
    if (dbTablePattern.test(line)) {
      newLines[i] = line.replace(dbTablePattern, '"$1"."$2"."$3"');
      
      issues.push({
        line: i + 1,
        message: `Databricks table reference format converted for Snowflake`,
        suggestion: `Added double quotes around fully qualified table names`,
        severity: 'info'
      });
      
      compatibilityImpact += 1;
    }
  }
  
  return { lines: newLines, compatibilityImpact };
}

/**
 * Databricks ZORDER BY to Snowflake
 */
function transformDBZOrderToSnowflake(
  lines: string[], 
  issues: MigrationIssue[]
): {
  lines: string[];
  compatibilityImpact?: number;
} {
  const newLines = [...lines];
  let compatibilityImpact = 0;
  
  // Pattern for ZORDER BY
  const zorderPattern = /ZORDER\s+BY\s+\(([^)]+)\)/i;
  
  for (let i = 0; i < newLines.length; i++) {
    const line = newLines[i];
    
    if (zorderPattern.test(line)) {
      const match = line.match(zorderPattern);
      if (match) {
        // Try to convert to CLUSTER BY
        newLines[i] = line.replace(zorderPattern, 'CLUSTER BY ($1)');
        
        issues.push({
          line: i + 1,
          message: `Databricks ZORDER BY converted to Snowflake CLUSTER BY`,
          suggestion: `ZORDER BY in Databricks is similar to CLUSTER BY in Snowflake, but they have some differences in behavior`,
          severity: 'warning'
        });
        
        compatibilityImpact += 5;
      }
    }
  }
  
  return { lines: newLines, compatibilityImpact };
}

/**
 * Databricks catalog references to Snowflake
 */
function transformDBCatalogToSnowflake(
  lines: string[], 
  issues: MigrationIssue[]
): {
  lines: string[];
  compatibilityImpact?: number;
} {
  const newLines = [...lines];
  let compatibilityImpact = 0;
  
  // Check for Databricks catalog-specific functions and convert to Snowflake equivalents
  const catalogFunctions: [RegExp, string, string][] = [
    [/CURRENT_CATALOG\(\)/gi, 'CURRENT_DATABASE()', 'CURRENT_CATALOG to CURRENT_DATABASE'],
    [/CURRENT_DATABASE\(\)/gi, 'CURRENT_SCHEMA()', 'CURRENT_DATABASE to CURRENT_SCHEMA'],
    [/CURRENT_SCHEMA\(\)/gi, 'CURRENT_SCHEMA()', 'CURRENT_SCHEMA (no change)'],
  ];
  
  for (let i = 0; i < newLines.length; i++) {
    const line = newLines[i];
    
    for (const [pattern, replacement, description] of catalogFunctions) {
      if (pattern.test(line)) {
        newLines[i] = line.replace(pattern, replacement);
        
        issues.push({
          line: i + 1,
          message: `Databricks catalog function converted for Snowflake`,
          suggestion: `Converted ${description}`,
          severity: 'info'
        });
        
        compatibilityImpact += 1;
      }
    }
  }
  
  return { lines: newLines, compatibilityImpact };
}

export type { MigrationResult, MigrationIssue };
