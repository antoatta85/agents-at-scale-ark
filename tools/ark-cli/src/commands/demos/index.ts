import {Command} from 'commander';
import chalk from 'chalk';
import {execute} from '../../lib/commands.js';
import inquirer from 'inquirer';
import type {ArkConfig} from '../../lib/config.js';
import {showNoClusterError} from '../../lib/startup.js';
import output from '../../lib/output.js';
import ora from 'ora';
import path from 'path';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEMO_CHART_PATH = path.join(
  __dirname,
  '../../../../../charts/ark-demos'
);

async function installDemosChart(
  selectedDemos: string[],
  namespace: string,
  verbose: boolean = false
) {
  const helmArgs = [
    'upgrade',
    '--install',
    'ark-demos',
    DEMO_CHART_PATH,
    '--namespace',
    namespace,
  ];

  // Only create namespace if it's not 'default'
  if (namespace !== 'default') {
    helmArgs.push('--create-namespace');
  }

  // Build demo selection flags
  const demos = {
    math: selectedDemos.includes('math'),
    weather: selectedDemos.includes('weather'),
    research: selectedDemos.includes('research'),
  };

  // Disable demos that weren't selected
  if (!demos.math) {
    helmArgs.push('--set', 'demos.math.enabled=false');
  }
  if (!demos.weather) {
    helmArgs.push('--set', 'demos.weather.enabled=false');
  }
  if (!demos.research) {
    helmArgs.push('--set', 'demos.research.enabled=false');
  }

  await execute('helm', helmArgs, {stdio: 'inherit'}, {verbose});
}

export async function installDemos(
  config: ArkConfig,
  options: {
    all?: boolean;
    math?: boolean;
    weather?: boolean;
    research?: boolean;
    namespace?: string;
    verbose?: boolean;
  } = {}
) {
  // Check cluster connectivity
  if (!config.clusterInfo) {
    showNoClusterError();
    process.exit(1);
  }

  const clusterInfo = config.clusterInfo;
  output.success(`Connected to cluster: ${chalk.bold(clusterInfo.context)}`);

  const namespace = options.namespace || 'default';
  const selectedDemos: string[] = [];

  // If specific demos are requested via flags
  if (options.all || options.math || options.weather || options.research) {
    if (options.all) {
      selectedDemos.push('math', 'weather', 'research');
    } else {
      if (options.math) selectedDemos.push('math');
      if (options.weather) selectedDemos.push('weather');
      if (options.research) selectedDemos.push('research');
    }
  } else {
    // Interactive mode - let user select demos
    console.log(chalk.cyan.bold('\nSelect demos to install:'));
    console.log(
      chalk.gray(
        'Use arrow keys to navigate, space to toggle, enter to confirm\n'
      )
    );

    const demoChoices = [
      new inquirer.Separator(chalk.bold('──── ARK Demos ────')),
      {
        name: `Math Demo ${chalk.gray('- Beginner: Simple math agent demonstrating basic ARK concepts')}`,
        value: 'math',
        checked: true,
      },
      {
        name: `Weather Demo ${chalk.gray('- Intermediate: Weather workflow with file system operations via MCP')}`,
        value: 'weather',
        checked: true,
      },
      {
        name: `Research Demo ${chalk.gray('- Advanced: Multi-agent research team basic ARK concepts')}`,
        value: 'research',
        checked: true,
      },
    ];

    try {
      const answers = await inquirer.prompt([
        {
          type: 'checkbox',
          name: 'demos',
          message: 'Select demos to install:',
          choices: demoChoices,
          pageSize: 10,
        },
      ]);

      selectedDemos.push(...answers.demos);

      if (selectedDemos.length === 0) {
        output.warning('No demos selected. Exiting.');
        process.exit(0);
      }
    } catch (error) {
      if (error && (error as {name?: string}).name === 'ExitPromptError') {
        console.log('\nInstallation cancelled');
        process.exit(130);
      }
      throw error;
    }
  }

  // Install the demos
  const spinner = ora('Installing ARK demos...').start();
  try {
    spinner.succeed('ARK demos installed successfully!');
    spinner.stop();
    await installDemosChart(selectedDemos, namespace, options.verbose);

    console.log();
    output.success(
      `✓ ARK demos installed successfully in namespace: ${chalk.bold(namespace)}`
    );
    console.log();
    output.info('Installed demos:');
    for (const demo of selectedDemos) {
      const name = demo.charAt(0).toUpperCase() + demo.slice(1);
      console.log(`  ${chalk.green('✓')} ${name} Demo`);
    }
    console.log();
    output.info('Next steps:');
    console.log(
      `  ${chalk.cyan('1.')} Check deployed resources:`,
      chalk.gray(`kubectl get agents,teams,queries -n ${namespace}`)
    );
    console.log(
      `  ${chalk.cyan('2.')} Test a demo query:`,
      chalk.gray(`kubectl get query math-query -n ${namespace} -o yaml`)
    );
    console.log(
      `  ${chalk.cyan('3.')} View logs:`,
      chalk.gray('kubectl logs -l app=agent-go-controller-manager')
    );
    console.log();
  } catch (error) {
    spinner.fail('Failed to install ARK demos');
    console.error(error);
    process.exit(1);
  }
}

export async function uninstallDemos(
  config: ArkConfig,
  options: {namespace?: string; verbose?: boolean} = {}
) {
  // Check cluster connectivity
  if (!config.clusterInfo) {
    showNoClusterError();
    process.exit(1);
  }

  const namespace = options.namespace || 'default';
  
  output.info(`Uninstalling ARK demos from namespace: ${chalk.bold(namespace)}`);
  
  const helmArgs = ['uninstall', 'ark-demos', '--namespace', namespace];
  
  const spinner = ora('Uninstalling ARK demos...').start();
  try {
    await execute('helm', helmArgs, {stdio: 'inherit'}, {verbose: options.verbose});
    spinner.succeed('ARK demos uninstalled successfully!');
    
    console.log();
    output.success(
      `✓ ARK demos removed from namespace: ${chalk.bold(namespace)}`
    );
  } catch (error) {
    spinner.fail('Failed to uninstall ARK demos');
    console.error(error);
    process.exit(1);
  }
}

export function createDemosCommand(config: ArkConfig) {
  const command = new Command('demos');

  const installCmd = new Command('install');
  installCmd
    .description('Install ARK demo agents and workflows')
    .option('--all', 'Install all demos (math, weather, research)')
    .option('--math', 'Install math demo (beginner)')
    .option('--weather', 'Install weather demo (intermediate)')
    .option('--research', 'Install research demo (advanced)')
    .option(
      '-n, --namespace <namespace>',
      'Kubernetes namespace for demos (default: default)',
      'default'
    )
    .option('-v, --verbose', 'Show verbose output')
    .action(async (options) => {
      await installDemos(config, options);
    });

  const uninstallCmd = new Command('uninstall');
  uninstallCmd
    .description('Uninstall ARK demo agents and workflows')
    .option(
      '-n, --namespace <namespace>',
      'Kubernetes namespace for demos (default: default)',
      'default'
    )
    .option('-v, --verbose', 'Show verbose output')
    .action(async (options) => {
      await uninstallDemos(config, options);
    });

  command.addCommand(installCmd);
  command.addCommand(uninstallCmd);

  // Make 'install' the default action for backward compatibility
  command
    .description('Install or uninstall ARK demo agents and workflows')
    .option('--all', 'Install all demos (math, weather, research)')
    .option('--math', 'Install math demo (beginner)')
    .option('--weather', 'Install weather demo (intermediate)')
    .option('--research', 'Install research demo (advanced)')
    .option(
      '-n, --namespace <namespace>',
      'Kubernetes namespace for demos (default: default)',
      'default'
    )
    .option('-v, --verbose', 'Show verbose output')
    .action(async (options) => {
      await installDemos(config, options);
    });

  return command;
}
