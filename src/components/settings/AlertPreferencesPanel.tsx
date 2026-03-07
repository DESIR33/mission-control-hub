import { useState, useEffect } from "react";
import {
  Bell,
  Smartphone,
  Send,
  TrendingUp,
  Target,
  AlertTriangle,
  Save,
  Loader2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  useAlertPreferences,
  useUpdateAlertPreferences,
  type AlertPreferences,
} from "@/hooks/use-alert-preferences";
import { toast } from "sonner";

const MILESTONE_OPTIONS = [25000, 30000, 35000, 40000, 45000, 50000];

export function AlertPreferencesPanel() {
  const { data: prefs, isLoading } = useAlertPreferences();
  const updatePrefs = useUpdateAlertPreferences();

  const [pushEnabled, setPushEnabled] = useState(false);
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [telegramChatId, setTelegramChatId] = useState("");
  const [viralThreshold, setViralThreshold] = useState(5);
  const [subMilestones, setSubMilestones] = useState<number[]>([
    25000, 30000, 40000, 50000,
  ]);
  const [ctrDropThreshold, setCtrDropThreshold] = useState(20);
  const [dealStageAlerts, setDealStageAlerts] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(true);

  useEffect(() => {
    if (prefs) {
      setPushEnabled(prefs.push_enabled);
      setTelegramEnabled(prefs.telegram_enabled);
      setTelegramChatId(prefs.telegram_chat_id ?? "");
      setViralThreshold(prefs.viral_video_threshold);
      setSubMilestones(prefs.sub_milestones);
      setCtrDropThreshold(prefs.ctr_drop_threshold);
      setDealStageAlerts(prefs.deal_stage_alerts);
      setWeeklyDigest(prefs.weekly_digest);
    }
  }, [prefs]);

  const toggleMilestone = (milestone: number) => {
    setSubMilestones((prev) =>
      prev.includes(milestone)
        ? prev.filter((m) => m !== milestone)
        : [...prev, milestone].sort((a, b) => a - b)
    );
  };

  const handleSave = () => {
    updatePrefs.mutate(
      {
        push_enabled: pushEnabled,
        telegram_enabled: telegramEnabled,
        telegram_chat_id: telegramChatId || null,
        viral_video_threshold: viralThreshold,
        sub_milestones: subMilestones,
        ctr_drop_threshold: ctrDropThreshold,
        deal_stage_alerts: dealStageAlerts,
        weekly_digest: weeklyDigest,
      },
      {
        onSuccess: () => {
          toast.success("Alert preferences saved");
        },
        onError: (err) => {
          toast.error(
            `Failed to save preferences: ${err instanceof Error ? err.message : "Unknown error"}`
          );
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Growth Alert Preferences
          </CardTitle>
          <CardDescription>
            Configure how and when you receive growth alerts and notifications.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Push Notifications */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                Push Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive push notifications for growth alerts
              </p>
            </div>
            <Switch checked={pushEnabled} onCheckedChange={setPushEnabled} />
          </div>

          {/* Telegram Integration */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  Telegram Integration
                </Label>
                <p className="text-sm text-muted-foreground">
                  Get alerts via Telegram bot
                </p>
              </div>
              <Switch
                checked={telegramEnabled}
                onCheckedChange={setTelegramEnabled}
              />
            </div>
            {telegramEnabled && (
              <div className="pl-6">
                <Label htmlFor="telegram-chat-id" className="text-sm">
                  Telegram Chat ID
                </Label>
                <Input
                  id="telegram-chat-id"
                  placeholder="Enter your Telegram chat ID"
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  className="mt-1.5 max-w-sm"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Alert Thresholds
          </CardTitle>
          <CardDescription>
            Set thresholds for when alerts should trigger.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Viral Video Threshold */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Viral Video Threshold
            </Label>
            <p className="text-sm text-muted-foreground">
              Alert when a video gets{" "}
              <span className="font-medium text-foreground">
                {viralThreshold}x
              </span>{" "}
              your average views
            </p>
            <Slider
              value={[viralThreshold]}
              onValueChange={([val]) => setViralThreshold(val)}
              min={2}
              max={10}
              step={1}
              className="max-w-sm"
            />
            <div className="flex justify-between text-xs text-muted-foreground max-w-sm">
              <span>2x</span>
              <span>10x</span>
            </div>
          </div>

          {/* Subscriber Milestones */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Subscriber Milestones
            </Label>
            <p className="text-sm text-muted-foreground">
              Get notified when you hit these subscriber counts
            </p>
            <div className="flex flex-wrap gap-2">
              {MILESTONE_OPTIONS.map((milestone) => {
                const isSelected = subMilestones.includes(milestone);
                return (
                  <Button
                    key={milestone}
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleMilestone(milestone)}
                  >
                    {(milestone / 1000).toFixed(0)}K
                  </Button>
                );
              })}
            </div>
          </div>

          {/* CTR Drop Threshold */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              CTR Drop Threshold
            </Label>
            <p className="text-sm text-muted-foreground">
              Alert when click-through rate drops by{" "}
              <span className="font-medium text-foreground">
                {ctrDropThreshold}%
              </span>
            </p>
            <Slider
              value={[ctrDropThreshold]}
              onValueChange={([val]) => setCtrDropThreshold(val)}
              min={10}
              max={50}
              step={5}
              className="max-w-sm"
            />
            <div className="flex justify-between text-xs text-muted-foreground max-w-sm">
              <span>10%</span>
              <span>50%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Additional Alerts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Deal Stage Alerts */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Deal Stage Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Get notified when deals move to a new stage
              </p>
            </div>
            <Switch
              checked={dealStageAlerts}
              onCheckedChange={setDealStageAlerts}
            />
          </div>

          {/* Weekly Digest */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Weekly Digest</Label>
              <p className="text-sm text-muted-foreground">
                Receive a weekly summary of growth metrics
              </p>
            </div>
            <Switch
              checked={weeklyDigest}
              onCheckedChange={setWeeklyDigest}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={updatePrefs.isPending}>
          {updatePrefs.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save Preferences
        </Button>
      </div>
    </div>
  );
}
