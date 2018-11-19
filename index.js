const http = require('http');
const fs = require('fs');
const path = require('path');

const basePath = `${__dirname}/public`;

// https://stackoverflow.com/questions/28061080/node-itself-can-serve-static-files-without-express-or-any-other-module
const httpServer = http.createServer(function(req, res) {
    let url = req.url;
    if (url.endsWith('/')) {
      url += 'index.html';
    }

    const stream = fs.createReadStream(path.join(basePath, url));
    stream.on('error', function() {
        res.writeHead(404);
        res.end();
    });
    stream.pipe(res);
});

const port = parseInt(process.env.PORT) || 8080;
httpServer.listen(port);