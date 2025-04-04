import { Platform } from './sqlValidator';
import { toast } from "sonner";

export type ModelType = 'dataform' | 'dbt';

export type ConversionResult = {
  success: boolean;
  model: string;
  config: string;
  documentation: string;
  error?: string;
};

interface ModelConfig {
  materialization: string;
  schema?: string;
  description?: string;
  [key: string]: any;
}

/**
 * Extract table names from SQL query
 */
function extractTableNames(sql: string): string[] {
  // Enhanced regex to find table names after FROM and JOIN
  // Handles backticks, brackets, and quoted identifiers
  const fromRegex = /from\s+([a-zA-Z0-9_."`\[\]]+)/gi;
  const joinRegex = /join\s+([a-zA-Z0-9_."`\[\]]+)/gi;
  // Also handle CTEs and subqueries
  const withRegex = /with\s+([a-zA-Z0-9_]+)\s+as/gi;
  
  const tables = [];
  let match;
  
  while ((match = fromRegex.exec(sql)) !== null) {
    let tableName = match[1].trim();
    // Remove quotes/backticks if present
    tableName = tableName.replace(/["`\[\]]/g, '');
    tables.push(tableName);
  }
  
  while ((match = joinRegex.exec(sql)) !== null) {
    let tableName = match[1].trim();
    // Remove quotes/backticks if present
    tableName = tableName.replace(/["`\[\]]/g, '');
    tables.push(tableName);
  }
  
  // Extract CTE names as well
  const cteNames = [];
  while ((match = withRegex.exec(sql)) !== null) {
    cteNames.push(match[1].trim());
  }
  
  // We don't include CTE names in the table list, but we capture them
  // for potential dependency analysis
  
  return [...new Set(tables)]; // Remove duplicates
}

/**
 * Extract column information from the query
 */
function extractColumns(sql: string): Array<{name: string, type?: string, description?: string}> {
  const columns = [];
  // Look for columns in the SELECT statement
  const selectRegex = /select\s+(.+?)\s+from/gis;
  const selectMatch = selectRegex.exec(sql);
  
  if (selectMatch) {
    const selectClause = selectMatch[1];
    // Split by commas, but be careful about functions that contain commas
    let depth = 0;
    let currentCol = '';
    
    for (let i = 0; i < selectClause.length; i++) {
      const char = selectClause[i];
      
      if (char === '(') depth++;
      else if (char === ')') depth--;
      
      if (char === ',' && depth === 0) {
        // End of a column definition
        const colDef = currentCol.trim();
        if (colDef) processColumnDefinition(colDef, columns);
        currentCol = '';
      } else {
        currentCol += char;
      }
    }
    
    // Don't forget the last column
    if (currentCol.trim()) {
      processColumnDefinition(currentCol.trim(), columns);
    }
  }
  
  return columns;
}

/**
 * Process a single column definition and add it to the columns array
 */
function processColumnDefinition(colDef: string, columns: Array<{name: string, type?: string, description?: string}>): void {
  // Check for aliased columns
  const asIndex = colDef.toLowerCase().lastIndexOf(' as ');
  
  if (asIndex > -1) {
    // Get the alias, which is the actual column name
    const alias = colDef.substring(asIndex + 4).trim().replace(/["`\[\]]/g, '');
    let inferredType = 'string';
    
    // Try to infer the data type
    const lowerColDef = colDef.toLowerCase();
    if (lowerColDef.includes('count(') || lowerColDef.includes('sum(') || 
        lowerColDef.includes('avg(') || /\d+/.test(lowerColDef)) {
      inferredType = 'number';
    } else if (lowerColDef.includes('date') || lowerColDef.includes('time')) {
      inferredType = 'timestamp';
    } else if (lowerColDef.includes('true') || lowerColDef.includes('false') || 
               lowerColDef.includes('boolean')) {
      inferredType = 'boolean';
    }
    
    columns.push({
      name: alias,
      type: inferredType,
      description: `Derived from: ${colDef.substring(0, asIndex).trim()}`
    });
  } else {
    // Direct column reference or expression
    // Extract the simplest name possible
    let name = colDef.trim();
    // If it has a dot, take what's after the last dot
    if (name.includes('.')) {
      name = name.split('.').pop()!;
    }
    // Remove any quoting
    name = name.replace(/["`\[\]]/g, '');
    
    columns.push({
      name,
      // We don't try to infer types for direct column references without context
    });
  }
}

/**
 * Extract a good model name from the SQL query
 */
function suggestModelName(sql: string): string {
  const sqlLower = sql.toLowerCase();
  
  // Check if it's aggregating something
  if (sqlLower.includes('group by')) {
    const aggColumns = [];
    const selectRegex = /select\s+(.+?)\s+from/gi;
    const selectMatch = selectRegex.exec(sqlLower);
    
    if (selectMatch) {
      const selectClause = selectMatch[1];
      if (selectClause.includes('count(') || 
          selectClause.includes('sum(') || 
          selectClause.includes('avg(')) {
        return 'agg_' + extractMainEntity(sql);
      }
    }
  }
  
  // Check if it's joining multiple tables
  const tables = extractTableNames(sql);
  if (tables.length > 1) {
    return 'int_' + tables.map(t => t.split('.').pop()).join('_');
  }
  
  // Check if it contains window functions or other complex analytical patterns
  if (sqlLower.includes('partition by') || 
      sqlLower.includes('over(') || 
      sqlLower.includes('over (')) {
    return 'mart_' + extractMainEntity(sql);
  }
  
  // Default - just use the main entity
  return 'stg_' + extractMainEntity(sql);
}

/**
 * Try to identify the main entity in the query
 */
function extractMainEntity(sql: string): string {
  const tables = extractTableNames(sql);
  if (tables.length === 0) return 'model';
  
  // Get the first table and use its most specific part
  const firstTable = tables[0];
  const tableParts = firstTable.split('.');
  return tableParts[tableParts.length - 1];
}

/**
 * Determine the best materialization strategy based on the query
 */
function suggestMaterialization(sql: string): string {
  const sqlLower = sql.toLowerCase();
  
  // Complex queries with aggregations are usually tables
  if (sqlLower.includes('group by') || 
      sqlLower.includes('window') || 
      sqlLower.includes('partition by')) {
    return 'table';
  }
  
  // Joins are often materialized as tables for performance
  if (sqlLower.includes('join') && sqlLower.length > 500) {
    return 'table';
  }
  
  // Simpler transformations can be views
  if (sqlLower.includes('select') && !sqlLower.includes('join')) {
    return 'view';
  }
  
  // Default to incrementally built table if we see a WHERE clause 
  // that might filter by date/time
  if (sqlLower.includes('where') && 
     (sqlLower.includes('date') || sqlLower.includes('time') || sqlLower.includes('timestamp'))) {
    return 'incremental';
  }
  
  // Default
  return 'view';
}

/**
 * Suggest tests based on query analysis
 */
function suggestTests(sql: string, columns: Array<{name: string, type?: string, description?: string}>): Array<{column: string, tests: string[]}> {
  const tests = [];
  const sqlLower = sql.toLowerCase();
  
  for (const column of columns) {
    const columnTests = [];
    
    // Suggest not_null test for id columns or when WHERE clause checks for NOT NULL
    if (column.name.toLowerCase().includes('id') || 
        sqlLower.includes(`${column.name} is not null`)) {
      columnTests.push('not_null');
    }
    
    // Suggest unique test for id columns
    if (column.name.toLowerCase().includes('id') && 
        !column.name.toLowerCase().includes('foreign')) {
      columnTests.push('unique');
    }
    
    // Suggest accepted_values test for status-like columns
    if (column.name.toLowerCase().includes('status') || 
        column.name.toLowerCase().includes('type') || 
        column.name.toLowerCase().includes('category')) {
      columnTests.push('accepted_values');
    }
    
    // Suggest relationships test for foreign key-like columns
    if (column.name.toLowerCase().includes('_id') && 
        !column.name.toLowerCase().includes('main_id')) {
      columnTests.push('relationships');
    }
    
    if (columnTests.length > 0) {
      tests.push({
        column: column.name,
        tests: columnTests
      });
    }
  }
  
  return tests;
}

/**
 * Generate dependency map for the model
 */
function generateDependencies(
  sql: string, 
  platform: Platform, 
  modelType: ModelType
): {
  refTables: string[], 
  dependencies: string[]
} {
  const refTables = extractTableNames(sql);
  let dependencies: string[] = [];
  
  // Format dependencies according to the model type
  if (modelType === 'dataform') {
    dependencies = refTables.map(table => {
      const tableParts = table.split('.');
      const tableName = tableParts[tableParts.length - 1];
      return `ref("${tableName}")`;
    });
  } else { // dbt
    dependencies = refTables.map(table => {
      const tableParts = table.split('.');
      const tableName = tableParts[tableParts.length - 1];
      return `{{ ref('${tableName}') }}`;
    });
  }
  
  return { refTables, dependencies };
}

/**
 * Generates proper dataform references for tables in SQL
 */
function replaceTableReferencesWithDataformRefs(sql: string, refTables: string[]): string {
  let transformedSql = sql;
  
  // Sort tables by length (descending) to avoid replacing substrings of longer table names
  const sortedTables = [...refTables].sort((a, b) => b.length - a.length);
  
  for (const table of sortedTables) {
    const tableParts = table.split('.');
    const tableName = tableParts[tableParts.length - 1];
    
    // Only match exact table references
    const tablePattern = new RegExp(`\\b${table}\\b`, 'g');
    transformedSql = transformedSql.replace(tablePattern, `\${ref("${tableName}")}`);
  }
  
  return transformedSql;
}

/**
 * Generate reusable JavaScript functions for common Dataform patterns
 */
function generateDataformHelpers(sql: string, refTables: string[]): string {
  // Identify if we have lookup tables in the SQL (tables used primarily in JOINs)
  const joinTables = refTables.filter(table => 
    sql.toLowerCase().includes(`join ${table.toLowerCase()}`) || 
    sql.toLowerCase().includes(`join\n${table.toLowerCase()}`)
  );
  
  let helperFunctions = "";
  
  // If we have lookup tables, create a lookupTable helper function
  if (joinTables.length > 0) {
    helperFunctions += `
// Helper function to create standardized lookup queries
function lookupTable(tableName, fields, alias) {
  const fieldList = fields.map(f => \`\${ref(tableName)}.\${f} AS \${alias ? \`\${alias}_\${f}\` : f}\`).join(',\\n    ');
  return \`
  SELECT 
    \${fieldList}
  FROM 
    \${ref(tableName)}
\`;
}

`;
  }
  
  // If we have aggregations, create an aggregation helper
  if (sql.toLowerCase().includes("group by")) {
    helperFunctions += `
// Helper function for aggregation queries
function aggregate(tableName, dimensions, measures) {
  const dimensionList = dimensions.map(d => \`\${ref(tableName)}.\${d} AS \${d}\`).join(',\\n    ');
  const measureList = measures.map(m => {
    const [func, field, alias] = m;
    return \`\${func}(\${ref(tableName)}.\${field}) AS \${alias || field}\`;
  }).join(',\\n    ');
  
  return \`
  SELECT
    \${dimensionList},
    \${measureList}
  FROM
    \${ref(tableName)}
  GROUP BY
    \${dimensions.map((_, i) => i + 1).join(', ')}
\`;
}

`;
  }
  
  return helperFunctions;
}

/**
 * Convert SQL query to a Dataform model
 */
export function convertToDataform(sql: string, platform: Platform): ConversionResult {
  try {
    const modelName = suggestModelName(sql);
    const materialization = suggestMaterialization(sql);
    const { refTables, dependencies } = generateDependencies(sql, platform, 'dataform');
    const columns = extractColumns(sql);
    
    // Generate JavaScript helper functions
    const helperFunctions = generateDataformHelpers(sql, refTables);
    
    // Transform the SQL to use Dataform refs
    const transformedSql = replaceTableReferencesWithDataformRefs(sql, refTables);
    
    // Build the JavaScript file for Dataform
    let model = `// ${modelName}.sqlx\n\n`;
    
    // Add helper functions if generated
    if (helperFunctions) {
      model += helperFunctions;
    }
    
    // Config section
    const config: ModelConfig = {
      materialization: materialization,
      description: `Model generated from SQL Guardian analysis`,
    };
    
    if (materialization === 'incremental') {
      // Add incremental config with more intelligent filtering
      if (sql.toLowerCase().includes('timestamp')) {
        config.incrementalQuery = `SELECT * FROM ${modelName} 
      WHERE timestamp >= (SELECT MAX(timestamp) FROM ${modelName})`;
      } else if (sql.toLowerCase().includes('date')) {
        config.incrementalQuery = `SELECT * FROM ${modelName} 
      WHERE date >= (SELECT MAX(date) FROM ${modelName})`;
      } else {
        config.incrementalQuery = `SELECT * FROM ${modelName} 
      WHERE id > (SELECT MAX(id) FROM ${modelName})`;
      }
    }
    
    // Add assertions if we detect unique columns
    const uniqueColumns = columns.filter(col => col.name.toLowerCase().includes('id') && 
                                               !col.name.toLowerCase().includes('foreign'));
    if (uniqueColumns.length > 0) {
      config.assertions = {
        uniqueKey: uniqueColumns[0].name,
        nonNull: uniqueColumns[0].name
      };
    }
    
    // Add tags based on query content
    const tags = [];
    if (sql.toLowerCase().includes('select') && !sql.toLowerCase().includes('join')) {
      tags.push('staging');
    } else if (sql.toLowerCase().includes('join')) {
      tags.push('integration');
    }
    if (sql.toLowerCase().includes('group by')) {
      tags.push('aggregation');
    }
    if (materialization === 'incremental') {
      tags.push('incremental');
    }
    
    if (tags.length > 0) {
      config.tags = tags;
    }
    
    // Add config section with JavaScript object notation
    model += `config {\n`;
    Object.entries(config).forEach(([key, value]) => {
      if (key === 'assertions' && typeof value === 'object') {
        model += `  assertions: {\n`;
        Object.entries(value).forEach(([assertKey, assertValue]) => {
          if (Array.isArray(assertValue)) {
            model += `    ${assertKey}: [${assertValue.map(v => `"${v}"`).join(', ')}],\n`;
          } else {
            model += `    ${assertKey}: ["${assertValue}"],\n`;
          }
        });
        model += `  },\n`;
      } else if (key === 'tags' && Array.isArray(value)) {
        model += `  tags: [${value.map(t => `"${t}"`).join(', ')}],\n`;
      } else if (typeof value === 'string') {
        model += `  ${key}: "${value}",\n`;
      } else {
        model += `  ${key}: ${JSON.stringify(value)},\n`;
      }
    });
    model += `}\n\n`;
    
    // Create JavaScript variables for dependency definitions 
    if (dependencies.length > 0) {
      model += `// Define dependencies as variables for reuse\n`;
      dependencies.forEach((dependency, index) => {
        const refName = refTables[index].split('.').pop() || '';
        model += `const ${refName.toLowerCase()}Table = ${dependency};\n`;
      });
      model += `\n`;
    }
    
    // Add column documentation if available
    if (columns.length > 0) {
      model += `// Column descriptions\n`;
      columns.forEach(column => {
        if (column.description) {
          model += `// ${column.name}: ${column.description}\n`;
        }
      });
      model += `\n`;
    }
    
    // Add the query section with improved Dataform syntax
    model += `/*\n* Main SQL Query\n*/\n`;
    
    // Try to identify if we can extract CTEs into JavaScript variables
    if (sql.toLowerCase().includes('with ') && sql.toLowerCase().includes(' as (')) {
      // Extract CTEs and convert to JavaScript variables
      const cteRegex = /with\s+([a-zA-Z0-9_]+)\s+as\s*\(\s*(.+?)\s*\)/gis;
      let cteMatch;
      const cteMap = new Map();
      
      // Find CTEs in the original SQL
      let modifiedSql = sql;
      while ((cteMatch = cteRegex.exec(sql)) !== null) {
        const cteName = cteMatch[1];
        let cteContent = cteMatch[2];
        
        // Replace table references with Dataform refs in the CTE content
        cteContent = replaceTableReferencesWithDataformRefs(cteContent, refTables);
        
        // Add as a JavaScript variable
        model += `const ${cteName} = \`\n${cteContent}\`;\n\n`;
        
        // Mark this CTE for replacement
        cteMap.set(cteName, true);
      }
      
      // Start rebuilding query with JavaScript variables
      model += `\`\n`;
      
      // Keep the WITH statement but reference JavaScript variables for CTEs
      if (cteMap.size > 0) {
        model += `WITH \${Object.entries({
${Array.from(cteMap.keys()).map(cte => `  ${cte}: ${cte}`).join(',\n')}
}).map(([name, query]) => \`\${name} AS (\${query})\`).join(',\\n')}\n\n`;
        
        // Extract the final query part (after all the CTEs)
        const mainQueryRegex = new RegExp(`${Array.from(cteMap.keys()).pop()}\\s+as\\s*\\([^)]+\\)(.+)$`, 'is');
        const mainQueryMatch = mainQueryRegex.exec(sql);
        
        if (mainQueryMatch) {
          let mainQuery = mainQueryMatch[1].trim();
          mainQuery = replaceTableReferencesWithDataformRefs(mainQuery, refTables);
          model += mainQuery;
        } else {
          // Fallback to the transformed SQL if we can't extract the main query
          model += transformedSql;
        }
      } else {
        // Fallback to the transformed SQL
        model += transformedSql;
      }
      
      model += `\``;
    } else {
      // Simpler case - just use the transformed SQL
      model += `\`${transformedSql}\``;
    }
    
    // Generate enhanced documentation with more details
    let documentation = `# ${modelName}

## Description
${config.description}

## Materialization
This model is materialized as a **${materialization}**.

## Tags
${config.tags ? config.tags.map(t => `- ${t}`).join('\n') : 'No tags applied.'}

## Source Tables
${refTables.map(t => `- \`${t}\``).join('\n')}

## JavaScript Features Used
${helperFunctions ? '- Custom helper functions for reusable patterns' : '- No helper functions required'}
- Dataform ref() syntax for table references
${sql.includes('WITH ') ? '- Common Table Expressions (CTEs) as JavaScript variables' : ''}

## Column Details
`;

    // Add column documentation
    if (columns.length > 0) {
      documentation += columns.map(col => {
        return `### ${col.name}
${col.type ? `**Type:** ${col.type}` : ''}
${col.description ? `**Description:** ${col.description}` : ''}`;
      }).join('\n\n');
    } else {
      documentation += 'Column information not available.';
    }

    // Add testing recommendations
    const recommendedTests = suggestTests(sql, columns);
    if (recommendedTests.length > 0) {
      documentation += `

## Recommended Tests
`;
      recommendedTests.forEach(test => {
        documentation += `- Column \`${test.column}\`: ${test.tests.join(', ')}\n`;
      });
    }

    documentation += `

## Query Analysis
- **Query Type:** ${sql.toLowerCase().includes('join') ? 'Join query' : 'Simple select'}
${sql.toLowerCase().includes('group by') ? '- **Contains Aggregations:** Yes' : ''}
${sql.toLowerCase().includes('where') ? '- **Contains Filters:** Yes' : ''}
${sql.length > 500 ? '- **Query Complexity:** High' : '- **Query Complexity:** Low'}

## Notes
- This model was auto-generated from SQL Guardian.
- Consider adding tests to validate the output.
- Review the materialization strategy to ensure optimal performance.
`;

    const configJson = JSON.stringify(config, null, 2);
    
    return {
      success: true,
      model,
      config: configJson,
      documentation
    };
  } catch (error) {
    console.error("Error converting to Dataform:", error);
    return {
      success: false,
      model: '',
      config: '',
      documentation: '',
      error: `Failed to convert to Dataform: ${error}`
    };
  }
}

/**
 * Convert SQL query to a dbt model
 */
export function convertToDbt(sql: string, platform: Platform): ConversionResult {
  try {
    const modelName = suggestModelName(sql);
    const materialization = suggestMaterialization(sql);
    const { refTables, dependencies } = generateDependencies(sql, platform, 'dbt');
    const columns = extractColumns(sql);
    
    // Start with the model SQL
    let model = '';
    
    // Add the config block using Jinja
    model += `{{ config(\n`;
    model += `    materialized='${materialization}',\n`;
    
    // Add schema if provided - we're using a more intelligent schema naming approach
    let schemaName = 'analytics';
    if (modelName.startsWith('stg_')) {
      schemaName = 'staging';
    } else if (modelName.startsWith('int_')) {
      schemaName = 'intermediate';
    } else if (modelName.startsWith('mart_')) {
      schemaName = 'mart';
    } else if (modelName.startsWith('agg_')) {
      schemaName = 'aggregations';
    }
    
    model += `    schema='${schemaName}',\n`;
    
    // Tags based on query content
    const tags = [];
    if (modelName.startsWith('stg_')) {
      tags.push('staging');
    } else if (modelName.startsWith('int_')) {
      tags.push('intermediate');
    } else if (modelName.startsWith('mart_')) {
      tags.push('mart');
    } else if (modelName.startsWith('agg_')) {
      tags.push('aggregation');
    }
    
    if (sql.toLowerCase().includes('group by')) {
      tags.push('aggregation');
    }
    
    if (tags.length > 0) {
      model += `    tags=['${tags.join("','")}'],\n`;
    }
    
    // Add incremental config if needed
    if (materialization === 'incremental') {
      model += `    unique_key='${columns.find(col => col.name.toLowerCase().includes('id'))?.name || 'id'}',\n`;
      model += `    incremental_strategy='merge',\n`;
      
      // Add on_schema_change configuration
      model += `    on_schema_change='sync_all_columns',\n`;
    }
    
    model += `) }}\n\n`;
    
    // Add model documentation
    model += `/*\n`;
    model += `  Model: ${modelName}\n`;
    model += `  Description: Model generated from SQL Guardian analysis\n`;
    
    if (refTables.length > 0) {
      model += `  Sources:\n`;
      refTables.forEach(table => {
        model += `    - ${table}\n`;
      });
    }
    
    if (columns.length > 0) {
      model += `  Columns:\n`;
      columns.forEach(column => {
        model += `    - ${column.name}${column.type ? ` (${column.type})` : ''}\n`;
      });
    }
    
    model += `*/\n\n`;
    
    // Define incrementalField before using it
    let incrementalField = '';
    
    // For incremental models, add the incremental filter using Jinja
    if (materialization === 'incremental') {
      // Use a smart approach based on column detection
      if (columns.some(col => col.name.toLowerCase() === 'updated_at')) {
        incrementalField = 'updated_at';
      } else if (columns.some(col => col.name.toLowerCase() === 'created_at')) {
        incrementalField = 'created_at';
      } else if (columns.some(col => col.name.toLowerCase().includes('date'))) {
        incrementalField = columns.find(col => col.name.toLowerCase().includes('date'))!.name;
      } else if (columns.some(col => col.name.toLowerCase().includes('timestamp'))) {
        incrementalField = columns.find(col => col.name.toLowerCase().includes('timestamp'))!.name;
      } else {
        incrementalField = 'id';
      }
      
      model += `{% if is_incremental() %}\n`;
      
      if (incrementalField === 'id') {
        model += `-- Incremental logic using ID\n`;
        model += `WITH max_id AS (\n`;
        model += `    SELECT MAX(${incrementalField}) AS max_value FROM {{ this }}\n`;
        model += `)\n\n`;
      } else {
        model += `-- Incremental logic using timestamp\n`;
        model += `WITH recent_data AS (\n`;
        model += `    SELECT MAX(${incrementalField}) AS max_timestamp FROM {{ this }}\n`;
        model += `)\n\n`;
      }
      
      model += `{% endif %}\n\n`;
    }
    
    // Convert table references to dbt refs and sources
    let transformedSql = sql;
    refTables.forEach((table, index) => {
      const tableParts = table.split('.');
      const tableName = tableParts[tableParts.length - 1];
      
      // Create proper dbt reference with ref or source
      const dbtRef = dependencies[index];
      
      // We need to be careful here - only convert exact table references
      const tablePattern = new RegExp(`\\b${table}\\b`, 'g');
      transformedSql = transformedSql.replace(tablePattern, dbtRef);
    });
    
    // Add the transformed SQL, with incremental filter if needed
    if (materialization === 'incremental') {
      // Add the main query with incremental filter
      const mainQueryLines = transformedSql.split('\n');
      const whereIndex = mainQueryLines.findIndex(line => line.toLowerCase().includes('where'));
      
      if (whereIndex !== -1) {
        // Add incremental condition to existing WHERE clause
        model += mainQueryLines.slice(0, whereIndex + 1).join('\n') + '\n';
        
        model += `{% if is_incremental() %}\n`;
        if (incrementalField === 'id') {
          model += `  AND ${incrementalField} > (SELECT max_value FROM max_id)\n`;
        } else {
          model += `  AND ${incrementalField} > (SELECT max_timestamp FROM recent_data)\n`;
        }
        model += `{% endif %}\n`;
        
        model += mainQueryLines.slice(whereIndex + 1).join('\n');
      } else {
        // No WHERE clause exists, add one
        const fromIndex = mainQueryLines.findIndex(line => line.toLowerCase().includes('from'));
        if (fromIndex !== -1) {
          let insertIndex = fromIndex;
          // Look for GROUP BY, ORDER BY, or LIMIT clauses to add WHERE before them
          for (let i = fromIndex; i < mainQueryLines.length; i++) {
            if (mainQueryLines[i].toLowerCase().includes('group by') || 
                mainQueryLines[i].toLowerCase().includes('order by') || 
                mainQueryLines[i].toLowerCase().includes('limit')) {
              insertIndex = i;
              break;
            }
          }
          
          model += mainQueryLines.slice(0, insertIndex).join('\n') + '\n';
          model += `WHERE 1=1 -- Always true condition\n`;
          
          model += `{% if is_incremental() %}\n`;
          if (incrementalField === 'id') {
            model += `  AND ${incrementalField} > (SELECT max_value FROM max_id)\n`;
          } else {
            model += `  AND ${incrementalField} > (SELECT max_timestamp FROM recent_data)\n`;
          }
          model += `{% endif %}\n`;
          
          model += mainQueryLines.slice(insertIndex).join('\n');
        } else {
          // Fallback - just append the transformed SQL
          model += transformedSql;
        }
      }
    } else {
      // Non-incremental model
      model += transformedSql;
    }
    
    // Create schema.yml for dbt documentation with more advanced features
    let documentation = `version: 2

models:
  - name: ${modelName}
    description: "Model generated from SQL Guardian analysis"`;

    if (tags.length > 0) {
      documentation += `
    tags: [${tags.map(t => `"${t}"`).join(', ')}]`;
    }

    documentation += `
    config:
      materialized: ${materialization}
      schema: ${schemaName}`;
      
    if (materialization === 'incremental') {
      documentation += `
      incremental_strategy: merge
      unique_key: ${columns.find(col => col.name.toLowerCase().includes('id'))?.name || 'id'}
      on_schema_change: sync_all_columns`;
    }

    // Add column documentation
    if (columns.length > 0) {
      documentation += `
    columns:`;
      columns.forEach(column => {
        documentation += `
      - name: ${column.name}
        description: "${column.description || `Column ${column.name}`}"`;
        if (column.type) {
          documentation += `
        data_type: ${column.type}`;
        }
        
        // Add suggested tests inline for each column
        const columnTests = suggestTests(sql, [column]);
        if (columnTests.length > 0 && columnTests[0].tests.length > 0) {
          documentation += `
        tests:`;
          columnTests[0].tests.forEach(test => {
            documentation += `
          - ${test}`;
            
            // Add parameters for specific tests
            if (test === 'relationships') {
              // Try to determine the referenced table
              const referencedTable = refTables.find(t => t.toLowerCase().includes(column.name.replace('_id', '')));
              if (referencedTable) {
                const tableName = referencedTable.split('.').pop() || '';
                documentation += `:
              to: ref('${tableName}')
              field: id`;
              }
            } else if (test === 'accepted_values') {
              documentation += `:
              values: ['value1', 'value2']  # Update with actual values`;
            }
          });
        }
      });
    }

    // Advanced dbt features - add meta section with column lineage
    documentation += `
    meta:
      owner: "Data Team"
      contains_pii: false
      upstream_tables: [${refTables.map(t => `"${t}"`).join(', ')}]`;

    documentation += `

sources:
  - name: raw_data
    description: "Raw data sources used by this model"
    tables:`;

    refTables.forEach(table => {
      const tableParts = table.split('.');
      const tableName = tableParts[tableParts.length - 1];
      documentation += `
      - name: ${tableName}
        description: "Source table for ${modelName}"`;
    });

    // Add macros section for reusable code patterns
    if (sql.toLowerCase().includes('count(') || sql.toLowerCase().includes('sum(')) {
      documentation += `

macros:
  - name: calculate_metrics
    description: "Helper macro for calculating standard metrics"`;
    }

    const config = JSON.stringify({
      materialized: materialization,
      schema: schemaName,
      tags: tags,
      ...(materialization === 'incremental' ? {
        incremental_strategy: 'merge',
        unique_key: columns.find(col => col.name.toLowerCase().includes('id'))?.name || 'id',
        on_schema_change: 'sync_all_columns'
      } : {})
    }, null, 2);
    
    return {
      success: true,
      model,
      config,
      documentation
    };
  } catch (error) {
    console.error("Error converting to dbt:", error);
    return {
      success: false,
      model: '',
      config: '',
      documentation: '',
      error: `Failed to convert to dbt: ${error}`
    };
  }
}
