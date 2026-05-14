import {
    adminAc,
    defaultStatements,
    memberAc,
    ownerAc,
} from 'better-auth/plugins/organization/access'
import { eq } from 'drizzle-orm'

import type { THonoVariables } from '../types.js'

type TAclStatements = Record<string, string[]>
type TAclRoles = Record<string, TAclStatements>

const cloneStatements = (
    statements: Record<string, readonly string[]>,
): TAclStatements => {
    return Object.fromEntries(
        Object.entries(statements).map(
            ([
                component,
                actions,
            ]) => [
                component,
                [
                    ...actions,
                ],
            ],
        ),
    )
}

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
    let permissions: TAclStatements | null = null

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
            cloneStatements(defaultStatements),
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
    let roles: TAclRoles | null = null

    try {
        roles = JSON.parse(`${await kv.get('cache:aclRoles')}`)
    } catch {
        await kv.delete('cache:aclRoles')
    }

    if (!roles) {
        const { permission, role } = dbSchema

        const defaultRoles: TAclRoles = {
            admin: cloneStatements(adminAc.statements),
            owner: cloneStatements(ownerAc.statements),
            member: cloneStatements(memberAc.statements),
        }

        const dbRoles = await db
            .select({
                component: permission.component,
                action: permission.action,
                role: role.name,
            })
            .from(permission)
            .innerJoin(role, eq(permission.roleId, role.id))

        roles = dbRoles.reduce((accumulator, { action, component, role }) => {
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
        }, defaultRoles)

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
