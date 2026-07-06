/* =========================================================================
   One-time AWS provisioning for Satya Wholesale.
   Creates: DynamoDB table, S3 media bucket, Cognito user pool + app client
   + admin/buyer groups + the first admin user. Idempotent: safe to re-run.
   Writes the resulting IDs into .env.local.

   Usage:  node scripts/provision-aws.mjs [--admin-email you@company.com]
   Requires an active AWS session (run `aws login` first).
   ========================================================================= */
import { DynamoDBClient, CreateTableCommand, DescribeTableCommand, waitUntilTableExists } from "@aws-sdk/client-dynamodb";
import {
  S3Client, CreateBucketCommand, HeadBucketCommand, PutBucketCorsCommand,
  PutPublicAccessBlockCommand, PutBucketPolicyCommand, PutBucketEncryptionCommand,
} from "@aws-sdk/client-s3";
import {
  CognitoIdentityProviderClient, ListUserPoolsCommand, CreateUserPoolCommand,
  CreateUserPoolClientCommand, ListUserPoolClientsCommand, CreateGroupCommand,
  AdminCreateUserCommand, AdminAddUserToGroupCommand, AdminGetUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

/* Resolve region: explicit env wins, else the region already recorded in
   .env.local (so re-runs reconcile the EXISTING stack instead of silently
   creating a duplicate one elsewhere), else the project's home region. */
const envPathForRegion = new URL("../.env.local", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const envRegion = existsSync(envPathForRegion)
  ? (readFileSync(envPathForRegion, "utf8").match(/^AWS_REGION=(.+)$/m)?.[1]
     || readFileSync(envPathForRegion, "utf8").match(/^NEXT_PUBLIC_AWS_REGION=(.+)$/m)?.[1])
  : undefined;
const REGION = process.env.AWS_REGION || envRegion?.trim() || "us-east-2";
const TABLE = "satya-app";
const POOL_NAME = "satya-wholesale";
const argIdx = process.argv.indexOf("--admin-email");
const ADMIN_EMAIL = argIdx > -1 ? process.argv[argIdx + 1] : "oceanbluesolutions@gmail.com";

const ddb = new DynamoDBClient({ region: REGION });
const s3 = new S3Client({ region: REGION });
const idp = new CognitoIdentityProviderClient({ region: REGION });
const sts = new STSClient({ region: REGION });

const log = (m) => console.log(`  ${m}`);

/* ---------- account identity (also names the bucket uniquely) ---------- */
const { Account } = await sts.send(new GetCallerIdentityCommand({}));
const BUCKET = `satya-wholesale-media-${Account}`;
console.log(`\nProvisioning in ${REGION} for account ${Account}\n`);

/* ---------- DynamoDB ---------- */
try {
  await ddb.send(new DescribeTableCommand({ TableName: TABLE }));
  log(`DynamoDB table "${TABLE}" already exists`);
} catch {
  await ddb.send(new CreateTableCommand({
    TableName: TABLE,
    BillingMode: "PAY_PER_REQUEST",
    AttributeDefinitions: [
      { AttributeName: "PK", AttributeType: "S" },
      { AttributeName: "SK", AttributeType: "S" },
    ],
    KeySchema: [
      { AttributeName: "PK", KeyType: "HASH" },
      { AttributeName: "SK", KeyType: "RANGE" },
    ],
  }));
  await waitUntilTableExists({ client: ddb, maxWaitTime: 120 }, { TableName: TABLE });
  log(`DynamoDB table "${TABLE}" created (on-demand billing)`);
}

/* ---------- S3 ---------- */
try {
  await s3.send(new HeadBucketCommand({ Bucket: BUCKET }));
  log(`S3 bucket "${BUCKET}" already exists`);
} catch {
  await s3.send(new CreateBucketCommand({
    Bucket: BUCKET,
    ...(REGION !== "us-east-1" ? { CreateBucketConfiguration: { LocationConstraint: REGION } } : {}),
  }));
  log(`S3 bucket "${BUCKET}" created`);
}
// public read ONLY under public/ (product & promo images); everything else private
await s3.send(new PutPublicAccessBlockCommand({
  Bucket: BUCKET,
  PublicAccessBlockConfiguration: {
    BlockPublicAcls: true, IgnorePublicAcls: true,
    BlockPublicPolicy: false, RestrictPublicBuckets: false,
  },
}));
await s3.send(new PutBucketPolicyCommand({
  Bucket: BUCKET,
  Policy: JSON.stringify({
    Version: "2012-10-17",
    Statement: [
      {
        Sid: "PublicReadPublicPrefix",
        Effect: "Allow",
        Principal: "*",
        Action: "s3:GetObject",
        Resource: `arn:aws:s3:::${BUCKET}/public/*`,
      },
      {
        // Reject any request that isn't over TLS (public reads + presigned ops).
        Sid: "DenyInsecureTransport",
        Effect: "Deny",
        Principal: "*",
        Action: "s3:*",
        Resource: [`arn:aws:s3:::${BUCKET}`, `arn:aws:s3:::${BUCKET}/*`],
        Condition: { Bool: { "aws:SecureTransport": "false" } },
      },
    ],
  }),
}));
// Encrypt objects at rest by default (SSE-S3).
await s3.send(new PutBucketEncryptionCommand({
  Bucket: BUCKET,
  ServerSideEncryptionConfiguration: {
    Rules: [{ ApplyServerSideEncryptionByDefault: { SSEAlgorithm: "AES256" }, BucketKeyEnabled: true }],
  },
}));
await s3.send(new PutBucketCorsCommand({
  Bucket: BUCKET,
  CORSConfiguration: {
    CORSRules: [{
      AllowedMethods: ["PUT", "GET"],
      AllowedOrigins: ["http://localhost:3000", "https://satyawholesalers.com", "https://www.satyawholesalers.com"],
      AllowedHeaders: ["*"],
      MaxAgeSeconds: 3600,
    }],
  },
}));
log(`S3 policy set: public/* readable, presigned uploads CORS-enabled`);

/* ---------- Cognito ---------- */
let poolId;
{
  const { UserPools } = await idp.send(new ListUserPoolsCommand({ MaxResults: 60 }));
  const existing = UserPools?.find((p) => p.Name === POOL_NAME);
  if (existing) {
    poolId = existing.Id;
    log(`Cognito user pool "${POOL_NAME}" already exists (${poolId})`);
  } else {
    const { UserPool } = await idp.send(new CreateUserPoolCommand({
      PoolName: POOL_NAME,
      UsernameAttributes: ["email"],
      AutoVerifiedAttributes: ["email"],
      DeletionProtection: "ACTIVE", // guard against accidental pool deletion (loses all logins)
      MfaConfiguration: "OFF",
      Policies: { PasswordPolicy: { MinimumLength: 10, RequireLowercase: true, RequireNumbers: true, RequireUppercase: true, RequireSymbols: false } },
      Schema: [
        { Name: "email", Required: true, Mutable: true },
        { Name: "store", AttributeDataType: "String", Mutable: true, StringAttributeConstraints: { MinLength: "0", MaxLength: "120" } },
      ],
      AdminCreateUserConfig: {
        AllowAdminCreateUserOnly: true, // no self-signup: trade accounts are invited after review
        InviteMessageTemplate: {
          EmailSubject: "Your Satya Wholesale customer account",
          EmailMessage: "Your Satya Wholesale login is {username} and your temporary password is {####}. Sign in at https://satyawholesalers.com/auth/login to set your own password and start ordering.",
        },
      },
    }));
    poolId = UserPool.Id;
    log(`Cognito user pool created (${poolId})`);
  }
}

let clientId;
{
  const { UserPoolClients } = await idp.send(new ListUserPoolClientsCommand({ UserPoolId: poolId, MaxResults: 60 }));
  const existing = UserPoolClients?.find((c) => c.ClientName === "satya-web");
  if (existing) {
    clientId = existing.ClientId;
    log(`App client "satya-web" already exists (${clientId})`);
  } else {
    const { UserPoolClient } = await idp.send(new CreateUserPoolClientCommand({
      UserPoolId: poolId,
      ClientName: "satya-web",
      GenerateSecret: false,
      ExplicitAuthFlows: ["ALLOW_USER_SRP_AUTH", "ALLOW_USER_PASSWORD_AUTH", "ALLOW_REFRESH_TOKEN_AUTH"],
      AccessTokenValidity: 8, IdTokenValidity: 8, RefreshTokenValidity: 30,
      TokenValidityUnits: { AccessToken: "hours", IdToken: "hours", RefreshToken: "days" },
    }));
    clientId = UserPoolClient.ClientId;
    log(`App client created (${clientId})`);
  }
}

for (const g of [
  { GroupName: "admin", Description: "Warehouse staff: full console access" },
  { GroupName: "buyer", Description: "Customer accounts: order portal access" },
]) {
  try { await idp.send(new CreateGroupCommand({ UserPoolId: poolId, ...g })); log(`Group "${g.GroupName}" created`); }
  catch (e) { if (e.name !== "GroupExistsException") throw e; log(`Group "${g.GroupName}" already exists`); }
}

try {
  await idp.send(new AdminGetUserCommand({ UserPoolId: poolId, Username: ADMIN_EMAIL }));
  log(`Admin user ${ADMIN_EMAIL} already exists`);
} catch {
  await idp.send(new AdminCreateUserCommand({
    UserPoolId: poolId,
    Username: ADMIN_EMAIL,
    UserAttributes: [
      { Name: "email", Value: ADMIN_EMAIL },
      { Name: "email_verified", Value: "true" },
    ],
    DesiredDeliveryMediums: ["EMAIL"],
  }));
  log(`Admin user ${ADMIN_EMAIL} created; Cognito emailed a temporary password`);
}
await idp.send(new AdminAddUserToGroupCommand({ UserPoolId: poolId, Username: ADMIN_EMAIL, GroupName: "admin" }));
log(`${ADMIN_EMAIL} added to "admin" group`);

/* ---------- .env.local ---------- */
const envPath = new URL("../.env.local", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const wanted = {
  AWS_REGION: REGION,
  SATYA_BUCKET: BUCKET,
  NEXT_PUBLIC_AWS_REGION: REGION,
  NEXT_PUBLIC_SATYA_TABLE: TABLE,
  NEXT_PUBLIC_COGNITO_USER_POOL_ID: poolId,
  NEXT_PUBLIC_COGNITO_CLIENT_ID: clientId,
  NEXT_PUBLIC_MEDIA_BASE: `https://${BUCKET}.s3.${REGION}.amazonaws.com`,
};
let lines = existsSync(envPath) ? readFileSync(envPath, "utf8").split(/\r?\n/) : [];
for (const [k, v] of Object.entries(wanted)) {
  const i = lines.findIndex((l) => l.startsWith(`${k}=`));
  if (i >= 0) lines[i] = `${k}=${v}`;
  else lines.push(`${k}=${v}`);
}
writeFileSync(envPath, lines.filter((l, i) => l !== "" || i < lines.length - 1).join("\n") + "\n");
log(`.env.local updated`);

console.log(`\nDone. Next: node scripts/seed-aws.mjs, then restart the dev server.\n`);
