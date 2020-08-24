const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const Polka = require('polka');
const jimp = require('jimp');
const log = require('npmlog');

const dataFiles = {
    lastFrame: path.join(__dirname, 'data', 'lastFrame.jpg'),
    witsVideo: path.join(__dirname, 'data', 'witsVideo.mkv'),
    witsAudio: path.join(__dirname, 'data', 'witsAudio.mp4'),
    customFont: path.join(
        __dirname,
        'data',
        'font',
        'Spongeboytt2Regular-ALLjx.ttf.fnt'
    ),
};

const polka = Polka();
const spongebobFont = jimp.loadFont(dataFiles.customFont);
const sansSerifFont = jimp.loadFont(jimp.FONT_SANS_32_WHITE);
const workDir = path.join(os.tmpdir(), 'battle-of-wits');

const sh = async (command) => {
    return new Promise((resolve, reject) => {
        exec(command, (err, stdout, stderr) => {
            if (err) {
                reject(err);
            } else {
                resolve({ stdout, stderr });
            }
        });
    });
};

// Good enough randomness, not like we're storing extremely sensitive data here
// Mostly just to prevent collisions
const idRandomLength = 9;
const digits = '1234567890'.split('');
let incrementor = 0;
const idGen = () => {
    let randomPart = '';
    for (let i = 0; i < idRandomLength; i += 1) {
        const index = Math.floor(Math.random() * digits.length);
        randomPart += digits[index];
    }
    const outString = `${Date.now()}${randomPart}${incrementor}`;
    incrementor += 1;
    return outString;
};

const drawText = async (image, ipAddress) => {
    // not too proud of you prettier...
    image.print(
        await spongebobFont,
        0,
        0,
        {
            text: ipAddress,
            alignmentX: jimp.HORIZONTAL_ALIGN_CENTER,
            alignmentY: jimp.VERTICAL_ALIGN_MIDDLE,
        },
        1920,
        1080
    );
    image.print(
        await sansSerifFont,
        0,
        0,
        {
            text: 'adryd.co/wits.mp4',
            alignmentX: jimp.HORIZONTAL_ALIGN_RIGHT,
            alignmentY: jimp.VERTICAL_ALIGN_BOTTOM,
        },
        1450,
        1000
    );
    image.print(
        await sansSerifFont,
        0,
        0,
        {
            text: 'check your actual ip address :)',
            alignmentX: jimp.HORIZONTAL_ALIGN_RIGHT,
            alignmentY: jimp.VERTICAL_ALIGN_BOTTOM,
        },
        1450,
        960
    );
    return image;
};

polka.get('/wits.mp4', async (req, res) => {
    const ipAddress = req.headers['x-real-ip'];
    const requestId = idGen();
    if (!req.headers['user-agent']) {
        res.statusCode = 400;
        res.end('no user-agent provided');
    }
    log.http('/wits.mp4', requestId, 'New request');
    const fileNames = {
        lastFrame: path.join(workDir, `${requestId}_lastFrame.png`),
        imageMkv: path.join(workDir, `${requestId}_imageMkv.mkv`),
        merge: path.join(workDir, `${requestId}_merge.txt`),
        done: path.join(workDir, `${requestId}.mp4`),
    };
    // prevent video from embedding in Discord, so people have to click the link.
    if (
        req.headers['user-agent'] ===
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.10; rv:38.0) Gecko/20100101 Firefox/38.0' ||
        req.headers['user-agent'].includes('Discordbot') ||
        req.headers['cf-worker']
    ) {
        log.http('/wits.mp4', requestId, 'Blocked Discord');
        res.statusCode = 403;
        res.end();
        return;
    }
    let image = await jimp.read(dataFiles.lastFrame);
    log.http('/wits.mp4', requestId, 'Loaded image');
    image = await drawText(image, ipAddress);
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
    await sh(
        `ffmpeg -safe 0 -f concat -i ${fileNames.merge} -i ${dataFiles.witsAudio} -map 0:v -map 1:a -c:v libx264 -preset superfast -crf 22 -c:a aac -movflags +faststart ${fileNames.done} -y`
    );
    log.http('/wits.mp4', requestId, 'Rendered final video');
    res.statusCode = 302;
    const scheme = req.headers['x-forwarded-proto'];
    const host = req.headers['x-forwarded-host'];
    res.setHeader('location', `${scheme}://${host}/wits.mp4/${requestId}.mp4`);
    res.end();
    log.http('/wits.mp4', requestId, 'Sent redirect');
    Object.entries(fileNames).forEach((value) => {
        if (value[0] !== 'done') {
            fs.promises.unlink(value[1]);
        }
    });
    log.http('/wits.mp4', requestId, 'Deleted render files');
    setTimeout(() => {
        fs.promises.unlink(fileNames.done);
        log.http('/wits.mp4', requestId, 'Deleted final video');
    }, 1000 * 60);
});
// Wait for fonts and such to be loaded before accepting
// http requests
(async () => {
    await spongebobFont;
    await sansSerifFont;
    try {
        log.silly('init', 'creating work dir');
        await fs.promises.mkdir(workDir);
    } catch (e) {
        log.verbose('init', 'workDir already exists, no need to create it');
    }
    polka.listen(6970);
    log.info('init', 'Ready to outwit!');
})();
