import type { THonoBindings } from '../types.js'

type TEnvironment = THonoBindings['ENVIRONMENT']

export const getCsrfCookieName = (environment: TEnvironment) =>
    environment === 'production'
        ? '__Host-csrf_token'
        : `__Host-${environment}_csrf_token`

export const getSessionCookieName = (environment: TEnvironment) =>
    environment === 'production'
        ? '__Host-session_token'
        : `__Host-${environment}_session_token`
