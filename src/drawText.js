const jimp = require('jimp');

const { dataFiles } = require('./constants');

let spongebobFont;
let sansSerifBigFont;
let sansSerifFont;
let sansSerifSmallFont;
const loadFonts = async () => {
    spongebobFont = await jimp.loadFont(dataFiles.customFont);
    sansSerifBigFont = await jimp.loadFont(jimp.FONT_SANS_64_WHITE);
    sansSerifFont = await jimp.loadFont(jimp.FONT_SANS_32_WHITE);
    sansSerifSmallFont = await jimp.loadFont(jimp.FONT_SANS_16_WHITE);
};

const drawText = async (image, ipAddress, geoIpString) => {
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
        await sansSerifBigFont,
        0,
        130,
        {
            text: geoIpString,
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
    image.print(
        await sansSerifSmallFont,
        0,
        0,
        {
            text:
                'This product includes GeoLite2 data created by MaxMind, available from maxmind.com',
            alignmentX: jimp.HORIZONTAL_ALIGN_RIGHT,
            alignmentY: jimp.VERTICAL_ALIGN_BOTTOM,
        },
        1920,
        1080
    );
    return image;
};

module.exports = { drawText, loadFonts };
