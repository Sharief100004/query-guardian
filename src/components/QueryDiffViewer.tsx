
import React, { useRef, useEffect } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Diff, AlertTriangle } from 'lucide-react';

interface QueryDiffViewerProps {
  originalQuery: string;
  comparedQuery: string;
  originalTitle: string;
  comparedTitle: string;
  errors?: Array<{
    message: string;
    line?: number;
    suggestion: string;
    severity?: string;
  }>;
}

const QueryDiffViewer: React.FC<QueryDiffViewerProps> = ({ 
  originalQuery, 
  comparedQuery,
  originalTitle,
  comparedTitle,
  errors = []
}) => {
  // Refs for synchronized scrolling
  const leftScrollRef = useRef<HTMLDivElement>(null);
  const rightScrollRef = useRef<HTMLDivElement>(null);
  
  // Split queries into lines
  const originalLines = originalQuery.split('\n');
  const comparedLines = comparedQuery.split('\n');
  
  // Set up synchronized scrolling
  useEffect(() => {
    const leftScrollElement = leftScrollRef.current;
    const rightScrollElement = rightScrollRef.current;
    
    if (!leftScrollElement || !rightScrollElement) return;
    
    let isLeftScrolling = false;
    let isRightScrolling = false;
    
    const handleLeftScroll = () => {
      if (!isRightScrolling) {
        isLeftScrolling = true;
        rightScrollElement.scrollTop = leftScrollElement.scrollTop;
        rightScrollElement.scrollLeft = leftScrollElement.scrollLeft;
        setTimeout(() => {
          isLeftScrolling = false;
        }, 50);
      }
    };
    
    const handleRightScroll = () => {
      if (!isLeftScrolling) {
        isRightScrolling = true;
        leftScrollElement.scrollTop = rightScrollElement.scrollTop;
        leftScrollElement.scrollLeft = rightScrollElement.scrollLeft;
        setTimeout(() => {
          isRightScrolling = false;
        }, 50);
      }
    };
    
    leftScrollElement.addEventListener('scroll', handleLeftScroll);
    rightScrollElement.addEventListener('scroll', handleRightScroll);
    
    return () => {
      leftScrollElement.removeEventListener('scroll', handleLeftScroll);
      rightScrollElement.removeEventListener('scroll', handleRightScroll);
    };
  }, []);
  
  // Enhanced diff algorithm to find differences at the word level
  const getDiffLines = () => {
    const maxLines = Math.max(originalLines.length, comparedLines.length);
    const diffResult = [];
    
    for (let i = 0; i < maxLines; i++) {
      const originalLine = i < originalLines.length ? originalLines[i] : '';
      const comparedLine = i < comparedLines.length ? comparedLines[i] : '';
      
      if (originalLine === comparedLine) {
        // Lines are identical
        diffResult.push({
          lineNumber: i + 1,
          originalLine,
          comparedLine,
          isEqual: true,
          wordDiffs: []
        });
      } else {
        // Lines are different - find word-level differences
        const originalWords = originalLine.split(/(\s+|[,.()\[\]{}:;])/g).filter(Boolean);
        const comparedWords = comparedLine.split(/(\s+|[,.()\[\]{}:;])/g).filter(Boolean);
        
        // Simple word diff (could be improved with a proper diff algorithm)
        const wordDiffs = [];
        const maxWords = Math.max(originalWords.length, comparedWords.length);
        
        for (let j = 0; j < maxWords; j++) {
          const originalWord = j < originalWords.length ? originalWords[j] : '';
          const comparedWord = j < comparedWords.length ? comparedWords[j] : '';
          
          if (originalWord !== comparedWord) {
            wordDiffs.push({
              originalIndex: j,
              comparedIndex: j,
              originalWord,
              comparedWord
            });
          }
        }
        
        diffResult.push({
          lineNumber: i + 1,
          originalLine,
          comparedLine,
          isEqual: false,
          wordDiffs
        });
      }
    }
    
    return diffResult;
  };
  
  const diffLines = getDiffLines();
  
  // Calculate statistics about the changes
  const changedLinesCount = diffLines.filter(line => !line.isEqual).length;
  const addedLinesCount = comparedLines.length - originalLines.length > 0 ? comparedLines.length - originalLines.length : 0;
  const removedLinesCount = originalLines.length - comparedLines.length > 0 ? originalLines.length - comparedLines.length : 0;
  
  // Function to highlight word-level changes
  const highlightWordDiffs = (line, isOriginal = true) => {
    if (line.isEqual) return line[isOriginal ? 'originalLine' : 'comparedLine'];
    
    const words = (isOriginal ? line.originalLine : line.comparedLine).split(/(\s+|[,.()\[\]{}:;])/g).filter(Boolean);
    const wordDiffs = line.wordDiffs;
    
    // Map of indices that should be highlighted
    const diffIndices = new Set(wordDiffs.map(diff => isOriginal ? diff.originalIndex : diff.comparedIndex));
    
    return words.map((word, idx) => {
      if (diffIndices.has(idx)) {
        return <span key={idx} className={isOriginal ? "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300" : "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300"}>{word}</span>;
      }
      return word;
    });
  };

  // Get errors for specific line
  const getErrorsForLine = (lineNumber: number) => {
    return errors.filter(error => error.line === lineNumber);
  };
  
  return (
    <Card className="mt-4">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center">
            <Diff className="mr-2 h-5 w-5 text-muted-foreground" />
            Query Comparison
          </CardTitle>
          <div className="flex gap-2">
            <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
              {removedLinesCount} removed
            </Badge>
            <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
              {addedLinesCount} added
            </Badge>
            <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
              {changedLinesCount} changed
            </Badge>
            {errors.length > 0 && (
              <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
                <AlertTriangle size={12} className="mr-1" />
                {errors.length} {errors.length === 1 ? 'issue' : 'issues'}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="sideBySide">
          <TabsList>
            <TabsTrigger value="sideBySide">Side by Side</TabsTrigger>
            <TabsTrigger value="unified">Unified</TabsTrigger>
            {errors.length > 0 && (
              <TabsTrigger value="issues">Issues ({errors.length})</TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="sideBySide">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium mb-2">{originalTitle}</h3>
                <div 
                  ref={leftScrollRef} 
                  className="h-[400px] border rounded-md overflow-auto bg-background"
                >
                  <div className="p-2 font-mono text-xs relative">
                    {diffLines.map((line, idx) => {
                      const lineErrors = getErrorsForLine(line.lineNumber);
                      return (
                        <div key={idx}>
                          <div 
                            className={`py-1 pl-8 pr-2 whitespace-pre border-l-2 ${
                              !line.isEqual
                                ? 'border-l-red-500 bg-red-50 dark:bg-red-900/10'
                                : 'border-l-transparent'
                            } ${lineErrors.length > 0 ? 'border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-900/5' : ''}`}
                          >
                            <span className="absolute left-2 text-muted-foreground">{line.lineNumber}</span>
                            {highlightWordDiffs(line, true)}
                            {lineErrors.length > 0 && (
                              <AlertTriangle size={12} className="inline-block ml-2 text-yellow-500" />
                            )}
                          </div>
                          {lineErrors.length > 0 && (
                            <div className="ml-8 pl-2 text-xs italic text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/10 border-l-2 border-l-yellow-500">
                              {lineErrors.map((error, i) => (
                                <div key={i}>{error.message}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium mb-2">{comparedTitle}</h3>
                <div 
                  ref={rightScrollRef} 
                  className="h-[400px] border rounded-md overflow-auto bg-background"
                >
                  <div className="p-2 font-mono text-xs relative">
                    {diffLines.map((line, idx) => (
                      <div 
                        key={idx}
                        className={`py-1 pl-8 pr-2 whitespace-pre border-l-2 ${
                          !line.isEqual
                            ? 'border-l-green-500 bg-green-50 dark:bg-green-900/10'
                            : 'border-l-transparent'
                        }`}
                      >
                        <span className="absolute left-2 text-muted-foreground">{line.lineNumber}</span>
                        {highlightWordDiffs(line, false)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="unified">
            <ScrollArea className="h-[400px] border rounded-md bg-background">
              <div className="p-2 font-mono text-xs">
                {diffLines.map((line, idx) => {
                  const lineErrors = getErrorsForLine(line.lineNumber);
                  return (
                    <div key={idx}>
                      <div className="flex relative">
                        <div className="absolute left-2 w-8 text-muted-foreground">{line.lineNumber}</div>
                        {!line.isEqual ? (
                          <div className="pl-12 w-full">
                            <div className={`py-1 px-2 whitespace-pre border-l-2 border-l-red-500 bg-red-50 dark:bg-red-900/10 mb-1 ${lineErrors.length > 0 ? 'border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-900/5' : ''}`}>
                              - {line.originalLine}
                              {lineErrors.length > 0 && (
                                <AlertTriangle size={12} className="inline-block ml-2 text-yellow-500" />
                              )}
                            </div>
                            <div className="py-1 px-2 whitespace-pre border-l-2 border-l-green-500 bg-green-50 dark:bg-green-900/10">
                              + {line.comparedLine}
                            </div>
                          </div>
                        ) : (
                          <div className={`py-1 pl-12 pr-2 whitespace-pre w-full border-l-2 border-l-transparent ${lineErrors.length > 0 ? 'border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-900/5' : ''}`}>
                            {line.originalLine}
                            {lineErrors.length > 0 && (
                              <AlertTriangle size={12} className="inline-block ml-2 text-yellow-500" />
                            )}
                          </div>
                        )}
                      </div>
                      {lineErrors.length > 0 && (
                        <div className="ml-12 pl-2 text-xs italic text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/10 border-l-2 border-l-yellow-500">
                          {lineErrors.map((error, i) => (
                            <div key={i}>{error.message}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="issues">
            <ScrollArea className="h-[400px] border rounded-md">
              <div className="p-4 space-y-4">
                {errors.length > 0 ? (
                  errors.map((error, idx) => (
                    <div key={idx} className="border rounded-md p-3 bg-card">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-sm">{error.message}</h4>
                          {error.line && (
                            <p className="text-xs text-muted-foreground">Line: {error.line}</p>
                          )}
                          <p className="text-xs mt-1 text-muted-foreground">{error.suggestion}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No issues detected
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default QueryDiffViewer;
