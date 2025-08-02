<script lang="ts">
import App, { appState } from '$lib/app.svelte';
import LibraryController from '$lib/libraryController.svelte';
import { TabulatorFull as Tabulator } from 'tabulator-tables';
import { DateTime } from 'luxon';
import { playerState } from '$lib/playerController.svelte';

import HyperList from 'hyperlist';
import u from 'umbrellajs';

let libraryEl = null;
let table = null;

let activeId = -1; // id of song that's currently playing

let onReady = $state(false);
$effect(() => {
    if (!onReady && appState.initialized) {
        initialize();
        onReady = true;
    }
});

var checkActiveSong = () => {
    setTimeout(checkActiveSong, 2000);
};

checkActiveSong();

$effect(() => {
    if (playerState.activeSong && table.initialized) {
        const cdnPath = playerState.activeSong;
        const songId = parseInt(cdnPath.substr(cdnPath.indexOf('_') + 1), 10);
        setActiveSong(songId);
    }
});

const clickedSong = (songRow) => {
    App.clickedSong(songRow);
};

const initialize = () => {

    // FIXME: cleanup
    libraryEl = document.getElementById('library');

    let libraryDataView = LibraryController.GetDataView();

    table = new Tabulator(libraryEl, {
        dependencies: { DateTime },
        columns:[
            {
                title:"Title",
                field:"song_name",
                sorter:"string",
                width:200,
                //formatter: (cell) => {
                //    if (cell.getValue().indexOf('ActiveSong') >= 0) {
                //        cell.getElement().classList.add('ActiveSong');
                //    }
                //}
            },
            {
                title:"song_artist",
                field:"song_artist",
                sorter:"string"
            },
            {
                title:"Play Count",
                field:"play_count",
                sorter:"number",
                hozAlign:"right",
                //formatter:"progress" // FIXME: consider progress bar? it sure looks cool but we still need the number
            },
            {
                title:"Length",
                field:"duration",
                sorter:"number", // FIXME: duration was formatted to a string, but we want to sort by its int format. Can we reference the data's original duration and use that as sort?
                cellClick:function(e, cell){console.log("cell click")}
            },
            {
                title:"date_played",
                field:"date_played",
                sorter:"datetime",
                sorterParams: {
                    format: "MM/dd/yyyy h:mm:ss a",
                }
            },
            {
                title:"date_added",
                field:"date_added",
                sorter:"datetime",
                sorterParams: {
                    format: "MM/dd/yyyy h:mm:ss a",
                }
            }
        ],
        index: 'id',
        data: libraryDataView,
        //reactiveData: true,
        maxHeight: 590,
        layout:"fitColumns",
        //selectableRows: 1,
        //progressiveRender:true,
        //progressiveLoad:"scroll"
    });

    window['table'] = table;


    table.on('rowDblClick', (e, row) => {
        const id = row.getIndex();
        const data = table.getRow(id).getData();
        App.clickedSong(data);
    });

    table.on('dataSorted', () => {
        tableUpdated();
    });

    table.on('dataFiltered', () => {
        tableUpdated();
    });

    LibraryController.EE.on('libraryUpdated', onLibraryUpdated, this);
};

const onLibraryUpdated = () => {
    let libraryDataView = LibraryController.GetDataView();
    table.setData(libraryDataView);
    tableUpdated();
};

const setActiveSong = (id) => {
    if (activeId >= 0) {
        const oldRow = table.getRow(activeId);
        if (oldRow) {
            oldRow.getElement().classList.remove('ActiveSong');
        }
    }

    activeId = id;

    const newRow = table.getRow(activeId);
    if (newRow) {
        newRow.getElement().classList.add('ActiveSong');
    }
};

const filterText = (e) => {
    const text = e.target.value;
    LibraryController.filterText(text);

    let libraryDataView = LibraryController.GetDataView();
    table.setData(libraryDataView);
    tableUpdated();
};

const filterSort = (filterType) => {
    LibraryController.filterSort(filterType);

    let libraryDataView = LibraryController.GetDataView();
    table.setData(libraryDataView);
    tableUpdated();
};

let scrollingToRowPending = null;
async function queueScrollToRow(row) {
    if (scrollingToRowPending) {
        clearTimeout(scrollingToRowPending);
    }

    scrollingToRowPending = setTimeout(async function(){
        try {
            await table.scrollToRow(row);
            clearTimeout(scrollingToRowPending);
        } catch(e) {
            queueScrollToRow(row);
        }
    }, 100);
};

const tableUpdated = () => {

    if (activeId >= 0) {
        let row = table.getRow(activeId);
        if (row) {
            row.getElement().classList.add('ActiveSong');

            // FIXME: For some reason if we fire this immediately doesn't work sometimes
            queueScrollToRow(row);
        }
    }
};

</script>

MEDIA PLAYLIST
<input type='text' id='libraryTextFilter' on:input={filterText} />

<!--
<table id='libraryContainer'>
<thead>
    <tr>
        <th id='libraryColTitle' on:click={() => filterSort(LibraryController.SORT_TITLE)}>Song Name</th>
        <th id='libraryColTitle'>Play Count</th>
        <th id='libraryColTitle'>Length</th>
    </tr>
</thead>
<tbody id='library'>
</tbody>
</table>
-->


<div id='libraryContainer'>
    <div id='libraryCols'>
        <span id='libraryColTitle' on:click={() => filterSort(LibraryController.SORT_TITLE)}>Song Name</span>
        <span id='libraryColPlayCount'>Play Count</span>
        <span id='libraryColLength'>Length</span>
    </div>
</div>
<div id='library'></div>

<style>
#library {
}

#libraryCols {
display: flex;
}

#libraryColTitle {
width: 400px;
}

:global(.song) {
display: flex;
}

:global(.songTitle) {
width: 400px;
}

:global(.songPlayCount) {

}

:global(.ActiveSong) {
    color: red;
}

:global(.tabulator-row.tabulator-selected) {
    color: red;
}

:global(.tabulator-cell) {
    user-select: none; /* FIXME: not working, it still selects */
}
</style>

