'use client';

import { CheckCircle2, ChevronRight, Clock, Copy, MessageSquare, Play, Zap } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type { Session } from '@/lib/services/sessions';

interface SessionTreeViewProps {
  session: Session;
}

export function SessionTreeView({ session }: SessionTreeViewProps) {
  const [expandedQueries, setExpandedQueries] = useState<Set<string>>(new Set());
  const [expandedConversations, setExpandedConversations] = useState<Set<string>>(new Set());

  const toggleQuery = (queryId: string) => {
    const newExpanded = new Set(expandedQueries);
    if (newExpanded.has(queryId)) {
      newExpanded.delete(queryId);
    } else {
      newExpanded.add(queryId);
    }
    setExpandedQueries(newExpanded);
  };

  const toggleConversation = (conversationId: string) => {
    const newExpanded = new Set(expandedConversations);
    if (newExpanded.has(conversationId)) {
      newExpanded.delete(conversationId);
    } else {
      newExpanded.add(conversationId);
    }
    setExpandedConversations(newExpanded);
  };

  const copySessionId = () => {
    navigator.clipboard.writeText(session.id);
    toast.success('Session ID copied to clipboard');
  };

  const copyQueryId = (queryId: string) => {
    navigator.clipboard.writeText(queryId);
    toast.success('Query ID copied to clipboard');
  };

  const truncateText = (text: string, maxLength: number = 150) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  return (
    <div className="space-y-2">
      {/* Session Root */}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <span className="font-semibold">Session: {session.id}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={copySessionId}>
            <Copy className="h-3 w-3 mr-1" />
            Copy ID
          </Button>
        </div>
      </div>


      {/* Queries Tree - with nested conversations */}
      {session.queries && session.queries.length > 0 ? (
        <Collapsible defaultOpen className="group/collapsible">
          <CollapsibleTrigger className="w-full">
            <div className="flex w-full items-center justify-between rounded-lg border bg-card p-3 hover:bg-accent">
              <div className="flex items-center gap-2">
                <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                <Play className="h-4 w-4 text-blue-500" />
                <span className="font-medium">Queries ({session.queries.length})</span>
              </div>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="ml-6 mt-2 space-y-2 border-l-2 pl-4">
              {session.queries.map((query) => {
                const hasConversations = query.conversations && query.conversations.length > 0;
                const isExpanded = expandedQueries.has(query.id);
                return (
                  <div key={query.id} className="rounded-lg border bg-card">
                    <Collapsible 
                      open={isExpanded}
                      onOpenChange={() => toggleQuery(query.id)}
                      className="group/query">
                      <CollapsibleTrigger className="w-full p-3">
                        <div className="flex w-full items-center justify-between">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <ChevronRight
                              className={`h-3 w-3 transition-transform flex-shrink-0 ${
                                isExpanded ? 'rotate-90' : ''
                              }`}
                            />
                            <div className="flex flex-col min-w-0">
                              <span className="font-medium truncate">{query.name || 'Unnamed Query'}</span>
                              <span className="text-xs text-muted-foreground truncate" title={query.id}>
                                ID: {query.id}
                              </span>
                            </div>
                            <Badge
                              variant={
                                query.status === 'completed' ? 'default' : 'secondary'
                              }
                              className={
                                query.status === 'completed'
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-300 dark:border-green-700 flex-shrink-0'
                                  : query.status === 'in_progress'
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-300 dark:border-blue-700 flex-shrink-0'
                                    : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400 border-gray-300 dark:border-gray-700 flex-shrink-0'
                              }>
                              {query.status === 'completed' ? (
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                              ) : (
                                <Clock className="h-3 w-3 mr-1" />
                              )}
                              {query.status === 'completed' 
                                ? 'Completed' 
                                : query.status === 'in_progress'
                                  ? 'In Progress'
                                  : query.status}
                            </Badge>
                            {query.duration_ms !== null && (
                              <span className="text-xs text-muted-foreground flex-shrink-0">
                                {(query.duration_ms / 1000).toFixed(2)}s
                              </span>
                            )}
                          </div>
                          <div
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              copyQueryId(query.id);
                            }} 
                            className="inline-flex items-center justify-center h-6 w-6 rounded-md hover:bg-accent hover:text-accent-foreground cursor-pointer flex-shrink-0"
                            tabIndex={-1}
                            aria-label="Copy query ID">
                            <Copy className="h-3 w-3" />
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        {hasConversations ? (
                          <div className="ml-4 space-y-2 border-l-2 pl-4">
                            {query.conversations.map((conversation) => {
                              const isExpanded = expandedConversations.has(conversation.id);
                              return (
                                <div key={conversation.id} className="rounded-lg border bg-card">
                                  <Collapsible
                                    open={isExpanded}
                                    onOpenChange={() => toggleConversation(conversation.id)}>
                                    <CollapsibleTrigger className="w-full p-2">
                                      <div className="flex w-full items-center gap-2">
                                        <ChevronRight
                                          className={`h-3 w-3 transition-transform ${
                                            isExpanded ? 'rotate-90' : ''
                                          }`}
                                        />
                                        <MessageSquare className="h-3 w-3 text-purple-500" />
                                        <span className="text-sm font-medium">
                                          Conversation {conversation.id}
                                        </span>
                                      </div>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                      <div className="ml-4 space-y-2 border-l-2 pl-4">
                                        {conversation.firstMessage && (
                                          <div className="rounded border bg-muted/50 p-2">
                                            <div className="mb-1 text-xs font-medium text-muted-foreground">
                                              First Message
                                            </div>
                                            <div className="text-xs">
                                              <span className="font-medium">
                                                {conversation.firstMessage.role || 'user'}:
                                              </span>{' '}
                                              {typeof conversation.firstMessage.content === 'string'
                                                ? truncateText(conversation.firstMessage.content)
                                                : truncateText(JSON.stringify(conversation.firstMessage.content))}
                                            </div>
                                          </div>
                                        )}
                                        {conversation.lastMessage && (
                                          <div className="rounded border bg-muted/50 p-2">
                                            <div className="mb-1 text-xs font-medium text-muted-foreground">
                                              Last Message
                                            </div>
                                            <div className="text-xs">
                                              <span className="font-medium">
                                                {conversation.lastMessage.role || 'assistant'}:
                                              </span>{' '}
                                              {typeof conversation.lastMessage.content === 'string'
                                                ? truncateText(conversation.lastMessage.content)
                                                : truncateText(JSON.stringify(conversation.lastMessage.content))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </CollapsibleContent>
                                  </Collapsible>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="ml-4 p-2 text-xs text-muted-foreground italic">
                            No conversations for this query
                          </div>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                );
              })}
            </div>
          </CollapsibleContent>
        </Collapsible>
      ) : (
        <div className="rounded-lg border bg-card p-4 text-center text-sm text-muted-foreground">
          <Play className="mx-auto h-8 w-8 mb-2 opacity-50" />
          <p className="font-medium">No queries found for this session</p>
          <p className="text-xs mt-1">Queries will appear here when QueryStart/QueryComplete events are received</p>
        </div>
      )}

      {/* Standalone Conversations (no query_id) */}
      {session.conversations && session.conversations.length > 0 ? (
        <Collapsible defaultOpen className="group/collapsible">
          <CollapsibleTrigger className="w-full">
            <div className="flex w-full items-center justify-between rounded-lg border bg-card p-3 hover:bg-accent">
              <div className="flex items-center gap-2">
                <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                <MessageSquare className="h-4 w-4 text-purple-500" />
                <span className="font-medium">
                  Standalone Conversations ({session.conversations.length})
                </span>
              </div>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="ml-6 mt-2 space-y-2 border-l-2 pl-4">
              {session.conversations.map((conversation) => {
                const isExpanded = expandedConversations.has(conversation.id);
                return (
                  <div key={conversation.id} className="rounded-lg border bg-card">
                    <Collapsible
                      open={isExpanded}
                      onOpenChange={() => toggleConversation(conversation.id)}>
                      <CollapsibleTrigger className="w-full p-3">
                        <div className="flex w-full items-center justify-between">
                          <div className="flex items-center gap-2">
                            <ChevronRight
                              className={`h-3 w-3 transition-transform ${
                                isExpanded ? 'rotate-90' : ''
                              }`}
                            />
                            <span className="text-sm font-medium">
                              Conversation {conversation.id}
                            </span>
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="ml-4 space-y-2 border-l-2 pl-4">
                          {conversation.firstMessage && (
                            <div className="rounded border bg-muted/50 p-2">
                              <div className="mb-1 text-xs font-medium text-muted-foreground">
                                First Message
                              </div>
                              <div className="text-xs">
                                <span className="font-medium">
                                  {conversation.firstMessage.role || 'user'}:
                                </span>{' '}
                                {typeof conversation.firstMessage.content === 'string'
                                  ? truncateText(conversation.firstMessage.content)
                                  : truncateText(JSON.stringify(conversation.firstMessage.content))}
                              </div>
                            </div>
                          )}
                          {conversation.lastMessage && (
                            <div className="rounded border bg-muted/50 p-2">
                              <div className="mb-1 text-xs font-medium text-muted-foreground">
                                Last Message
                              </div>
                              <div className="text-xs">
                                <span className="font-medium">
                                  {conversation.lastMessage.role || 'assistant'}:
                                </span>{' '}
                                {typeof conversation.lastMessage.content === 'string'
                                  ? truncateText(conversation.lastMessage.content)
                                  : truncateText(JSON.stringify(conversation.lastMessage.content))}
                              </div>
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                );
              })}
            </div>
          </CollapsibleContent>
        </Collapsible>
      ) : null}

      {/* Empty State - Only show if both queries and conversations are empty */}
      {(!session.queries || session.queries.length === 0) &&
        (!session.conversations || session.conversations.length === 0) && (
          <div className="rounded-lg border bg-card p-4 text-center text-sm text-muted-foreground">
            <Zap className="mx-auto h-8 w-8 mb-2 opacity-50" />
            <p className="font-medium">No queries or conversations found</p>
            <p className="text-xs mt-1">This session is empty. Add messages or run queries to populate it.</p>
          </div>
        )}
    </div>
  );
}

