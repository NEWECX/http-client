'use strict';

const sleep = require('./sleep');

let the_second;
let requests_of_the_second;

async function throttle_requests(url, max_per_second) {

    const second = Math.floor(Date.now() / 1000);
    if (second !== the_second) {
        the_second = second;
        requests_of_the_second = {};
    }

    const { host } = new URL(url)
    if (!requests_of_the_second[host]) {
        requests_of_the_second[host] = 1;
    } else {
        requests_of_the_second[host]++;
    }

    if (requests_of_the_second[host] > max_per_second) {
        console.log(`call to ${host} reached ${max_per_second} per second`);
        await sleep(1000);
    }
}

module.exports = throttle_requests;