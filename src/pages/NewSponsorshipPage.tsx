import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CalendarIcon, Loader2, Search, X, Film, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import axios from "axios";

// Types
interface YouTubeVideo {
  id: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  publishedAt: string;
}

export default function NewSponsorship() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    companyId: "",
    contactId: "",
    dealType: "",
    status: "draft",
    value: "",
    currency: "USD",
    startDate: "",
    endDate: "",
    deliverables: "",
    requirements: "",
    paymentTerms: "",
    paymentMethod: "",
    notes: "",
    paymentStatus: "pending",
  });

  // Date state for the calendar component
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  // YouTube video search state
  const [videoSearchQuery, setVideoSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<YouTubeVideo[]>([]);
  const [selectedVideos, setSelectedVideos] = useState<YouTubeVideo[]>([]);
  const [showVideoSearch, setShowVideoSearch] = useState(false);

  // Handle calendar date changes
  const handleStartDateChange = (date: Date | undefined) => {
    setStartDate(date);
    if (date) {
      setFormData({
        ...formData,
        startDate: date.toISOString().split('T')[0]
      });
    }
  };

  const handleEndDateChange = (date: Date | undefined) => {
    setEndDate(date);
    if (date) {
      setFormData({
        ...formData,
        endDate: date.toISOString().split('T')[0]
      });
    } else {
      setFormData({
        ...formData,
        endDate: ""
      });
    }
  };

  const { data: companies = [] } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/companies"],
  });

  const { data: contacts = [] } = useQuery<{ id: number; firstName: string; lastName: string }[]>({
    queryKey: ["/api/contacts"],
  });

  const createSponsorship = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        ...data,
        companyId: parseInt(data.companyId),
        contactId: data.contactId ? parseInt(data.contactId) : null,
        value: parseFloat(data.value),
        deliverables: data.deliverables.split('\n').filter(item => item.trim()),
        startDate: new Date(data.startDate).toISOString(),
        endDate: data.endDate ? new Date(data.endDate).toISOString() : null,
      };

      // Get CSRF token first
      const csrfResponse = await fetch('/api/csrf/token');
      const { csrfToken } = await csrfResponse.json();

      const response = await fetch("/api/sponsorships", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create sponsorship");
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate multiple related queries to ensure data freshness
      queryClient.invalidateQueries({ queryKey: ["/api/sponsorships"] });
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      // Also invalidate any revenue-related queries that might be affected
      queryClient.invalidateQueries({ queryKey: ["/api/affiliate-programs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/product-transactions"] });

      toast({
        title: "Success",
        description: "Sponsorship created successfully",
      });

      // Use setTimeout to ensure navigation happens after query invalidation
      setTimeout(() => {
        navigate("/monetization?tab=sponsorships");
      }, 100);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // YouTube video search function
  const searchYouTubeVideos = async () => {
    if (!videoSearchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await axios.get('/api/youtube/videos', {
        params: { search: videoSearchQuery }
      });
      setSearchResults(response.data);
    } catch (error) {
      console.error('Error searching YouTube videos:', error);
      toast({
        title: 'Error',
        description: 'Failed to search YouTube videos. Make sure your YouTube account is connected.',
        variant: 'destructive'
      });
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Add video to selected videos
  const handleAddVideo = (video: YouTubeVideo) => {
    // Check if video is already selected
    if (selectedVideos.some(v => v.id === video.id)) {
      toast({
        title: "Info",
        description: "This video is already selected",
      });
      return;
    }

    setSelectedVideos([...selectedVideos, video]);
    setShowVideoSearch(false);
  };

  // Remove video from selected videos
  const handleRemoveVideo = (videoId: string) => {
    setSelectedVideos(selectedVideos.filter(v => v.id !== videoId));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      searchYouTubeVideos();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // First create the sponsorship
      const result = await createSponsorship.mutateAsync(formData);

      // If there are selected videos, link them to the sponsorship
      if (selectedVideos.length > 0) {
        const sponsorshipId = result.id;

        // Get CSRF token once for all video linking operations
        const csrfResponse = await fetch('/api/csrf/token');
        const { csrfToken } = await csrfResponse.json();

        // Link each video to the sponsorship
        await Promise.all(selectedVideos.map(async (video) => {
          const videoData = {
            videoId: video.id,
            title: video.title,
            thumbnailUrl: video.thumbnailUrl,
            publishedAt: video.publishedAt
          };

          await axios.post(`/api/sponsorships/${sponsorshipId}/videos`, videoData, {
            headers: {
              'X-CSRF-Token': csrfToken,
            }
          });
        }));
      }

      // Navigate to the sponsorships page
      navigate("/monetization?tab=sponsorships");

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create sponsorship",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">New Sponsorship</h1>
          <p className="text-muted-foreground mt-1 sm:mt-2">
            Add a new sponsorship deal
          </p>
        </div>
        <Button variant="ghost" onClick={() => navigate("/monetization?tab=sponsorships")} className="self-start">
          ← Back to Sponsorships
        </Button>
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
              <CardDescription>
                Enter the details of the sponsorship deal
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="company">Company</Label>
                      <Select
                        value={formData.companyId}
                        onValueChange={(value) => setFormData({ ...formData, companyId: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select company" />
                        </SelectTrigger>
                        <SelectContent>
                          {companies.map((company) => (
                            <SelectItem key={company.id} value={String(company.id)}>
                              {company.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contact">Contact (Optional)</Label>
                      <Select
                        value={formData.contactId}
                        onValueChange={(value) => setFormData({ ...formData, contactId: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select contact" />
                        </SelectTrigger>
                        <SelectContent>
                          {contacts.map((contact) => (
                            <SelectItem key={contact.id} value={String(contact.id)}>
                              {`${contact.firstName} ${contact.lastName}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dealType">Deal Type</Label>
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
                      <Label htmlFor="value">Deal Value</Label>
                      <div className="flex">
                        <Select
                          value={formData.currency}
                          onValueChange={(value) => setFormData({ ...formData, currency: value })}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue placeholder="$" />
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
                          id="value"
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.value}
                          onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                          placeholder="e.g., 1000"
                          required
                          className="flex-1 ml-2"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startDate">Start Date</Label>
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
                          <Calendar
                            mode="single"
                            selected={startDate}
                            onSelect={handleStartDateChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="endDate">End Date (Optional)</Label>
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
                          <Calendar
                            mode="single"
                            selected={endDate}
                            onSelect={handleEndDateChange}
                            initialFocus
                            fromDate={startDate}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="paymentMethod">Payment Method</Label>
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
                      <Label htmlFor="paymentStatus">Payment Status</Label>
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
                    <Label htmlFor="deliverables">Deliverables (One per line)</Label>
                    <Textarea
                      id="deliverables"
                      value={formData.deliverables}
                      onChange={(e) => setFormData({ ...formData, deliverables: e.target.value })}
                      placeholder="Enter deliverables, one per line"
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="requirements">Requirements</Label>
                    <Textarea
                      id="requirements"
                      value={formData.requirements}
                      onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                      placeholder="Enter requirements"
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="paymentTerms">Payment Terms</Label>
                    <Textarea
                      id="paymentTerms"
                      value={formData.paymentTerms}
                      onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                      placeholder="Enter payment terms"
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Additional Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Any additional notes"
                      rows={4}
                    />
                  </div>
                </div>

                <Button type="submit" disabled={createSponsorship.isPending}>
                  {createSponsorship.isPending ? "Creating..." : "Create Sponsorship"}
                </Button>
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
                  <CardDescription>
                    Link YouTube videos to this sponsorship
                  </CardDescription>
                </div>
                <Dialog open={showVideoSearch} onOpenChange={setShowVideoSearch}>
                  <DialogTrigger asChild>
                    <Button>
                      <Film className="mr-2 h-4 w-4" />
                      Search YouTube Videos
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                      <DialogTitle>Search YouTube Videos</DialogTitle>
                      <DialogDescription>
                        Search for videos from your YouTube channel to link to this sponsorship.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="mt-4 space-y-4">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Search for videos..."
                          value={videoSearchQuery}
                          onChange={(e) => setVideoSearchQuery(e.target.value)}
                          onKeyDown={handleKeyDown}
                          className="flex-1"
                        />
                        <Button
                          onClick={searchYouTubeVideos}
                          disabled={isSearching || !videoSearchQuery.trim()}
                        >
                          {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                        </Button>
                      </div>

                      {isSearching ? (
                        <div className="py-8 text-center">
                          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                          <p>Searching for videos...</p>
                        </div>
                      ) : searchResults.length > 0 ? (
                        <div className="space-y-3 max-h-[400px] overflow-auto">
                          {searchResults.map((video) => (
                            <div key={video.id} className="flex gap-3 border rounded-md p-3">
                              <img
                                src={video.thumbnailUrl || `https://i.ytimg.com/vi/${video.id}/mqdefault.jpg`}
                                alt={video.title}
                                className="w-24 h-16 object-cover rounded"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{video.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  {video.publishedAt ? format(new Date(video.publishedAt), 'MMM d, yyyy') : 'No date'}
                                </p>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAddVideo(video)}
                                disabled={selectedVideos.some(v => v.id === video.id)}
                              >
                                {selectedVideos.some(v => v.id === video.id) ? 'Selected' : <Plus className="h-4 w-4" />}
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : videoSearchQuery.trim() ? (
                        <div className="py-8 text-center text-muted-foreground">
                          <Film className="h-12 w-12 mx-auto mb-2 opacity-20" />
                          <p>No videos found matching your search</p>
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
                <div className="text-center py-12 text-muted-foreground border rounded-md">
                  <Film className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="mb-1">No videos selected</p>
                  <p className="text-sm">Click "Search YouTube Videos" to find and select videos for this sponsorship.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedVideos.map((video) => (
                    <div
                      key={video.id}
                      className="flex flex-col sm:flex-row gap-4 border rounded-md p-4"
                    >
                      <a
                        href={`https://www.youtube.com/watch?v=${video.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="sm:flex-shrink-0"
                      >
                        <img
                          src={video.thumbnailUrl || `https://i.ytimg.com/vi/${video.id}/mqdefault.jpg`}
                          alt={video.title}
                          className="h-28 sm:h-24 w-full sm:w-40 object-cover rounded-md"
                        />
                      </a>
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <a
                            href={`https://www.youtube.com/watch?v=${video.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-base font-medium hover:underline block"
                          >
                            {video.title}
                          </a>
                          <p className="text-xs text-muted-foreground mt-1">
                            {video.publishedAt ? format(new Date(video.publishedAt), 'MMM d, yyyy') : 'No date'}
                          </p>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <Badge variant="outline" className="text-xs">Sponsored</Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-8"
                            onClick={() => handleRemoveVideo(video.id)}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="pt-4 flex justify-end">
                    <Button
                      type="submit"
                      onClick={handleSubmit}
                      disabled={createSponsorship.isPending}
                    >
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
  );
}
