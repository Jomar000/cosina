import { createAuthClient } from 'better-auth/client'
import { organizationClient, usernameClient } from 'better-auth/client/plugins'
import { createAccessControl } from 'better-auth/plugins/access'
import { createContext } from 'svelte'

import { PUBLIC_API_URL } from '$env/static/public'
import type { SessionState } from './session.svelte.js'

export class AuthState {
    ////////////
    // Fields //
    ////////////

    #session: SessionState

    #aclPermissions = $derived(() => {
        const { state: session } = this.#session
        return session?.permissions ?? {}
    })

    #aclRoles = $derived(() => {
        const { state: session } = this.#session
        return session?.roles ?? {}
    })

    #aclInstance = $derived(() => createAccessControl(this.#aclPermissions()))

    /////////////////
    // Constructor //
    /////////////////

    constructor(session: SessionState) {
        this.#session = session
    }

    /////////////
    // Getters //
    /////////////

    get state() {
        return createAuthClient({
            baseURL: `${PUBLIC_API_URL}/internal/auth`,
            plugins: [
                usernameClient(),
                organizationClient({
                    ac: this.#aclInstance(),
                    roles: Object.keys(this.#aclRoles())
                        .map((role) => ({
                            [role]: this.#aclInstance().newRole(
                                this.#aclRoles()[role],
                            ),
                        }))
                        .reduce((accumulator, value) => {
                            accumulator = { ...accumulator, ...value }
                            return accumulator
                        }, {}),
                }),
            ],
        })
    }
}

export const [
    useAuthContext,
    setAuthContext,
] = createContext<AuthState>()
