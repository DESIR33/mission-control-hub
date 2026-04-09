import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useTaskProjects } from "@/hooks/use-task-projects";
import { useTaskDomain } from "@/hooks/use-task-domain";
import { useToast } from "@/hooks/use-toast";

export function CreateProjectDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [domainId, setDomainId] = useState<string>("");
  const { createProject } = useTaskProjects();
  const { domains } = useTaskDomain();
  const { toast } = useToast();

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      await createProject.mutateAsync({
        name: name.trim(),
        description: description.trim() || null,
        domain_id: domainId || null,
        status: "active" as any,
      });
      toast({ title: "Project created" });
      setOpen(false);
      setName("");
      setDescription("");
      setDomainId("");
    } catch {
      toast({ title: "Failed to create project", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" /> New Project
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Project</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Project name" />
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" />
          <Select value={domainId} onValueChange={setDomainId}>
            <SelectTrigger>
              <SelectValue placeholder="Select domain" />
            </SelectTrigger>
            <SelectContent>
              {domains.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleCreate} disabled={!name.trim()} className="w-full">Create</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
