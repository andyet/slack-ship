var Joi = require('joi');
var Wreck = require('wreck');
var Config = require('getconfig');
var Github = require('github');
var github = new Github({
    version: '3.0.0'
});


module.exports.register = function (plugin, options, next) {

    github.authenticate({
        type: 'oauth',
        token: Config.tokens.github
    });

    plugin.route({
        method: 'POST',
        path: '/deploy',
        config: {
            handler: function (request, reply) {

                var parts = request.payload.text.trim().split(' ');

                var repo = parts[0];
                if (repo.indexOf('/') === -1) {
                    repo = 'andyet/' + repo;
                }
                var repoParts = repo.split('/');

                var branch = parts.length === 1 ? 'master' : parts[1];

                github.repos.createDeployment({
                    user: repoParts[0],
                    repo: repoParts[1],
                    ref: branch,
                    task: 'deploy',
                    description: 'triggered by slack',
                    payload: {
                        person: request.payload.user_name,
                        raw_command: request.payload.text
                    }
                }, function (err, res) {

                    if (err) {
                        console.log('ERROR CREATING DEPLOY');
                        console.log(err);
                        return reply({
                            text: 'Got an error creating the deployment: ' + err.message,
                            icon_emoji: ':obpsbot:',
                            username: '@opsbot'
                        });
                    }

                    return reply({
                        text: 'Successfully created deployment #' + res.id + ' for ' + repo + ':' + branch,
                        icon_emoji: ':opsbot:',
                        username: '@opsbot'
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
                    text: Joi.string().optional().allow(''),
                    response_url: Joi.string().allow('')
                }
            }
        }
    });

    next();
};

module.exports.register.attributes = {
    name: 'slack-deploy',
    version: '1.0.0'
};
