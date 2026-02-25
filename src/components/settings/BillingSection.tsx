import { motion } from "framer-motion";
import { CreditCard, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function BillingSection() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.15 }}
    >
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            <CardTitle>Billing</CardTitle>
          </div>
          <CardDescription>Manage your subscription and payment details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current plan */}
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-foreground">Free Plan</p>
                <Badge variant="secondary">Current</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Basic features for small teams getting started.
              </p>
            </div>
            <Button variant="outline" disabled>
              <Sparkles className="w-4 h-4 mr-2" />
              Upgrade
            </Button>
          </div>

          {/* Placeholder info */}
          <div className="rounded-lg border border-dashed border-border p-6 text-center">
            <CreditCard className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              Billing management coming soon
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Plan upgrades, invoices, and payment methods will be available here.
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
