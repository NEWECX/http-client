'use strict';

const os = require('os');
const fs = require('fs');
const node_path = require('path');
const http_client = require('../src')

// jest test/download.test.js 

describe('Test download-file', () => {

    it('test download-file', async () => {
        const local_filepath = node_path.join(os.tmpdir(), 'google.png');
        if (fs.existsSync(local_filepath)) {
            fs.unlinkSync(local_filepath);
        }
        const url = 'https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png';
        const options = {method: 'get', url, local_filepath};
        const response = await http_client(options);
        //console.log(response.headers);
        expect(response.status).toBe(200);
        expect(fs.existsSync(local_filepath)).toBe(true);
    });

    it('test download-file without zip', async () => {
        const local_filepath = node_path.join(os.tmpdir(), 'google.png');
        if (fs.existsSync(local_filepath)) {
            fs.unlinkSync(local_filepath);
        }
        const url = 'https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png';
        const options = {method: 'get', url, local_filepath, zip: false};
        const response = await http_client(options);
        expect(response.status).toBe(200);
        expect(fs.existsSync(local_filepath)).toBe(true);
    });

});