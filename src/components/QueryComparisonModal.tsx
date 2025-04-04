
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Platform, SqlAnalysisResult } from "@/utils/sqlValidator";
import ComparisonItem from "./ComparisonItem";
import QueryDiffViewer from "./QueryDiffViewer";
import { useState } from "react";
import AnalysisReport from "./AnalysisReport";
import { Button } from "@/components/ui/button";

export interface ComparisonQueryItem {
  id: string;
  name: string;
  sql: string;
  platform: Platform;
  result: SqlAnalysisResult;
  timestamp: number;
}

interface QueryComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  comparisonQueries: ComparisonQueryItem[];
  onRemoveQuery: (id: string) => void;
}

const QueryComparisonModal = ({
  isOpen,
  onClose,
  comparisonQueries,
  onRemoveQuery,
}: QueryComparisonModalProps) => {
  const [activeTab, setActiveTab] = useState<string>("queries");
  const [selectedQueries, setSelectedQueries] = useState<string[]>([]);

  const handleQuerySelect = (id: string) => {
    setSelectedQueries(prev => {
      const newSelection = [...prev];
      const index = newSelection.indexOf(id);
      
      if (index >= 0) {
        // Remove if already selected
        newSelection.splice(index, 1);
      } else {
        // Add if not selected (limit to 2)
        if (newSelection.length < 2) {
          newSelection.push(id);
        } else {
          // Replace the first one if already 2 selected
          newSelection.shift();
          newSelection.push(id);
        }
      }
      
      return newSelection;
    });
  };

  const getSelectedQueriesData = () => {
    if (selectedQueries.length !== 2) return null;
    
    const query1 = comparisonQueries.find(q => q.id === selectedQueries[0]);
    const query2 = comparisonQueries.find(q => q.id === selectedQueries[1]);
    
    if (!query1 || !query2) return null;
    
    return { query1, query2 };
  };

  const selectedQueriesData = getSelectedQueriesData();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] w-full h-full flex flex-col">
        <DialogHeader>
          <DialogTitle>Query Comparison</DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList>
            <TabsTrigger value="queries">Queries ({comparisonQueries.length})</TabsTrigger>
            <TabsTrigger 
              value="diff" 
              disabled={selectedQueries.length !== 2}
            >
              Diff Comparison
            </TabsTrigger>
            <TabsTrigger 
              value="analysis" 
              disabled={selectedQueries.length !== 2}
            >
              Analysis Comparison
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="queries" className="flex-1 overflow-hidden">
            <div className="h-full border rounded-md p-4 overflow-auto">
              <div className="mb-4">
                <p className="text-sm text-muted-foreground">Select two queries to compare their differences.</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {comparisonQueries.map((query) => (
                  <div 
                    key={query.id} 
                    className={`border rounded-md overflow-hidden transition-all cursor-pointer h-[300px] ${
                      selectedQueries.includes(query.id) 
                        ? 'ring-2 ring-primary'
                        : 'hover:border-primary/50'
                    }`}
                    onClick={() => handleQuerySelect(query.id)}
                  >
                    <ComparisonItem
                      query={query}
                      onRemove={onRemoveQuery}
                    />
                  </div>
                ))}
              </div>
              
              {comparisonQueries.length < 2 && (
                <div className="flex items-center justify-center h-32 mt-8">
                  <p className="text-muted-foreground">
                    Add at least 2 queries to compare them
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="diff" className="flex-1 overflow-auto">
            {selectedQueriesData ? (
              <QueryDiffViewer
                originalQuery={selectedQueriesData.query1.sql}
                comparedQuery={selectedQueriesData.query2.sql}
                originalTitle={selectedQueriesData.query1.name}
                comparedTitle={selectedQueriesData.query2.name}
              />
            ) : (
              <div className="flex items-center justify-center h-32">
                <p className="text-muted-foreground">
                  Select 2 queries to view their differences
                </p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="analysis" className="flex-1 overflow-auto">
            {selectedQueriesData ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border p-4 rounded-md">
                  <h3 className="text-lg font-medium mb-2">{selectedQueriesData.query1.name}</h3>
                  <AnalysisReport
                    result={selectedQueriesData.query1.result}
                    platform={selectedQueriesData.query1.platform}
                    sql={selectedQueriesData.query1.sql}
                  />
                </div>
                <div className="border p-4 rounded-md">
                  <h3 className="text-lg font-medium mb-2">{selectedQueriesData.query2.name}</h3>
                  <AnalysisReport
                    result={selectedQueriesData.query2.result}
                    platform={selectedQueriesData.query2.platform}
                    sql={selectedQueriesData.query2.sql}
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-32">
                <p className="text-muted-foreground">
                  Select 2 queries to compare their analysis
                </p>
              </div>
            )}
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

export default QueryComparisonModal;
