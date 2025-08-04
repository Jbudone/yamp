YAMP - Yet Another Music Player


TODO:
- show list sorting (which column is currently sorted)
- space to pause/resume
- Structure:
        App
            - on PlayerController.songFinished -> update server controller (playCount, lastListened) -> update library (onServerUpdated)
        DBController
            - indexeddb caching
            - event: library updated  -- perhaps patch update so we only update specific songIdx
            - cacheHasSegment, cacheGetSegment, getLibrary, updateSong  (don't forget async tasks -> need to await/lock so we don't process indexeddb updates while a server db update is in flight)
        LibraryController
            - library, playlists, filtering/activeView, getSongAtIndex
            - on ServerController.libraryUpdated: update library/playlist -> event libraryUpdated  -- eg. playCount, last listen
            - events: libraryUpdated
        PlayerController
            - state (for Player.svelte): current time, paused, playing, etc.
            - events: song finished -> play next
            - FIX: cache title as `/song_5294/stream.m4s` as opposed to the whole url, so that it doesn't rely on token in url
        MediaPlaylist.svelte
            - playlist
            - filtering/sorting list
            - on LibraryController.libraryUpdated -> update list (refresh)
        Player.svelte  -- self contained element, import appState to show current song and songState (time), all call on events (clicked resume/pause/etc.)
            - controls
            - events: resume, pause, seek, loop
- UI inspiration:
    https://dribbble.com/shots/6485692-Music-Desktop-Player-Dark-Version
    https://dribbble.com/shots/20250807-Music-Player-Desktop-Version-Penox
    https://dribbble.com/shots/11639192-Music-Player-Desktop-App
    https://dribbble.com/shots/19725321-Music-player-Desktop-App



- build media files on the fly
- compare banshee + database to make sure we're perfectly synced; maybe script it so we can detect any out of sync
- drag/drop song into playlist to upload + add to queue; sync to local folder
- indexDB mirror db; sync server->client db on load
- playlist handling, reordering songs, drag/drop songs into playlist, etc.
- in-playlist song wave insiration: https://www.bypeople.com/waveform-ui-js-component/  dotted waves
- MusizBrainz
- Edit song
- Replace song w/ higher quality alternative -- also remove previous one from CDN
- sync from CDN -> PC? Or maybe we download to Backblaze inititally and then sync from there to PC
- context menus
- date_addeed and date_played don't lineup exactly with Banshee, why?

- indexDB store cached streamed songs (useful for flakey connection, or no connection yet) to save the last 20 songs; then dash.js intercept requests and fetch from indexDB instead

- Things to read up on
    svelte: https://svelte.dev/docs/svelte/v5-migration-guide
    express, tailwindcss, postcss, vite, biome, stylelint, typescript, ts-node, nodemon, dash.js, audioMotion-analyzer


# Music Import
--------
Songs that might need fixing after:
  3265: this will bw the day that i die
  file:///home/jbud/Music/Kanye%20West/Unknown%20Album/Diamonds%20Are%20Forever.mp3  # duplicate, but this one is borked

[
  {
    "Uri": "file:///home/jbud/Music/The%20Exit/American%20Pie%202%20Soundtrack/12%20Susan.mp3",
    "Title": "Susan",
    "PlayCount": 0,
    "LastPlayedStamp": null,
    "DateAddedStamp": 1211395903,
    "DateUpdatedStamp": 1702959562,
    "Artist": "The Exit"
  },
  {
    "Uri": "file:///home/jbud/Nightcore%20-%2004.%20Nothin%20Good%20About%20Goodbye.mp3",
    "Title": "Nothin Good About Goodbye",
    "PlayCount": 48,
    "LastPlayedStamp": 1470624801,
    "DateAddedStamp": 1395016080,
    "DateUpdatedStamp": 1609610298,
    "Artist": "Hinder"
  },
  {
    "Uri": "file:///home/jbud/Nightcore%20-%2011.%20Rockstar.mp3",
    "Title": "Rockstar",
    "PlayCount": 43,
    "LastPlayedStamp": 1470624997,
    "DateAddedStamp": 1395016691,
    "DateUpdatedStamp": 1609610293,
    "Artist": "Nickleback"
  },
  {
    "Uri": "file:///home/jbud/Nightcore%20-%20Lights%20and%20Sounds.mp3",
    "Title": "Nightcore - Lights and Sounds",
    "PlayCount": 18,
    "LastPlayedStamp": 1470625239,
    "DateAddedStamp": 1395160213,
    "DateUpdatedStamp": 1609610299,
    "Artist": "Yellowcard"
  },
  {
    "Uri": "file:///home/jbud/Nightcore%20-%20Ikiru.mp3",
    "Title": "Nightcore - Ikiru",
    "PlayCount": 118,
    "LastPlayedStamp": 1475362227,
    "DateAddedStamp": 1428821826,
    "DateUpdatedStamp": 1459691615,
    "Artist": "Mykool"
  },
  {
    "Uri": "file:///home/jbud/Nightcore%20-%20Zebrahead%20-%20Sirens%20(Official%20Music%20Video)-uUrTQ4X-tL0.mp3",
    "Title": "Nightcore - Sirens",
    "PlayCount": 18,
    "LastPlayedStamp": 1462151107,
    "DateAddedStamp": 1437426685,
    "DateUpdatedStamp": 1595775263,
    "Artist": "Zebrahead"
  },
  {
    "Uri": "file:///home/jbud/Nightcore%20-%20Bear%20Grillz%20&%20The%20Frim%20-%20It's%20Fucking%20Dubstep-m1vksN9vNBQ.mp3",
    "Title": "Nightcore - ",
    "PlayCount": 8,
    "LastPlayedStamp": 1406071904,
    "DateAddedStamp": 1399619541,
    "DateUpdatedStamp": 1437426699,
    "Artist": null
  },
  {
    "Uri": "file:///home/jbud/Music/Eminem/Unknown%20Album/We%20Made%20You%20(Chipmunks).mp3",
    "Title": "We Made You (Chipmunks)",
    "PlayCount": 6,
    "LastPlayedStamp": 1371615298,
    "DateAddedStamp": 1337496755,
    "DateUpdatedStamp": 1400729914,
    "Artist": "Eminem"
  },
  {
    "Uri": "file:///home/jbud/Music/White%20Stripes/Unknown%20Album/Blue%20Orchid.mp3",
    "Title": "Blue Orchid",
    "PlayCount": 7,
    "LastPlayedStamp": 1371192394,
    "DateAddedStamp": 1135671160,
    "DateUpdatedStamp": 1437791745,
    "Artist": "White Stripes"
  }
]
