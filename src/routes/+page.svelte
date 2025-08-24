<script lang="ts">
import { onMount } from 'svelte';
import App, { appState } from '$lib/app.svelte';
import Sidebar from '../components/sidebar.svelte';
import Player from '../components/player.svelte';
import MediaPlaylist from '../components/mediaPlaylist.svelte';
</script>

<div class='flex'>
<div class='w-1/5'>
    <Sidebar />
</div>
<div class='w-full'>
    <div class='mb-10'>
        <Player />
    </div>
    <div class=''>
        <MediaPlaylist />
    </div>
</div>
</div>
