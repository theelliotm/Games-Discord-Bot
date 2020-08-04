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

	//get guild data from cache
	this.fetchCachedData(msg.guild.id).then(function (guildData) {

		//Check if its inplayu a guild
		if (!guildData) return;

		let _mentions = msg.mentions.users.keyArray();

		if (_mentions.indexOf(client.user.id) > -1 && _mentions.length == 1) {
			msg.channel.send("My prefix for this guild is " + (guildData.prefix == "" ? "currently nothing." : "`" +  guildData.prefix + "`") + "\nYou can get the prefix at any time by mentioning me.")
			return;
		}

		//Check if not command
		if (!msg.content.indexOf(guildData.prefix) == 0) return;

		let messageArray = msg.content.slice(guildData.prefix.length).split(" ");
		let cmd = messageArray[0];
		let cmdfile = client.commands.get(cmd);
		if (cmdfile) {
			if (cmdfile.info.inDMs)
				if (cmdfile.info.inDMs != isDms) return;
			let args = messageArray.slice(1);
			cmdfile.run(client, msg, args, connection, guildData);
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

				let _prefix = 'g!', lastUpdated = new Date().getTime();

				if (rows.length < 1)
					connection.query(`INSERT INTO guilds (id, prefix) VALUES (?, 'g!')`, [id], (_err, _rows) => { }); //if data is not found, insert defaults
				else {
					_prefix = rows[0].prefix;
					lastUpdated = rows[0].last_updated;
				}

				let json = {
					time: new Date().getTime(),
					lastUpdated: lastUpdated,
					prefix: _prefix
				};

				guildCache.set(id, json);
				resolve(json);
			});
		}
	});
}
