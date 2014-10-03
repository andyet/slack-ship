var dulcimer = require('dulcimer');

var Counter = new dulcimer.Model({
    name: {
        type: 'string',
        index: true
    },
    count: 'number'
}, { name: 'counter' });


var Task = new dulcimer.Model({
    id: {
        type: 'string',
        index: true
    },
    userId: {
        type: 'string',
        index: true
    },
    scopedId: {
        type: 'string',
        index: true
    },
    username: 'string',
    task: 'string'
}, { name: 'task' });

Task.findForUser = function (user, id, done) {
    this.findByIndex('scopedId', user + ':' + id, done);
};

Task.countByIndex = function (name, value, done) {
    this.getByIndex(name, value, function (err, results) {
        done(err, results && results.length);
    });
};

Task.extendModel({
    saveWithId: function (done, options) {
        var task = this;

        Counter.runWithLock(function (unlock) {
            Counter.findByIndex('name', 'task-id', function (err, counter) {
                if (err) {
                    console.log(err);
                    unlock();
                    return done(err);
                }

                if (!counter) {
                    console.log('Counter not found');
                    counter = Counter.create({ name: 'task-id', count: 1 });
                } else {
                    counter.count++;
                }

                counter.save({ withoutLock: true }, function (err) {
                    if (err) {
                        console.log(err);
                        unlock();
                        return done(err);
                    }

                    task.id = counter.count;
                    task.scopedId = task.userId + ':' + counter.count;

                    task.save({ withoutLock: true }, function (err) {
                        if (err) { console.log(err); }
                        unlock();
                        done(err, task);
                    });
                });
            });
        });
    }
});
module.exports = Task;
