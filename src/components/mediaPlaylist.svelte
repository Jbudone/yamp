<script lang="ts">
import App, { appState } from '$lib/app.svelte';
import LibraryController from '$lib/libraryController.svelte';
import PlayerController from '$lib/playerController.svelte.ts';
import { TabulatorFull as Tabulator } from 'tabulator-tables';
import { DateTime } from 'luxon';
import { playerState } from '$lib/playerController.svelte';

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
                field:"name",
                sorter:"string",
                //formatter: (cell) => {
                //    if (cell.getValue().indexOf('ActiveSong') >= 0) {
                //        cell.getElement().classList.add('ActiveSong');
                //    }
                //}
            },
            {
                title:"Artist",
                width: 100,
                field:"artist",
                sorter:"string"
            },
            {
                title:"Plays",
                field:"playCount",
                sorter:"number",
                width: 60,
                hozAlign:"right",
                //formatter:"progress" // FIXME: consider progress bar? it sure looks cool but we still need the number
            },
            {
                title:"Duration",
                field:"duration",
                sorter:"number", // FIXME: duration was formatted to a string, but we want to sort by its int format. Can we reference the data's original duration and use that as sort?
                width: 50,
                cellClick:function(e, cell){console.log("cell click")}
            },
            {
                title:"Last Played",
                field:"datePlayed",
                sorter:"datetime",
                width: 160,
                sorterParams: {
                    format: "MM/dd/yyyy h:mm:ss a",
                }
            },
            {
                title:"Date Added",
                field:"dateAdded",
                sorter:"datetime",
                width: 160,
                sorterParams: {
                    format: "MM/dd/yyyy h:mm:ss a",
                }
            }
        ],
        index: 'songId',
        data: libraryDataView,
        //reactiveData: true,
        maxHeight: 390,
        //height: '100%',
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
    LibraryController.EE.on('libraryViewChanged', onLibraryUpdated, this);
    PlayerController.EE.on('clickedPlayWithNoSong', onClickedPlayWithNoSong, this);
};

const onLibraryUpdated = () => {
    let libraryDataView = LibraryController.GetDataView();
    table.setData(libraryDataView);
    tableUpdated();
};

const onClickedPlayWithNoSong = () => {

    let data = table.getData();
    if (data.length == 0) return;

    let row = table.getRow(data[0].id);
    table.selectRow(row);

    // FIXME: copy/paste of rowDblClick evt
    const id = row.getIndex();
    App.clickedSong(row.getData());
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

const filterSort = (filterType) => {
    LibraryController.filterSort(filterType);
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

import './tabulator_simple.css';
import './tabulator_josh.css';
</script>

<div id='mediaContainer' class='mx-8'>
<div id='library' class=''></div>
</div>

<style>


#library {
}

#libraryCols {
display: flex;
}

#libraryColTitle {
width: 400px;
}

:global {

}
</style>

