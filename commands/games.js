//# Written and Developed by Xcallibur
//# © 2020 Xcallibur

const Discord = require("discord.js")
const Game = require("./play")
const Main = require("../bot")

/**
 * Displays the list of all available games.
 * @param {*} msg The command message.
 * @param {*} guildData The cached data for the guild this was sent in. (In this case, it needs the prefix)
 */
module.exports.run = async (bot, msg, args, con, guildData) => {
    msg.channel.send(new Discord.MessageEmbed()
        .setColor('BLUE')
        .setTitle("Game List")
        .setDescription("Games currently available to play. To start one, run `" + guildData.prefix + "play [game] @user...`")
        .addField("Games", Game.vars.availableGames.map(g => "`" + g.name + "` - " + g.description)));
}

module.exports.info = {
    names: ["game", "games"]
}
