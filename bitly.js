var Joi = require('joi');
var Wreck = require('wreck');
var Config = require('getconfig');


module.exports.register = function (plugin, options, next) {

    plugin.route({
        method: 'POST',
        path: '/shorten',
        config: {
            handler: function (request, reply) {
                if (!Config.tokens.general) {
                    return reply('No token configured').code(400);
                }

                Wreck.get(Config.bitly.url + '?access_token=' + Config.bitly.access_token + '&longUrl=' + encodeURIComponent(request.payload.text), {}, function (err, res, body) {
                    var text;

                    if ( err ) {
                        text = 'error getting shortened link'; 
                    } else {
                        var result = JSON.parse(body);
                        if ( result.data.url ) {
                            text = request.payload.text + ' :arrow_right: ' + result.data.url;
                        } else {
                            text = 'bit.ly did not like that url - please make sure the url is complete';
                        };
                    };

                    var message = {
                        text: text,
                        icon_emoji: ':opsbot:',
                        username: '@opsbot',
                        channel: request.payload.channel_id
                    };

                    Wreck.post(Config.url + '?token=' + Config.tokens.general, { payload: JSON.stringify(message) }, function (err, res, body) {
                        reply();
                    });
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
                    command: Joi.string().allow('/shorten').required(),
                    text: Joi.string().optional().allow('')
                }
            }
        }
    });

    next();
};

module.exports.register.attributes = {
    name: 'slack-shorten',
    version: '1.0.0'
};
