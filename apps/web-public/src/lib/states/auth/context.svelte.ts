import { createAuthClient } from 'better-auth/client'
import { organizationClient, usernameClient } from 'better-auth/client/plugins'
import { createAccessControl } from 'better-auth/plugins/access'
import { createContext } from 'svelte'

import { PUBLIC_API_URL } from '$env/static/public'
import type { SessionState } from '../session/context.svelte'

/**
 * @deprecated
 * Possibly for removal once better-auth client is no longer used
 */

export class AuthState {
    ////////////
    // Fields //
    ////////////

    #aclInstance = $derived(() => {
        const permissions = this.#session.data?.permissions ?? {}
        return createAccessControl(permissions)
    })

    #aclRoles = $derived(() => {
        const roles = this.#session.data?.roles ?? {}
        return Object.keys(roles)
            .map((role) => ({
                [role]: this.#aclInstance().newRole(roles[role]),
            }))
            .reduce((accumulator, value) => {
                accumulator = { ...accumulator, ...value }
                return accumulator
            }, {})
    })

    #auth = $derived(
        createAuthClient({
            baseURL: `${PUBLIC_API_URL}/app/auth`,
            plugins: [
                usernameClient(),
                organizationClient({
                    ac: this.#aclInstance(),
                    roles: this.#aclRoles(),
                }),
            ],
        }),
    )

    #session: SessionState

    /////////////////
    // Constructor //
    /////////////////

    constructor(session: SessionState) {
        this.#session = session
    }

    /////////////
    // Getters //
    /////////////

    get client() {
        return this.#auth
    }
}

export const [
    useAuthContext,
    setAuthContext,
] = createContext<AuthState>()
