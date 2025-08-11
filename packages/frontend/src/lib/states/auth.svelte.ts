import { createAuthClient } from 'better-auth/client'
import { organizationClient, usernameClient } from 'better-auth/client/plugins'
import { createAccessControl } from 'better-auth/plugins/access'

import { PUBLIC_API_URL } from '$env/static/public'
import { sessionDataState } from '$lib/states/session.svelte.js'

const aclPermissions = $derived(sessionDataState.value?.permissions ?? {})
const aclRoles = $derived(sessionDataState.value?.roles ?? {})
const aclInstance = $derived(createAccessControl(aclPermissions))

/**
 * @description
 * Better Auth Client wrapped in SvelteKit reactivity
 */
export const authClientState = {
    get value() {
        return createAuthClient({
            baseURL: `${PUBLIC_API_URL}/internal/auth`,
            plugins: [
                usernameClient(),
                organizationClient({
                    ac: aclInstance,
                    roles: Object.keys(aclRoles)
                        .map((role) => ({
                            [role]: aclInstance.newRole(aclRoles[role]),
                        }))
                        .reduce((accumulator, value) => {
                            accumulator = { ...accumulator, ...value }
                            return accumulator
                        }, {}),
                }),
            ],
        })
    },
}
