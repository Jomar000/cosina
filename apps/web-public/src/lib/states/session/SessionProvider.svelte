<script lang="ts">
    import { SessionState, setSessionContext } from './context.svelte'

    ////////////////////
    // 01. Properties //
    ////////////////////

    let { children } = $props()

    ///////////////////
    // 02. Constants //
    ///////////////////

    const session = new SessionState()

    session.loadFromLocalStorage()

    setSessionContext(session)
</script>

{@render children()}
