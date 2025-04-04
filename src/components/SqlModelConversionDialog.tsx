
import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clipboard, Code, Download, FileText, Copy, Check, Info } from "lucide-react";
import { Platform } from '@/utils/sqlValidator';
import { ModelType, convertToDataform, convertToDbt } from '@/utils/sqlModelConverter';
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SqlModelConversionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sql: string;
  platform: Platform;
}

const SqlModelConversionDialog = ({ 
  isOpen, 
  onClose, 
  sql,
  platform 
}: SqlModelConversionDialogProps) => {
  const [modelType, setModelType] = useState<ModelType>('dataform');
  const [activeSection, setActiveSection] = useState('model');
  const [copied, setCopied] = useState<Record<string, boolean>>({
    model: false,
    documentation: false,
    config: false
  });
  
  // Get conversion result based on selected type
  const getConversionResult = () => {
    if (modelType === 'dataform') {
      return convertToDataform(sql, platform);
    } else {
      return convertToDbt(sql, platform);
    }
  };
  
  const conversionResult = getConversionResult();
  
  const handleCopy = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopied(prev => ({ ...prev, [section]: true }));
    
    toast.success(`${section} copied to clipboard`);
    
    setTimeout(() => {
      setCopied(prev => ({ ...prev, [section]: false }));
    }, 2000);
  };
  
  const handleDownload = (content: string, type: string) => {
    const extension = modelType === 'dataform' 
      ? (type === 'model' ? 'sqlx' : 'md')
      : (type === 'model' ? 'sql' : 'yml');
      
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    let fileName = '';
    if (modelType === 'dataform') {
      fileName = type === 'model' 
        ? 'dataform_model.sqlx' 
        : type === 'documentation' 
          ? 'dataform_docs.md' 
          : 'dataform_config.json';
    } else {
      fileName = type === 'model' 
        ? 'dbt_model.sql' 
        : type === 'documentation' 
          ? 'schema.yml' 
          : 'dbt_config.json';
    }
    
    a.href = url;
    a.download = fileName;
    a.click();
    
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${fileName}`);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Code className="h-5 w-5" />
            Convert to {modelType === 'dataform' ? 'Google Dataform' : 'dbt'} Model
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex gap-4 mb-4">
          <Tabs defaultValue="dataform" className="w-full" onValueChange={(value) => setModelType(value as ModelType)}>
            <TabsList>
              <TabsTrigger value="dataform">Google Dataform</TabsTrigger>
              <TabsTrigger value="dbt">dbt</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        {!conversionResult.success ? (
          <div className="text-destructive p-4 border border-destructive/20 rounded-md bg-destructive/10">
            {conversionResult.error || "Failed to convert SQL to model"}
          </div>
        ) : (
          <>
            <Alert variant="default" className="mb-4 bg-blue-50 border-blue-200">
              <Info className="h-4 w-4" />
              <AlertDescription>
                {modelType === 'dataform' 
                  ? 'Enhanced Dataform model using JavaScript for reusable patterns and proper table references.' 
                  : 'Enhanced dbt model with proper table references, tests, and documentation.'}
              </AlertDescription>
            </Alert>
            
            <Tabs defaultValue="model" className="w-full" onValueChange={setActiveSection}>
              <TabsList>
                <TabsTrigger value="model">Model Code</TabsTrigger>
                <TabsTrigger value="documentation">Documentation</TabsTrigger>
                <TabsTrigger value="config">Config</TabsTrigger>
              </TabsList>
              
              <TabsContent value="model" className="border rounded-md p-4 min-h-[300px] max-h-[400px] overflow-auto bg-muted/30">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    {modelType === 'dataform' ? 'SQLX Model' : 'SQL Model'}
                  </h3>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(conversionResult.model, 'model')}
                    >
                      {copied.model ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                      {copied.model ? 'Copied' : 'Copy'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(conversionResult.model, 'model')}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </div>
                </div>
                <pre className="text-xs whitespace-pre-wrap font-mono overflow-auto">
                  {conversionResult.model}
                </pre>
              </TabsContent>
              
              <TabsContent value="documentation" className="border rounded-md p-4 min-h-[300px] max-h-[400px] overflow-auto bg-muted/30">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    {modelType === 'dataform' ? 'Markdown Documentation' : 'Schema YAML'}
                  </h3>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(conversionResult.documentation, 'documentation')}
                    >
                      {copied.documentation ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                      {copied.documentation ? 'Copied' : 'Copy'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(conversionResult.documentation, 'documentation')}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </div>
                </div>
                <pre className="text-xs whitespace-pre-wrap font-mono overflow-auto">
                  {conversionResult.documentation}
                </pre>
              </TabsContent>
              
              <TabsContent value="config" className="border rounded-md p-4 min-h-[300px] max-h-[400px] overflow-auto bg-muted/30">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Config JSON
                  </h3>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(conversionResult.config, 'config')}
                    >
                      {copied.config ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                      {copied.config ? 'Copied' : 'Copy'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(conversionResult.config, 'config')}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </div>
                </div>
                <pre className="text-xs whitespace-pre-wrap font-mono overflow-auto">
                  {conversionResult.config}
                </pre>
              </TabsContent>
            </Tabs>
            
            <div className="mt-4 p-3 bg-muted/30 rounded-md text-sm">
              <p className="font-medium">About {modelType === 'dataform' ? 'Google Dataform' : 'dbt'} Models</p>
              <p className="text-muted-foreground mt-1">
                {modelType === 'dataform' 
                  ? 'Dataform is a SQL workflow tool that helps teams manage complex data transformation workflows. The model above uses SQLX format which combines SQL with JavaScript for reusable code patterns and configuration.' 
                  : 'dbt (data build tool) is a transformation workflow that lets teams deploy analytics code using software engineering best practices. The model above uses SQL with Jinja templating and YAML for documentation.'}
              </p>
              
              <p className="text-muted-foreground mt-2">
                <span className="font-medium">Advanced features:</span> {modelType === 'dataform' 
                  ? 'JavaScript functions for reusable patterns, proper table references, and JavaScript variables for CTE definitions.' 
                  : 'Table references using ref() syntax, incremental logic, advanced tests, and metadata.'}
              </p>
            </div>
          </>
        )}
        
        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SqlModelConversionDialog;
