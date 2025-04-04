
import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { ColumnNode } from '@/utils/schemaParser';
import { Database } from 'lucide-react';

interface TableNodeProps {
  data: {
    label: string;
    columns: ColumnNode[];
    color: string;
    showColumns: boolean;
    isSource: boolean;
    isTarget: boolean;
  };
  isConnectable: boolean;
}

const TableNodeComponent = ({ data, isConnectable }: TableNodeProps) => {
  const { label, columns, color, showColumns, isSource, isTarget } = data;
  
  // Sort columns: source columns first, then target columns, then alphabetically
  const sortedColumns = [...columns].sort((a, b) => {
    // First prioritize by reference direction
    const aIsSource = a.references.length > 0;
    const aIsTarget = a.referencedBy.length > 0;
    const bIsSource = b.references.length > 0;
    const bIsTarget = b.referencedBy.length > 0;
    
    if (aIsSource && !bIsSource) return -1;
    if (!aIsSource && bIsSource) return 1;
    if (aIsTarget && !bIsTarget) return -1;
    if (!aIsTarget && bIsTarget) return 1;
    
    // If both have same reference type, sort alphabetically
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="border rounded-md overflow-hidden bg-background shadow-sm min-w-[200px] max-w-[250px]">
      {/* Header */}
      <div 
        className="px-3 py-2 font-medium flex items-center text-white"
        style={{ backgroundColor: color }}
      >
        <Database className="h-4 w-4 mr-2" />
        <div className="truncate">{label}</div>
      </div>
      
      {/* Main table handle for table-level lineage */}
      {!isTarget && (
        <Handle
          type="source"
          position={Position.Right}
          id="table-source"
          className="w-2 h-2 rounded-full border-2 border-background bg-blue-500 translate-x-[1px]"
          isConnectable={isConnectable}
        />
      )}
      
      {!isSource && (
        <Handle
          type="target"
          position={Position.Left}
          id="table-target"
          className="w-2 h-2 rounded-full border-2 border-background bg-blue-500 -translate-x-[1px]"
          isConnectable={isConnectable}
        />
      )}

      {/* Columns */}
      {showColumns && sortedColumns.length > 0 && (
        <div className="divide-y max-h-[250px] overflow-auto">
          {sortedColumns.map((column) => {
            const hasReferences = column.references.length > 0;
            const isReferenced = column.referencedBy.length > 0;
            
            return (
              <div 
                key={column.id} 
                className={`px-3 py-1.5 text-xs flex items-center ${(hasReferences || isReferenced) ? 'bg-blue-50 dark:bg-blue-950/30' : ''}`}
              >
                <div className="truncate flex-1 text-foreground">{column.name}</div>
                
                {/* Show column relationship indicators */}
                {(hasReferences || isReferenced) && (
                  <div className="text-xs bg-muted px-1 py-0.5 ml-1 rounded-sm text-foreground">
                    {hasReferences && isReferenced ? '↔' : hasReferences ? '→' : '←'}
                  </div>
                )}
                
                {/* Column handles for column-level lineage */}
                {hasReferences && (
                  <Handle
                    type="source"
                    position={Position.Right}
                    id={column.id}
                    className="w-1.5 h-1.5 rounded-full border border-background bg-indigo-500 translate-x-[1px]"
                    isConnectable={isConnectable}
                  />
                )}
                
                {isReferenced && (
                  <Handle
                    type="target"
                    position={Position.Left}
                    id={column.id}
                    className="w-1.5 h-1.5 rounded-full border border-background bg-indigo-500 -translate-x-[1px]"
                    isConnectable={isConnectable}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
      
      {/* If no columns or not showing columns */}
      {(!showColumns || sortedColumns.length === 0) && (
        <div className="px-3 py-2 text-xs text-muted-foreground italic">
          {sortedColumns.length === 0 ? "No columns detected" : `${sortedColumns.length} columns`}
        </div>
      )}
    </div>
  );
};

export default memo(TableNodeComponent);
