var Joi = require('joi');
var Wreck = require('wreck');
var Config = require('getconfig');


module.exports.register = function (plugin, options, next) {

    plugin.route({
        method: 'POST',
        path: '/resolve',
        config: {
            handler: function (request, reply) {
                if (!Config.tokens.general) {
                    return reply('No token configured').code(400);
                }

                var payload = {
                    "service_key":  Config.pagerduty.service_key,
                    "incident_key": request.payload.text,
                    "event_type":   "resolve",
                    "description":  "resolved by " + request.payload.user_name
                };
                var options = {
                    headers: {
                        "Authorization": "Token token=" + Config.pagerduty.token,
                        "Content-type":  "application/json"
                    },
                    payload: JSON.stringify(payload)
                };

                Wreck.post(Config.pagerduty.event_url, options, function (err, res, body) {
                    var text;

                    if ( err ) {
                        text = 'error calling PagerDuty - poke @bear';
                    } else {
                        var result = JSON.parse(body);

                        if ( result.status == "success" ) {
                            text = 'Page ' + request.payload.text + 'has been resolved';
                        } else {
                            text = 'Page has failed to be delivered - poke @bear';
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
                    channel_id: Joi.string().required(),
                    channel_name: Joi.string().required(),
                    user_id: Joi.string().required(),
                    user_name: Joi.string().required(),
                    command: Joi.string().allow('/resolve').required(),
                    text: Joi.string().optional().allow('')
                }
            }
        }
    });

    next();
};

module.exports.register.attributes = {
    name: 'slack-resolve',
    version: '1.0.0'
};
