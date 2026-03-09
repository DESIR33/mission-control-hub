import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useContacts, useUpdateContact } from "@/hooks/use-contacts";
import { useCompanies } from "@/hooks/use-companies";
import { toast } from "sonner";
import {
  ArrowLeft,
  Save,
  Loader2,
  User,
  Mail,
  Phone,
  Globe,
  Building2,
  Shield,
  Clock,
  MessageSquare,
  MapPin,
  Hash,
  FileText,
} from "lucide-react";

export default function EditContactPage() {
  const { contactId } = useParams<{ contactId: string }>();
  const navigate = useNavigate();
  const { data: contacts = [], isLoading } = useContacts();
  const { data: companies = [] } = useCompanies();
  const updateContact = useUpdateContact();

  const contact = contacts.find((c) => c.id === contactId) ?? null;

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    role: "",
    website: "",
    status: "lead",
    vip_tier: "none",
    preferred_channel: "email",
    response_sla_minutes: "",
    company_id: "",
    source: "",
    notes: "",
    city: "",
    state: "",
    country: "",
    social_twitter: "",
    social_linkedin: "",
    social_youtube: "",
    social_instagram: "",
    social_facebook: "",
    social_telegram: "",
    social_whatsapp: "",
    social_discord: "",
  });

  useEffect(() => {
    if (contact) {
      setForm({
        first_name: contact.first_name ?? "",
        last_name: contact.last_name ?? "",
        email: contact.email ?? "",
        phone: contact.phone ?? "",
        role: contact.role ?? "",
        website: contact.website ?? "",
        status: contact.status ?? "lead",
        vip_tier: contact.vip_tier ?? "none",
        preferred_channel: contact.preferred_channel ?? "email",
        response_sla_minutes: contact.response_sla_minutes?.toString() ?? "",
        company_id: contact.company_id ?? "",
        source: contact.source ?? "",
        notes: contact.notes ?? "",
        city: contact.city ?? "",
        state: contact.state ?? "",
        country: contact.country ?? "",
        social_twitter: contact.social_twitter ?? "",
        social_linkedin: contact.social_linkedin ?? "",
        social_youtube: contact.social_youtube ?? "",
        social_instagram: contact.social_instagram ?? "",
        social_facebook: contact.social_facebook ?? "",
        social_telegram: contact.social_telegram ?? "",
        social_whatsapp: contact.social_whatsapp ?? "",
        social_discord: contact.social_discord ?? "",
      });
    }
  }, [contact]);

  const set = (key: string, value: string) => setForm((p) => ({ ...p, [key]: value }));

  const handleSave = async () => {
    if (!form.first_name.trim()) {
      toast.error("First name is required");
      return;
    }
    if (!contact) return;

    try {
      await updateContact.mutateAsync({
        id: contact.id,
        first_name: form.first_name,
        last_name: form.last_name || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        role: form.role || undefined,
        website: form.website || undefined,
        status: form.status,
        vip_tier: form.vip_tier,
        preferred_channel: form.preferred_channel,
        response_sla_minutes: form.response_sla_minutes ? Number(form.response_sla_minutes) : null,
        company_id: form.company_id || null,
        source: form.source || undefined,
        notes: form.notes || undefined,
        social_twitter: form.social_twitter || undefined,
        social_linkedin: form.social_linkedin || undefined,
        social_youtube: form.social_youtube || undefined,
        social_instagram: form.social_instagram || undefined,
        social_facebook: form.social_facebook || undefined,
        social_telegram: form.social_telegram || undefined,
        social_whatsapp: form.social_whatsapp || undefined,
        social_discord: form.social_discord || undefined,
      });
      toast.success("Contact updated successfully");
      navigate(`/contacts/${contact.id}`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const initials = contact
    ? `${contact.first_name[0] ?? ""}${contact.last_name?.[0] ?? ""}`.toUpperCase()
    : "";

  const fullName = contact
    ? `${contact.first_name} ${contact.last_name ?? ""}`.trim()
    : "";

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 min-h-screen space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 min-h-screen">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1.5 mb-6 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <User className="w-12 h-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold text-foreground">Contact Not Found</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen">
      {/* Back navigation */}
      <Button variant="ghost" size="sm" onClick={() => navigate(`/contacts/${contact.id}`)} className="gap-1.5 mb-6 text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back to Profile
      </Button>

      {/* Header with avatar */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative mb-8"
      >
        <div className="h-28 sm:h-36 rounded-xl bg-gradient-to-br from-primary/20 via-secondary/40 to-accent/20 border border-border" />

        <div className="relative px-4 sm:px-6 -mt-12 sm:-mt-14 flex flex-col sm:flex-row items-start sm:items-end gap-4">
          {contact.avatar_url ? (
            <img
              src={contact.avatar_url}
              alt={fullName}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-4 border-background shadow-lg"
            />
          ) : (
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-primary/10 border-4 border-background shadow-lg flex items-center justify-center">
              <span className="text-3xl font-bold text-primary">{initials}</span>
            </div>
          )}
          <div className="flex-1 min-w-0 pb-1">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Edit {fullName}</h1>
            <p className="text-sm text-muted-foreground mt-1">Update contact information and settings</p>
          </div>
          <div className="flex items-center gap-2 shrink-0 pb-1">
            <Button variant="outline" size="sm" onClick={() => navigate(`/contacts/${contact.id}`)} className="gap-1.5">
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={updateContact.isPending} className="gap-1.5">
              {updateContact.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save Changes
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Form content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main form — left 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Info */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <User className="w-4 h-4" /> Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input id="first_name" value={form.first_name} onChange={(e) => set("first_name", e.target.value)} placeholder="John" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input id="last_name" value={form.last_name} onChange={(e) => set("last_name", e.target.value)} placeholder="Doe" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="role">Role / Title</Label>
                  <Input id="role" value={form.role} onChange={(e) => set("role", e.target.value)} placeholder="Marketing Manager" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="source">Source</Label>
                  <Input id="source" value={form.source} onChange={(e) => set("source", e.target.value)} placeholder="e.g. email, referral, event" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Details */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Mail className="w-4 h-4" /> Contact Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="john@company.com" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+1 555 123 4567" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="website">Website</Label>
                <Input id="website" value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://example.com" />
              </div>
            </CardContent>
          </Card>

          {/* Location */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <MapPin className="w-4 h-4" /> Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="New York" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="state">State</Label>
                  <Input id="state" value={form.state} onChange={(e) => set("state", e.target.value)} placeholder="NY" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="country">Country</Label>
                  <Input id="country" value={form.country} onChange={(e) => set("country", e.target.value)} placeholder="United States" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Social Profiles */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Globe className="w-4 h-4" /> Social Profiles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {([
                  ["social_twitter", "Twitter / X", "https://x.com/handle"],
                  ["social_linkedin", "LinkedIn", "https://linkedin.com/in/handle"],
                  ["social_youtube", "YouTube", "https://youtube.com/@handle"],
                  ["social_instagram", "Instagram", "@handle"],
                  ["social_facebook", "Facebook", "https://facebook.com/handle"],
                  ["social_telegram", "Telegram", "@handle"],
                  ["social_whatsapp", "WhatsApp", "+1 555 123 4567"],
                  ["social_discord", "Discord", "username#1234"],
                ] as const).map(([key, label, placeholder]) => (
                  <div key={key} className="space-y-1.5">
                    <Label className="text-xs">{label}</Label>
                    <Input
                      value={(form as any)[key]}
                      onChange={(e) => set(key, e.target.value)}
                      placeholder={placeholder}
                      className="h-9"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4" /> Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                rows={5}
                placeholder="Add any notes about this contact..."
              />
            </CardContent>
          </Card>
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Status & Classification */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Shield className="w-4 h-4" /> Classification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lead">Lead</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>VIP Tier</Label>
                <Select value={form.vip_tier} onValueChange={(v) => set("vip_tier", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="silver">🥈 Silver</SelectItem>
                    <SelectItem value="gold">🥇 Gold</SelectItem>
                    <SelectItem value="platinum">💎 Platinum</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Communication */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <MessageSquare className="w-4 h-4" /> Communication
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Preferred Channel</Label>
                <Select value={form.preferred_channel} onValueChange={(v) => set("preferred_channel", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="slack">Slack</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Response SLA (minutes)</Label>
                <Input
                  type="number"
                  value={form.response_sla_minutes}
                  onChange={(e) => set("response_sla_minutes", e.target.value)}
                  placeholder="e.g. 60"
                />
              </div>
            </CardContent>
          </Card>

          {/* Company Link */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4" /> Company
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label>Linked Company</Label>
                <Select value={form.company_id || "none"} onValueChange={(v) => set("company_id", v === "none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a company..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Company</SelectItem>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <span className="flex items-center gap-2">
                          {c.logo_url ? (
                            <img src={c.logo_url} alt="" className="w-4 h-4 rounded object-cover" />
                          ) : (
                            <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                          )}
                          {c.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {form.company_id && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-primary"
                  onClick={() => navigate(`/relationships/companies/${form.company_id}`)}
                >
                  <Building2 className="w-3.5 h-3.5 mr-2" />
                  View Company Profile
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Save Button (sticky) */}
          <div className="sticky bottom-6">
            <Button className="w-full gap-2" size="lg" onClick={handleSave} disabled={updateContact.isPending}>
              {updateContact.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
