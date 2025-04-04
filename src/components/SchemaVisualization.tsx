
import React, { useEffect, useState } from 'react';
import { Platform } from "@/utils/sqlValidator";
import { parseSchema, SchemaGraph, TableNode } from '@/utils/schemaParser';
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRightLeft, Database, Table, GitGraph } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LineageDiagram from './LineageDiagram';

interface SchemaVisualizationProps {
  sql: string;
  platform: Platform;
}

const SchemaVisualization: React.FC<SchemaVisualizationProps> = ({ sql, platform }) => {
  const [schema, setSchema] = useState<SchemaGraph | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sql.trim()) {
      setError("No SQL query to analyze");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Simulate async operation
      setTimeout(() => {
        const schemaData = parseSchema(sql, platform);
        setSchema(schemaData);
        setIsLoading(false);
      }, 500);
    } catch (err) {
      console.error("Error parsing schema:", err);
      setError("Failed to parse schema from SQL");
      setIsLoading(false);
    }
  }, [sql, platform]);

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center">
          <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Schema Visualization Error</h3>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!schema || schema.tables.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center">
          <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Schema Detected</h3>
          <p className="text-muted-foreground">
            We couldn't detect any tables or relationships in your SQL query.
            Try adding more explicit table references or JOIN conditions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Schema Visualization</h3>
          <p className="text-sm text-muted-foreground">
            Detected {schema.tables.length} tables and {schema.relationships.length} relationships
          </p>
        </div>
      </div>

      <Tabs defaultValue="lineage" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="tables">
            <Table className="h-4 w-4 mr-2" />
            <span>Tables</span>
          </TabsTrigger>
          <TabsTrigger value="lineage">
            <GitGraph className="h-4 w-4 mr-2" />
            <span>Lineage Diagram</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tables" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {schema.tables.map((table) => (
              <TableCard key={table.id} table={table} />
            ))}
          </div>

          {schema.relationships.length > 0 && (
            <div className="mt-6">
              <h4 className="text-md font-semibold mb-2">Relationships</h4>
              <div className="space-y-2">
                {schema.relationships.map((rel, index) => (
                  <div 
                    key={`${rel.source}-${rel.target}-${index}`}
                    className="flex items-center p-3 border rounded-md bg-muted/30"
                  >
                    <div className="flex-1 font-medium">{rel.source}</div>
                    <div className="mx-2 flex items-center">
                      <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs ml-1 text-muted-foreground">{rel.type}</span>
                    </div>
                    <div className="flex-1 text-right font-medium">{rel.target}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="lineage">
          <LineageDiagram schema={schema} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

const TableCard: React.FC<{ table: TableNode }> = ({ table }) => {
  return (
    <Card className="overflow-hidden">
      <div className="bg-primary/10 px-4 py-2 flex items-center">
        <Table className="h-4 w-4 mr-2 text-primary" />
        <h4 className="font-medium">{table.name}</h4>
      </div>
      <CardContent className="p-0">
        <div className="divide-y">
          {table.columns.map((column) => (
            <div 
              key={column.id} 
              className="px-4 py-2 text-sm flex justify-between"
            >
              <span>{column.name}</span>
              {(column.references.length > 0 || column.referencedBy.length > 0) && (
                <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                  {column.references.length > 0 ? "→" : ""}
                  {column.referencedBy.length > 0 ? "←" : ""}
                </span>
              )}
            </div>
          ))}
          {table.columns.length === 0 && (
            <div className="px-4 py-2 text-sm text-muted-foreground italic">
              No columns detected
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SchemaVisualization;
