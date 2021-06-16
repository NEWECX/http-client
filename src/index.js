'use strict';

const { readFileSync, createWriteStream } = require('fs');
const axios = require('axios').default;
const https = require('https');
const throttle_requests = require('./throttle-requests');
const write_to_stream = require('./write-to-stream');
const sleep = require('./sleep');

/**
 * 
 * @param {*} options axios options + local_filepath and throttle
 * @param {*} tries how many reties if 429 and >=500 response
 * @returns null or response 
 */
async function http_client(options, tries = 3) {

    options = {...options};

    if (!options.maxContentLength && !options.maxBodyLength) {

        options.maxContentLength = 16777216;  // 16M
        options.maxBodyLength = 16777216;
    
    }

    if (!options.timeout) {

        options.timeout = 60000 // 1 minute

    }

    if (!options.httpsAgent) {

        options.httpsAgent = new https.Agent({rejectUnauthorized: false});

    }

    // prepare 
    //
    let writer = null;

    if (options.local_filepath) {

        const method = options.method ? options.method.toLowerCase() : 'get';

        if (method === 'get') {

            if (!options.headers) {
                options.headers = {};
            }
            if (!options.headers.accept || !options.headers.Accept) {
                options.headers.accept = '*/*';
            }
            options.responseType = 'stream';
            writer = createWriteStream(options.local_filepath);

        } else if (method === 'post' && !options.data) {

            const data = readFileSync(options.local_filepath);
            options.data = data;

        }

        delete options.local_filepath;

    } else {

        if (!options.headers) {
            options.headers = {};
        }

        if (!options.headers.accept || !options.headers.Accept) {
            options.headers.accept = 'application/json';
        }

    }

    // throttle per second max calls
    //
    let throttle = 30;
    if (options.throttle) {
        throttle = options.throttle;
        delete options.throttle;
    }

    await throttle_requests(options.url, throttle);

    // try multiple times
    //
    for (let i = 1; i <= tries; i++) {

         try {

            const response = await axios(options);

            if (response) {

                // write to stream to download file
                //
                if (writer) {

                    if (response.data) {

                        response.data.pipe(writer);
                        await write_to_stream(writer, options.url);
                        delete response.data;

                    } else {

                        console.log('ERROR: http_client get empty stream for ' + options.url);

                    }

                    return response

                } else {

                    return response;

                }
            } else {

                console.log('ERROR: http_client get empty response for ' + options.url);
                return null;

            }

        } catch(err) {

            if (err.response) {

                // retry util end of the loop for 429
                //
                if (err.response.status === 429) { 

                    await sleep(1000 * (i * i));

                // retry 3 times for >= 500
                //
                } else if (err.response.status >= 500 && i <= 3) {

                    await sleep(1000 * (i * i));

                } else {

                    return err.response;

                }

            } else {

                console.log(`ERROR: http_client caught ${err.message} for ${options.url}`);
                break;

            }
        }
    }

    console.log(`ERROR: http_client, failed request for ${options.url}`);
    
    return null;
}

module.exports = http_client;