import { Platform } from './sqlValidator';

// Types
interface CostEstimate {
  processingUnits: number;
  estimatedCost: number;
  dataScanned: string;
  complexity: 'low' | 'medium' | 'high';
  executionTime: string;
  recommendations: string[];
}

/**
 * Cost estimation for SQL queries based on platform
 */
export function estimateQueryCost(sql: string, platform: Platform): CostEstimate {
  // Base estimate structure
  const estimate: CostEstimate = {
    processingUnits: 0,
    estimatedCost: 0,
    dataScanned: '0 MB',
    complexity: 'low',
    executionTime: '0s',
    recommendations: []
  };
  
  // Analyze query complexity
  const complexity = analyzeQueryComplexity(sql);
  estimate.complexity = complexity;
  
  // Base processing time based on complexity and query size
  const querySize = estimateQuerySize(sql);
  let processingUnits;
  let executionTimeSeconds;
  
  switch (complexity) {
    case 'high':
      processingUnits = 4 + (querySize * 0.8);
      executionTimeSeconds = 45 + (querySize * 2.5);
      break;
    case 'medium':
      processingUnits = 1 + (querySize * 0.4);
      executionTimeSeconds = 8 + (querySize * 1.2);
      break;
    case 'low':
      processingUnits = 0.2 + (querySize * 0.1);
      executionTimeSeconds = 1 + (querySize * 0.5);
      break;
  }
  
  // Format execution time
  if (executionTimeSeconds >= 60) {
    const minutes = Math.floor(executionTimeSeconds / 60);
    const seconds = Math.floor(executionTimeSeconds % 60);
    estimate.executionTime = `${minutes}m ${seconds}s`;
  } else {
    estimate.executionTime = `${Math.floor(executionTimeSeconds)}s`;
  }
  
  // Platform-specific calculations
  switch (platform) {
    case 'bigquery':
      return estimateBigQueryCost(sql, complexity, processingUnits, querySize, estimate);
    case 'snowflake':
      return estimateSnowflakeCost(sql, complexity, processingUnits, querySize, estimate);
    case 'databricks':
      return estimateDatabricksCost(sql, complexity, processingUnits, querySize, estimate);
    default:
      return estimate;
  }
}

/**
 * Analyze query complexity level
 */
function analyzeQueryComplexity(sql: string): 'low' | 'medium' | 'high' {
  const sqlLower = sql.toLowerCase();
  
  // High complexity indicators
  if (
    hasMultipleSubqueries(sqlLower) ||
    hasMultipleJoins(sqlLower, 3) ||
    hasComplexWindow(sqlLower) ||
    hasManyAggregations(sqlLower, 4) ||
    sql.length > 1200
  ) {
    return 'high';
  }
  
  // Medium complexity indicators
  if (
    hasSubquery(sqlLower) ||
    hasMultipleJoins(sqlLower, 2) ||
    hasWindow(sqlLower) ||
    hasAggregations(sqlLower) ||
    hasCaseStatements(sqlLower, 2) ||
    hasUnion(sqlLower) ||
    sql.length > 500
  ) {
    return 'medium';
  }
  
  // Low complexity by default
  return 'low';
}

/**
 * Estimate query size factor based on tables, joins, and conditions
 */
function estimateQuerySize(sql: string): number {
  const sqlLower = sql.toLowerCase();
  
  // Count tables in FROM and JOINs
  const fromMatches = sqlLower.match(/from\s+([a-z0-9_\.`"\[\]]+)/g) || [];
  const joinMatches = sqlLower.match(/join\s+([a-z0-9_\.`"\[\]]+)/g) || [];
  
  // Count columns in SELECT
  const selectClause = sqlLower.match(/select\s+(.*?)\s+from/s);
  const numColumns = selectClause 
    ? selectClause[1].split(',').length 
    : 1;
  
  // Count where conditions
  const whereClause = sqlLower.match(/where\s+(.*?)(?=group by|order by|limit|$)/s);
  const whereConditions = whereClause 
    ? (whereClause[1].match(/and|or/g) || []).length + 1 
    : 0;
  
  // Base size factor with some randomness to simulate real-world variance
  const baseSizeFactor = 
    (fromMatches.length + joinMatches.length) * 2 + 
    (numColumns * 0.3) + 
    (whereConditions * 0.5);
  
  // Add some randomization (±20%)
  const randomFactor = 0.8 + (Math.random() * 0.4);
  
  return baseSizeFactor * randomFactor;
}

/**
 * Estimate BigQuery costs
 */
function estimateBigQueryCost(
  sql: string, 
  complexity: 'low' | 'medium' | 'high',
  processingUnits: number,
  querySize: number,
  baseEstimate: CostEstimate
): CostEstimate {
  const sqlLower = sql.toLowerCase();
  
  // Estimate data scanned based on complexity and query characteristics
  // BigQuery pricing is primarily based on bytes processed
  let dataScannedGB = 0;
  
  // Base data volume by complexity
  switch (complexity) {
    case 'high':
      dataScannedGB = 5 + (querySize * 3.2);
      break;
    case 'medium':
      dataScannedGB = 0.5 + (querySize * 1.5);
      break;
    case 'low':
      dataScannedGB = 0.05 + (querySize * 0.3);
      break;
  }
  
  // Adjust for query patterns
  if (sqlLower.includes('select *')) {
    dataScannedGB *= 1.8;
  }
  
  if (!sqlLower.includes('where')) {
    dataScannedGB *= 2.5;
  }
  
  if (sqlLower.includes('partition by') || sqlLower.includes('_partitiontime')) {
    dataScannedGB *= 0.4;
  }
  
  if (sqlLower.includes('cluster by')) {
    dataScannedGB *= 0.7;
  }
  
  // Format data scanned for display
  let dataScanned: string;
  if (dataScannedGB >= 1) {
    dataScanned = `${dataScannedGB.toFixed(2)} GB`;
  } else {
    dataScanned = `${Math.round(dataScannedGB * 1000)} MB`;
  }
  
  // Calculate cost: $5 per TB (realistic BigQuery on-demand pricing)
  const estimatedCost = (dataScannedGB / 1000) * 5;
  
  // Gather recommendations
  const recommendations: string[] = [];
  
  if (sqlLower.includes('select *')) {
    recommendations.push('Select only needed columns instead of SELECT * to reduce data processed');
  }
  
  if (!sqlLower.includes('where')) {
    recommendations.push('Add WHERE filters to reduce the amount of data scanned');
  }
  
  if (!sqlLower.includes('partition by') && !sqlLower.includes('_partitiontime')) {
    recommendations.push('Use partitioned tables to reduce data scanned by up to 80%');
  }
  
  if (complexity === 'high' && !sqlLower.includes('cluster by')) {
    recommendations.push('Consider using clustered tables for better filter performance and reduced costs');
  }
  
  if (hasMultipleSubqueries(sqlLower)) {
    recommendations.push('Replace nested subqueries with CTEs for better query optimization');
  }
  
  if (sqlLower.includes('order by') && !sqlLower.includes('limit')) {
    recommendations.push('Add LIMIT clause when using ORDER BY to reduce processing');
  }
  
  return {
    ...baseEstimate,
    processingUnits: processingUnits,
    estimatedCost: parseFloat(estimatedCost.toFixed(4)),
    dataScanned: dataScanned,
    complexity: complexity,
    recommendations: recommendations
  };
}

/**
 * Estimate Snowflake costs
 */
function estimateSnowflakeCost(
  sql: string, 
  complexity: 'low' | 'medium' | 'high',
  processingUnits: number,
  querySize: number,
  baseEstimate: CostEstimate
): CostEstimate {
  const sqlLower = sql.toLowerCase();
  
  // For Snowflake, we estimate credits used
  // Adjust credits based on query characteristics and warehouse size
  let creditMultiplier = 1.0;
  
  // Adjust for warehouse size - Medium warehouse for this estimation
  const warehouseSize = 'Medium'; // Could dynamically determine based on complexity
  let warehouseCreditsPerHour = 2; // Medium size = 2 credits/hour
  
  if (sqlLower.includes('select *')) {
    creditMultiplier *= 1.45;
  }
  
  if (!sqlLower.includes('where')) {
    creditMultiplier *= 1.8;
  }
  
  if (sqlLower.includes('sample(')) {
    creditMultiplier *= 0.4;
  }
  
  if (hasMultipleJoins(sqlLower, 3)) {
    creditMultiplier *= 1.6;
  }
  
  if (sqlLower.includes('cluster by')) {
    creditMultiplier *= 0.75;
  }
  
  // Execution time affects credit usage (convert to hours)
  const executionTimeInSeconds = parseFloat(baseEstimate.executionTime.replace('s', ''));
  const executionTimeInHours = executionTimeInSeconds / 3600;
  
  // Calculate credits based on execution time and warehouse size
  const credits = warehouseCreditsPerHour * executionTimeInHours * creditMultiplier;
  
  // Snowflake charges per credit (approx $2-4 per credit)
  const costPerCredit = 2.5; // Realistic average cost per credit
  const estimatedCost = credits * costPerCredit;
  
  // Estimate data scanned for display
  let dataScannedMB = querySize * 300;
  
  switch (complexity) {
    case 'high':
      dataScannedMB *= 4;
      break;
    case 'medium':
      dataScannedMB *= 2;
      break;
    case 'low':
      dataScannedMB *= 1;
      break;
  }
  
  let dataScanned: string;
  if (dataScannedMB >= 1000) {
    dataScanned = `${(dataScannedMB / 1000).toFixed(2)} GB`;
  } else {
    dataScanned = `${Math.round(dataScannedMB)} MB`;
  }
  
  // Gather recommendations
  const recommendations: string[] = [];
  
  if (sqlLower.includes('select *')) {
    recommendations.push('Select only needed columns to reduce credit usage');
  }
  
  if (!sqlLower.includes('where')) {
    recommendations.push('Add WHERE clauses to filter data and reduce processing time');
  }
  
  if (!sqlLower.includes('sample(') && complexity === 'high') {
    recommendations.push('Use SAMPLE clause for exploratory queries to significantly reduce costs');
  }
  
  if (complexity === 'high' && !sqlLower.includes('cluster by')) {
    recommendations.push('Use clustering on tables to improve filter and join performance');
  }
  
  if (hasMultipleSubqueries(sqlLower)) {
    recommendations.push('Replace nested subqueries with CTEs for better query performance');
  }
  
  recommendations.push(`Consider using ${complexity === 'high' ? 'a larger' : 'a smaller'} warehouse size for this query`);
  
  return {
    ...baseEstimate,
    processingUnits: parseFloat(credits.toFixed(3)),
    estimatedCost: parseFloat(estimatedCost.toFixed(3)),
    dataScanned: dataScanned,
    complexity: complexity,
    recommendations: recommendations
  };
}

/**
 * Estimate Databricks costs
 */
function estimateDatabricksCost(
  sql: string, 
  complexity: 'low' | 'medium' | 'high',
  processingUnits: number,
  querySize: number,
  baseEstimate: CostEstimate
): CostEstimate {
  const sqlLower = sql.toLowerCase();
  
  // For Databricks, we estimate DBU (Databricks Units) usage
  // DBU rate varies by compute type (All-Purpose vs Jobs)
  const computeType = 'All-Purpose'; // Assume interactive query
  const dbuRate = 0.55; // Realistic rate for All-Purpose compute
  
  // Adjust DBUs based on query characteristics
  let dbuMultiplier = 1.0;
  
  if (sqlLower.includes('select *')) {
    dbuMultiplier *= 1.3;
  }
  
  if (!sqlLower.includes('where')) {
    dbuMultiplier *= 1.7;
  }
  
  if (sqlLower.includes('zorder by')) {
    dbuMultiplier *= 0.7;
  }
  
  if (sqlLower.includes('optimize')) {
    dbuMultiplier *= 0.75;
  }
  
  if (sqlLower.includes('delta')) {
    dbuMultiplier *= 0.8;
  }
  
  if (sqlLower.includes('cache')) {
    dbuMultiplier *= 0.6;
  }
  
  // Determine cluster size based on complexity
  let clusterSize = 1; // Small cluster
  
  if (complexity === 'high') {
    clusterSize = 4; // Larger cluster for complex queries
  } else if (complexity === 'medium') {
    clusterSize = 2; // Medium cluster
  }
  
  const dbus = processingUnits * dbuMultiplier * clusterSize;
  
  // Execution time affects DBU usage (convert to hours)
  const executionTimeInSeconds = parseFloat(baseEstimate.executionTime.replace('s', ''));
  const executionTimeInHours = executionTimeInSeconds / 3600;
  
  // Calculate cost based on DBUs, time, and rate
  const estimatedCost = dbus * dbuRate * executionTimeInHours;
  
  // Estimate data scanned for display
  let dataScannedMB = querySize * 250;
  
  switch (complexity) {
    case 'high':
      dataScannedMB *= 3.5;
      break;
    case 'medium':
      dataScannedMB *= 1.8;
      break;
    case 'low':
      dataScannedMB *= 0.9;
      break;
  }
  
  if (sqlLower.includes('delta')) {
    dataScannedMB *= 0.6; // Delta format is more efficient
  }
  
  let dataScanned: string;
  if (dataScannedMB >= 1000) {
    dataScanned = `${(dataScannedMB / 1000).toFixed(2)} GB`;
  } else {
    dataScanned = `${Math.round(dataScannedMB)} MB`;
  }
  
  // Gather recommendations
  const recommendations: string[] = [];
  
  if (sqlLower.includes('select *')) {
    recommendations.push('Select only needed columns to reduce DBU usage and processing time');
  }
  
  if (!sqlLower.includes('where')) {
    recommendations.push('Add filters to reduce the amount of data processed');
  }
  
  if (!sqlLower.includes('delta')) {
    recommendations.push('Use Delta tables for better performance, reliability, and cost efficiency');
  }
  
  if (complexity === 'high' && !sqlLower.includes('zorder by')) {
    recommendations.push('Use ZORDER BY on frequently filtered columns for better data organization');
  }
  
  if (complexity === 'high' && !sqlLower.includes('cache')) {
    recommendations.push('Use CACHE TABLE for frequently accessed data to improve performance');
  }
  
  if (complexity === 'high') {
    recommendations.push('Consider using Photon execution engine for compute-intensive workloads');
  }
  
  return {
    ...baseEstimate,
    processingUnits: parseFloat(dbus.toFixed(3)),
    estimatedCost: parseFloat(estimatedCost.toFixed(3)),
    dataScanned: dataScanned,
    complexity: complexity,
    recommendations: recommendations
  };
}

/**
 * Check if SQL has a subquery
 */
function hasSubquery(sql: string): boolean {
  return sql.includes('select') && sql.includes('(select');
}

/**
 * Check if SQL has multiple subqueries
 */
function hasMultipleSubqueries(sql: string): boolean {
  let count = 0;
  let pos = -1;
  while ((pos = sql.indexOf('(select', pos + 1)) !== -1) {
    count++;
  }
  return count > 1;
}

/**
 * Check if SQL has multiple joins
 */
function hasMultipleJoins(sql: string, threshold: number): boolean {
  const joinRegex = /\bjoin\b/gi;
  const joinMatches = sql.match(joinRegex);
  return joinMatches !== null && joinMatches.length >= threshold;
}

/**
 * Check if SQL has window functions
 */
function hasWindow(sql: string): boolean {
  return sql.includes('over(') || sql.includes('over (') ||
         sql.includes('partition by') || sql.includes('rank()') || sql.includes('row_number()');
}

/**
 * Check if SQL has complex window functions
 */
function hasComplexWindow(sql: string): boolean {
  const complexWindowKeywords = [
    'rank()', 'dense_rank()', 'row_number()', 'ntile(',
    'lead(', 'lag(', 'first_value(', 'last_value(',
    'percent_rank()', 'cume_dist()', 'nth_value('
  ];
  
  return complexWindowKeywords.some(keyword => sql.includes(keyword));
}

/**
 * Check if SQL has aggregation functions
 */
function hasAggregations(sql: string): boolean {
  const aggFunctions = ['count(', 'sum(', 'avg(', 'min(', 'max(', 'group by'];
  return aggFunctions.some(func => sql.includes(func));
}

/**
 * Check if SQL has multiple aggregation functions
 */
function hasManyAggregations(sql: string, threshold: number): boolean {
  const aggFunctions = ['count(', 'sum(', 'avg(', 'min(', 'max('];
  let count = 0;
  
  for (const func of aggFunctions) {
    let pos = -1;
    while ((pos = sql.indexOf(func, pos + 1)) !== -1) {
      count++;
    }
  }
  
  return count >= threshold;
}

/**
 * Check if SQL has CASE statements
 */
function hasCaseStatements(sql: string, threshold: number = 1): boolean {
  let count = 0;
  let pos = -1;
  while ((pos = sql.indexOf('case', pos + 1)) !== -1) {
    count++;
  }
  return count >= threshold;
}

/**
 * Check if SQL has UNION operations
 */
function hasUnion(sql: string): boolean {
  return sql.includes('union all') || sql.includes('union ');
}

export type { CostEstimate };
