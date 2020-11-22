const os = require('os');
const path = require('path');

const rootDir = path.join(__dirname, '../');
const dataFiles = {
    lastFrame: path.join(rootDir, 'data', 'lastFrame.jpg'),
    witsVideo: path.join(rootDir, 'data', 'witsVideo.mkv'),
    witsAudio: path.join(rootDir, 'data', 'witsAudio.mp4'),
    customFont: path.join(
        rootDir,
        'data',
        'font',
        'Spongeboytt2Regular-ALLjx.ttf.fnt'
    ),
};

const workDir = path.join(os.tmpdir(), 'battle-of-wits');

module.exports = { dataFiles, workDir };
