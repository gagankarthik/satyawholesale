/* =========================================================================
   Prints the least-privilege IAM policy the RUNTIME needs (the Amplify SSR
   compute role, or the local NEXT_AWS_* user). Covers exactly the AWS calls the
   app makes: DynamoDB single-table CRUD, S3 document get/put, and the Cognito
   admin actions behind /api/onboarding and /api/users.

   Symptom this fixes: /api/users (and admin user actions) return 500 with
   code "AccessDeniedException" in production because the compute role can call
   DynamoDB/S3 but was never granted the cognito-idp Admin* / ListUsersInGroup
   actions.

   Usage:  node scripts/print-iam-policy.mjs
   Requires an active AWS session (for the account id) and a populated .env.local.
   ========================================================================= */
import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";
import { readFileSync, existsSync } from "node:fs";

const envPath = new URL("../.env.local", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
if (!existsSync(envPath)) {
  console.error("No .env.local found. Run `node scripts/provision-aws.mjs` first.");
  process.exit(1);
}
const envText = readFileSync(envPath, "utf8");
const read = (k) => envText.match(new RegExp(`^${k}=(.+)$`, "m"))?.[1]?.trim();

const REGION = read("AWS_REGION") || read("NEXT_PUBLIC_AWS_REGION") || "us-east-2";
const TABLE = read("NEXT_PUBLIC_SATYA_TABLE");
const BUCKET = read("SATYA_BUCKET");
const POOL_ID = read("NEXT_PUBLIC_COGNITO_USER_POOL_ID");

const missing = Object.entries({ NEXT_PUBLIC_SATYA_TABLE: TABLE, SATYA_BUCKET: BUCKET, NEXT_PUBLIC_COGNITO_USER_POOL_ID: POOL_ID })
  .filter(([, v]) => !v).map(([k]) => k);
if (missing.length) {
  console.error(`.env.local is missing: ${missing.join(", ")}. Re-run scripts/provision-aws.mjs.`);
  process.exit(1);
}

const { Account } = await new STSClient({ region: REGION }).send(new GetCallerIdentityCommand({}));

const policy = {
  Version: "2012-10-17",
  Statement: [
    {
      Sid: "SatyaDynamoDB",
      Effect: "Allow",
      Action: ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem", "dynamodb:DeleteItem", "dynamodb:Query"],
      Resource: `arn:aws:dynamodb:${REGION}:${Account}:table/${TABLE}`,
    },
    {
      Sid: "SatyaS3Documents",
      Effect: "Allow",
      Action: ["s3:GetObject", "s3:PutObject"],
      Resource: `arn:aws:s3:::${BUCKET}/*`,
    },
    {
      // The block that is typically MISSING in production (causes /api/users 500).
      Sid: "SatyaCognitoAdmin",
      Effect: "Allow",
      Action: [
        "cognito-idp:ListUsersInGroup",
        "cognito-idp:AdminCreateUser",
        "cognito-idp:AdminAddUserToGroup",
        "cognito-idp:AdminRemoveUserFromGroup",
        "cognito-idp:AdminEnableUser",
        "cognito-idp:AdminDisableUser",
        "cognito-idp:AdminUpdateUserAttributes",
      ],
      Resource: `arn:aws:cognito-idp:${REGION}:${Account}:userpool/${POOL_ID}`,
    },
  ],
};

console.log(`\n// Least-privilege runtime policy for account ${Account} (${REGION})`);
console.log(JSON.stringify(policy, null, 2));
console.log(`
Attach it to the Amplify SSR compute role:
  1. Amplify console > your app > App settings > IAM roles  (note the "Compute role" name),
     OR find the role named like  amplify-<app>-<branch>-...-ComputeRole-...  in IAM.
  2. IAM console > Roles > <that role> > Add permissions > Create inline policy > JSON,
     paste the JSON above, name it "satya-runtime", Create.
  3. Redeploy or just retry — the 500 on /api/users should clear.

CLI equivalent (replace <ROLE_NAME>):
  aws iam put-role-policy --role-name <ROLE_NAME> --policy-name satya-runtime \\
    --policy-document '${JSON.stringify(policy)}'
`);
