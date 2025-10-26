import { authSignInOutputSchema } from '@hyperion/validator/internal/auth'
import { createContext } from 'svelte'

export class SessionState {
    ////////////
    // Fields //
    ////////////

    #session = $state<TSessionData | null>(null)

    /////////////////
    // Constructor //
    /////////////////

    constructor() {
        try {
            this.#session = this.#parseData(
                JSON.parse(localStorage.getItem('session_data')!),
            )
        } catch {
            /* EMPTY */
        }
    }

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
        authSignInOutputSchema.def.options[0].shape.data.parse(data)

    clear = () => {
        this.#session = null
        localStorage.removeItem('session_data')
    }

    isValid = () => {
        return this.#session !== null
    }

    set = (newState: TSessionData | null) => {
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
