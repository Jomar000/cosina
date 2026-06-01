import { eq } from 'drizzle-orm'
import type { Context } from 'hono'

import { AppError } from '../errors.js'
import type { THonoInstance } from '../types.js'

export const assertUserUnlocked = async (
    ctx: Context<THonoInstance>,
    userId: string,
) => {
    const { userAttribute } = ctx.get('dbSchema')

    const userAttributeData =
        (
            await ctx
                .get('dbClient')
                .select({ isLocked: userAttribute.isLocked })
                .from(userAttribute)
                .where(eq(userAttribute.userId, userId))
        )[0] ?? null

    if (!userAttributeData || userAttributeData.isLocked) {
        throw new AppError({
            code: 'LOCKED',
            message: 'Account is currently locked.',
            status: 423,
        })
    }
}
