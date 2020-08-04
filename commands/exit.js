//# Written and Developed by Xcallibur
//# © 2020 Xcallibur

const Game = require("./play")

/**
 * Allows a player to exit their current game. If they are the owner, the game is ended. If the game no longer has enough players, it is ended.
 * Might disable if abuse occurs.
 * @param {*} msg The command message.
 * @param {*} args The arguments on the command.
 */
module.exports.run = async (bot, msg, args, con) => {
    const option = args[0] ? args[0].toLowerCase() : null;
    const isAdmin = msg.channel.permissionsFor(msg.author).has('ADMINISTRATOR');

    //get games in current guild
    let games = Game.getGames(msg.guild);

    //If they did not include an option, they must have wanted to end their own game.
    if (!option) {
        //loop through games for theirs
        for (var g in games.array()) {
            let _temp = games.array()[g];
            if (_temp.queued.map(m => m.id).indexOf(msg.author.id) > -1 && _temp.state != 2) {

                if (_temp.currentturn == msg.author.id)
                    _temp.actions.push("exit")
                else {
                    const exitIdx = _temp.queued.map(m => m.id).indexOf(msg.author.id);
                    if (exitIdx > -1) {
                        _temp.queued.splice(exitIdx, 1);

                        if (_temp.owner.id == msg.author.id) {
                            _temp.state = 2;
                            msg.channel.send("✅ Ended " + games.array()[g].gametype.name + " game.");
                        } else {
                            msg.channel.send("✅ Exited " + games.array()[g].gametype.name + " game.");
                        }

                    } else {
                        msg.channel.send("❌ Error not found.").then(msg2 => msg2.delete({ timeout: 7000 }));
                        return;
                    }
                }

                Game.setGame(games.keyArray()[g], _temp);
                return;
            }
        }
        msg.channel.send("❌ You are not in any games.").then(msg2 => msg2.delete({ timeout: 7000 }));
        return;
    }
}

module.exports.info = {
    name: "exit",
    inDMs: false
}
