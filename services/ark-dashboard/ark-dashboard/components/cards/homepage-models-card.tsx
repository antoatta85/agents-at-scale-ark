'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';

import { DASHBOARD_SECTIONS } from '@/lib/constants';
import { useGetAllModels } from '@/lib/services/models-hooks';

import { MetricCard } from './metric-card';

export function HomepageModelsCard() {
  const { data, isPending, error } = useGetAllModels();

  const count = data?.length || 0;
  const section = DASHBOARD_SECTIONS.models;

  useEffect(() => {
    if (error) {
      console.warn('Failed to get Models:', error);
    }
  }, [error]);

  return (
    <MetricCard
      key={section.key}
      title={section.title}
      value={count}
      Icon={section.icon}
      href={`/${section.key}`}
      isLoading={isPending}
      hasError={Boolean(error)}
    />
  );
}
