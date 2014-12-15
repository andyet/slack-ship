var Config = require('getconfig');
var Wreck = require('wreck');

module.exports = function (data, done) {
    var text = data.text;
    text = text.replace(/(\W)(@\w+)/g, "$1<$2>");

    var message = {
        icon_emoji: ':shippy:',
        text: '_' + text + '_',
        username: '@' + data.username + ' shipped',
        channel: data.channel,
        mrkdwn: true
    };

    Wreck.post(Config.url + '?token=' + Config.tokens.general, { payload: JSON.stringify(message) }, done);
};
