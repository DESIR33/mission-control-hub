import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { workspace_id, days = 5 } = await req.json();
    if (!workspace_id) throw new Error("workspace_id required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Get Outlook credentials
    const { data: integration } = await supabase
      .from("workspace_integrations")
      .select("config")
      .eq("workspace_id", workspace_id)
      .eq("integration_key", "ms_outlook")
      .eq("enabled", true)
      .single();

    if (!integration?.config) {
      // Return fallback slots if no Outlook connection
      return new Response(JSON.stringify({ slots: generateFallbackSlots(days) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const config = integration.config as any;
    let accessToken = config.access_token;

    // Try to get free/busy from Calendar
    try {
      const start = new Date();
      const end = new Date();
      end.setDate(end.getDate() + days);

      const scheduleRes = await fetch("https://graph.microsoft.com/v1.0/me/calendar/getSchedule", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          schedules: [config.email || "me"],
          startTime: { dateTime: start.toISOString(), timeZone: "UTC" },
          endTime: { dateTime: end.toISOString(), timeZone: "UTC" },
          availabilityViewInterval: 60,
        }),
      });

      if (scheduleRes.ok) {
        const scheduleData = await scheduleRes.json();
        const slots = extractAvailableSlots(scheduleData, start, days);
        return new Response(JSON.stringify({ slots }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } catch (calendarErr) {
      console.error("Calendar API error:", calendarErr);
    }

    // Fallback
    return new Response(JSON.stringify({ slots: generateFallbackSlots(days) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("availability error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function generateFallbackSlots(days: number): string[] {
  const slots: string[] = [];
  const now = new Date();
  for (let d = 1; d <= days; d++) {
    const date = new Date(now);
    date.setDate(date.getDate() + d);
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    const dateStr = date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    slots.push(`• ${dateStr} at 10:00 AM`);
    slots.push(`• ${dateStr} at 2:00 PM`);
    if (slots.length >= 6) break;
  }
  return slots;
}

function extractAvailableSlots(data: any, start: Date, days: number): string[] {
  const slots: string[] = [];
  const availabilityView = data?.value?.[0]?.availabilityView || "";
  
  const preferredHours = [9, 10, 11, 14, 15, 16];
  
  for (let d = 0; d < days && slots.length < 8; d++) {
    const date = new Date(start);
    date.setDate(date.getDate() + d);
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    const dateStr = date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    
    for (const hour of preferredHours) {
      const hourIndex = d * 24 + hour;
      const avChar = availabilityView[hourIndex];
      // '0' = free, '1' = tentative, '2' = busy, '3' = OOF, '4' = working elsewhere
      if (avChar === "0" || avChar === undefined) {
        const period = hour >= 12 ? "PM" : "AM";
        const displayHour = hour > 12 ? hour - 12 : hour;
        slots.push(`• ${dateStr} at ${displayHour}:00 ${period}`);
        if (slots.length >= 8) break;
      }
    }
  }

  return slots.length > 0 ? slots : generateFallbackSlots(days);
}
