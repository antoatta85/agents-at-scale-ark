'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';

import { DASHBOARD_SECTIONS } from '@/lib/constants';
import { useGetAllTeams } from '@/lib/services/teams-hooks';

import { MetricCard } from './metric-card';

export function HomepageTeamsCard() {
  const { data, isPending, error } = useGetAllTeams();

  const count = data?.length || 0;

  const section = DASHBOARD_SECTIONS.teams;
  const href = `/${section.key}`;

  useEffect(() => {
    if (error) {
      console.warn('Failed to get Teams:', error);
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
