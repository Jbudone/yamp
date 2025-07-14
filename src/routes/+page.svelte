<script lang="ts">
import { onMount } from 'svelte';
import App, { appState } from '$lib/app.svelte';
import Player from '../components/player.svelte';
import MediaPlaylist from '../components/mediaPlaylist.svelte';
</script>

<h1>Welcome!!! to SvelteKit</h1>
<p>Visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to read the documentation</p>

<MediaPlaylist />
<Player />
