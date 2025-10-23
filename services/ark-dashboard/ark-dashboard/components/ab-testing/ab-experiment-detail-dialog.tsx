"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { ABResultsStep } from "./ab-results-step";
import type { ABExperimentListItem } from "@/lib/services/ab-experiments";

interface ABExperimentDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  experiment: ABExperimentListItem | null;
  onExperimentUpdated?: () => void;
}

export function ABExperimentDetailDialog({
  open,
  onOpenChange,
  experiment,
  onExperimentUpdated
}: ABExperimentDetailDialogProps) {
  if (!experiment) {
    return null;
  }

  const handleResultsClose = () => {
    onOpenChange(false);
    if (onExperimentUpdated) {
      onExperimentUpdated();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:!max-w-[1400px] max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Experiment Details: {experiment.id.substring(0, 8)}
          </DialogTitle>
        </DialogHeader>

        <ABResultsStep
          namespace={experiment.queryNamespace}
          queryName={experiment.queryName}
          experiment={experiment}
          onClose={handleResultsClose}
        />
      </DialogContent>
    </Dialog>
  );
}
