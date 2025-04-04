
import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { getProjects, Project, createProject, updateProject, deleteProject, ProjectQuery, addQueryToProject } from '@/utils/projectService';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Platform } from '@/utils/sqlValidator';
import { toast } from 'sonner';
import { Folder, FolderPlus, FileText, Edit, Trash2, Star, Search, Save, PlusCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

const Projects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [newQueryName, setNewQueryName] = useState('');
  const [newQueryDescription, setNewQueryDescription] = useState('');
  const [newQuerySql, setNewQuerySql] = useState('');
  const [newQueryPlatform, setNewQueryPlatform] = useState<Platform>('bigquery');
  const [addQueryDialogOpen, setAddQueryDialogOpen] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = () => {
    const allProjects = getProjects();
    setProjects(allProjects);
    
    // Select the first project by default if there's at least one
    if (allProjects.length > 0 && !selectedProject) {
      setSelectedProject(allProjects[0]);
    }
  };

  const handleCreateProject = () => {
    if (!newProjectName.trim()) {
      toast.error('Project name is required');
      return;
    }

    const newProject = createProject(newProjectName, newProjectDescription);
    setProjects(prev => [...prev, newProject]);
    setSelectedProject(newProject);
    setNewProjectName('');
    setNewProjectDescription('');
    setCreateDialogOpen(false);
    toast.success(`Project "${newProjectName}" created successfully`);
  };

  const handleDeleteProject = (projectId: string, projectName: string) => {
    if (window.confirm(`Are you sure you want to delete the project "${projectName}"?`)) {
      const success = deleteProject(projectId);
      
      if (success) {
        const updatedProjects = projects.filter(p => p.id !== projectId);
        setProjects(updatedProjects);
        
        if (selectedProject?.id === projectId) {
          setSelectedProject(updatedProjects.length > 0 ? updatedProjects[0] : null);
        }
        
        toast.success(`Project "${projectName}" deleted successfully`);
      } else {
        toast.error('Failed to delete project');
      }
    }
  };

  const handleAddQuery = () => {
    if (!selectedProject) {
      toast.error('No project selected');
      return;
    }

    if (!newQueryName.trim()) {
      toast.error('Query name is required');
      return;
    }

    if (!newQuerySql.trim()) {
      toast.error('SQL query is required');
      return;
    }

    const query = addQueryToProject(selectedProject.id, {
      name: newQueryName,
      sql: newQuerySql,
      platform: newQueryPlatform,
      description: newQueryDescription
    });

    if (query) {
      loadProjects(); // Reload to get updated project with new query
      setNewQueryName('');
      setNewQueryDescription('');
      setNewQuerySql('');
      setAddQueryDialogOpen(false);
      toast.success(`Query "${newQueryName}" added to project`);
    } else {
      toast.error('Failed to add query to project');
    }
  };

  const handleQuerySelect = (projectId: string, queryId: string) => {
    // Store the current query in localStorage to load it in the Index page
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    
    const query = project.queries.find(q => q.id === queryId);
    if (!query) return;
    
    localStorage.setItem('currentQuery', JSON.stringify({
      projectId,
      queryId,
      sql: query.sql,
      platform: query.platform,
      name: query.name
    }));
    
    navigate('/');
  };

  const filteredProjects = projects.filter(project => 
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">SQL Projects</h1>
        <p className="text-muted-foreground">
          Organize and manage your SQL queries in projects
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-1/3">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Projects</h2>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <FolderPlus size={16} className="mr-1" />
                  New Project
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Project</DialogTitle>
                  <DialogDescription>
                    Create a new project to organize your SQL queries
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <label htmlFor="name" className="text-sm font-medium">
                      Project Name*
                    </label>
                    <Input
                      id="name"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      placeholder="My SQL Project"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor="description" className="text-sm font-medium">
                      Description
                    </label>
                    <Textarea
                      id="description"
                      value={newProjectDescription}
                      onChange={(e) => setNewProjectDescription(e.target.value)}
                      placeholder="Project description..."
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateProject}>Create Project</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            {filteredProjects.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <Folder className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">
                    {searchTerm
                      ? 'No projects found matching your search'
                      : 'No projects yet. Create your first project!'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredProjects.map((project) => (
                <Card
                  key={project.id}
                  className={`cursor-pointer hover:bg-accent/10 transition-colors ${
                    selectedProject?.id === project.id ? 'border-primary' : ''
                  }`}
                  onClick={() => setSelectedProject(project)}
                >
                  <CardHeader className="py-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-base flex items-center">
                          <Folder size={16} className="mr-2" />
                          {project.name}
                        </CardTitle>
                        {project.description && (
                          <CardDescription className="text-xs mt-1 line-clamp-1">
                            {project.description}
                          </CardDescription>
                        )}
                      </div>
                      <div className="flex items-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProject(project.id, project.name);
                          }}
                        >
                          <Trash2 size={14} className="text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardFooter className="pt-0 pb-3 px-4">
                    <div className="flex items-center text-xs text-muted-foreground justify-between w-full">
                      <span>{project.queries.length} queries</span>
                      <span>
                        {new Date(project.updated).toLocaleDateString()}
                      </span>
                    </div>
                  </CardFooter>
                </Card>
              ))
            )}
          </div>
        </div>

        <div className="w-full md:w-2/3">
          {selectedProject ? (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">{selectedProject.name}</h2>
                <Dialog open={addQueryDialogOpen} onOpenChange={setAddQueryDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <PlusCircle size={16} className="mr-1" />
                      Add Query
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl">
                    <DialogHeader>
                      <DialogTitle>Add New Query to Project</DialogTitle>
                      <DialogDescription>
                        Create a new SQL query in this project
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <label htmlFor="queryName" className="text-sm font-medium">
                            Query Name*
                          </label>
                          <Input
                            id="queryName"
                            value={newQueryName}
                            onChange={(e) => setNewQueryName(e.target.value)}
                            placeholder="My SQL Query"
                          />
                        </div>
                        <div className="grid gap-2">
                          <label htmlFor="platform" className="text-sm font-medium">
                            SQL Platform
                          </label>
                          <select
                            id="platform"
                            value={newQueryPlatform}
                            onChange={(e) => setNewQueryPlatform(e.target.value as Platform)}
                            className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          >
                            <option value="bigquery">Google BigQuery</option>
                            <option value="snowflake">Snowflake</option>
                            <option value="databricks">Databricks</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <label htmlFor="queryDescription" className="text-sm font-medium">
                          Description
                        </label>
                        <Textarea
                          id="queryDescription"
                          value={newQueryDescription}
                          onChange={(e) => setNewQueryDescription(e.target.value)}
                          placeholder="Query description..."
                          rows={2}
                        />
                      </div>
                      <div className="grid gap-2">
                        <label htmlFor="sqlQuery" className="text-sm font-medium">
                          SQL Query*
                        </label>
                        <Textarea
                          id="sqlQuery"
                          value={newQuerySql}
                          onChange={(e) => setNewQuerySql(e.target.value)}
                          placeholder="SELECT * FROM table"
                          rows={10}
                          className="font-mono"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setAddQueryDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddQuery}>
                        <Save size={16} className="mr-1" />
                        Save Query
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <Tabs defaultValue="queries">
                <TabsList className="mb-4">
                  <TabsTrigger value="queries">Queries</TabsTrigger>
                  <TabsTrigger value="info">Project Info</TabsTrigger>
                </TabsList>
                
                <TabsContent value="queries">
                  {selectedProject.queries.length === 0 ? (
                    <Card>
                      <CardContent className="p-10 text-center">
                        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                        <p className="text-muted-foreground">
                          No queries in this project yet. Add your first query!
                        </p>
                        <Button
                          variant="outline"
                          className="mt-4"
                          onClick={() => setAddQueryDialogOpen(true)}
                        >
                          <PlusCircle size={16} className="mr-1" />
                          Add Query
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Platform</TableHead>
                            <TableHead>Last Modified</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedProject.queries.map((query) => (
                            <TableRow 
                              key={query.id}
                              className="cursor-pointer hover:bg-accent/10"
                              onClick={() => handleQuerySelect(selectedProject.id, query.id)}
                            >
                              <TableCell>
                                <div className="font-medium">{query.name}</div>
                                {query.description && (
                                  <div className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                    {query.description}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {query.platform === 'bigquery'
                                    ? 'BigQuery'
                                    : query.platform === 'snowflake'
                                    ? 'Snowflake'
                                    : 'Databricks'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {new Date(query.updated).toLocaleDateString()}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleQuerySelect(selectedProject.id, query.id);
                                  }}
                                >
                                  <Edit size={16} />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="info">
                  <Card>
                    <CardHeader>
                      <CardTitle>Project Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h3 className="text-sm font-medium mb-1">Project Name</h3>
                        <p>{selectedProject.name}</p>
                      </div>
                      
                      {selectedProject.description && (
                        <div>
                          <h3 className="text-sm font-medium mb-1">Description</h3>
                          <p>{selectedProject.description}</p>
                        </div>
                      )}
                      
                      <div>
                        <h3 className="text-sm font-medium mb-1">Created</h3>
                        <p>{new Date(selectedProject.created).toLocaleString()}</p>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium mb-1">Last Updated</h3>
                        <p>{new Date(selectedProject.updated).toLocaleString()}</p>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium mb-1">Queries</h3>
                        <p>{selectedProject.queries.length} queries in this project</p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <Card>
              <CardContent className="p-10 text-center">
                <Folder className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Project Selected</h3>
                <p className="text-muted-foreground mb-4">
                  Select a project from the list or create a new one
                </p>
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <FolderPlus size={16} className="mr-1" />
                  Create New Project
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Projects;
