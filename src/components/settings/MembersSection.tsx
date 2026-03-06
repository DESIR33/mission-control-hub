import { useState } from "react";
import { motion } from "framer-motion";
import {
  Users,
  UserPlus,
  Loader2,
  Shield,
  ShieldCheck,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import {
  useWorkspaceMembers,
  useUpdateMemberRole,
  useRemoveMember,
  useInviteMember,
  useLookupUserByEmail,
  type MemberRole,
  type MemberWithProfile,
} from "@/hooks/use-settings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const ROLES: { value: MemberRole; label: string; description: string; icon: React.ElementType }[] = [
  { value: "admin", label: "Admin", description: "Full access to all settings and members", icon: ShieldCheck },
  { value: "operator", label: "Operator", description: "Can manage contacts, deals, and content", icon: Shield },
  { value: "contributor", label: "Contributor", description: "Can create and edit records", icon: Pencil },
  { value: "viewer", label: "Viewer", description: "Read-only access to workspace data", icon: Eye },
];

const roleBadgeVariant = (role: MemberRole) => {
  switch (role) {
    case "admin":
      return "default" as const;
    case "operator":
      return "secondary" as const;
    case "contributor":
      return "outline" as const;
    default:
      return "outline" as const;
  }
};

function MemberRow({
  member,
  isCurrentUser,
  onRoleChange,
  onRemove,
  isUpdating,
}: {
  member: MemberWithProfile;
  isCurrentUser: boolean;
  onRoleChange: (memberId: string, role: MemberRole) => void;
  onRemove: (member: MemberWithProfile) => void;
  isUpdating: boolean;
}) {
  const name = member.profile?.full_name || member.profile?.email || "Unknown";
  const email = member.profile?.email ?? "";
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex items-start sm:items-center gap-3 py-3 px-1">
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarImage src={member.profile?.avatar_url ?? undefined} />
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {name}
          {isCurrentUser && (
            <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>
          )}
        </p>
        <p className="text-xs text-muted-foreground truncate">{email}</p>
        {/* Role shown below name on mobile */}
        <div className="flex items-center gap-2 mt-1.5 sm:hidden">
          {isCurrentUser ? (
            <Badge variant={roleBadgeVariant(member.role)} className="capitalize">
              {member.role}
            </Badge>
          ) : (
            <Select
              value={member.role}
              onValueChange={(v) => onRoleChange(member.id, v as MemberRole)}
              disabled={isUpdating}
            >
              <SelectTrigger className="w-[120px] h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    <span className="flex items-center gap-1.5 capitalize">
                      <r.icon className="w-3.5 h-3.5" />
                      {r.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Role shown inline on desktop */}
      <div className="hidden sm:flex items-center gap-2 shrink-0">
        {isCurrentUser ? (
          <Badge variant={roleBadgeVariant(member.role)} className="capitalize">
            {member.role}
          </Badge>
        ) : (
          <Select
            value={member.role}
            onValueChange={(v) => onRoleChange(member.id, v as MemberRole)}
            disabled={isUpdating}
          >
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  <span className="flex items-center gap-1.5 capitalize">
                    <r.icon className="w-3.5 h-3.5" />
                    {r.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {!isCurrentUser && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
          onClick={() => onRemove(member)}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}

export function MembersSection() {
  const { user } = useAuth();
  const { data: members, isLoading } = useWorkspaceMembers();
  const updateRole = useUpdateMemberRole();
  const removeMember = useRemoveMember();
  const inviteMember = useInviteMember();
  const lookupUser = useLookupUserByEmail();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<MemberRole>("viewer");

  // Remove confirmation
  const [removeTarget, setRemoveTarget] = useState<MemberWithProfile | null>(null);

  const handleRoleChange = (memberId: string, role: MemberRole) => {
    updateRole.mutate(
      { memberId, role },
      {
        onSuccess: () => toast.success("Role updated."),
        onError: (err) => toast.error(`Failed: ${err.message}`),
      }
    );
  };

  const confirmRemove = () => {
    if (!removeTarget) return;
    removeMember.mutate(removeTarget.id, {
      onSuccess: () => {
        const name = removeTarget.profile?.full_name || removeTarget.profile?.email || "Member";
        toast.success(`${name} has been removed.`);
        setRemoveTarget(null);
      },
      onError: (err) => toast.error(`Failed: ${err.message}`),
    });
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;

    lookupUser.mutate(inviteEmail.trim(), {
      onSuccess: (profile) => {
        if (!profile) {
          toast.error("No user found with that email. They must sign up first.");
          return;
        }

        // Check if already a member
        if (members?.some((m) => m.user_id === profile.user_id)) {
          toast.error("This user is already a member of this workspace.");
          return;
        }

        inviteMember.mutate(
          { userId: profile.user_id, role: inviteRole },
          {
            onSuccess: () => {
              toast.success(`${profile.full_name || profile.email} has been added.`);
              setInviteOpen(false);
              setInviteEmail("");
              setInviteRole("viewer");
            },
            onError: (err) => toast.error(`Invite failed: ${err.message}`),
          }
        );
      },
      onError: (err) => toast.error(`Lookup failed: ${err.message}`),
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60 mt-1" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.1 }}
    >
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <CardTitle>Members</CardTitle>
              {members && members.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {members.length}
                </Badge>
              )}
            </div>
            <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite Member
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite a Member</DialogTitle>
                  <DialogDescription>
                    Enter the email of an existing user to add them to this workspace.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label htmlFor="inviteEmail">Email Address</Label>
                    <Input
                      id="inviteEmail"
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="colleague@example.com"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && inviteEmail.trim()) handleInvite();
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="inviteRole">Role</Label>
                    <Select
                      value={inviteRole}
                      onValueChange={(v) => setInviteRole(v as MemberRole)}
                    >
                      <SelectTrigger id="inviteRole">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            <span className="flex items-center gap-1.5 capitalize">
                              <r.icon className="w-3.5 h-3.5" />
                              {r.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {ROLES.find((r) => r.value === inviteRole)?.description}
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setInviteOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleInvite}
                    disabled={
                      !inviteEmail.trim() ||
                      lookupUser.isPending ||
                      inviteMember.isPending
                    }
                  >
                    {(lookupUser.isPending || inviteMember.isPending) ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <UserPlus className="w-4 h-4 mr-2" />
                    )}
                    Add Member
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <CardDescription>
            Manage who has access to this workspace and their roles.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Role legend */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 p-3 rounded-lg bg-muted/50 border border-border">
            {ROLES.map((r) => (
              <div key={r.value} className="flex items-start gap-1.5">
                <r.icon className="w-3.5 h-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-xs font-medium capitalize">{r.label}</p>
                  <p className="text-xs text-muted-foreground leading-tight">{r.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Member list */}
          <div className="divide-y divide-border">
            {members?.map((m) => (
              <MemberRow
                key={m.id}
                member={m}
                isCurrentUser={m.user_id === user?.id}
                onRoleChange={handleRoleChange}
                onRemove={setRemoveTarget}
                isUpdating={updateRole.isPending}
              />
            ))}
          </div>

          {(!members || members.length === 0) && (
            <div className="text-center py-10">
              <Users className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No members yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Invite team members to start collaborating.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Remove confirmation dialog */}
      <AlertDialog open={!!removeTarget} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{" "}
              <span className="font-medium text-foreground">
                {removeTarget?.profile?.full_name || removeTarget?.profile?.email || "this member"}
              </span>{" "}
              from the workspace? They will lose access to all workspace data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeMember.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
