var Joi = require('joi');
var Wreck = require('wreck');
var Config = require('getconfig');
var generateName = require('./lib/generate-talky-room-name');


var matchUsernames = function (text) {

    return text.match(/@[^\s]+/g);
};

var linkify = function (text) {

    return "<" + text + ">";
};

module.exports.register = function (plugin, options, next) {

    plugin.route({
        method: 'POST',
        path: '/talky',
        config: {
            handler: function (request, reply) {
                if (!Config.tokens.general) {
                    return reply('No token configured').code(400);
                }

                var text = linkify("http://andyet.talky.io/" + generateName());

                var usernames = matchUsernames(request.payload.text);
                if (usernames && usernames.length > 0) {
                    text += " /cc " + usernames.map(linkify);
                }

                var message = {
                    text: text,
                    icon_emoji: ':talky:',
                    username: '@' + request.payload.user_name + ' wants to talk',
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
                    command: Joi.string().allow('/talky').required(),
                    text: Joi.string().optional().allow(''),
                    response_url: Joi.string().allow('')
                }
            }
        }
    });

    next();
};

module.exports.register.attributes = {
    name: 'slack-talky',
    version: '1.0.0'
};
