var Config = require('getconfig');
var Hapi = require('hapi');

var server = new Hapi.Server(Config.host, Config.port);
var dulcimer = require('dulcimer');
dulcimer.connect(Config.dulcimer);

server.app.pages = {};

server.pack.register([
    require('good'),
    require('./freeze'),
    require('./talky'),
    require('./task'),
    require('./bitly'),
    require('./deploy'),
    require('./drone'),
    require('./pagerduty-oncall'),
    require('./pagerduty-page'),
    require('./pagerduty-ack'),
    require('./pagerduty-resolve'),
    require('./availability')
], function (err) {

    if (err) { throw err; }

    server.start(function () {

        if (err) { throw err; }
        server.log('info', 'Slack-ship listening at: ' + server.info.uri);
    });
});
