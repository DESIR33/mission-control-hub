import {
  Mail,
  Eye,
  MousePointerClick,
  AlertTriangle,
  Send,
  BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useEmailSendLogs,
  useSequenceDeliveryStats,
} from "@/hooks/use-email-sender";

interface SequenceDeliveryStatsProps {
  sequenceId: string;
  sequenceName: string;
}

const statusColors: Record<string, string> = {
  sent: "bg-blue-100 text-blue-800",
  delivered: "bg-green-100 text-green-800",
  opened: "bg-purple-100 text-purple-800",
  clicked: "bg-indigo-100 text-indigo-800",
  bounced: "bg-orange-100 text-orange-800",
  failed: "bg-red-100 text-red-800",
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SequenceDeliveryStats({
  sequenceId,
  sequenceName,
}: SequenceDeliveryStatsProps) {
  const { data: stats, isLoading: statsLoading } =
    useSequenceDeliveryStats(sequenceId);
  const { data: logs, isLoading: logsLoading } =
    useEmailSendLogs(sequenceId);

  const isLoading = statsLoading || logsLoading;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Loading delivery stats...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  const statCards = [
    {
      label: "Sent",
      value: stats?.totalSent ?? 0,
      icon: Send,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      label: "Opened",
      value: stats?.opened ?? 0,
      percentage: stats?.openRate,
      icon: Eye,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      label: "Clicked",
      value: stats?.clicked ?? 0,
      percentage: stats?.clickRate,
      icon: MousePointerClick,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
    },
    {
      label: "Bounced",
      value: stats?.bounced ?? 0,
      percentage:
        stats && stats.totalSent > 0
          ? (stats.bounced / stats.totalSent) * 100
          : 0,
      icon: AlertTriangle,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
  ];

  const recentLogs = (logs ?? []).slice(0, 20);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Mail className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-lg font-semibold">{sequenceName}</h3>
        <Badge variant="outline">Delivery Stats</Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  {stat.percentage !== undefined && (
                    <p className="text-xs text-muted-foreground">
                      {stat.percentage.toFixed(1)}%
                    </p>
                  )}
                </div>
                <div className={`rounded-lg p-2 ${stat.bgColor}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Open & Click Rate Bars */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4" />
            Engagement Rates
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Open Rate</span>
              <span className="font-medium">
                {(stats?.openRate ?? 0).toFixed(1)}%
              </span>
            </div>
            <Progress value={stats?.openRate ?? 0} className="h-3" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Click Rate</span>
              <span className="font-medium">
                {(stats?.clickRate ?? 0).toFixed(1)}%
              </span>
            </div>
            <Progress value={stats?.clickRate ?? 0} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Recent Send Log Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Send Log</CardTitle>
        </CardHeader>
        <CardContent>
          {recentLogs.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No emails sent yet for this sequence.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contact</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Opened</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-xs">
                      {log.contact_id.slice(0, 8)}...
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {log.subject}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={statusColors[log.status] ?? ""}
                      >
                        {log.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(log.sent_at)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(log.opened_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
