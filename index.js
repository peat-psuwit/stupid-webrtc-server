const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const socketio = require('socket.io');

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

const socketMap = {};

const io = socketio(httpServer);

io.on('connection', (socket) => {
  let selfId;
  do {
    selfId = crypto.randomBytes(6).toString('base64');
  } while (socketMap[selfId]);

  socketMap[selfId] = socket;
  socket.emit('connected', { selfId });
  console.log(`Connected: ${selfId}`);

  socket.on('disconnect', () => {
    console.log(`Disconnected: ${selfId}`);
    socket[selfId] = undefined;
  });

  socket.on('call', ({ calleeId, sdp }) => {
    console.log(`${selfId} call ${calleeId}`);

    const callee = socketMap[calleeId];

    if (!callee) {
      socket.emit('failure', { error: 'No callee' });
      return;
    }

    callee.emit('ring', { callerId: selfId, sdp });
  });

  socket.on('answer', ({ callerId, sdp }) => {
    console.log(`${selfId} answer ${callerId}`);

    const caller = socketMap[callerId];

    if (!caller) {
      socket.emit('failure', { error: 'No caller' });
      return;
    }

    caller.emit('answer', { calleeId: selfId, sdp });
  });

  socket.on('reject', ({ callerId }) => {
    console.log(`${selfId} reject ${callerId}`);

    const caller = socketMap[callerId];

    if (!caller) {
      socket.emit('failure', { error: 'No caller' });
      return;
    }

    caller.emit('failure', { error: 'Callee reject the call' });
  });

  socket.on('ice', ({ peerId, candidate }) => {
    console.log(`${selfId} ice ${peerId}`);

    const peer = socketMap[peerId];

    if (!peer) {
      socket.emit('failure', { error: 'No peer' });
      return;
    }

    peer.emit('ice', { callerId: selfId, candidate });
  });
});

const port = parseInt(process.env.PORT) || 8080;
httpServer.listen(port);