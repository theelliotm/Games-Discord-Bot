//# Written and Developed by Xcallibur
//# © 2020 Xcallibur

/**
 * Tells the player the response time
 * @param {*} bot The bot client.
 * @param {*} msg The command message.
 */
module.exports.run = async (bot, msg) => {
  let oldTime = new Date().getTime();
  msg.channel.send('**🏓 Pong!** Response Time: `Calculating...` Websocket Ping: `' + bot.ws.ping + ' ms`').then(m => {
    m.edit('**🏓 Pong!** Response Time: `' + (new Date().getTime() - oldTime) + 'ms` Websocket Ping: `' + bot.ws.ping + ' ms`')
  });
}

module.exports.info = {
  name: "ping",
  perms_needed: []
}
