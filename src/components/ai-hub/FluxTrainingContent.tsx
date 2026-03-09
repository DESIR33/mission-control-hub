import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Upload, Sparkles, Trash2, RefreshCw, ThumbsUp, ThumbsDown,
  Plus, Image as ImageIcon, Loader2, CheckCircle, XCircle, Clock,
} from "lucide-react";
import {
  useFluxSessions, useFluxImages, useCreateFluxSession,
  useUploadTrainingImage, useDeleteTrainingImage,
  useStartTraining, useCheckTrainingStatus,
  useFluxFeedback, useSubmitFeedback,
  useDeleteFluxSession,
  type FluxTrainingSession,
} from "@/hooks/use-flux-training";
import { toast } from "sonner";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

function getImageUrl(storagePath: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/training-images/${storagePath}`;
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
    pending: { variant: "outline", icon: <Clock className="h-3 w-3" /> },
    training: { variant: "default", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
    completed: { variant: "secondary", icon: <CheckCircle className="h-3 w-3" /> },
    failed: { variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
  };
  const v = variants[status] || variants.pending;
  return (
    <Badge variant={v.variant} className="gap-1">
      {v.icon} {status}
    </Badge>
  );
}

function SessionDetail({ session, onBack }: { session: FluxTrainingSession; onBack: () => void }) {
  const { data: images = [], isLoading: imagesLoading } = useFluxImages(session.id);
  const uploadImage = useUploadTrainingImage();
  const deleteImage = useDeleteTrainingImage();
  const startTraining = useStartTraining();
  const checkStatus = useCheckTrainingStatus();
  const [trainingProgress, setTrainingProgress] = useState<number | null>(null);
  const [trainingStep, setTrainingStep] = useState<string | null>(null);

  // Auto-poll training progress every 15 seconds
  useEffect(() => {
    if (session.status !== "training") {
      setTrainingProgress(null);
      setTrainingStep(null);
      return;
    }

    const poll = () => {
      checkStatus.mutate(session.id, {
        onSuccess: (data) => {
          if (data?.progress != null) {
            setTrainingProgress(data.progress);
            setTrainingStep(`${data.current_step} / ${data.total_steps} steps`);
          }
          if (data?.status === "succeeded") {
            toast.success("✅ Training completed!");
            setTrainingProgress(100);
          } else if (data?.status === "failed" || data?.status === "canceled") {
            toast.error(`❌ Training ${data.status}`);
          }
        },
      });
    };

    // Initial check
    poll();
    const interval = setInterval(poll, 15000);
    return () => clearInterval(interval);
  }, [session.id, session.status]);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files) return;
    const fileArray = Array.from(files);
    for (const file of fileArray) {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image`);
        continue;
      }
      try {
        await uploadImage.mutateAsync({ sessionId: session.id, file });
      } catch (e: any) {
        toast.error(`Failed to upload ${file.name}: ${e.message}`);
      }
    }
    toast.success(`Uploaded ${fileArray.length} image(s)`);
  }, [session.id, uploadImage]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const canTrain = images.length >= 3 && (session.status === "pending" || session.status === "failed");

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="space-y-3">
        <Button variant="ghost" size="sm" onClick={onBack}>← Back to sessions</Button>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-foreground">{session.name}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <StatusBadge status={session.status} />
              <span className="text-xs sm:text-sm text-muted-foreground">
                Trigger: <code className="bg-muted px-1 rounded">{session.trigger_word}</code>
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            {session.status !== "training" && (
              <Button
                size="sm"
                onClick={() => startTraining.mutate(session.id)}
                disabled={!canTrain || startTraining.isPending}
              >
                {startTraining.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
                Start Training
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Training Progress Bar */}
      {session.status === "training" && (
        <Card className="border-primary/30">
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm font-medium text-foreground">Training in progress...</span>
              </div>
              <span className="text-sm font-bold text-primary">
                {trainingProgress != null ? `${trainingProgress}%` : "Starting..."}
              </span>
            </div>
            <Progress value={trainingProgress ?? 0} className="h-3" />
            {trainingStep && (
              <p className="text-xs text-muted-foreground text-right">{trainingStep}</p>
            )}
            {checkStatus.isPending && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <RefreshCw className="h-3 w-3 animate-spin" /> Checking status...
              </p>
            )}
          </CardContent>
        </Card>
      )

      {session.error_message && (
        <Card className="border-destructive">
          <CardContent className="pt-4">
            <p className="text-sm text-destructive">{session.error_message}</p>
          </CardContent>
        </Card>
      )}

      {session.status === "completed" && session.replicate_model_version && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-4">
            <p className="text-sm text-primary">
              ✅ Model trained successfully! Version: <code className="bg-muted px-1 rounded text-xs">{session.replicate_model_version}</code>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              This model is now available for thumbnail generation via the Replicate API.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Upload zone */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Training Images ({images.length})</CardTitle>
          <CardDescription>Upload selfies for training. Minimum 3 images, recommended 10-20 for best results.</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="border-2 border-dashed border-border rounded-lg p-4 sm:p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => document.getElementById("training-file-input")?.click()}
          >
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Drag & drop images here or <span className="text-primary underline">browse</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP • Multiple files supported</p>
            <input
              id="training-file-input"
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>

          {uploadImage.isPending && (
            <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Uploading...
            </div>
          )}

          {imagesLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : images.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3 mt-4">
              {images.map((img) => (
                <div key={img.id} className="relative group aspect-square rounded-lg overflow-hidden border border-border">
                  <img
                    src={getImageUrl(img.storage_path)}
                    alt={img.file_name}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteImage.mutate({ id: img.id, storagePath: img.storage_path }); }}
                    className="absolute top-1 right-1 bg-destructive/80 text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground py-6">No images uploaded yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function FeedbackGallery() {
  const { data: feedback = [], isLoading } = useFluxFeedback();
  const submitFeedback = useSubmitFeedback();

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!feedback.length) return (
    <Card>
      <CardContent className="py-8 text-center text-sm text-muted-foreground">
        <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
        No feedback yet. Generate thumbnails and rate them to train the system.
      </CardContent>
    </Card>
  );

  const positive = feedback.filter(f => f.is_positive).length;
  const negative = feedback.length - positive;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Feedback History</CardTitle>
        <CardDescription>
          {positive} positive, {negative} negative — feedback is used to improve future training runs
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {feedback.map((fb) => (
            <div key={fb.id} className="relative rounded-lg overflow-hidden border border-border">
              <img src={fb.image_url} alt="" className="w-full aspect-video object-cover" />
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                <Badge variant={fb.is_positive ? "secondary" : "destructive"} className="text-xs">
                  {fb.is_positive ? <ThumbsUp className="h-3 w-3 mr-1" /> : <ThumbsDown className="h-3 w-3 mr-1" />}
                  {fb.is_positive ? "Good" : "Bad"}
                </Badge>
              </div>
              {fb.prompt && (
                <p className="text-xs text-muted-foreground p-2 line-clamp-2">{fb.prompt}</p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function FluxTrainingContent() {
  const { data: sessions = [], isLoading, error, isPending, isFetching, isError } = useFluxSessions();
  const createSession = useCreateFluxSession();
  const deleteSession = useDeleteFluxSession();
  const [selectedSession, setSelectedSession] = useState<FluxTrainingSession | null>(null);
  const [newName, setNewName] = useState("");
  const [triggerWord, setTriggerWord] = useState("MYFACE");
  const [showCreate, setShowCreate] = useState(false);

  console.log("[FluxTraining] isLoading:", isLoading, "isPending:", isPending, "isFetching:", isFetching, "isError:", isError, "error:", error, "sessions:", sessions.length);

  if (selectedSession) {
    const freshSession = sessions.find(s => s.id === selectedSession.id) || selectedSession;
    return <SessionDetail session={freshSession} onBack={() => setSelectedSession(null)} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Flux Model Training</h2>
          <p className="text-sm text-muted-foreground">Fine-tune Flux with your selfies for personalized thumbnail generation</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
          <Plus className="h-4 w-4 mr-1" /> New Session
        </Button>
      </div>

      {showCreate && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Label className="text-xs mb-1 block">Session Name</Label>
                <Input
                  placeholder="e.g. My Selfies v1"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div className="w-40">
                <Label className="text-xs mb-1 block">Trigger Word</Label>
                <Input
                  placeholder="MYFACE"
                  value={triggerWord}
                  onChange={(e) => setTriggerWord(e.target.value.toUpperCase())}
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={async () => {
                    if (!newName.trim()) { toast.error("Name required"); return; }
                    try {
                      await createSession.mutateAsync({ name: newName, trigger_word: triggerWord });
                      setNewName("");
                      setShowCreate(false);
                    } catch (e: any) {
                      console.error("Create session error:", e);
                      toast.error(`Failed to create session: ${e.message}`);
                    }
                  }}
                  disabled={createSession.isPending}
                >
                  {createSession.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sessions list */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : sessions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Sparkles className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-medium text-foreground">No training sessions yet</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Create a session, upload your selfies, and train a personalized Flux model
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {sessions.map((session) => (
            <Card
              key={session.id}
              className="hover:border-primary/30 transition-colors"
            >
              <CardContent className="py-4 flex items-center justify-between">
                <div
                  className="flex items-center gap-3 flex-1 cursor-pointer"
                  onClick={() => setSelectedSession(session)}
                >
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <ImageIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{session.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {session.image_count} images • trigger: <code>{session.trigger_word}</code>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={session.status} />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete session "${session.name}" and all its images?`)) {
                        deleteSession.mutate(session.id);
                      }
                    }}
                    disabled={deleteSession.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Separator />

      {/* Feedback section */}
      <FeedbackGallery />
    </div>
  );
}
