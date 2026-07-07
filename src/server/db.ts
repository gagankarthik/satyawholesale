import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, GetCommand, PutCommand, DeleteCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
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

/** Create-only write: succeeds only if no item with this id exists yet, so a
    "create" can never silently overwrite an existing record (which, for orders,
    would reset its status and re-run the stock decrement). Returns false on a
    collision so the caller can retry with a fresh id. */
export async function createItem(type: string, id: string, item: Row): Promise<boolean> {
  try {
    await doc().send(new PutCommand({
      TableName: env.table,
      Item: { ...strip(item), PK: `T#${type}`, SK: id },
      ConditionExpression: "attribute_not_exists(SK)",
    }));
    return true;
  } catch (e) {
    if ((e as { name?: string }).name === "ConditionalCheckFailedException") return false;
    throw e;
  }
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

/** Atomic, strictly-sequential counter. One item per named sequence under
    PK "T#counters"; DynamoDB's atomic increment guarantees no two concurrent
    callers ever receive the same value. Returns the new (post-increment) count. */
export async function nextSequence(name: string, start = 0): Promise<number> {
  const r = await doc().send(new UpdateCommand({
    TableName: env.table,
    Key: { PK: "T#counters", SK: name },
    UpdateExpression: "SET seq = if_not_exists(seq, :start) + :one",
    ExpressionAttributeValues: { ":start": start, ":one": 1 },
    ReturnValues: "UPDATED_NEW",
  }));
  return Number((r.Attributes as { seq?: number }).seq ?? 0);
}

/** Next 12-digit Costco-style membership number: strictly sequential, starting
    at 100000000001. Backed by the atomic `memberNo` sequence. */
export async function nextMemberNo(): Promise<string> {
  const seq = await nextSequence("memberNo");
  return String(100000000000 + seq);
}

/** Atomically subtract `by` from a numeric field in a single write, so
    concurrent orders can't lose each other's decrements (read-merge-write
    did). Behavior-preserving: if the field would go negative it clamps to 0
    (as before), and a missing item is a no-op (as the old `if (!p) continue`). */
export async function decrementField(type: string, id: string, field: string, by: number): Promise<void> {
  if (!(by > 0)) return;
  const Key = { PK: `T#${type}`, SK: id };
  const names = { "#f": field };
  try {
    await doc().send(new UpdateCommand({
      TableName: env.table, Key,
      UpdateExpression: "SET #f = #f - :q",
      ConditionExpression: "attribute_exists(SK) AND #f >= :q",
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: { ":q": by },
    }));
  } catch (e) {
    if ((e as { name?: string }).name !== "ConditionalCheckFailedException") throw e;
    // Item gone, or stock < qty — clamp to zero if the item still exists.
    try {
      await doc().send(new UpdateCommand({
        TableName: env.table, Key,
        UpdateExpression: "SET #f = :zero",
        ConditionExpression: "attribute_exists(SK)",
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: { ":zero": 0 },
      }));
    } catch (e2) {
      if ((e2 as { name?: string }).name !== "ConditionalCheckFailedException") throw e2;
      // no such item — nothing to decrement
    }
  }
}
