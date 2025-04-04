
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Platform } from "@/utils/sqlValidator";
import { Database, Cloud, Server } from "lucide-react";

interface PlatformSelectorProps {
  platform: Platform;
  onChange: (platform: Platform) => void;
}

const PlatformSelector = ({ platform, onChange }: PlatformSelectorProps) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="platform-select" className="text-sm font-medium text-white/80">SQL Platform</Label>
      <Select 
        value={platform} 
        onValueChange={(value) => onChange(value as Platform)}
      >
        <SelectTrigger 
          id="platform-select" 
          className="w-full bg-card/50 backdrop-blur-sm border-white/10 shadow-sm hover:border-primary/50 transition-all text-white"
        >
          <SelectValue placeholder="Select Platform" />
        </SelectTrigger>
        <SelectContent className="border-white/10 shadow-lg bg-card/95 backdrop-blur-sm">
          <SelectItem value="bigquery" className="focus:bg-primary/10 text-white hover:text-white">
            <div className="flex items-center">
              <Database className="mr-2 h-4 w-4 text-blue-400" />
              <span>Google BigQuery</span>
            </div>
          </SelectItem>
          <SelectItem value="snowflake" className="focus:bg-primary/10 text-white hover:text-white">
            <div className="flex items-center">
              <Cloud className="mr-2 h-4 w-4 text-sky-400" />
              <span>Snowflake</span>
            </div>
          </SelectItem>
          <SelectItem value="databricks" className="focus:bg-primary/10 text-white hover:text-white">
            <div className="flex items-center">
              <Server className="mr-2 h-4 w-4 text-red-400" />
              <span>Databricks</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export default PlatformSelector;
