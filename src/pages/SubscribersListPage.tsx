import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SubscribersTable } from "@/components/subscribers/SubscribersTable";
import { SubscriberDetailSheet } from "@/components/subscribers/SubscriberDetailSheet";
import { AddSubscriberDialog } from "@/components/subscribers/AddSubscriberDialog";
import { ImportSubscribersDialog } from "@/components/subscribers/ImportSubscribersDialog";
import { useSubscribers } from "@/hooks/use-subscribers";
import { Skeleton } from "@/components/ui/skeleton";
import type { Subscriber } from "@/types/subscriber";

export default function SubscribersListPage() {
  const navigate = useNavigate();
  const { data: subscribers = [], isLoading } = useSubscribers();
  const [selectedSubscriber, setSelectedSubscriber] = useState<Subscriber | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleSelectSubscriber = (subscriber: Subscriber) => {
    setSelectedSubscriber(subscriber);
    setSheetOpen(true);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">All Subscribers</h1>
          <p className="text-sm text-muted-foreground mt-1">
            YouTube audience members who opted in via resource downloads or info submissions
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full max-w-sm" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <SubscribersTable
          subscribers={subscribers}
          onSelectSubscriber={handleSelectSubscriber}
          selectedId={selectedSubscriber?.id}
          addButton={<AddSubscriberDialog />}
        />
      )}

      <SubscriberDetailSheet
        subscriber={selectedSubscriber}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
}
