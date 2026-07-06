import { env } from "./env";

/* Shared AWS client configuration for every server-side client
   (DynamoDB, S3, Cognito). Credentials resolve in this order:

   1. Static keys from .env.local (NEXT_AWS_ACCESS_KEY_ID / _SECRET) —
      handy for local dev, where the SDK's default chain would otherwise
      NOT see them (it only reads the un-prefixed AWS_* names).
   2. The SDK default chain (IAM role in production on Amplify/ECS/Lambda,
      SSO, ~/.aws/credentials) when no static keys are present.

   Region always comes from env (AWS_REGION, falling back to the public
   NEXT_PUBLIC_AWS_REGION so a single value can drive both planes). */

interface StaticCreds {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}

function staticCredentials(): StaticCreds | undefined {
  const accessKeyId = process.env.NEXT_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.NEXT_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) return undefined; // fall back to the default provider chain
  const sessionToken = process.env.NEXT_AWS_SESSION_TOKEN || process.env.AWS_SESSION_TOKEN;
  return { accessKeyId, secretAccessKey, ...(sessionToken ? { sessionToken } : {}) };
}

/** Spread into any AWS SDK client constructor: `new S3Client(awsClientConfig())`. */
export const awsClientConfig = () => ({
  region: env.region,
  credentials: staticCredentials(),
});
