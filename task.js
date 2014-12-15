var Joi = require('joi');
var Wreck = require('wreck');
var Config = require('getconfig');
var Task = require('./lib/task');
var User = require('./lib/user');
var shipTask = require('./lib/ship-task');

//payload = { text, user_id, user_name }
//parsePayload = payload -> [cmd, action]

//cmd = "update|create|delete"
//applyAction = cmd -> taskData -> bool
function parseUserData(payload) {
    return {
        userId: payload.user_id,
        username: payload.user_name
    };
}

function parseCmd(payload) {
    var userCmd = payload.text.split(' ')[0];
    return {
        help: 'help',
        add: 'create',
        create: 'create',
        list: 'list',
        delete: 'delete',
        ship: 'ship',
        start: 'start',
        stop: 'stop',
        team: 'team',
        current: 'current'
    }[userCmd] || 'help';
}

function parseTaskText(payload) {
    return payload.text.split(' ').slice(1).join(' ');
}

function parseTaskChannel(payload) {
    return payload.channel_id;
}

function parsePayload (payload) {
    var cmd = parseCmd(payload);
    var taskData = parseUserData(payload);

    if (!cmd) throw 'Unknown command';

    if (cmd === 'create') {
        taskData.task = parseTaskText(payload);
   }

    if (cmd === 'ship' || cmd === 'delete' || cmd === 'start') {
        var taskId = parseTaskText(payload);
        if (parseInt(taskId, 10)) {
            taskData.taskId = parseInt(taskId, 10);
        } else {
            taskData.taskText = taskId;
        }
        taskData.channel = parseTaskChannel(payload);
    }


    return [cmd, taskData];
}

function processPayload(payload, done) {
    var actions = {
        create: function (taskData) {
            if (taskData.task.trim() === '') {
                return done(null, 'You need to give your task some text: */tasky add [text goes here]*');
            }

            Task.create(taskData).saveWithId(function (err, task) {
                if (err) { done(err); }
                done(null, 'Task added:\n' + task.id + '. *' + task.task + '*');
            });
        },

        list: function (taskData) {
            Task.getByIndex('userId', taskData.userId, function (err, tasks) {
                var msg;

                tasks = tasks.sort(function (taskA, taskB) {
                    return taskA.id < taskB.id ? -1 : 1;
                }).map(function (task) {
                    return task.id + ": *" + task.task + "*";
                });

                if (tasks.length === 0) {
                    msg = "You've completed all your tasks!";
                } else {
                    msg = [
                        "Your tasks:",
                        tasks.join('\n')
                    ].join('\n');
                }

                done(null, msg);
            });
        },

        ship: function (taskData) {
            if (!taskData.taskId && taskData.taskText) {
                shipTask({
                    text: taskData.taskText,
                    username: taskData.username,
                    channel: taskData.channel
                }, function (err) {
                    if (err) { return done(err); }
                    done();
                });

                return;
            }

            Task.findForUser(taskData.userId, taskData.taskId, function (err, task) {
                if (err) { return done(err); }
                if (!task) { return done(null, 'Could\'t find that task :('); }

                shipTask({
                    text: task.task,
                    username: task.username,
                    channel: taskData.channel
                }, function (err) {
                    if (err) { return done(err); }
                    task.delete(done);
                });
            });
        },

        delete: function (taskData) {
            if (!taskData.taskId) { return done(null, 'Could\'t find that task :('); }

            Task.findForUser(taskData.userId, taskData.taskId, function (err, task) {
                if (err) { return done(err); }
                if (!task) { return done(null, 'Could\'t find that task :('); }

                task.delete(function (err) {
                    Task.countByIndex('userId', taskData.userId, function (err, count) {
                        done(err, 'Task deleted! _' + count + ' remaining_');
                    });
                });
            });
        },

        start: function (taskData) {
            Task.findForUser(taskData.userId, taskData.taskId, function (err, task) {
                if (err) { return done(err); }
                if (!task) { return done(null, 'Could\'t find that task :('); }

                User.findOrCreateByUserId(taskData.userId, function (err, user) {
                    if (err) { return done(err); }

                    var prevTask = user.currentTask && user.currentTask.task;
                    user.currentTask = task;


                    user.save(function (err) {
                        var msg = 'You started working on: *' + task.task + '*';
                        if (prevTask) {
                            msg = "You stopped working on: *" + prevTask + "*\n" + msg;
                        }

                        done(err, msg);
                    });
                });
            });
        },

        current: function (taskData) {
            User.findOrCreateByUserId(taskData.userId, function (err, user) {
                if (err) { return done(err); }
                if (!user || !user.currentTask) {
                    return done(null, "You aren't working on a task right now");
                }

                return done(null, "You are supposed to be working on: *" + user.currentTask.task + "*");
            });
        },

        stop: function (taskData) {
            User.findOrCreateByUserId(taskData.userId, function (err, user) {
                if (err) { return done(err); }

                var task = user.currentTask;

                if (!task) {
                    return done(null, "You weren't working on a task");
                }

                user.currentTask = undefined;
                user.save(function (err) {
                    done(err, 'You stopped the task: *' + task.task + '*');
                });
            });
        },

        help: function () {
            done(null, [
                '*Tasky help:*',
                '*Basic commands*',
                '/tasky help                                        - this help',
                '/tasky list                                          - list tasks',
                '/tasky add [your task here]       - add a task',
                '/tasky ship [task-number]         - ship task (get number from /tasky list)',
                '/tasky delete [task-number]     - delete task',
                '',
                '*Advanced commands*',
                '/tasky start [task-number]        - start working on a task',
                '/tasky stop [task-number]         - stop working on a task',
                '/tasky current                                 - list your current task',
                '/tasky team                                     - see what the team are working on',
            ].join('\n'));
        },

        team: function () {
            User.all(function (err, team) {
                if (err) { return reply(err); }

                team = team.filter(function (u) { return !!u.currentTask; })
                           .sort(function (a, b) { return a.username < b.username ? -1 : 1; })
                           .map(function (u) {
                                return '*' + u.currentTask.username + '*: ' + u.currentTask.task;
                           });

                if  (team.length > 0) {
                    msg = [
                        'People are currently working on: ',
                        team.join('\n')
                    ].join('\n');
                } else {
                    msg = "Nobody appears to be working...";
                }

                done(null, msg);
            });
        }
    };

    var action = parsePayload(payload);

    if (actions[action[0]]) {
        actions[action[0]].apply(this, action.slice(1));
    }
}



module.exports.register = function (plugin, options, next) {

    plugin.route({
        method: 'POST',
        path: '/task',
        config: {
            handler: function (request, reply) {
                if (request.query.ship) {
                    request.payload.text = 'ship ' + request.payload.text;
                }

                processPayload(request.payload, function (err, result) {
                    if (err) {
                        console.log(err);
                        return reply(err);
                    }
                    reply(result);
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
                    command: Joi.string().allow('/ship').required(),
                    text: Joi.string().allow('').required()
                }
            }
        }
    });

    next();
};

module.exports.register.attributes = {
    name: 'slack-task',
    version: '1.0.0'
};
