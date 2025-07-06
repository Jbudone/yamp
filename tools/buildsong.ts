import { execFile, execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import mysql from 'mysql';
import https from 'https';
import 'dotenv/config';

// FIXME:
//  - we encoded using 192k but that doesn't take into account the quality of the input source; we should re-import sometime and check the source
//      quality so that we match that eg. input is 128kbps then use that, if its 256kbps then use that

const BUNNYCDN = {
    HOSTNAME: process.env.BUNNYCDN_HOSTNAME!,
    STORAGE_ZONE_NAME: process.env.BUNNYCDN_STORAGE_ZONE_NAME!,
    ACCESS_KEY: process.env.BUNNYCDN_ACCESS_KEY!
};

const DB = {
    HOST: process.env.DATABASE_HOST!,
    USER: process.env.DATABASE_USER!,
    PASSWORD: process.env.DATABASE_PASSWORD!,
    DATABASE: process.env.DATABASE_DB!,
};



function getMediaInfo(filePath) {

   //"format": {
   //     "filename": "josh.mp3",
   //     "nb_streams": 1,
   //     "nb_programs": 0,
   //     "nb_stream_groups": 0,
   //     "format_name": "mp3",
   //     "format_long_name": "MP2/3 (MPEG audio layer 2/3)",
   //     "start_time": "0.000000",
   //     "duration": "228.127313",
   //     "size": "3650037",
   //     "bit_rate": "127999",
   //     "probe_score": 51
   // }

    return new Promise((resolve, reject) => {
        const ffprobeArgs = [
            '-v', 'quiet',
            '-print_format', 'json',
            '-show_format',
            '-show_streams',
            filePath
        ];

        execFile('ffprobe', ffprobeArgs, (error, stdout, stderr) => {
            if (error) {
                reject(new Error(`FFprobe error: ${error.message}`));
                return;
            }

            try {
                const metadata = JSON.parse(stdout);
                resolve(metadata);
            } catch (parseError) {
                reject(new Error(`Failed to parse FFprobe output: ${parseError.message}`));
            }
        });
    });
};

function dashConvert(filePath) {
    return new Promise((resolve, reject) => {

        const tmpDir = execSync('mktemp -d /dev/shm/ffmpeg_XXXXXX', { encoding: 'utf8' }).replace('\n', '');

        const ffmpegArgs = [
            '-i', filePath, 
            '-vn', '-c:a', 'aac', '-b:a', '192k',
            '-f', 'dash', '-seg_duration', '4',
            '-use_template', '1', '-use_timeline', '1',
            `${tmpDir}/manifest.mpd`
        ];

        execFile('ffmpeg', ffmpegArgs, (error, stdout, stderr) => {
            if (error) {
                console.log(stderr);
                throw new Error(`FFmpeg error: ${error.message}`);
                reject();
                return;
            }

            try {
                //console.log(stdout);
                //console.log(stderr);
                resolve(tmpDir);
            } catch (parseError) {
                reject(new Error(`Failed to parse FFmpeg output: ${parseError.message}`));
            }
        });
    });
};

async function uploadToCDN(options) {

    const { dashPath, songID } = options;
    if (!dashPath || !songID) throw "missing options";

    const outputFolder = `song_${songID}`;
    const files = fs.readdirSync(dashPath);
    for (let i = 0; i < files.length; ++i) {

        const fileName = files[i],
            inputPath = path.join(dashPath, fileName),
            outputPath = `${outputFolder}/${fileName}`;
        const readStream = fs.createReadStream(inputPath);

        const options = {
            method: 'PUT',
            host: BUNNYCDN.HOSTNAME,
            path: `/${BUNNYCDN.STORAGE_ZONE_NAME}/${outputPath}`,
            headers: {
                AccessKey: BUNNYCDN.ACCESS_KEY,
                'Content-Type': 'application/octet-stream',
            },
        };

        await (new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {

                let data = '';
                res.on('data', (chunk) => {
                    data += chunk.toString('utf8');
                });

                res.on('end', () => {
                    if (res.statusCode != 201) {
                        throw new Error("Failed to upload to CDN");
                        reject();
                    }

                    resolve(outputPath);
                });
            });

            req.on('error', (error) => {
                console.error(error);
                throw new Error(error);
                reject();
            });

            readStream.pipe(req);
        }));
    }

    return outputFolder;
};



async function getDBLastSongID() {
    return (new Promise((resolve, reject) => {
        db.query("SELECT AUTO_INCREMENT AS id FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'songs'", (err, result) => {
            if (err) throw err;
            resolve(result[0]['id']);
        });
    }));
};

function epochToMysqlTimestamp(epochTime) {
    const formattedTime = new Date(epochTime * 1000).toISOString().slice(0, 19).replace('T', ' ');
    return formattedTime;
}

async function addDBSong(song) {


// "Uri": "file:///home/jbud/Music/Unknown%20Artist/Unknown%20Album/$DOPE%20MIX%20III$.mp3",
// "Title": "$DOPE MIX III$",
// "PlayCount": 2,
// "LastPlayedStamp": 1358574331,
// "DateAddedStamp": 1148792306,
// "DateUpdatedStamp": 1361606728,
// "Artist": null

    let sql = "INSERT INTO `songs` ( date_added, date_updated, date_played, filepath, cdnpath, duration, play_count, song_name, song_artist, song_album, metadata ) VALUES ?";
    let values = [[
        epochToMysqlTimestamp(song.DateAddedStamp),
        epochToMysqlTimestamp(song.DateUpdatedStamp),
        epochToMysqlTimestamp(song.LastPlayedStamp),
        song.filepath,
        song.CDNPath,
        song.metadata.format.duration,
        song.PlayCount,
        song.Title,
        song.Artist ?? "",
        "",
        JSON.stringify(song.metadata)
    ]];
    await (new Promise((resolve, reject) => {
        db.query(sql, [values], function (err, result) {
            if (err) throw err;
            resolve(result[0]);
        });
    }));
};

let db = mysql.createConnection({
    host: DB.HOST,
    user: DB.USER,
    password: DB.PASSWORD,
    database: DB.DATABASE
});

db.connect(function(err) {
    if (err) throw err;
    console.log("Connected!");
});

const bansheeListRaw = fs.readFileSync('banshee.json', 'utf8');
const bansheeList = JSON.parse(bansheeListRaw);

async function buildSong(songJson) {
    songJson.filepath = decodeURIComponent(songJson.Uri).replace('file://', '');//.replace(/ /g, '\\ ');
    if (!fs.existsSync(songJson.filepath)) throw `"${songJson.filepath}" not found`;
    songJson.id = await getDBLastSongID();

    const json = await getMediaInfo(songJson.filepath);
    songJson.metadata = json;

    const tmpDir = await dashConvert(songJson.filepath);

    const CDNPath = await uploadToCDN({ dashPath: tmpDir, songID: songJson.id });
    songJson.CDNPath = CDNPath;

    await addDBSong(songJson);

    execSync(`rm -r ${tmpDir}`);
    fs.writeFileSync('banshee.json', JSON.stringify(bansheeList, null, 2));

    console.log(`Pushed ${songJson.CDNPath}: ${songJson.filepath}`);
};

for (let i = 0; i < 1000; ++i) {
    const songJson = bansheeList.shift();
    await buildSong(songJson);
}

db.end();
