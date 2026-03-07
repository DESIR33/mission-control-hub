import { useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/hooks/use-workspace";
import { useGrowthForecast } from "@/hooks/use-growth-forecast";
import { useChannelStats, useYouTubeVideoStats } from "@/hooks/use-youtube-analytics";
import { useCreateSprint, useCurrentSprint, type SprintTask, type GrowthSprint } from "@/hooks/use-growth-sprints";
import { useCollaborations } from "@/hooks/use-collaborations";

interface GeneratedSprint {
  subTarget: number;
  subCountStart: number;
  goals: string[];
  tasks: SprintTask[];
}

function makeId(): string {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

function makeTask(
  title: string,
  category: SprintTask["category"]
): SprintTask {
  return { id: makeId(), title, completed: false, category };
}

export function useGenerateSprint() {
  const { data: forecast } = useGrowthForecast();
  const { data: channelStats } = useChannelStats();
  const { data: videoStats = [] } = useYouTubeVideoStats(20);
  const { data: collaborations = [] } = useCollaborations();
  const createSprint = useCreateSprint();

  const generatedSprint = useMemo((): GeneratedSprint | null => {
    const currentSubs = channelStats?.subscriber_count ?? forecast?.currentSubs ?? 0;
    if (currentSubs === 0) return null;

    const dailyRate = forecast?.dailyRate ?? 0;
    const targetSubs = forecast?.targetSubs ?? 50_000;
    const subsRemaining = targetSubs - currentSubs;
    const onTrack = forecast?.onTrack ?? false;

    const tasks: SprintTask[] = [];
    const goals: string[] = [];

    // 1. Check if any recent video published (look for published_at within last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentVideos = videoStats.filter(
      (v) => v.published_at && new Date(v.published_at) > sevenDaysAgo
    );

    if (recentVideos.length === 0) {
      tasks.push(makeTask("Publish a new video this week", "content"));
      goals.push("Maintain consistent upload schedule");
    }

    // 2. Check CTR — find lowest CTR video and suggest thumbnail redesign
    const videosWithCtr = videoStats.filter((v) => v.ctr_percent > 0);
    if (videosWithCtr.length > 0) {
      const avgCtr =
        videosWithCtr.reduce((sum, v) => sum + v.ctr_percent, 0) /
        videosWithCtr.length;
      const lowestCtr = [...videosWithCtr].sort(
        (a, b) => a.ctr_percent - b.ctr_percent
      )[0];
      if (lowestCtr && lowestCtr.ctr_percent < avgCtr) {
        const titleSnippet =
          lowestCtr.title.length > 40
            ? lowestCtr.title.slice(0, 40) + "..."
            : lowestCtr.title;
        tasks.push(
          makeTask(
            `Redesign thumbnail for "${titleSnippet}" (CTR: ${lowestCtr.ctr_percent.toFixed(1)}%)`,
            "content"
          )
        );
      }
    }

    // 3. Always include engagement task
    tasks.push(makeTask("Reply to 20 comments across your videos", "engagement"));

    // 4. Check for deals/collabs in pipeline
    const inPipeline = collaborations.filter(
      (c) =>
        c.status === "contacted" ||
        c.status === "negotiating" ||
        c.status === "confirmed"
    );
    if (inPipeline.length > 0) {
      const collab = inPipeline[0];
      tasks.push(
        makeTask(`Follow up on collab with ${collab.creator_name}`, "deals")
      );
    }

    // 5. Always include repurposing
    tasks.push(
      makeTask("Repurpose latest video to 3 platforms (Shorts, TikTok, Twitter)", "content")
    );

    // 6. If behind pace, add outreach
    if (!onTrack && subsRemaining > 0) {
      tasks.push(
        makeTask("Reach out to 3 potential collab partners", "outreach")
      );
      goals.push("Accelerate growth to get back on target pace");
    }

    // 7. SEO optimization
    tasks.push(
      makeTask("Optimize titles and descriptions for SEO on recent uploads", "content")
    );

    // Calculate weekly sub target based on daily rate
    const weeklyTarget = Math.max(
      Math.round(dailyRate * 7),
      Math.round(subsRemaining / 52) // fallback: divide remaining by weeks in a year
    );

    goals.push(`Gain +${weeklyTarget} subscribers this week`);

    return {
      subTarget: weeklyTarget > 0 ? weeklyTarget : 100,
      subCountStart: currentSubs,
      goals,
      tasks: tasks.slice(0, 7), // Cap at 7 tasks
    };
  }, [forecast, channelStats, videoStats, collaborations]);

  const generate = async () => {
    if (!generatedSprint) throw new Error("No data available to generate sprint");
    return createSprint.mutateAsync(generatedSprint);
  };

  return {
    generatedSprint,
    generate,
    isGenerating: createSprint.isPending,
  };
}

export interface SprintReviewData {
  sprint: GrowthSprint;
  tasksCompleted: number;
  totalTasks: number;
  completionRate: number;
  subTarget: number;
  subsGained: number;
  subsOnTrack: boolean;
  insight: string;
}

export function useSprintReview() {
  const { data: sprint } = useCurrentSprint();
  const { data: channelStats } = useChannelStats();

  const review = useMemo((): SprintReviewData | null => {
    if (!sprint) return null;

    const tasks = sprint.tasks ?? [];
    const tasksCompleted = tasks.filter((t) => t.completed).length;
    const totalTasks = tasks.length;
    const completionRate =
      totalTasks > 0 ? Math.round((tasksCompleted / totalTasks) * 100) : 0;

    const subCountStart = sprint.sub_count_start ?? 0;
    const currentSubs = channelStats?.subscriber_count ?? subCountStart;
    const subsGained = currentSubs - subCountStart;
    const subTarget = sprint.sub_target;
    const subsOnTrack = subsGained >= subTarget * 0.7; // 70% threshold

    // Generate insight string
    let insight: string;
    if (completionRate === 100 && subsGained >= subTarget) {
      insight = `You completed all ${totalTasks} tasks and gained ${subsGained.toLocaleString()} subs this week — exceeding your target of ${subTarget.toLocaleString()}!`;
    } else if (completionRate >= 70) {
      insight = `You completed ${tasksCompleted}/${totalTasks} tasks and gained ${subsGained.toLocaleString()} subs. ${subsGained >= subTarget ? "Great job hitting your sub target!" : `${(subTarget - subsGained).toLocaleString()} subs short of target.`}`;
    } else {
      insight = `You completed ${tasksCompleted}/${totalTasks} tasks and gained ${subsGained.toLocaleString()} subs this week. Try to complete more tasks next week to accelerate growth.`;
    }

    return {
      sprint,
      tasksCompleted,
      totalTasks,
      completionRate,
      subTarget,
      subsGained,
      subsOnTrack,
      insight,
    };
  }, [sprint, channelStats]);

  return { data: review };
}
