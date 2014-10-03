var Joi = require('joi');
var Wreck = require('wreck');
var Config = require('getconfig');

module.exports.register = function (plugin, options, next) {

    plugin.route({
        method: 'POST',
        path: '/ship',
        config: {
            handler: function (request, reply) {

                if (!Config.tokens.general) {
                    return reply('No token configured').code(400);
                }

                var text = request.payload.text.replace(/\&/g, '&amp;').replace(/\</g, '&lt;').replace(/\>/g, '&gt;');

                //usernames should be referenced as <@username> for linkification
                text = text.replace(/(\W)(@\w+)/g, "$1<$2>");

                var message = {
                    text: text,
                    icon_emoji: ':rocket:',
                    username: '@' + request.payload.user_name + ' shipped',
                    channel: request.payload.channel_id
                };

                Wreck.post(Config.url + '?token=' + Config.tokens.general, { payload: JSON.stringify(message) }, function (err, res) {

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

    next();
};

module.exports.register.attributes = {
    name: 'slack-ship',
    version: '1.0.0'
};
