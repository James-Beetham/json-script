var http = require('http');

function onRequest(request, response) {
    response.writeHead(200, {'Content-Type': 'text/plain'});
    response.write('HELLO');
    response.end();

    
}

// listen on port 8000
http.createServer(onRequest).listen(8000);