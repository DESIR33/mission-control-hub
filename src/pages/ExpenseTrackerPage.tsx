import { useParams, useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Receipt, CreditCard, Tag, TrendingUp } from "lucide-react";
import { useExpenseCategories } from "@/hooks/use-expenses";
import { ExpenseList } from "@/components/expenses/ExpenseList";
import { SubscriptionsList } from "@/components/expenses/SubscriptionsList";
import { CategoryManager } from "@/components/expenses/CategoryManager";
import { ExpenseProjections } from "@/components/expenses/ExpenseProjections";

const TABS = [
  { value: "expenses", label: "Expenses", icon: Receipt },
  { value: "subscriptions", label: "Subscriptions", icon: CreditCard },
  { value: "projections", label: "Projections", icon: TrendingUp },
  { value: "categories", label: "Categories", icon: Tag },
] as const;

type TabValue = (typeof TABS)[number]["value"];

export default function ExpenseTrackerPage() {
  const { tab } = useParams<{ tab: string }>();
  const navigate = useNavigate();
  const { data: categories = [] } = useExpenseCategories();

  const activeTab = (TABS.some((t) => t.value === tab) ? tab : "expenses") as TabValue;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="container px-4 md:px-8 py-6">
          <h1 className="text-3xl font-bold text-foreground">Expense Tracker</h1>
          <p className="text-muted-foreground mt-1">Track expenses, subscriptions, and project future spending.</p>
        </div>
      </div>

      <div className="container px-4 md:px-8 py-6">
        <Tabs
          value={activeTab}
          onValueChange={(v) => navigate(`/finance/expenses/${v}`, { replace: true })}
        >
          <TabsList className="mb-6">
            {TABS.map(({ value, label, icon: Icon }) => (
              <TabsTrigger key={value} value={value} className="gap-1.5">
                <Icon className="h-3.5 w-3.5" /> {label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="expenses">
            <ExpenseList categories={categories} />
          </TabsContent>
          <TabsContent value="subscriptions">
            <SubscriptionsList categories={categories} />
          </TabsContent>
          <TabsContent value="projections">
            <ExpenseProjections categories={categories} />
          </TabsContent>
          <TabsContent value="categories">
            <CategoryManager categories={categories} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
