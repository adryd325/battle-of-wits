const fs = require('fs');
const path = require('path');
const jimp = require('jimp');
const log = require('npmlog');
const sh = require('./sh');
const { drawText } = require('./drawText');

const { dataFiles, workDir } = require('./constants');

const render = async (requestId, ipAddress, headers, type) => {
    const geoIpElements = [];
    if (headers['x-geoip-city'] && headers['x-geoip-accuracy-radius'] <= 5) {
        geoIpElements.push(headers['x-geoip-city']);
    }
    if (
        headers['x-geoip-region-name'] &&
        headers['x-geoip-accuracy-radius'] <= 50
    ) {
        geoIpElements.push(headers['x-geoip-region-name']);
    }
    if (
        headers['x-geoip-country-name'] &&
        headers['x-geoip-accuracy-radius'] <= 200
    ) {
        geoIpElements.push(headers['x-geoip-country-name']);
    }
    const geoIpString = geoIpElements.join(', ');
    const fileNames = {
        lastFrame: path.join(workDir, `${requestId}_lastFrame.png`),
        imageMkv: path.join(workDir, `${requestId}_imageMkv.mkv`),
        merge: path.join(workDir, `${requestId}_merge.txt`),
        done: path.join(workDir, `${requestId}.${type}`),
    };
    let image = await jimp.read(dataFiles.lastFrame);
    log.http('/wits.mp4', requestId, 'Loaded image');
    image = await drawText(image, ipAddress, geoIpString);
    log.http('/wits.mp4', requestId, 'Rendered image');
    image.write(fileNames.lastFrame);
    log.http('/wits.mp4', requestId, 'Written image');
    await fs.promises.writeFile(
        fileNames.merge,
        `file ${dataFiles.witsVideo}\nfile '${requestId}_imageMkv.mkv'`
    );
    log.http('/wits.mp4', requestId, 'Written ffmpeg merge file');
    await sh(
        `ffmpeg -loop 1 -i ${fileNames.lastFrame} -c:v libx264 -t 1 -pix_fmt yuv420p -vf scale=1920:1080 ${fileNames.imageMkv}`
    );
    log.http('/wits.mp4', requestId, 'Written rendered last frames');
    switch (type) {
        case 'webm':
            await sh(
                `ffmpeg -safe 0 -f concat -i ${fileNames.merge} -i ${dataFiles.witsAudio} -vcodec libvpx -cpu-used -5 -deadline realtime ${fileNames.done} -y`
            );
            break;
        default:
        case 'mp4':
            await sh(
                `ffmpeg -safe 0 -f concat -i ${fileNames.merge} -i ${dataFiles.witsAudio} -map 0:v -map 1:a -c:v libx264 -preset superfast -crf 22 -c:a aac -movflags +faststart ${fileNames.done} -y`
            );
            break;
    }
    log.http('/wits.mp4', requestId, 'Rendered final video');
    Object.entries(fileNames).forEach((value) => {
        if (value[0] !== 'done') {
            fs.promises.unlink(value[1]);
        }
    });
    log.http('/wits.mp4', requestId, 'Deleted render files');
    return fileNames.done;
};

module.exports = render;
