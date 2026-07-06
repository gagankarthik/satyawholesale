import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, GetCommand, PutCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { env } from "./env";
import { awsClientConfig } from "./aws";

/* Single-table layout: PK = "T#<type>", SK = "<id>".
   Every entity is one item; listings are a single-partition Query.
   Right-sized for a single-warehouse catalog (hundreds to a few
   thousand items per type), not for unbounded event streams. */

let _doc: DynamoDBDocumentClient | null = null;
const doc = () => (_doc ??= DynamoDBDocumentClient.from(
  new DynamoDBClient(awsClientConfig()),
  { marshallOptions: { removeUndefinedValues: true } }
));

export type Row = Record<string, unknown> & { PK?: string; SK?: string };

const strip = ({ PK: _pk, SK: _sk, ...rest }: Row) => rest;

export async function listByType(type: string): Promise<Row[]> {
  const items: Row[] = [];
  let cursor: Record<string, unknown> | undefined;
  do {
    const r = await doc().send(new QueryCommand({
      TableName: env.table,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: { ":pk": `T#${type}` },
      ExclusiveStartKey: cursor,
    }));
    (r.Items as Row[] | undefined)?.forEach((i) => items.push(strip(i)));
    cursor = r.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (cursor);
  return items;
}

export async function getItem(type: string, id: string): Promise<Row | null> {
  const r = await doc().send(new GetCommand({ TableName: env.table, Key: { PK: `T#${type}`, SK: id } }));
  return r.Item ? strip(r.Item as Row) : null;
}

export async function putItem(type: string, id: string, item: Row): Promise<void> {
  await doc().send(new PutCommand({
    TableName: env.table,
    Item: { ...strip(item), PK: `T#${type}`, SK: id },
  }));
}

/** Read-merge-write patch. Last write wins; acceptable for a
    single-warehouse admin team, revisit if concurrent editing grows. */
export async function patchItem(type: string, id: string, patch: Row): Promise<Row | null> {
  const cur = await getItem(type, id);
  if (!cur) return null;
  const next = { ...cur, ...strip(patch) };
  await putItem(type, id, next);
  return next;
}

export async function deleteItem(type: string, id: string): Promise<void> {
  await doc().send(new DeleteCommand({ TableName: env.table, Key: { PK: `T#${type}`, SK: id } }));
}
