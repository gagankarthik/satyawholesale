/* =========================================================
   Runtime configuration + AWS integration points.

   The app currently runs on a localStorage-backed store (see
   store.ts / wms.ts) so it is fully functional with no backend.
   When AWS keys are supplied via .env.local, swap the data
   provider and auth provider at the marked seams below.
   ========================================================= */

export const aws = {
  region: process.env.NEXT_PUBLIC_AWS_REGION ?? "us-east-1",
  cognito: {
    userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID ?? "",
    clientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID ?? "",
    domain: process.env.NEXT_PUBLIC_COGNITO_DOMAIN ?? "",
    adminGroup: process.env.NEXT_PUBLIC_COGNITO_ADMIN_GROUP ?? "admins",
  },
  s3: {
    bucket: process.env.NEXT_PUBLIC_S3_BUCKET ?? "",
    publicUrl: process.env.NEXT_PUBLIC_S3_PUBLIC_URL ?? "",
  },
};

/** Server-only DynamoDB table names. */
export const tables = {
  products: process.env.DYNAMO_TABLE_PRODUCTS ?? "satya-products",
  categories: process.env.DYNAMO_TABLE_CATEGORIES ?? "satya-categories",
  suppliers: process.env.DYNAMO_TABLE_SUPPLIERS ?? "satya-suppliers",
  orders: process.env.DYNAMO_TABLE_ORDERS ?? "satya-orders",
  customers: process.env.DYNAMO_TABLE_CUSTOMERS ?? "satya-customers",
  purchaseOrders: process.env.DYNAMO_TABLE_PURCHASE_ORDERS ?? "satya-purchase-orders",
  movements: process.env.DYNAMO_TABLE_MOVEMENTS ?? "satya-stock-movements",
  users: process.env.DYNAMO_TABLE_USERS ?? "satya-staff",
};

/** True once Cognito is wired — used to switch auth provider. */
export const isAuthConfigured = () =>
  Boolean(aws.cognito.userPoolId && aws.cognito.clientId);

/** True once a backend is wired — used to switch the data provider. */
export const isBackendConfigured = () => isAuthConfigured();

/**
 * Data-provider seam. Today this resolves to the localStorage store.
 * Drop-in path to production:
 *   1. `npm i aws-amplify @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb @aws-sdk/client-s3`
 *   2. Implement DynamoDB-backed versions of the hooks in store.ts/wms.ts
 *      behind this flag, keyed by the table names above.
 *   3. Replace the demo sign-in in /portal and the open /admin with a
 *      Cognito session guard (admin gated by NEXT_PUBLIC_COGNITO_ADMIN_GROUP).
 *   4. Upload product images / verification docs to S3 (aws.s3.bucket) and
 *      store the object URL on the record's `image` field.
 */
export const dataProvider = (): "local" | "aws" =>
  isBackendConfigured() ? "aws" : "local";
