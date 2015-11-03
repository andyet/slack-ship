var Joi = require('joi');
var Wreck = require('wreck');
var Config = require('getconfig');
var generateName = require('./lib/generate-talky-room-name');


var linkify = function (text) {

    return "<" + text + ">";
};

module.exports.register = function (plugin, options, next) {

    plugin.route({
        method: 'POST',
        path: '/freeze',
        config: {
            handler: function (request, reply) {
                if (!Config.tokens.general) {
                    return reply('No token configured').code(400);
                }

                var link = linkify("http://talky.io/" + generateName());

                var message = {
                    text: 'it looks like things are getting a little heated! maybe this conversation would be better resolved at ' + link + ' or we should take a 5 minute break :smile:',
                    icon_emoji: ':snowflake:',
                    username: 'freeze!',
                    channel: request.payload.channel_id
                };

                Wreck.post(Config.url + '?token=' + Config.tokens.general, { payload: JSON.stringify(message) }, function (err, res, body) {
                    reply();
                });
            },
            validate: {
                payload: {
                    token: Joi.string().required(),
                    team_id: Joi.string().required(),
                    team_domain: Joi.string().required(),
                    channel_id: Joi.string().required(),
                    channel_name: Joi.string().required(),
                    user_id: Joi.string().required(),
                    user_name: Joi.string().required(),
                    command: Joi.string().allow('/freeze').required(),
                    text: Joi.string().optional().allow(''),
                    response_url: Joi.string().allow('')
                }
            }
        }
    });

    next();
};

module.exports.register.attributes = {
    name: 'slack-freeze',
    version: '1.0.0'
};
