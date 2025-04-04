
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Platform } from '@/utils/sqlValidator';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Settings } from 'lucide-react';
import { toast } from 'sonner';

interface CustomRuleSet {
  id: string;
  name: string;
  platform: Platform;
  rules: {
    bestPractices: Record<string, boolean>;
    performance: Record<string, boolean>;
    modularization: Record<string, boolean>;
    cost: Record<string, boolean>;
  };
  isDefault?: boolean;
  created: string;
  updated: string;
}

// Creating a subset of Platform type for the default rule sets
type DefaultPlatforms = 'bigquery' | 'snowflake' | 'databricks';
type DefaultRuleSets = Record<DefaultPlatforms, CustomRuleSet>;

const defaultRuleSets: DefaultRuleSets = {
  bigquery: {
    id: 'default-bigquery',
    name: 'Default BigQuery Rules',
    platform: 'bigquery',
    isDefault: true,
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    rules: {
      bestPractices: {
        tableAliases: true,
        columnQualification: true,
        wildcardUsage: true,
        caseConsistency: true,
        commentUsage: true
      },
      performance: {
        partitionPruning: true,
        clusteringUsage: true,
        subqueryOptimization: true,
        joinEfficiency: true,
        whereClauseOptimization: true
      },
      modularization: {
        cteUsage: true,
        queryComplexity: true,
        functionExtraction: true,
        viewUsage: true
      },
      cost: {
        dataScanned: true,
        joinSize: true,
        partitionFilterUsage: true,
        materializedViews: true
      }
    }
  },
  snowflake: {
    id: 'default-snowflake',
    name: 'Default Snowflake Rules',
    platform: 'snowflake',
    isDefault: true,
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    rules: {
      bestPractices: {
        tableAliases: true,
        columnQualification: true,
        wildcardUsage: true,
        caseConsistency: true,
        commentUsage: true
      },
      performance: {
        clusterKeyUsage: true,
        subqueryOptimization: true,
        joinEfficiency: true,
        whereClauseOptimization: true,
        materializationHints: true
      },
      modularization: {
        cteUsage: true,
        queryComplexity: true,
        functionExtraction: true,
        viewUsage: true
      },
      cost: {
        warehouseSize: true,
        joinSize: true,
        clusteringUsage: true,
        materializedViews: true
      }
    }
  },
  databricks: {
    id: 'default-databricks',
    name: 'Default Databricks Rules',
    platform: 'databricks',
    isDefault: true,
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    rules: {
      bestPractices: {
        tableAliases: true,
        columnQualification: true,
        wildcardUsage: true,
        caseConsistency: true,
        commentUsage: true
      },
      performance: {
        deltaOptimization: true,
        subqueryOptimization: true,
        joinEfficiency: true,
        whereClauseOptimization: true,
        z3Optimization: true
      },
      modularization: {
        cteUsage: true,
        queryComplexity: true,
        functionExtraction: true,
        viewUsage: true
      },
      cost: {
        clusterSize: true,
        joinSize: true,
        deltaIndexing: true,
        materializedViews: true
      }
    }
  }
};

const ruleDescriptions: Record<string, string> = {
  // Best Practices
  tableAliases: 'Use meaningful table aliases for better readability',
  columnQualification: 'Qualify column names with table aliases to prevent ambiguity',
  wildcardUsage: 'Avoid using SELECT * and explicitly list columns',
  caseConsistency: 'Maintain consistent capitalization for keywords and identifiers',
  commentUsage: 'Include comments for complex queries or logic',
  
  // Performance
  partitionPruning: 'Utilize partition pruning to reduce data scanned',
  clusteringUsage: 'Use clustering to improve query performance',
  subqueryOptimization: 'Optimize subqueries to prevent unnecessary processing',
  joinEfficiency: 'Optimize join operations to reduce data movement',
  whereClauseOptimization: 'Write efficient WHERE clauses to filter early',
  materializationHints: 'Use materialization hints to improve query execution',
  deltaOptimization: 'Use Delta Lake optimizations for better performance',
  z3Optimization: 'Utilize Z-ordering for multi-dimensional clustering',
  clusterKeyUsage: 'Use appropriate cluster keys to improve performance',
  
  // Modularization
  cteUsage: 'Use CTEs to break down complex queries into manageable parts',
  queryComplexity: 'Keep query complexity at a reasonable level',
  functionExtraction: 'Extract common logic into reusable functions',
  viewUsage: 'Use views for commonly accessed query patterns',
  
  // Cost
  dataScanned: 'Minimize the amount of data scanned in queries',
  joinSize: 'Be aware of join sizes to control query costs',
  partitionFilterUsage: 'Use partition filters to reduce processing costs',
  materializedViews: 'Consider using materialized views for frequent queries',
  warehouseSize: 'Be conscious of warehouse size for cost management',
  clusterSize: 'Optimize cluster size for cost-efficient processing',
  deltaIndexing: 'Use Delta Lake indexing features to improve efficiency'
};

const CustomRuleSetModal = () => {
  const [ruleSets, setRuleSets] = useState<CustomRuleSet[]>([]);
  const [selectedRuleSet, setSelectedRuleSet] = useState<CustomRuleSet | null>(null);
  const [newRuleSetName, setNewRuleSetName] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('bigquery');
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  useEffect(() => {
    loadRuleSets();
  }, []);

  const loadRuleSets = () => {
    try {
      let savedRuleSets = JSON.parse(localStorage.getItem('customRuleSets') || '[]');
      
      // Add default rule sets if none exist for platforms
      const platforms: DefaultPlatforms[] = ['bigquery', 'snowflake', 'databricks'];
      
      platforms.forEach(platform => {
        if (!savedRuleSets.some((rs: CustomRuleSet) => rs.platform === platform && rs.isDefault)) {
          savedRuleSets.push(defaultRuleSets[platform]);
        }
      });
      
      setRuleSets(savedRuleSets);
      
      // Set the first rule set as selected if none is selected
      if (savedRuleSets.length > 0 && !selectedRuleSet) {
        setSelectedRuleSet(savedRuleSets[0]);
      }
    } catch (error) {
      console.error('Error loading rule sets:', error);
      
      // Initialize with defaults if error
      const defaultSets = [
        defaultRuleSets.bigquery,
        defaultRuleSets.snowflake,
        defaultRuleSets.databricks
      ];
      
      setRuleSets(defaultSets);
      setSelectedRuleSet(defaultSets[0]);
    }
  };

  const saveRuleSets = (updatedRuleSets: CustomRuleSet[]) => {
    localStorage.setItem('customRuleSets', JSON.stringify(updatedRuleSets));
    setRuleSets(updatedRuleSets);
  };

  const handleRuleToggle = (category: keyof CustomRuleSet['rules'], ruleName: string, enabled: boolean) => {
    if (!selectedRuleSet) return;
    
    const updatedRuleSet = { 
      ...selectedRuleSet,
      updated: new Date().toISOString(),
      rules: {
        ...selectedRuleSet.rules,
        [category]: {
          ...selectedRuleSet.rules[category],
          [ruleName]: enabled
        }
      }
    };
    
    setSelectedRuleSet(updatedRuleSet);
    
    // Update in the rule sets list
    const updatedRuleSets = ruleSets.map(rs => 
      rs.id === updatedRuleSet.id ? updatedRuleSet : rs
    );
    
    saveRuleSets(updatedRuleSets);
  };

  const handleCreateNewRuleSet = () => {
    if (!newRuleSetName.trim()) {
      toast.error('Rule set name is required');
      return;
    }
    
    // Clone the default rule set for the selected platform as starting point
    const newRuleSet: CustomRuleSet = {
      id: `ruleset-${Date.now()}`,
      name: newRuleSetName,
      platform: selectedPlatform,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      rules: JSON.parse(JSON.stringify(defaultRuleSets[selectedPlatform as DefaultPlatforms].rules))
    };
    
    const updatedRuleSets = [...ruleSets, newRuleSet];
    saveRuleSets(updatedRuleSets);
    setSelectedRuleSet(newRuleSet);
    setNewRuleSetName('');
    setIsCreatingNew(false);
    
    toast.success(`Rule set "${newRuleSetName}" created successfully`);
  };

  const handleDeleteRuleSet = (ruleSetId: string) => {
    const ruleSetToDelete = ruleSets.find(rs => rs.id === ruleSetId);
    
    if (!ruleSetToDelete) return;
    
    // Don't allow deleting default rule sets
    if (ruleSetToDelete.isDefault) {
      toast.error('Cannot delete default rule sets');
      return;
    }
    
    if (window.confirm(`Are you sure you want to delete "${ruleSetToDelete.name}"?`)) {
      const updatedRuleSets = ruleSets.filter(rs => rs.id !== ruleSetId);
      saveRuleSets(updatedRuleSets);
      
      // If the deleted rule set was selected, select the first available one
      if (selectedRuleSet?.id === ruleSetId) {
        setSelectedRuleSet(updatedRuleSets.length > 0 ? updatedRuleSets[0] : null);
      }
      
      toast.success(`Rule set "${ruleSetToDelete.name}" deleted successfully`);
    }
  };

  const renderRuleCategory = (category: keyof CustomRuleSet['rules'], categoryTitle: string) => {
    if (!selectedRuleSet) return null;
    
    const categoryRules = selectedRuleSet.rules[category];
    
    return (
      <AccordionItem value={category}>
        <AccordionTrigger className="px-4">{categoryTitle}</AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4 px-4 pb-4">
            {Object.entries(categoryRules).map(([ruleName, enabled]) => (
              <div key={ruleName} className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor={`${category}-${ruleName}`} className="text-sm font-medium">
                    {ruleName.replace(/([A-Z])/g, ' $1').trim()}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {ruleDescriptions[ruleName] || 'No description available'}
                  </p>
                </div>
                <Switch
                  id={`${category}-${ruleName}`}
                  checked={enabled}
                  onCheckedChange={(checked) => handleRuleToggle(category, ruleName, checked)}
                  disabled={selectedRuleSet.isDefault}
                />
              </div>
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    );
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings size={14} className="mr-1" />
          <span>Rule Sets</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Custom Rule Sets</DialogTitle>
          <DialogDescription>
            Configure custom rule sets for SQL analysis
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col md:flex-row gap-6 py-4 flex-1 overflow-hidden">
          <div className="w-full md:w-1/3 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium">Available Rule Sets</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCreatingNew(true)}
              >
                Add New
              </Button>
            </div>
            
            {isCreatingNew && (
              <div className="border rounded-md p-4 space-y-4">
                <h4 className="text-sm font-medium">Create New Rule Set</h4>
                <div className="space-y-2">
                  <Label htmlFor="rule-set-name">Name</Label>
                  <Input
                    id="rule-set-name"
                    value={newRuleSetName}
                    onChange={(e) => setNewRuleSetName(e.target.value)}
                    placeholder="My Custom Rules"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="platform">Platform</Label>
                  <select
                    id="platform"
                    value={selectedPlatform}
                    onChange={(e) => setSelectedPlatform(e.target.value as Platform)}
                    className="w-full h-10 rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="bigquery">Google BigQuery</option>
                    <option value="snowflake">Snowflake</option>
                    <option value="databricks">Databricks</option>
                  </select>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" size="sm" onClick={() => setIsCreatingNew(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleCreateNewRuleSet}>
                    Create
                  </Button>
                </div>
              </div>
            )}
            
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {ruleSets.map((ruleSet) => (
                  <div
                    key={ruleSet.id}
                    className={`p-3 border rounded-md cursor-pointer hover:bg-accent/10 transition-colors ${
                      selectedRuleSet?.id === ruleSet.id ? 'border-primary' : ''
                    }`}
                    onClick={() => setSelectedRuleSet(ruleSet)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-sm font-medium">{ruleSet.name}</h4>
                        <p className="text-xs text-muted-foreground">
                          {ruleSet.platform === 'bigquery'
                            ? 'Google BigQuery'
                            : ruleSet.platform === 'snowflake'
                            ? 'Snowflake'
                            : 'Databricks'}
                        </p>
                      </div>
                      {!ruleSet.isDefault && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteRuleSet(ruleSet.id);
                          }}
                        >
                          <span className="sr-only">Delete</span>
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-destructive"
                          >
                            <path d="M3 6h18"></path>
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                          </svg>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
          
          <div className="w-full md:w-2/3 border rounded-md flex-1 overflow-hidden">
            {selectedRuleSet ? (
              <div className="h-full flex flex-col">
                <div className="p-4 border-b">
                  <h3 className="text-lg font-medium">{selectedRuleSet.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedRuleSet.platform === 'bigquery'
                      ? 'Google BigQuery'
                      : selectedRuleSet.platform === 'snowflake'
                      ? 'Snowflake'
                      : 'Databricks'}{' '}
                    rule set
                  </p>
                  {selectedRuleSet.isDefault && (
                    <p className="text-xs text-muted-foreground mt-1">
                      This is a default rule set and cannot be modified
                    </p>
                  )}
                </div>
                
                <ScrollArea className="flex-1">
                  <Accordion type="multiple" className="w-full">
                    {renderRuleCategory('bestPractices', 'Best Practices')}
                    {renderRuleCategory('performance', 'Performance')}
                    {renderRuleCategory('modularization', 'Modularization')}
                    {renderRuleCategory('cost', 'Cost Efficiency')}
                  </Accordion>
                </ScrollArea>
              </div>
            ) : (
              <div className="p-6 text-center">
                <p className="text-muted-foreground">
                  Select a rule set from the list or create a new one
                </p>
              </div>
            )}
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" type="button">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CustomRuleSetModal;
