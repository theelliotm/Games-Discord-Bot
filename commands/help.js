//# Written and Developed by Xcallibur
//# © 2020 Xcallibur

const Discord = require("discord.js")
const Game = require("./play")

/**
 * Displays a help message which helps users understand which commands they can use.
 * Disregarding 'games', it has the two major subcategories 'admin' and 'player' that show different commands based on access level.
 * @param {*} msg The command message.
 * @param {*} args The arguments used to specify which help embed to display.
 * @param {*} guildData The cached data for the guild this message is coming from. (In this case, it uses the prefix)
 */
module.exports.run = async (bot, msg, args, guildData) => {
    const option = args[0] ? args[0].toLowerCase() : null;
    const isAdmin = msg.channel.permissionsFor(msg.author).has('ADMINISTRATOR');

    if (!option) {
        msg.channel.send(new Discord.MessageEmbed()
            .setColor('BLUE')
            .setTitle("Games Bot Help")
            .setDescription("What do you need help with? `" + guildData.prefix + "help [option]`")
            .addField("Options", ["`Games` - View all games you can play.", 
                "`Player` - Commands related to playing and interacting with games. ", 
                (isAdmin ? "`Admin` - Commands related to administration." : ""),
                "`Other` - Miscellaneous commands."])
            .addField("Not Enough?", "[**Official Discord Server**](https://discord.gg/gSeEYNk)"));
    } else if (option == 'games') {
        msg.channel.send(new Discord.MessageEmbed()
            .setColor('BLUE')
            .setTitle("Games Help")
            .setDescription("Games currently available to play. To start one, run `" + guildData.prefix + "play [game] @user...`")
            .addField("Games", Game.vars.availableGames.map(g => "`" + g.name + "` - " + g.description)));
    } else if (option == 'player') {
        msg.channel.send(new Discord.MessageEmbed()
            .setColor('BLUE')
            .setTitle("Player Command Help")
            .setDescription("Commands all users can use.")
            .addField("Commands", [
                "`" + guildData.prefix + "play [game] @user...` - Starts a game with specified users.",
                "`" + guildData.prefix + "end` - Ends current game, if you are the owner.", 
                "`" + guildData.prefix + "exit` - Exit current game.",
                "`" + guildData.prefix + "games` - List available games.",
                "`" + guildData.prefix + "lucky | shuffle` - Use the randomness machine to choose a game.",
                "`" + guildData.prefix + "leader | " + guildData.prefix + "leaderboard [server | global | event] (game)` - View server, global, or event leaderboard. Specify a game to see wins just for that game."]));
    } else if (option == 'admin') {
        if (!isAdmin) return;
        msg.channel.send(new Discord.MessageEmbed()
            .setColor('BLUE')
            .setTitle("Admin Command Help")
            .setDescription("Administration commands.")
            .addField("Commands", [
                "`" + guildData.prefix + "event (info | start | pause | end | reset)` - Start a server wide leaderboard event! You can even choose a specific game to theme it around.", 
                "`" + guildData.prefix + "current` - Shows all current games, listed by id.", 
                "`" + guildData.prefix + "end [id | all]` - Ends a game with the id, or all of them.",
                "`" + guildData.prefix + "prefix [prefix]` - Set the prefix. Mention the bot at anytime to view it. Special cases: `NOTHING` and `DEFAULT`"]));
    } else if (option == "other") {
        msg.channel.send(new Discord.MessageEmbed()
            .setColor('BLUE') 
            .setTitle("Other Command Help")
            .setDescription("Miscellaneous commands.")
            .addField("Commands", [
                "`" + guildData.prefix + "ping` - Gives you the response time in milliseconds.",
                "`" + guildData.prefix + "about` - View version number, license, etc.", 
                "`" + guildData.prefix + "bug | bugreport` - Sends you to about screen where you can go to the community server."]));
    }
}

module.exports.info = {
    names: ["help", "?"]
}
