'use client';

import {
  BarChart3,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  Play,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ChildEvaluation {
  name: string;
  phase: string;
  score: string;
  passed: boolean;
  message?: string;
}

interface BatchProgress {
  total: number;
  completed: number;
  failed: number;
  running: number;
  childEvaluations: ChildEvaluation[];
}

interface BatchEvaluationDisplayProps {
  batchProgress: BatchProgress;
  namespace: string;
}

const getStatusInfo = (phase: string) => {
  switch (phase.toLowerCase()) {
    case 'done':
      return {
        color:
          'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        icon: CheckCircle,
        label: 'Done',
      };
    case 'error':
    case 'failed':
      return {
        color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
        icon: XCircle,
        label: 'Error',
      };
    case 'running':
      return {
        color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        icon: Play,
        label: 'Running',
      };
    default:
      return {
        color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
        icon: Clock,
        label: 'Pending',
      };
  }
};

const formatScore = (scoreStr: string): number => {
  const score = parseFloat(scoreStr);
  return isNaN(score) ? 0 : score;
};

export function BatchEvaluationDisplay({
  batchProgress,
  namespace,
}: BatchEvaluationDisplayProps) {
  const [showDetails, setShowDetails] = useState(false);

  const { total, completed, failed, running, childEvaluations } = batchProgress;

  const passedCount = childEvaluations.filter(child => child.passed).length;
  const failedCount = childEvaluations.filter(
    child => !child.passed && child.phase === 'done',
  ).length;
  const successRate = total > 0 ? (passedCount / total) * 100 : 0;

  const scores = childEvaluations
    .filter(child => child.score && child.phase === 'done')
    .map(child => formatScore(child.score));
  const averageScore =
    scores.length > 0
      ? scores.reduce((sum, score) => sum + score, 0) / scores.length
      : 0;

  const totalTokens = 0;
  const totalDuration = 0;

  return (
    <div className="space-y-6">
      <Card
        className={`${
          successRate >= 70
            ? 'border-green-200 bg-green-50/30'
            : 'border-yellow-200 bg-yellow-50/30'
        } dark:bg-transparent`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-full ${
                  successRate >= 70
                    ? 'bg-green-100 dark:bg-green-900/30'
                    : 'bg-yellow-100 dark:bg-yellow-900/30'
                }`}>
                <BarChart3
                  className={`h-7 w-7 ${
                    successRate >= 70 ? 'text-green-600' : 'text-yellow-600'
                  }`}
                />
              </div>
              <div>
                <CardTitle
                  className={`mb-1 text-xl ${
                    successRate >= 70
                      ? 'text-green-900 dark:text-green-100'
                      : 'text-yellow-900 dark:text-yellow-100'
                  }`}>
                  Batch Evaluation Summary
                </CardTitle>
                <CardDescription className="text-base">
                  {completed} of {total} evaluations completed •{' '}
                  {successRate.toFixed(1)}% success rate
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <FileText className="h-4 w-4 text-blue-600" />
                </div>
                <span className="text-sm font-semibold">Total</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold">{total}</div>
            <p className="text-muted-foreground text-xs">Child evaluations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <span className="text-sm font-semibold">Passed</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold text-green-600">
              {passedCount}
            </div>
            <p className="text-muted-foreground text-xs">
              Successful evaluations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                  <XCircle className="h-4 w-4 text-red-600" />
                </div>
                <span className="text-sm font-semibold">Failed</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold text-red-600">{failedCount}</div>
            <p className="text-muted-foreground text-xs">Failed evaluations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                </div>
                <span className="text-sm font-semibold">Avg Score</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold">
              {averageScore > 0 ? averageScore.toFixed(2) : '—'}
            </div>
            <p className="text-muted-foreground text-xs">
              Average across children
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Progress Overview
          </CardTitle>
          <CardDescription>
            Status breakdown of all child evaluations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Completed</span>
              <span className="font-medium">
                {completed} / {total} ({((completed / total) * 100).toFixed(0)}
                %)
              </span>
            </div>
            <Progress
              value={(completed / total) * 100}
              className="h-2 [&>div]:bg-gradient-to-r [&>div]:from-green-500 [&>div]:to-green-600"
            />
          </div>

          <div className="grid grid-cols-3 gap-4 pt-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                <Play className="mr-1 h-3 w-3" />
                Running
              </Badge>
              <span className="text-sm font-medium">{running}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                <CheckCircle className="mr-1 h-3 w-3" />
                Done
              </Badge>
              <span className="text-sm font-medium">{completed}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                <XCircle className="mr-1 h-3 w-3" />
                Failed
              </Badge>
              <span className="text-sm font-medium">{failed}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Child Evaluations
          </CardTitle>
          <CardDescription>
            Detailed results for each evaluation in the batch
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Result</TableHead>
                <TableHead>Message</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {childEvaluations.map((child, index) => {
                const statusInfo = getStatusInfo(child.phase);
                const StatusIcon = statusInfo.icon;
                const score = formatScore(child.score);
                const scoreColor =
                  score >= 0.7
                    ? 'text-green-600'
                    : score > 0
                      ? 'text-yellow-600'
                      : 'text-gray-400';

                return (
                  <TableRow key={index}>
                    <TableCell>
                      <Link
                        href={`/evaluation/${child.name}?namespace=${namespace}`}
                        className="hover:text-primary font-medium underline-offset-2 hover:underline">
                        {child.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusInfo.color}>
                        <StatusIcon className="mr-1 h-3 w-3" />
                        {statusInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={`font-mono font-medium ${scoreColor}`}>
                        {score > 0 ? `${(score * 100).toFixed(0)}%` : '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {child.passed ? (
                        <div className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          <span className="text-sm font-medium">Passed</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-red-600">
                          <XCircle className="h-4 w-4" />
                          <span className="text-sm font-medium">Failed</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground text-sm">
                        {child.message || '—'}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {(totalTokens > 0 || totalDuration > 0) && (
        <Collapsible open={showDetails} onOpenChange={setShowDetails}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full">
              <span>Aggregated Metrics</span>
              {showDetails ? (
                <ChevronUp className="ml-2 h-4 w-4" />
              ) : (
                <ChevronDown className="ml-2 h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Usage Statistics</CardTitle>
                <CardDescription>
                  Aggregated metrics across all child evaluations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-muted-foreground text-sm font-medium">
                      Total Token Usage
                    </p>
                    <p className="text-2xl font-bold">
                      {totalTokens.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm font-medium">
                      Total Duration
                    </p>
                    <p className="text-2xl font-bold">{totalDuration}s</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
