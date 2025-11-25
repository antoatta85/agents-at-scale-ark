/**
 * Shared query execution logic for both universal and resource-specific query commands
 */

import {execa} from 'execa';
import ora from 'ora';
import chalk from 'chalk';
import type {Query, QueryTarget} from './types.js';
import {ExitCodes} from './errors.js';
import {ArkApiProxy} from './arkApiProxy.js';
import {ChatClient, ToolCall, ArkMetadata} from './chatClient.js';

export interface QueryOptions {
  targetType: string;
  targetName: string;
  message: string;
  timeout?: string;
  watchTimeout?: string;
  verbose?: boolean;
  outputFormat?: string;
  sessionId?: string;
}

interface StreamState {
  currentAgent?: string;
  toolCalls: Map<number, ToolCall>;
  content: string;
}

export async function executeQuery(options: QueryOptions): Promise<void> {
  if (options.outputFormat) {
    return executeQueryWithFormat(options);
  }

  let arkApiProxy: ArkApiProxy | undefined;
  const spinner = ora('Connecting to Ark API...').start();

  try {
    arkApiProxy = new ArkApiProxy();
    const arkApiClient = await arkApiProxy.start();
    const chatClient = new ChatClient(arkApiClient);

    spinner.text = 'Executing query...';

    const targetId = `${options.targetType}/${options.targetName}`;
    const messages = [{role: 'user' as const, content: options.message}];

    const state: StreamState = {
      toolCalls: new Map(),
      content: '',
    };

    let lastAgentName: string | undefined;
    let headerShown = false;
    let firstOutput = true;

    // Get sessionId from option or environment variable
    const sessionId = options.sessionId || process.env.ARK_SESSION_ID;

    await chatClient.sendMessage(
      targetId,
      messages,
      {streamingEnabled: true, sessionId},
      (chunk: string, toolCalls?: ToolCall[], arkMetadata?: ArkMetadata) => {
        if (firstOutput) {
          spinner.stop();
          firstOutput = false;
        }

        const agentName = arkMetadata?.agent || arkMetadata?.team;

        if (agentName && agentName !== lastAgentName) {
          if (lastAgentName) {
            if (state.content) {
              process.stdout.write('\n');
            }
            process.stdout.write('\n');
          }

          const prefix = arkMetadata?.team ? '◆' : '●';
          const color = arkMetadata?.team ? 'green' : 'cyan';
          process.stdout.write(chalk[color](`${prefix} ${agentName}\n`));
          lastAgentName = agentName;
          state.content = '';
          state.toolCalls.clear();
          headerShown = true;
        }

        if (toolCalls && toolCalls.length > 0) {
          for (const toolCall of toolCalls) {
            if (!state.toolCalls.has(toolCall.id as any)) {
              state.toolCalls.set(toolCall.id as any, toolCall);
              if (state.content) {
                process.stdout.write('\n');
              }
              process.stdout.write(
                chalk.magenta(`🔧 ${toolCall.function.name}\n`)
              );
            }
          }
        }

        if (chunk) {
          if (state.toolCalls.size > 0 && !state.content) {
            process.stdout.write('\n');
          }
          process.stdout.write(chunk);
          state.content += chunk;
        }
      }
    );

    if (spinner.isSpinning) {
      spinner.stop();
    }

    if ((state.content || state.toolCalls.size > 0) && headerShown) {
      process.stdout.write('\n');
    }

    if (arkApiProxy) {
      arkApiProxy.stop();
    }
  } catch (error) {
    if (spinner.isSpinning) {
      spinner.stop();
    }
    if (arkApiProxy) {
      arkApiProxy.stop();
    }

    console.error(
      chalk.red(error instanceof Error ? error.message : 'Unknown error')
    );
    process.exit(ExitCodes.CliError);
  }
}

async function executeQueryWithFormat(options: QueryOptions): Promise<void> {
  const timestamp = Date.now();
  const queryName = `cli-query-${timestamp}`;

  const queryManifest: Partial<Query> = {
    apiVersion: 'ark.mckinsey.com/v1alpha1',
    kind: 'Query',
    metadata: {
      name: queryName,
    },
      spec: {
        input: options.message,
        ...(options.timeout && {timeout: options.timeout}),
        ...((options.sessionId || process.env.ARK_SESSION_ID) && {
          sessionId: options.sessionId || process.env.ARK_SESSION_ID,
        }),
      targets: [
        {
          type: options.targetType,
          name: options.targetName,
        },
      ],
    },
  };

  try {
    await execa('kubectl', ['apply', '-f', '-'], {
      input: JSON.stringify(queryManifest),
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Give Kubernetes a moment to process the resource before watching
    await new Promise(resolve => setTimeout(resolve, 100));

    if (options.outputFormat === 'events') {
      await watchEventsLive(queryName);
      return;
    }

    const timeoutSeconds = 300;
    await execa(
      'kubectl',
      [
        'wait',
        '--for=condition=Completed',
        `query/${queryName}`,
        `--timeout=${timeoutSeconds}s`,
      ],
      {timeout: timeoutSeconds * 1000}
    );

    if (options.outputFormat === 'name') {
      console.log(queryName);
    } else if (
      options.outputFormat === 'json' ||
      options.outputFormat === 'yaml'
    ) {
      const {stdout} = await execa(
        'kubectl',
        ['get', 'query', queryName, '-o', options.outputFormat],
        {stdio: 'pipe'}
      );
      console.log(stdout);
    } else {
      console.error(
        chalk.red(
          `Invalid output format: ${options.outputFormat}. Use: yaml, json, name, or events`
        )
      );
      process.exit(ExitCodes.CliError);
    }
  } catch (error) {
    console.error(
      chalk.red(error instanceof Error ? error.message : 'Unknown error')
    );
    process.exit(ExitCodes.CliError);
  }
}

async function watchEventsLive(queryName: string): Promise<void> {
  const seenEvents = new Set<string>();

  const pollEvents = async () => {
    try {
      const {stdout} = await execa('kubectl', [
        'get',
        'events',
        '--field-selector',
        `involvedObject.name=${queryName}`,
        '-n',
        'default',
        '-o',
        'json',
      ]);

      const eventsData = JSON.parse(stdout);
      for (const event of eventsData.items || []) {
        const eventId = event.metadata?.uid;

        if (eventId && !seenEvents.has(eventId)) {
          seenEvents.add(eventId);

          const annotations = event.metadata?.annotations || {};
          const eventData = annotations['ark.mckinsey.com/event-data'];

          if (eventData) {
            const now = new Date();
            const hours = now.getHours().toString().padStart(2, '0');
            const minutes = now.getMinutes().toString().padStart(2, '0');
            const seconds = now.getSeconds().toString().padStart(2, '0');
            const millis = now.getMilliseconds().toString().padStart(3, '0');
            const timestamp = `${hours}:${minutes}:${seconds}.${millis}`;

            const reason = event.reason || 'Unknown';
            const eventType = event.type || 'Normal';

            const colorCode = eventType === 'Normal' ? 32 : eventType === 'Warning' ? 33 : 31;
            console.log(
              `${timestamp} \x1b[${colorCode}m${reason}\x1b[0m ${eventData}`
            );
          }
        }
      }
    } catch (error) {
    }
  };

  const pollInterval = setInterval(pollEvents, 200);

  const timeoutSeconds = 300;

  const waitProcess = execa(
    'kubectl',
    [
      'wait',
      '--for=condition=Completed',
      `query/${queryName}`,
      `-n`,
      'default',
      `--timeout=${timeoutSeconds}s`,
    ],
    {
      timeout: timeoutSeconds * 1000,
    }
  );

  try {
    await waitProcess;
    await pollEvents();
    await new Promise(resolve => setTimeout(resolve, 200));
    await pollEvents();
  } catch (error) {
    console.error(chalk.red('Query wait failed:', error instanceof Error ? error.message : 'Unknown error'));
  } finally {
    clearInterval(pollInterval);
  }
}

/**
 * Parse a target string like "model/default" or "agent/weather"
 * Returns QueryTarget or null if invalid
 */
export function parseTarget(target: string): QueryTarget | null {
  const parts = target.split('/');
  if (parts.length !== 2) {
    return null;
  }
  return {
    type: parts[0],
    name: parts[1],
  };
}
