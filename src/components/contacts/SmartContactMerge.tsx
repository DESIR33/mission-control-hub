import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { GitMerge, AlertTriangle, Check } from "lucide-react";
import { useContacts } from "@/hooks/use-contacts";

interface DuplicateGroup {
  key: string;
  contacts: Array<{ id: string; name: string; email: string | null; phone: string | null; company: string | null; source: string | null }>;
  matchType: "email" | "name" | "phone";
  confidence: number;
}

export function SmartContactMerge() {
  const { data: contacts = [] } = useContacts();
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [primaryId, setPrimaryId] = useState<string | null>(null);

  const duplicates = useMemo(() => {
    const groups: DuplicateGroup[] = [];
    const emailMap = new Map<string, typeof contacts>();
    const nameMap = new Map<string, typeof contacts>();

    contacts.forEach((c) => {
      if (c.email) {
        const key = c.email.toLowerCase().trim();
        if (!emailMap.has(key)) emailMap.set(key, []);
        emailMap.get(key)!.push(c);
      }

      const fullName = `${c.first_name} ${c.last_name || ""}`.toLowerCase().trim();
      if (fullName.length > 2) {
        if (!nameMap.has(fullName)) nameMap.set(fullName, []);
        nameMap.get(fullName)!.push(c);
      }
    });

    const seen = new Set<string>();

    emailMap.forEach((group, email) => {
      if (group.length > 1) {
        const key = `email-${email}`;
        seen.add(key);
        groups.push({
          key,
          contacts: group.map((c) => ({
            id: c.id,
            name: `${c.first_name} ${c.last_name || ""}`.trim(),
            email: c.email,
            phone: c.phone,
            company: c.company?.name || null,
            source: c.source,
          })),
          matchType: "email",
          confidence: 95,
        });
      }
    });

    nameMap.forEach((group, name) => {
      if (group.length > 1) {
        const key = `name-${name}`;
        const emailKeys = group.map((c) => c.email?.toLowerCase().trim()).filter(Boolean);
        const alreadyGrouped = emailKeys.some((e) => seen.has(`email-${e}`));
        if (!alreadyGrouped) {
          groups.push({
            key,
            contacts: group.map((c) => ({
              id: c.id,
              name: `${c.first_name} ${c.last_name || ""}`.trim(),
              email: c.email,
              phone: c.phone,
              company: c.company?.name || null,
              source: c.source,
            })),
            matchType: "name",
            confidence: 70,
          });
        }
      }
    });

    return groups.sort((a, b) => b.confidence - a.confidence);
  }, [contacts]);

  const activeGroup = duplicates.find((g) => g.key === selectedGroup);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <GitMerge className="h-5 w-5 text-primary" />
          Smart Contact Merge
          {duplicates.length > 0 && (
            <Badge variant="destructive" className="ml-auto text-xs">{duplicates.length} duplicates</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {duplicates.length === 0 ? (
          <div className="text-center py-8">
            <Check className="h-10 w-10 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No duplicate contacts detected</p>
          </div>
        ) : !activeGroup ? (
          <div className="space-y-2 max-h-[350px] overflow-y-auto">
            {duplicates.map((group) => (
              <button
                key={group.key}
                onClick={() => { setSelectedGroup(group.key); setPrimaryId(group.contacts[0].id); }}
                className="w-full text-left p-3 rounded-lg border border-border hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <span className="font-medium text-sm">
                      {group.contacts.length} contacts matched by {group.matchType}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs">{group.confidence}% match</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {group.contacts.map((c) => c.name).join(", ")}
                </p>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <Button variant="ghost" size="sm" onClick={() => setSelectedGroup(null)}>
              ← Back to list
            </Button>
            <p className="text-sm text-muted-foreground">Select the primary record to keep:</p>
            <RadioGroup value={primaryId || ""} onValueChange={setPrimaryId}>
              {activeGroup.contacts.map((c) => (
                <div key={c.id} className="flex items-start gap-3 p-3 rounded-lg border border-border">
                  <RadioGroupItem value={c.id} id={c.id} className="mt-1" />
                  <Label htmlFor={c.id} className="flex-1 cursor-pointer">
                    <p className="font-medium text-sm">{c.name}</p>
                    <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
                      {c.email && <p>📧 {c.email}</p>}
                      {c.phone && <p>📞 {c.phone}</p>}
                      {c.company && <p>🏢 {c.company}</p>}
                      {c.source && <p>📍 Source: {c.source}</p>}
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
            <Button size="sm" className="w-full gap-2" disabled={!primaryId}>
              <GitMerge className="h-4 w-4" />
              Merge into selected
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
