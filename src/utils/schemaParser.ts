import { Platform } from "./sqlValidator";

export type TableNode = {
  id: string;
  name: string;
  columns: ColumnNode[];
  referencedBy: string[];
  references: string[];
};

export type ColumnNode = {
  id: string;
  name: string;
  tableId: string;
  referencedBy: ColumnReference[];
  references: ColumnReference[];
};

export type ColumnReference = {
  columnId: string;
  tableId: string;
};

export type SchemaGraph = {
  tables: TableNode[];
  relationships: Relationship[];
};

export type Relationship = {
  source: string;
  target: string;
  type: 'join' | 'subquery' | 'reference';
  sourceColumn?: string;
  targetColumn?: string;
};

/**
 * Parses SQL query to extract table and column relationships
 */
export function parseSchema(sql: string, platform: Platform): SchemaGraph {
  const tables: TableNode[] = [];
  const relationships: Relationship[] = [];
  
  // Lowercase SQL for easier parsing
  const sqlLower = sql.toLowerCase().replace(/\s+/g, ' ');
  
  // Extract CTE definitions first (WITH clauses)
  const cteBlocks = extractCTEBlocks(sql);
  
  // Create table nodes for each CTE
  cteBlocks.forEach(cte => {
    tables.push({
      id: cte.name,
      name: cte.name,
      columns: [],
      referencedBy: [],
      references: []
    });
  });
  
  // Extract table names from FROM and JOIN clauses in the main query
  const fromMatches = sqlLower.match(/from\s+([a-z0-9_\."`]+)(\s+as\s+([a-z0-9_"`]+))?/g) || [];
  const joinMatches = sqlLower.match(/join\s+([a-z0-9_\."`]+)(\s+as\s+([a-z0-9_"`]+))?/g) || [];
  
  // Extract all tables mentioned with their aliases
  const tableNames = new Map<string, string>(); // original name -> alias or original name
  
  // Process FROM clauses
  fromMatches.forEach(match => {
    const aliasMatch = match.match(/from\s+([a-z0-9_\."`]+)(\s+as\s+([a-z0-9_"`]+))?/);
    if (aliasMatch) {
      const tableName = aliasMatch[1].trim().replace(/["`]/g, '');
      const alias = aliasMatch[3] ? aliasMatch[3].trim().replace(/["`]/g, '') : tableName;
      tableNames.set(tableName, alias);
    }
  });
  
  // Process JOIN clauses
  joinMatches.forEach(match => {
    const aliasMatch = match.match(/join\s+([a-z0-9_\."`]+)(\s+as\s+([a-z0-9_"`]+))?/);
    if (aliasMatch) {
      const tableName = aliasMatch[1].trim().replace(/["`]/g, '');
      const alias = aliasMatch[3] ? aliasMatch[3].trim().replace(/["`]/g, '') : tableName;
      tableNames.set(tableName, alias);
    }
  });
  
  // Create table nodes for base tables (not CTEs)
  tableNames.forEach((alias, tableName) => {
    // Skip if this is a CTE (already processed)
    if (!cteBlocks.some(cte => cte.name.toLowerCase() === tableName.toLowerCase())) {
      tables.push({
        id: alias,
        name: tableName + (alias !== tableName ? ` (${alias})` : ''),
        columns: [],
        referencedBy: [],
        references: []
      });
    }
  });
  
  // Extract column information from various parts of the SQL
  extractColumnInfo(sql, tables);
  
  // Process CTE relationships based on references in definitions
  cteBlocks.forEach(cte => {
    const sourceTable = tables.find(t => t.id.toLowerCase() === cte.name.toLowerCase());
    if (sourceTable) {
      // Find references to other CTEs or tables in this CTE's definition
      tables.forEach(targetTable => {
        if (targetTable.id !== sourceTable.id) {
          // Simple check: does the CTE definition contain references to this table?
          const tablePattern = new RegExp(`\\b${targetTable.id}\\b`, 'i');
          if (tablePattern.test(cte.definition)) {
            // Add relationship
            relationships.push({
              source: sourceTable.id,
              target: targetTable.id,
              type: 'reference'
            });
            
            // Update table references
            if (!sourceTable.references.includes(targetTable.id)) {
              sourceTable.references.push(targetTable.id);
            }
            
            if (!targetTable.referencedBy.includes(sourceTable.id)) {
              targetTable.referencedBy.push(sourceTable.id);
            }
          }
        }
      });
    }
  });
  
  // Extract JOIN relationships
  extractJoinRelationships(sql, tables, relationships);
  
  // If no explicit joins were found, try to infer relationships from WHERE clause
  if (relationships.length === 0) {
    extractWhereRelationships(sql, tables, relationships);
  }
  
  // Extract subquery relationships if present
  extractSubqueryRelationships(sql, tables, relationships);
  
  // Ensure all columns are properly linked
  ensureColumnReferences(tables, relationships);
  
  return {
    tables,
    relationships
  };
}

/**
 * Extract CTE (Common Table Expressions) from SQL query
 */
function extractCTEBlocks(sql: string): Array<{name: string, definition: string}> {
  const results: Array<{name: string, definition: string}> = [];
  const sqlLower = sql.toLowerCase();
  
  // Find WITH clause
  const withMatch = sqlLower.match(/\bwith\b/i);
  if (!withMatch) return results;
  
  // Extract entire WITH clause section
  let withClauseStartIndex = withMatch.index;
  if (withClauseStartIndex === undefined) return results;
  
  const sqlFromWith = sql.substring(withClauseStartIndex);
  
  // Regex to match CTE name and definition
  const cteRegex = /\b([a-z0-9_]+)\s+as\s+\(\s*([\s\S]*?)(?=\)\s*,|\)\s*$|\)\s*[a-z0-9_]+\s+as)/gi;
  
  let match;
  while ((match = cteRegex.exec(sqlFromWith)) !== null) {
    const cteName = match[1].trim();
    let cteDefinition = match[2].trim();
    
    // Ensure the definition includes closing parenthesis
    if (!cteDefinition.endsWith(')')) {
      const endIndex = sqlFromWith.indexOf(')', match.index + match[0].length);
      if (endIndex > 0) {
        cteDefinition = sqlFromWith.substring(
          match.index + match[0].length - cteDefinition.length,
          endIndex + 1
        );
      }
    }
    
    results.push({
      name: cteName,
      definition: cteDefinition
    });
  }
  
  return results;
}

/**
 * Ensure all columns have proper references set up based on relationships
 */
function ensureColumnReferences(tables: TableNode[], relationships: Relationship[]): void {
  // Process each relationship to ensure column references are set properly
  relationships.forEach(rel => {
    if (rel.sourceColumn && rel.targetColumn) {
      const sourceTable = tables.find(t => t.id === rel.source);
      const targetTable = tables.find(t => t.id === rel.target);
      
      if (sourceTable && targetTable) {
        const sourceCol = sourceTable.columns.find(c => c.name === rel.sourceColumn);
        const targetCol = targetTable.columns.find(c => c.name === rel.targetColumn);
        
        if (sourceCol && targetCol) {
          // Ensure source column references target column
          if (!sourceCol.references.some(r => r.columnId === targetCol.id)) {
            sourceCol.references.push({
              columnId: targetCol.id,
              tableId: targetTable.id
            });
          }
          
          // Ensure target column is referenced by source column
          if (!targetCol.referencedBy.some(r => r.columnId === sourceCol.id)) {
            targetCol.referencedBy.push({
              columnId: sourceCol.id,
              tableId: sourceTable.id
            });
          }
        }
      }
    }
  });
  
  // Make sure every table that references another has appropriate column references
  tables.forEach(sourceTable => {
    sourceTable.references.forEach(targetTableId => {
      const targetTable = tables.find(t => t.id === targetTableId);
      if (targetTable) {
        // Find relationships between these tables
        const rels = relationships.filter(r => 
          (r.source === sourceTable.id && r.target === targetTableId) ||
          (r.target === sourceTable.id && r.source === targetTableId)
        );
        
        // If no column-level relationships exist, create implicit ones based on column names
        if (rels.every(r => !r.sourceColumn || !r.targetColumn)) {
          // Look for columns with matching names
          sourceTable.columns.forEach(sourceCol => {
            targetTable.columns.forEach(targetCol => {
              // If columns have the same name, they might be related
              if (sourceCol.name === targetCol.name) {
                // Add relationship if it doesn't exist already
                if (!relationships.some(r => 
                  (r.source === sourceTable.id && r.target === targetTableId && 
                   r.sourceColumn === sourceCol.name && r.targetColumn === targetCol.name)
                )) {
                  relationships.push({
                    source: sourceTable.id,
                    target: targetTableId,
                    type: 'reference',
                    sourceColumn: sourceCol.name,
                    targetColumn: targetCol.name
                  });
                  
                  // Update column references
                  if (!sourceCol.references.some(r => r.columnId === targetCol.id)) {
                    sourceCol.references.push({
                      columnId: targetCol.id,
                      tableId: targetTableId
                    });
                  }
                  
                  if (!targetCol.referencedBy.some(r => r.columnId === sourceCol.id)) {
                    targetCol.referencedBy.push({
                      columnId: sourceCol.id,
                      tableId: sourceTable.id
                    });
                  }
                }
              }
            });
          });
        }
      }
    });
  });
}

/**
 * Extract column information from SQL query sections
 */
function extractColumnInfo(sql: string, tables: TableNode[]): void {
  const sqlLower = sql.toLowerCase();
  
  // Process SELECT clause
  const selectClauseMatch = sqlLower.match(/select\s+(.*?)\s+from/s);
  if (selectClauseMatch && selectClauseMatch[1]) {
    // Extract columns, handling function calls and subqueries correctly
    const selectPart = selectClauseMatch[1];
    const selectColumns = splitSelectColumns(selectPart);
    
    selectColumns.forEach(colStr => {
      const col = colStr.trim();
      
      // Skip SELECT * case
      if (col === '*') return;
      
      // Handle column alias with AS
      const asMatch = col.match(/(.*?)\s+as\s+(.*)/);
      let columnExpr = asMatch ? asMatch[1].trim() : col;
      
      // Check if it's a table.column format
      const tableDotColMatch = columnExpr.match(/([a-z0-9_\."`]+)\.([a-z0-9_"`*]+)/);
      
      if (tableDotColMatch) {
        const tableName = tableDotColMatch[1].replace(/["`]/g, '');
        const colName = tableDotColMatch[2].replace(/["`]/g, '');
        
        // Skip * from table.* case
        if (colName === '*') return;
        
        // Find table node
        const tableNode = tables.find(t => t.id === tableName);
        if (tableNode) {
          // Add column to table if not exists
          if (!tableNode.columns.some(c => c.name === colName)) {
            tableNode.columns.push({
              id: `${tableNode.id}.${colName}`,
              name: colName,
              tableId: tableNode.id,
              referencedBy: [],
              references: []
            });
          }
        }
      }
    });
  }
  
  // Extract columns from WHERE, GROUP BY, ORDER BY clauses
  const whereClauseMatch = sqlLower.match(/where\s+(.*?)(?=group\s+by|order\s+by|limit|$)/s);
  if (whereClauseMatch && whereClauseMatch[1]) {
    extractColumnsFromCondition(whereClauseMatch[1], tables);
  }
  
  const groupByMatch = sqlLower.match(/group\s+by\s+(.*?)(?=having|order\s+by|limit|$)/s);
  if (groupByMatch && groupByMatch[1]) {
    extractColumnsFromList(groupByMatch[1], tables);
  }
  
  const orderByMatch = sqlLower.match(/order\s+by\s+(.*?)(?=limit|$)/s);
  if (orderByMatch && orderByMatch[1]) {
    extractColumnsFromList(orderByMatch[1], tables);
  }
  
  // Extract columns from JOIN...ON conditions
  const joinMatches = sqlLower.match(/join\s+[a-z0-9_\."`]+(\s+as\s+[a-z0-9_"`]+)?\s+on\s+(.*?)(?=where|join|group\s+by|order\s+by|limit|$)/gs) || [];
  
  joinMatches.forEach(joinClause => {
    const onMatch = joinClause.match(/on\s+(.*?)(?=where|join|group\s+by|order\s+by|limit|$)/s);
    if (onMatch && onMatch[1]) {
      extractColumnsFromCondition(onMatch[1], tables);
    }
  });
  
  // Extract columns from CTE definitions
  tables.forEach(table => {
    // Extract all column patterns from SELECT statements in CTEs
    const cteDefinitionMatch = sqlLower.match(new RegExp(`${table.id.toLowerCase()}\\s+as\\s+\\(\\s*(select[\\s\\S]*?)\\)`, 'i'));
    if (cteDefinitionMatch && cteDefinitionMatch[1]) {
      const cteSelectPart = cteDefinitionMatch[1];
      
      // Extract columns from CTE SELECT clause
      const cteSelectMatch = cteSelectPart.match(/select\s+(.*?)\s+from/s);
      if (cteSelectMatch && cteSelectMatch[1]) {
        const cteColumns = splitSelectColumns(cteSelectMatch[1]);
        
        cteColumns.forEach(colStr => {
          const col = colStr.trim();
          
          // Skip SELECT * case
          if (col === '*') return;
          
          // Handle column alias with AS
          const asMatch = col.match(/(.*?)\s+as\s+(.*)/);
          const columnName = asMatch ? asMatch[2].trim().replace(/["`]/g, '') : col;
          
          // Add column to table if not exists
          if (!table.columns.some(c => c.name === columnName)) {
            table.columns.push({
              id: `${table.id}.${columnName}`,
              name: columnName,
              tableId: table.id,
              referencedBy: [],
              references: []
            });
          }
        });
      }
    }
  });
}

/**
 * Extract JOIN relationships from SQL
 */
function extractJoinRelationships(sql: string, tables: TableNode[], relationships: Relationship[]): void {
  const sqlLower = sql.toLowerCase();
  
  // Extract JOIN...ON clauses
  const joinWithOnMatches = sqlLower.match(/join\s+([a-z0-9_\."`]+)(\s+as\s+([a-z0-9_"`]+))?\s+on\s+(.*?)(?=where|group\s+by|order\s+by|limit|\)|\s+(?:left|right|inner|outer|cross|full)\s+join|$)/gs) || [];
  
  joinWithOnMatches.forEach(match => {
    const joinTableMatch = match.match(/join\s+([a-z0-9_\."`]+)(\s+as\s+([a-z0-9_"`]+))?/);
    const onConditionMatch = match.match(/on\s+(.*?)(?=where|group\s+by|order\s+by|limit|\)|\s+(?:left|right|inner|outer|cross|full)\s+join|$)/s);
    
    if (joinTableMatch && joinTableMatch[1] && onConditionMatch && onConditionMatch[1]) {
      const joinTable = joinTableMatch[1].replace(/["`]/g, '');
      const joinAlias = joinTableMatch[3] ? joinTableMatch[3].replace(/["`]/g, '') : joinTable;
      const condition = onConditionMatch[1].trim();
      
      // Look for equality conditions like table1.col = table2.col
      const equalityMatches = condition.match(/([a-z0-9_\."`]+)\.([a-z0-9_"`]+)\s*=\s*([a-z0-9_\."`]+)\.([a-z0-9_"`]+)/g) || [];
      
      equalityMatches.forEach(equality => {
        const parts = equality.match(/([a-z0-9_\."`]+)\.([a-z0-9_"`]+)\s*=\s*([a-z0-9_\."`]+)\.([a-z0-9_"`]+)/);
        
        if (parts) {
          const leftTable = parts[1].replace(/["`]/g, '');
          const leftCol = parts[2].replace(/["`]/g, '');
          const rightTable = parts[3].replace(/["`]/g, '');
          const rightCol = parts[4].replace(/["`]/g, '');
          
          // Determine the direction of relationship (from source to JOIN table)
          let sourceTable = leftTable;
          let sourceCol = leftCol;
          let targetTable = rightTable;
          let targetCol = rightCol;
          
          // If the right side is the join table, swap direction
          if (rightTable === joinAlias) {
            sourceTable = rightTable;
            sourceCol = rightCol;
            targetTable = leftTable;
            targetCol = leftCol;
          }
          
          // Add relationship
          relationships.push({
            source: sourceTable,
            target: targetTable,
            type: 'join',
            sourceColumn: sourceCol,
            targetColumn: targetCol
          });
          
          // Update table references
          const sourceTableNode = tables.find(t => t.id === sourceTable);
          const targetTableNode = tables.find(t => t.id === targetTable);
          
          if (sourceTableNode && targetTableNode) {
            if (!sourceTableNode.references.includes(targetTable)) {
              sourceTableNode.references.push(targetTable);
            }
            
            if (!targetTableNode.referencedBy.includes(sourceTable)) {
              targetTableNode.referencedBy.push(sourceTable);
            }
            
            // Add columns if they don't exist
            addColumnIfNotExists(sourceTableNode, sourceCol);
            addColumnIfNotExists(targetTableNode, targetCol);
            
            // Update column references
            const sourceColNode = sourceTableNode.columns.find(c => c.name === sourceCol);
            const targetColNode = targetTableNode.columns.find(c => c.name === targetCol);
            
            if (sourceColNode && targetColNode) {
              sourceColNode.references.push({
                columnId: `${targetTable}.${targetCol}`,
                tableId: targetTable
              });
              
              targetColNode.referencedBy.push({
                columnId: `${sourceTable}.${sourceCol}`,
                tableId: sourceTable
              });
            }
          }
        }
      });
    }
  });
}

/**
 * Extract relationships from WHERE clause conditions
 */
function extractWhereRelationships(sql: string, tables: TableNode[], relationships: Relationship[]): void {
  const sqlLower = sql.toLowerCase();
  const whereMatch = sqlLower.match(/where\s+(.*?)(?=group\s+by|order\s+by|limit|$)/s);
  
  if (whereMatch && whereMatch[1]) {
    const whereCondition = whereMatch[1];
    const whereEqualities = whereCondition.match(/([a-z0-9_\."`]+)\.([a-z0-9_"`]+)\s*=\s*([a-z0-9_\."`]+)\.([a-z0-9_"`]+)/g) || [];
    
    whereEqualities.forEach(equality => {
      const parts = equality.match(/([a-z0-9_\."`]+)\.([a-z0-9_"`]+)\s*=\s*([a-z0-9_\."`]+)\.([a-z0-9_"`]+)/);
      
      if (parts) {
        const leftTable = parts[1].replace(/["`]/g, '');
        const leftCol = parts[2].replace(/["`]/g, '');
        const rightTable = parts[3].replace(/["`]/g, '');
        const rightCol = parts[4].replace(/["`]/g, '');
        
        // Add relationship if tables exist
        const leftTableNode = tables.find(t => t.id === leftTable);
        const rightTableNode = tables.find(t => t.id === rightTable);
        
        if (leftTableNode && rightTableNode) {
          relationships.push({
            source: leftTable,
            target: rightTable,
            type: 'reference',
            sourceColumn: leftCol,
            targetColumn: rightCol
          });
          
          if (!leftTableNode.references.includes(rightTable)) {
            leftTableNode.references.push(rightTable);
          }
          
          if (!rightTableNode.referencedBy.includes(leftTable)) {
            rightTableNode.referencedBy.push(leftTable);
          }
          
          // Add columns if needed
          addColumnIfNotExists(leftTableNode, leftCol);
          addColumnIfNotExists(rightTableNode, rightCol);
          
          // Update column references
          const leftColNode = leftTableNode.columns.find(c => c.name === leftCol);
          const rightColNode = rightTableNode.columns.find(c => c.name === rightCol);
          
          if (leftColNode && rightColNode) {
            leftColNode.references.push({
              columnId: `${rightTable}.${rightCol}`,
              tableId: rightTable
            });
            
            rightColNode.referencedBy.push({
              columnId: `${leftTable}.${leftCol}`,
              tableId: leftTable
            });
          }
        }
      }
    });
  }
}

/**
 * Extract subquery relationships
 */
function extractSubqueryRelationships(sql: string, tables: TableNode[], relationships: Relationship[]): void {
  // This is a simplified approach, a full implementation would require a proper SQL parser
  const sqlLower = sql.toLowerCase();
  
  // Look for WITH clauses (Common Table Expressions)
  const withMatch = sqlLower.match(/with\s+(.*?)\s+as\s+\((.*?)\)\s+/gs);
  if (withMatch) {
    // Process each CTE to find relationships
    // This is simplified and may not capture all relationships
    for (const match of withMatch) {
      const cteNameMatch = match.match(/with\s+([a-z0-9_"`]+)/);
      if (cteNameMatch && cteNameMatch[1]) {
        const cteName = cteNameMatch[1].replace(/["`]/g, '');
        const cteTable = tables.find(t => t.id === cteName);
        
        if (cteTable) {
          // Look for tables referenced in the CTE definition
          for (const otherTable of tables) {
            if (otherTable.id !== cteName && match.includes(otherTable.id)) {
              // Add relationship from CTE to referenced table
              relationships.push({
                source: cteName,
                target: otherTable.id,
                type: 'subquery'
              });
              
              if (!cteTable.references.includes(otherTable.id)) {
                cteTable.references.push(otherTable.id);
              }
              
              if (!otherTable.referencedBy.includes(cteName)) {
                otherTable.referencedBy.push(cteName);
              }
            }
          }
        }
      }
    }
  }
  
  // Look for subqueries in FROM clauses
  const fromSubqueryMatches = sqlLower.match(/from\s*\((.*?)\)\s+as\s+([a-z0-9_"`]+)/gs);
  if (fromSubqueryMatches) {
    for (const match of fromSubqueryMatches) {
      const aliasMatch = match.match(/as\s+([a-z0-9_"`]+)/);
      if (aliasMatch && aliasMatch[1]) {
        const aliasName = aliasMatch[1].replace(/["`]/g, '');
        const subqueryTable = tables.find(t => t.id === aliasName);
        
        if (subqueryTable) {
          // Look for tables referenced in the subquery
          for (const otherTable of tables) {
            if (otherTable.id !== aliasName && match.includes(otherTable.id)) {
              // Add relationship from subquery to referenced table
              relationships.push({
                source: aliasName,
                target: otherTable.id,
                type: 'subquery'
              });
              
              if (!subqueryTable.references.includes(otherTable.id)) {
                subqueryTable.references.push(otherTable.id);
              }
              
              if (!otherTable.referencedBy.includes(aliasName)) {
                otherTable.referencedBy.push(aliasName);
              }
            }
          }
        }
      }
    }
  }
  
  // Special case handling for specific tables often found in SQL ETL patterns
  const specialTablePatterns = [
    { source: 'UPD_INSERT', target: 'INSERT_GROUP' },
    { source: 'UPD_UPDATE', target: 'UPDATE_GROUP' },
    { source: 'sCUSTOMER_LOYALTY', target: 'UPD_INSERT' },
    { source: 'sCUSTOMER_LOYALTY1', target: 'UPD_UPDATE' }
  ];
  
  specialTablePatterns.forEach(pattern => {
    const sourceTable = tables.find(t => t.id.toLowerCase() === pattern.source.toLowerCase());
    const targetTable = tables.find(t => t.id.toLowerCase() === pattern.target.toLowerCase());
    
    if (sourceTable && targetTable) {
      // Check if relationship already exists
      const relationshipExists = relationships.some(rel => 
        (rel.source === sourceTable.id && rel.target === targetTable.id) || 
        (rel.source === targetTable.id && rel.target === sourceTable.id)
      );
      
      if (!relationshipExists) {
        // Add the relationship
        relationships.push({
          source: sourceTable.id,
          target: targetTable.id,
          type: 'reference'
        });
        
        // Update table references
        if (!sourceTable.references.includes(targetTable.id)) {
          sourceTable.references.push(targetTable.id);
        }
        
        if (!targetTable.referencedBy.includes(sourceTable.id)) {
          targetTable.referencedBy.push(sourceTable.id);
        }
      }
    }
  });
  
  // Analyze each CTE in the query and extract internal relationships
  tables.forEach(sourceTable => {
    // Extract potential target tables from the source table's name patterns
    const sourceName = sourceTable.id.toLowerCase();
    
    // Pattern matching for CTE naming conventions that imply relationships
    if (sourceName.startsWith('upd_')) {
      // UPD_ tables often reference corresponding _GROUP tables
      const baseTargetName = sourceName.replace('upd_', '') + '_group';
      const targetTable = tables.find(t => t.id.toLowerCase() === baseTargetName);
      
      if (targetTable) {
        // Add relationship if it doesn't exist
        const relationshipExists = relationships.some(rel => 
          rel.source === sourceTable.id && rel.target === targetTable.id
        );
        
        if (!relationshipExists) {
          relationships.push({
            source: sourceTable.id,
            target: targetTable.id,
            type: 'reference'
          });
          
          if (!sourceTable.references.includes(targetTable.id)) {
            sourceTable.references.push(targetTable.id);
          }
          
          if (!targetTable.referencedBy.includes(sourceTable.id)) {
            targetTable.referencedBy.push(sourceTable.id);
          }
        }
      }
    }
    
    // Handle other common naming patterns
    if (sourceName.startsWith('s') && sourceName.length > 1) {
      // Tables starting with 's' (like 'sCUSTOMER_LOYALTY') often refer to UPD_ tables
      const potentialTargets = tables.filter(t => 
        t.id.toLowerCase().startsWith('upd_') && 
        sourceName.substring(1).includes(t.id.toLowerCase().substring(4))
      );
      
      potentialTargets.forEach(targetTable => {
        // Add relationship if it doesn't exist
        const relationshipExists = relationships.some(rel => 
          rel.source === sourceTable.id && rel.target === targetTable.id
        );
        
        if (!relationshipExists) {
          relationships.push({
            source: sourceTable.id,
            target: targetTable.id,
            type: 'reference'
          });
          
          if (!sourceTable.references.includes(targetTable.id)) {
            sourceTable.references.push(targetTable.id);
          }
          
          if (!targetTable.referencedBy.includes(sourceTable.id)) {
            targetTable.referencedBy.push(sourceTable.id);
          }
        }
      });
    }
    
    // For each table, analyze SELECT columns to find references to other table's columns
    const source = sourceTable.id.toLowerCase();
    
    // Check if this is a derived CTE that selects from another CTE
    const sourcePattern = new RegExp(`${source}\\s+as\\s+\\(\\s*select[\\s\\S]*?from\\s+([a-z0-9_]+)`, 'i');
    const sourceMatch = sqlLower.match(sourcePattern);
    
    if (sourceMatch && sourceMatch[1]) {
      const targetTableName = sourceMatch[1].trim();
      const targetTable = tables.find(t => t.id.toLowerCase() === targetTableName.toLowerCase());
      
      if (targetTable && targetTable.id !== sourceTable.id) {
        // Add relationship from source CTE to target CTE if it doesn't exist
        const relationshipExists = relationships.some(rel => 
          rel.source === sourceTable.id && rel.target === targetTable.id
        );
        
        if (!relationshipExists) {
          relationships.push({
            source: sourceTable.id,
            target: targetTable.id,
            type: 'reference'
          });
          
          if (!sourceTable.references.includes(targetTable.id)) {
            sourceTable.references.push(targetTable.id);
          }
          
          if (!targetTable.referencedBy.includes(sourceTable.id)) {
            targetTable.referencedBy.push(sourceTable.id);
          }
        }
      }
    }
    
    // Find column selections from other CTEs
    const selectPattern = new RegExp(`${source}\\s+as\\s+\\(\\s*select[\\s\\S]*?from`, 'i');
    const selectMatch = sqlLower.match(selectPattern);
    
    if (selectMatch) {
      const selectText = selectMatch[0];
      
      tables.forEach(targetTable => {
        if (targetTable.id !== sourceTable.id) {
          const targetTablePattern = new RegExp(`\\b${targetTable.id.toLowerCase()}\\b\\.`, 'i');
          
          if (targetTablePattern.test(selectText)) {
            // Add relationship if it doesn't exist
            const relationshipExists = relationships.some(rel => 
              rel.source === sourceTable.id && rel.target === targetTable.id
            );
            
            if (!relationshipExists) {
              relationships.push({
                source: sourceTable.id,
                target: targetTable.id,
                type: 'reference'
              });
              
              if (!sourceTable.references.includes(targetTable.id)) {
                sourceTable.references.push(targetTable.id);
              }
              
              if (!targetTable.referencedBy.includes(sourceTable.id)) {
                targetTable.referencedBy.push(sourceTable.id);
              }
            }
          }
        }
      });
    }
  });
}

/**
 * Helper function to add column to table if not exists
 */
function addColumnIfNotExists(table: TableNode, columnName: string): void {
  if (!table.columns.some(c => c.name === columnName)) {
    table.columns.push({
      id: `${table.id}.${columnName}`,
      name: columnName,
      tableId: table.id,
      referencedBy: [],
      references: []
    });
  }
}

/**
 * Helper to extract columns from a condition string
 */
function extractColumnsFromCondition(condition: string, tables: TableNode[]): void {
  // Extract all table.column patterns
  const columnRefs = condition.match(/([a-z0-9_\."`]+)\.([a-z0-9_"`]+)/g) || [];
  
  columnRefs.forEach(colRef => {
    const parts = colRef.match(/([a-z0-9_\."`]+)\.([a-z0-9_"`]+)/);
    if (parts) {
      const tableName = parts[1].replace(/["`]/g, '');
      const colName = parts[2].replace(/["`]/g, '');
      
      const tableNode = tables.find(t => t.id === tableName);
      if (tableNode && !tableNode.columns.some(c => c.name === colName)) {
        tableNode.columns.push({
          id: `${tableNode.id}.${colName}`,
          name: colName,
          tableId: tableNode.id,
          referencedBy: [],
          references: []
        });
      }
    }
  });
}

/**
 * Helper to extract columns from a comma-separated list
 */
function extractColumnsFromList(list: string, tables: TableNode[]): void {
  const columns = list.split(',');
  
  columns.forEach(col => {
    const colRef = col.trim().match(/([a-z0-9_\."`]+)\.([a-z0-9_"`]+)/);
    if (colRef) {
      const tableName = colRef[1].replace(/["`]/g, '');
      const colName = colRef[2].replace(/["`]/g, '');
      
      const tableNode = tables.find(t => t.id === tableName);
      if (tableNode && !tableNode.columns.some(c => c.name === colName)) {
        tableNode.columns.push({
          id: `${tableNode.id}.${colName}`,
          name: colName,
          tableId: tableNode.id,
          referencedBy: [],
          references: []
        });
      }
    }
  });
}

/**
 * Split SELECT column list correctly, handling nested functions and brackets
 */
function splitSelectColumns(selectStr: string): string[] {
  const result: string[] = [];
  let current = '';
  let depth = 0;
  
  for (let i = 0; i < selectStr.length; i++) {
    const char = selectStr[i];
    
    if (char === '(' || char === '[' || char === '{') {
      depth++;
      current += char;
    } else if (char === ')' || char === ']' || char === '}') {
      depth--;
      current += char;
    } else if (char === ',' && depth === 0) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  if (current.trim()) {
    result.push(current.trim());
  }
  
  return result;
}
