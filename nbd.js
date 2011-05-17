var options = require( 'nomnom' ).opts( {
	host: {
		string: "-H HOST, --host=HOST",
		default: 'irc.freenode.net',
		help: "What IRC network to connect to."
	},
	nick: {
		string: "-n NICK, --nick=NICK",
		default: 'watchie',
		help: 'IRC nic to use'
	},
	channels: {
		string: "-c CHANNELS, --channels=CHANNELS",
		default: "",
		help: "Chanels to join ( comma-seperated, no # )."
	}
}).parseArgs();

var CHANNELS = options.channels.split(',');
CHANNELS.forEach(function(channel, i) {
	CHANNELS[i] = '#' + channel.trim();
});

var irc = require( 'irc' );
var http = require('http')
  , url = require('url')
  , fs = require('fs')
  , io = require('socket.io')
  , sys = require(process.binding('natives').util ? 'util' : 'sys')
  , server;
    
server = http.createServer(function(req, res){
	var path = url.parse(req.url).pathname;
	switch (path){
		case '/':
			res.writeHead(200, {'Content-Type': 'text/html'});
			res.write('<h1>Welcome. Try the <a href="/chat.html">chat</a> example.</h1>');
			res.end();
			break;

		case '/json.js':
		case '/chat.html':
			fs.readFile(__dirname + path, function(err, data){
				if (err) return send404(res);
				res.writeHead(200, {'Content-Type': path == 'json.js' ? 'text/javascript' : 'text/html'})
				res.write(data, 'utf8');
				res.end();
			});
			break;

		default: send404(res);
	}
}),

send404 = function(res){
  res.writeHead(404);
  res.write('404');
  res.end();
};

server.listen(8080);

var irc_buff = [];

// socket.io, I choose you
// simplest chat application evar
var io = io.listen(server)
  , buffer = [];

io.on('connection', function(client){
	client.send({ buffer: buffer });
	client.broadcast({ announcement: client.sessionId + ' connected' });

	setInterval( function() {
		if ( irc_buff[ irc_buff.length - 1 ] ) {
			var msg = { message: [ client.sessionId, irc_buff[ irc_buff.length - 1 ] ] };
			client.broadcast( msg );
			irc_buff.shift();
		}
	}, 100);

	client.on('disconnect', function(){
		client.broadcast({ announcement: client.sessionId + ' disconnected' });
	});
});

var irc_client = new irc.Client( options.host, options.nick, {
	channels: CHANNELS
});

irc_client.addListener( 'error', function( msg ) {
	console.log( "ERROR: " + msg );
});

irc_client.addListener( 'data', function( d ) {
	console.log( d );
});

irc_client.addListener( 'message', function( from, to, msg ) {
	irc_buff.push( "<" + from + "> " + msg );
});
