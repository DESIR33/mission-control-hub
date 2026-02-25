import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Building2, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useWorkspaceDetails, useUpdateWorkspace, useUploadLogo } from "@/hooks/use-settings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageUpload } from "./ImageUpload";

export function WorkspaceSection() {
  const { data: workspace, isLoading } = useWorkspaceDetails();
  const update = useUpdateWorkspace();
  const uploadLogo = useUploadLogo();

  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  useEffect(() => {
    if (workspace) {
      setName(workspace.name);
      setLogoUrl(workspace.logo_url ?? "");
    }
  }, [workspace]);

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Workspace name cannot be empty.");
      return;
    }
    update.mutate(
      { name: name.trim(), logo_url: logoUrl || undefined },
      {
        onSuccess: () => toast.success("Workspace updated."),
        onError: (err) => toast.error(`Failed to update workspace: ${err.message}`),
      }
    );
  };

  const handleLogoUpload = async (file: File) => {
    const url = await uploadLogo.mutateAsync(file);
    toast.success("Logo uploaded.");
    return url;
  };

  const isDirty =
    name !== (workspace?.name ?? "") ||
    logoUrl !== (workspace?.logo_url ?? "");

  const wsInitials = name
    ? name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "WS";

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60 mt-1" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-24 w-24 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.05 }}
    >
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            <CardTitle>Workspace</CardTitle>
          </div>
          <CardDescription>
            Customize your workspace name and branding.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo upload */}
          <ImageUpload
            value={logoUrl}
            onChange={setLogoUrl}
            onUpload={handleLogoUpload}
            label="Workspace Logo"
            shape="rounded"
            size="lg"
            fallback={
              <span className="text-lg font-bold text-primary">
                {wsInitials}
              </span>
            }
          />

          <Separator />

          {/* Fields */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="wsName">Workspace Name</Label>
              <Input
                id="wsName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Workspace"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wsSlug">Slug</Label>
              <Input id="wsSlug" value={workspace?.slug ?? ""} disabled />
              <p className="text-xs text-muted-foreground">
                The slug is auto-generated and cannot be changed.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={handleSave} disabled={!isDirty || update.isPending}>
              {update.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Changes
            </Button>
            {isDirty && (
              <span className="text-xs text-muted-foreground">Unsaved changes</span>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
