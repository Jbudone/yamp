import config from '$lib/config';
import { DateTime } from 'luxon';

export function formatTime(t) {

    const seconds = Math.floor(t % 60),
        minutes = Math.floor(t / 60) % 60,
        hours = Math.floor(t / (60 * 60));

    const formattedHours = (hours > 0) ? (hours + ':') : '',
        formattedMinutes = (minutes > 0) ?
        ((hours > 0) ? (String(minutes).padStart(2, '0') + ':') : (minutes + ':')) : '0:',
    formattedSeconds = String(seconds).padStart(2, '0');

    let formatted = formattedHours + formattedMinutes + formattedSeconds;
    return formatted;
};

//export default LibraryController.Instance;
