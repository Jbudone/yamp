<script lang="ts">
import { onMount } from 'svelte';
import App, { appState } from '$lib/app.svelte';
import Sidebar from '../components/sidebar.svelte';
import Player from '../components/player.svelte';
import MediaPlaylist from '../components/mediaPlaylist.svelte';
</script>

<div class='overflow-hidden h-screen'>
<div class='float-left w-1/5'>
    <Sidebar />
</div>
<div class='float-right w-4/5'>
    <div class='mb-30'>
        <Player />
    </div>
    <div class=''>
        <MediaPlaylist />
    </div>
</div>
</div>
