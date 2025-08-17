import {
    adminAc,
    defaultStatements,
    memberAc,
    ownerAc,
} from 'better-auth/plugins/organization/access'
import { eq } from 'drizzle-orm'

export const aclBuilder = async (
    db: THonoVariables['dbClient'],
    dbSchema: THonoVariables['dbSchema'],
) => {
    const { permission, role } = dbSchema

    const _permissions = await db
        .select({
            component: permission.component,
            action: permission.action,
        })
        .from(permission)
        .innerJoin(role, eq(permission.roleId, role.id))
        .groupBy(permission.component, permission.action)

    const _roles = await db
        .select({
            component: permission.component,
            action: permission.action,
            role: role.name,
        })
        .from(permission)
        .innerJoin(role, eq(permission.roleId, role.id))

    // Define permissions for Components
    // This is the complete set of actions for each component
    // https://www.better-auth.com/docs/plugins/organization#create-access-control
    const permissions = _permissions.reduce(
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

    // Define capabilities of each Role
    // These are the actions allowed for each role
    // https://www.better-auth.com/docs/plugins/organization#create-roles
    const roles = _roles.reduce(
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

    return {
        permissions,
        roles,
    }
}

export default aclBuilder
