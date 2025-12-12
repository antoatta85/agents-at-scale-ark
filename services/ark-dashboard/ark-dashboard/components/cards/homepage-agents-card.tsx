'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';

import { DASHBOARD_SECTIONS } from '@/lib/constants';
import { useGetAllAgents } from '@/lib/services/agents-hooks';

import { MetricCard } from './metric-card';

export function HomepageAgentsCard() {
  const { data, isPending, error } = useGetAllAgents();

  const count = data?.length || 0;

  const section = DASHBOARD_SECTIONS.agents;
  const href = `/${section.key}`;

  useEffect(() => {
    if (error) {
      console.warn('Failed to get Agents:', error);
    }
  }, [error]);

  return (
    <MetricCard
      key={section.key}
      title={section.title}
      value={count}
      Icon={section.icon}
      href={href}
      isLoading={isPending}
      hasError={Boolean(error)}
    />
  );
}
