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

const ROLES: { value: MemberRole; label: string; icon: React.ElementType }[] = [
  { value: "admin", label: "Admin", icon: ShieldCheck },
  { value: "operator", label: "Operator", icon: Shield },
  { value: "contributor", label: "Contributor", icon: Pencil },
  { value: "viewer", label: "Viewer", icon: Eye },
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
  onRemove: (memberId: string) => void;
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
          onClick={() => onRemove(member.id)}
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

  const handleRoleChange = (memberId: string, role: MemberRole) => {
    updateRole.mutate(
      { memberId, role },
      {
        onSuccess: () => toast.success("Role updated."),
        onError: (err) => toast.error(`Failed: ${err.message}`),
      }
    );
  };

  const handleRemove = (memberId: string) => {
    removeMember.mutate(memberId, {
      onSuccess: () => toast.success("Member removed."),
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
          <div className="flex flex-wrap gap-3 mb-4 text-xs text-muted-foreground">
            {ROLES.map((r) => (
              <span key={r.value} className="flex items-center gap-1 capitalize">
                <r.icon className="w-3.5 h-3.5" />
                {r.label}
              </span>
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
                onRemove={handleRemove}
                isUpdating={updateRole.isPending}
              />
            ))}
          </div>

          {(!members || members.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No members found.
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
