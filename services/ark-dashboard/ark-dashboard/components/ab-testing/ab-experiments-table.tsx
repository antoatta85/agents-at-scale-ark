"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Trash2 } from "lucide-react";
import type { ABExperimentListItem } from "@/lib/services/ab-experiments";
import type { ABExperimentStatus } from "@/lib/types/ab-experiment";
import { formatDistanceToNow } from "date-fns";

interface ABExperimentsTableProps {
  experiments: ABExperimentListItem[];
  onViewDetails: (experiment: ABExperimentListItem) => void;
  onDelete: (experiment: ABExperimentListItem) => void;
}

const STATUS_COLORS: Record<ABExperimentStatus, string> = {
  pending: "bg-gray-500",
  running: "bg-blue-500",
  completed: "bg-green-500",
  failed: "bg-red-500",
  applied: "bg-purple-500"
};

const WINNER_COLORS = {
  baseline: "bg-gray-600",
  experiment: "bg-green-600",
  tie: "bg-yellow-600"
};

export function ABExperimentsTable({
  experiments,
  onViewDetails,
  onDelete
}: ABExperimentsTableProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (experiment: ABExperimentListItem) => {
    setDeletingId(experiment.id);
    try {
      await onDelete(experiment);
    } finally {
      setDeletingId(null);
    }
  };

  const formatImprovement = (improvement: number | undefined) => {
    if (improvement === undefined || improvement === null) return "N/A";
    const sign = improvement > 0 ? "+" : "";
    return `${sign}${(improvement * 100).toFixed(1)}%`;
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Experiment ID</TableHead>
            <TableHead>Query</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Winner</TableHead>
            <TableHead>Improvement</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {experiments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                No experiments found
              </TableCell>
            </TableRow>
          ) : (
            experiments.map((experiment) => (
              <TableRow key={experiment.id} className="hover:bg-muted/50">
                <TableCell className="font-mono text-sm">
                  {experiment.id.substring(0, 8)}
                </TableCell>
                <TableCell className="font-medium">
                  {experiment.queryName}
                </TableCell>
                <TableCell>
                  <Badge className={STATUS_COLORS[experiment.status]}>
                    {experiment.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(experiment.createdAt), {
                    addSuffix: true
                  })}
                </TableCell>
                <TableCell>
                  {experiment.results?.winner ? (
                    <Badge className={WINNER_COLORS[experiment.results.winner]}>
                      {experiment.results.winner}
                    </Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {experiment.results?.improvement !== undefined ? (
                    <span
                      className={
                        experiment.results.improvement > 0
                          ? "text-green-600 font-medium"
                          : experiment.results.improvement < 0
                          ? "text-red-600 font-medium"
                          : "text-muted-foreground"
                      }
                    >
                      {formatImprovement(experiment.results.improvement)}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewDetails(experiment)}
                      className="h-8 w-8 p-0"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(experiment)}
                      disabled={deletingId === experiment.id}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
