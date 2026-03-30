import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertContactSchema } from "@db/schema";
import type { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, ChevronsUpDown, Plus, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { CountrySelect } from "@/components/ui/country-select";
import { useState } from "react";
import { useCreateContact, useContactRoles, useCreateContactRole } from "@/hooks/use-contacts";
import { useCompanies } from "@/hooks/use-companies";

type ContactFormData = z.infer<typeof insertContactSchema>;

interface AddContactFormProps {
  onSuccess?: () => void;
}

export default function AddContactForm({ onSuccess }: AddContactFormProps) {
  const { toast } = useToast();
  const [openCompany, setOpenCompany] = useState(false);
  const [openRole, setOpenRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [showNewRoleDialog, setShowNewRoleDialog] = useState(false);
  const [socialOpen, setSocialOpen] = useState(false);

  const createContact = useCreateContact();
  const { data: companies = [] } = useCompanies();
  const { data: roles = [] } = useContactRoles();
  const createRole = useCreateContactRole();

  const sortedCompanies = [...companies].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const form = useForm<ContactFormData>({
    resolver: zodResolver(insertContactSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: null,
      phone: "",
      companyId: undefined,
      roleId: undefined,
      source: "",
      status: "lead",
      vipTier: "none",
      website: "",
      socialTwitter: "",
      socialLinkedin: "",
      socialYoutube: "",
      socialInstagram: "",
      socialFacebook: "",
      socialTelegram: "",
      socialWhatsapp: "",
      socialDiscord: "",
      city: "",
      state: "",
      country: "",
      notes: "",
    },
  });

  const onSubmit = async (data: ContactFormData) => {
    try {
      await createContact.mutateAsync({
        first_name: data.firstName,
        last_name: data.lastName || undefined,
        email: data.email || undefined,
        phone: data.phone || undefined,
        company_id: data.companyId || undefined,
        role_id: data.roleId || undefined,
        source: data.source || undefined,
        status: data.status,
        vip_tier: data.vipTier,
        website: data.website || undefined,
        social_twitter: data.socialTwitter || undefined,
        social_linkedin: data.socialLinkedin || undefined,
        social_youtube: data.socialYoutube || undefined,
        social_instagram: data.socialInstagram || undefined,
        social_facebook: data.socialFacebook || undefined,
        social_telegram: data.socialTelegram || undefined,
        social_whatsapp: data.socialWhatsapp || undefined,
        social_discord: data.socialDiscord || undefined,
        city: data.city || undefined,
        state: data.state || undefined,
        country: data.country || undefined,
        notes: data.notes || undefined,
      });
      toast({ title: "Success", description: "Contact created successfully" });
      form.reset();
      onSuccess?.();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) return;
    try {
      const existing = roles.find(r => r.name.toLowerCase() === newRoleName.trim().toLowerCase());
      if (existing) {
        form.setValue("roleId", existing.id);
        setShowNewRoleDialog(false);
        setNewRoleName("");
        return;
      }
      const data = await createRole.mutateAsync(newRoleName.trim());
      form.setValue("roleId", (data as any).id);
      setShowNewRoleDialog(false);
      setNewRoleName("");
      toast({ title: "Role created" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 py-4">
        {/* Name */}
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="firstName">First Name *</Label>
            <Input id="firstName" {...form.register("firstName")} />
            {form.formState.errors.firstName && (
              <p className="text-sm text-destructive">{form.formState.errors.firstName.message}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input id="lastName" {...form.register("lastName")} />
          </div>
        </div>

        {/* Email & Phone */}
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...form.register("email")} />
            {form.formState.errors.email && (
              <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" {...form.register("phone")} placeholder="+1 555-123-4567" />
          </div>
        </div>

        {/* Company */}
        <div className="grid gap-2">
          <Label>Company</Label>
          <Popover open={openCompany} onOpenChange={setOpenCompany}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" aria-expanded={openCompany} className="justify-between">
                {form.watch("companyId")
                  ? companies.find((c) => c.id === form.watch("companyId"))?.name
                  : "Select company..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[400px] p-0 z-[1001]">
              <Command>
                <CommandInput placeholder="Search company..." />
                <CommandList>
                  <CommandEmpty>No company found.</CommandEmpty>
                  <CommandGroup>
                    {sortedCompanies.map((company) => (
                      <CommandItem
                        key={company.id}
                        value={company.name}
                        onSelect={() => {
                          form.setValue("companyId", company.id);
                          setOpenCompany(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            form.watch("companyId") === company.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {company.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Role */}
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label>Role</Label>
            <Button type="button" variant="ghost" size="sm" className="h-8 px-2" onClick={() => setShowNewRoleDialog(true)}>
              <Plus className="h-4 w-4" />
              Add Role
            </Button>
          </div>
          <Popover open={openRole} onOpenChange={setOpenRole}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" aria-expanded={openRole} className="justify-between">
                {form.watch("roleId")
                  ? roles.find((r) => r.id === form.watch("roleId"))?.name
                  : "Select role..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[400px] p-0 z-[1001]">
              <Command>
                <CommandInput placeholder="Search role..." />
                <CommandList>
                  <CommandEmpty>No role found.</CommandEmpty>
                  <CommandGroup>
                    {roles.map((role) => (
                      <CommandItem
                        key={role.id}
                        value={role.name}
                        onSelect={() => {
                          form.setValue("roleId", role.id);
                          setOpenRole(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            form.watch("roleId") === role.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {role.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Status, VIP, Source */}
        <div className="grid grid-cols-3 gap-4">
          <div className="grid gap-2">
            <Label>Status</Label>
            <Select
              onValueChange={(value) => form.setValue("status", value as any)}
              defaultValue={form.getValues("status")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent position="popper" className="z-[1001]">
                <SelectItem value="lead">Lead</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="customer">Customer</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>VIP Tier</Label>
            <Select
              onValueChange={(value) => form.setValue("vipTier", value as any)}
              defaultValue={form.getValues("vipTier")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select tier" />
              </SelectTrigger>
              <SelectContent position="popper" className="z-[1001]">
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="silver">Silver</SelectItem>
                <SelectItem value="gold">Gold</SelectItem>
                <SelectItem value="platinum">Platinum</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="source">Source</Label>
            <Input id="source" {...form.register("source")} placeholder="e.g. LinkedIn" />
          </div>
        </div>

        {/* Location */}
        <div className="grid gap-4">
          <Label>Location</Label>
          <div className="grid grid-cols-3 gap-3">
            <Input placeholder="City" {...form.register("city")} />
            <Input placeholder="State/Province" {...form.register("state")} />
            <CountrySelect
              value={form.watch("country")}
              onChange={(val) => form.setValue("country", val)}
            />
          </div>
        </div>

        {/* Social Media - Collapsible */}
        <Collapsible open={socialOpen} onOpenChange={setSocialOpen}>
          <CollapsibleTrigger asChild>
            <Button type="button" variant="ghost" className="w-full justify-between px-0 font-medium">
              Social Media Profiles
              <ChevronDown className={cn("h-4 w-4 transition-transform", socialOpen && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="socialTwitter" className="text-xs">Twitter / X</Label>
                <Input id="socialTwitter" {...form.register("socialTwitter")} placeholder="@handle" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="socialLinkedin" className="text-xs">LinkedIn</Label>
                <Input id="socialLinkedin" {...form.register("socialLinkedin")} placeholder="linkedin.com/in/..." />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="socialFacebook" className="text-xs">Facebook</Label>
                <Input id="socialFacebook" {...form.register("socialFacebook")} placeholder="facebook.com/..." />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="socialInstagram" className="text-xs">Instagram</Label>
                <Input id="socialInstagram" {...form.register("socialInstagram")} placeholder="@handle" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="socialTelegram" className="text-xs">Telegram</Label>
                <Input id="socialTelegram" {...form.register("socialTelegram")} placeholder="@username" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="socialWhatsapp" className="text-xs">WhatsApp</Label>
                <Input id="socialWhatsapp" {...form.register("socialWhatsapp")} placeholder="+1 555-123-4567" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="socialDiscord" className="text-xs">Discord</Label>
                <Input id="socialDiscord" {...form.register("socialDiscord")} placeholder="username#1234" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="website" className="text-xs">Website</Label>
                <Input id="website" {...form.register("website")} placeholder="https://..." />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Notes */}
        <div className="grid gap-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" {...form.register("notes")} rows={3} />
        </div>
      </div>

      {/* New Role Dialog */}
      <Dialog open={showNewRoleDialog} onOpenChange={setShowNewRoleDialog}>
        <DialogContent className="z-[1002]">
          <DialogHeader>
            <DialogTitle>Create New Role</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="newRoleName">Role Name</Label>
              <Input
                id="newRoleName"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="Enter role name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setShowNewRoleDialog(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleCreateRole} disabled={!newRoleName.trim() || createRole.isPending}>
              {createRole.isPending ? "Creating..." : "Create Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Button type="submit" className="w-full" disabled={createContact.isPending}>
        {createContact.isPending ? "Creating..." : "Add Contact"}
      </Button>
    </form>
  );
}
