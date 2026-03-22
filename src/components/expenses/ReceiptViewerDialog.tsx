import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receiptUrl: string;
  expenseTitle: string;
}

export function ReceiptViewerDialog({ open, onOpenChange, receiptUrl, expenseTitle }: Props) {
  const isPdf = receiptUrl.toLowerCase().endsWith(".pdf");

  const handleDownload = async () => {
    try {
      const res = await fetch(receiptUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ext = receiptUrl.split(".").pop()?.split("?")[0] || "file";
      a.download = `${expenseTitle.replace(/[^a-zA-Z0-9]/g, "_")}_receipt.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(receiptUrl, "_blank");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Receipt — {expenseTitle}</DialogTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleDownload} className="gap-1.5">
                <Download className="h-3.5 w-3.5" /> Download
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.open(receiptUrl, "_blank")} className="gap-1.5">
                <ExternalLink className="h-3.5 w-3.5" /> Open
              </Button>
            </div>
          </div>
        </DialogHeader>
        <div className="mt-2 rounded-md border border-border overflow-hidden bg-muted/30" style={{ height: "70vh" }}>
          {isPdf ? (
            <iframe
              src={receiptUrl}
              className="w-full h-full"
              title={`Receipt for ${expenseTitle}`}
            />
          ) : (
            <div className="flex items-center justify-center h-full p-4">
              <img
                src={receiptUrl}
                alt={`Receipt for ${expenseTitle}`}
                className="max-w-full max-h-full object-contain rounded"
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
