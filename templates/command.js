//# Written and Developed by Xcallibur

const Discord = require("discord.js");

/**
 * Description of command here.
 * @param {*} bot The client user.
 * @param {*} msg The command message.
 * @param {*} args A list of the arguments of the command.
 * @param {*} con The database connection.
 * @param {*} guildData The cached guild data.
 */
module.exports.run = async (bot, msg, args, con, guildData) => {
  msg.channel.send("✅ Nice Command").then(msg2 => msg2.delete({ timeout: 10000 }));
}

module.exports.info = {
  name: "command",
}