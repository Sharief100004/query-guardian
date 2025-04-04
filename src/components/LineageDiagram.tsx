import React, { useState, useCallback, useEffect } from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  Panel,
  useNodesState, 
  useEdgesState, 
  Position,
  Node,
  Edge,
  ConnectionLineType,
  MarkerType,
  useReactFlow,
  ReactFlowProvider,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { SchemaGraph, TableNode } from '@/utils/schemaParser';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { AlertCircle, Maximize2, Minimize2 } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

// Custom node types
import TableNodeComponent from './TableNodeComponent';

interface LineageDiagramProps {
  schema: SchemaGraph;
}

const nodeTypes = {
  tableNode: TableNodeComponent,
};

// Color scheme for the nodes by type
const TABLE_COLORS = {
  source: '#8B5CF6', // Purple for source tables
  intermediate: '#3B82F6', // Blue for intermediate tables
  target: '#EC4899', // Pink for target tables
  default: '#6366F1', // Indigo for default
};

// This is the internal component that uses the React Flow hooks
const LineageDiagramContent: React.FC<LineageDiagramProps> = ({ schema }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [showColumnLineage, setShowColumnLineage] = useState(false);
  const [fitView, setFitView] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const reactFlowInstance = useReactFlow();

  // Analyze table relationships to determine table types (source, intermediate, target)
  const analyzeTableTypes = useCallback((tables: TableNode[], relationships: any[]) => {
    // Create map to track reference counts
    const inDegree: Record<string, number> = {};
    const outDegree: Record<string, number> = {};
    
    tables.forEach(table => {
      inDegree[table.id] = 0;
      outDegree[table.id] = 0;
    });
    
    // Count incoming and outgoing references
    relationships.forEach(rel => {
      inDegree[rel.target] = (inDegree[rel.target] || 0) + 1;
      outDegree[rel.source] = (outDegree[rel.source] || 0) + 1;
    });
    
    // Classify tables
    const tableTypes: Record<string, 'source' | 'intermediate' | 'target'> = {};
    
    tables.forEach(table => {
      if (inDegree[table.id] === 0 && outDegree[table.id] > 0) {
        tableTypes[table.id] = 'source';
      } else if (outDegree[table.id] === 0 && inDegree[table.id] > 0) {
        tableTypes[table.id] = 'target';
      } else {
        tableTypes[table.id] = 'intermediate';
      }
    });
    
    return tableTypes;
  }, []);

  // Layout nodes in a proper lineage flow (source -> intermediate -> target)
  const layoutNodesForLineage = useCallback((tables: TableNode[], relationships: any[]) => {
    // Get table types
    const tableTypes = analyzeTableTypes(tables, relationships);
    
    // Create a directed graph representation for topological sorting
    const graph: Record<string, string[]> = {};
    const inDegree: Record<string, number> = {};
    
    // Initialize all tables with zero in-degree
    tables.forEach(table => {
      graph[table.id] = [];
      inDegree[table.id] = 0;
    });
    
    // Build the graph and calculate in-degrees
    relationships.forEach(rel => {
      if (graph[rel.source]) {
        graph[rel.source].push(rel.target);
        inDegree[rel.target] = (inDegree[rel.target] || 0) + 1;
      }
    });
    
    // Use topological sort to determine levels (layers)
    const levels: Record<string, number> = {};
    const queue: string[] = [];
    
    // Start with source tables (in-degree of 0)
    tables.forEach(table => {
      if (inDegree[table.id] === 0) {
        queue.push(table.id);
        levels[table.id] = 0; // Level 0 for source tables
      }
    });
    
    // Process the queue for topological sorting
    while (queue.length > 0) {
      const current = queue.shift()!;
      
      // Process neighbors
      graph[current].forEach(neighbor => {
        inDegree[neighbor]--;
        
        // Update level to be one more than current
        levels[neighbor] = Math.max((levels[neighbor] || 0), levels[current] + 1);
        
        // Add to queue if all prerequisites are processed
        if (inDegree[neighbor] === 0) {
          queue.push(neighbor);
        }
      });
    }
    
    // Handle tables not reached by topological sort (disconnected or cycles)
    tables.forEach(table => {
      if (levels[table.id] === undefined) {
        if (tableTypes[table.id] === 'source') {
          levels[table.id] = 0;
        } else if (tableTypes[table.id] === 'target') {
          const maxLevel = Math.max(...Object.values(levels).filter(l => !isNaN(l)), 0);
          levels[table.id] = maxLevel;
        } else {
          // Place disconnected intermediate tables in the middle
          const maxLevel = Math.max(...Object.values(levels).filter(l => !isNaN(l)), 0);
          levels[table.id] = Math.floor(maxLevel / 2);
        }
      }
    });
    
    // Group nodes by level
    const nodesByLevel: Record<number, string[]> = {};
    Object.entries(levels).forEach(([id, level]) => {
      if (!nodesByLevel[level]) {
        nodesByLevel[level] = [];
      }
      nodesByLevel[level].push(id);
    });
    
    // Position nodes based on their level
    const HORIZONTAL_GAP = 350;  // Increased gap for better visibility
    const VERTICAL_GAP = 180;    // Increased for better spacing
    
    const positions: Record<string, { x: number, y: number }> = {};
    
    // Sort levels in ascending order
    const sortedLevels = Object.keys(nodesByLevel).map(Number).sort((a, b) => a - b);
    
    sortedLevels.forEach(level => {
      const nodeIds = nodesByLevel[level];
      const levelWidth = HORIZONTAL_GAP * level;
      
      // Sort nodes within level by their connection count (more connected ones in center)
      nodeIds.sort((idA, idB) => {
        const connectionsA = relationships.filter(r => 
          r.source === idA || r.target === idA
        ).length;
        
        const connectionsB = relationships.filter(r => 
          r.source === idB || r.target === idB
        ).length;
        
        return connectionsB - connectionsA;
      });
      
      // Calculate vertical positions to center nodes within their level
      nodeIds.forEach((id, index) => {
        const levelHeight = nodeIds.length * VERTICAL_GAP;
        const startY = -levelHeight / 2;
        const y = startY + index * VERTICAL_GAP;
        
        positions[id] = { 
          x: levelWidth,
          y: y
        };
      });
    });
    
    return { positions, tableTypes };
  }, [analyzeTableTypes]);

  // Generate column-level edges
  const generateColumnLevelEdges = useCallback((tables: TableNode[], relationships: any[]) => {
    const columnEdges: Edge[] = [];
    
    // Process each relationship for column-level connections
    relationships.forEach((rel) => {
      const sourceTable = tables.find(t => t.id === rel.source);
      const targetTable = tables.find(t => t.id === rel.target);
      
      if (!sourceTable || !targetTable) return;
      
      // If relationship has specific columns mentioned, use them
      if (rel.sourceColumn && rel.targetColumn) {
        const sourceCol = sourceTable.columns.find(c => c.name === rel.sourceColumn);
        const targetCol = targetTable.columns.find(c => c.name === rel.targetColumn);
        
        if (sourceCol && targetCol) {
          columnEdges.push({
            id: `e-col-explicit-${sourceCol.id}-${targetCol.id}`,
            source: rel.source,
            target: rel.target,
            sourceHandle: sourceCol.id,
            targetHandle: targetCol.id,
            animated: false,
            type: 'smoothstep',
            style: { 
              strokeWidth: 1.5,
              stroke: '#8B5CF6',
              strokeDasharray: '5 5',
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 15,
              height: 15,
              color: '#8B5CF6',
            },
          });
        }
      } 
      // Otherwise, create column relationships based on column references
      else {
        // For each column in source table that has references
        sourceTable.columns.forEach(sourceCol => {
          // Get all column references for this column
          sourceCol.references.forEach(reference => {
            if (reference.tableId === targetTable.id) {
              // Find the target column 
              const targetCol = targetTable.columns.find(c => c.id === reference.columnId);
              
              if (targetCol) {
                columnEdges.push({
                  id: `e-col-inferred-${sourceCol.id}-${targetCol.id}`,
                  source: rel.source,
                  target: rel.target,
                  sourceHandle: sourceCol.id,
                  targetHandle: targetCol.id,
                  animated: false,
                  type: 'smoothstep',
                  style: { 
                    strokeWidth: 1.5,
                    stroke: '#8B5CF6',
                    strokeDasharray: '5 5',
                  },
                  markerEnd: {
                    type: MarkerType.ArrowClosed,
                    width: 15,
                    height: 15,
                    color: '#8B5CF6',
                  },
                });
              }
            }
          });
        });
        
        // If no explicit column references found, try to infer by matching names
        const hasExistingColConnection = columnEdges.some(edge => 
          edge.source === rel.source && edge.target === rel.target
        );
        
        if (!hasExistingColConnection) {
          // Match columns with the same name
          sourceTable.columns.forEach(sourceCol => {
            targetTable.columns.forEach(targetCol => {
              if (sourceCol.name.toLowerCase() === targetCol.name.toLowerCase()) {
                columnEdges.push({
                  id: `e-col-name-match-${sourceCol.id}-${targetCol.id}`,
                  source: rel.source,
                  target: rel.target,
                  sourceHandle: sourceCol.id,
                  targetHandle: targetCol.id,
                  animated: false,
                  type: 'smoothstep',
                  style: { 
                    strokeWidth: 1.5,
                    stroke: '#8B5CF6',
                    strokeDasharray: '5 5',
                  },
                  markerEnd: {
                    type: MarkerType.ArrowClosed,
                    width: 15,
                    height: 15,
                    color: '#8B5CF6',
                  },
                });
              }
            });
          });
        }
      }
    });
    
    return columnEdges;
  }, []);

  // Generate nodes and edges from schema
  useEffect(() => {
    if (!schema) return;

    const schemaNodes: Node[] = [];
    const schemaEdges: Edge[] = [];
    
    // Calculate optimal node positions and get table types
    const { positions, tableTypes } = layoutNodesForLineage(schema.tables, schema.relationships);

    // Create all table nodes
    schema.tables.forEach((table) => {
      const type = tableTypes[table.id] || 'default';
      const position = positions[table.id] || { x: 0, y: 0 };
      const color = TABLE_COLORS[type] || TABLE_COLORS.default;
      
      schemaNodes.push({
        id: table.id,
        type: 'tableNode',
        data: { 
          label: table.name,
          columns: table.columns,
          color: color,
          showColumns: showColumnLineage,
          isSource: type === 'source',
          isTarget: type === 'target'
        },
        position
      });
    });

    // Create table-level relationship edges
    schema.relationships.forEach((relationship, index) => {
      // Table-level edge
      schemaEdges.push({
        id: `e-table-${index}`,
        source: relationship.source,
        target: relationship.target,
        sourceHandle: 'table-source',
        targetHandle: 'table-target',
        animated: true,
        type: 'smoothstep',
        style: { strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
        },
        label: relationship.type,
        labelStyle: { fill: '#888', fontSize: 12 },
        labelBgStyle: { fill: 'rgba(255, 255, 255, 0.75)' },
      });
    });

    // Add column-level edges if enabled
    if (showColumnLineage) {
      const columnEdges = generateColumnLevelEdges(schema.tables, schema.relationships);
      schemaEdges.push(...columnEdges);
    }

    setNodes(schemaNodes);
    setEdges(schemaEdges);
    setFitView(true);
  }, [schema, showColumnLineage, layoutNodesForLineage, generateColumnLevelEdges]);

  // Handle column lineage toggle
  const handleColumnLineageToggle = useCallback(() => {
    setShowColumnLineage(prev => !prev);
  }, []);

  // Toggle fullscreen mode
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  // Fit view when layout changes
  useEffect(() => {
    if (fitView && reactFlowInstance) {
      const timeoutId = setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.2 });
        setFitView(false);
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [fitView, reactFlowInstance]);

  // If there are no nodes to display, show a warning
  if (nodes.length === 0) {
    return (
      <Alert variant="destructive" className="mt-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Could not generate lineage diagram. No tables or relationships were detected.
        </AlertDescription>
      </Alert>
    );
  }

  const diagramContent = (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      fitView={fitView}
      onlyRenderVisibleElements={true}
      minZoom={0.2}
      maxZoom={1.5}
      defaultEdgeOptions={{
        type: 'smoothstep',
        style: { strokeWidth: 2 },
      }}
      connectionLineType={ConnectionLineType.SmoothStep}
      attributionPosition="bottom-right"
      fitViewOptions={{
        padding: 0.2,
      }}
    >
      <Background color="#aaa" gap={16} variant={BackgroundVariant.Dots} />
      <Controls />
      <Panel position="top-left" className="bg-background p-2 rounded-md shadow-sm border">
        <div className="flex items-center space-x-2">
          <Switch 
            id="column-lineage" 
            checked={showColumnLineage}
            onCheckedChange={handleColumnLineageToggle}
          />
          <Label htmlFor="column-lineage">Show Column Lineage</Label>
        </div>
      </Panel>
      <Panel position="top-right" className="bg-background p-2 rounded-md shadow-sm border">
        <Button variant="outline" size="sm" onClick={toggleFullscreen}>
          {isFullscreen ? (
            <><Minimize2 className="mr-1 h-4 w-4" /> Exit Fullscreen</>
          ) : (
            <><Maximize2 className="mr-1 h-4 w-4" /> Fullscreen</>
          )}
        </Button>
      </Panel>
      <Panel position="bottom-left" className="bg-background p-2 rounded-md shadow-sm border">
        <div className="flex flex-col gap-2">
          <div className="text-xs font-medium mb-1">Legend</div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full" style={{backgroundColor: TABLE_COLORS.source}}></div>
            <span className="text-xs">Source Table</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full" style={{backgroundColor: TABLE_COLORS.intermediate}}></div>
            <span className="text-xs">Intermediate Table</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full" style={{backgroundColor: TABLE_COLORS.target}}></div>
            <span className="text-xs">Target Table</span>
          </div>
          <div className="flex items-center space-x-2 mt-1">
            <div className="w-3 h-1 bg-primary rounded-full"></div>
            <span className="text-xs">Table Relationship</span>
          </div>
          {showColumnLineage && (
            <div className="flex items-center space-x-2">
              <div className="w-3 h-1 bg-purple-500 rounded-full" style={{strokeDasharray: '5 5'}}></div>
              <span className="text-xs">Column Relationship</span>
            </div>
          )}
        </div>
      </Panel>
    </ReactFlow>
  );

  return (
    <>
      <div className="w-full h-[600px] border rounded-md bg-slate-900">
        {diagramContent}
      </div>

      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-[95vw] h-[95vh] p-0">
          <DialogTitle className="sr-only">Lineage Diagram Fullscreen</DialogTitle>
          <div className="w-full h-full">
            {diagramContent}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

// This is the wrapper component that provides the ReactFlowProvider
const LineageDiagram: React.FC<LineageDiagramProps> = ({ schema }) => {
  return (
    <ReactFlowProvider>
      <LineageDiagramContent schema={schema} />
    </ReactFlowProvider>
  );
};

export default LineageDiagram;
