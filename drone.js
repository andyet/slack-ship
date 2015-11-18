var Joi = require('joi');
var Wreck = require('wreck');
var Config = require('getconfig');
var moment = require('moment');

var internals = {};
internals.linkify = function (url, text) {
  return '<' + url + '|' + text + '>';

};

internals.formatBuilds = function (repo, builds) {
    var icons = {
      success: ':white_check_mark:',
      failure: ':x:',
      pending: ':walking2:',
      running: ':walking2:'
    }
    return builds.map(function (build) {
        var icon = icons[build.status];
        var buildTime;

        if (build.status === 'success' || build.status === 'failure') {
            buildTime = moment.duration(build.finished_at*1000 - build.started_at*1000);
        } else {
            buildTime = moment.duration(Date.now() - build.started_at*1000);
        }

        return [
            icon,
            build.event === 'deployment' ? '[' + build.deploy_to + ']' : '[stage]',
            moment(build.enqueued_at*1000).fromNow(),
            '(took: ' + buildTime.humanize() + ')',
            internals.linkify(build.link_url, '[gh]'),
            internals.linkify('https://drone.andyet.com/' + repo + '/' + build.number, '[drone]')
        ].join(' ')
    }).join('\n');
};

internals.formatRepos = function (repos) {
    return repos.map(function (repo) {
        return '- ' + internals.linkify('https://github.com/' + repo.full_name, repo.full_name);
    }).join('\n');
};


module.exports.register = function (plugin, options, next) {

    var wreck = Wreck.defaults({
      headers: {
        Authorization: 'Bearer ' + Config.tokens.drone
      }
    })

    var getRepos = function (done) {
        wreck.get('https://drone.andyet.com/api/user/repos', function (err, resp, payload) {
            if (err) {
                return done(err);
            }

            done(null, JSON.parse(payload));
        });
    };

    plugin.route({
        method: 'POST',
        path: '/drone',
        config: {
            handler: function (request, reply) {

                var parts = request.payload.text.trim().split(' ');
                var action = parts[0].trim();

                if (action === 'status') {
                    var repo = parts[1];

                    if (!repo) {
                        getRepos(function (err, repos) {

                            if (err) {
                                return reply({
                                    text: 'Got an error querying drone: ' + err.message,
                                    icon_emoji: ':obpsbot:',
                                    username: '@opsbot'
                                });
                            }

                            return reply({
                                text: 'Usage: */drone status <repo>*\n' + internals.formatRepos(repos),
                                icon_emoji: ':obpsbot:',
                                username: '@opsbot'
                            })
                        });

                        return;
                    }



                    if (repo && repo.indexOf('/') === -1) {
                        repo = 'andyet/' + repo;
                    }

                    wreck.get('https://drone.andyet.com/api/repos/' + repo + '/builds', function (err, resp, payload) {

                        if (err) {
                            return reply({
                                text: 'Got an error querying drone: ' + err.message,
                                icon_emoji: ':obpsbot:',
                                username: '@opsbot'
                            });
                        }

                        return reply({
                            text: repo + ' status\n' + internals.formatBuilds(repo, JSON.parse(payload).slice(0,5)),
                            icon_emoji: ':obpsbot:',
                            username: '@opsbot'
                        })

                    });
                } else if (action === 'repos') {
                    getRepos(function (err, repos) {
                        if (err) {
                            return reply({
                                text: 'Got an error querying drone: ' + err.message,
                                icon_emoji: ':obpsbot:',
                                username: '@opsbot'
                            });
                        }
                        reply({
                            text: 'Repos in drone:\n' + internals.formatRepos(repos),
                            icon_emoji: ':obpsbot:',
                            username: '@opsbot'
                        })
                    })
                }
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
    name: 'slack-drone',
    version: '1.0.0'
};
