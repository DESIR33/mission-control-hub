import { useNavigate } from "react-router-dom";
import { ArrowLeft, UserPlus } from "lucide-react";
import { WorkspaceProvider } from "@/hooks/use-workspace";
import AddContactForm from "@/components/crm/AddContactForm";

function AddContactPageContent() {
  const navigate = useNavigate();

  return (
    <div className="p-4 sm:p-6 lg:p-8 gradient-mesh min-h-screen">
      <div className="mx-auto max-w-2xl">
        <button
          onClick={() => navigate("/relationships")}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Relationships
        </button>

        <div className="flex items-center gap-2 mb-6">
          <UserPlus className="h-5 w-5 text-foreground" />
          <h1 className="text-xl font-bold text-foreground">New Contact</h1>
        </div>

        <AddContactForm onSuccess={() => navigate("/relationships")} />
      </div>
    </div>
  );
}

export default function AddContactPage() {
  return (
    <WorkspaceProvider>
      <AddContactPageContent />
    </WorkspaceProvider>
  );
}
