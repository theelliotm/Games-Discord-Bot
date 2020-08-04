//# Written and Developed by Xcallibur
//# © 2020 Xcallibur

const Discord = require("discord.js");
var packageJSON = require('../package.json');

/**
 * Displays an about message.
 * @param {*} msg The command message.
 */
module.exports.run = async (bot, msg) => {
  msg.channel.send(new Discord.MessageEmbed()
        .setColor('YELLOW')
        .setTitle("About Games Bot")
        .setDescription("Created By <@!232222301733519360>\n\n**Version: **" + packageJSON.version + "\n**License: " + packageJSON.license + "**\n\n**Want To Contribute? **[**GitHub Repository**](https://github.com/Xcallibur232/Games-Discord-Bot)\n**Found a Bug? Want to Suggest A Feature? **[**Discord Server**](https://discord.gg/gSeEYNk)\n\n©" + new Date().getFullYear() + " Xcallibur"));
}

module.exports.info = {
  names: ["about","contribute"]
}
