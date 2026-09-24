import { PostHog } from 'posthog-node';

const projectToken = import.meta.env.PUBLIC_POSTHOG_PROJECT_TOKEN as string | undefined;
const host = import.meta.env.PUBLIC_POSTHOG_HOST as string | undefined;

if (import.meta.env.DEV && (!projectToken || !host)) {
  const missingVariable = !projectToken ? 'PUBLIC_POSTHOG_PROJECT_TOKEN' : 'PUBLIC_POSTHOG_HOST';
  throw new Error(
    `${missingVariable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${missingVariable} is configured`,
  );
}

export const serverPostHog = projectToken && host
  ? new PostHog(projectToken, { host })
  : null;
