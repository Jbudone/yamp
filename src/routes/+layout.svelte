<script lang="ts">
import "../app.css";

const { children } = $props();
import { onMount } from 'svelte';
import { app, appState } from '$lib';

// Initialize the app on mount (client-side only)
onMount(async () => {
    // +layout.svelte mount, so that we only initialize app once despite route changes
    await app.initialize();
});


</script>

{#if $appState.loading}
  <div class="loading-overlay">
    <p>Loading application...</p>
  </div>
{:else if $appState.error}
  <div class="error-container">
    <h2>Error initializing application</h2>
    <p>{$appState.error}</p>
    <button on:click={() => app.initialize()}>Retry</button>
  </div>
{:else}
  <!-- Your app layout -->
  <header>
    <!-- Header content -->
  </header>
  
  <main>
    <!-- This is where page content will be rendered -->
{@render children()}
  </main>
  
  <footer>
    <!-- Footer content -->
  </footer>
{/if}

<style>
  .loading-overlay {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    width: 100%;
  }
  
  .error-container {
    padding: 2rem;
    max-width: 600px;
    margin: 0 auto;
    text-align: center;
  }
</style>

