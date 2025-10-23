"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Search, RefreshCw } from "lucide-react";
import { ABExperimentsTable, ABExperimentDetailDialog } from "@/components/ab-testing";
import { abExperimentsService } from "@/lib/services/ab-experiments";
import type { ABExperimentListItem } from "@/lib/services/ab-experiments";
import type { ABExperimentStatus } from "@/lib/types/ab-experiment";
import { useNamespace } from "@/providers/NamespaceProvider";
import { toast } from "sonner";

export default function ABExperimentsPage() {
  const { namespace } = useNamespace();

  const [experiments, setExperiments] = useState<ABExperimentListItem[]>([]);
  const [filteredExperiments, setFilteredExperiments] = useState<ABExperimentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ABExperimentStatus | "all">("all");
  const [selectedExperiment, setSelectedExperiment] = useState<ABExperimentListItem | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const loadExperiments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await abExperimentsService.listAllExperiments(namespace);
      setExperiments(data);
      setFilteredExperiments(data);
    } catch (error) {
      console.error("Failed to load experiments:", error);
      toast.error("Failed to load experiments");
    } finally {
      setLoading(false);
    }
  }, [namespace]);

  useEffect(() => {
    loadExperiments();
  }, [loadExperiments]);

  useEffect(() => {
    let filtered = experiments;

    if (searchQuery) {
      filtered = filtered.filter(
        (exp) =>
          exp.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          exp.queryName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((exp) => exp.status === statusFilter);
    }

    setFilteredExperiments(filtered);
  }, [experiments, searchQuery, statusFilter]);

  const handleViewDetails = (experiment: ABExperimentListItem) => {
    setSelectedExperiment(experiment);
    setDetailDialogOpen(true);
  };

  const handleDelete = async (experiment: ABExperimentListItem) => {
    try {
      await abExperimentsService.delete(
        experiment.queryNamespace,
        experiment.queryName,
        experiment.id
      );
      toast.success("Experiment deleted successfully");
      await loadExperiments();
    } catch (error) {
      console.error("Failed to delete experiment:", error);
      toast.error("Failed to delete experiment");
    }
  };

  const handleExperimentUpdated = () => {
    loadExperiments();
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">AB Testing Experiments</h2>
          <p className="text-muted-foreground">
            View and manage all A/B testing experiments
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Experiments</CardTitle>
              <CardDescription>
                {filteredExperiments.length} of {experiments.length} experiments
              </CardDescription>
            </div>
            <Button
              onClick={loadExperiments}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by experiment ID or query name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as ABExperimentStatus | "all")}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="applied">Applied</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-muted-foreground">Loading experiments...</div>
            </div>
          ) : (
            <ABExperimentsTable
              experiments={filteredExperiments}
              onViewDetails={handleViewDetails}
              onDelete={handleDelete}
            />
          )}
        </CardContent>
      </Card>

      <ABExperimentDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        experiment={selectedExperiment}
        onExperimentUpdated={handleExperimentUpdated}
      />
    </div>
  );
}
