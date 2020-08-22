const fs = require('fs');
const path = require('path');
const Polka = require('polka');
const send = require('@polka/send-type');
const jimp = require('jimp');
const { exec } = require('child_process');

const polka = Polka();
const image = jimp.read(path.join(__dirname, 'blank.jpg'));
const font = jimp.loadFont(
    path.join(__dirname, 'font', 'Spongeboytt2Regular-ALLjx.ttf.fnt')
);
const font2 = jimp.loadFont(
    jimp.FONT_SANS_32_WHITE
)
const baseDir = '/tmp/battleOfWits/wits.mp4'

async function sh(cmd) {
    return new Promise(function (resolve, reject) {
        exec(cmd, (err, stdout, stderr) => {
            if (err) {
                reject(err);
            } else {
                resolve({ stdout, stderr });
            }
        });
    });
}

polka.get('wits.mp4', async (req, res) => {
    if (req.headers['user-agent'] === "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.10; rv:38.0) Gecko/20100101 Firefox/38.0") {
    //    if (req.headers['cf-worker']) {
        // let it load forever
        console.log('Discord Media Proxy was here')
        console.log(req.headers);
        // res.statusCode = 302;
        // res.setHeader('Location', `https://cdn.discordapp.com/attachments/353018352580689930/746452639566528662/spark.png`);
        res.end()
        return;
    }
    
    const randPrefix = `${Date.now()}${Math.floor(Math.random() * 99999)}`;
    const files = {
        lastFrame: path.join(baseDir, `${randPrefix}_lastFrame.png`),
        imageMkv: path.join(baseDir, `${randPrefix}_imageMkv.mkv`),
        merge: path.join(baseDir, `${randPrefix}_merge.txt`),
        done: path.join(baseDir, `${randPrefix}.mp4`),
    };
    const modImage = await jimp.read(path.join(__dirname, 'blank.jpg'));
    modImage.print(
        await font,
        0,
        0,
        {   
            text: req.headers['x-real-ip'],
            alignmentX: jimp.HORIZONTAL_ALIGN_CENTER,
            alignmentY: jimp.VERTICAL_ALIGN_MIDDLE,
        },
        1920,
        1080
    );
    modImage.print(
        await font2,
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
    modImage.print(
        await font2,
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
    modImage.write(files.lastFrame);

    await fs.promises.writeFile(
        files.merge,
        `file '/opt/battleOfWits/wits.mkv'\nfile '${randPrefix}_imageMkv.mkv'`
    );
    await sh(
        `ffmpeg -loop 1 -i ${files.lastFrame} -c:v libx264 -t 1 -pix_fmt yuv420p -vf scale=1920:1080 ${files.imageMkv} &&
         ffmpeg -safe 0 -f concat -i ${files.merge} -i wits_audio.mp4 -map 0:v -map 1:a -c:v libx264 -preset superfast -crf 22 -c:a aac -movflags +faststart ${files.done} -y`
    ).then(async () => {
        let ua = ''
        if (req.headers["user-agent"] === "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.10; rv:38.0) Gecko/20100101 Firefox/38.0") {
            ua = 'DiscordMediaProxy'
        } else {
            ua = req.headers["user-agent"]
        }
        console.log(`${ua}`)
        res.setHeader('X-Special-Thanks-To', 'github.com/mstrodl, helping with ffmpeg');
        res.statusCode = 302;
        res.setHeader('Location', `https://adryd.co/wits.mp4/${randPrefix}.mp4`)
        res.end()
        setTimeout(() => {
            Object.entries(files).forEach((value) =>
                fs.promises.unlink(value[1])
            );
        }, 1000*60);
    });
});

(async () => {
    await image;
    await font;
    await font2
    try {
        await fs.promises.mkdir('/tmp/battleOfWits')
        await fs.promises.mkdir('/tmp/battleOfWits/wits.mp4')
    } catch (e) {
        console.log('tmp exists')
    }
    polka.listen(6970);
    console.log('Ready!');
})();
