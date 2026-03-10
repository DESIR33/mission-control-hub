import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { ThumbnailReferenceLibrary } from "./ThumbnailReferenceLibrary";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useWorkspace } from "@/hooks/use-workspace";
import {
  useGenerateThumbnail,
  useGenerateCompositeThumbnail,
  useAssessThumbnail,
  useThumbnailAssessments,
  useSaveThumbnailAssessment,
  useUpdateThumbnailAssessment,
} from "@/hooks/use-thumbnail-lab";
import { useFluxSessions } from "@/hooks/use-flux-training";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  Image, Sparkles, BarChart3, Eye, Loader2, Download, Check, RefreshCw,
  Lightbulb, Target, Palette, Type, Users, Zap, User,
} from "lucide-react";

const THUMBNAIL_CONCEPTS = [
  {
    variant: "A",
    angle: "End State",
    description: "Show the result/transformation the viewer will achieve",
    color: "text-green-500",
  },
  {
    variant: "B",
    angle: "Process",
    description: "Show the method/tool/framework they'll learn",
    color: "text-blue-500",
  },
  {
    variant: "C",
    angle: "Before → After",
    description: "Show the transformation journey",
    color: "text-amber-500",
  },
  {
    variant: "D",
    angle: "Pain Point",
    description: "Remind them of the problem you're solving",
    color: "text-red-500",
  },
];

const MODEL_OPTIONS = [
  { value: "black-forest-labs/flux-schnell", label: "Flux Schnell (Fast)" },
  { value: "black-forest-labs/flux-dev", label: "Flux Dev (High Quality)" },
  { value: "black-forest-labs/flux-1.1-pro", label: "Flux 1.1 Pro (Best)" },
];

export function ThumbnailLab() {
  const { workspaceId } = useWorkspace();
  const { toast } = useToast();
  const [selectedVideoId, setSelectedVideoId] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState(MODEL_OPTIONS[0].value);
  const [customPrompts, setCustomPrompts] = useState<Record<string, string>>({});
  const [customSelfiePrompts, setCustomSelfiePrompts] = useState<Record<string, string>>({});
  const [generatedImages, setGeneratedImages] = useState<Record<string, string>>({});
  const [generatedSelfies, setGeneratedSelfies] = useState<Record<string, string>>({});
  const [generatedBackgrounds, setGeneratedBackgrounds] = useState<Record<string, string>>({});
  const [generatingVariants, setGeneratingVariants] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState("select");

  // LoRA composite mode
  const [useLoraMode, setUseLoraMode] = useState(false);
  const [selectedLoraSessionId, setSelectedLoraSessionId] = useState<string>("");

  const generateThumbnail = useGenerateThumbnail();
  const generateComposite = useGenerateCompositeThumbnail();
  const assessThumbnail = useAssessThumbnail();
  const saveAssessment = useSaveThumbnailAssessment();
  const { data: assessments } = useThumbnailAssessments(selectedVideoId || undefined);

  // Fetch completed Flux LoRA sessions
  const { data: fluxSessions } = useFluxSessions();
  const completedSessions = useMemo(
    () => (fluxSessions ?? []).filter((s) => s.status === "completed" && s.replicate_model_name),
    [fluxSessions]
  );
  const selectedLoraSession = useMemo(
    () => completedSessions.find((s) => s.id === selectedLoraSessionId),
    [completedSessions, selectedLoraSessionId]
  );

  // Fetch videos from youtube_video_stats
  const { data: videos } = useQuery({
    queryKey: ["yt-videos-for-thumbnails", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("youtube_video_stats")
        .select("youtube_video_id, title, views, ctr_percent, published_at")
        .eq("workspace_id", workspaceId!)
        .order("published_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!workspaceId,
  });

  const selectedVideo = useMemo(
    () => videos?.find((v) => v.youtube_video_id === selectedVideoId),
    [videos, selectedVideoId]
  );

  const currentThumbnailUrl = selectedVideoId
    ? `https://i.ytimg.com/vi/${selectedVideoId}/maxresdefault.jpg`
    : null;

  const buildPrompt = (concept: typeof THUMBNAIL_CONCEPTS[0], videoTitle: string) => {
    const base = `A professional YouTube video thumbnail in 16:9 aspect ratio for a video titled "${videoTitle}".`;

    const angles: Record<string, string> = {
      A: `${base} Show the END STATE — the result/transformation the viewer will achieve. Use bright, vibrant accent colors against a dark cinematic background. Include a compelling visual element on the left side representing success or achievement. Bold white text with a punchy 2-3 word phrase that complements the title. High contrast, professional, clean design. Dramatic lighting.`,
      B: `${base} Show the PROCESS — the method, tool, or framework viewers will learn. Dark moody background with cool blue/cyan accents. Include visual elements like dashboards, code snippets, or tool interfaces on the left side. Clean modern sans-serif text. Professional tech-channel style. High contrast foreground elements.`,
      C: `${base} Show a BEFORE → AFTER transformation. Split composition with a clear visual contrast between the old way (left, muted/red tones) and the new way (right, bright/green tones). Include an arrow or transition element. Bold text highlighting the transformation. Dark background, high contrast.`,
      D: `${base} Show the PAIN POINT — remind viewers of the problem this video solves. Use warm red/orange accent colors to create urgency. Include visual elements representing frustration or the problem state. Bold text that triggers the pain point feeling. Dark, dramatic background with high contrast elements.`,
    };

    return angles[concept.variant] || base;
  };

  const buildBackgroundPrompt = (concept: typeof THUMBNAIL_CONCEPTS[0], videoTitle: string) => {
    const base = `A cinematic YouTube thumbnail BACKGROUND ONLY (no people, no faces) in 16:9 aspect ratio for "${videoTitle}".`;
    const angles: Record<string, string> = {
      A: `${base} Dramatic explosion of light and color representing SUCCESS and achievement. Volumetric lighting, teal-and-orange grading, lens flares. Professional, premium feel.`,
      B: `${base} Dark moody tech background with blue/cyan neon accents, holographic UI elements, floating data visualizations. Futuristic atmosphere.`,
      C: `${base} Split composition: left side dark/muted/destructive, right side bright/vibrant/constructive. Dramatic transition effect in the center.`,
      D: `${base} Intense warm red/orange dramatic background with fire, sparks, or urgency elements. Dark cinematic mood. High contrast.`,
    };
    return angles[concept.variant] || base;
  };

  const buildThumbnailPrompt = (triggerWord: string, concept: typeof THUMBNAIL_CONCEPTS[0], videoTitle: string) => {
    const scenes: Record<string, string> = {
      A: `A professional YouTube thumbnail in 16:9 aspect ratio. ${triggerWord} standing confidently on the right side with a triumphant smile, looking directly at camera, upper body visible. The background is a dramatic explosion of light and color representing SUCCESS for "${videoTitle}". Volumetric lighting, teal-and-orange color grading, lens flares. Bold, cinematic, professional. 4k, sharp focus.`,
      B: `A professional YouTube thumbnail in 16:9 aspect ratio. ${triggerWord} on the right side with a focused, determined expression, slight head tilt, upper body visible. The background is a dark moody tech scene with blue/cyan neon accents, holographic UI elements for "${videoTitle}". Futuristic atmosphere. 4k, sharp focus.`,
      C: `A professional YouTube thumbnail in 16:9 aspect ratio. ${triggerWord} in the center with a surprised, excited expression with wide eyes, upper body visible. Split background: left side dark/muted, right side bright/vibrant showing transformation for "${videoTitle}". Dramatic lighting. 4k, sharp focus.`,
      D: `A professional YouTube thumbnail in 16:9 aspect ratio. ${triggerWord} on the right side with a concerned, serious expression and intense gaze, upper body visible. Background has intense warm red/orange dramatic elements with fire and sparks creating urgency for "${videoTitle}". Dark cinematic mood. 4k, sharp focus.`,
    };
    return scenes[concept.variant] || `A professional YouTube thumbnail featuring ${triggerWord} for "${videoTitle}". 16:9, 4k, sharp focus.`;
  };

  const handleGenerate = async (variant: string) => {
    if (!selectedVideo) return;

    setGeneratingVariants((prev) => ({ ...prev, [variant]: true }));

    try {
      if (useLoraMode && selectedLoraSession) {
        // Composite mode: Full thumbnail with LoRA (person+scene) + NB2 background
        const concept = THUMBNAIL_CONCEPTS.find((c) => c.variant === variant)!;
        const thumbnailPrompt = customSelfiePrompts[variant] || buildThumbnailPrompt(selectedLoraSession.trigger_word, concept, selectedVideo.title);
        const bgPrompt = customPrompts[variant] || buildBackgroundPrompt(concept, selectedVideo.title);

        const result = await generateComposite.mutateAsync({
          thumbnail_prompt: thumbnailPrompt,
          background_prompt: bgPrompt,
          lora_model: selectedLoraSession.replicate_model_name!,
          lora_version: selectedLoraSession.replicate_model_version || undefined,
          trigger_word: selectedLoraSession.trigger_word,
        });

        if (result.thumbnail_url) {
          setGeneratedSelfies((prev) => ({ ...prev, [variant]: result.thumbnail_url }));
        }
        if (result.background_url) {
          setGeneratedBackgrounds((prev) => ({ ...prev, [variant]: result.background_url }));
        }

        if (result.thumbnail_url || result.background_url) {
          toast({ title: `Variant ${variant} generated!` });
        }
        if (result.thumbnail_error) {
          toast({ title: "Thumbnail generation issue", description: result.thumbnail_error, variant: "destructive" });
        }
        if (result.background_error) {
          toast({ title: "Background generation issue", description: result.background_error, variant: "destructive" });
        }
      } else {
        // Standard single-image mode
        const prompt = customPrompts[variant] || buildPrompt(
          THUMBNAIL_CONCEPTS.find((c) => c.variant === variant)!,
          selectedVideo.title
        );

        const result = await generateThumbnail.mutateAsync({
          prompt,
          model: selectedModel,
        });

        if (result.success && result.image_url) {
          setGeneratedImages((prev) => ({ ...prev, [variant]: result.image_url }));
          toast({ title: `Variant ${variant} generated!` });
        } else {
          toast({ title: "Generation failed", description: result.error || "Unknown error", variant: "destructive" });
        }
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to generate thumbnail", variant: "destructive" });
    } finally {
      setGeneratingVariants((prev) => ({ ...prev, [variant]: false }));
    }
  };

  const handleGenerateAll = async () => {
    if (!selectedVideo) return;
    for (const concept of THUMBNAIL_CONCEPTS) {
      handleGenerate(concept.variant);
    }
  };

  const handleAssess = async () => {
    if (!selectedVideo) return;
    try {
      const result = await assessThumbnail.mutateAsync({
        video_title: selectedVideo.title,
        current_thumbnail_url: currentThumbnailUrl || undefined,
      });
      if (result.success) {
        await saveAssessment.mutateAsync({
          youtube_video_id: selectedVideoId,
          video_title: selectedVideo.title,
          current_thumbnail_url: currentThumbnailUrl || undefined,
          assessment_json: result.assessment,
          status: "assessed",
        });
        toast({ title: "Assessment complete!" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const latestAssessment = assessments?.[0];

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex w-full overflow-x-auto scrollbar-hide">
          <TabsTrigger value="select" className="gap-1.5 flex-shrink-0 text-xs sm:text-sm">
            <Image className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Select</span> Video
          </TabsTrigger>
          <TabsTrigger value="assess" className="gap-1.5 flex-shrink-0 text-xs sm:text-sm" disabled={!selectedVideoId}>
            <Eye className="w-3.5 h-3.5" /> Assess
          </TabsTrigger>
          <TabsTrigger value="generate" className="gap-1.5 flex-shrink-0 text-xs sm:text-sm" disabled={!selectedVideoId}>
            <Sparkles className="w-3.5 h-3.5" /> Generate
          </TabsTrigger>
          <TabsTrigger value="compare" className="gap-1.5 flex-shrink-0 text-xs sm:text-sm" disabled={Object.keys(generatedImages).length === 0 && Object.keys(generatedSelfies).length === 0}>
            <BarChart3 className="w-3.5 h-3.5" /> Compare
          </TabsTrigger>
          <TabsTrigger value="references" className="gap-1.5 flex-shrink-0 text-xs sm:text-sm">
            <Palette className="w-3.5 h-3.5" /> Refs
          </TabsTrigger>
        </TabsList>

        {/* SELECT VIDEO TAB */}
        <TabsContent value="select" className="space-y-4">
          <Card className="p-5 border-border bg-card">
            <h3 className="text-sm font-semibold text-foreground mb-3">Choose a video to analyze</h3>
            {!videos?.length ? (
              <p className="text-sm text-muted-foreground">No videos found. Sync your YouTube data first.</p>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {videos.map((v) => (
                  <button
                    key={v.youtube_video_id}
                    onClick={() => {
                      setSelectedVideoId(v.youtube_video_id);
                      setActiveTab("assess");
                    }}
                    className={`w-full flex items-start gap-3 p-3 rounded-lg border transition-colors text-left ${
                      selectedVideoId === v.youtube_video_id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40 hover:bg-muted/30"
                    }`}
                  >
                    <img
                      src={`https://i.ytimg.com/vi/${v.youtube_video_id}/mqdefault.jpg`}
                      alt=""
                      className="w-28 h-16 rounded object-cover shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{v.title}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {v.views?.toLocaleString()} views
                        </span>
                        <span className="text-xs text-muted-foreground">
                          CTR: {v.ctr_percent?.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ASSESS TAB */}
        <TabsContent value="assess" className="space-y-4">
          {selectedVideo && (
            <>
              <Card className="p-5 border-border bg-card">
                <div className="flex flex-col sm:flex-row items-start gap-4">
                  {currentThumbnailUrl && (
                    <img
                      src={currentThumbnailUrl}
                      alt="Current thumbnail"
                      className="w-full sm:w-64 rounded-lg border border-border"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://i.ytimg.com/vi/${selectedVideoId}/hqdefault.jpg`;
                      }}
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">{selectedVideo.title}</h3>
                    <div className="flex gap-3 mt-2">
                      <Badge variant="outline">{selectedVideo.views?.toLocaleString()} views</Badge>
                      <Badge variant="outline">CTR: {selectedVideo.ctr_percent?.toFixed(1)}%</Badge>
                    </div>
                    <Button
                      onClick={handleAssess}
                      className="mt-4"
                      disabled={assessThumbnail.isPending}
                      size="sm"
                    >
                      {assessThumbnail.isPending ? (
                        <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Assessing...</>
                      ) : (
                        <><Eye className="w-3.5 h-3.5 mr-1.5" /> Run Assessment</>
                      )}
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Assessment Results */}
              {latestAssessment && (
                <Card className="p-5 border-border bg-card space-y-4">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    Assessment Framework
                  </h3>

                  {/* Psychology Flow */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">3-Step Viewer Psychology</p>
                    {Object.entries(latestAssessment.assessment_json?.psychology_flow ?? {}).map(([key, val]: [string, any]) => (
                      <div key={key} className="rounded-lg border border-border p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-foreground capitalize">{key.replace(/_/g, ' ')}</span>
                          {val?.score !== null && val?.score !== undefined ? (
                            <Badge variant={val.score >= 7 ? "default" : "secondary"}>{val.score}/10</Badge>
                          ) : (
                            <Badge variant="outline">Not scored</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{val?.description}</p>
                      </div>
                    ))}
                  </div>

                  {/* Desire Loop */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Target className="w-3 h-3" /> Desire Loop
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {["core_desire", "pain_point", "solution_transformation", "curiosity_loop"].map((field) => (
                        <div key={field} className="rounded-lg border border-border p-3">
                          <span className="text-xs font-medium text-foreground capitalize">{field.replace(/_/g, ' ')}</span>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {latestAssessment.assessment_json?.desire_loop?.[field] || "Fill in to guide generation"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Stun Gun Elements */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Zap className="w-3 h-3" /> Visual Stun Gun Elements
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(latestAssessment.assessment_json?.stun_gun_elements ?? {}).map(([key, val]) => (
                        <Badge key={key} variant={val ? "default" : "outline"} className="text-xs capitalize">
                          {val ? <Check className="w-3 h-3 mr-1" /> : null}
                          {key.replace(/_/g, ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* GENERATE TAB */}
        <TabsContent value="generate" className="space-y-4">
          <Card className="p-5 border-border bg-card">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Generate Thumbnail Alternatives</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  4 concepts based on the desire loop framework
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {!useLoraMode && (
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger className="w-48 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MODEL_OPTIONS.map((m) => (
                        <SelectItem key={m.value} value={m.value} className="text-xs">
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Button size="sm" onClick={handleGenerateAll}>
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Generate All 4
                </Button>
              </div>
            </div>

            {/* LoRA Composite Mode Toggle */}
            <Card className="p-4 border-border bg-muted/30 mb-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  <Label htmlFor="lora-mode" className="text-sm font-medium text-foreground cursor-pointer">
                    Use Trained LoRA Model (Selfie + Background)
                  </Label>
                </div>
                <Switch
                  id="lora-mode"
                  checked={useLoraMode}
                  onCheckedChange={setUseLoraMode}
                />
              </div>

              {useLoraMode && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Generates a complete thumbnail with your trained LoRA model (person + cinematic scene in one image), plus an alternative background via Nano Banana 2.
                  </p>

                  {completedSessions.length === 0 ? (
                    <p className="text-xs text-destructive">
                      No completed LoRA training sessions found. Train a model first in AI Hub → Flux Training.
                    </p>
                  ) : (
                    <Select value={selectedLoraSessionId} onValueChange={setSelectedLoraSessionId}>
                      <SelectTrigger className="w-full h-8 text-xs">
                        <SelectValue placeholder="Select a trained LoRA model..." />
                      </SelectTrigger>
                      <SelectContent>
                        {completedSessions.map((s) => (
                          <SelectItem key={s.id} value={s.id} className="text-xs">
                            <span className="font-medium">{s.name}</span>
                            <span className="text-muted-foreground ml-2">
                              (trigger: {s.trigger_word})
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {selectedLoraSession && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        Model: {selectedLoraSession.replicate_model_name}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        Trigger: {selectedLoraSession.trigger_word}
                      </Badge>
                      <Badge variant="default" className="text-xs">
                        <Check className="w-3 h-3 mr-1" /> Trained
                      </Badge>
                    </div>
                  )}
                </div>
              )}
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {THUMBNAIL_CONCEPTS.map((concept) => {
                const defaultPrompt = selectedVideo
                  ? (useLoraMode ? buildBackgroundPrompt(concept, selectedVideo.title) : buildPrompt(concept, selectedVideo.title))
                  : "";
                const defaultSelfiePrompt = selectedLoraSession && selectedVideo
                  ? buildThumbnailPrompt(selectedLoraSession.trigger_word, concept, selectedVideo.title)
                  : "";
                const isGenerating = generatingVariants[concept.variant];
                const imageUrl = generatedImages[concept.variant];
                const selfieUrl = generatedSelfies[concept.variant];
                const bgUrl = generatedBackgrounds[concept.variant];

                return (
                  <Card key={concept.variant} className="p-4 border-border bg-muted/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${concept.color}`}>
                          {concept.variant}
                        </span>
                        <span className="text-xs font-medium text-foreground">{concept.angle}</span>
                        {useLoraMode && (
                          <Badge variant="secondary" className="text-[10px]">
                            <User className="w-2.5 h-2.5 mr-0.5" /> LoRA + NB2
                          </Badge>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleGenerate(concept.variant)}
                        disabled={isGenerating || (useLoraMode && !selectedLoraSession)}
                      >
                        {isGenerating ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (imageUrl || selfieUrl) ? (
                          <><RefreshCw className="w-3.5 h-3.5 mr-1" /> Regenerate</>
                        ) : (
                          <><Sparkles className="w-3.5 h-3.5 mr-1" /> Generate</>
                        )}
                      </Button>
                    </div>

                    <p className="text-xs text-muted-foreground">{concept.description}</p>

                    {/* LoRA mode: show thumbnail prompt + background prompt */}
                    {useLoraMode ? (
                      <div className="space-y-2">
                        <div>
                          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">
                            Thumbnail Prompt (LoRA — person + scene)
                          </Label>
                          <Textarea
                            value={customSelfiePrompts[concept.variant] ?? defaultSelfiePrompt}
                            onChange={(e) =>
                              setCustomSelfiePrompts((prev) => ({ ...prev, [concept.variant]: e.target.value }))
                            }
                            className="text-xs h-16 resize-none"
                            placeholder="Full thumbnail prompt with person and scene..."
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">
                            Background Prompt (Nano Banana 2)
                          </Label>
                          <Textarea
                            value={customPrompts[concept.variant] ?? defaultPrompt}
                            onChange={(e) =>
                              setCustomPrompts((prev) => ({ ...prev, [concept.variant]: e.target.value }))
                            }
                            className="text-xs h-16 resize-none"
                            placeholder="Background generation prompt..."
                          />
                        </div>
                      </div>
                    ) : (
                      <Textarea
                        value={customPrompts[concept.variant] ?? defaultPrompt}
                        onChange={(e) =>
                          setCustomPrompts((prev) => ({ ...prev, [concept.variant]: e.target.value }))
                        }
                        className="text-xs h-24 resize-none"
                        placeholder="Customize the generation prompt..."
                      />
                    )}

                    {/* Loading state */}
                    {isGenerating && (
                      <div className="aspect-video rounded-lg bg-muted flex items-center justify-center border border-border">
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="w-6 h-6 animate-spin text-primary" />
                          <span className="text-xs text-muted-foreground">
                            {useLoraMode ? "Generating selfie + background..." : "Generating..."}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Composite results (LoRA mode) */}
                    {useLoraMode && !isGenerating && (selfieUrl || bgUrl) && (
                      <div className="space-y-2">
                        {selfieUrl && (
                          <div className="relative group">
                            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">
                              <User className="w-3 h-3 inline mr-1" /> LoRA Selfie
                            </Label>
                            <img
                              src={selfieUrl}
                              alt={`Selfie ${concept.variant}`}
                              className="w-full rounded-lg border border-primary/30"
                            />
                            <a
                              href={selfieUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="absolute top-6 right-2 p-1.5 rounded bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        )}
                        {bgUrl && (
                          <div className="relative group">
                            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">
                              <Palette className="w-3 h-3 inline mr-1" /> Background (Nano Banana 2)
                            </Label>
                            <img
                              src={bgUrl}
                              alt={`Background ${concept.variant}`}
                              className="w-full rounded-lg border border-border"
                            />
                            <a
                              href={bgUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="absolute top-6 right-2 p-1.5 rounded bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Standard single-image result */}
                    {!useLoraMode && imageUrl && !isGenerating && (
                      <div className="relative group">
                        <img
                          src={imageUrl}
                          alt={`Variant ${concept.variant}`}
                          className="w-full rounded-lg border border-border"
                        />
                        <a
                          href={imageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute top-2 right-2 p-1.5 rounded bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </Card>
        </TabsContent>

        {/* COMPARE TAB */}
        <TabsContent value="compare" className="space-y-4">
          <Card className="p-5 border-border bg-card">
            <h3 className="text-sm font-semibold text-foreground mb-4">Side-by-Side Comparison</h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Current thumbnail */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Current</p>
                {currentThumbnailUrl && (
                  <img
                    src={currentThumbnailUrl}
                    alt="Current"
                    className="w-full rounded-lg border border-border"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://i.ytimg.com/vi/${selectedVideoId}/hqdefault.jpg`;
                    }}
                  />
                )}
                {selectedVideo && (
                  <div className="flex gap-2">
                    <Badge variant="outline">{selectedVideo.views?.toLocaleString()} views</Badge>
                    <Badge variant="outline">CTR: {selectedVideo.ctr_percent?.toFixed(1)}%</Badge>
                  </div>
                )}
              </div>

              {/* Generated variants - standard mode */}
              {Object.entries(generatedImages).map(([variant, url]) => {
                const concept = THUMBNAIL_CONCEPTS.find((c) => c.variant === variant);
                return (
                  <div key={variant} className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <span className={concept?.color}>Variant {variant}</span>
                      — {concept?.angle}
                    </p>
                    <img
                      src={url}
                      alt={`Variant ${variant}`}
                      className="w-full rounded-lg border border-border"
                    />
                    <Button size="sm" variant="outline" className="w-full">
                      <Check className="w-3.5 h-3.5 mr-1.5" /> Select This Variant
                    </Button>
                  </div>
                );
              })}

              {/* Generated variants - composite mode */}
              {Object.entries(generatedSelfies).map(([variant, selfieUrl]) => {
                const concept = THUMBNAIL_CONCEPTS.find((c) => c.variant === variant);
                const bgUrl = generatedBackgrounds[variant];
                return (
                  <div key={`composite-${variant}`} className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <span className={concept?.color}>Variant {variant}</span>
                      — {concept?.angle}
                      <Badge variant="secondary" className="text-[10px] ml-1">LoRA</Badge>
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[10px] text-muted-foreground mb-1">Selfie</p>
                        <img src={selfieUrl} alt={`Selfie ${variant}`} className="w-full rounded-lg border border-primary/30" />
                      </div>
                      {bgUrl && (
                        <div>
                          <p className="text-[10px] text-muted-foreground mb-1">Background</p>
                          <img src={bgUrl} alt={`BG ${variant}`} className="w-full rounded-lg border border-border" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </TabsContent>

        {/* REFERENCES TAB */}
        <TabsContent value="references" className="space-y-4">
          <ThumbnailReferenceLibrary />
        </TabsContent>
      </Tabs>
    </div>
  );
}
