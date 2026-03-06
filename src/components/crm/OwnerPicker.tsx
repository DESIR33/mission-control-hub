import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useWorkspaceMembers } from "@/hooks/use-workspace-members";
import { Loader2 } from "lucide-react";

interface OwnerPickerProps {
  value: string | null;
  onChange: (userId: string | null) => void;
}

function getInitials(name: string | null, email: string | null): string {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  if (email) {
    return email[0].toUpperCase();
  }
  return "?";
}

export function OwnerPicker({ value, onChange }: OwnerPickerProps) {
  const { data: members = [], isLoading } = useWorkspaceMembers();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 h-9 px-3 text-sm text-muted-foreground">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Loading...
      </div>
    );
  }

  return (
    <Select
      value={value ?? "__unassigned__"}
      onValueChange={(v) => onChange(v === "__unassigned__" ? null : v)}
    >
      <SelectTrigger className="bg-secondary border-border h-9">
        <SelectValue placeholder="Select owner" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__unassigned__">
          <span className="text-muted-foreground">Unassigned</span>
        </SelectItem>
        {members.map((member) => (
          <SelectItem key={member.user_id} value={member.user_id}>
            <div className="flex items-center gap-2">
              <Avatar className="h-5 w-5">
                {member.avatar_url && (
                  <AvatarImage src={member.avatar_url} alt={member.full_name ?? ""} />
                )}
                <AvatarFallback className="text-xs">
                  {getInitials(member.full_name, member.email)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">
                {member.full_name ?? member.email ?? "Unknown"}
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
