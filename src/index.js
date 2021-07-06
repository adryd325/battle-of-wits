const fs = require('fs');
const Polka = require('polka');
const log = require('npmlog');
const crypto = require('crypto');

const generateId = require('./tinyIdGen');
const render = require('./render');
const { loadFonts } = require('./drawText');
const { workDir } = require('./constants');

const polka = Polka();

const activeRenders = {};
const salt = 'ajdfkadsfdashkfadskfyoahvyfohsjdakjfidlsdfaoidsahvoeorv';
const twitterEmbed = fs.promises.readFile(
    `${__dirname}/../data/wits.html`,
    'utf-8'
);

const send = async (req, res, path, requestId, type) => {
    res.setHeader('Content-Type', `video/${type}`);
    let stat;
    try {
        stat = await fs.promises.stat(path);
    } catch (error) {
        log.error('/wits.mp4', error);
        res.statusCode = 500;
        res.end('Error while serving video');
        return;
    }
    if (req.headers.range) {
        try {
            const parts = req.headers.range.replace(/bytes=/, '').split('-');
            const partStart = parseInt(parts[0], 10);
            const partEnd = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
            const chunkSize = partEnd - partStart + 1;
            res.statusCode = 206;
            log.http(
                '/wits.mp4',
                requestId,
                `Serving multipart file; Start: ${partStart} End: ${partEnd}, Size: ${stat.size}, Chunk Size: ${chunkSize}`
            );
            res.setHeader('Accept-Ranges', 'bytes');
            res.setHeader(
                'Content-Range',
                `bytes ${partStart}-${partEnd}/${stat.size}`
            );
            res.setHeader('Content-Length', chunkSize);
            fs.createReadStream(path, {
                start: partStart,
                end: partEnd + 1,
            }).pipe(res);
        } catch (error) {
            log.error('/wits.mp4', error);
            res.statusCode = 500;
            res.end('Error while serving multipart video');
        }
    } else {
        fs.createReadStream(path).pipe(res);
    }
};

const handleRequest = async (req, res, type) => {
    const ipAddress = req.headers['x-wits-custom'] ?? req.headers['x-real-ip'];
    const cacheId = `${ipAddress}${type}`;
    const anonIp = crypto
        .createHash('md5')
        .update(ipAddress + salt)
        .digest('base64');
    const requestId = generateId();
    let oldRequestId;
    let file;

    log.http('/wits.mp4', `UA: ${req.headers['user-agent']}`);
    log.http('/wits.mp4', `IP: ${anonIp}`);
    log.http('/wits.mp4', `EXT: ${type}`);

    log.http('/wits.mp4', requestId, `New request`);
    if (ipAddress === undefined) {
        res.status = 400;
        res.end(
            'No X-Real-IP header was set. Is battle-of-wits not running behind a proxy?'
        );
        log.warn(
            '/wits.mp4',
            requestId,
            'Dropped request: No IP header was set'
        );
        return;
    }
    if (
        req.headers['user-agent'] ===
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.10; rv:38.0) Gecko/20100101 Firefox/38.0' ||
        req.headers['user-agent'].includes('Discordbot')
    ) {
        log.http('/wits.mp4', requestId, 'Dropped request: Discord embed');
        return;
    }
    if (req.headers['user-agent'] === 'Twitterbot/1.0') {
        log.http('/wits.mp4', requestId, 'Sending embed html');

        const data = await twitterEmbed;
        res.setHeader('content-type', 'text/html');
        res.statusCode = 200;
        res.end(data);
        return;
    }
    if (
        !req.headers['user-agent'] ||
        req.headers['user-agent'].toLowerCase().includes('bot') ||
        req.headers['user-agent'].toLowerCase().includes('embed') ||
        req.headers['user-agent'].toLowerCase().includes('crawl') ||
        req.headers['user-agent'].toLowerCase().includes('spider') ||
        req.headers['user-agent'].toLowerCase().includes('scrape') ||
        req.headers['user-agent'].toLowerCase().includes('archive')
    ) {
        res.statusCode = 403;
        res.end();
        log.http(
            '/wits.mp4',
            requestId,
            'Dropped request: Bot that doesnt fucking obey robots.txt'
        );
        return;
    }
    if (Object.prototype.hasOwnProperty.call(activeRenders, cacheId)) {
        const previousRender = activeRenders[cacheId];
        oldRequestId = previousRender.requestId;
        log.http(
            '/wits.mp4',
            requestId,
            'Previous render availible, referring to',
            oldRequestId
        );
        file = previousRender.file;

        // reset deletion timer
        clearTimeout(previousRender.deleteTimer);
        log.http('/wits.mp4', requestId, 'Delaying deletion for', oldRequestId);
        activeRenders[cacheId].deleteTimer = setTimeout(() => {
            delete activeRenders[cacheId];
            fs.promises.unlink(file);
            log.http('/wits.mp4', oldRequestId, 'Deleted final video');
            // having a 2nd request likely means a real person is cusing wits
        }, 1000 * 60 * 10);
    } else {
        file = await render(requestId, ipAddress, req.headers, type);

        const deleteTimer = setTimeout(() => {
            delete activeRenders[cacheId];
            fs.promises.unlink(file);
            log.http('/wits.mp4', requestId, 'Deleted final video');
        }, 1000 * 60);

        activeRenders[cacheId] = {
            deleteTimer,
            requestId,
            file,
        };
    }
    res.statusCode = 200;
    res.setHeader('X-Wits-Request-Id', requestId);
    if (oldRequestId !== undefined) {
        res.setHeader('X-Wits-Ref-Request-Id', oldRequestId);
    }
    send(req, res, file, requestId, type);
};

polka.get('/wits.mp4', (req, res) => {
    handleRequest(req, res, 'mp4');
});

polka.get('/wits.webm', (req, res) => {
    handleRequest(req, res, 'webm');
});

// Wait for fonts and such to be loaded before accepting
// http requests
(async () => {
    await loadFonts();
    try {
        log.silly('init', 'creating work dir');
        await fs.promises.mkdir(workDir);
    } catch (e) {
        log.verbose('init', 'workDir already exists, no need to create it');
    }
    polka.listen(7777);
    log.info('init', 'Ready to outwit!');
})();
