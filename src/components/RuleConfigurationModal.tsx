import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Settings, Save } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Platform } from "@/utils/sqlValidator";

interface RuleType {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  severity: 'low' | 'medium' | 'high';
  custom: boolean;
}

interface RuleCategory {
  name: string;
  rules: RuleType[];
}

interface RuleConfigurationModalProps {
  platform: Platform;
  onSaveRules: (rules: Record<string, RuleCategory[]>) => void;
}

const defaultRules: Record<Platform, Record<string, RuleCategory[]>> = {
  bigquery: {
    rules: [
      {
        name: "Best Practices",
        rules: [
          { id: "BP001", name: "Avoid SELECT *", description: "Using SELECT * retrieves all columns, which can impact performance and readability. Explicitly specify only needed columns.", enabled: true, severity: "medium", custom: false },
          { id: "BP002", name: "Schema Qualification", description: "Always qualify table names with project and dataset using backticks (`project.dataset.table`)", enabled: true, severity: "low", custom: false },
          { id: "BP003", name: "Use Standard SQL", description: "Prefer Standard SQL over Legacy SQL for better compatibility and features", enabled: true, severity: "high", custom: false },
          { id: "BP004", name: "Column Naming", description: "Use consistent and descriptive column naming patterns (snake_case preferred)", enabled: true, severity: "low", custom: false },
          { id: "BP005", name: "Explicit JOINs", description: "Always use explicit JOIN syntax instead of implicit joins in WHERE clause", enabled: true, severity: "medium", custom: false },
          { id: "BP006", name: "Table Aliases", description: "Use meaningful table aliases rather than single letters", enabled: true, severity: "low", custom: false },
          { id: "BP007", name: "LIMIT for Development", description: "Use LIMIT during development to reduce data processed and costs", enabled: true, severity: "medium", custom: false },
          { id: "BP008", name: "Comment Complex Logic", description: "Add comments to explain complex logic or business rules in queries", enabled: true, severity: "low", custom: false },
          { id: "BP009", name: "Prefer TIMESTAMP_TRUNC", description: "Use TIMESTAMP_TRUNC instead of DATE_TRUNC for proper timezone handling", enabled: true, severity: "medium", custom: false },
          { id: "BP010", name: "Use IF Instead of CASE", description: "Prefer IF function over CASE WHEN for simple boolean conditions", enabled: true, severity: "low", custom: false },
        ]
      },
      {
        name: "Performance",
        rules: [
          { id: "PERF001", name: "Partition Pruning", description: "Use partition pruning with _PARTITIONTIME or _PARTITIONDATE to reduce data scanned", enabled: true, severity: "high", custom: false },
          { id: "PERF002", name: "Avoid Cartesian Joins", description: "Joins without conditions create Cartesian products that can cause excessive data processing", enabled: true, severity: "high", custom: false },
          { id: "PERF003", name: "Filter Before JOIN", description: "Filter data before joining to reduce the size of the join operation", enabled: true, severity: "medium", custom: false },
          { id: "PERF004", name: "Use Approximate Functions", description: "Use approximate functions like APPROX_COUNT_DISTINCT when precision isn't critical", enabled: true, severity: "medium", custom: false },
          { id: "PERF005", name: "Avoid JavaScript UDFs", description: "JavaScript UDFs are slower than native functions and should be used sparingly", enabled: true, severity: "high", custom: false },
          { id: "PERF006", name: "Minimize Self Joins", description: "Avoid unnecessary self joins which can cause quadratic data growth", enabled: true, severity: "medium", custom: false },
          { id: "PERF007", name: "Use ARRAY_AGG", description: "Use ARRAY_AGG for collecting values instead of multiple group by operations", enabled: true, severity: "medium", custom: false },
          { id: "PERF008", name: "Avoid REGEXP on Large Data", description: "Regular expressions are computationally expensive on large datasets", enabled: true, severity: "medium", custom: false },
          { id: "PERF009", name: "Clustering Keys", description: "Use clustering for frequently filtered columns to improve query performance", enabled: true, severity: "high", custom: false },
          { id: "PERF010", name: "UNNEST Large Arrays", description: "Use WITH OFFSET when unnesting large arrays to maintain positional information", enabled: true, severity: "medium", custom: false },
        ]
      },
      {
        name: "Modularization",
        rules: [
          { id: "MOD001", name: "Use CTEs", description: "Use Common Table Expressions for complex queries to improve readability and maintenance", enabled: true, severity: "medium", custom: false },
          { id: "MOD002", name: "Avoid Nested Subqueries", description: "Excessive nesting makes queries hard to read and debug. Use CTEs instead.", enabled: true, severity: "high", custom: false },
          { id: "MOD003", name: "Create Views", description: "Create views for reusable query logic and to abstract complex data models", enabled: true, severity: "low", custom: false },
          { id: "MOD004", name: "Use Stored Procedures", description: "Implement complex logic in stored procedures for code reuse and consistency", enabled: true, severity: "medium", custom: false },
          { id: "MOD005", name: "Parameterized Queries", description: "Use query parameters for values that change between executions", enabled: true, severity: "high", custom: false },
          { id: "MOD006", name: "Separate Complex Logic", description: "Break complex transformations into multiple CTEs with clear naming", enabled: true, severity: "medium", custom: false },
          { id: "MOD007", name: "Table Functions", description: "Use table functions (TVFs) for reusable table-generating logic", enabled: true, severity: "medium", custom: false },
          { id: "MOD008", name: "Materialized Views", description: "Consider materialized views for frequently accessed query results", enabled: true, severity: "low", custom: false },
        ]
      },
      {
        name: "Cost",
        rules: [
          { id: "COST001", name: "Filter Early", description: "Apply filters early to reduce data processed and costs", enabled: true, severity: "high", custom: false },
          { id: "COST002", name: "LIMIT with ORDER BY", description: "Add LIMIT when using ORDER BY to reduce computation costs", enabled: true, severity: "medium", custom: false },
          { id: "COST003", name: "Avoid SELECT DISTINCT", description: "DISTINCT operations can be expensive - consider alternatives", enabled: true, severity: "medium", custom: false },
          { id: "COST004", name: "Use WHERE instead of HAVING", description: "WHERE filters before aggregation, HAVING filters after - use WHERE when possible", enabled: true, severity: "medium", custom: false },
          { id: "COST005", name: "Prune Partitions", description: "Always include partition filters to reduce bytes processed", enabled: true, severity: "high", custom: false },
          { id: "COST006", name: "Optimize JOINs", description: "Place the largest table first in JOINs to potentially reduce shuffled data", enabled: true, severity: "medium", custom: false },
          { id: "COST007", name: "Avoid Cross Joins", description: "Avoid cross joins (Cartesian products) which process m*n rows", enabled: true, severity: "high", custom: false },
          { id: "COST008", name: "Use Materialized Views", description: "Use materialized views for frequently queried data to reduce computation", enabled: true, severity: "medium", custom: false },
          { id: "COST009", name: "Incremental Processing", description: "Process only new or changed data when possible", enabled: true, severity: "high", custom: false },
          { id: "COST010", name: "Denormalize When Appropriate", description: "For read-heavy workloads, consider denormalization to reduce JOINs", enabled: true, severity: "medium", custom: false },
        ]
      }
    ]
  },
  snowflake: {
    rules: [
      {
        name: "Best Practices",
        rules: [
          { id: "BP001", name: "Schema Qualification", description: "Always qualify table names with database and schema using DATABASE.SCHEMA.TABLE", enabled: true, severity: "medium", custom: false },
          { id: "BP002", name: "Use COPY INTO", description: "Use COPY INTO for bulk data loading instead of INSERT", enabled: true, severity: "high", custom: false },
          { id: "BP003", name: "Use CTEs for Clarity", description: "Common Table Expressions improve code readability and maintainability", enabled: true, severity: "low", custom: false },
          { id: "BP004", name: "Zero-Copy Cloning", description: "Use zero-copy cloning for test environments and data snapshots", enabled: true, severity: "medium", custom: false },
          { id: "BP005", name: "Use Semi-structured Data", description: "Leverage VARIANT, OBJECT, and ARRAY types for semi-structured data", enabled: true, severity: "medium", custom: false },
          { id: "BP006", name: "Time Travel", description: "Use Time Travel for point-in-time recovery and auditing", enabled: true, severity: "medium", custom: false },
          { id: "BP007", name: "Transient Tables", description: "Use transient tables for temporary data to avoid Time Travel storage costs", enabled: true, severity: "medium", custom: false },
          { id: "BP008", name: "Avoid SELECT *", description: "Explicitly specify only the columns you need", enabled: true, severity: "medium", custom: false },
          { id: "BP009", name: "Fail-safe Consideration", description: "Be aware of fail-safe storage costs for critical data", enabled: true, severity: "low", custom: false },
          { id: "BP010", name: "Secure Views", description: "Use secure views to implement row-level security", enabled: true, severity: "high", custom: false },
        ]
      },
      {
        name: "Performance",
        rules: [
          { id: "PERF001", name: "Clustering Keys", description: "Use appropriate clustering keys for large tables to reduce scan costs", enabled: true, severity: "high", custom: false },
          { id: "PERF002", name: "Avoid Massive Joins", description: "Break complex joins into CTEs for better optimizer planning", enabled: true, severity: "high", custom: false },
          { id: "PERF003", name: "Use RESULT_SCAN", description: "Use RESULT_SCAN for immediate query re-use to avoid recomputation", enabled: true, severity: "medium", custom: false },
          { id: "PERF004", name: "Cache Results", description: "Enable query result caching for repeated queries", enabled: true, severity: "medium", custom: false },
          { id: "PERF005", name: "Micro-partitions", description: "Ensure data is well-distributed across micro-partitions", enabled: true, severity: "high", custom: false },
          { id: "PERF006", name: "Avoid UDFs in Filters", description: "Avoid user-defined functions in filter predicates", enabled: true, severity: "medium", custom: false },
          { id: "PERF007", name: "Use FLATTEN", description: "Use FLATTEN for efficient array and object traversal", enabled: true, severity: "medium", custom: false },
          { id: "PERF008", name: "Optimize File Formats", description: "Use appropriate file formats (Parquet, ORC) for external tables", enabled: true, severity: "medium", custom: false },
          { id: "PERF009", name: "Materialized Views", description: "Use materialized views for complex, frequently accessed query results", enabled: true, severity: "high", custom: false },
          { id: "PERF010", name: "Avoid JavaScript UDFs", description: "JavaScript UDFs are slower than SQL UDFs - use when absolutely necessary", enabled: true, severity: "high", custom: false },
        ]
      },
      {
        name: "Modularization",
        rules: [
          { id: "MOD001", name: "Use Stored Procedures", description: "Encapsulate complex logic in stored procedures for reusability", enabled: true, severity: "medium", custom: false },
          { id: "MOD002", name: "Create UDFs", description: "Create User-Defined Functions for reusable calculations", enabled: true, severity: "medium", custom: false },
          { id: "MOD003", name: "Use Temporary Tables", description: "Use temporary tables for complex intermediate results", enabled: true, severity: "low", custom: false },
          { id: "MOD004", name: "Task Orchestration", description: "Use Snowflake Tasks for workflow orchestration", enabled: true, severity: "medium", custom: false },
          { id: "MOD005", name: "Stage Management", description: "Use named external stages for file operations", enabled: true, severity: "medium", custom: false },
          { id: "MOD006", name: "Dynamic SQL", description: "Use dynamic SQL in stored procedures for flexible execution", enabled: true, severity: "medium", custom: false },
          { id: "MOD007", name: "Schema Evolution", description: "Design for schema evolution using VARIANT for flexible fields", enabled: true, severity: "high", custom: false },
          { id: "MOD008", name: "Complex Datatypes", description: "Use ARRAY and OBJECT types to model hierarchical data", enabled: true, severity: "medium", custom: false },
          { id: "MOD009", name: "Stream Processing", description: "Use Streams for incremental data processing pipelines", enabled: true, severity: "high", custom: false },
          { id: "MOD010", name: "Secure Functions", description: "Use secure functions to encapsulate sensitive business logic", enabled: true, severity: "high", custom: false },
        ]
      },
      {
        name: "Cost",
        rules: [
          { id: "COST001", name: "Use SAMPLE Clause", description: "Use SAMPLE for exploratory queries on large tables", enabled: true, severity: "medium", custom: false },
          { id: "COST002", name: "Warehouse Sizing", description: "Match warehouse size to query complexity and data volume", enabled: true, severity: "high", custom: false },
          { id: "COST003", name: "Auto-Suspend", description: "Use auto-suspend for warehouses to minimize idle costs", enabled: true, severity: "high", custom: false },
          { id: "COST004", name: "Resource Monitors", description: "Set up resource monitors to limit unexpected costs", enabled: true, severity: "high", custom: false },
          { id: "COST005", name: "Query Tags", description: "Use query tags to track and attribute query costs", enabled: true, severity: "medium", custom: false },
          { id: "COST006", name: "Limit Cloning", description: "Be strategic with table cloning to manage storage costs", enabled: true, severity: "medium", custom: false },
          { id: "COST007", name: "Partition Pruning", description: "Structure queries to benefit from partition pruning", enabled: true, severity: "high", custom: false },
          { id: "COST008", name: "Multi-cluster Warehouses", description: "Use multi-cluster warehouses for concurrent workloads", enabled: true, severity: "medium", custom: false },
          { id: "COST009", name: "Transient Objects", description: "Use transient objects for test/dev environments", enabled: true, severity: "medium", custom: false },
          { id: "COST010", name: "Compression", description: "Enable compression for tables with repetitive data", enabled: true, severity: "medium", custom: false },
        ]
      }
    ]
  },
  databricks: {
    rules: [
      {
        name: "Best Practices",
        rules: [
          { id: "BP001", name: "Use Delta Lake", description: "Use Delta Lake format for ACID transactions and time travel", enabled: true, severity: "high", custom: false },
          { id: "BP002", name: "Z-Ordering", description: "Use Z-ORDER BY for multi-dimensional clustering of data", enabled: true, severity: "medium", custom: false },
          { id: "BP003", name: "Schema Evolution", description: "Use schema evolution features for backwards compatibility", enabled: true, severity: "medium", custom: false },
          { id: "BP004", name: "Delta Vacuum", description: "Use VACUUM carefully to maintain time travel capabilities", enabled: true, severity: "medium", custom: false },
          { id: "BP005", name: "Optimize Write", description: "Use OPTIMIZE WRITE to generate fewer, larger files", enabled: true, severity: "medium", custom: false },
          { id: "BP006", name: "Data Skipping", description: "Leverage Delta's data skipping capabilities for better performance", enabled: true, severity: "high", custom: false },
          { id: "BP007", name: "Avoid SELECT *", description: "Explicitly specify only the columns you need", enabled: true, severity: "medium", custom: false },
          { id: "BP008", name: "Table Properties", description: "Set appropriate table properties for optimization", enabled: true, severity: "medium", custom: false },
          { id: "BP009", name: "Use Constraints", description: "Define constraints to enforce data quality", enabled: true, severity: "medium", custom: false },
          { id: "BP010", name: "Partition Strategy", description: "Choose appropriate partition columns (date-based often best)", enabled: true, severity: "high", custom: false },
        ]
      },
      {
        name: "Performance",
        rules: [
          { id: "PERF001", name: "Use Cache Hints", description: "Use CACHE, UNCACHE for frequently used tables", enabled: true, severity: "high", custom: false },
          { id: "PERF002", name: "Partition Pruning", description: "Ensure queries leverage partition pruning", enabled: true, severity: "high", custom: false },
          { id: "PERF003", name: "Broadcast Joins", description: "Use broadcast joins for small tables with /*+ BROADCAST(table) */ hint", enabled: true, severity: "medium", custom: false },
          { id: "PERF004", name: "Adaptive Query Execution", description: "Enable adaptive query execution for dynamic optimization", enabled: true, severity: "medium", custom: false },
          { id: "PERF005", name: "Autotune Join Strategy", description: "Let Databricks choose optimal join strategies when possible", enabled: true, severity: "medium", custom: false },
          { id: "PERF006", name: "Predicate Pushdown", description: "Structure queries to leverage predicate pushdown", enabled: true, severity: "high", custom: false },
          { id: "PERF007", name: "Optimize File Sizes", description: "Run OPTIMIZE to improve read performance", enabled: true, severity: "high", custom: false },
          { id: "PERF008", name: "Photon Acceleration", description: "Use Photon-compatible operations for vectorized execution", enabled: true, severity: "medium", custom: false },
          { id: "PERF009", name: "Avoid UDFs in Filters", description: "Avoid using UDFs in filter predicates", enabled: true, severity: "medium", custom: false },
          { id: "PERF010", name: "Manage Shuffles", description: "Monitor and minimize large shuffles in your queries", enabled: true, severity: "high", custom: false },
        ]
      },
      {
        name: "Modularization",
        rules: [
          { id: "MOD001", name: "Use Notebooks", description: "Split complex workflows into multiple notebooks for maintainability", enabled: true, severity: "medium", custom: false },
          { id: "MOD002", name: "Create Functions", description: "Create reusable functions for common operations", enabled: true, severity: "medium", custom: false },
          { id: "MOD003", name: "Use Job Clusters", description: "Use job clusters for specific workloads", enabled: true, severity: "low", custom: false },
          { id: "MOD004", name: "Delta Live Tables", description: "Use Delta Live Tables for data pipelines", enabled: true, severity: "high", custom: false },
          { id: "MOD005", name: "Implement Unity Catalog", description: "Use Unity Catalog for centralized governance", enabled: true, severity: "medium", custom: false },
          { id: "MOD006", name: "Use CTEs", description: "Use Common Table Expressions for complex queries", enabled: true, severity: "medium", custom: false },
          { id: "MOD007", name: "Create Views", description: "Create views for reusable query logic", enabled: true, severity: "medium", custom: false },
          { id: "MOD008", name: "Notebook Parameters", description: "Parameterize notebooks for reusability", enabled: true, severity: "medium", custom: false },
          { id: "MOD009", name: "Common Libraries", description: "Create shared libraries for common functions", enabled: true, severity: "medium", custom: false },
          { id: "MOD010", name: "MLflow Integration", description: "Use MLflow for model tracking and deployment", enabled: true, severity: "medium", custom: false },
        ]
      },
      {
        name: "Cost",
        rules: [
          { id: "COST001", name: "Use SAMPLE Clause", description: "Use SAMPLE for exploratory queries on large tables", enabled: true, severity: "medium", custom: false },
          { id: "COST002", name: "Warehouse Sizing", description: "Match warehouse size to query complexity and data volume", enabled: true, severity: "high", custom: false },
          { id: "COST003", name: "Auto-Suspend", description: "Use auto-suspend for warehouses to minimize idle costs", enabled: true, severity: "high", custom: false },
          { id: "COST004", name: "Resource Monitors", description: "Set up resource monitors to limit unexpected costs", enabled: true, severity: "high", custom: false },
          { id: "COST005", name: "Query Tags", description: "Use query tags to track and attribute query costs", enabled: true, severity: "medium", custom: false },
          { id: "COST006", name: "Limit Cloning", description: "Be strategic with table cloning to manage storage costs", enabled: true, severity: "medium", custom: false },
          { id: "COST007", name: "Partition Pruning", description: "Structure queries to benefit from partition pruning", enabled: true, severity: "high", custom: false },
          { id: "COST008", name: "Multi-cluster Warehouses", description: "Use multi-cluster warehouses for concurrent workloads", enabled: true, severity: "medium", custom: false },
          { id: "COST009", name: "Transient Objects", description: "Use transient objects for test/dev environments", enabled: true, severity: "medium", custom: false },
          { id: "COST010", name: "Compression", description: "Enable compression for tables with repetitive data", enabled: true, severity: "medium", custom: false },
        ]
      }
    ]
  }
};

const RuleConfigurationModal = ({ platform, onSaveRules }: RuleConfigurationModalProps) => {
  const [rules, setRules] = useState<Record<string, RuleCategory[]>>(
    JSON.parse(localStorage.getItem(`${platform}Rules`) || 'null') || 
    defaultRules[platform]
  );
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleDescription, setNewRuleDescription] = useState('');
  const [newRuleSeverity, setNewRuleSeverity] = useState<'low' | 'medium' | 'high'>('medium');
  const [newRuleCategory, setNewRuleCategory] = useState('Best Practices');

  const handleRuleToggle = (categoryIndex: number, ruleIndex: number) => {
    const updatedRules = { ...rules };
    updatedRules.rules[categoryIndex].rules[ruleIndex].enabled = 
      !updatedRules.rules[categoryIndex].rules[ruleIndex].enabled;
    setRules(updatedRules);
  };

  const handleAddRule = () => {
    if (!newRuleName.trim()) {
      toast.error("Rule name is required");
      return;
    }

    const updatedRules = { ...rules };
    const categoryIndex = updatedRules.rules.findIndex(category => category.name === newRuleCategory);
    
    if (categoryIndex === -1) {
      toast.error("Category not found");
      return;
    }

    const newRule: RuleType = {
      id: `CUSTOM-${Date.now()}`,
      name: newRuleName,
      description: newRuleDescription || "Custom rule",
      enabled: true,
      severity: newRuleSeverity,
      custom: true
    };

    updatedRules.rules[categoryIndex].rules.push(newRule);
    setRules(updatedRules);
    
    // Reset form
    setNewRuleName('');
    setNewRuleDescription('');
    setNewRuleSeverity('medium');
    
    toast.success("Custom rule added");
  };

  const handleSave = () => {
    localStorage.setItem(`${platform}Rules`, JSON.stringify(rules));
    onSaveRules(rules);
    toast.success("Rule configuration saved");
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="ml-2">
          <Settings size={14} className="mr-1" />
          <span>Configure Rules</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>SQL Rule Configuration</DialogTitle>
          <DialogDescription>
            Configure analysis rules for {platform === 'bigquery' ? 'Google BigQuery' : platform === 'snowflake' ? 'Snowflake' : 'Databricks'}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="rules">
          <TabsList className="mb-4">
            <TabsTrigger value="rules">Existing Rules</TabsTrigger>
            <TabsTrigger value="custom">Add Custom Rule</TabsTrigger>
          </TabsList>

          <TabsContent value="rules" className="space-y-4">
            {rules.rules.map((category, categoryIndex) => (
              <div key={category.name} className="space-y-3">
                <h3 className="font-semibold text-lg">{category.name}</h3>
                <div className="space-y-3">
                  {category.rules.map((rule, ruleIndex) => (
                    <div key={rule.id} className="flex items-start justify-between p-3 border rounded-md">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{rule.name}</h4>
                          {rule.custom && (
                            <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                              Custom
                            </span>
                          )}
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            rule.severity === 'high' ? 'bg-red-100 text-red-800' : 
                            rule.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' : 
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {rule.severity}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{rule.description}</p>
                      </div>
                      <Switch 
                        checked={rule.enabled}
                        onCheckedChange={() => handleRuleToggle(categoryIndex, ruleIndex)}
                      />
                    </div>
                  ))}
                </div>
                <Separator />
              </div>
            ))}
          </TabsContent>

          <TabsContent value="custom" className="space-y-4">
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="rule-name">Rule Name</Label>
                  <Input 
                    id="rule-name" 
                    value={newRuleName}
                    onChange={(e) => setNewRuleName(e.target.value)}
                    placeholder="E.g., Use Explicit JOIN Conditions"
                  />
                </div>
                <div>
                  <Label htmlFor="rule-category">Category</Label>
                  <select 
                    id="rule-category"
                    className="w-full p-2 rounded-md border border-input bg-background"
                    value={newRuleCategory}
                    onChange={(e) => setNewRuleCategory(e.target.value)}
                  >
                    {rules.rules.map(category => (
                      <option key={category.name} value={category.name}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="rule-description">Description</Label>
                <Textarea 
                  id="rule-description"
                  value={newRuleDescription}
                  onChange={(e) => setNewRuleDescription(e.target.value)}
                  placeholder="Describe what this rule checks for and why it's important"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="rule-severity">Severity</Label>
                <div className="flex space-x-4 mt-2">
                  <div className="flex items-center space-x-2">
                    <input 
                      type="radio" 
                      id="severity-low" 
                      name="severity"
                      checked={newRuleSeverity === 'low'}
                      onChange={() => setNewRuleSeverity('low')}
                    />
                    <Label htmlFor="severity-low" className="text-blue-500">Low</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="radio" 
                      id="severity-medium" 
                      name="severity"
                      checked={newRuleSeverity === 'medium'}
                      onChange={() => setNewRuleSeverity('medium')}
                    />
                    <Label htmlFor="severity-medium" className="text-yellow-500">Medium</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="radio" 
                      id="severity-high" 
                      name="severity"
                      checked={newRuleSeverity === 'high'}
                      onChange={() => setNewRuleSeverity('high')}
                    />
                    <Label htmlFor="severity-high" className="text-red-500">High</Label>
                  </div>
                </div>
              </div>

              <Button onClick={handleAddRule}>Add Custom Rule</Button>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end mt-4">
          <Button onClick={handleSave}>
            <Save size={16} className="mr-2" />
            Save Configuration
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RuleConfigurationModal;
