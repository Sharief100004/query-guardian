
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Platform } from '@/utils/sqlValidator';
import { Book, Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface QueryTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  platform: Platform;
  onSelect: (template: string) => void;
}

// Query templates by category and platform
const queryTemplates: Record<string, Record<Platform, string[]>> = {
  'Data Exploration': {
    'bigquery': [
      `-- BigQuery: Basic Table Exploration
SELECT
  column_name,
  data_type,
  is_nullable
FROM 
  \`project_id\`.\`dataset_id\`.INFORMATION_SCHEMA.COLUMNS
WHERE 
  table_name = 'your_table_name'
ORDER BY 
  ordinal_position`,
      
      `-- BigQuery: Sample Data Preview
SELECT * 
FROM \`project_id\`.\`dataset_id\`.\`table_name\`
LIMIT 100`,
    ],
    'snowflake': [
      `-- Snowflake: Basic Table Exploration
SELECT
  column_name,
  data_type,
  is_nullable
FROM 
  information_schema.columns
WHERE 
  table_name = 'YOUR_TABLE_NAME'
  AND table_schema = 'YOUR_SCHEMA'
ORDER BY 
  ordinal_position`,
      
      `-- Snowflake: Sample Data Preview
SELECT * 
FROM database_name.schema_name.table_name
LIMIT 100`,
    ],
    'databricks': [
      `-- Databricks: Basic Table Exploration
DESCRIBE TABLE database_name.table_name`,
      
      `-- Databricks: Sample Data Preview
SELECT * 
FROM database_name.table_name
LIMIT 100`,
    ],
  },
  'Aggregations': {
    'bigquery': [
      `-- BigQuery: Basic Aggregation
SELECT
  dimension_column,
  COUNT(*) as count,
  SUM(metric_column) as total,
  AVG(metric_column) as average,
  MIN(metric_column) as minimum,
  MAX(metric_column) as maximum
FROM
  \`project_id\`.\`dataset_id\`.\`table_name\`
WHERE
  date_column >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
GROUP BY
  dimension_column
ORDER BY
  count DESC
LIMIT 100`,
    ],
    'snowflake': [
      `-- Snowflake: Basic Aggregation
SELECT
  dimension_column,
  COUNT(*) as count,
  SUM(metric_column) as total,
  AVG(metric_column) as average,
  MIN(metric_column) as minimum,
  MAX(metric_column) as maximum
FROM
  database_name.schema_name.table_name
WHERE
  date_column >= DATEADD(day, -30, CURRENT_DATE())
GROUP BY
  dimension_column
ORDER BY
  count DESC
LIMIT 100`,
    ],
    'databricks': [
      `-- Databricks: Basic Aggregation
SELECT
  dimension_column,
  COUNT(*) as count,
  SUM(metric_column) as total,
  AVG(metric_column) as average,
  MIN(metric_column) as minimum,
  MAX(metric_column) as maximum
FROM
  database_name.table_name
WHERE
  date_column >= DATE_SUB(CURRENT_DATE(), 30)
GROUP BY
  dimension_column
ORDER BY
  count DESC
LIMIT 100`,
    ],
  },
  'Window Functions': {
    'bigquery': [
      `-- BigQuery: Window Functions
SELECT
  dimension_column,
  date_column,
  metric_column,
  SUM(metric_column) OVER(PARTITION BY dimension_column ORDER BY date_column) as running_total,
  AVG(metric_column) OVER(PARTITION BY dimension_column ORDER BY date_column ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) as moving_average,
  RANK() OVER(PARTITION BY dimension_column ORDER BY metric_column DESC) as metric_rank
FROM
  \`project_id\`.\`dataset_id\`.\`table_name\`
WHERE
  date_column >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
ORDER BY
  dimension_column,
  date_column`,
    ],
    'snowflake': [
      `-- Snowflake: Window Functions
SELECT
  dimension_column,
  date_column,
  metric_column,
  SUM(metric_column) OVER(PARTITION BY dimension_column ORDER BY date_column) as running_total,
  AVG(metric_column) OVER(PARTITION BY dimension_column ORDER BY date_column ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) as moving_average,
  RANK() OVER(PARTITION BY dimension_column ORDER BY metric_column DESC) as metric_rank
FROM
  database_name.schema_name.table_name
WHERE
  date_column >= DATEADD(day, -30, CURRENT_DATE())
ORDER BY
  dimension_column,
  date_column`,
    ],
    'databricks': [
      `-- Databricks: Window Functions
SELECT
  dimension_column,
  date_column,
  metric_column,
  SUM(metric_column) OVER(PARTITION BY dimension_column ORDER BY date_column) as running_total,
  AVG(metric_column) OVER(PARTITION BY dimension_column ORDER BY date_column ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) as moving_average,
  RANK() OVER(PARTITION BY dimension_column ORDER BY metric_column DESC) as metric_rank
FROM
  database_name.table_name
WHERE
  date_column >= DATE_SUB(CURRENT_DATE(), 30)
ORDER BY
  dimension_column,
  date_column`,
    ],
  },
  'CTEs & Subqueries': {
    'bigquery': [
      `-- BigQuery: Common Table Expressions (CTE)
WITH user_metrics AS (
  SELECT
    user_id,
    COUNT(DISTINCT session_id) as session_count,
    SUM(page_views) as total_page_views,
    MIN(DATE(timestamp)) as first_visit_date,
    MAX(DATE(timestamp)) as last_visit_date
  FROM
    \`project_id\`.\`dataset_id\`.\`user_events\`
  WHERE
    DATE(timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)
  GROUP BY
    user_id
),
user_segments AS (
  SELECT
    user_id,
    CASE
      WHEN session_count >= 10 THEN 'high_engagement'
      WHEN session_count >= 5 THEN 'medium_engagement'
      ELSE 'low_engagement'
    END as engagement_segment,
    DATE_DIFF(last_visit_date, first_visit_date, DAY) as days_active
  FROM
    user_metrics
)
SELECT
  engagement_segment,
  COUNT(*) as user_count,
  AVG(days_active) as avg_days_active,
  AVG(total_page_views) as avg_page_views
FROM
  user_segments
JOIN
  user_metrics USING (user_id)
GROUP BY
  engagement_segment
ORDER BY
  user_count DESC`,
    ],
    'snowflake': [
      `-- Snowflake: Common Table Expressions (CTE)
WITH user_metrics AS (
  SELECT
    user_id,
    COUNT(DISTINCT session_id) as session_count,
    SUM(page_views) as total_page_views,
    MIN(DATE(timestamp)) as first_visit_date,
    MAX(DATE(timestamp)) as last_visit_date
  FROM
    database_name.schema_name.user_events
  WHERE
    DATE(timestamp) >= DATEADD(day, -90, CURRENT_DATE())
  GROUP BY
    user_id
),
user_segments AS (
  SELECT
    user_id,
    CASE
      WHEN session_count >= 10 THEN 'high_engagement'
      WHEN session_count >= 5 THEN 'medium_engagement'
      ELSE 'low_engagement'
    END as engagement_segment,
    DATEDIFF(day, first_visit_date, last_visit_date) as days_active
  FROM
    user_metrics
)
SELECT
  engagement_segment,
  COUNT(*) as user_count,
  AVG(days_active) as avg_days_active,
  AVG(total_page_views) as avg_page_views
FROM
  user_segments
JOIN
  user_metrics USING (user_id)
GROUP BY
  engagement_segment
ORDER BY
  user_count DESC`,
    ],
    'databricks': [
      `-- Databricks: Common Table Expressions (CTE)
WITH user_metrics AS (
  SELECT
    user_id,
    COUNT(DISTINCT session_id) as session_count,
    SUM(page_views) as total_page_views,
    MIN(DATE(timestamp)) as first_visit_date,
    MAX(DATE(timestamp)) as last_visit_date
  FROM
    database_name.user_events
  WHERE
    DATE(timestamp) >= DATE_SUB(CURRENT_DATE(), 90)
  GROUP BY
    user_id
),
user_segments AS (
  SELECT
    user_id,
    CASE
      WHEN session_count >= 10 THEN 'high_engagement'
      WHEN session_count >= 5 THEN 'medium_engagement'
      ELSE 'low_engagement'
    END as engagement_segment,
    DATEDIFF(last_visit_date, first_visit_date) as days_active
  FROM
    user_metrics
)
SELECT
  engagement_segment,
  COUNT(*) as user_count,
  AVG(days_active) as avg_days_active,
  AVG(total_page_views) as avg_page_views
FROM
  user_segments
JOIN
  user_metrics USING (user_id)
GROUP BY
  engagement_segment
ORDER BY
  user_count DESC`,
    ],
  },
};

const QueryTemplatesModal = ({ isOpen, onClose, platform, onSelect }: QueryTemplatesModalProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('Data Exploration');
  
  // Get unique categories from the templates object
  const categories = Object.keys(queryTemplates);
  
  // Filter templates based on search query and active category
  const getFilteredTemplates = () => {
    const categoryTemplates = queryTemplates[activeCategory]?.[platform] || [];
    
    if (!searchQuery) {
      return categoryTemplates;
    }
    
    return categoryTemplates.filter(template => 
      template.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };
  
  const filteredTemplates = getFilteredTemplates();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[80vw] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Book className="mr-2" size={18} />
            SQL Query Templates
          </DialogTitle>
        </DialogHeader>
        
        <div className="relative my-4">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        
        <Tabs 
          defaultValue="Data Exploration" 
          value={activeCategory}
          onValueChange={setActiveCategory}
        >
          <TabsList className="w-full">
            {categories.map(category => (
              <TabsTrigger key={category} value={category}>
                {category}
              </TabsTrigger>
            ))}
          </TabsList>
          
          <TabsContent value={activeCategory} className="mt-0">
            <ScrollArea className="h-[50vh] rounded-md border p-4">
              {filteredTemplates.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Book size={48} className="mb-2 opacity-50" />
                  <p>No templates found for this category and platform</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredTemplates.map((template, index) => {
                    // Extract a title from the first comment line
                    const titleMatch = template.match(/--\s*(.+?):/);
                    const title = titleMatch ? titleMatch[1] : `Template ${index + 1}`;
                    
                    return (
                      <Card key={index} className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <CardHeader className="p-4 pb-2">
                          <CardTitle className="text-sm">{title}</CardTitle>
                          <CardDescription className="text-xs">
                            {platform} template
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                          <pre className="text-xs bg-card p-2 rounded-md h-20 overflow-y-auto">
                            <code>{template.substring(0, 200)}...</code>
                          </pre>
                          <Button 
                            className="w-full mt-2" 
                            size="sm"
                            onClick={() => onSelect(template)}
                          >
                            Use Template
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-end mt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QueryTemplatesModal;
