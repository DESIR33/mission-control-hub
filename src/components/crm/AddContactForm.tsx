import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertContactSchema } from "@db/schema";
import type { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Company, ContactRole } from "@db/schema";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type ContactFormData = z.infer<typeof insertContactSchema>;

interface AddContactFormProps {
  onSuccess?: () => void;
}

export default function AddContactForm({ onSuccess }: AddContactFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [openCompany, setOpenCompany] = useState(false);
  const [openRole, setOpenRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [showNewRoleDialog, setShowNewRoleDialog] = useState(false);
  const [isAddingRole, setIsAddingRole] = useState(false);
  const [roleSearch, setRoleSearch] = useState("");

  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  const { data: roles = [] } = useQuery<ContactRole[]>({
    queryKey: ["/api/contact-roles"],
  });

  // Sort companies alphabetically
  const sortedCompanies = [...companies].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const form = useForm<ContactFormData>({
    resolver: zodResolver(insertContactSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: null,
      companyId: undefined,
      roleId: undefined,
      status: "lead",
      city: "",
      state: "",
      country: "",
    },
  });

  const createContact = useMutation({
    mutationFn: async (data: ContactFormData) => {
      // Get fresh CSRF token
      const csrfResponse = await fetch("/api/csrf/token", {
        credentials: "include",
      });

      if (!csrfResponse.ok) {
        throw new Error("Failed to fetch CSRF token");
      }

      const { csrfToken } = await csrfResponse.json();

      const response = await fetch("/api/contacts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      form.reset();
      toast({
        title: "Success",
        description: "Contact created successfully",
      });
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });


  const createRole = useMutation({
    mutationFn: async (name: string) => {
      // Check if the role already exists with the same name
      const roleExists = roles.some(role =>
        role.name.toLowerCase() === name.toLowerCase()
      );

      if (roleExists) {
        // If role exists, find it and return it instead of creating a new one
        const existingRole = roles.find(role =>
          role.name.toLowerCase() === name.toLowerCase()
        );
        return existingRole;
      }

      // Get fresh CSRF token
      const csrfResponse = await fetch("/api/csrf/token", {
        credentials: "include",
      });

      if (!csrfResponse.ok) {
        throw new Error("Failed to fetch CSRF token");
      }

      const { csrfToken } = await csrfResponse.json();

      const response = await fetch("/api/contact-roles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken
        },
        credentials: 'include',
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        try {
          // Try to parse as JSON first
          const errorData = await response.json();
          if (errorData && errorData.error) {
            // If it's a specific duplicate error from our updated endpoint
            if (errorData.code === 'DUPLICATE_ROLE') {
              // Try to find the matching role in our current roles list
              const existingRole = roles.find(role =>
                role.name.toLowerCase() === name.toLowerCase()
              );

              // If we found it locally, use it instead of throwing an error
              if (existingRole) {
                console.log(`Found existing role locally: ${existingRole.name}`);
                return existingRole;
              }

              // Otherwise, refresh roles and throw the error
              await queryClient.invalidateQueries({ queryKey: ["/api/contact-roles"] });
              throw new Error(errorData.error);
            }
            throw new Error(errorData.error);
          }
        } catch (jsonError) {
          // If we couldn't parse as JSON, try as text
          const errorText = await response.text();
          // Check if it's a duplicate key error
          if (errorText.includes('duplicate key value') || errorText.includes('already exists')) {
            throw new Error('A role with this name already exists in your workspace.');
          }
          throw new Error(errorText || 'Failed to create role');
        }
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/contact-roles"] });
      setShowNewRoleDialog(false);
      setNewRoleName("");
      form.setValue("roleId", data.id);
      toast({
        title: "Success",
        description: "Role created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ContactFormData) => {
    createContact.mutate(data);
  };

  const handleCreateRole = () => {
    if (newRoleName.trim()) {
      createRole.mutate(newRoleName.trim());
    }
  };

  const handleAddRoleFromDropdown = (e: React.FormEvent) => {
    e.preventDefault();
    if (newRoleName.trim()) {
      createRole.mutate(newRoleName.trim());
      setIsAddingRole(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              {...form.register("firstName")}
            />
            {form.formState.errors.firstName && (
              <p className="text-sm text-destructive">
                {form.formState.errors.firstName.message}
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              {...form.register("lastName")}
            />
            {form.formState.errors.lastName && (
              <p className="text-sm text-destructive">
                {form.formState.errors.lastName.message}
              </p>
            )}
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            {...form.register("email")}
          />
          {form.formState.errors.email && (
            <p className="text-sm text-destructive">
              {form.formState.errors.email.message}
            </p>
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="company">Company</Label>
          <Popover open={openCompany} onOpenChange={setOpenCompany}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={openCompany}
                className="justify-between"
              >
                {form.watch("companyId")
                  ? companies.find((company) => company.id === form.watch("companyId"))?.name
                  : "Select company..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[400px] p-0 z-[1001]">
              <Command>
                <CommandInput placeholder="Search company..." />
                <CommandEmpty>No company found.</CommandEmpty>
                <div className="max-h-[200px] overflow-y-auto">
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
                            form.watch("companyId") === company.id
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        {company.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </div>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="role">Role</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              onClick={() => setShowNewRoleDialog(true)}
            >
              <Plus className="h-4 w-4" />
              Add Role
            </Button>
          </div>
          <Popover open={openRole} onOpenChange={setOpenRole}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={openRole}
                className="justify-between"
              >
                {form.watch("roleId")
                  ? roles.find((role) => role.id === form.watch("roleId"))?.name
                  : "Select role..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[400px] p-0 z-[1001]">
              <Command>
                <CommandInput
                  placeholder="Search role..."
                  value={roleSearch}
                  onValueChange={setRoleSearch}
                />
                <CommandList>
                  <CommandEmpty>
                    {isAddingRole ? (
                      <form
                        onSubmit={handleAddRoleFromDropdown}
                        className="p-2 flex items-center gap-2"
                        onClick={e => e.stopPropagation()}
                      >
                        <Input
                          value={newRoleName}
                          onChange={e => setNewRoleName(e.target.value)}
                          placeholder="Enter new role"
                          className="h-8"
                        />
                        <Button
                          type="submit"
                          size="sm"
                          disabled={!newRoleName.trim() || createRole.isPending}
                          className="h-8"
                        >
                          {createRole.isPending ? "..." : "Add"}
                        </Button>
                      </form>
                    ) : (
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => setIsAddingRole(true)}
                      >
                        + Add "{roleSearch}" as new role
                      </Button>
                    )}
                  </CommandEmpty>
                  <CommandGroup>
                    {roles
                      .filter(role => role.name.toLowerCase().includes(roleSearch.toLowerCase()))
                      .map((role) => (
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
                              form.watch("roleId") === role.id
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          {role.name}
                        </CommandItem>
                      ))}
                  </CommandGroup>
                  {!isAddingRole && roles.filter(role => role.name.toLowerCase().includes(roleSearch.toLowerCase())).length > 0 && (
                    <>
                      <CommandSeparator />
                      <CommandItem
                        onSelect={() => setIsAddingRole(true)}
                      >
                        + Add new role
                      </CommandItem>
                    </>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="status">Status</Label>
          <Select
            onValueChange={(value) => form.setValue("status", value as "active" | "inactive" | "lead" | "customer")}
            defaultValue={form.getValues("status")}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent position="popper" className="z-[1001]">
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="lead">Lead</SelectItem>
              <SelectItem value="customer">Customer</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-4">
          <Label>Location</Label>
          <div className="grid gap-2">
            <Input
              placeholder="City"
              {...form.register("city")}
            />
            {form.formState.errors.city && (
              <p className="text-sm text-destructive">
                {form.formState.errors.city.message}
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Input
              placeholder="State/Province"
              {...form.register("state")}
            />
            {form.formState.errors.state && (
              <p className="text-sm text-destructive">
                {form.formState.errors.state.message}
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Input
              placeholder="Country"
              {...form.register("country")}
            />
            {form.formState.errors.country && (
              <p className="text-sm text-destructive">
                {form.formState.errors.country.message}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Dialog for creating new role */}
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
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowNewRoleDialog(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCreateRole}
              disabled={!newRoleName.trim() || createRole.isPending}
            >
              {createRole.isPending ? "Creating..." : "Create Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Button
        type="submit"
        className="w-full"
        disabled={createContact.isPending}
      >
        {createContact.isPending ? "Creating..." : "Add Contact"}
      </Button>
    </form>
  );
}
