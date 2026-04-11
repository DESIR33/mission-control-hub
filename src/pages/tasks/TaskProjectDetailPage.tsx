import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft, FolderKanban, DollarSign, TrendingUp, Users, Building2,
  CheckSquare, BarChart3, Plus, X, List, Grid, Calendar, Search, Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskDomainProvider } from "@/hooks/use-task-domain";
import { useTasks } from "@/hooks/use-tasks";
import { QuickAddTask } from "@/components/tasks/QuickAddTask";
import { TaskListView } from "@/components/tasks/TaskListView";
import { TaskKanbanView } from "@/components/tasks/TaskKanbanView";
import { TaskCalendarView } from "@/components/tasks/TaskCalendarView";
import { TaskEditDialog } from "@/components/spaces/TaskEditDialog";
import { useProjectExpenses, useProjectRevenue, useProjectDeals, useProjectContacts, useProjectCompanies } from "@/hooks/use-project-data";
import { LinkContactDialog } from "@/components/projects/LinkContactDialog";
import { LinkCompanyDialog } from "@/components/projects/LinkCompanyDialog";
import type { TaskProject, Task, TaskFilters } from "@/types/tasks";
import { safeFormat } from "@/lib/date-utils";

function ProjectDetailContent() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("summary");
  const [search, setSearch] = useState("");
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ["task-project", projectId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("task_projects").select("*").eq("id", projectId).single();
      if (error) throw error;
      return data as TaskProject;
    },
    enabled: !!projectId,
  });

  const filters: TaskFilters = useMemo(() => ({
    project_id: projectId || undefined,
    search: search || undefined,
    parent_task_id: null,
  }), [projectId, search]);

  const { tasks, isLoading: tasksLoading } = useTasks(filters);
  const { data: expenses = [] } = useProjectExpenses(projectId);
  const { data: revenue = [] } = useProjectRevenue(projectId);
  const { data: deals = [] } = useProjectDeals(projectId);
  const { contacts, linkContact, unlinkContact } = useProjectContacts(projectId);
  const { companies, linkCompany, unlinkCompany } = useProjectCompanies(projectId);

  const totalExpenses = expenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
  const totalRevenue = revenue.reduce((sum: number, r: any) => sum + (r.amount || 0), 0);
  const totalDealsValue = deals.reduce((sum: number, d: any) => sum + (d.value || 0), 0);
  const netProfit = totalRevenue - totalExpenses;

  const linkedContactIds = contacts.map((c: any) => c.contacts?.id).filter(Boolean);
  const linkedCompanyIds = companies.map((c: any) => c.companies?.id).filter(Boolean);

  const handleTaskClick = (taskId: string) => navigate(`/tasks/${taskId}`);
  const handleTaskEdit = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (task) setEditingTask(task);
  };

  if (projectLoading) {
    return (
      <div className="space-y-4 max-w-7xl mx-auto">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Project not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/tasks/projects")}>
          Back to Projects
        </Button>
      </div>
    );
  }

  // Determine which tabs show task views (with search + quick add)
  const taskViewTabs = ["list", "board", "calendar"];
  const isTaskView = taskViewTabs.includes(activeTab);

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header — matches Space detail */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/tasks/projects")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg"
            style={{ backgroundColor: project.color ? `${project.color}20` : undefined }}
          >
            <FolderKanban className="w-5 h-5" style={{ color: project.color || undefined }} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Projects</p>
            <h1 className="text-xl font-bold text-foreground">{project.name}</h1>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <TabsList>
            <TabsTrigger value="summary" className="gap-1.5">
              <Layers className="w-3.5 h-3.5" /> Summary
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-1.5">
              <List className="w-3.5 h-3.5" /> List
            </TabsTrigger>
            <TabsTrigger value="board" className="gap-1.5">
              <Grid className="w-3.5 h-3.5" /> Board
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Calendar
            </TabsTrigger>
            <TabsTrigger value="expenses" className="gap-1.5">
              <DollarSign className="w-3.5 h-3.5" /> Expenses
            </TabsTrigger>
            <TabsTrigger value="income" className="gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" /> Income
            </TabsTrigger>
            <TabsTrigger value="contacts" className="gap-1.5">
              <Users className="w-3.5 h-3.5" /> Contacts
            </TabsTrigger>
            <TabsTrigger value="companies" className="gap-1.5">
              <Building2 className="w-3.5 h-3.5" /> Companies
            </TabsTrigger>
          </TabsList>

          {isTaskView && (
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks..." className="pl-9" />
            </div>
          )}
        </div>

        {isTaskView && (
          <div className="mt-3">
            <QuickAddTask projectId={projectId} />
          </div>
        )}

        {/* Summary Tab */}
        <TabsContent value="summary" className="mt-4 space-y-4">
          {project.description && (
            <p className="text-sm text-muted-foreground">{project.description}</p>
          )}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Total Revenue</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold font-mono text-emerald-500">${totalRevenue.toLocaleString()}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Total Expenses</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold font-mono text-red-400">${totalExpenses.toLocaleString()}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Net Profit</CardTitle></CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold font-mono ${netProfit >= 0 ? "text-emerald-500" : "text-red-400"}`}>
                  ${Math.abs(netProfit).toLocaleString()}
                  {netProfit < 0 && <span className="text-sm ml-1">loss</span>}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Pipeline Value</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold font-mono text-primary">${totalDealsValue.toLocaleString()}</p></CardContent>
            </Card>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { count: tasks.length, label: "Tasks" },
              { count: deals.length, label: "Deals" },
              { count: contacts.length, label: "Contacts" },
              { count: companies.length, label: "Companies" },
            ].map((item) => (
              <Card key={item.label}>
                <CardContent className="pt-4 text-center">
                  <p className="text-3xl font-bold font-mono">{item.count}</p>
                  <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* List Tab */}
        <TabsContent value="list" className="mt-4">
          {tasksLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <TaskListView tasks={tasks} onTaskClick={handleTaskClick} onTaskEdit={handleTaskEdit} />
          )}
        </TabsContent>

        {/* Board Tab */}
        <TabsContent value="board" className="mt-4">
          {tasksLoading ? (
            <Skeleton className="h-[400px] w-full" />
          ) : (
            <TaskKanbanView tasks={tasks} onTaskClick={handleTaskClick} />
          )}
        </TabsContent>

        {/* Calendar Tab */}
        <TabsContent value="calendar" className="mt-4">
          {tasksLoading ? (
            <Skeleton className="h-[400px] w-full" />
          ) : (
            <TaskCalendarView tasks={tasks} onTaskClick={handleTaskClick} />
          )}
        </TabsContent>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">{expenses.length} expense{expenses.length !== 1 ? "s" : ""} · ${totalExpenses.toLocaleString()}</h3>
          </div>
          {expenses.length === 0 ? (
            <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">No expenses linked to this project yet. Tag expenses from the Finance Hub.</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {expenses.map((e: any) => (
                <Card key={e.id} className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => navigate("/expenses")}>
                  <CardContent className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{e.title || e.vendor || "Expense"}</p>
                      <p className="text-xs text-muted-foreground">{e.expense_date ? safeFormat(e.expense_date, "MMM d, yyyy") : "No date"}</p>
                    </div>
                    <p className="text-sm font-semibold font-mono text-red-400">-${(e.amount || 0).toLocaleString()}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Income Tab */}
        <TabsContent value="income" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">{revenue.length} transaction{revenue.length !== 1 ? "s" : ""} · ${totalRevenue.toLocaleString()}</h3>
          </div>
          {revenue.length === 0 ? (
            <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">No income linked to this project yet. Tag revenue from the Finance Hub.</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {revenue.map((r: any) => (
                <Card key={r.id} className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => navigate("/revenue")}>
                  <CardContent className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{r.description || r.source || "Revenue"}</p>
                      <p className="text-xs text-muted-foreground">{r.transaction_date ? safeFormat(r.transaction_date, "MMM d, yyyy") : "No date"}</p>
                    </div>
                    <p className="text-sm font-semibold font-mono text-emerald-500">+${(r.amount || 0).toLocaleString()}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Contacts Tab */}
        <TabsContent value="contacts" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">{contacts.length} linked contact{contacts.length !== 1 ? "s" : ""}</h3>
            <Button size="sm" variant="outline" onClick={() => setContactDialogOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />Link Contact
            </Button>
          </div>
          {contacts.length === 0 ? (
            <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">No contacts linked yet. Click "Link Contact" to add one.</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {contacts.map((link: any) => (
                <Card key={link.id} className="hover:bg-muted/30 transition-colors">
                  <CardContent className="py-3 flex items-center gap-3">
                    <div className="flex-1 flex items-center gap-3 cursor-pointer min-w-0" onClick={() => navigate(`/contacts/${link.contacts?.id}`)}>
                      <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                        {(link.contacts?.first_name?.[0] || "?").toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{link.contacts?.first_name} {link.contacts?.last_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{link.contacts?.email || link.role || ""}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => unlinkContact.mutate(link.id)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Companies Tab */}
        <TabsContent value="companies" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">{companies.length} linked compan{companies.length !== 1 ? "ies" : "y"}</h3>
            <Button size="sm" variant="outline" onClick={() => setCompanyDialogOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />Link Company
            </Button>
          </div>
          {companies.length === 0 ? (
            <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">No companies linked yet. Click "Link Company" to add one.</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {companies.map((link: any) => (
                <Card key={link.id} className="hover:bg-muted/30 transition-colors">
                  <CardContent className="py-3 flex items-center gap-3">
                    <div className="flex-1 flex items-center gap-3 cursor-pointer min-w-0" onClick={() => navigate(`/companies/${link.companies?.id}`)}>
                      {link.companies?.logo_url ? (
                        <img src={link.companies.logo_url} alt="" className="w-8 h-8 rounded object-contain shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                          {(link.companies?.name?.[0] || "?").toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{link.companies?.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{link.companies?.industry || link.role || ""}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => unlinkCompany.mutate(link.id)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <LinkContactDialog
        open={contactDialogOpen}
        onOpenChange={setContactDialogOpen}
        onLink={(contactId) => linkContact.mutate({ contactId })}
        linkedContactIds={linkedContactIds}
      />
      <LinkCompanyDialog
        open={companyDialogOpen}
        onOpenChange={setCompanyDialogOpen}
        onLink={(companyId) => linkCompany.mutate({ companyId })}
        linkedCompanyIds={linkedCompanyIds}
      />
      <TaskEditDialog
        task={editingTask}
        open={!!editingTask}
        onOpenChange={(open) => { if (!open) setEditingTask(null); }}
      />
    </div>
  );
}

export default function TaskProjectDetailPage() {
  return (
    <TaskDomainProvider>
      <ProjectDetailContent />
    </TaskDomainProvider>
  );
}
