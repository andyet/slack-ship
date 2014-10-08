var Joi = require('joi');
var Wreck = require('wreck');
var Config = require('getconfig');


module.exports.register = function (plugin, options, next) {

    plugin.route({
        method: 'POST',
        path: '/oncall',
        config: {
            handler: function (request, reply) {
                if (!Config.tokens.general) {
                    return reply('No token configured').code(400);
                }

                var options = {
                    headers: {
                        "Authorization": "Token token=" + Config.pagerduty.token,
                        "Content-type":  "application/json"
                    }
                };

                Wreck.get(Config.pagerduty.oncall_url, options, function (err, res, body) {
                    var text;
                    var oncall;

                    if ( err ) {
                        text = 'error getting calling PagerDuty - poke @bear'; 
                    } else {
                        var result = JSON.parse(body);

                        result.users.forEach( function (u){
                            p.on_call.forEach( function (o){
                                if ( o.start ) {
                                    oncall = u.name;
                                }
                            });
                        });

                        if ( oncall ) {
                            text = 'Oncall is ' + oncall;
                        } else {
                            text = 'could not determine who is oncall - poke @bear';
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
                    command: Joi.string().allow('/oncall').required(),
                    text: Joi.string().optional().allow('')
                }
            }
        }
    });

    next();
};

module.exports.register.attributes = {
    name: 'slack-oncall',
    version: '1.0.0'
};
