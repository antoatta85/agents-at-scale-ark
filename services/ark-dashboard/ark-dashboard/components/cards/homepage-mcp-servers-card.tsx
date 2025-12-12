'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';

import { DASHBOARD_SECTIONS } from '@/lib/constants';
import { useGetAllMcpServers } from '@/lib/services/mcp-servers-hooks';

import { MetricCard } from './metric-card';

export function HomepageMcpServersCard() {
  const { data, isPending, error } = useGetAllMcpServers();

  const count = data?.length || 0;

  const section = DASHBOARD_SECTIONS.mcp;
  const href = `/${section.key}`;

  useEffect(() => {
    if (error) {
      console.warn('Failed to get MCP Servers:', error);
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
