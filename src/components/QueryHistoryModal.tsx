
import { useState, useEffect } from 'react';
import { getQueryHistory, clearQueryHistory } from '@/utils/reportService';
import { Platform } from '@/utils/sqlValidator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, Search, Trash2, Code } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface QueryHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (sql: string, platform: Platform) => void;
}

const QueryHistoryModal = ({ isOpen, onClose, onSelect }: QueryHistoryModalProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [history, setHistory] = useState<{ sql: string; platform: Platform; timestamp: string }[]>([]);
  const [activeTab, setActiveTab] = useState<Platform | 'all'>('all');
  
  // Load history when modal opens
  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen]);
  
  const loadHistory = () => {
    const historyItems = getQueryHistory();
    setHistory(historyItems);
  };
  
  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear your query history?')) {
      clearQueryHistory();
      loadHistory();
    }
  };
  
  const filteredHistory = history.filter(item => {
    // Filter by search query
    const matchesSearch = !searchQuery || 
      item.sql.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Filter by platform tab
    const matchesPlatform = activeTab === 'all' || item.platform === activeTab;
    
    return matchesSearch && matchesPlatform;
  });
  
  const getQueryPreview = (sql: string, maxLength = 100) => {
    if (sql.length <= maxLength) return sql;
    return sql.substring(0, maxLength) + '...';
  };
  
  const getPlatformColor = (platform: Platform) => {
    switch (platform) {
      case 'bigquery':
        return 'bg-blue-500';
      case 'snowflake':
        return 'bg-sky-500';
      case 'databricks':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[80vw] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <History className="mr-2" size={18} />
            Query History
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex items-center my-4 space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search queries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <Button variant="destructive" size="sm" onClick={handleClearHistory}>
            <Trash2 size={16} className="mr-1" />
            Clear
          </Button>
        </div>
        
        <Tabs defaultValue="all" value={activeTab} onValueChange={(value) => setActiveTab(value as Platform | 'all')}>
          <TabsList className="w-full">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="bigquery">BigQuery</TabsTrigger>
            <TabsTrigger value="snowflake">Snowflake</TabsTrigger>
            <TabsTrigger value="databricks">Databricks</TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab} className="mt-0">
            <ScrollArea className="h-[50vh] rounded-md border p-2">
              {filteredHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <History size={48} className="mb-2 opacity-50" />
                  <p>No query history found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredHistory.map((item, index) => (
                    <div 
                      key={index} 
                      className="p-3 border rounded-md hover:bg-muted cursor-pointer"
                      onClick={() => onSelect(item.sql, item.platform)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <Badge variant="outline" className={`${getPlatformColor(item.platform)} text-white`}>
                          {item.platform}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(item.timestamp), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>
                      <pre className="text-xs bg-muted/50 p-2 rounded overflow-x-auto">
                        <code>{getQueryPreview(item.sql)}</code>
                      </pre>
                      <Button variant="ghost" size="sm" className="mt-2 w-full">
                        <Code size={14} className="mr-1" />
                        Use This Query
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default QueryHistoryModal;
