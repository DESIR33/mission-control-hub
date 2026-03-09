import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useSnoozeEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, snoozed_until }: { id: string; snoozed_until: string }) => {
      const { error } = await supabase
        .from("inbox_emails" as any)
        .update({ snoozed_until, folder: "snoozed" } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox-emails"] });
      queryClient.invalidateQueries({ queryKey: ["inbox-folder-counts"] });
    },
  });
}

export function useUnsnoozeEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("inbox_emails" as any)
        .update({ snoozed_until: null, folder: "inbox" } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox-emails"] });
      queryClient.invalidateQueries({ queryKey: ["inbox-folder-counts"] });
    },
  });
}

export function getSnoozeOptions(): Array<{ label: string; getValue: () => Date }> {
  return [
    {
      label: "Later today",
      getValue: () => {
        const d = new Date();
        d.setHours(d.getHours() + 3);
        return d;
      },
    },
    {
      label: "Tomorrow morning",
      getValue: () => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        d.setHours(9, 0, 0, 0);
        return d;
      },
    },
    {
      label: "Tomorrow afternoon",
      getValue: () => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        d.setHours(14, 0, 0, 0);
        return d;
      },
    },
    {
      label: "This weekend",
      getValue: () => {
        const d = new Date();
        const day = d.getDay();
        const daysUntilSat = day === 6 ? 7 : 6 - day;
        d.setDate(d.getDate() + daysUntilSat);
        d.setHours(10, 0, 0, 0);
        return d;
      },
    },
    {
      label: "Next week",
      getValue: () => {
        const d = new Date();
        d.setDate(d.getDate() + (8 - d.getDay()));
        d.setHours(9, 0, 0, 0);
        return d;
      },
    },
    {
      label: "Next month",
      getValue: () => {
        const d = new Date();
        d.setMonth(d.getMonth() + 1, 1);
        d.setHours(9, 0, 0, 0);
        return d;
      },
    },
  ];
}
