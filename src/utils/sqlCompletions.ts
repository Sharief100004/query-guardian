
import { Platform } from './sqlValidator';

// SQL Keywords common to all platforms
const SQL_COMMON_KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN',
  'OUTER JOIN', 'FULL JOIN', 'ON', 'GROUP BY', 'ORDER BY', 'HAVING',
  'LIMIT', 'OFFSET', 'UNION', 'UNION ALL', 'INTERSECT', 'EXCEPT',
  'AS', 'AND', 'OR', 'NOT', 'IN', 'EXISTS', 'BETWEEN', 'LIKE',
  'IS NULL', 'IS NOT NULL', 'ASC', 'DESC', 'DISTINCT', 'COUNT',
  'SUM', 'AVG', 'MIN', 'MAX', 'WITH', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
  'CAST', 'COALESCE', 'NULLIF'
];

// Platform-specific SQL keywords
const PLATFORM_KEYWORDS: Record<Platform, string[]> = {
  bigquery: [
    'ARRAY', 'STRUCT', 'UNNEST', 'PARTITION BY', 'CLUSTER BY', 
    'QUALIFY', 'WINDOW', 'OVER', 'ROW_NUMBER', 'RANK', 'DENSE_RANK',
    'NTILE', 'LEAD', 'LAG', 'PERCENTILE_CONT', 'PERCENTILE_DISC',
    'ARRAY_AGG', 'STRING_AGG', 'ANY_VALUE', 'APPROX_COUNT_DISTINCT',
    'BIT_AND', 'BIT_OR', 'BIT_XOR', 'LOGICAL_AND', 'LOGICAL_OR',
    'JSON_EXTRACT', 'JSON_QUERY', 'JSON_VALUE', 'PARSE_JSON',
    'FORMAT', 'GENERATE_ARRAY', 'GENERATE_DATE_ARRAY',
    'CURRENT_TIMESTAMP', 'EXTRACT', 'DATE_TRUNC',
    'DATE_ADD', 'DATE_SUB', 'TIMESTAMP_ADD', 'TIMESTAMP_SUB',
    'SAFE_CAST', 'SAFE_DIVIDE', 'IF', 'IFNULL'
  ],
  snowflake: [
    'COPY', 'MERGE', 'CREATE OR REPLACE', 'CLONE', 'RLIKE',
    'ILIKE', 'SEMI STRUCTURED', 'VARIANT', 'OBJECT', 'ARRAY',
    'FLATTEN', 'LATERAL', 'SAMPLE', 'QUALIFY', 'PIVOT', 'UNPIVOT',
    'CONNECT BY', 'START WITH', 'PRIOR', 'IFF', 'REGEXP',
    'REGEXP_REPLACE', 'REGEXP_SUBSTR', 'REGEXP_COUNT',
    'GENERATOR', 'SEQ1', 'SEQ2', 'SEQ4', 'SEQ8',
    'RANDOM', 'UUID_STRING', 'UUID_STRING', 'CURRENT_ACCOUNT',
    'CURRENT_REGION', 'CURRENT_SESSION', 'CURRENT_ROLE',
    'CURRENT_WAREHOUSE', 'CURRENT_DATABASE', 'CURRENT_SCHEMA',
    'DATEADD', 'DATEDIFF', 'DATE_TRUNC', 'TIMESTAMPADD',
    'TIMESTAMPDIFF', 'TRY_CAST', 'TRY_TO_DATE', 'TRY_TO_TIMESTAMP',
    'TRY_TO_NUMBER', 'TRY_PARSE_JSON', 'PARSE_JSON', 'GET_PATH',
    'GET', 'OBJECT_CONSTRUCT', 'ARRAY_CONSTRUCT', 'ARRAY_SIZE',
    'ARRAY_CONTAINS', 'SHOW', 'WAREHOUSE', 'ROLE', 'ACCOUNT', 'USER', 
    'DATABASE', 'SCHEMA', 'TABLE', 'VIEW', 'MATERIALIZED VIEW', 'PIPE',
    'STREAM', 'TASK', 'PROCEDURE', 'FUNCTION', 'STAGE', 'SEQUENCE',
    'ZERO_COPY_CLONING', 'TIME_TRAVEL', 'TRANSIENT', 'VOLATILE'
  ],
  databricks: [
    'USING', 'OPTIMIZE', 'ZORDER BY', 'SKEW', 'REPARTITION',
    'DISTRIBUTE BY', 'CLUSTERED BY', 'SORT BY', 'PARTITIONED BY',
    'DELTA', 'STREAM', 'STREAMING', 'TBLPROPERTIES', 'LOCATION',
    'OPTIONS', 'PARTITIONS', 'BUCKETS', 'SKEWED BY', 'STORED AS',
    'DELIMITED', 'FIELDS TERMINATED BY', 'COLLECTION ITEMS TERMINATED BY',
    'MAP KEYS TERMINATED BY', 'LINES TERMINATED BY',
    'NULL DEFINED AS', 'CACHED', 'UNCACHED', 'LAZY',
    'REFRESH', 'TEMPORARY', 'GLOBAL TEMPORARY', 'TEMP',
    'FUNCTIONS', 'TABLES', 'DATABASES', 'CACHE',
    'DESCRIBE EXTENDED', 'DESCRIBE FORMATTED', 'DESCRIBE FUNCTION',
    'LATERAL VIEW', 'TRANSFORM', 'DISTRIBUTE', 'CLUSTER',
    'MAP', 'REDUCE', 'INPUT', 'OUTPUT', 'INPATH', 'OUTPATH',
    'DBFS', 'UNITY CATALOG', 'METASTORE', 'CATALOG', 'SCHEMA',
    'EXTERNAL', 'MANAGED', 'HIVE', 'DELTA LAKE', 'VACUUM',
    'MERGE INTO', 'SPARK_CONF', 'PHOTON', 'MLFLOW', 'CREATE WIDGET'
  ]
};

// SQL Functions common across multiple platforms
const SQL_COMMON_FUNCTIONS = [
  'COUNT', 'SUM', 'AVG', 'MIN', 'MAX',
  'UPPER', 'LOWER', 'TRIM', 'LTRIM', 'RTRIM',
  'LENGTH', 'SUBSTR', 'SUBSTRING', 'REPLACE',
  'ROUND', 'CEIL', 'FLOOR', 'ABS', 'SQRT',
  'POWER', 'MOD', 'CURRENT_DATE', 'CURRENT_TIME',
  'CURRENT_TIMESTAMP', 'DATE', 'EXTRACT',
  'TO_CHAR', 'TO_DATE', 'CONCAT', 'NVL', 'NULLIF',
  'COALESCE', 'CAST', 'CONVERT', 'DATEDIFF',
  'DATEADD', 'DATEPART', 'YEAR', 'MONTH', 'DAY',
  'HOUR', 'MINUTE', 'SECOND'
];

// Platform-specific SQL functions
const PLATFORM_FUNCTIONS: Record<Platform, string[]> = {
  bigquery: [
    'ST_GEOGPOINT', 'ST_DISTANCE', 'ST_CONTAINS', 'ST_INTERSECTS',
    'PARSE_DATE', 'PARSE_TIMESTAMP', 'FORMAT_DATE', 'FORMAT_TIMESTAMP',
    'DATE_DIFF', 'TIMESTAMP_DIFF', 'GENERATE_UUID', 'SESSION_USER',
    'ARRAY_LENGTH', 'ARRAY_TO_STRING', 'STRING_TO_ARRAY', 'SPLIT',
    'NET.IP_FROM_STRING', 'NET.SAFE_IP_FROM_STRING', 'NET.IP_TO_STRING',
    'NET.IP_NET_MASK', 'NET.IP_TRUNC', 'NET.IPV4_TO_INT64',
    'ML.PREDICT', 'ML.EVALUATE', 'ML.ROC_CURVE', 'ML.CONFUSION_MATRIX',
    'TO_JSON_STRING', 'FROM_JSON', 'JSON_EXTRACT_SCALAR'
  ],
  snowflake: [
    'GET_DDL', 'SYSTEM$CLUSTERING_INFORMATION', 'SYSTEM$ESTIMATE_QUERY_ACCELERATION',
    'CONVERT_TIMEZONE', 'LAST_QUERY_ID', 'LAST_QUERY_ID', 'RESULT_SCAN',
    'METADATA$FILENAME', 'METADATA$FILE_ROW_NUMBER', 'CURRENT_VERSION',
    'COMPRESS', 'DECOMPRESS', 'MD5', 'SHA1', 'SHA2', 'TO_BINARY',
    'TO_DOUBLE', 'TO_GEOGRAPHY', 'TO_GEOMETRY', 'TO_OBJECT', 'TO_ARRAY',
    'TO_VARIANT', 'IS_NULL_VALUE', 'GET_IGNORE_CASE', 'ARRAY_COMPACT',
    'ARRAY_FLATTEN', 'ARRAY_INSERT', 'PARSE_XML', 'XMLGET', 'LATERAL',
    'TABLE', 'FLATTEN', 'USE_CACHED_RESULT', 'IDENTIFIER', 'COLLATE'
  ],
  databricks: [
    'CURRENT_METASTORE', 'CURRENT_CATALOG', 'CURRENT_NAMESPACE',
    'MAP_FILTER', 'MAP_TRANSFORM_KEYS', 'MAP_TRANSFORM_VALUES',
    'MAP_ENTRIES', 'MAP_FROM_ENTRIES', 'MAP_CONCAT', 'MAP_CONTAINS_KEY',
    'TRANSFORM_KEYS', 'TRANSFORM_VALUES', 'ARRAY_DISTINCT', 'ARRAY_EXCEPT',
    'ARRAY_INTERSECT', 'ARRAY_JOIN', 'ARRAY_MAX', 'ARRAY_MIN',
    'ARRAY_POSITION', 'ARRAY_REMOVE', 'ARRAY_REPEAT', 'ARRAY_SORT',
    'ARRAY_UNION', 'ARRAY_ZIP', 'ARRAYS_OVERLAP', 'REGEXP_EXTRACT_ALL',
    'DATE_FORMAT', 'TO_UTC_TIMESTAMP', 'FROM_UTC_TIMESTAMP',
    'DATE_ADD', 'DATE_SUB', 'ADD_MONTHS', 'NEXT_DAY', 'TRUNC',
    'MONTHS_BETWEEN', 'VERSION', 'HIVE_METASTORE', 'UNITY_CATALOG'
  ]
};

// Common SQL operators
const SQL_OPERATORS = [
  '=', '<>', '!=', '>', '<', '>=', '<=', 
  '+', '-', '*', '/', '%',
  'AND', 'OR', 'NOT', 'LIKE', 'IN', 'BETWEEN',
  'IS NULL', 'IS NOT NULL', 'EXISTS', 'NOT EXISTS'
];

// Platform-specific operators
const PLATFORM_OPERATORS: Record<Platform, string[]> = {
  bigquery: [
    '@{', '}', '||', '&&', '!', '&', '|', '^',
    '->', '->>', '#>', '#>>'
  ],
  snowflake: [
    '::', '!~', '~', '@>', '<@', '?', '?|', '?&',
    '@@', '@?', '~*', '!~*', '-|-'
  ],
  databricks: [
    '<=>', '~=', '!~', '<=!>', '<=>',
    '!^', '!$', '^'
  ]
};

// Data types common across platforms
const SQL_DATA_TYPES = [
  'INTEGER', 'INT', 'BIGINT', 'SMALLINT', 'TINYINT',
  'FLOAT', 'DOUBLE', 'DECIMAL', 'NUMERIC',
  'VARCHAR', 'CHAR', 'TEXT', 'STRING',
  'DATE', 'DATETIME', 'TIMESTAMP', 'TIME',
  'BOOLEAN', 'BOOL', 'BINARY', 'VARBINARY',
  'BLOB', 'CLOB', 'REAL', 'BIT'
];

// Platform-specific data types
const PLATFORM_DATA_TYPES: Record<Platform, string[]> = {
  bigquery: [
    'BYTES', 'GEOGRAPHY', 'BIGNUMERIC', 'INTERVAL',
    'JSON', 'ARRAY<>', 'STRUCT<>', 'RECORD'
  ],
  snowflake: [
    'VARIANT', 'GEOGRAPHY', 'GEOMETRY', 'OBJECT',
    'ARRAY', 'NUMBER', 'TIMESTAMP_LTZ', 'TIMESTAMP_NTZ',
    'TIMESTAMP_TZ', 'SEMI_STRUCTURED'
  ],
  databricks: [
    'MAP<>', 'STRUCT<>', 'ARRAY<>', 'INTERVAL', 
    'BYTE', 'SHORT', 'LONG', 'DECIMAL(p,s)',
    'FLOAT', 'DATE', 'TIMESTAMP_NTZ'
  ]
};

// Common table/view patterns by platform (for demo - in a real app these would come from a schema fetcher)
const DEMO_TABLES: Record<Platform, string[]> = {
  bigquery: [
    'bigquery-public-data.samples.natality',
    'bigquery-public-data.samples.shakespeare',
    'bigquery-public-data.samples.github_timeline',
    'analytics_data.user_events',
    'analytics_data.sessions',
    'analytics_data.pageviews',
    'analytics_data.conversions',
    'analytics_data.products',
    'analytics_data.customers',
    'analytics_data.orders'
  ],
  snowflake: [
    'SNOWFLAKE_SAMPLE_DATA.TPCDS_SF10TCL.CUSTOMER',
    'SNOWFLAKE_SAMPLE_DATA.TPCDS_SF10TCL.ITEM',
    'SNOWFLAKE_SAMPLE_DATA.TPCDS_SF10TCL.STORE_SALES',
    'ANALYTICS.EVENTS.USER_LOGINS',
    'ANALYTICS.EVENTS.PURCHASES',
    'ANALYTICS.DIMENSIONS.USERS',
    'ANALYTICS.DIMENSIONS.PRODUCTS',
    'ANALYTICS.DIMENSIONS.DATES',
    'ANALYTICS.DIMENSIONS.STORES',
    'ANALYTICS.FACTS.SALES'
  ],
  databricks: [
    'samples.nyctaxi.trips',
    'samples.tpch.customer',
    'samples.tpch.orders',
    'samples.tpch.lineitem',
    'analytics.events.website_clicks',
    'analytics.events.app_sessions',
    'analytics.dims.users',
    'analytics.dims.products',
    'analytics.dims.geography',
    'analytics.facts.transactions'
  ]
};

// Common schemas by platform (for demo)
const DEMO_SCHEMAS: Record<Platform, string[]> = {
  bigquery: [
    'analytics_data', 'marketing_data', 'production_data', 
    'staging_data', 'reporting', 'ml_features'
  ],
  snowflake: [
    'ANALYTICS', 'MARKETING', 'SALES', 'FINANCE', 
    'OPERATIONS', 'RAW_DATA', 'CURATED_DATA'
  ],
  databricks: [
    'bronze', 'silver', 'gold', 'analytics', 
    'feature_store', 'reporting', 'temp'
  ]
};

// Mock column suggestions for popular tables (for demo)
const DEMO_COLUMNS: Record<string, string[]> = {
  'analytics_data.user_events': [
    'user_id', 'event_type', 'event_time', 'session_id', 
    'device_type', 'country', 'source', 'page_url'
  ],
  'ANALYTICS.FACTS.SALES': [
    'sale_id', 'product_id', 'customer_id', 'store_id', 
    'sale_date', 'quantity', 'price', 'discount', 'total'
  ],
  'analytics.facts.transactions': [
    'transaction_id', 'user_id', 'product_id', 'transaction_date', 
    'amount', 'payment_method', 'status', 'refunded'
  ]
};

// Context types for more advanced completion
type SqlContext = 
  | 'SELECT' 
  | 'FROM' 
  | 'WHERE' 
  | 'GROUP_BY' 
  | 'ORDER_BY' 
  | 'HAVING'
  | 'JOIN'
  | 'CREATE'
  | 'INSERT'
  | 'UPDATE'
  | 'DELETE'
  | 'WITH'
  | 'FUNCTION'
  | 'TABLE_REF'
  | 'COLUMN_REF'
  | 'UNKNOWN';

/**
 * Get auto-completion suggestions based on the text before cursor and platform
 */
export function getSuggestions(textBeforeCursor: string, platform: Platform): string[] {
  // Don't show suggestions if we're inside a comment
  if (isInComment(textBeforeCursor)) {
    return [];
  }
  
  // Determine the word being typed
  const wordMatch = textBeforeCursor.match(/[\w_.]+$/);
  if (!wordMatch) return [];
  
  const currentWord = wordMatch[0].toUpperCase();
  if (currentWord.length < 1) return [];
  
  // Detect context more accurately
  const context = detectContext(textBeforeCursor);
  
  // Generate suggestions based on context
  const suggestions = generateContextAwareSuggestions(textBeforeCursor, currentWord, context, platform);
  
  return suggestions.filter(s => s.toUpperCase().startsWith(currentWord.toUpperCase()))
    .sort((a, b) => {
      // First prioritize exact matches
      if (a.toUpperCase() === currentWord.toUpperCase()) return -1;
      if (b.toUpperCase() === currentWord.toUpperCase()) return 1;
      
      // Then prioritize by prefix match length
      const aPrefix = a.toUpperCase().split('').findIndex((char, i) => i >= currentWord.length || char !== currentWord[i]);
      const bPrefix = b.toUpperCase().split('').findIndex((char, i) => i >= currentWord.length || char !== currentWord[i]);
      
      if (aPrefix !== bPrefix) {
        return bPrefix - aPrefix; // Higher prefix match first
      }
      
      // Then by length (shorter first)
      return a.length - b.length;
    });
}

/**
 * Check if cursor is inside a SQL comment
 */
function isInComment(text: string): boolean {
  // Check for single-line comment
  const lastLineMatch = text.match(/.*$/m);
  if (lastLineMatch && lastLineMatch[0].includes('--')) {
    return true;
  }
  
  // Check for multi-line comment
  const commentBlocks = text.split('*/');
  const lastBlock = commentBlocks[commentBlocks.length - 1];
  return lastBlock.includes('/*') && !lastBlock.includes('*/');
}

/**
 * Generate context-aware suggestions based on SQL context
 */
function generateContextAwareSuggestions(text: string, currentWord: string, context: SqlContext, platform: Platform): string[] {
  // Common suggestions across all contexts
  let suggestions: string[] = [];
  
  // Add platform-specific keywords, functions, etc.
  const allKeywords = [
    ...SQL_COMMON_KEYWORDS,
    ...SQL_COMMON_FUNCTIONS,
    ...(PLATFORM_KEYWORDS[platform] || []),
    ...(PLATFORM_FUNCTIONS[platform] || [])
  ];
  
  switch (context) {
    case 'SELECT':
      // After SELECT, suggest functions, column names, etc.
      suggestions = [
        'DISTINCT', 'ALL', '*', 'TOP', 'AS',
        ...SQL_COMMON_FUNCTIONS,
        ...(PLATFORM_FUNCTIONS[platform] || []),
        ...getColumnSuggestionsFromContext(text, platform)
      ];
      break;
      
    case 'FROM':
      // After FROM suggest tables, schemas, etc.
      suggestions = [
        ...getTableSuggestionsFromContext(text, platform),
        ...DEMO_SCHEMAS[platform],
        'TABLE', 'LATERAL', 'UNNEST', 'GENERATE_SERIES',
        ...(['JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'OUTER JOIN', 'CROSS JOIN', 'FULL JOIN'])
      ];
      break;
      
    case 'WHERE':
    case 'HAVING':
      // In WHERE clause suggest columns, operators, functions
      suggestions = [
        ...getColumnSuggestionsFromContext(text, platform),
        ...SQL_OPERATORS,
        ...(PLATFORM_OPERATORS[platform] || []),
        'AND', 'OR', 'NOT', 'IN', 'EXISTS', 'ALL', 'ANY', 'SOME',
        'LIKE', 'ILIKE', 'SIMILAR TO', 'BETWEEN', 'IS NULL', 'IS NOT NULL'
      ];
      break;
      
    case 'GROUP_BY':
      // In GROUP BY suggest columns
      suggestions = [
        ...getColumnSuggestionsFromContext(text, platform),
        'CUBE', 'ROLLUP', 'GROUPING SETS',
        'HAVING', '1', '2', '3' // Positional references
      ];
      break;
      
    case 'ORDER_BY':
      // In ORDER BY suggest columns plus ordering keywords
      suggestions = [
        ...getColumnSuggestionsFromContext(text, platform),
        'ASC', 'DESC', 'NULLS FIRST', 'NULLS LAST',
        'LIMIT', 'OFFSET', '1', '2', '3' // Positional references
      ];
      break;
      
    case 'JOIN':
      // After JOIN suggest tables
      suggestions = [
        ...getTableSuggestionsFromContext(text, platform),
        'ON', 'USING'
      ];
      break;
      
    case 'CREATE':
      // After CREATE suggest object types
      suggestions = [
        'TABLE', 'VIEW', 'FUNCTION', 'PROCEDURE', 'DATABASE', 'SCHEMA',
        'MATERIALIZED VIEW', 'TEMPORARY', 'TEMP', 'OR REPLACE',
        'EXTERNAL TABLE', 'SEQUENCE', 'INDEX'
      ];
      
      // Add platform-specific CREATE options
      if (platform === 'snowflake') {
        suggestions.push(
          'WAREHOUSE', 'STAGE', 'PIPE', 'STREAM', 'TASK', 'USER',
          'ROLE', 'MASKING POLICY', 'ROW ACCESS POLICY', 'NETWORK POLICY'
        );
      } else if (platform === 'databricks') {
        suggestions.push(
          'CATALOG', 'SCHEMA', 'WIDGET', 'LIVE TABLE', 'STREAMING TABLE',
          'VOLUME', 'EXTERNAL VOLUME', 'DELTA TABLE'
        );
      } else if (platform === 'bigquery') {
        suggestions.push(
          'MODEL', 'EXTERNAL TABLE', 'CAPACITY', 'RESERVATION', 'ASSIGNMENT'
        );
      }
      break;
      
    case 'TABLE_REF':
      // When referencing tables
      suggestions = getTableSuggestionsFromContext(text, platform);
      break;
      
    case 'COLUMN_REF':
      // When referencing columns
      suggestions = getColumnSuggestionsFromContext(text, platform);
      break;
      
    default:
      // Generic suggestions for all other contexts
      suggestions = [
        ...allKeywords,
        ...SQL_OPERATORS,
        ...SQL_DATA_TYPES,
        ...(PLATFORM_DATA_TYPES[platform] || []),
        ...(PLATFORM_OPERATORS[platform] || [])
      ];
  }
  
  // Remove duplicates
  return Array.from(new Set(suggestions));
}

/**
 * Get column suggestions based on context
 */
function getColumnSuggestionsFromContext(text: string, platform: Platform): string[] {
  // This is a simplified implementation
  // In a real app, you would analyze the FROM clause to determine tables
  // and then suggest actual columns from those tables
  
  // Extract table references from the query
  const tableRefs = extractTableReferences(text);
  
  // Get columns for the referenced tables
  let columns: string[] = [];
  
  // Demo column suggestions based on detected tables
  tableRefs.forEach(table => {
    if (DEMO_COLUMNS[table]) {
      columns = [...columns, ...DEMO_COLUMNS[table]];
    } else {
      // Generic column suggestions if table not recognized
      columns.push(...[
        'id', 'name', 'date', 'created_at', 'updated_at', 'value',
        'amount', 'quantity', 'price', 'cost', 'description',
        'user_id', 'customer_id', 'product_id', 'order_id'
      ]);
    }
  });
  
  // Add fully qualified column suggestions
  const qualifiedColumns: string[] = [];
  tableRefs.forEach(table => {
    const simpleTableName = table.split('.').pop() || table;
    const tableAlias = findTableAlias(text, table) || simpleTableName;
    
    if (DEMO_COLUMNS[table]) {
      DEMO_COLUMNS[table].forEach(col => {
        qualifiedColumns.push(`${tableAlias}.${col}`);
      });
    }
  });
  
  return [...columns, ...qualifiedColumns];
}

/**
 * Extract table references from SQL text
 */
function extractTableReferences(text: string): string[] {
  // This is a simplified implementation
  // A real implementation would need to parse the SQL properly
  
  const fromClauseMatch = text.match(/FROM\s+([^WHERE|GROUP|ORDER|HAVING|LIMIT|$]+)/i);
  if (!fromClauseMatch) return [];
  
  const fromClause = fromClauseMatch[1];
  
  // Split by commas and JOIN keywords
  const tableRefs = fromClause.split(/,|\s+JOIN\s+/i);
  
  // Extract table names - this is a simple version
  return tableRefs.map(ref => {
    const tableMatch = ref.trim().match(/^([^\s(]+)/);
    return tableMatch ? tableMatch[1] : '';
  }).filter(Boolean);
}

/**
 * Find table alias from the SQL text
 */
function findTableAlias(text: string, tableName: string): string | null {
  // This is a simplified implementation
  // A real implementation would need to parse the SQL properly
  
  const simpleName = tableName.split('.').pop() || tableName;
  const aliasRegex = new RegExp(`${simpleName}\\s+(?:AS\\s+)?([a-zA-Z0-9_]+)`, 'i');
  const aliasMatch = text.match(aliasRegex);
  
  return aliasMatch?.[1] || null;
}

/**
 * Get table suggestions based on context
 */
function getTableSuggestionsFromContext(text: string, platform: Platform): string[] {
  // In a real app, this would be connected to a schema browser
  // or query the database's information_schema
  
  return DEMO_TABLES[platform];
}

/**
 * Detect SQL context based on previous tokens and cursor position
 */
function detectContext(text: string): SqlContext {
  const uppercaseText = text.toUpperCase();
  
  // Check for specific clause contexts
  if (isInSelectClause(uppercaseText)) {
    return 'SELECT';
  }
  
  if (isInFromClause(uppercaseText)) {
    return 'FROM';
  }
  
  if (isInWhereClause(uppercaseText)) {
    return 'WHERE';
  }
  
  if (isInGroupByClause(uppercaseText)) {
    return 'GROUP_BY';
  }
  
  if (isInOrderByClause(uppercaseText)) {
    return 'ORDER_BY';
  }
  
  if (isInHavingClause(uppercaseText)) {
    return 'HAVING';
  }
  
  if (isInJoinClause(uppercaseText)) {
    return 'JOIN';
  }
  
  if (isInCreateStatement(uppercaseText)) {
    return 'CREATE';
  }
  
  // Check for table references
  if (isTableReference(uppercaseText)) {
    return 'TABLE_REF';
  }
  
  // Check for column references
  if (isColumnReference(uppercaseText)) {
    return 'COLUMN_REF';
  }
  
  return 'UNKNOWN';
}

/**
 * Check if cursor is in SELECT clause
 */
function isInSelectClause(text: string): boolean {
  // Find the last SELECT keyword
  const lastSelectPos = text.lastIndexOf('SELECT');
  if (lastSelectPos === -1) return false;
  
  // Check if there's a FROM after the SELECT
  const fromAfterSelect = text.indexOf('FROM', lastSelectPos);
  
  // We're in the SELECT clause if there's no FROM after SELECT
  // or if the cursor is before the FROM
  return fromAfterSelect === -1;
}

/**
 * Check if cursor is in FROM clause
 */
function isInFromClause(text: string): boolean {
  // Find the last FROM keyword
  const lastFromPos = text.lastIndexOf('FROM');
  if (lastFromPos === -1) return false;
  
  // Check for clauses that would end the FROM clause
  const wherePos = text.indexOf('WHERE', lastFromPos);
  const joinPos = text.lastIndexOf('JOIN', lastFromPos);
  const groupByPos = text.indexOf('GROUP BY', lastFromPos);
  const orderByPos = text.indexOf('ORDER BY', lastFromPos);
  const havingPos = text.indexOf('HAVING', lastFromPos);
  
  // We're in FROM if none of the next clauses exist
  // or if there's a JOIN after FROM (we're still defining table sources)
  return (wherePos === -1 && groupByPos === -1 && orderByPos === -1 && havingPos === -1) || 
         (joinPos > lastFromPos);
}

/**
 * Check if cursor is in WHERE clause
 */
function isInWhereClause(text: string): boolean {
  const lastWherePos = text.lastIndexOf('WHERE');
  if (lastWherePos === -1) return false;
  
  const groupByPos = text.indexOf('GROUP BY', lastWherePos);
  const orderByPos = text.indexOf('ORDER BY', lastWherePos);
  const havingPos = text.indexOf('HAVING', lastWherePos);
  
  return groupByPos === -1 && orderByPos === -1 && havingPos === -1;
}

/**
 * Check if cursor is in GROUP BY clause
 */
function isInGroupByClause(text: string): boolean {
  const lastGroupByPos = text.lastIndexOf('GROUP BY');
  if (lastGroupByPos === -1) return false;
  
  const orderByPos = text.indexOf('ORDER BY', lastGroupByPos);
  const havingPos = text.indexOf('HAVING', lastGroupByPos);
  
  return orderByPos === -1 && havingPos === -1;
}

/**
 * Check if cursor is in ORDER BY clause
 */
function isInOrderByClause(text: string): boolean {
  const lastOrderByPos = text.lastIndexOf('ORDER BY');
  if (lastOrderByPos === -1) return false;
  
  const limitPos = text.indexOf('LIMIT', lastOrderByPos);
  
  return limitPos === -1;
}

/**
 * Check if cursor is in HAVING clause
 */
function isInHavingClause(text: string): boolean {
  const lastHavingPos = text.lastIndexOf('HAVING');
  if (lastHavingPos === -1) return false;
  
  const orderByPos = text.indexOf('ORDER BY', lastHavingPos);
  
  return orderByPos === -1;
}

/**
 * Check if cursor is in JOIN clause
 */
function isInJoinClause(text: string): boolean {
  const joinKeywords = ['JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'OUTER JOIN', 'CROSS JOIN', 'FULL JOIN'];
  
  // Find the last JOIN keyword
  let lastJoinPos = -1;
  let lastJoinKeyword = '';
  
  for (const joinKeyword of joinKeywords) {
    const pos = text.lastIndexOf(joinKeyword);
    if (pos > lastJoinPos) {
      lastJoinPos = pos;
      lastJoinKeyword = joinKeyword;
    }
  }
  
  if (lastJoinPos === -1) return false;
  
  // Check if the ON keyword follows the JOIN
  const onAfterJoin = text.indexOf('ON', lastJoinPos + lastJoinKeyword.length);
  
  // We're in a JOIN clause if there's no ON after the JOIN
  // or if there's another clause after the JOIN
  return onAfterJoin === -1;
}

/**
 * Check if cursor is in CREATE statement
 */
function isInCreateStatement(text: string): boolean {
  const lastCreatePos = text.lastIndexOf('CREATE');
  
  // This is a simplification - would need more checks for a real implementation
  return lastCreatePos !== -1 && (
    text.indexOf('TABLE', lastCreatePos) !== -1 ||
    text.indexOf('VIEW', lastCreatePos) !== -1 ||
    text.indexOf('FUNCTION', lastCreatePos) !== -1 ||
    text.indexOf('PROCEDURE', lastCreatePos) !== -1
  );
}

/**
 * Check if cursor is at a table reference location
 */
function isTableReference(text: string): boolean {
  // This is a simplified check for table reference positions
  const lastToken = getLastToken(text);
  
  return lastToken.match(/FROM|JOIN|INTO|UPDATE|TABLE|VIEW/i) !== null;
}

/**
 * Check if cursor is at a column reference location
 */
function isColumnReference(text: string): boolean {
  // This is a simplified check for column reference positions
  const lastToken = getLastToken(text);
  
  return lastToken.match(/SELECT|WHERE|GROUP\s+BY|ORDER\s+BY|HAVING|ON|BY|PARTITION\s+BY|CLUSTER\s+BY/i) !== null;
}

/**
 * Get the last SQL token from text
 */
function getLastToken(text: string): string {
  const tokens = text.split(/\s+/);
  return tokens[tokens.length - 1];
}

// Export types for use in other modules
export type { SqlContext };
