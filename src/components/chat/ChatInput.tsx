import { useState, useRef, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Send } from "lucide-react";

export const MODEL_OPTIONS = [
  { group: "Anthropic", models: [
    { id: "anthropic/claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
    { id: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet" },
    { id: "anthropic/claude-3-opus", label: "Claude 3 Opus" },
    { id: "anthropic/claude-3-haiku", label: "Claude 3 Haiku" },
  ]},
  { group: "OpenAI", models: [
    { id: "openai/gpt-4o", label: "GPT-4o" },
    { id: "openai/gpt-4o-mini", label: "GPT-4o Mini" },
    { id: "openai/gpt-4-turbo", label: "GPT-4 Turbo" },
    { id: "openai/o1-mini", label: "o1-mini" },
  ]},
  { group: "Google", models: [
    { id: "google/gemini-2.5-pro-preview-06-05", label: "Gemini 2.5 Pro" },
    { id: "google/gemini-2.5-flash-preview-05-20", label: "Gemini 2.5 Flash" },
    { id: "google/gemini-2.0-flash-001", label: "Gemini 2.0 Flash" },
  ]},
  { group: "Meta", models: [
    { id: "meta-llama/llama-4-maverick", label: "Llama 4 Maverick" },
    { id: "meta-llama/llama-4-scout", label: "Llama 4 Scout" },
    { id: "meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B" },
  ]},
  { group: "Mistral", models: [
    { id: "mistralai/mistral-large-2411", label: "Mistral Large" },
    { id: "mistralai/mistral-small-3.1-24b-instruct", label: "Mistral Small 3.1" },
  ]},
  { group: "DeepSeek", models: [
    { id: "deepseek/deepseek-chat-v3-0324", label: "DeepSeek V3" },
    { id: "deepseek/deepseek-r1", label: "DeepSeek R1" },
  ]},
  { group: "Moonshot", models: [
    { id: "moonshotai/kimi-k2.5", label: "Kimi K2.5" },
  ]},
];

const DEFAULT_MODEL = "anthropic/claude-sonnet-4-20250514";

interface Props {
  onSend: (message: string, model: string) => void;
  isLoading: boolean;
}

export function ChatInput({ onSend, isLoading }: Props) {
  const [value, setValue] = useState("");
  const [model, setModel] = useState(DEFAULT_MODEL);
  const ref = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (!value.trim() || isLoading) return;
    onSend(value.trim(), model);
    setValue("");
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-border p-4">
      <div className="max-w-3xl mx-auto flex flex-col gap-2">
        <div className="flex gap-2">
          <Textarea
            ref={ref}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask your AI assistant..."
            className="resize-none min-h-[44px] max-h-[200px] bg-muted/30"
            rows={1}
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={!value.trim() || isLoading}
            size="icon"
            className="h-11 w-11 flex-shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <Select value={model} onValueChange={setModel}>
          <SelectTrigger className="w-[260px] h-8 text-xs bg-muted/30">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MODEL_OPTIONS.map((group) => (
              <SelectGroup key={group.group}>
                <SelectLabel className="text-xs text-muted-foreground">{group.group}</SelectLabel>
                {group.models.map((m) => (
                  <SelectItem key={m.id} value={m.id} className="text-xs">
                    {m.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
