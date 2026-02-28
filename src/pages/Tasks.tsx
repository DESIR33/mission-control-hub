import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Plus, Grid, List, Clock, Building2, User2, GitGraph } from "lucide-react";
import CompanyChip from "@/components/company/CompanyChip";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { KanbanBoard } from "@/components/ui/kanban-board";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import * as z from "zod";

interface TaskWithRelations {
  id: number;
  name: string;
  description: string | null;
  status: string;
  priority: "low" | "medium" | "high";
  dueDate: string;
  assigneeId?: number;
  projectId?: number;
  companyId?: number;
  contactId?: number;
  company?: {
    id: number;
    name: string;
    logo?: string;
  };
  contact?: {
    id: number;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  creator: {
    id: number;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  assignee?: {
    id: number;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  labels?: string[];
}

const taskSchema = z.object({
  name: z.string().min(1, "Task name is required"),
  description: z.string().optional(),
  dueDate: z.string().min(1, "Due date is required"),
  priority: z.enum(["low", "medium", "high"]),
  projectId: z.number().nullable().optional(),
  companyId: z.number().nullable().optional(),
  contactId: z.number().nullable().optional(),
});

const statuses = [
  { id: "pending", name: "To Do", color: "#6B7280" },
  { id: "in_progress", name: "In Progress", color: "#F59E0B" },
  { id: "completed", name: "Completed", color: "#10B981" },
];

export default function Tasks() {
  const [currentView, setCurrentView] = useState<"board" | "list">("board");
  const navigate = useNavigate();
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all tasks
  const { data: allTasks = [], isLoading: isTasksLoading } = useQuery<TaskWithRelations[]>({
    queryKey: ["/api/tasks-extended"],
    queryFn: async () => {
      const response = await fetch("/api/tasks-extended", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch tasks");
      return response.json();
    },
  });

  // Fetch projects for filter
  const { data: projects = [], isLoading: isProjectsLoading } = useQuery({
    queryKey: ["/api/projects"],
    queryFn: async () => {
      const response = await fetch("/api/projects", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch projects");
      return response.json();
    },
  });

  // Fetch project specific tasks if a project is selected
  const { data: projectTasks = [], isLoading: isProjectTasksLoading } = useQuery<TaskWithRelations[]>({
    queryKey: [`/api/tasks-extended/project/${selectedProject}`],
    queryFn: async () => {
      const response = await fetch(`/api/tasks-extended/project/${selectedProject}`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch project tasks");
      return response.json();
    },
    enabled: !!selectedProject && selectedProject !== 'all',
  });

  // Determine which tasks to display based on project filter
  const tasksToDisplay = selectedProject && selectedProject !== 'all' ? projectTasks : allTasks;

  // Handle task click to navigate to task detail
  const handleTaskClick = (taskId: number) => {
    navigate(`/tasks/${taskId}`);
  };

  // Handle add task button click
  const handleAddTask = () => {
    if (selectedProject && selectedProject !== 'all') {
      navigate(`/projects/${selectedProject}/tasks/create`);
    } else {
      navigate('/tasks/create');
    }
  };

  // Determine loading state
  const isLoading = isTasksLoading || (selectedProject && selectedProject !== 'all' && isProjectTasksLoading);

  return (
    <div className="container max-w-7xl mx-auto p-6">
      <div className="flex flex-col gap-6">
        {/* Header with actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">Tasks</h1>
            <div className="hidden md:flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate("/projects")}>
                <GitGraph className="h-4 w-4 mr-2" />
                Back to Projects
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 md:gap-2">
              <button
                className={cn(
                  "rounded-md p-1.5 md:p-2",
                  currentView === "list" ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                )}
                onClick={() => setCurrentView("list")}
              >
                <List className="h-3.5 w-3.5 md:h-4 md:w-4" />
              </button>
              <button
                className={cn(
                  "rounded-md p-1.5 md:p-2",
                  currentView === "board" ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                )}
                onClick={() => setCurrentView("board")}
              >
                <Grid className="h-3.5 w-3.5 md:h-4 md:w-4" />
              </button>
            </div>
            <Select
              value={selectedProject}
              onValueChange={setSelectedProject}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Tasks" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tasks</SelectItem>
                {projects.map((project: any) => (
                  <SelectItem key={project.id} value={project.id.toString()}>
                    {project.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleAddTask}>
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </Button>
          </div>
        </div>

        {/* Main content */}
        {isLoading ? (
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border rounded-lg p-4">
                <Skeleton className="h-6 w-1/3 mb-4" />
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((j) => (
                    <Skeleton key={j} className="h-20 w-full" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : currentView === "board" ? (
          <KanbanBoard
            tasks={tasksToDisplay}
            projectId={selectedProject && selectedProject !== 'all' ? parseInt(selectedProject) : undefined}
            onTaskClick={handleTaskClick}
          />
        ) : (
          <div className="space-y-3">
            {tasksToDisplay.map((task) => (
              <div
                key={task.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 md:p-4 rounded-lg border bg-card hover:border-primary cursor-pointer gap-2 sm:gap-4"
                onClick={() => handleTaskClick(task.id)}
              >
                <div className="flex items-start sm:items-center gap-3">
                  <Avatar className="h-8 w-8 hidden sm:flex">
                    {task.creator?.avatar ? (
                      <AvatarImage src={task.creator.avatar} alt={`${task.creator.firstName} ${task.creator.lastName}`} />
                    ) : (
                      <AvatarFallback className="text-xs">
                        {task.creator?.firstName?.[0]}{task.creator?.lastName?.[0]}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-sm md:text-base">{task.name}</h3>
                      <span
                        className={cn("text-[10px] md:text-xs px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-full font-medium", {
                          "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300": task.priority === "high",
                          "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300": task.priority === "medium",
                          "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300": task.priority === "low",
                        })}
                      >
                        {task.priority}
                      </span>
                      <span
                        className={cn("text-[10px] md:text-xs px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-full font-medium", {
                          "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300": task.status === "pending",
                          "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300": task.status === "in_progress",
                          "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300": task.status === "completed",
                        })}
                      >
                        {task.status === "pending" ? "To Do" :
                         task.status === "in_progress" ? "In Progress" :
                         task.status === "completed" ? "Completed" : task.status}
                      </span>
                    </div>
                    {task.description && (
                      <p className="text-xs text-muted-foreground mt-1 hidden sm:block max-w-md">
                        {task.description.length > 100 ? `${task.description.slice(0, 100)}...` : task.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 ml-0 sm:ml-auto mt-2 sm:mt-0">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(task.dueDate), "MMM dd, yyyy")}
                    </span>
                  </div>

                  {task.assignee && (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={task.assignee.avatar} alt={`${task.assignee.firstName} ${task.assignee.lastName}`} />
                        <AvatarFallback className="text-[10px]">
                          {task.assignee.firstName[0]}{task.assignee.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-muted-foreground">
                        {task.assignee.firstName} {task.assignee.lastName}
                      </span>
                    </div>
                  )}

                  {task.companyId && task.company && (
                    <div className="flex items-center gap-1.5">
                      {task.company.logo ? (
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={task.company.logo} alt={task.company.name} />
                          <AvatarFallback className="text-[9px]">
                            {task.company.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      <span className="text-xs text-muted-foreground">
                        {task.company.name}
                      </span>
                    </div>
                  )}

                  {task.companyId && !task.company && (
                    <CompanyChip companyId={task.companyId} />
                  )}

                  {task.contactId && !task.companyId && task.contact && (
                    <div className="flex items-center gap-1">
                      <User2 className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {task.contact.firstName} {task.contact.lastName}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
