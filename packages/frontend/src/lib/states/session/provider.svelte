<script lang="ts">
    import { SessionState, setSessionContext } from './context.svelte.js'

    ////////////////
    // Properties //
    ////////////////

    let { children } = $props()

    //////////////
    // Contexts //
    //////////////

    const session = new SessionState()
    session.loadFromLocalStorage()

    setSessionContext(session)
</script>

{@render children()}
