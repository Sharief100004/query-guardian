
import { Platform, SqlAnalysisResult } from './sqlValidator';
import { nanoid } from 'nanoid';

export interface Project {
  id: string;
  name: string;
  description?: string;
  created: string;
  updated: string;
  queries: ProjectQuery[];
  tags?: string[];
}

export interface ProjectQuery {
  id: string;
  name: string;
  sql: string;
  platform: Platform;
  description?: string;
  created: string;
  updated: string;
  lastAnalysisId?: string;
  tags?: string[];
  favorite?: boolean;
}

export const getProjects = (): Project[] => {
  try {
    const projects = JSON.parse(localStorage.getItem('sqlProjects') || '[]');
    return projects;
  } catch (error) {
    console.error('Error getting projects:', error);
    return [];
  }
};

export const createProject = (name: string, description?: string): Project => {
  const newProject: Project = {
    id: `project-${nanoid()}`,
    name,
    description,
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    queries: [],
    tags: []
  };
  
  const projects = getProjects();
  projects.push(newProject);
  localStorage.setItem('sqlProjects', JSON.stringify(projects));
  
  return newProject;
};

export const getProject = (id: string): Project | undefined => {
  const projects = getProjects();
  return projects.find(p => p.id === id);
};

export const updateProject = (
  id: string, 
  updates: Partial<Omit<Project, 'id' | 'created' | 'queries'>>
): Project | undefined => {
  const projects = getProjects();
  const index = projects.findIndex(p => p.id === id);
  
  if (index === -1) return undefined;
  
  projects[index] = {
    ...projects[index],
    ...updates,
    updated: new Date().toISOString()
  };
  
  localStorage.setItem('sqlProjects', JSON.stringify(projects));
  return projects[index];
};

export const deleteProject = (id: string): boolean => {
  const projects = getProjects();
  const filtered = projects.filter(p => p.id !== id);
  
  if (filtered.length === projects.length) return false;
  
  localStorage.setItem('sqlProjects', JSON.stringify(filtered));
  return true;
};

export const addQueryToProject = (
  projectId: string,
  query: Omit<ProjectQuery, 'id' | 'created' | 'updated'>
): ProjectQuery | undefined => {
  const projects = getProjects();
  const index = projects.findIndex(p => p.id === projectId);
  
  if (index === -1) return undefined;
  
  const newQuery: ProjectQuery = {
    ...query,
    id: `query-${nanoid()}`,
    created: new Date().toISOString(),
    updated: new Date().toISOString()
  };
  
  projects[index].queries.push(newQuery);
  projects[index].updated = new Date().toISOString();
  
  localStorage.setItem('sqlProjects', JSON.stringify(projects));
  return newQuery;
};

export const updateQueryInProject = (
  projectId: string,
  queryId: string,
  updates: Partial<Omit<ProjectQuery, 'id' | 'created'>>
): ProjectQuery | undefined => {
  const projects = getProjects();
  const projectIndex = projects.findIndex(p => p.id === projectId);
  
  if (projectIndex === -1) return undefined;
  
  const queryIndex = projects[projectIndex].queries.findIndex(q => q.id === queryId);
  if (queryIndex === -1) return undefined;
  
  projects[projectIndex].queries[queryIndex] = {
    ...projects[projectIndex].queries[queryIndex],
    ...updates,
    updated: new Date().toISOString()
  };
  
  projects[projectIndex].updated = new Date().toISOString();
  localStorage.setItem('sqlProjects', JSON.stringify(projects));
  
  return projects[projectIndex].queries[queryIndex];
};

export const removeQueryFromProject = (projectId: string, queryId: string): boolean => {
  const projects = getProjects();
  const projectIndex = projects.findIndex(p => p.id === projectId);
  
  if (projectIndex === -1) return false;
  
  const originalLength = projects[projectIndex].queries.length;
  projects[projectIndex].queries = projects[projectIndex].queries.filter(q => q.id !== queryId);
  
  if (projects[projectIndex].queries.length === originalLength) return false;
  
  projects[projectIndex].updated = new Date().toISOString();
  localStorage.setItem('sqlProjects', JSON.stringify(projects));
  
  return true;
};

export const getProjectQueries = (projectId: string): ProjectQuery[] => {
  const project = getProject(projectId);
  return project?.queries || [];
};

export const getQueryFromProject = (projectId: string, queryId: string): ProjectQuery | undefined => {
  const project = getProject(projectId);
  if (!project) return undefined;
  
  return project.queries.find(q => q.id === queryId);
};

export const getAllQueries = (): { projectId: string, query: ProjectQuery }[] => {
  const projects = getProjects();
  
  return projects.flatMap(project => 
    project.queries.map(query => ({
      projectId: project.id,
      query
    }))
  );
};

export const getFavoriteQueries = (): { projectId: string, query: ProjectQuery }[] => {
  const allQueries = getAllQueries();
  return allQueries.filter(({ query }) => query.favorite);
};

// Link analysis results to queries
export const linkAnalysisToQuery = (
  projectId: string, 
  queryId: string, 
  analysisId: string
): boolean => {
  const projects = getProjects();
  const projectIndex = projects.findIndex(p => p.id === projectId);
  
  if (projectIndex === -1) return false;
  
  const queryIndex = projects[projectIndex].queries.findIndex(q => q.id === queryId);
  if (queryIndex === -1) return false;
  
  projects[projectIndex].queries[queryIndex].lastAnalysisId = analysisId;
  projects[projectIndex].queries[queryIndex].updated = new Date().toISOString();
  projects[projectIndex].updated = new Date().toISOString();
  
  localStorage.setItem('sqlProjects', JSON.stringify(projects));
  return true;
};

// Create a default project if none exists
export const ensureDefaultProject = (): Project => {
  const projects = getProjects();
  
  if (projects.length === 0) {
    return createProject('Default Project', 'Your default SQL analysis project');
  }
  
  return projects[0];
};
