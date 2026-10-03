import { authorize } from './authorize.mjs';

/**
 * `transaction` must expose the Prisma transaction client. Authorization happens before it is opened.
 * `write` creates the business row/history; `audit` and `outbox` must use the same client.
 */
export async function runAuthorizedMutation({ actor, action, resource, transaction, write, audit, outbox, now }) {
  const decision = authorize({ actor, action, resource, now });
  return transaction(async (tx) => {
    const result = await write(tx, decision);
    await audit(tx, { actorId: decision.actorId, action, entityType: resource.type, entityId: resource.id });
    await outbox(tx, { aggregateType: resource.type, aggregateId: resource.id, action });
    return result;
  });
}
