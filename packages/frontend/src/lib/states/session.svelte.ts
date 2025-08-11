import { authSignInOutputSchema } from '@hyperion/validator/internal/auth'
import { z } from 'zod'

let defaultValue: z.output<
    (typeof authSignInOutputSchema.def.options)['0']['shape']['data']
> | null = $state(null)

export const sessionDataState = {
    get value() {
        try {
            defaultValue =
                authSignInOutputSchema.def.options[0].shape.data.parse(
                    JSON.parse(localStorage.getItem('session_data')!),
                )
            return defaultValue
        } catch (err) {
            return defaultValue
        }
    },
    set: (newValue: typeof defaultValue) => {
        try {
            defaultValue =
                authSignInOutputSchema.def.options[0].shape.data.parse(newValue)
            localStorage.setItem('session_data', JSON.stringify(defaultValue))
        } catch (err) {
            /* EMPTY */
        }
    },
    clear: () => {
        defaultValue = null
        localStorage.removeItem('session_data')
    },
}
