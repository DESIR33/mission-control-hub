import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CalendarIcon, Loader2, Search, Film, Plus, Trash2 } from "lucide-react";
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

interface SponsorshipVideo extends YouTubeVideo {
  sponsorshipId: number;
}

interface Sponsorship {
  id: number;
  companyId: number;
  contactId: number | null;
  dealType: string;
  status: string;
  value: number;
  currency: string;
  startDate: string;
  endDate: string;
  deliverables: string[] | string;
  requirements: string;
  paymentTerms: string;
  paymentMethod: string;
  notes: string;
  paymentStatus: string;
  videos?: SponsorshipVideo[];
}

export default function EditSponsorship() {
  const { id } = useParams();
  const sponsorshipId = parseInt(id!);
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [formData, setFormData] = useState<Sponsorship>({
    id: sponsorshipId,
    companyId: 0,
    contactId: null,
    dealType: "",
    status: "",
    value: 0,
    currency: "USD",
    startDate: "",
    endDate: "",
    deliverables: [],
    requirements: "",
    paymentTerms: "",
    paymentMethod: "",
    notes: "",
    paymentStatus: ""
  });

  // Date picker state
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  // YouTube video search state
  const [videoSearchQuery, setVideoSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<YouTubeVideo[]>([]);
  const [selectedVideos, setSelectedVideos] = useState<SponsorshipVideo[]>([]);
  const [showVideoSearch, setShowVideoSearch] = useState(false);

  // Fetch sponsorship data
  const { data: sponsorship, isLoading } = useQuery<Sponsorship>({
    queryKey: [`/api/sponsorships/${sponsorshipId}`],
    queryFn: async () => {
      const response = await fetch(`/api/sponsorships/${sponsorshipId}`);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch sponsorship: ${response.status} ${errorText}`);
      }

      return response.json();
    },
    enabled: !isNaN(sponsorshipId)
  });

  // Update form data when sponsorship is loaded
  useEffect(() => {
    if (sponsorship) {
      setFormData(sponsorship);

      if (sponsorship.startDate) {
        setStartDate(new Date(sponsorship.startDate));
      }
      if (sponsorship.endDate) {
        setEndDate(new Date(sponsorship.endDate));
      }

      if (sponsorship.videos && sponsorship.videos.length > 0) {
        setSelectedVideos(sponsorship.videos);
      }
    }
  }, [sponsorship]);

  // Fetch linked videos
  const { data: videos = [] } = useQuery<SponsorshipVideo[]>({
    queryKey: [`/api/sponsorships/${sponsorshipId}/videos`],
    queryFn: async () => {
      const response = await fetch(`/api/sponsorships/${sponsorshipId}/videos`);
      if (!response.ok) {
        if (response.status === 404) {
          return [];
        }
        throw new Error("Failed to fetch sponsorship videos");
      }
      return response.json();
    },
    enabled: !isNaN(sponsorshipId)
  });

  useEffect(() => {
    if (videos.length > 0 && selectedVideos.length === 0) {
      setSelectedVideos(videos);
    }
  }, [videos]);

  // Load companies and contacts
  const { data: companies = [] } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/companies"],
  });

  const { data: contacts = [] } = useQuery<{ id: number; firstName: string; lastName: string }[]>({
    queryKey: ["/api/contacts"],
  });

  // Update sponsorship mutation
  const updateSponsorship = useMutation({
    mutationFn: async (updatedData: Sponsorship) => {
      let processedData = { ...updatedData };

      if (typeof processedData.deliverables === 'string') {
        processedData.deliverables = processedData.deliverables
          .split('\n')
          .filter(line => line.trim() !== '');
      }

      const csrfResponse = await fetch('/api/csrf/token');
      const { csrfToken } = await csrfResponse.json();

      const response = await fetch(`/api/sponsorships/${sponsorshipId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify(processedData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update sponsorship");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sponsorship updated",
        description: "The sponsorship details have been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/sponsorships/${sponsorshipId}`] });
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
  const searchYouTubeVideos = async (query?: string) => {
    const searchQuery = query !== undefined ? query : videoSearchQuery;
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await axios.get('/api/youtube/videos', {
        params: { search: searchQuery }
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

  // Auto-search as user types with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (videoSearchQuery.trim().length >= 2) {
        searchYouTubeVideos(videoSearchQuery);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [videoSearchQuery]);

  // Link video to sponsorship mutation
  const linkVideo = useMutation({
    mutationFn: async (video: YouTubeVideo) => {
      const payload = {
        videoId: video.id,
        title: video.title,
        thumbnailUrl: video.thumbnailUrl,
        publishedAt: video.publishedAt
      };

      const csrfResponse = await fetch('/api/csrf/token');
      const { csrfToken } = await csrfResponse.json();

      const response = await fetch(`/api/sponsorships/${sponsorshipId}/videos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to link video");
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/sponsorships/${sponsorshipId}/videos`] });
      setSelectedVideos([...selectedVideos, data]);
      toast({
        title: "Success",
        description: "Video linked to sponsorship",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Unlink video from sponsorship mutation
  const unlinkVideo = useMutation({
    mutationFn: async (videoId: string) => {
      const csrfResponse = await fetch('/api/csrf/token');
      const { csrfToken } = await csrfResponse.json();

      const response = await fetch(`/api/sponsorships/${sponsorshipId}/videos/${videoId}`, {
        method: "DELETE",
        headers: {
          "X-CSRF-Token": csrfToken,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to unlink video");
      }

      return videoId;
    },
    onSuccess: (videoId) => {
      setSelectedVideos(selectedVideos.filter(v => v.id !== videoId));
      queryClient.invalidateQueries({ queryKey: [`/api/sponsorships/${sponsorshipId}/videos`] });
      toast({
        title: "Success",
        description: "Video unlinked from sponsorship",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSponsorship.mutate(formData);
  };

  // Add video to sponsorship
  const handleAddVideo = (video: YouTubeVideo) => {
    if (selectedVideos.some(v => v.id === video.id)) {
      toast({
        title: "Info",
        description: "This video is already linked to the sponsorship",
      });
      return;
    }

    linkVideo.mutate(video);
  };

  // Remove video from sponsorship
  const handleRemoveVideo = (videoId: string) => {
    unlinkVideo.mutate(videoId);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      searchYouTubeVideos();
    }
  };

  const handleSearchClick = () => {
    searchYouTubeVideos();
  };

  if (isLoading) {
    return (
      <div className="container p-8 flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Edit Sponsorship</h1>
          <p className="text-muted-foreground mt-1 sm:mt-2">
            Update your sponsorship details and linked content
          </p>
        </div>
        <Button
          variant="ghost"
          onClick={() => navigate("/monetization?tab=sponsorships")}
          className="self-start"
        >
          &larr; Back to Sponsorships
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sponsorship Details</CardTitle>
          <CardDescription>
            Update the details of your sponsorship deal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Select
                    value={String(formData.companyId)}
                    onValueChange={(value) => setFormData({ ...formData, companyId: parseInt(value) })}
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
                  <Label htmlFor="contact">Primary Contact (Optional)</Label>
                  <Select
                    value={formData.contactId ? String(formData.contactId) : "none"}
                    onValueChange={(value) => setFormData({ ...formData, contactId: value === "none" ? null : parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select contact" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {contacts.map((contact) => (
                        <SelectItem key={contact.id} value={String(contact.id)}>
                          {contact.firstName} {contact.lastName}
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
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="negotiating">Negotiating</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="value">Value</Label>
                  <div className="flex">
                    <div className="w-24">
                      <Select
                        value={formData.currency}
                        onValueChange={(value) => setFormData({ ...formData, currency: value })}
                      >
                        <SelectTrigger>
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
                    </div>
                    <Input
                      id="value"
                      type="number"
                      placeholder="0.00"
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) })}
                      className="flex-1 ml-2"
                    />
                  </div>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "PPP") : "Select date"}
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
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "PPP") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={handleEndDateChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="deliverables">Deliverables (One per line)</Label>
                <Textarea
                  id="deliverables"
                  placeholder="e.g., 1 sponsored video, 2 Instagram posts"
                  value={Array.isArray(formData.deliverables) ? formData.deliverables.join('\n') : formData.deliverables || ''}
                  onChange={(e) => setFormData({ ...formData, deliverables: e.target.value as unknown as string[] })}
                  className="min-h-[100px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="requirements">Requirements (Optional)</Label>
                <Textarea
                  id="requirements"
                  placeholder="e.g., Must include 30 second product demonstration"
                  value={formData.requirements || ''}
                  onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="paymentTerms">Payment Terms (Optional)</Label>
                  <Textarea
                    id="paymentTerms"
                    placeholder="e.g., 50% upfront, 50% upon completion"
                    value={formData.paymentTerms || ''}
                    onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Payment Method</Label>
                  <Select
                    value={formData.paymentMethod || ''}
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
                      <SelectItem value="cashapp">Cash App</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Any additional notes about the sponsorship"
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
            </div>

            <Button type="submit" disabled={updateSponsorship.isPending}>
              {updateSponsorship.isPending ? "Updating..." : "Update Sponsorship"}
            </Button>
          </form>

          {/* YouTube Videos Section */}
          <div className="mt-8 pt-6 border-t">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-semibold">YouTube Videos</h3>
                <p className="text-sm text-muted-foreground">
                  Link YouTube videos to this sponsorship
                </p>
              </div>
              <Dialog open={showVideoSearch} onOpenChange={setShowVideoSearch}>
                <DialogTrigger asChild>
                  <Button>
                    <Film className="mr-2 h-4 w-4" />
                    Link YouTube Video
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] overflow-hidden flex flex-col max-h-[90vh]">
                  <DialogHeader>
                    <DialogTitle>Search YouTube Videos</DialogTitle>
                    <DialogDescription>
                      Search for videos from your YouTube channel to link to this sponsorship.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="mt-4 space-y-4 flex-1 overflow-hidden">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Search for videos..."
                        value={videoSearchQuery}
                        onChange={(e) => setVideoSearchQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="flex-1"
                      />
                      <Button
                        onClick={handleSearchClick}
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
                      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                        {searchResults.map((video) => (
                          <div
                            key={video.id}
                            className={`flex items-center gap-3 border rounded-md p-3 cursor-pointer hover:bg-secondary/50 transition-colors ${selectedVideos.some(v => v.id === video.id) ? 'opacity-60' : ''}`}
                            onClick={() => {
                              if (!selectedVideos.some(v => v.id === video.id)) {
                                handleAddVideo(video);
                                setShowVideoSearch(false);
                              }
                            }}
                          >
                            <img
                              src={video.thumbnailUrl || `https://i.ytimg.com/vi/${video.id}/mqdefault.jpg`}
                              alt={video.title}
                              className="w-20 h-14 flex-shrink-0 object-cover rounded"
                            />
                            <div className="flex-1 min-w-0 overflow-hidden">
                              <p className="font-medium truncate">{video.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {video.publishedAt ? format(new Date(video.publishedAt), 'MMM d, yyyy') : 'No date'}
                              </p>
                            </div>
                            {!selectedVideos.some(v => v.id === video.id) && (
                              <Plus className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                            )}
                            {selectedVideos.some(v => v.id === video.id) && (
                              <span className="text-xs flex-shrink-0 font-medium text-muted-foreground">Already Linked</span>
                            )}
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

            {selectedVideos.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground border rounded-md">
                <Film className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="mb-1">No videos linked to this sponsorship</p>
                <p className="text-sm">Click "Link YouTube Video" to search for videos to link.</p>
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
                          className="font-medium hover:underline inline-block"
                        >
                          {video.title}
                        </a>
                        <p className="text-sm text-muted-foreground mt-1">
                          {video.publishedAt ? format(new Date(video.publishedAt), 'MMMM d, yyyy') : 'No publish date'}
                        </p>
                      </div>
                      <div className="flex justify-end mt-4 sm:mt-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemoveVideo(video.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Unlink
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
