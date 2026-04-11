import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, DollarSign, TrendingUp, Users, Building2, CheckSquare, BarChart3, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskDomainProvider } from "@/hooks/use-task-domain";
import { useTasks } from "@/hooks/use-tasks";
import { QuickAddTask } from "@/components/tasks/QuickAddTask";
import { TaskListView } from "@/components/tasks/TaskListView";
import { useProjectExpenses, useProjectRevenue, useProjectDeals, useProjectContacts, useProjectCompanies } from "@/hooks/use-project-data";
import { LinkContactDialog } from "@/components/projects/LinkContactDialog";
import { LinkCompanyDialog } from "@/components/projects/LinkCompanyDialog";
import type { TaskProject } from "@/types/tasks";
import { format } from "date-fns";

function ProjectDetailContent() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false);

  const { data: project } = useQuery({
    queryKey: ["task-project", projectId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("task_projects").select("*").eq("id", projectId).single();
      if (error) throw error;
      return data as TaskProject;
    },
    enabled: !!projectId,
  });

  const { tasks, isLoading: tasksLoading } = useTasks({ project_id: projectId || undefined, parent_task_id: null });
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

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/tasks/projects")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          {project?.color && <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: project.color }} />}
          <h1 className="text-2xl font-bold">{project?.name || "Project"}</h1>
        </div>
      </div>

      {project?.description && (
        <p className="text-sm text-muted-foreground max-w-2xl">{project.description}</p>
      )}

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="overview"><BarChart3 className="w-3.5 h-3.5 mr-1.5" />Overview</TabsTrigger>
          <TabsTrigger value="tasks"><CheckSquare className="w-3.5 h-3.5 mr-1.5" />Tasks</TabsTrigger>
          <TabsTrigger value="expenses"><DollarSign className="w-3.5 h-3.5 mr-1.5" />Expenses</TabsTrigger>
          <TabsTrigger value="income"><TrendingUp className="w-3.5 h-3.5 mr-1.5" />Income</TabsTrigger>
          <TabsTrigger value="contacts"><Users className="w-3.5 h-3.5 mr-1.5" />Contacts</TabsTrigger>
          <TabsTrigger value="companies"><Building2 className="w-3.5 h-3.5 mr-1.5" />Companies</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Total Revenue</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold text-emerald-500">${totalRevenue.toLocaleString()}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Total Expenses</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold text-red-400">${totalExpenses.toLocaleString()}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Net Profit</CardTitle></CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${netProfit >= 0 ? "text-emerald-500" : "text-red-400"}`}>
                  ${Math.abs(netProfit).toLocaleString()}
                  {netProfit < 0 && <span className="text-sm ml-1">loss</span>}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Pipeline Value</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold text-primary">${totalDealsValue.toLocaleString()}</p></CardContent>
            </Card>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { count: tasks.length, label: "Tasks" },
              { count: deals.length, label: "Deals" },
              { count: contacts.length, label: "Contacts" },
              { count: companies.length, label: "Companies" },
            ].map((item) => (
              <Card key={item.label} className="cursor-pointer hover:bg-muted/30 transition-colors">
                <CardContent className="pt-4 text-center">
                  <p className="text-3xl font-bold">{item.count}</p>
                  <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="space-y-4">
          <QuickAddTask projectId={projectId} />
          {tasksLoading ? (
            <div className="text-muted-foreground text-sm py-10 text-center">Loading...</div>
          ) : (
            <TaskListView tasks={tasks} onTaskClick={(id) => navigate(`/tasks/${id}`)} />
          )}
        </TabsContent>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="space-y-4">
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
                      <p className="text-xs text-muted-foreground">{e.expense_date ? format(new Date(e.expense_date), "MMM d, yyyy") : "No date"}</p>
                    </div>
                    <p className="text-sm font-semibold text-red-400">-${(e.amount || 0).toLocaleString()}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Income Tab */}
        <TabsContent value="income" className="space-y-4">
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
                      <p className="text-xs text-muted-foreground">{r.transaction_date ? format(new Date(r.transaction_date), "MMM d, yyyy") : "No date"}</p>
                    </div>
                    <p className="text-sm font-semibold text-emerald-500">+${(r.amount || 0).toLocaleString()}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Contacts Tab */}
        <TabsContent value="contacts" className="space-y-4">
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
                    <div
                      className="flex-1 flex items-center gap-3 cursor-pointer min-w-0"
                      onClick={() => navigate(`/contacts/${link.contacts?.id}`)}
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                        {(link.contacts?.first_name?.[0] || "?").toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{link.contacts?.first_name} {link.contacts?.last_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{link.contacts?.email || link.role || ""}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => unlinkContact.mutate(link.id)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Companies Tab */}
        <TabsContent value="companies" className="space-y-4">
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
                    <div
                      className="flex-1 flex items-center gap-3 cursor-pointer min-w-0"
                      onClick={() => navigate(`/companies/${link.companies?.id}`)}
                    >
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
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => unlinkCompany.mutate(link.id)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

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
