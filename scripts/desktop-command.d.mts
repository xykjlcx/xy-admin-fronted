export interface ParsedDesktopCommand {
  command: 'dev' | 'build' | 'make';
  windowChrome: 'native' | 'integrated';
  environment: Record<string, string | undefined>;
}

export interface DesktopCommandStep {
  executable: string;
  args: string[];
}

export function parseDesktopCommand(
  argv: string[],
  environment?: Record<string, string | undefined>,
): ParsedDesktopCommand;
export function createDesktopCommandPlan(
  parsed: ParsedDesktopCommand,
  platform?: NodeJS.Platform,
): DesktopCommandStep[];
export function runDesktopCommand(parsed: ParsedDesktopCommand): void;
