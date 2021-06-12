'use strict';

function write_to_stream(writer, url) {

    return new Promise(resolve => {

        writer.on('finish', () => {

            resolve(true);

        });

        writer.on('error', err => {

            console.log(`ERROR: http_client write stream caught ${err.message} for ${url}`);
            writer.close();
            resolve(false);

        });
    });
}

module.exports = write_to_stream;