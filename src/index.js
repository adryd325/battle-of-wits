const fs = require('fs');
const Polka = require('polka');
const log = require('npmlog');

const generateId = require('./tinyIdGen');
const render = require('./render');
const { loadFonts } = require('./drawText');
const { workDir } = require('./constants');

const polka = Polka();

const activeRenders = {};

const send = async (req, res, path, requestId) => {
    res.setHeader('Content-Type', 'video/mp4');
    let stat;
    try {
        stat = await fs.promises.stat(path);
    } catch (error) {
        log.error('/wits.mp4', error);
        res.status = 500;
        res.end('Error while serving video');
        return;
    }
    if (req.headers.range) {
        try {
            const parts = req.headers.range.replace(/bytes=/, '').split('-');
            const partStart = parseInt(parts[0], 10);
            const partEnd = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
            const chunkSize = partEnd - partStart + 1;
            res.status = 206;
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
            res.status = 500;
            res.end('Error while serving multipart video');
        }
    } else {
        fs.createReadStream(path).pipe(res);
    }
};

polka.get('/wits.mp4', async (req, res) => {
    const ipAddress = req.headers['x-real-ip'];
    const requestId = generateId();
    let oldRequestId;
    let file;

    log.http('/wits.mp4', requestId, `New request from ${ipAddress}`);
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

    if (Object.prototype.hasOwnProperty.call(activeRenders, ipAddress)) {
        const previousRender = activeRenders[ipAddress];
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
        activeRenders[ipAddress].deleteTimer = setTimeout(() => {
            delete activeRenders[ipAddress];
            fs.promises.unlink(file);
            log.http('/wits.mp4', oldRequestId, 'Deleted final video');
            // having a 2nd request likely means a real person is cusing wits
        }, 1000 * 60 * 10);
    } else {
        file = await render(requestId, ipAddress, req.headers);

        const deleteTimer = setTimeout(() => {
            delete activeRenders[ipAddress];
            fs.promises.unlink(file);
            log.http('/wits.mp4', requestId, 'Deleted final video');
        }, 1000 * 60);

        activeRenders[ipAddress] = {
            deleteTimer,
            requestId,
            file,
        };
    }
    res.setHeader('X-Wits-Request-Id', requestId);
    if (oldRequestId !== undefined) {
        res.setHeader('X-Wits-Ref-Request-Id', oldRequestId);
    }
    send(req, res, file, requestId);
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
