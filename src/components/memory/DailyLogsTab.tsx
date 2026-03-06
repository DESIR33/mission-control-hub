import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { format, addDays, subDays } from "date-fns";
import type { DailyLog, LogSource } from "@/types/assistant";

const sourceColors: Record<string, string> = {
  youtube: "bg-red-500/20 text-red-400",
  crm: "bg-blue-500/20 text-blue-400",
  email: "bg-green-500/20 text-green-400",
  chat: "bg-purple-500/20 text-purple-400",
  manual: "bg-yellow-500/20 text-yellow-400",
};

interface Props {
  logs: DailyLog[];
  logDate: string;
  onDateChange: (date: string) => void;
  onCreate: (content: string, source: string) => void;
  onDelete: (id: string) => void;
}

export function DailyLogsTab({ logs, logDate, onDateChange, onCreate, onDelete }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [newSource, setNewSource] = useState<LogSource>("manual");

  const handleAdd = () => {
    if (!newContent.trim()) return;
    onCreate(newContent, newSource);
    setNewContent("");
    setShowAdd(false);
  };

  const grouped = logs.reduce<Record<string, DailyLog[]>>((acc, log) => {
    if (!acc[log.source]) acc[log.source] = [];
    acc[log.source].push(log);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost" size="icon" className="h-8 w-8"
            onClick={() => onDateChange(format(subDays(new Date(logDate + "T12:00:00"), 1), "yyyy-MM-dd"))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Input
            type="date"
            value={logDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="w-40"
          />
          <Button
            variant="ghost" size="icon" className="h-8 w-8"
            onClick={() => onDateChange(format(addDays(new Date(logDate + "T12:00:00"), 1), "yyyy-MM-dd"))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="h-4 w-4 mr-1" /> Add Entry
        </Button>
      </div>

      {showAdd && (
        <Card className="p-3 space-y-3">
          <Textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Log entry..."
            rows={2}
          />
          <div className="flex gap-2">
            <Select value={newSource} onValueChange={(v) => setNewSource(v as LogSource)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["youtube", "crm", "email", "chat", "manual"] as LogSource[]).map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={handleAdd}>Save</Button>
          </div>
        </Card>
      )}

      {logs.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">
          No log entries for this date.
        </p>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([source, entries]) => (
            <div key={source}>
              <Badge className={`mb-2 ${sourceColors[source] || ""}`}>{source}</Badge>
              <div className="space-y-2 ml-2">
                {entries.map((entry) => (
                  <div key={entry.id} className="flex items-start gap-2 group">
                    <div className="flex-1 text-sm text-foreground bg-muted/30 rounded p-2 border border-border">
                      {entry.content}
                      <span className="text-xs text-muted-foreground ml-2">
                        {format(new Date(entry.created_at), "HH:mm")}
                      </span>
                    </div>
                    <Button
                      variant="ghost" size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive"
                      onClick={() => onDelete(entry.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
