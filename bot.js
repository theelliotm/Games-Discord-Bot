//# Written and Developed by Xcallibur
//# © 2020 Xcallibur

const Discord = require('discord.js');
const mysql = require("mysql");
const token = require("./token.json");
const fs = require("fs");

const connection = mysql.createConnection({
	host: token.host,
	user: token.databaseuser,
	password: token.pass,
	database: token.database,
	port: token.port
});

connection.connect(err => {
	if (err) throw err;
	console.log("Connection With Database Established.");
});

const client = new Discord.Client();
const guildCache = new Discord.Collection();
const messageTimings = new Discord.Collection();
const rateLimit = new Discord.Collection();
client.commands = new Discord.Collection(); //Contains files with large commands.

/**
 * Loops through all files in the /commands/ folder and adds them to `client.commands`
 */
fs.readdir("./commands/", (err, files) => {
	if (err) console.log(err);
	//removes period to get command name
	let jsfile = files.filter(f => f.split(".").pop() === "js")
	if (jsfile.length <= 0) {
		console.log("No commands in dir.");
		return;
	}
	//registers commands
	jsfile.forEach((f, i) => {
		let props = require(`./commands/${f}`);
		console.log(`${f} has loaded.`);
		if (props.info.name)
			client.commands.set(props.info.name, props);
		else if (props.info.names)
			for (var i in props.info.names)
				client.commands.set(props.info.names[i], props);
	});
});

client.on('ready', () => {
	console.log(`Bot ready!`)
	client.user.setActivity(' games. g!');
})

client.on('message', async msg => {
	if (msg.author.bot) return;

	//cannot be in DM, that will be handled with message collectors
	if (msg.channel.type === "dm") return;

	if (!msg.channel.permissionsFor(client.user).has('SEND_MESSAGES', true)) return;

	//get guild data from cache
	this.fetchCachedData(msg.guild.id).then(function (guildData) {
		//Check if its inplayu a guild
		if (!guildData) return;

		let _mentions = msg.mentions.users.keyArray();
		if (_mentions.indexOf(client.user.id) > -1 && _mentions.length == 1) {
			msg.channel.send("My prefix for this guild is " + (guildData.prefix == "" ? "currently nothing." : "`" + guildData.prefix + "`") + "\nYou can get the prefix at any time by mentioning me.");
			return;
		}

		/*Check if not command*/
		if (!msg.content.indexOf(guildData.prefix) == 0) return;

		if (!messageTimings.has(msg.author.id))
			messageTimings.set(msg.author.id, []);

		/*Evaluating command*/
		let messageArray = msg.content.slice(guildData.prefix.length).split(" ");
		let cmd = messageArray[0];
		let cmdfile = client.commands.get(cmd);
		if (cmdfile) {
			if (!msg.channel.permissionsFor(msg.author).has('ADMINISTRATOR') && cmdfile.info.adminOnly)
				return;

			/*Rate Limiting*/
			messageTimings.get(msg.author.id).unshift(new Date().getTime());
			messageTimings.get(msg.author.id).splice(3); /*limit to 3 messages to spam*/

			let isRateLimiting = [];
			if (messageTimings.get(msg.author.id).length >= 3)
				for (let i = 0; i < messageTimings.get(msg.author.id).length - 1; i++)
					isRateLimiting[i] = (messageTimings.get(msg.author.id)[i] - 1000 < messageTimings.get(msg.author.id)[i + 1]);

			if (isRateLimiting.length >= 2 && isRateLimiting.indexOf(false) == -1 && !(rateLimit.has(msg.author.id) && rateLimit.get(msg.author.id) + 5000 > new Date().getTime())) {
				rateLimit.set(msg.author.id, new Date().getTime());
				msg.channel.send("⏱ You are being ratelimited!").then(msg2 => msg2.delete({ timeout: 7000 }));
			}

			if (rateLimit.has(msg.author.id) && rateLimit.get(msg.author.id) + 5000 > new Date().getTime()) return;

			/*Check Permissions */
			if (cmdfile.info.perms_needed){
				if (!msg.channel.permissionsFor(client.user).has(cmdfile.info.perms_needed, true)) {
					msg.channel.send("❌ I do not have the required permissions to run this command. If you are an admin, please give me the `Administrator` permission.");
					return;
				}
			} else {
				if (!msg.channel.permissionsFor(client.user).has('ADMINISTRATOR')) {
					msg.channel.send("❌ I do not have the required permissions to run this command. If you are an admin, please give me the `Administrator` permission.");
					return;
				}
			}

			cmdfile.run(client, msg, messageArray.slice(1), connection, guildData);
			return;
		}
	}, function (err) {
		console.log(err);
	});
})

client.login(token.token)

/**
 * Caches and/or grabs cached data about a guild.
 * @param {*} id The guild ID
 * @param {Boolean} force Wether or not to force the recaching of data. Useful if, for example, an admin updates the prefix and you want it to update immediately.
 * @returns A promise of the guild data.
 */
module.exports.fetchCachedData = async (id, force) => {
	return new Promise(function (resolve, reject) {
		if (!id) reject("ID Error");
		let _cacheIdx = guildCache.keyArray().indexOf(id);
		if (_cacheIdx > -1 && (new Date().getTime() - guildCache.array()[_cacheIdx].time) < 3600000 && !force) {
			resolve(guildCache.array()[_cacheIdx]);
		} else {
			if (!client.guilds.resolveID(id))
				reject("Could not resolve guild.");

			connection.query(`SELECT * FROM guilds WHERE id = '${id}'`, (err, rows) => {
				if (err) reject(err);

				let _prefix = 'g!', _lastUpdated = new Date().getTime(), _eventID = null, _eventName = null, _eventPaused = false, _eventGame = null;

				if (rows.length < 1)
					connection.query(`INSERT INTO guilds (id, prefix) VALUES (?, 'g!')`, [id], (_err, _rows) => { }); //if data is not found, insert defaults
				else {
					_prefix = rows[0].prefix;
					_lastUpdated = rows[0].last_updated;
					_eventID = rows[0].event_id;
					_eventName = rows[0].event_name;
					_eventPaused = rows[0].event_paused;
					_eventGame = rows[0].event_game;
				}

				let json = {
					time: new Date().getTime(),
					lastUpdated: _lastUpdated,
					prefix: _prefix,
					eventID: _eventID,
					eventName: _eventName,
					eventPaused: _eventPaused == 0 ? false : true,
					eventGame: _eventGame
				};

				guildCache.set(id, json);
				resolve(json);
			});
		}
	});
}
