# A Scalable HTTP Client with Retries and Throttle Features

How to install

    npm install @ritani/http-client

How to use

    const http_client = require('@ritani/http-client);

    const url = 'https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png';
    const options = {method: 'get', url, local_filepath};
    const response = await http_client(options);
    console.log('response status', response.status);