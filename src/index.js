'use strict';

const fs = require('fs');
const axios = require('axios').default;
const https = require('https');
const throttle_requests = require('./throttle-requests');
const write_to_stream = require('./write-to-stream');
const zlib = require("zlib");
const sleep = require('./sleep');

const may_has_body_methods = ['post', 'put', 'delete', 'patch'];

/**
 * 
 * @param {*} options axios options + local_filepath and throttle
 * @param {*} tries how many reties if 429 and >=500 response
 * @returns null or response 
 */
async function http_client(options, tries = 3) {

    const method = options.method ? options.method.toLowerCase() : 'get';

    if (may_has_body_methods.includes(method) &&
        !options.maxContentLength && !options.maxBodyLength) {
        options.maxContentLength = 16777216 * 2;  // 32M
        options.maxBodyLength = 16777216 * 2;
    }

    if (!options.timeout) {
        options.timeout = 60000 * 3; // 3 minutes
    }

    if (!options.httpsAgent) {
        options.httpsAgent = new https.Agent({rejectUnauthorized: false});
    }

    // prepare 
    //
    let get_local_filepath;
    if (options.local_filepath) {
        if (method === 'get') {
            if (!options.headers) {
                options.headers = {};
            }
            if (!options.headers.accept || !options.headers.Accept) {
                options.headers.accept = '*/*';
            }
            options.responseType = 'stream';
            get_local_filepath = options.local_filepath;
        } else if (!options.data && may_has_body_methods.includes(method)) {
            options.data = fs.readFileSync(options.local_filepath);
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
    if (options.zip) {
        if (!options.headers) {
            options.headers = {};
        }
        options.headers['Accept-Encoding'] = 'gzip';
        if (options.data && may_has_body_methods.includes(method)) {
            if (typeof options.data === 'object' && !Buffer.isBuffer(options.data)) {
                options.data = JSON.stringify(options.data);
                options.headers['Content-Type'] = 'application/json';
            }
            options.data = await gzip(options.data);
            options.headers['Content-Length'] = options.data.length;
            options.headers['Content-Encoding'] = 'gzip';   
        }
        delete options.zip;
    }

    // throttle per second max calls
    //
    const throttle = options.throttle ? options.throttle : 30;
    await throttle_requests(options.url, throttle);

    // try multiple times
    //
    for (let i = 1; i <= tries; i++) {
         try {
            const response = await axios(options);
            if (response) {
                // write to stream to download file
                if (get_local_filepath) {
                    if (response.data) {
                        const writer = fs.createWriteStream(get_local_filepath);
                        response.data.pipe(writer);
                        await write_to_stream(writer, options.url);
                        delete response.data;
                    } else {
                        console.error('http_client get empty stream for ' + options.url);
                    }
                    return response
                } else {
                    return response;
                }
            } else {
                console.error('http_client get empty response for ' + options.url);
                return null;
            }
        } catch(err) {
            if (err.response) {
                // retry util end of the loop for 429
                if (err.response.status === 429) { 
                    process.stdout.write('*');
                    await sleep(1000 * (i * i));
                // retry 3 times for 408 and >= 500
                } else if ((err.response.status === 408 || err.response.status >= 500) && i <= 3) {
                    process.stdout.write('#');
                    await sleep(1000 * (i * i));
                } else {
                    return err.response;
                }
            } else {
                console.error(`http_client caught ${err.message} for ${options.url}`);
                break;
            }
        }
    }
    console.error(`http_client, failed request for ${options.url}`);
    return null;
}

function gzip(data) {
    return new Promise(resolve => {
        zlib.gzip(data, (err, buffer) => {
            if (!err) {
                resolve(buffer);
            } else {
                console.log(err);
                resolve(null);
            }
        });
    });
}

module.exports = http_client;