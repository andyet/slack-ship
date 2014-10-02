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

            var text = request.payload.text.replace(/\&/g, '&amp;').replace(/\</g, '&lt;').replace(/\>/g, '&gt;');

            var message = {
                text: text,
                icon_emoji: ':rocket:',
                username: '@' + request.payload.user_name + ' shipped',
                channel: '#' + request.payload.channel_name
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

server.start(function () {

    server.log('info', 'Slack-ship listening at: ' + server.info.uri);
});
