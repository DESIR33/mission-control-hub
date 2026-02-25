import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card } from "@/components/ui/card"
import { SiYoutube, SiGoogle, SiStripe } from "react-icons/si"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"

const integrationFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  platform: z.enum(["youtube", "stripe", "google"]),
  apiKey: z.string().min(1, "API Key is required"),
  apiSecret: z.string().min(1, "API Secret is required"),
  additionalKeys: z.record(z.string()).optional(),
})

type IntegrationFormData = z.infer<typeof integrationFormSchema>

interface IntegrationKey {
  id: number
  name: string
  platform: string
  status: "active" | "inactive"
  createdAt: string
}

const PLATFORM_CONFIGS = {
  youtube: {
    title: "YouTube",
    description: "Manage YouTube API credentials for analytics and content management",
    icon: <SiYoutube className="text-red-600 h-8 w-8" />,
    fields: ["API Key", "Client ID", "Client Secret"],
    docsUrl: "https://developers.google.com/youtube/v3",
  },
  stripe: {
    title: "Stripe",
    description: "Configure Stripe API keys for payment processing",
    icon: <SiStripe className="text-blue-600 h-8 w-8" />,
    fields: ["Public Key", "Secret Key", "Webhook Secret"],
    docsUrl: "https://stripe.com/docs/api",
  },
  google: {
    title: "Google",
    description: "Set up Google API credentials for various integrations",
    icon: <SiGoogle className="text-green-600 h-8 w-8" />,
    fields: ["API Key", "Client ID", "Client Secret"],
    docsUrl: "https://console.cloud.google.com/apis",
  },
}

export function IntegrationKeys() {
  const [selectedPlatform, setSelectedPlatform] = useState<keyof typeof PLATFORM_CONFIGS | null>(null)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const form = useForm<IntegrationFormData>({
    resolver: zodResolver(integrationFormSchema),
    defaultValues: {
      name: "",
      platform: "youtube",
      apiKey: "",
      apiSecret: "",
    },
  })

  const { data: keys, isLoading } = useQuery({
    queryKey: ["integrationKeys"],
    queryFn: async () => {
      const response = await fetch("/api/admin/integration-keys")
      if (!response.ok) throw new Error("Failed to fetch integration keys")
      return response.json() as Promise<IntegrationKey[]>
    },
  })

  const addKeyMutation = useMutation({
    mutationFn: async (data: IntegrationFormData) => {
      const response = await fetch("/api/admin/integration-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error("Failed to add integration key")
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrationKeys"] })
      toast({ title: "Integration key added successfully" })
      form.reset()
      setSelectedPlatform(null)
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add integration key",
        variant: "destructive",
      })
    },
  })

  if (isLoading) {
    return <Loader2 className="h-8 w-8 animate-spin" />
  }

  const onSubmit = (data: IntegrationFormData) => {
    addKeyMutation.mutate(data)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">API Integration Keys</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(PLATFORM_CONFIGS).map(([platform, config]) => {
          const platformKey = keys?.find((k) => k.platform === platform)

          return (
            <Card key={platform} className="p-6 space-y-4">
              <div className="flex items-start gap-4">
                {config.icon}
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{config.title}</h3>
                  <p className="text-sm text-muted-foreground">{config.description}</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Badge
                  variant={platformKey?.status === "active" ? "default" : "secondary"}
                  className="capitalize"
                >
                  {platformKey?.status || "not configured"}
                </Badge>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(config.docsUrl, "_blank")}
                >
                  Documentation
                </Button>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      onClick={() => setSelectedPlatform(platform as keyof typeof PLATFORM_CONFIGS)}
                    >
                      {platformKey ? "Update" : "Configure"}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Configure {config.title} Integration</DialogTitle>
                    </DialogHeader>

                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Integration Name</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder={`My ${config.title} Integration`}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {config.fields.map((fieldName) => (
                          <FormItem key={fieldName}>
                            <FormLabel>{fieldName}</FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder={`Enter ${fieldName}`}
                                {...form.register(
                                  `additionalKeys.${fieldName.toLowerCase().replace(/ /g, "_")}` as any
                                )}
                              />
                            </FormControl>
                          </FormItem>
                        ))}

                        <Button type="submit" className="w-full">
                          Save Configuration
                        </Button>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
