import { useState, useRef, useCallback, useEffect, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover";
import { useWorkspaceMembers, type WorkspaceMember } from "@/hooks/use-workspace-members";

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  className?: string;
}

export function MentionInput({
  value,
  onChange,
  onSubmit,
  placeholder = "Add a comment...",
  className,
}: MentionInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const { data: members = [] } = useWorkspaceMembers();

  const filtered = members.filter((m) => {
    const name = m.full_name || m.email || "";
    return name.toLowerCase().includes(mentionFilter.toLowerCase());
  });

  useEffect(() => {
    setSelectedIdx(0);
  }, [mentionFilter]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newVal = e.target.value;
      const cursor = e.target.selectionStart ?? 0;
      onChange(newVal);

      // Check if we should open the mention picker
      const textBefore = newVal.slice(0, cursor);
      const atIdx = textBefore.lastIndexOf("@");

      if (atIdx >= 0) {
        const charBefore = atIdx > 0 ? textBefore[atIdx - 1] : " ";
        const fragment = textBefore.slice(atIdx + 1);
        // Only trigger if @ is at start or preceded by whitespace, and no spaces in fragment
        if ((charBefore === " " || charBefore === "\n" || atIdx === 0) && !fragment.includes(" ")) {
          setMentionStart(atIdx);
          setMentionFilter(fragment);
          setMentionOpen(true);
          return;
        }
      }

      setMentionOpen(false);
      setMentionStart(null);
    },
    [onChange]
  );

  const insertMention = useCallback(
    (member: WorkspaceMember) => {
      if (mentionStart === null) return;
      const displayName = member.full_name || member.email || "User";
      const mentionTag = `@[${member.user_id}:${displayName}]`;
      const before = value.slice(0, mentionStart);
      const cursor = textareaRef.current?.selectionStart ?? value.length;
      const after = value.slice(cursor);
      const newValue = before + mentionTag + " " + after;
      onChange(newValue);
      setMentionOpen(false);
      setMentionStart(null);
      setMentionFilter("");

      // Refocus textarea
      setTimeout(() => {
        const ta = textareaRef.current;
        if (ta) {
          const pos = before.length + mentionTag.length + 1;
          ta.focus();
          ta.setSelectionRange(pos, pos);
        }
      }, 0);
    },
    [mentionStart, value, onChange]
  );

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionOpen && filtered.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((i) => Math.min(i + 1, filtered.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(filtered[selectedIdx]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMentionOpen(false);
        return;
      }
    }

    if (e.key === "Enter" && e.metaKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="relative flex-1">
      <Popover open={mentionOpen && filtered.length > 0}>
        <PopoverAnchor asChild>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={cn(
              "flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none",
              className
            )}
          />
        </PopoverAnchor>
        <PopoverContent
          className="w-56 p-1"
          align="start"
          side="top"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="max-h-40 overflow-y-auto">
            {filtered.map((m, i) => (
              <button
                key={m.user_id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertMention(m);
                }}
                className={cn(
                  "flex items-center gap-2 w-full text-left px-2 py-1.5 rounded text-sm",
                  i === selectedIdx ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
                )}
              >
                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium shrink-0">
                  {(m.full_name || m.email || "?").slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {m.full_name || "Unnamed"}
                  </p>
                  {m.email && (
                    <p className="text-[10px] text-muted-foreground truncate">
                      {m.email}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
