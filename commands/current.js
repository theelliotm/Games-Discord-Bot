//# Written and Developed by Xcallibur
//# © 2020 Xcallibur

const Discord = require("discord.js");
const Game = require("./play")

/**
 * An admin command used to display all games being actively the server.
 * It shows ID (for easy ending), the game type, the owner, the status (playing or queuing), who is playing, and a URL that allows them to spectate.
 * @param {*} msg The command message.
 */
//TODO make non admin version that does not display ID, only 1,2,etc
module.exports.run = async (bot, msg, args, con) => {
    const isAdmin = msg.channel.permissionsFor(msg.author).has('ADMINISTRATOR');

    if (!isAdmin) return;

    let games = Game.getGames(msg.guild);

    var embed = new Discord.MessageEmbed();
    embed.setColor('ORANGE')
    embed.setTitle('Current Games')
    let c = 0;
    for (var g in games.array()) {
        var id = games.keyArray()[g];
        var game = games.array()[g];
        if (game.state == 2) continue;
        c++;
        embed.addField('`' + id + '`', [
            "**Game**: " + game.gametype.name, 
            "**Owner**: " + game.owner.tag, 
            "**Status**: " + (game.state == 1 ? "Playing" : "Queuing"), 
            "**Playing**: " + game.queued.join(", "),
            (game.spectateMessage ? "[**Spectate Game**](" + game.spectateMessage + ")" : ""),
        ]);
    }
    embed.setDescription('Currently ' + c + (c == 1 ? " game is " : " games are ") + "being played.")
    msg.channel.send(embed);
}

module.exports.info = {
    name: "current",
    inDMs: false
}