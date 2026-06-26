export type RouteSession = {
    isAuthenticated: boolean
    userRoles: readonly string[]
}

export class NavigationGeneration {
    #current = 0

    begin() {
        this.#current += 1
        return this.#current
    }

    isCurrent(generation: number) {
        return generation === this.#current
    }
}

export function getAuthenticatedDestination(userRoles: readonly string[]) {
    return userRoles.length === 1 ? `/app/${userRoles[0]}/dashboard` : '/app'
}

export function isSessionActive(expiresAt: number, now = Date.now()) {
    return expiresAt > Math.floor(now / 1000)
}

export function resolveCanonicalDestination(
    pathname: string,
    session: RouteSession,
) {
    const authenticatedDestination = getAuthenticatedDestination(
        session.userRoles,
    )

    if (pathname === '/' || pathname === '/sign-in') {
        return session.isAuthenticated
            ? authenticatedDestination
            : pathname === '/'
              ? '/sign-in'
              : null
    }

    if (pathname !== '/app' && !pathname.startsWith('/app/')) return null
    if (!session.isAuthenticated) return '/sign-in'
    if (pathname === '/app') {
        return session.userRoles.length === 1 ? authenticatedDestination : null
    }

    const requestedRole = pathname.split('/')[2]
    return session.userRoles.includes(requestedRole)
        ? null
        : authenticatedDestination
}
