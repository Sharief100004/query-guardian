
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Database, BarChart3, Settings, AlertTriangle, FileText, Home, Code, FolderOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from "@/components/ui/button";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  
  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };
  
  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar */}
      <div className={`${collapsed ? 'w-16' : 'w-64'} glass-sidebar flex flex-col shadow-xl transition-all duration-300 ease-in-out z-10`}>
        <div className="p-4 blue-header-gradient border-b border-white/5">
          <Link to="/" className="flex items-center justify-center space-x-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-sm bg-white/10 neon-glow">
              <Database size={22} className="text-primary" />
            </div>
            {!collapsed && <span className="font-bold text-xl text-white">QueryGuardian</span>}
          </Link>
        </div>
        <nav className="flex-1 p-3">
          <ul className="space-y-1">
            <li>
              <Link
                to="/"
                className={`flex items-center ${collapsed ? 'justify-center' : 'justify-start'} p-3 rounded-lg transition-all duration-200 ${
                  isActive('/') 
                    ? 'bg-primary/20 text-white' 
                    : 'hover:bg-sidebar-accent/20 text-foreground'
                }`}
              >
                <Code size={20} className={isActive('/') ? 'text-primary' : 'text-primary/70'} />
                {!collapsed && <span className="ml-3">SQL Validator</span>}
              </Link>
            </li>
            <li>
              <Link
                to="/dashboard"
                className={`flex items-center ${collapsed ? 'justify-center' : 'justify-start'} p-3 rounded-lg transition-all duration-200 ${
                  isActive('/dashboard') 
                    ? 'bg-primary/20 text-white' 
                    : 'hover:bg-sidebar-accent/20 text-foreground'
                }`}
              >
                <Home size={20} className={isActive('/dashboard') ? 'text-primary' : 'text-primary/70'} />
                {!collapsed && <span className="ml-3">Dashboard</span>}
              </Link>
            </li>
            <li>
              <Link
                to="/reports"
                className={`flex items-center ${collapsed ? 'justify-center' : 'justify-start'} p-3 rounded-lg transition-all duration-200 ${
                  isActive('/reports') 
                    ? 'bg-primary/20 text-white' 
                    : 'hover:bg-sidebar-accent/20 text-foreground'
                }`}
              >
                <FileText size={20} className={isActive('/reports') ? 'text-primary' : 'text-primary/70'} />
                {!collapsed && <span className="ml-3">Reports</span>}
              </Link>
            </li>
            <li>
              <Link
                to="/projects"
                className={`flex items-center ${collapsed ? 'justify-center' : 'justify-start'} p-3 rounded-lg transition-all duration-200 ${
                  isActive('/projects') 
                    ? 'bg-primary/20 text-white' 
                    : 'hover:bg-sidebar-accent/20 text-foreground'
                }`}
              >
                <FolderOpen size={20} className={isActive('/projects') ? 'text-primary' : 'text-primary/70'} />
                {!collapsed && <span className="ml-3">Projects</span>}
              </Link>
            </li>
            <li>
              <Link
                to="/settings"
                className={`flex items-center ${collapsed ? 'justify-center' : 'justify-start'} p-3 rounded-lg transition-all duration-200 ${
                  isActive('/settings') 
                    ? 'bg-primary/20 text-white' 
                    : 'hover:bg-sidebar-accent/20 text-foreground'
                }`}
              >
                <Settings size={20} className={isActive('/settings') ? 'text-primary' : 'text-primary/70'} />
                {!collapsed && <span className="ml-3">Settings</span>}
              </Link>
            </li>
          </ul>
        </nav>
        <div className="p-3 mt-auto">
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-start'} text-xs text-muted-foreground backdrop-blur-sm bg-primary/5 px-3 py-2 rounded-lg`}>
            <AlertTriangle size={14} className="text-primary" />
            {!collapsed && <span className="ml-2">Beta Version 0.1.0</span>}
          </div>
        </div>
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 bg-card p-1 rounded-full border border-white/10 shadow-lg"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-x-hidden hero-bg">
        <main className="p-0 fade-in relative">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
