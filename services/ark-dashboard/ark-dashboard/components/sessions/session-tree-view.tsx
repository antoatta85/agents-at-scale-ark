'use client';

import { ChevronRight, MessageSquare, Play, Zap } from 'lucide-react';
import { useState } from 'react';

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

  return (
    <div className="space-y-2">
      {/* Session Root */}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <span className="font-semibold">Session: {session.id}</span>
        </div>
      </div>


      {/* Queries Tree - with nested conversations */}
      {session.queries && session.queries.length > 0 && (
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
                return (
                  <div key={query.id} className="rounded-lg border bg-card">
                    <Collapsible defaultOpen={hasConversations} className="group/query">
                      <CollapsibleTrigger className="w-full p-3">
                        <div className="flex w-full items-center justify-between">
                          <div className="flex items-center gap-2">
                            <ChevronRight
                              className={`h-3 w-3 transition-transform group-data-[state=open]/query:rotate-90`}
                            />
                            <span className="font-medium">{query.name || query.id}</span>
                            <span
                              className={`rounded px-2 py-0.5 text-xs ${
                                query.status === 'completed'
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                              }`}>
                              {query.status}
                            </span>
                            {query.duration_ms !== null && (
                              <span className="text-xs text-muted-foreground">
                                {(query.duration_ms / 1000).toFixed(2)}s
                              </span>
                            )}
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        {hasConversations && (
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
                                                ? conversation.firstMessage.content
                                                : JSON.stringify(conversation.firstMessage.content)}
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
                                                ? conversation.lastMessage.content
                                                : JSON.stringify(conversation.lastMessage.content)}
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
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                );
              })}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Standalone Conversations (no query_id) */}
      {session.conversations && session.conversations.length > 0 && (
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
                                  ? conversation.firstMessage.content
                                  : JSON.stringify(conversation.firstMessage.content)}
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
                                  ? conversation.lastMessage.content
                                  : JSON.stringify(conversation.lastMessage.content)}
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
      )}

      {/* Empty State */}
      {(!session.queries || session.queries.length === 0) &&
        (!session.conversations || session.conversations.length === 0) && (
          <div className="rounded-lg border bg-card p-4 text-center text-sm text-muted-foreground">
            No queries or conversations found for this session.
          </div>
        )}
    </div>
  );
}

