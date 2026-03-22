import { useState, useMemo } from "react";
import { Check, ChevronsUpDown, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "cmdk";
import { cn } from "@/lib/utils";
import { useCompanies } from "@/hooks/use-companies";

interface CompanyPickerProps {
  value: string;
  onChange: (value: string) => void;
}

export function CompanyPicker({ value, onChange }: CompanyPickerProps) {
  const { data: companies = [] } = useCompanies();
  const [open, setOpen] = useState(false);

  const sorted = useMemo(
    () => [...companies].sort((a, b) => a.name.localeCompare(b.name)),
    [companies]
  );

  const selected = sorted.find((c) => c.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {selected ? (
            <span className="flex items-center gap-2 truncate">
              {selected.logo_url ? (
                <img src={selected.logo_url} alt="" className="w-4 h-4 rounded object-cover" />
              ) : (
                <Building2 className="w-4 h-4 text-muted-foreground" />
              )}
              {selected.name}
            </span>
          ) : (
            <span className="text-muted-foreground">Link to company...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command className="bg-popover">
          <CommandInput placeholder="Search companies..." className="h-9 border-b border-border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground" />
          <CommandList className="max-h-[200px] overflow-y-auto">
            <CommandEmpty className="py-4 text-center text-sm text-muted-foreground">No company found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__none__"
                onSelect={() => { onChange(""); setOpen(false); }}
                className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-accent rounded-sm"
              >
                <Check className={cn("h-4 w-4", !value ? "opacity-100" : "opacity-0")} />
                <span className="text-muted-foreground">No company</span>
              </CommandItem>
              {sorted.map((c) => (
                <CommandItem
                  key={c.id}
                  value={c.name}
                  onSelect={() => { onChange(c.id); setOpen(false); }}
                  className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-accent rounded-sm"
                >
                  <Check className={cn("h-4 w-4", value === c.id ? "opacity-100" : "opacity-0")} />
                  {c.logo_url ? (
                    <img src={c.logo_url} alt="" className="w-4 h-4 rounded object-cover" />
                  ) : (
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span className="truncate">{c.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
