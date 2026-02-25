import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useProfile, useUpdateProfile } from "@/hooks/use-settings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

export function ProfileSection() {
  const { user } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const update = useUpdateProfile();

  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setAvatarUrl(profile.avatar_url ?? "");
    }
  }, [profile]);

  const handleSave = () => {
    update.mutate(
      { full_name: fullName, avatar_url: avatarUrl || undefined },
      {
        onSuccess: () => toast.success("Profile updated."),
        onError: (err) => toast.error(`Failed to update profile: ${err.message}`),
      }
    );
  };

  const initials = fullName
    ? fullName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : (user?.email?.[0] ?? "U").toUpperCase();

  const isDirty =
    fullName !== (profile?.full_name ?? "") ||
    avatarUrl !== (profile?.avatar_url ?? "");

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60 mt-1" />
        </CardHeader>
        <CardContent className="space-y-4">
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
      transition={{ duration: 0.25 }}
    >
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            <CardTitle>Profile</CardTitle>
          </div>
          <CardDescription>Manage your personal information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar preview */}
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={avatarUrl} />
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground">{fullName || "Your Name"}</p>
              <p>{user?.email}</p>
            </div>
          </div>

          {/* Fields */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={user?.email ?? ""} disabled />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="avatarUrl">Avatar URL</Label>
            <Input
              id="avatarUrl"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://example.com/photo.jpg"
            />
          </div>

          <Button onClick={handleSave} disabled={!isDirty || update.isPending}>
            {update.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Changes
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
