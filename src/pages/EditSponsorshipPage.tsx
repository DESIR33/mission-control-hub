import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Handshake, CalendarIcon, ChevronsUpDown, Check, Film, Search, Trash2, Loader2, Plus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useCompanies } from "@/hooks/use-companies";
import { useContacts } from "@/hooks/use-contacts";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { format } from "date-fns";

interface LinkedVideo {
  youtube_video_id: string;
  title: string;
}

export default function EditSponsorshipPage() {
  const { id } = useParams<{ id: string }>();
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
  const [companyOpen, setCompanyOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  // Video linking state
  const [linkedVideos, setLinkedVideos] = useState<LinkedVideo[]>([]);
  const [videoSearchQuery, setVideoSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<LinkedVideo[]>([]);
  const [showVideoSearch, setShowVideoSearch] = useState(false);

  const { data: companies = [] } = useCompanies();
  const { data: contacts = [] } = useContacts();

  const sortedCompanies = [...companies].sort((a, b) => a.name.localeCompare(b.name));
  const sortedContacts = [...contacts].sort((a, b) => {
    const nameA = `${a.first_name} ${a.last_name || ""}`.trim();
    const nameB = `${b.first_name} ${b.last_name || ""}`.trim();
    return nameA.localeCompare(nameB);
  });

  const { data: deal, isLoading } = useQuery({
    queryKey: ["deal", id, workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("*")
        .eq("id", id!)
        .eq("workspace_id", workspaceId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!workspaceId,
  });

  // Fetch linked videos
  const { data: existingLinks = [] } = useQuery({
    queryKey: ["deal-videos", id, workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_videos" as any)
        .select("youtube_video_id")
        .eq("deal_id", id!)
        .eq("workspace_id", workspaceId!);
      if (error) throw error;
      const videoIds = (data ?? []).map((d: any) => d.youtube_video_id);
      if (videoIds.length === 0) return [];
      // Fetch titles
      const { data: stats } = await supabase
        .from("youtube_video_stats" as any)
        .select("youtube_video_id, title")
        .eq("workspace_id", workspaceId!)
        .in("youtube_video_id", videoIds);
      const titleMap = new Map((stats ?? []).map((s: any) => [s.youtube_video_id, s.title]));
      return videoIds.map((vid: string) => ({
        youtube_video_id: vid,
        title: titleMap.get(vid) || vid,
      }));
    },
    enabled: !!id && !!workspaceId,
  });

  useEffect(() => {
    if (existingLinks.length > 0) setLinkedVideos(existingLinks);
  }, [existingLinks]);

  // Parse deal data into form state
  useEffect(() => {
    if (!deal) return;
    const notes = deal.notes || "";

    const dealTypeMatch = notes.match(/Deal Type:\s*(.+)/);
    const deliverablesMatch = notes.match(/Deliverables:\n([\s\S]*?)(?=\n\n|$)/);
    const requirementsMatch = notes.match(/Requirements:\n([\s\S]*?)(?=\n\n|$)/);
    const paymentTermsMatch = notes.match(/Payment Terms:\n([\s\S]*?)(?=\n\n|$)/);
    const paymentMethodMatch = notes.match(/Payment Method:\s*(\w+)/);
    const paymentStatusMatch = notes.match(/Payment Status:\s*(\w+)/);
    const startDateMatch = notes.match(/Start Date:\s*(.+)/);
    const endDateMatch = notes.match(/End Date:\s*(.+)/);

    const knownPatterns = [
      /^Deal Type:.*/,
      /^Deliverables:\n?/,
      /^Requirements:\n?/,
      /^Payment Terms:\n?/,
      /^Payment Method:.*/,
      /^Payment Status:.*/,
      /^Start Date:.*/,
      /^End Date:.*/,
    ];
    const sections = notes.split("\n\n");
    const remainingNotes = sections
      .filter((s: string) => !knownPatterns.some(p => p.test(s.trim())))
      .join("\n\n")
      .trim();

    setFormData({
      companyId: deal.company_id || "",
      contactId: deal.contact_id || "",
      dealType: dealTypeMatch ? dealTypeMatch[1].trim() : "",
      status: deal.stage || "prospecting",
      value: deal.value != null ? String(deal.value) : "",
      currency: deal.currency || "USD",
      deliverables: deliverablesMatch ? deliverablesMatch[1].trim() : "",
      requirements: requirementsMatch ? requirementsMatch[1].trim() : "",
      paymentTerms: paymentTermsMatch ? paymentTermsMatch[1].trim() : "",
      paymentMethod: paymentMethodMatch ? paymentMethodMatch[1].trim() : "",
      paymentStatus: paymentStatusMatch ? paymentStatusMatch[1].trim() : "pending",
      notes: remainingNotes,
    });

    if (startDateMatch) {
      try {
        const parsed = new Date(startDateMatch[1].replace(/(st|nd|rd|th),/, ","));
        if (!isNaN(parsed.getTime())) setStartDate(parsed);
      } catch {}
    }

    if (endDateMatch) {
      try {
        const parsed = new Date(endDateMatch[1].replace(/(st|nd|rd|th),/, ","));
        if (!isNaN(parsed.getTime())) setEndDate(parsed);
      } catch {}
    } else if (deal.expected_close_date) {
      setEndDate(new Date(deal.expected_close_date));
    }
  }, [deal]);

  const searchVideos = async () => {
    if (!videoSearchQuery.trim() || !workspaceId) return;
    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from("youtube_video_stats" as any)
        .select("youtube_video_id, title")
        .eq("workspace_id", workspaceId)
        .ilike("title", `%${videoSearchQuery}%`)
        .order("published_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      setSearchResults(
        (data ?? []).map((v: any) => ({
          youtube_video_id: v.youtube_video_id,
          title: v.title || v.youtube_video_id,
        }))
      );
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const updateSponsorship = useMutation({
    mutationFn: async () => {
      if (!workspaceId || !id) throw new Error("Missing context");

      const companyName = companies.find(c => c.id === formData.companyId)?.name || "Unknown";

      // Update deal
      const { error } = await supabase
        .from("deals")
        .update({
          title: `${formData.dealType || "Sponsorship"} - ${companyName}`,
          company_id: formData.companyId || null,
          contact_id: formData.contactId || null,
          stage: formData.status,
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
            endDate ? `End Date: ${format(endDate, "PPP")}` : "",
            formData.notes || "",
          ].filter(Boolean).join("\n\n"),
        })
        .eq("id", id)
        .eq("workspace_id", workspaceId);

      if (error) throw error;

      // Sync linked videos: delete all, re-insert
      await supabase.from("deal_videos" as any).delete().eq("deal_id", id);
      if (linkedVideos.length > 0) {
        const rows = linkedVideos.map(v => ({
          deal_id: id,
          youtube_video_id: v.youtube_video_id,
          workspace_id: workspaceId,
        }));
        const { error: linkError } = await supabase.from("deal_videos" as any).insert(rows as any);
        if (linkError) throw linkError;

        // Auto-create content pipeline entries for linked videos
        const { syncDealToPipeline } = await import("@/hooks/use-pipeline-deal-sync");
        const companyName = companies.find(c => c.id === formData.companyId)?.name || "Unknown";
        await syncDealToPipeline({
          dealId: id,
          workspaceId,
          companyId: formData.companyId || null,
          companyName,
          dealTitle: `${formData.dealType || "Sponsorship"} - ${companyName}`,
          linkedVideoIds: linkedVideos.map(v => v.youtube_video_id),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      queryClient.invalidateQueries({ queryKey: ["sponsorships"] });
      queryClient.invalidateQueries({ queryKey: ["deal-videos"] });
      queryClient.invalidateQueries({ queryKey: ["video-queue"] });
      toast({ title: "Success", description: "Sponsorship updated successfully" });
      navigate("/revenue/sponsorships");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSponsorship.mutateAsync();
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[600px] w-full rounded-xl" />
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Sponsorship not found.
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen">
      <div>
        <button
          onClick={() => navigate("/revenue/sponsorships")}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Sponsorships
        </button>

        <div className="flex items-center gap-2">
          <Handshake className="h-5 w-5 text-foreground" />
          <h1 className="text-xl font-bold tracking-tight text-foreground">Edit Sponsorship</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sponsorship Details</CardTitle>
          <CardDescription>Update the details of this sponsorship deal</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Company</Label>
                <Popover open={companyOpen} onOpenChange={setCompanyOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={companyOpen} className="w-full justify-between font-normal">
                      {formData.companyId ? sortedCompanies.find((c) => c.id === formData.companyId)?.name : "Select company"}
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
                              onSelect={() => { setFormData({ ...formData, companyId: company.id }); setCompanyOpen(false); }}
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
                    <Button variant="outline" role="combobox" aria-expanded={contactOpen} className="w-full justify-between font-normal">
                      {formData.contactId
                        ? (() => { const c = sortedContacts.find((c) => c.id === formData.contactId); return c ? `${c.first_name} ${c.last_name || ""}`.trim() : "Select contact"; })()
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
                              <CommandItem key={contact.id} value={fullName} onSelect={() => { setFormData({ ...formData, contactId: contact.id }); setContactOpen(false); }}>
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
                <Select value={formData.dealType} onValueChange={(value) => setFormData({ ...formData, dealType: value })}>
                  <SelectTrigger><SelectValue placeholder="Select deal type" /></SelectTrigger>
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
                  <Select value={formData.currency} onValueChange={(value) => setFormData({ ...formData, currency: value })}>
                    <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="CAD">CAD</SelectItem>
                      <SelectItem value="AUD">AUD</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number" min="0" step="0.01"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    placeholder="e.g., 1000" required className="flex-1"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Stage</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger><SelectValue placeholder="Select stage" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prospecting">Prospecting</SelectItem>
                    <SelectItem value="qualification">Qualification</SelectItem>
                    <SelectItem value="proposal">Proposal</SelectItem>
                    <SelectItem value="negotiation">Negotiation</SelectItem>
                    <SelectItem value="closed_won">Closed Won</SelectItem>
                    <SelectItem value="closed_lost">Closed Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={`w-full justify-start text-left font-normal ${!startDate && "text-muted-foreground"}`}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : "Select start date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={`w-full justify-start text-left font-normal ${!endDate && "text-muted-foreground"}`}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : "Select end date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus fromDate={startDate} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={formData.paymentMethod} onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}>
                  <SelectTrigger><SelectValue placeholder="Select payment method" /></SelectTrigger>
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
                <Select value={formData.paymentStatus} onValueChange={(value) => setFormData({ ...formData, paymentStatus: value })}>
                  <SelectTrigger><SelectValue placeholder="Select payment status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Linked YouTube Videos */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Film className="w-3.5 h-3.5" />
                Linked YouTube Videos
              </Label>
              {linkedVideos.length > 0 && (
                <div className="space-y-1.5">
                  {linkedVideos.map((v) => (
                    <div key={v.youtube_video_id} className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
                      <img
                        src={`https://i.ytimg.com/vi/${v.youtube_video_id}/default.jpg`}
                        alt=""
                        className="w-16 h-9 rounded object-cover shrink-0"
                      />
                      <p className="text-sm text-foreground truncate flex-1">{v.title}</p>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 shrink-0"
                        onClick={() => setLinkedVideos(linkedVideos.filter(lv => lv.youtube_video_id !== v.youtube_video_id))}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <Dialog open={showVideoSearch} onOpenChange={setShowVideoSearch}>
                <DialogTrigger asChild>
                  <Button type="button" variant="outline" size="sm" className="text-xs">
                    <Plus className="w-3.5 h-3.5 mr-1" /> Link Video
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Link YouTube Video</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        value={videoSearchQuery}
                        onChange={(e) => setVideoSearchQuery(e.target.value)}
                        placeholder="Search by video title..."
                        className="flex-1"
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), searchVideos())}
                      />
                      <Button type="button" onClick={searchVideos} disabled={isSearching} size="sm">
                        {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      </Button>
                    </div>
                    {searchResults.length > 0 && (
                      <div className="max-h-64 overflow-y-auto space-y-1">
                        {searchResults.map((v) => {
                          const alreadyLinked = linkedVideos.some(lv => lv.youtube_video_id === v.youtube_video_id);
                          return (
                            <button
                              key={v.youtube_video_id}
                              type="button"
                              disabled={alreadyLinked}
                              className="w-full flex items-center gap-2 rounded-lg border border-border px-3 py-2 hover:bg-muted/30 transition-colors text-left disabled:opacity-50"
                              onClick={() => {
                                setLinkedVideos([...linkedVideos, v]);
                                setShowVideoSearch(false);
                                setSearchResults([]);
                                setVideoSearchQuery("");
                              }}
                            >
                              <img
                                src={`https://i.ytimg.com/vi/${v.youtube_video_id}/default.jpg`}
                                alt=""
                                className="w-16 h-9 rounded object-cover shrink-0"
                              />
                              <p className="text-sm text-foreground truncate flex-1">{v.title}</p>
                              {alreadyLinked && <Check className="w-4 h-4 text-primary shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-2">
              <Label>Deliverables (One per line)</Label>
              <Textarea value={formData.deliverables} onChange={(e) => setFormData({ ...formData, deliverables: e.target.value })} placeholder="Enter deliverables, one per line" rows={3} />
            </div>

            <div className="space-y-2">
              <Label>Requirements</Label>
              <Textarea value={formData.requirements} onChange={(e) => setFormData({ ...formData, requirements: e.target.value })} placeholder="Enter requirements" rows={3} />
            </div>

            <div className="space-y-2">
              <Label>Payment Terms</Label>
              <Textarea value={formData.paymentTerms} onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })} placeholder="Enter payment terms" rows={3} />
            </div>

            <div className="space-y-2">
              <Label>Additional Notes</Label>
              <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Any additional notes" rows={3} />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => navigate("/revenue/sponsorships")}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateSponsorship.isPending}>
                {updateSponsorship.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
