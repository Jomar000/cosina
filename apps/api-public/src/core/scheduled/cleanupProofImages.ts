import { dbClient, dbSchema } from '@hyperion/database/postgres'
import { and, inArray, isNotNull, lt, or } from 'drizzle-orm'

/**
 * Deletes proof-of-payment images from KV storage for orders that are
 * completed or cancelled and older than 30 days. Both the KV entry and the
 * object_storage DB record are removed; the FK ON DELETE SET NULL cascade
 * automatically nulls the matching columns on the order table.
 *
 * IDs that are still referenced as product images are never touched — the
 * product table uses the same object_storage table, so we must guard against
 * accidental deletion of shared entries (possible when SHA-256 deduplication
 * collapses a proof upload onto an existing product image record).
 *
 * Intended to run weekly via Cloudflare Workers Cron Trigger (every Sunday
 * at 00:00 UTC: "0 0 * * 0").
 */
export async function cleanupProofImages(env: Env): Promise<void> {
    const db = dbClient({
        host: env.HYPERIONPUB_HD.host,
        port: env.HYPERIONPUB_HD.port,
        database: env.HYPERIONPUB_HD.database,
        user: env.HYPERIONPUB_HD.user,
        pass: env.HYPERIONPUB_HD.password,
    })

    const kv = env.HYPERIONPUB_KV
    const {
        order: orderTable,
        objectStorage: objectStorageTable,
        product: productTable,
    } = dbSchema

    try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

        const orders = await db
            .select({
                proofOfPaymentObjectStorageId:
                    orderTable.proofOfPaymentObjectStorageId,
                remainingBalanceProofObjectStorageId:
                    orderTable.remainingBalanceProofObjectStorageId,
            })
            .from(orderTable)
            .where(
                and(
                    inArray(orderTable.status, [
                        'completed',
                        'cancelled',
                    ]),
                    lt(orderTable.updatedAt, thirtyDaysAgo),
                    or(
                        isNotNull(orderTable.proofOfPaymentObjectStorageId),
                        isNotNull(
                            orderTable.remainingBalanceProofObjectStorageId,
                        ),
                    ),
                ),
            )

        if (orders.length === 0) {
            console.log(
                JSON.stringify({
                    type: 'PROOF_CLEANUP',
                    message: 'No proof images to clean up',
                    ordersProcessed: 0,
                    imagesDeleted: 0,
                }),
            )
            return
        }

        const objectIds = new Set<string>()
        for (const order of orders) {
            if (order.proofOfPaymentObjectStorageId)
                objectIds.add(order.proofOfPaymentObjectStorageId)
            if (order.remainingBalanceProofObjectStorageId)
                objectIds.add(order.remainingBalanceProofObjectStorageId)
        }

        if (objectIds.size === 0) return

        const idList = [...objectIds]

        // Guard: exclude any IDs that are also used as product item images.
        // SHA-256 deduplication means a customer could inadvertently upload an
        // image identical to a product photo, collapsing them to the same row.
        const productImageRows = await db
            .select({ id: productTable.imageObjectStorageId })
            .from(productTable)
            .where(inArray(productTable.imageObjectStorageId, idList))

        const productImageIds = new Set(
            productImageRows
                .map((r) => r.id)
                .filter((id): id is string => id !== null),
        )

        const safeToDelete = idList.filter((id) => !productImageIds.has(id))

        const skipped = idList.length - safeToDelete.length
        if (skipped > 0) {
            console.log(
                JSON.stringify({
                    type: 'PROOF_CLEANUP_SKIP',
                    message: `Skipped ${skipped} ID(s) shared with product images`,
                    skippedIds: idList.filter((id) => productImageIds.has(id)),
                }),
            )
        }

        if (safeToDelete.length === 0) return

        // Delete KV entries in batches of 50 to stay well under rate limits
        const KV_BATCH = 50
        let kvDeleted = 0
        for (let i = 0; i < safeToDelete.length; i += KV_BATCH) {
            await Promise.all(
                safeToDelete
                    .slice(i, i + KV_BATCH)
                    .map((id) => kv.delete(`img:${id}`)),
            )
            kvDeleted += Math.min(KV_BATCH, safeToDelete.length - i)
        }

        // Delete object_storage rows; FK ON DELETE SET NULL handles the order columns
        const DB_BATCH = 1000
        for (let i = 0; i < safeToDelete.length; i += DB_BATCH) {
            await db
                .delete(objectStorageTable)
                .where(
                    inArray(
                        objectStorageTable.id,
                        safeToDelete.slice(i, i + DB_BATCH),
                    ),
                )
        }

        console.log(
            JSON.stringify({
                type: 'PROOF_CLEANUP',
                ordersProcessed: orders.length,
                imagesDeleted: kvDeleted,
                skippedProductImages: skipped,
            }),
        )
    } finally {
        await db.$client.end()
    }
}
