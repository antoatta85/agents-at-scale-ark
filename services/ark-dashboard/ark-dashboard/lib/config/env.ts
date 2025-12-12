/**
 * Runtime environment variable accessor for Next.js API routes.
 * 
 * This module ensures environment variables are accessible at runtime,
 * even when Next.js/Turbopack might not expose them directly.
 * 
 * The issue: Next.js API routes sometimes can't see env vars set by DevSpace
 * in the pod, even though they're in the container environment.
 * 
 * Root cause: Turbopack does static analysis and replaces process.env.X at
 * compile time. If variables aren't available during compilation, they get
 * replaced with undefined and never re-evaluated.
 * 
 * Solution: Use dynamic property access that Turbopack can't statically analyze.
 * This forces runtime evaluation of process.env.
 */

function requireEnvVar(key: string): string {
  // Use bracket notation to prevent Turbopack static analysis
  const envObj = process.env as Record<string, string | undefined>;
  const value = envObj[key];
  
  if (!value) {
    // Collect diagnostic information
    const diagnostics = {
      requestedKey: key,
      processEnvType: typeof process.env,
      processEnvIsNull: process.env === null,
      processEnvIsUndefined: process.env === undefined,
      processEnvKeysCount: process.env ? Object.keys(process.env).length : 0,
      allProcessEnvKeys: process.env ? Object.keys(process.env).sort() : [],
      arkKeysInProcessEnv: process.env ? Object.keys(process.env).filter(k => k.includes('ARK_')).sort() : [],
      sessionsKeysInProcessEnv: process.env ? Object.keys(process.env).filter(k => k.includes('SESSIONS')).sort() : [],
      directAccessResult: envObj[key],
      bracketAccessResult: (process.env as any)[key],
    };
    
    throw new Error(
      `Missing required environment variable: ${key}\n` +
      `Diagnostics: ${JSON.stringify(diagnostics, null, 2)}`
    );
  }
  return value;
}

export const env = {
  get ARK_API_SERVICE_HOST() {
    return requireEnvVar('ARK_API_SERVICE_HOST');
  },
  get ARK_API_SERVICE_PORT() {
    return requireEnvVar('ARK_API_SERVICE_PORT');
  },
  get ARK_SESSIONS_SERVICE_HOST() {
    return requireEnvVar('ARK_SESSIONS_SERVICE_HOST');
  },
  get ARK_SESSIONS_SERVICE_PORT() {
    return requireEnvVar('ARK_SESSIONS_SERVICE_PORT');
  },
};

