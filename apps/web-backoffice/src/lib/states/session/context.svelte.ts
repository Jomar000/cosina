import { auth as authValidator } from '@hyperion/validator/backoffice'
import { createContext } from 'svelte'
import { SvelteDate } from 'svelte/reactivity'

export class SessionState {
    ////////////
    // Fields //
    ////////////

    #sessionInitValue = {
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
        const isValid =
            this.#session.expiresAt >
            Math.floor(new SvelteDate().getTime() / 1000)

        if (!isValid) {
            this.clear()
        }

        return isValid
    }

    loadFromLocalStorage = () => {
        try {
            this.#session = this.#parseData(
                JSON.parse(localStorage.getItem('session_data')!),
            )
            this.isValid()
        } catch {
            /* EMPTY */
        }
    }

    set = (newState: TSessionData) => {
        try {
            this.#session = this.#parseData(newState)
            localStorage.setItem('session_data', JSON.stringify(this.#session))
        } catch {
            /* EMPTY */
        }
    }
}

export const [
    useSessionContext,
    setSessionContext,
] = createContext<SessionState>()
