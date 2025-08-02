<script lang="ts">
import { onMount } from 'svelte';
import App, { appState } from '$lib/app.svelte';
import Player from '../components/player.svelte';
import MediaPlaylist from '../components/mediaPlaylist.svelte';
</script>

<h1>Yet Another Music Player</h1>
<p>Thanks a lot Josh, like we really needed another one</p>

<MediaPlaylist />
<Player />
