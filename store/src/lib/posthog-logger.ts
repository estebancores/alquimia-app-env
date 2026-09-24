import { logs } from '@opentelemetry/api-logs';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { NodeSDK } from '@opentelemetry/sdk-node';

const projectToken = import.meta.env.PUBLIC_POSTHOG_PROJECT_TOKEN as string | undefined;
const host = import.meta.env.PUBLIC_POSTHOG_HOST as string | undefined;

if (import.meta.env.DEV && (!projectToken || !host)) {
  const missingVariable = !projectToken ? 'PUBLIC_POSTHOG_PROJECT_TOKEN' : 'PUBLIC_POSTHOG_HOST';
  throw new Error(
    `${missingVariable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${missingVariable} is configured`,
  );
}

if (projectToken && host) {
  const sdk = new NodeSDK({
    resource: resourceFromAttributes({ 'service.name': 'alquimia-store' }),
    logRecordProcessors: [
      new BatchLogRecordProcessor({
        exporter: new OTLPLogExporter({
          url: `${host}/i/v1/logs`,
          headers: { Authorization: `Bearer ${projectToken}` },
        }),
      }),
    ],
  });
  sdk.start();
}

export const orderLogger = logs.getLogger('alquimia-store.orders');
