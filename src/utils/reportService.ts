
import { SqlAnalysisResult, Platform } from './sqlValidator';

export interface SavedReport {
  id: string;
  name: string;
  timestamp: string;
  platform: Platform;
  sql: string;
  result: SqlAnalysisResult;
  tags?: string[];
  autoSaved?: boolean;
  shared?: boolean;
  shareId?: string;
}

export const saveReport = (
  name: string,
  platform: Platform,
  sql: string,
  result: SqlAnalysisResult,
  tags?: string[],
  autoSaved: boolean = false
): SavedReport => {
  const report: SavedReport = {
    id: `report-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    name,
    timestamp: new Date().toISOString(),
    platform,
    sql,
    result,
    tags,
    autoSaved,
    shared: false,
    shareId: undefined
  };

  const savedReports = getSavedReports();
  savedReports.push(report);
  
  localStorage.setItem('savedReports', JSON.stringify(savedReports));
  return report;
};

export const saveAutoReport = (
  platform: Platform,
  sql: string,
  result: SqlAnalysisResult
): SavedReport => {
  const timestamp = new Date();
  const formattedDate = timestamp.toLocaleDateString();
  const formattedTime = timestamp.toLocaleTimeString();
  const reportName = `Auto-saved report (${formattedDate} ${formattedTime})`;
  
  return saveReport(reportName, platform, sql, result, [], true);
};

export const getSavedReports = (): SavedReport[] => {
  try {
    const reports = JSON.parse(localStorage.getItem('savedReports') || '[]');
    return reports;
  } catch (error) {
    console.error('Error getting saved reports:', error);
    return [];
  }
};

export const getSavedReportById = (id: string): SavedReport | undefined => {
  const reports = getSavedReports();
  return reports.find(report => report.id === id);
};

export const deleteSavedReport = (id: string): boolean => {
  const reports = getSavedReports();
  const newReports = reports.filter(report => report.id !== id);
  
  if (reports.length === newReports.length) {
    return false; // Report not found
  }
  
  localStorage.setItem('savedReports', JSON.stringify(newReports));
  return true;
};

export const updateReportTags = (id: string, tags: string[]): boolean => {
  const reports = getSavedReports();
  const reportIndex = reports.findIndex(report => report.id === id);
  
  if (reportIndex === -1) {
    return false; // Report not found
  }
  
  reports[reportIndex].tags = tags;
  localStorage.setItem('savedReports', JSON.stringify(reports));
  return true;
};

export const getReportCount = (): number => {
  return getSavedReports().length;
};

export const shareReport = (id: string): string | null => {
  const reports = getSavedReports();
  const reportIndex = reports.findIndex(report => report.id === id);
  
  if (reportIndex === -1) {
    return null; // Report not found
  }
  
  // Generate a unique share ID if not already present
  if (!reports[reportIndex].shareId) {
    reports[reportIndex].shareId = `share-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    reports[reportIndex].shared = true;
    localStorage.setItem('savedReports', JSON.stringify(reports));
  }
  
  return reports[reportIndex].shareId;
};

export const getReportByShareId = (shareId: string): SavedReport | undefined => {
  const reports = getSavedReports();
  return reports.find(report => report.shareId === shareId);
};

export const exportReportAsJSON = (id: string): string => {
  const report = getSavedReportById(id);
  if (!report) return '';
  
  return JSON.stringify(report, null, 2);
};

export const exportReportAsCSV = (id: string): string => {
  const report = getSavedReportById(id);
  if (!report) return '';
  
  // Basic CSV format for the report
  let csv = 'Category,Issue,Description\n';
  
  // Add best practices
  report.result.bestPractices.forEach(issue => {
    csv += `"Best Practice","${issue.message.replace(/"/g, '""')}","${issue.recommendation.replace(/"/g, '""')}"\n`;
  });
  
  // Add performance issues
  report.result.performance.forEach(issue => {
    csv += `"Performance","${issue.message.replace(/"/g, '""')}","${issue.recommendation.replace(/"/g, '""')}"\n`;
  });
  
  // Add modularization issues
  report.result.modularization.forEach(issue => {
    csv += `"Modularization","${issue.message.replace(/"/g, '""')}","${issue.recommendation.replace(/"/g, '""')}"\n`;
  });
  
  // Add cost issues
  report.result.cost.forEach(issue => {
    csv += `"Cost","${issue.message.replace(/"/g, '""')}","${issue.recommendation.replace(/"/g, '""')}"\n`;
  });
  
  return csv;
};

// Query history functionality
export const getQueryHistory = (): { sql: string; platform: Platform; timestamp: string }[] => {
  try {
    return JSON.parse(localStorage.getItem('queryHistory') || '[]');
  } catch (error) {
    console.error('Error getting query history:', error);
    return [];
  }
};

export const addToQueryHistory = (sql: string, platform: Platform): void => {
  const history = getQueryHistory();
  
  // Add to beginning, limit to 50 entries
  history.unshift({
    sql,
    platform,
    timestamp: new Date().toISOString()
  });
  
  // Keep only the last 50 entries
  const limitedHistory = history.slice(0, 50);
  
  localStorage.setItem('queryHistory', JSON.stringify(limitedHistory));
};

export const clearQueryHistory = (): void => {
  localStorage.setItem('queryHistory', '[]');
};
