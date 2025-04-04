
import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PlayCircle, Copy, Save, X, Wrench, Diff, Code, FolderOpen, AlertCircle } from 'lucide-react';
import { Platform } from '@/utils/sqlValidator';
import { getSuggestions } from '@/utils/sqlCompletions';
import { fixSqlSyntax } from '@/utils/sqlFixer';
import { enhanceSql, SqlEnhancerResult, SqlIssue } from '@/utils/sqlEnhancer';
import QueryDiffViewer from '@/components/QueryDiffViewer';
import SqlModelConversionDialog from '@/components/SqlModelConversionDialog';
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import SqlSyntaxHighlighter from '@/components/SqlSyntaxHighlighter';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CodeEditorProps {
  code: string;
  onChange: (code: string) => void;
  onExecute: () => void;
  isLoading: boolean;
  platform?: Platform;
}

const CodeEditor = ({ code, onChange, onExecute, isLoading, platform = 'bigquery' }: CodeEditorProps) => {
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const [lineNumbers, setLineNumbers] = useState<number[]>([1]);
  const [cursorPosition, setCursorPosition] = useState<number>(0);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [suggestionsPosition, setSuggestionsPosition] = useState({ top: 0, left: 0 });
  const [showSqlDiff, setShowSqlDiff] = useState(false);
  const [sqlFixResult, setSqlFixResult] = useState<{
    originalQuery: string;
    fixedQuery: string;
    errors: Array<{
      message: string;
      line?: number;
      position?: number;
      suggestion: string;
      severity?: string;
    }>;
  } | null>(null);
  
  const [useEnhancedFormatter, setUseEnhancedFormatter] = useState(true);
  const [showModelConversion, setShowModelConversion] = useState(false);
  
  const [formattingIssues, setFormattingIssues] = useState<SqlIssue[]>([]);
  const [showFormattingFeedback, setShowFormattingFeedback] = useState(false);
  
  useEffect(() => {
    updateLineNumbers();
    adjustTextareaHeight();
  }, [code]);
  
  useEffect(() => {
    if (editorRef.current && platform) {
      const cursorPos = editorRef.current.selectionStart;
      const textBeforeCursor = code.substring(0, cursorPos);
      const newSuggestions = getSuggestions(textBeforeCursor, platform);
      
      setSuggestions(newSuggestions);
      if (newSuggestions.length > 0) {
        setShowSuggestions(true);
        setSuggestionIndex(0);
        
        const cursorPosition = getCursorPosition(editorRef.current, cursorPos);
        setSuggestionsPosition({
          top: cursorPosition.top + 20,
          left: cursorPosition.left
        });
      } else {
        setShowSuggestions(false);
      }
    }
  }, [cursorPosition, platform]);
  
  const getCursorPosition = (textarea: HTMLTextAreaElement, cursorPos: number) => {
    const div = document.createElement('div');
    div.style.position = 'absolute';
    div.style.visibility = 'hidden';
    div.style.whiteSpace = 'pre-wrap';
    div.style.wordWrap = 'break-word';
    div.style.width = window.getComputedStyle(textarea).width;
    div.style.fontSize = window.getComputedStyle(textarea).fontSize;
    div.style.fontFamily = window.getComputedStyle(textarea).fontFamily;
    div.style.lineHeight = window.getComputedStyle(textarea).lineHeight;
    div.style.padding = window.getComputedStyle(textarea).padding;
    
    const textBeforeCursor = code.substring(0, cursorPos);
    
    const textNode = document.createTextNode(textBeforeCursor);
    div.appendChild(textNode);
    
    const marker = document.createElement('span');
    marker.id = 'cursor-position-marker';
    div.appendChild(marker);
    
    document.body.appendChild(div);
    const markerPos = document.getElementById('cursor-position-marker')!.getBoundingClientRect();
    document.body.removeChild(div);
    
    const textareaPos = textarea.getBoundingClientRect();
    return {
      top: markerPos.top - textareaPos.top + textarea.scrollTop,
      left: markerPos.left - textareaPos.left + textarea.scrollLeft
    };
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    updateLineNumbers();
    adjustTextareaHeight();
    setCursorPosition(e.target.selectionStart);
    
    if (showFormattingFeedback) {
      setShowFormattingFeedback(false);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSuggestions) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSuggestionIndex(prev => (prev + 1) % suggestions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSuggestionIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        applySuggestion(suggestions[suggestionIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowSuggestions(false);
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;

      const newValue = target.value.substring(0, start) + '  ' + target.value.substring(end);
      
      onChange(newValue);
      
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 2;
        setCursorPosition(start + 2);
      }, 0);
    }
  };
  
  const updateLineNumbers = () => {
    if (!editorRef.current) return;
    
    const lines = code.split('\n');
    setLineNumbers(Array.from({ length: lines.length }, (_, i) => i + 1));
  };
  
  const adjustTextareaHeight = () => {
    if (!editorRef.current) return;
    
    editorRef.current.style.height = 'auto';
    
    const minHeight = 256;
    const maxHeight = 320;
    const scrollHeight = editorRef.current.scrollHeight;
    
    const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
    editorRef.current.style.height = `${newHeight}px`;
    
    const lineNumbersContainer = document.querySelector('.line-numbers-container');
    if (lineNumbersContainer) {
      (lineNumbersContainer as HTMLElement).style.height = `${newHeight}px`;
    }
  };

  const applySuggestion = (suggestion: string) => {
    if (!editorRef.current) return;
    
    const cursorPos = editorRef.current.selectionStart;
    let wordStart = cursorPos;
    
    while (wordStart > 0 && /[a-zA-Z0-9_]/.test(code.charAt(wordStart - 1))) {
      wordStart--;
    }
    
    const currentWord = code.substring(wordStart, cursorPos);
    
    const newCode = code.substring(0, wordStart) + suggestion + code.substring(cursorPos);
    onChange(newCode);
    
    const newCursorPos = wordStart + suggestion.length;
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.selectionStart = editorRef.current.selectionEnd = newCursorPos;
        setCursorPosition(newCursorPos);
      }
    }, 0);
    
    setShowSuggestions(false);
  };

  const handleSqlFix = async () => {
    if (!code.trim()) {
      toast.error("SQL query is empty");
      return;
    }
    
    if (!platform) {
      toast.error("No SQL platform selected");
      return;
    }
    
    if (useEnhancedFormatter) {
      const result = enhanceSql(code, platform);
      
      if (result.fixed) {
        setSqlFixResult({
          originalQuery: code,
          fixedQuery: result.formattedQuery,
          errors: result.issues.map(issue => ({
            message: issue.message,
            line: issue.line,
            position: issue.position,
            suggestion: issue.suggestion,
            severity: issue.severity
          }))
        });
        
        setFormattingIssues(result.issues);
        setShowFormattingFeedback(true);
        setShowSqlDiff(true);
        
        toast.success(`SQL formatted with ${result.issues.length} issue${result.issues.length === 1 ? '' : 's'} detected`);
      } else {
        toast.info("No formatting issues detected");
        setShowFormattingFeedback(false);
        setShowSqlDiff(false);
      }
    } else {
      const result = fixSqlSyntax(code, platform);
      
      if (result.fixed) {
        setSqlFixResult({
          originalQuery: code,
          fixedQuery: result.fixedQuery,
          errors: result.errors
        });
        
        setFormattingIssues(result.errors.map(error => ({
          message: error.message,
          line: error.line,
          position: error.position,
          suggestion: error.suggestion,
          severity: error.severity as 'error' | 'warning' | 'info'
        })));
        
        setShowFormattingFeedback(true);
        setShowSqlDiff(true);
        
        toast.success(`SQL formatted with ${result.errors.length} issue${result.errors.length === 1 ? '' : 's'} fixed`);
      } else {
        toast.info("No syntax issues detected");
        setShowFormattingFeedback(false);
        setShowSqlDiff(false);
      }
    }
  };

  const applyFixedSql = () => {
    if (sqlFixResult) {
      onChange(sqlFixResult.fixedQuery);
      setShowSqlDiff(false);
      toast.success("Fixed SQL applied to editor");
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code).then(() => {
      toast.success("SQL copied to clipboard");
    });
  };

  const saveQuery = () => {
    const savedQueries = JSON.parse(localStorage.getItem('savedQueries') || '[]');
    const queryName = prompt('Enter a name for this query:');
    if (!queryName) return;

    savedQueries.push({
      id: Date.now(),
      name: queryName,
      sql: code,
      date: new Date().toISOString(),
    });

    localStorage.setItem('savedQueries', JSON.stringify(savedQueries));
    toast.success(`Query "${queryName}" saved`);
  };

  const handleModelConversionClick = () => {
    if (!code.trim()) {
      toast.error("SQL query is empty");
      return;
    }
    
    setShowModelConversion(true);
  };

  const handleClick = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    setCursorPosition(editorRef.current?.selectionStart || 0);
  };

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'error':
        return 'text-red-500 dark:text-red-400';
      case 'warning':
        return 'text-yellow-500 dark:text-yellow-400';
      default:
        return 'text-blue-500 dark:text-blue-400';
    }
  };

  const getSeverityIcon = (severity?: string) => {
    return <AlertCircle className={`h-4 w-4 ${getSeverityColor(severity)}`} />;
  };

  return (
    <Card className="border-accent/20 glossy-card h-full relative overflow-hidden">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center px-4 py-2 border-b border-border/30 backdrop-blur-sm gap-2">
        <h3 className="font-medium flex items-center">
          <Code className="mr-2 h-5 w-5 text-primary" />
          SQL Editor
        </h3>
        <div className="flex flex-wrap gap-2 items-center w-full md:w-auto justify-end">
          <div className="flex items-center space-x-2 mr-0 md:mr-2">
            <Switch
              id="formatter-toggle"
              checked={useEnhancedFormatter}
              onCheckedChange={setUseEnhancedFormatter}
              className="scale-75"
            />
            <Label htmlFor="formatter-toggle" className="text-xs">
              Enhanced Formatter
            </Label>
          </div>
          
          <div className="flex flex-wrap gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="glass"
                    size="sm"
                    onClick={handleSqlFix}
                    className="h-8 px-2 hover:bg-primary/10"
                  >
                    <Wrench size={14} className="mr-1" />
                    <span className="hidden sm:inline">Format SQL</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Format SQL and check for issues</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <Button
              variant="glass"
              size="sm"
              onClick={handleModelConversionClick}
              className="h-8 px-2 hover:bg-primary/10"
              title="Convert to Dataform/DBT model"
            >
              <Code size={14} className="mr-1" />
              <span className="hidden sm:inline">To Model</span>
            </Button>
            
            <Button
              variant="glass"
              size="sm"
              onClick={copyToClipboard}
              className="h-8 px-2 hover:bg-primary/10"
            >
              <Copy size={14} className="mr-1" />
              <span className="hidden sm:inline">Copy</span>
            </Button>
            
            <Button
              variant="glass"
              size="sm"
              onClick={saveQuery}
              className="h-8 px-2 hover:bg-primary/10"
            >
              <Save size={14} className="mr-1" />
              <span className="hidden sm:inline">Save</span>
            </Button>
            
            <Button
              variant="gradient"
              size="sm"
              onClick={onExecute}
              disabled={isLoading}
              className="h-8 px-3"
            >
              {isLoading ? (
                <span className="animate-pulse">Analyzing...</span>
              ) : (
                <>
                  <PlayCircle size={14} className="mr-1" />
                  <span>Analyze</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
      <CardContent className="p-0 relative min-h-64">
        {/* Show the editor even when diff is displayed */}
        <div className={`${showSqlDiff ? 'hidden md:block md:h-1/2' : 'h-full'}`}>
          <div className="flex h-full">
            <div className="py-4 px-2 text-right bg-muted/50 text-muted-foreground text-xs select-none w-12 line-numbers-container overflow-hidden">
              {lineNumbers.map(num => (
                <div key={num} className="leading-6">{num}</div>
              ))}
            </div>
            <textarea
              ref={editorRef}
              value={code}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onClick={handleClick}
              className="flex-1 p-4 bg-card text-foreground code-editor focus:outline-none leading-6 text-sm w-full font-mono overflow-y-auto"
              style={{ minHeight: '256px', resize: 'none' }}
              placeholder="-- Enter your SQL query here
SELECT 
  column1,
  column2
FROM 
  your_table
WHERE 
  condition = true
GROUP BY 
  column1"
            />
          </div>
        </div>
        
        {showSqlDiff && sqlFixResult && (
          <div className={`mt-0 ${showSqlDiff && !showSqlDiff ? 'hidden' : ''}`}>
            <div className="flex justify-between items-center px-4 py-2 border-b border-border/30">
              <h4 className="text-sm font-medium flex items-center">
                <Diff className="mr-2 h-4 w-4 text-primary" />
                SQL Formatting Results
              </h4>
              <div className="flex gap-2">
                <Button 
                  variant="glass" 
                  size="sm" 
                  onClick={applyFixedSql}
                  className="h-7 px-2"
                >
                  Apply Changes
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowSqlDiff(false)}
                  className="h-7 w-7 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <QueryDiffViewer
              originalQuery={sqlFixResult.originalQuery}
              comparedQuery={sqlFixResult.fixedQuery}
              originalTitle="Original SQL"
              comparedTitle="Formatted SQL"
              errors={sqlFixResult.errors}
            />
          </div>
        )}
        
        {!showSqlDiff && showFormattingFeedback && formattingIssues.length > 0 && (
          <div className="mt-3 p-4 border-t border-border/30 bg-card/80 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium">SQL Formatting Issues</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFormattingFeedback(false)}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </div>
            <div className="space-y-2 max-h-36 overflow-y-auto pr-2">
              {formattingIssues.map((issue, index) => (
                <div key={index} className="rounded-md bg-muted/50 p-2 text-xs">
                  <div className="flex items-start gap-2">
                    {getSeverityIcon(issue.severity)}
                    <div>
                      <p className="font-medium">{issue.message}</p>
                      {issue.line && (
                        <p className="text-muted-foreground mt-1">Line: {issue.line}</p>
                      )}
                      <p className="mt-1 text-muted-foreground">{issue.suggestion}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {showSuggestions && suggestions.length > 0 && (
          <div 
            className="absolute z-50 bg-popover border border-border rounded-md shadow-md w-64 max-h-60 overflow-y-auto"
            style={{ 
              top: `${suggestionsPosition.top}px`, 
              left: `${suggestionsPosition.left}px`
            }}
          >
            <div className="flex justify-between items-center border-b border-border p-1.5">
              <span className="text-xs font-medium text-muted-foreground">Suggestions</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={() => setShowSuggestions(false)}
              >
                <X size={12} />
              </Button>
            </div>
            <ul className="py-1">
              {suggestions.map((suggestion, index) => (
                <li 
                  key={index}
                  className={`px-3 py-1.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground ${index === suggestionIndex ? 'bg-accent text-accent-foreground' : ''}`}
                  onClick={() => applySuggestion(suggestion)}
                >
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        <SqlModelConversionDialog
          isOpen={showModelConversion}
          onClose={() => setShowModelConversion(false)}
          sql={code}
          platform={platform}
        />
      </CardContent>
    </Card>
  );
};

export default CodeEditor;
