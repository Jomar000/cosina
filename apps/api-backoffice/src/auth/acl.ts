import {
    adminAc,
    defaultStatements,
    memberAc,
    ownerAc,
} from 'better-auth/plugins/organization/access'
import { eq } from 'drizzle-orm'

/**
 * Define permissions for Components
 * This is the complete set of actions for each component
 *
 * @link
 * https://www.better-auth.com/docs/plugins/organization#create-access-control
 */
const buildPermissions = async (
    db: THonoVariables['dbClient'],
    dbSchema: THonoVariables['dbSchema'],
    kv: THonoVariables['kvClient'],
) => {
    let permissions: Record<string, string[]> | null = null

    try {
        permissions = JSON.parse(`${await kv.get('cache:aclPermissions')}`)
    } catch {
        await kv.delete('cache:aclPermissions')
    }

    if (!permissions) {
        const { permission, role } = dbSchema

        const dbPermissions = await db
            .select({
                component: permission.component,
                action: permission.action,
            })
            .from(permission)
            .innerJoin(role, eq(permission.roleId, role.id))
            .groupBy(permission.component, permission.action)

        permissions = dbPermissions.reduce(
            (accumulator, { action, component }) => {
                if (!accumulator[component]) {
                    accumulator[component] = []
                }
                if (!accumulator[component].includes(action)) {
                    accumulator[component].push(action)
                }
                return accumulator
            },
            { ...defaultStatements } as unknown as Record<string, string[]>,
        )

        await kv.put('cache:aclPermissions', JSON.stringify(permissions), {
            expirationTtl: 86400,
        })
    }

    return permissions
}

/**
 * Define capabilities of each Role
 * These are the actions allowed for each role
 *
 * @link
 * https://www.better-auth.com/docs/plugins/organization#create-roles
 */
const buildRoles = async (
    db: THonoVariables['dbClient'],
    dbSchema: THonoVariables['dbSchema'],
    kv: THonoVariables['kvClient'],
) => {
    let roles: Record<string, Record<string, string[]>> | null = null

    try {
        roles = JSON.parse(`${await kv.get('cache:aclRoles')}`)
    } catch {
        await kv.delete('cache:aclRoles')
    }

    if (!roles) {
        const { permission, role } = dbSchema

        const dbRoles = await db
            .select({
                component: permission.component,
                action: permission.action,
                role: role.name,
            })
            .from(permission)
            .innerJoin(role, eq(permission.roleId, role.id))

        roles = dbRoles.reduce(
            (accumulator, { action, component, role }) => {
                if (!accumulator[role]) {
                    accumulator[role] = {}
                }
                if (!accumulator[role][component]) {
                    accumulator[role][component] = []
                }
                if (!accumulator[role][component].includes(action)) {
                    accumulator[role][component].push(action)
                }
                return accumulator
            },
            {
                admin: adminAc.statements,
                owner: ownerAc.statements,
                member: memberAc.statements,
            } as Record<string, Record<string, string[]>>,
        )

        await kv.put('cache:aclRoles', JSON.stringify(roles), {
            expirationTtl: 86400,
        })
    }

    return roles
}

export const aclBuilder = async (
    db: THonoVariables['dbClient'],
    dbSchema: THonoVariables['dbSchema'],
    kv: THonoVariables['kvClient'],
) => {
    const [
        permissions,
        roles,
    ] = await Promise.all([
        buildPermissions(db, dbSchema, kv),
        buildRoles(db, dbSchema, kv),
    ])

    return { permissions, roles }
}

export default aclBuilder
