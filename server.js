var Config = require('getconfig');
var Hapi = require('hapi');
var Joi = require('joi');
var Wreck = require('wreck');

var server = new Hapi.Server(Config.host, Config.port);

server.route({
    method: 'POST',
    path: '/ship',
    config: {
        handler: function (request, reply) {

            if (!Config.tokens[request.payload.channel_name]) {
                return reply('This channel is not allowed to ship tasks').code(400);
            }

            var message = {
                text: '_' + encodeURIComponent(request.payload.user_name + ' shipped: ' + request.payload.text) + '_',
                icon_emoji: ':rocket:',
                username: 'andbang',
                channel: '#' + request.payload.channel_name,
                mrkdwn: true
            };

            Wreck.post(Config.url + '?token=' + Config.tokens[request.payload.channel_name], { payload: JSON.stringify(message) }, function (err, res) {

                reply();
            });
        },
        validate: {
            payload: {
                token: Joi.string().required(),
                team_id: Joi.string().required(),
                channel_id: Joi.string().required(),
                channel_name: Joi.string().required(),
                user_id: Joi.string().required(),
                user_name: Joi.string().required(),
                command: Joi.string().allow('/ship').required(),
                text: Joi.string().required()
            }
        }
    }
});

server.pack.register(require('good'), function (err) {

    if (err) {
        throw err;
    }

    server.start(function () {

        server.log('info', 'Slack-ship listening at: ' + server.info.uri);
    });
});
