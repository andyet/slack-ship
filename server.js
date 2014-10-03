var Config = require('getconfig');
var Hapi = require('hapi');

var server = new Hapi.Server(Config.host, Config.port);

server.pack.register([
    require('./ship'),
    require('./talky')
], function (err) {

    if (err) { throw err; }

    server.start(function () {

        if (err) { throw err; }
        server.log('info', 'Slack-ship listening at: ' + server.info.uri);
    });
});
