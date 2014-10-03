var dulcimer = require('dulcimer');

var User = new dulcimer.Model({
    userId: {
        type: 'string',
        index: true
    },
    currentTask: {
        foreignKey: 'task'
    },
}, { name: 'user' });

User.findOrCreateByUserId = function (userId, done) {
    User.findByIndex('userId', userId, function (err, user) {
        if (err) { return done(err); }
        if (user) { return done(null, user); }

        done(null, user || User.create({ userId: userId }));
    });
};

module.exports = User;
