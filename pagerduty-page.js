var Joi = require('joi');
var Wreck = require('wreck');
var Strftime = require('strftime');
var Config = require('getconfig');


module.exports.register = function (plugin, options, next) {

    plugin.route({
        method: 'POST',
        path: '/page',
        config: {
            handler: function (request, reply) {
                if (!Config.tokens.general) {
                    return reply('No token configured').code(400);
                }

                var eventID = Strftime("%j%H%M");
                var payload = {
                    "service_key":  Config.pagerduty.service_key,
                    "incident_key": eventID,
                    "event_type":   "trigger",
                    "description":  request.payload.text
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
                            text = 'Ops Team has been paged [' + eventID + '] :arrow_right: ' + request.payload.text + ' /cc <@' + request.payload.user_name + '>';
                        } else {
                            text = 'Page has failed to be delivered - poke @bear';
                        };
                    };

                    request.server.app.pages[eventID] = request.payload.user_name;

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
                    command: Joi.string().allow('/page').required(),
                    text: Joi.string().optional().allow('')
                }
            }
        }
    });

    next();
};

module.exports.register.attributes = {
    name: 'slack-page',
    version: '1.0.0'
};
