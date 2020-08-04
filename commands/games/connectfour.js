//# Written and Developed by Xcallibur
//# © 2020 Xcallibur

const Discord = require("discord.js");
const Canvas = require("canvas");
const GameJS = require("../play.js");

module.exports.run = async (bot, id, gmsg, con) => {
  let game = GameJS.vars.currentGames.get(id);
  let embed = gmsg.embeds[0];
  if (game.gametype.name != "Connect Four" || game.state != 1)
    return;

  //7 wide 6 tall board
  let board = new Array(7); //length
  for (let i = 0; i < board.length; i++)
    board[i] = []; //height

  //Player 0 is red, Player 1 is yellow
  let forfeits = new Discord.Collection();
  let time = 0, timeSinceLastAction = 0;
  let currentPlayer = game.queued[0], isAI = game.queued.length == 1, totalturns = -1, warned = false;
  let changed = true, lastAction = "The game has started.", isCalculating = false;

  /*
   * Creates message collectors in each DM to react when an action is passed through.
   */
  for (let p in game.dmMessages) {
    let currentDMMsg = game.dmMessages[p];
    const filter = m => m.author.id != bot.user.id;
    const actionCollector = currentDMMsg.channel.createMessageCollector(filter, { time: 3600000 });

    actionCollector.on('collect', collected => {
      if (game.state == 2) {
        actionCollector.stop();
        return;
      }
      if (game.queued.map(q => q.id).indexOf(collected.author.id) > -1) {

        if ((currentPlayer !== 'AI' && currentPlayer.id == collected.author.id) && game.state == 1)
          game.actions.push(collected.content);
        else
          collected.author.send("❌ It is not your turn!").then(msg2 => msg2.delete({ timeout: 10000 }));

      } else {
        collected.author.send("❌ You are not in the game.").then(msg2 => msg2.delete({ timeout: 10000 }));
        actionCollector.stop();
      }
    });
  }

  let interval = setInterval(function () {
    game.currentturn = (currentPlayer === "AI" ? "AI" : currentPlayer.id);

    if (game.state == 2) {
      embed.setDescription("The game has ended.");
      gmsg.edit(embed);

      for (let g in game.queued)
        game.queued[g].send("⚠ The game has been ended.");

      GameJS.addGameToDatabase(con, id, game, null, game.queued.map(m => m.id));
      clearInterval(interval);
      return;
    }

    if (game.queued.length === 1 && isAI != true) {
      game.state = 2;
      embed.setDescription("Not enough players remain!");
      gmsg.edit(embed);

      for (let g in game.queued)
        game.queued[g].send("⚠ The game has ended as not enough players remain.");

      GameJS.addGameToDatabase(con, id, game, null, game.queued.map(m => m.id));
      clearInterval(interval);
      return;
    }

    time++;
    timeSinceLastAction++;
    
    if (time > 3600) {
      game.state = 2;
      embed.setDescription("The game has reached its time limit.");
      gmsg.edit(embed);
      GameJS.addGameToDatabase(con, id, game, null, game.queued.map(m => m.id));
      clearInterval(interval);
      return;
    }

    if(timeSinceLastAction > 150 && !warned && currentPlayer !== "AI"){
      currentPlayer.send("⌛ You have 30 seconds to move before your turn is forfeited.").then(msg2 => msg2.delete({ timeout: 7000 }));
      warned = true;
    }

    if (timeSinceLastAction > 180) {
      if(currentPlayer !== "AI"){
        lastAction = "<@!" + currentPlayer.id + "> forfeited their turn.";
        forfeits.set(currentPlayer.id, forfeits.has(currentPlayer.id) ? forfeits.get(currentPlayer.id) + 1 : 1);
        if(forfeits.get(currentPlayer.id) >= 3){
          currentPlayer.send("⌛ You forfeited the game.");
          let other = game.queued[currentPlayer.id === game.queued[0].id ? isAI ? "AI" : 1 : 0];
          if(other !== "AI") other.send("⚠ The other player forfeited the game.");
          game.state = 2;
          lastAction = "<@!" + currentPlayer.id + "> forfeited the game."
        } else currentPlayer.send("❌ You waited too long.").then(msg2 => msg2.delete({ timeout: 7000 }));
      } else lastAction = "**The AI** forfeited its turn."; //should only happen if it completely locks up D:
      advanceTurn();
      changed = true;
    }

    /*
     * Reacts when a player sends an action.
     */
    if (game.actions[totalturns + 1]) {
      let colNumber = game.actions[totalturns + 1];
      if (isNaN(colNumber)) {
        currentPlayer.send("❌ Not a valid number!").then(msg2 => msg2.delete({ timeout: 7000 }));
        game.actions.pop();
      } else {
        if (colNumber < 1 || colNumber > 7) {
          currentPlayer.send("❌ Valid column numbers are between 1 and 7!").then(msg2 => msg2.delete({ timeout: 7000 }));
          game.actions.pop();
        } else {
          if (board[colNumber - 1].length >= 6) {
            currentPlayer.send("❌ That column is full!").then(msg2 => msg2.delete({ timeout: 7000 }));
            game.actions.pop();
          } else {
            board[colNumber - 1].push(currentPlayer === "AI" || currentPlayer == game.queued[1] ? "y" : "r");
            currentPlayer.send("✅ Played at column **" + colNumber + "**!").then(msg2 => msg2.delete({ timeout: 7000 }));
            if(forfeits.has(currentPlayer)) forfeits.set(currentPlayer, 0);
            lastAction = "<@!" + currentPlayer.id + "> played at column **" + colNumber + "**";
            advanceTurn();
            changed = true;
          }
        }
      }
    }

    // if (currentPlayer === "AI" && !isCalculating && !game.actions[totalturns + 1])
    //   calculateAIMove();

    if (changed) {
      changed = false;
      let checkWin = calculateFourInARow();

      calcImage().then((imgAttachment) => {
        if (!imgAttachment)
          console.log("Error creating connectfour image attachment!");
          
        let winner;
        if (checkWin) {
          if (checkWin === "r")
            winner = game.queued[0];
          else if (checkWin === "y")
            winner = isAI ? "AI" : game.queued[1];
          if (winner) {
            updateEmbeds(true);
            game.state = 2;
            GameJS.addGameToDatabase(con, id, game, (winner === "AI" ? null : winner.id), game.queued.map(m => m.id));
            clearInterval(interval);
          }
        } else {
          embed = new Discord.MessageEmbed()
            .setTitle(embed.title)
            .addField("Last Action", lastAction, true)
            .setFooter("Owner: " + game.owner.tag, game.owner.avatarURL());
          updateEmbeds();
        }

        /**
         * Updates spectator and DM embeds with new image and data.
         * @param {boolean} forWinner If the embed needs to display the winner.
         */
        async function updateEmbeds(forWinner) {
          let updatedSpectator = false;
          for (let _m in game.dmMessages) {
            let _message = game.dmMessages[_m];
            if (_message.channel.recipient) {
              if (game.queued.map(m => m.id).indexOf(_message.channel.recipient.id) > -1) {
                if (currentPlayer !== "AI" && currentPlayer.id == _message.channel.recipient.id)
                  embed.setAuthor("It Is Your Turn!");
                else
                  embed.setAuthor("Current Turn: " + (currentPlayer === "AI" ? "AI" : currentPlayer.tag))
                embed.setDescription(forWinner ? "**WINNER: ** __" + (winner === "AI" ? "AI 🤖" : "<@" + winner.id + ">") + "__" : "In-Game");
                if (forWinner) {
                  embed.spliceFields(0, 2);
                  embed.addField("Last Action", lastAction, true)
                  console.log(lastAction);
                  embed.setAuthor("");
                } else embed.spliceFields(1, 1);

                embed.addField("Your Color", _message.channel.recipient.id === game.queued[0].id ? "Red" : "Yellow", true);
                embed.setImage('attachment://checkers-donotshare-' + currentPlayer.id + '.png');
                await game.dmMessages[_m].delete().catch(console.error);
                _message.channel.send({ files: [imgAttachment], embed: embed }).then(async function (__dmmsg) {
                  game.dmMessages[_m] = __dmmsg;
                  if (!updatedSpectator) {
                    let att = __dmmsg.embeds[0].image;
                    if (att) {
                      embed.setImage(att.url);
                      embed.spliceFields(1, 1);
                      embed.setAuthor("Current Turn: " + (currentPlayer === "AI" ? "AI" : currentPlayer.tag));
                      if (!forWinner)
                        embed.setDescription("In-Game (Spectator)")
                      else
                        embed.setAuthor("");
                      gmsg.edit(embed);
                      updatedSpectator = true;
                    }
                  }
                }).catch(console.error);
              }
            }
          }
        }
      });
    }
  }, 1000);

  /**
   * Calculates the next move of the AI
   * Currently pushes a random number from 1 through 7, but logic needs to be added.
   * Not suitable for use as it doesn't check for full columns.
   */
  //TODO make this... actually have some logic
  //TODO have AI implement move before updating canvas
  async function calculateAIMove() {
    isCalculating = true;
    game.queued[0].dmChannel.startTyping(10);
    setTimeout(function () {
      game.queued[0].dmChannel.stopTyping(true);
      game.actions.push(Math.round((Math.random() * 6) + 1));
      isCalculating = false;
    }, 2000);
  }

  /**
   * Loops through the entire board to determine if there is a winner.
   * @author 4castle
   * @returns The player who won, if any.
   */
  //TODO slim this down to only calculate from single piece
  function calculateFourInARow() {
    const HEIGHT = 6;
    const WIDTH = 7;
    for (let r = 0; r < HEIGHT; r++) { // iterate rows, bottom to top
      for (let c = 0; c < WIDTH; c++) { // iterate columns, left to right
        let player = board[r][c];
        if (player == null)
          continue; // don't check empty slots

        if (c + 3 < WIDTH &&
          player == board[r][c + 1] && // look right
          player == board[r][c + 2] &&
          player == board[r][c + 3])
          return player;
        if (r + 3 < HEIGHT) {
          if (player == board[r + 1][c] && // look up
            player == board[r + 2][c] &&
            player == board[r + 3][c])
            return player;
          if (c + 3 < WIDTH &&
            player == board[r + 1][c + 1] && // look up & right
            player == board[r + 2][c + 2] &&
            player == board[r + 3][c + 3])
            return player;
          if (c - 3 >= 0 &&
            player == board[r + 1][c - 1] && // look up & left
            player == board[r + 2][c - 2] &&
            player == board[r + 3][c - 3])
            return player;
        }
      }
    }
    return null; // no winner found
  }

  /**
   * Promises the creation of a new image of the connect four board. 
   * @returns A promise of a MessageAttachment that contains an image of the current Connect Four board
   */
  async function calcImage() {
    return new Promise(function (resolve, reject) {
      const tokenDiameter = 43, displayDiameter = 46, imageSize = 400, bottomMargin = 33, leftMargin = 10, xSpace = 13, ySpace = 16;
      const canvas = Canvas.createCanvas(imageSize, imageSize);
      const ctx = canvas.getContext('2d');

      Canvas.loadImage("./commands/games/connectfour/red.png").then(tokenRed => {
        Canvas.loadImage("./commands/games/connectfour/yellow.png").then(tokenYellow => {
          Canvas.loadImage("./commands/games/connectfour/board.png").then(boardSprite => {
            if (boardSprite) {
              boardSprite.onerror = err => { throw err; };
              ctx.drawImage(boardSprite, 0, 0, imageSize, imageSize);
            } else reject("Could not find board sprite");

            for (let _x = 0; _x < 7; _x++)
              for (let _y = 0; _y < 6; _y++)
                if (board[_x][_y])
                  ctx.drawImage(board[_x][_y] === "r" ? tokenRed : tokenYellow, leftMargin + ((xSpace + tokenDiameter) * _x), imageSize - bottomMargin - ((ySpace + tokenDiameter) * _y) - tokenDiameter, displayDiameter, displayDiameter);

            resolve(new Discord.MessageAttachment(canvas.toBuffer(), 'checkers-donotshare-' + currentPlayer.id + '.png'));
          });
        });
      });
    });
  }

  /**
   * Moves the game forward a turn.
   */
  function advanceTurn(isForfeit) {
    warned = false;
    if(!isForfeit) totalturns++;
    timeSinceLastAction = 0;
    changed = true;
    if (isAI === true)
      currentPlayer = currentPlayer === "AI" ? game.queued[0] : "AI";
    else
      currentPlayer = game.queued[currentPlayer == game.queued[0] ? 1 : 0];
  }
}

/**
 * Returns game information relevant to the game handler.
 */
module.exports.info = {
  name: "connectfour",
  displayName: "Connect Four",
  description: "A " /*"1 (with AI) or"*/ + " 2 player game where you must put 4 pieces in a row diagonally, horizontally, or vertically.",
  minPlayers: 2,
  maxPlayers: 2,
  assetFolder: "connectfour",
  help: ["⚠ __Remember, all commands must be done in DMs__", "",
    "❓ The goal of Connect Four is to align four pieces in a row diagnoally, horizontally, or vertically. The first player to do so wins.", "",
    "🎮 To play, **type out the column number** you want to drop a piece down each turn."]
}
