import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Bot,
  Zap,
  Activity,
  FileText,
  Rocket,
  Loader2,
} from "lucide-react";
import {
  useAgents,
  useSkills,
  useExecutions,
  useRunAgent,
  useRunAllAgents,
  useToggleAgent,
  useCreateSkill,
  useDeleteSkill,
} from "@/hooks/use-agents";
import { AgentCard } from "@/components/agents/AgentCard";
import { AgentDetailSheet } from "@/components/agents/AgentDetailSheet";
import { ExecutionTimeline } from "@/components/agents/ExecutionTimeline";
import { SkillManager } from "@/components/agents/SkillManager";
import { RunAgentDialog } from "@/components/agents/RunAgentDialog";
import { CreateSkillDialog } from "@/components/agents/CreateSkillDialog";
import { ImportSkillDialog } from "@/components/agents/ImportSkillDialog";
import { SkillDetailSheet } from "@/components/agents/SkillDetailSheet";
import type { AgentDefinition, AgentSkill } from "@/types/agents";

export default function AgentHubPage() {
  const { toast } = useToast();

  // Data
  const { data: agents = [], isLoading: agentsLoading } = useAgents();
  const { data: skills = [], isLoading: skillsLoading } = useSkills();
  const { data: executions = [], isLoading: execLoading } = useExecutions(30);

  // Mutations
  const runAgent = useRunAgent();
  const runAll = useRunAllAgents();
  const toggleAgent = useToggleAgent();
  const createSkill = useCreateSkill();
  const deleteSkill = useDeleteSkill();

  // UI state
  const [runDialogAgent, setRunDialogAgent] = useState<AgentDefinition | null>(null);
  const [detailAgent, setDetailAgent] = useState<AgentDefinition | null>(null);
  const [showCreateSkill, setShowCreateSkill] = useState(false);
  const [showImportSkill, setShowImportSkill] = useState(false);
  const [viewSkill, setViewSkill] = useState<AgentSkill | null>(null);
  const [runningAgentSlug, setRunningAgentSlug] = useState<string | null>(null);

  const handleRunAgent = async (agentSlug: string, message: string, model?: string) => {
    setRunningAgentSlug(agentSlug);
    setRunDialogAgent(null);
    try {
      const result = await runAgent.mutateAsync({ agent_slug: agentSlug, message, model });
      toast({
        title: `${result.agent_name} completed`,
        description: `Created ${result.proposals_created} proposals in ${(result.duration_ms / 1000).toFixed(1)}s`,
      });
    } catch (err: any) {
      toast({
        title: "Agent failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setRunningAgentSlug(null);
    }
  };

  const handleRunAll = async () => {
    try {
      const result = await runAll.mutateAsync({});
      toast({
        title: "All agents completed",
        description: `${result.agents_run} agents ran, ${result.total_proposals_created} proposals created`,
      });
    } catch (err: any) {
      toast({
        title: "Proactive run failed",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleToggle = (agent: AgentDefinition, enabled: boolean) => {
    toggleAgent.mutate({ id: agent.id, enabled });
  };

  const handleCreateSkill = (skill: {
    name: string;
    slug: string;
    description: string;
    category: AgentSkill["category"];
  }) => {
    createSkill.mutate(skill, {
      onSuccess: () => {
        setShowCreateSkill(false);
        toast({ title: "Skill created", description: `${skill.name} is now available.` });
      },
      onError: (err) => {
        toast({ title: "Failed to create skill", description: err.message, variant: "destructive" });
      },
    });
  };

  const handleDeleteSkill = (id: string) => {
    deleteSkill.mutate(id, {
      onSuccess: () => toast({ title: "Skill deleted" }),
    });
  };

  // Stats
  const todayExecutions = executions.filter(
    (e) => new Date(e.created_at).toDateString() === new Date().toDateString()
  );
  const totalProposalsToday = todayExecutions.reduce(
    (sum, e) => sum + e.proposals_created,
    0
  );

  const isLoading = agentsLoading || skillsLoading;

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Bot className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Agent Hub</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Multi-agent AI system. Agents analyze your data, identify opportunities, and create actionable proposals.
          </p>
        </div>
        <Button onClick={handleRunAll} disabled={runAll.isPending} size="sm">
          {runAll.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Rocket className="h-4 w-4 mr-2" />
          )}
          Run All Agents
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Stats Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <Bot className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{agents.length}</p>
                  <p className="text-xs text-muted-foreground">Active Agents</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <Zap className="h-8 w-8 text-amber-400" />
                <div>
                  <p className="text-2xl font-bold">{skills.length}</p>
                  <p className="text-xs text-muted-foreground">Skills</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <Activity className="h-8 w-8 text-green-400" />
                <div>
                  <p className="text-2xl font-bold">{todayExecutions.length}</p>
                  <p className="text-xs text-muted-foreground">Runs Today</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <FileText className="h-8 w-8 text-blue-400" />
                <div>
                  <p className="text-2xl font-bold">{totalProposalsToday}</p>
                  <p className="text-xs text-muted-foreground">Proposals Today</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Agent Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {agents.map((agent) => {
              const lastExec = executions.find((e) => e.agent_slug === agent.slug);
              return (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  lastExecution={lastExec}
                  onRun={(a) => setRunDialogAgent(a)}
                  onToggle={handleToggle}
                  onViewDetail={(a) => setDetailAgent(a)}
                  isRunning={runningAgentSlug === agent.slug}
                />
              );
            })}
          </div>

          {/* Bottom Row: Timeline + Skills */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ExecutionTimeline executions={executions} isLoading={execLoading} />
            <SkillManager
              skills={skills}
              onCreateSkill={() => setShowCreateSkill(true)}
              onImportSkill={() => setShowImportSkill(true)}
              onDeleteSkill={handleDeleteSkill}
              onViewSkill={(s) => setViewSkill(s)}
            />
          </div>
        </>
      )}

      {/* Dialogs */}
      <RunAgentDialog
        agent={runDialogAgent}
        open={!!runDialogAgent}
        onOpenChange={(open) => { if (!open) setRunDialogAgent(null); }}
        onRun={handleRunAgent}
        isRunning={runAgent.isPending}
      />

      <AgentDetailSheet
        agent={detailAgent}
        open={!!detailAgent}
        onOpenChange={(open) => { if (!open) setDetailAgent(null); }}
        executions={executions.filter((e) => e.agent_slug === detailAgent?.slug)}
        skills={skills}
      />

      <CreateSkillDialog
        open={showCreateSkill}
        onOpenChange={setShowCreateSkill}
        onSave={handleCreateSkill}
        isLoading={createSkill.isPending}
      />

      <ImportSkillDialog
        open={showImportSkill}
        onOpenChange={setShowImportSkill}
        onImport={(skill) => {
          createSkill.mutate(skill, {
            onSuccess: () => {
              setShowImportSkill(false);
              toast({ title: "Skill imported", description: `${skill.name} is now available.` });
            },
            onError: (err) => {
              toast({ title: "Import failed", description: err.message, variant: "destructive" });
            },
          });
        }}
        isLoading={createSkill.isPending}
      />

      <SkillDetailSheet
        skill={viewSkill}
        open={!!viewSkill}
        onOpenChange={(open) => { if (!open) setViewSkill(null); }}
      />
    </div>
  );
}

