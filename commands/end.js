//# Written and Developed by Xcallibur
//# © 2020 Xcallibur

const Game = require("./play")

/**
 * Ends the game you own, or, if admin, ends 'all' games or a game with a specific ID.
 * @param {*} msg The command message.
 * @param {*} args The arguments on the command. Only used for admins who want to end games they do not own.
 * @param {*} guildData The cached data for the guild this message is coming from. (In this case, it uses the prefix)
 */
module.exports.run = async (bot, msg, args, con, guildData) => {
    const option = args[0] ? args[0].toLowerCase() : null;
    const isAdmin = msg.channel.permissionsFor(msg.author).has('ADMINISTRATOR');

    //get games in a guild
    let games = Game.getGames(msg.guild);

    //If they did not include an option, they must have wanted to end their own game.
    if (!option || !isAdmin) {
        //loop through games for theirs
        for (let g in games.array()){
            let _temp = games.array()[g];
            if (_temp.owner.id == msg.author.id && _temp.state != 2) {
                _temp.state = 2;
                Game.setGame(games.keyArray()[g], _temp);

                msg.channel.send("✅ Ended " + games.array()[g].gametype.name + " game.");
                return;
            }
        }
        msg.channel.send("❌ You are not running any games.").then(msg2 => msg2.delete({ timeout: 7000 }));
        return;
    }

    if (option == "all") {
        for (let g in games.array()) {
            let _temp = games.array()[g];
            _temp.state = 2;
            _temp.timeleft = 0;
            Game.setGame(games.keyArray()[g], _temp); 
        }
        msg.channel.send("✅ Ended all games.");
    } else {
        if (isNaN(option))
            msg.channel.send("❌ That is not a valid numeric ID. To view all games and their IDs, run `" + guildData.prefix + "current`.").then(msg2 => msg2.delete({ timeout: 10000 }));
        else {
            let game = games.get(option);

            if (!game){
                msg.channel.send("❌ That is not a valid numeric ID. To view all games and their IDs, run `" + guildData.prefix + "current`.").then(msg2 => msg2.delete({ timeout: 10000 }));
                return;
            }

            game.state = 2;
            game.timeleft = 0;
            Game.setGame(option, game); 
            msg.channel.send("✅ Ended game `" + game.gametype.name + "`");
            return;
        }
    }
}

module.exports.info = {
    name: "end"
}
