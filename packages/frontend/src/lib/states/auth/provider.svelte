<script lang="ts">
    import { useSessionContext } from '../session/context.svelte.js'
    import { AuthState, setAuthContext } from './context.svelte.js'

    ////////////////
    // Properties //
    ////////////////

    let { children } = $props()

    //////////////
    // Contexts //
    //////////////

    const session = useSessionContext()

    // Auth is dependent on Session
    setAuthContext(new AuthState(session))
</script>

{@render children()}
