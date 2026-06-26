import { auth as authValidator } from '@hyperion/validator/backoffice'
import { createContext } from 'svelte'

export class SessionState {
    ////////////
    // Fields //
    ////////////

    #sessionInitValue: TSessionData = {
        name: '{{name}}',
        email: '{{email}}',
        permissions: {},
        roles: {},
        userRoles: [],
        expiresAt: 0,
        avatar: '{{avatar}}',
    }

    #session = $state<TSessionData>(this.#sessionInitValue)

    /////////////
    // Getters //
    /////////////

    get data() {
        return this.#session
    }

    /////////////
    // Methods //
    /////////////

    #parseData: (data: unknown) => TSessionData = (data) =>
        authValidator.signInOutputSchema.def.options[0].shape.data.parse(data)

    clear = () => {
        this.#session = this.#sessionInitValue
        localStorage.removeItem('session_data')
    }

    isValid = (): this is { data: TSessionData } => {
        const isValid = this.#session.expiresAt > this.#getCurrentEpochSeconds()

        if (!isValid) {
            this.clear()
        }

        return isValid
    }

    loadFromLocalStorage = () => {
        try {
            const storedSession = localStorage.getItem('session_data')
            if (!storedSession) return

            this.#session = this.#parseData(JSON.parse(storedSession))
            this.isValid()
        } catch {
            this.clear()
        }
    }

    set = (newState: TSessionData) => {
        try {
            const parsedState = this.#parseData(newState)
            if (!this.#isSessionDataValid(parsedState)) {
                this.clear()
                return false
            }

            this.#session = parsedState
            localStorage.setItem('session_data', JSON.stringify(parsedState))

            return true
        } catch {
            this.clear()
            return false
        }
    }

    getMillisecondsUntilExpiry = () =>
        Math.max(
            (this.#session.expiresAt - this.#getCurrentEpochSeconds()) * 1000,
            0,
        )

    #getCurrentEpochSeconds = () => Math.floor(Date.now() / 1000)

    #isSessionDataValid = (session: TSessionData) =>
        session.expiresAt > this.#getCurrentEpochSeconds()
}

export const [
    useSessionContext,
    setSessionContext,
] = createContext<SessionState>()
