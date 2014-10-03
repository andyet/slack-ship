var Config = require('getconfig');
var Hapi = require('hapi');

var server = new Hapi.Server(Config.host, Config.port);
var dulcimer = require('dulcimer');
dulcimer.connect(Config.dulcimer);

server.pack.register([
    require('./ship'),
    require('./talky'),
    require('./task')
], function (err) {

    if (err) { throw err; }

    server.start(function () {

        if (err) { throw err; }
        server.log('info', 'Slack-ship listening at: ' + server.info.uri);
    });
});
