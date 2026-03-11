import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  fetchProjects,
  fetchProjectDetail,
  type Project,
} from "../lib/api";
import { useAuth } from "./AuthContext";

interface ProjectContextType {
  projects: Project[];
  currentProject: Project | null;
  currentProjectId: string | null;
  loading: boolean;
  error: string | null;
  setCurrentProjectId: (id: string | null) => void;
  refreshProjects: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

// Storage key for persisting last selected project
const PROJECT_STORAGE_KEY = "a11_current_project_id";

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const { authenticated } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [currentProjectId, setCurrentProjectIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setCurrentProjectId = useCallback((id: string | null) => {
    setCurrentProjectIdState(id);
    if (id) {
      localStorage.setItem(PROJECT_STORAGE_KEY, id);
    } else {
      localStorage.removeItem(PROJECT_STORAGE_KEY);
    }
  }, []);

  const refreshProjects = useCallback(async () => {
    if (!authenticated) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProjects();
      setProjects(data);
    } catch (err: any) {
      setError(err.message || "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, [authenticated]);

  // On mount: read projectId from URL or localStorage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlProjectId = params.get("projectId");

    if (urlProjectId) {
      setCurrentProjectId(urlProjectId);
      // Clean projectId from URL
      const url = new URL(window.location.href);
      url.searchParams.delete("projectId");
      window.history.replaceState({}, "", url.toString());
    } else {
      const stored = localStorage.getItem(PROJECT_STORAGE_KEY);
      if (stored) {
        setCurrentProjectIdState(stored);
      }
    }
  }, [setCurrentProjectId]);

  // Fetch project list when authenticated
  useEffect(() => {
    if (authenticated) {
      refreshProjects();
    }
  }, [authenticated, refreshProjects]);

  // Fetch project detail when currentProjectId changes
  useEffect(() => {
    if (!currentProjectId || !authenticated) {
      setCurrentProject(null);
      return;
    }

    // First try to find in loaded list
    const found = projects.find((p) => String(p.id) === currentProjectId);
    if (found) {
      setCurrentProject(found);
      return;
    }

    // Otherwise fetch from API
    fetchProjectDetail(currentProjectId).then((project) => {
      if (project) {
        setCurrentProject(project);
      }
    });
  }, [currentProjectId, projects, authenticated]);

  return (
    <ProjectContext.Provider
      value={{
        projects,
        currentProject,
        currentProjectId,
        loading,
        error,
        setCurrentProjectId,
        refreshProjects,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProject must be used within ProjectProvider");
  }
  return context;
}
