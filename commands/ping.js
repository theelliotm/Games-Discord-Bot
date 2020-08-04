//# Written and Developed by Xcallibur
//# © 2020 Xcallibur

/**
 * Tells the player the response time
 * @param {*} bot The bot client.
 * @param {*} msg The command message.
 */
module.exports.run = async (bot, msg) => {
  msg.channel.send('**🏓 Pong!** Response Time: `' + Math.abs(new Date().getTime() - msg.createdTimestamp) + ' ms` Websocket Ping: `' + bot.ws.ping + ' ms`');
}

module.exports.info = {
  name: "ping"
}
