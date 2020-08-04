# Contributing Guidelines

### Contents
* [1. Introduction](#1-introduction)
* [2. Rules](#2-rules-of-the-road)
* [3. Where To Start](#3-where-to-start)
  * [3.1 Contributing Steps](#31-contributing-steps)
  * [3.2 How to submit a Pull Request Properly](#32-submitting-a-pr)
  * [3.3 Testing](#33-testing)
  * [3.4 Testing Without A Database](#34-testing-without-a-database)
* [4. Libraries and Workflow](#4-libraries-and-workflow)
  * [4.1 Installing libraries](#41-installing-libraries)
  * [4.2 Workflow and Project Structure](#42-workflow-and-project-structure)
* [5. Submitting a Bug Report](#5-submitting-a-bug-report)
* [6. Submitting an Improvement/Feature Request](#6-submitting-an-improvement-or-a-feature-request)
* [7. Joining the Community](#7-community)

# 1. Introduction
**Welcome!** Thank you for contributing to the Games Bot. We love seeing people bringing creative and unique ideas to the table, as well as assisting with the future development of the bot.
These guidelines will assist you in contributing to this open source project.

# 2. Rules of the Road
1. Submit good, commented code.
2. Explain your changes in detail.
3. Adhere to the [GitHub Community Guidelines](https://docs.github.com/en/github/site-policy/github-community-guidelines)
4. Unless you are fixing a major bug, always Pull Request to the Development branch. (Make sure the branch you started coding from is the same you PR to, otherwise it will be denied!)
5. [These steps](https://gist.github.com/MarcDiethelm/7303312) should be followed.
6. Test your code before submitting a PR.
7. Do not submit code you did not write.
8. Do not attempt to overwrite large portions of the bot at once.
9. Do not submit buggy, bulky code.
10. If submitting a bug report or feature request, keep it clear and focused on that issue.

# 3. Where To Start
If you want to start small, here are a few things you can look at.

- Any unassigned issues marked as `good first issue`
- Any unassigned issue marked `help wanted`
- Any feature or command which is simple to implement

Once you have an idea, we can begin making changes 😄

### 3.1 Contributing Steps

1. Create a fork of the repository.
2. Create your own branch from `dev` (`master` ONLY if it's a major bug).
3. Create a token.json file from the templates folder in the root directory. You'll need to add a Discord Bot token and database credientials (if you cannot use a database, [see below]()).
4. Fix the issue or create the feature with clean and concise code.
5. Test, test, test! More information [below](#33-testing).
6. Document and comment your code.

### 3.2 Submitting a PR

1. Commit to your branch with descriptive information on what you changed.
2. Push your branch to the forked repository if you have not already.
3. In this repository, select Pull Requests at the top and open a new one.
4. Select `Compare Across Forks` in the menu description.
5. On the right of the arrow, choose your fork and your branch.
6. On the left of the arrow, choose this repository and the branch you pulled from. (Most likely `dev`)
7. Once done, select `Create Pull Request`
8. Now title and describe your feature/fix and select `Create Pull Request` one last time.
9. Wait for me to review it.

### 3.3 Testing
Testing is simple. If you're testing a command, simply start up the bot (`start.bat` on Windows) and run it. If you're testing a game, you might need more people. Recruit a friend or someone else ([maybe on the official server?](https://discord.gg/gSeEYNk)) and demo through it several times to knock out any bugs before submission.

### 3.4 Testing Without A Database
If you need to test without access to a database, comment out the `connection.connect` function in `bot.js`.

Afterwards, comment out the function header for `this.fetchCachedData` under `client.on('message', async msg => {`. Also comment out ```if (!guildData) return;```, ```if (!msg.content.indexOf(guildData.prefix) == 0) return;```, and replace ```let messageArray = msg.content.slice(guildData.prefix.length).split(" ");``` with ```let messageArray = msg.content.split(" ");```

- Note: Commands that require a database, like leaderboard, will not work! Games will most likely error when trying to connect to the database (only when a game ends) as well.

# 4. Libraries and Workflow
## 4.1 Installing Libraries
The Games Bot runs on [Discord.js](https://discord.js.org/), an open-source Discord bot library that interfaces between the bot's code and Discord's official API.

Discord.js runs on [Node.js](https://nodejs.org/en/), a popular and powerful JavaScript tool used for everything from Facebook to Twitch.

Go through the install process of Node.js, and then install Discord.js (through [npm](https://www.npmjs.com/), a package manager).
You'll also need [Nodemon](https://nodemon.io/), a Node.js server to start it up.

Other libraries to install: [`fs`](https://www.npmjs.com/package/fs), [`canvas`](https://www.npmjs.com/package/canvas), and [`mysql`](https://www.npmjs.com/package/mysql).

## 4.2 Workflow and Project Structure
The Games Bot was built using a specific structure. Each command and game is it's own file, managed through the library `fs`. This layout is
optimal to make sure each file is clean and easy to read.

You can find template command and game files in the template folder at root.
You can use these to being coding a new command, game, feature, etc.
It is recommended that you stick to the overall structure of the templates and other games in the project.

Game sprites should also be located within a folder of the same game name in the `/commands/games` folder.

# 5. Submitting a Bug Report

1. Go to the Issues tab.
2. Select `New Issue`, and then `Get Started` under Bug Report.
3. Title it with the prefix `[BUG]`
4. Fill in the template with relevant information.
5. Add any screenshots if possible.
6. Select `Submit New Issue`

**Note:** Do not submit empty or messy bug reports.

# 6. Submitting An Improvement or a Feature Request

1. Go to the Issues tab
2. Select `New Issue`, and then `Get Started` under Feature Request.
3. Title it.
4. Fill in the template with as much information about what you want as possible.
5. Add any pertinent images, drawings, etc.
6. Select `Submit New Issue`
7. It will be marked as `Not Reviewed` until I can look over it.

**Note:** Any feature requests that are messy or unclear will be disregarded.

# 7. Community
You can chat with the me and other community members, play games, and recruit testers on our [Discord Server](https://discord.gg/gSeEYNk)! 🙂
