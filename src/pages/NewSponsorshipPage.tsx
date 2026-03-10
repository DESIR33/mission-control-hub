import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Handshake, Film, Search, Plus, Trash2, Loader2, CalendarIcon, ChevronsUpDown, Check } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useCompanies } from "@/hooks/use-companies";
import { useContacts } from "@/hooks/use-contacts";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { format } from "date-fns";

interface YouTubeVideo {
  id: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  publishedAt: string;
}

export default function NewSponsorshipPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspace();

  const [formData, setFormData] = useState({
    companyId: "",
    contactId: "",
    dealType: "",
    status: "draft",
    value: "",
    currency: "USD",
    deliverables: "",
    requirements: "",
    paymentTerms: "",
    paymentMethod: "",
    notes: "",
    paymentStatus: "pending",
  });

  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [videoSearchQuery, setVideoSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<YouTubeVideo[]>([]);
  const [selectedVideos, setSelectedVideos] = useState<YouTubeVideo[]>([]);
  const [showVideoSearch, setShowVideoSearch] = useState(false);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  const { data: companies = [] } = useCompanies();
  const { data: contacts = [] } = useContacts();

  const sortedCompanies = [...companies].sort((a, b) => a.name.localeCompare(b.name));
  const sortedContacts = [...contacts].sort((a, b) => {
    const nameA = `${a.first_name} ${a.last_name || ""}`.trim();
    const nameB = `${b.first_name} ${b.last_name || ""}`.trim();
    return nameA.localeCompare(nameB);
  });

  const handleStartDateChange = (date: Date | undefined) => {
    setStartDate(date);
  };

  const handleEndDateChange = (date: Date | undefined) => {
    setEndDate(date);
  };

  const createSponsorship = useMutation({
    mutationFn: async () => {
      if (!workspaceId) throw new Error("No workspace selected");

      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("deals")
        .insert({
          workspace_id: workspaceId,
          title: `${formData.dealType || "Sponsorship"} - ${companies.find(c => c.id === formData.companyId)?.name || "Unknown"}`,
          company_id: formData.companyId || null,
          contact_id: formData.contactId || null,
          stage: formData.status === "draft" ? "prospecting" : "negotiation",
          value: parseFloat(formData.value) || null,
          currency: formData.currency,
          expected_close_date: endDate ? endDate.toISOString().split("T")[0] : null,
          notes: [
            formData.dealType ? `Deal Type: ${formData.dealType}` : "",
            formData.deliverables ? `Deliverables:\n${formData.deliverables}` : "",
            formData.requirements ? `Requirements:\n${formData.requirements}` : "",
            formData.paymentTerms ? `Payment Terms:\n${formData.paymentTerms}` : "",
            formData.paymentMethod ? `Payment Method: ${formData.paymentMethod}` : "",
            formData.paymentStatus ? `Payment Status: ${formData.paymentStatus}` : "",
            startDate ? `Start Date: ${format(startDate, "PPP")}` : "",
            formData.notes || "",
          ].filter(Boolean).join("\n\n"),
          created_by: user?.id ?? null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      toast({ title: "Success", description: "Sponsorship created successfully" });
      navigate("/monetization?tab=sponsorships");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const searchYouTubeVideos = async () => {
    if (!videoSearchQuery.trim()) return;
    setIsSearching(true);
    try {
      // Search from local youtube_video_stats table
      if (!workspaceId) return;
      const { data, error } = await supabase
        .from("youtube_video_stats")
        .select("youtube_video_id, title, published_at")
        .eq("workspace_id", workspaceId)
        .ilike("title", `%${videoSearchQuery}%`)
        .order("published_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      setSearchResults(
        (data ?? []).map((v) => ({
          id: v.youtube_video_id,
          title: v.title,
          publishedAt: v.published_at ?? "",
          thumbnailUrl: `https://i.ytimg.com/vi/${v.youtube_video_id}/mqdefault.jpg`,
        }))
      );
    } catch {
      toast({ title: "Error", description: "Failed to search videos", variant: "destructive" });
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddVideo = (video: YouTubeVideo) => {
    if (selectedVideos.some((v) => v.id === video.id)) return;
    setSelectedVideos([...selectedVideos, video]);
    setShowVideoSearch(false);
  };

  const handleRemoveVideo = (videoId: string) => {
    setSelectedVideos(selectedVideos.filter((v) => v.id !== videoId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createSponsorship.mutateAsync();
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen">
      <div className="mx-auto max-w-2xl">
        <button
          onClick={() => navigate("/monetization?tab=sponsorships")}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Monetization
        </button>

        <div className="flex items-center gap-2 mb-6">
          <Handshake className="h-5 w-5 text-foreground" />
          <h1 className="text-xl font-bold tracking-tight text-foreground">New Sponsorship</h1>
        </div>

        <Tabs defaultValue="details">
          <TabsList className="mb-6">
            <TabsTrigger value="details">Sponsorship Details</TabsTrigger>
            <TabsTrigger value="videos">YouTube Videos</TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            <Card>
              <CardHeader>
                <CardTitle>Sponsorship Details</CardTitle>
                <CardDescription>Enter the details of the sponsorship deal</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Company</Label>
                      <Popover open={companyOpen} onOpenChange={setCompanyOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={companyOpen}
                            className="w-full justify-between font-normal"
                          >
                            {formData.companyId
                              ? sortedCompanies.find((c) => c.id === formData.companyId)?.name
                              : "Select company"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                          <Command>
                            <CommandInput placeholder="Search companies..." />
                            <CommandList>
                              <CommandEmpty>No company found.</CommandEmpty>
                              <CommandGroup>
                                {sortedCompanies.map((company) => (
                                  <CommandItem
                                    key={company.id}
                                    value={company.name}
                                    onSelect={() => {
                                      setFormData({ ...formData, companyId: company.id });
                                      setCompanyOpen(false);
                                    }}
                                  >
                                    <Check className={cn("mr-2 h-4 w-4", formData.companyId === company.id ? "opacity-100" : "opacity-0")} />
                                    {company.name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label>Contact (Optional)</Label>
                      <Popover open={contactOpen} onOpenChange={setContactOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={contactOpen}
                            className="w-full justify-between font-normal"
                          >
                            {formData.contactId
                              ? (() => {
                                  const c = sortedContacts.find((c) => c.id === formData.contactId);
                                  return c ? `${c.first_name} ${c.last_name || ""}`.trim() : "Select contact";
                                })()
                              : "Select contact"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                          <Command>
                            <CommandInput placeholder="Search contacts..." />
                            <CommandList>
                              <CommandEmpty>No contact found.</CommandEmpty>
                              <CommandGroup>
                                {sortedContacts.map((contact) => {
                                  const fullName = `${contact.first_name} ${contact.last_name || ""}`.trim();
                                  return (
                                    <CommandItem
                                      key={contact.id}
                                      value={fullName}
                                      onSelect={() => {
                                        setFormData({ ...formData, contactId: contact.id });
                                        setContactOpen(false);
                                      }}
                                    >
                                      <Check className={cn("mr-2 h-4 w-4", formData.contactId === contact.id ? "opacity-100" : "opacity-0")} />
                                      {fullName}
                                    </CommandItem>
                                  );
                                })}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Deal Type</Label>
                      <Select
                        value={formData.dealType}
                        onValueChange={(value) => setFormData({ ...formData, dealType: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select deal type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sponsored_content">Sponsored Content</SelectItem>
                          <SelectItem value="brand_ambassador">Brand Ambassador</SelectItem>
                          <SelectItem value="affiliate_partnership">Affiliate Partnership</SelectItem>
                          <SelectItem value="product_placement">Product Placement</SelectItem>
                          <SelectItem value="event_sponsorship">Event Sponsorship</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Deal Value</Label>
                      <div className="flex gap-2">
                        <Select
                          value={formData.currency}
                          onValueChange={(value) => setFormData({ ...formData, currency: value })}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="EUR">EUR</SelectItem>
                            <SelectItem value="GBP">GBP</SelectItem>
                            <SelectItem value="CAD">CAD</SelectItem>
                            <SelectItem value="AUD">AUD</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.value}
                          onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                          placeholder="e.g., 1000"
                          required
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={`w-full justify-start text-left font-normal ${!startDate && "text-muted-foreground"}`}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {startDate ? format(startDate, "PPP") : "Select start date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar mode="single" selected={startDate} onSelect={handleStartDateChange} initialFocus />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label>End Date (Optional)</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={`w-full justify-start text-left font-normal ${!endDate && "text-muted-foreground"}`}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {endDate ? format(endDate, "PPP") : "Select end date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar mode="single" selected={endDate} onSelect={handleEndDateChange} initialFocus fromDate={startDate} />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Payment Method</Label>
                      <Select
                        value={formData.paymentMethod}
                        onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="wise">Wise</SelectItem>
                          <SelectItem value="zelle">Zelle</SelectItem>
                          <SelectItem value="stripe">Stripe</SelectItem>
                          <SelectItem value="paypal">PayPal</SelectItem>
                          <SelectItem value="cashapp">CashApp</SelectItem>
                          <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Payment Status</Label>
                      <Select
                        value={formData.paymentStatus}
                        onValueChange={(value) => setFormData({ ...formData, paymentStatus: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="partial">Partial</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                          <SelectItem value="overdue">Overdue</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Deliverables (One per line)</Label>
                    <Textarea
                      value={formData.deliverables}
                      onChange={(e) => setFormData({ ...formData, deliverables: e.target.value })}
                      placeholder="Enter deliverables, one per line"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Requirements</Label>
                    <Textarea
                      value={formData.requirements}
                      onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                      placeholder="Enter requirements"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Payment Terms</Label>
                    <Textarea
                      value={formData.paymentTerms}
                      onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                      placeholder="Enter payment terms"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Additional Notes</Label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Any additional notes"
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button type="button" variant="outline" onClick={() => navigate("/monetization?tab=sponsorships")}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createSponsorship.isPending}>
                      {createSponsorship.isPending ? "Creating..." : "Create Sponsorship"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="videos">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle>YouTube Videos</CardTitle>
                    <CardDescription>Link YouTube videos to this sponsorship</CardDescription>
                  </div>
                  <Dialog open={showVideoSearch} onOpenChange={setShowVideoSearch}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Film className="mr-2 h-4 w-4" />
                        Search Videos
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px]">
                      <DialogHeader>
                        <DialogTitle>Search YouTube Videos</DialogTitle>
                        <DialogDescription>
                          Search for videos from your channel to link to this sponsorship.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="mt-4 space-y-4">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Search for videos..."
                            value={videoSearchQuery}
                            onChange={(e) => setVideoSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), searchYouTubeVideos())}
                            className="flex-1"
                          />
                          <Button onClick={searchYouTubeVideos} disabled={isSearching || !videoSearchQuery.trim()} size="icon" variant="outline">
                            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                          </Button>
                        </div>

                        {isSearching ? (
                          <div className="py-8 text-center text-muted-foreground">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                            <p>Searching…</p>
                          </div>
                        ) : searchResults.length > 0 ? (
                          <div className="space-y-3 max-h-[400px] overflow-auto">
                            {searchResults.map((video) => (
                              <div key={video.id} className="flex gap-3 border border-border rounded-md p-3">
                                <img
                                  src={video.thumbnailUrl || `https://i.ytimg.com/vi/${video.id}/mqdefault.jpg`}
                                  alt={video.title}
                                  className="w-24 h-16 object-cover rounded"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate text-foreground">{video.title}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {video.publishedAt ? format(new Date(video.publishedAt), "MMM d, yyyy") : "No date"}
                                  </p>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleAddVideo(video)}
                                  disabled={selectedVideos.some((v) => v.id === video.id)}
                                >
                                  {selectedVideos.some((v) => v.id === video.id) ? "Added" : <Plus className="h-4 w-4" />}
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : videoSearchQuery.trim() ? (
                          <div className="py-8 text-center text-muted-foreground">
                            <Film className="h-12 w-12 mx-auto mb-2 opacity-20" />
                            <p>No videos found</p>
                          </div>
                        ) : (
                          <div className="py-8 text-center text-muted-foreground">
                            <Search className="h-12 w-12 mx-auto mb-2 opacity-20" />
                            <p>Enter a search term to find videos</p>
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {selectedVideos.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground border border-border rounded-md">
                    <Film className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p className="mb-1">No videos selected</p>
                    <p className="text-sm">Search and select videos to link to this sponsorship.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedVideos.map((video) => (
                      <div key={video.id} className="flex flex-col sm:flex-row gap-4 border border-border rounded-md p-4">
                        <a href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noreferrer" className="sm:flex-shrink-0">
                          <img
                            src={video.thumbnailUrl || `https://i.ytimg.com/vi/${video.id}/mqdefault.jpg`}
                            alt={video.title}
                            className="h-28 sm:h-24 w-full sm:w-40 object-cover rounded-md"
                          />
                        </a>
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <a href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noreferrer" className="text-sm font-medium text-foreground hover:underline block">
                              {video.title}
                            </a>
                            <p className="text-xs text-muted-foreground mt-1">
                              {video.publishedAt ? format(new Date(video.publishedAt), "MMM d, yyyy") : "No date"}
                            </p>
                          </div>
                          <div className="flex justify-between items-center mt-2">
                            <Badge variant="outline" className="text-xs">Sponsored</Badge>
                            <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => handleRemoveVideo(video.id)}>
                              <Trash2 className="h-3 w-3 mr-1" />
                              Remove
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="pt-4 flex gap-3">
                      <Button type="button" variant="outline" onClick={() => navigate("/monetization?tab=sponsorships")}>
                        Cancel
                      </Button>
                      <Button onClick={handleSubmit} disabled={createSponsorship.isPending}>
                        {createSponsorship.isPending ? "Creating..." : "Create Sponsorship"}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
