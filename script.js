require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});
// once bot has initialized it displays the username to the console
client.once("clientReady", () => {
  console.log(`Bot online as ${client.user.tag}`);
});
// bot listens on messages
client.on("messageCreate", async (message) => {
  // if the author of the message is a bot dont do anything
  if (message.author.bot) return;
  // separate the messages in 3 arguments using spaces
  const args = message.content.split(" ");
  const command = args[0];
  const link = args[1];
  const quality = args[2] || null;
  // if the command is not !video  dont do anything
  if (command !== "!video") return;
  // if it has the command but no link dont do anything
  if (!link) return;
  // if there is a third argument it formats the quality of the video else just selects the best quality available
  const format = quality
    ? `bv*[height<=${quality}]+ba/b[height<=${quality}]`
    : "bv+ba/b";
  // create a random id
  const id = crypto.randomBytes(4).toString("hex");
  // select a path and a filename
  const outputTemplate = path.join(__dirname, `video_${id}.%(ext)s`);
  // create the command to download the video we pass the format, the desired output path and filename, and the link of the video
  const cmd = `yt-dlp -f "${format}" --merge-output-format mp4 -o "${outputTemplate}" "${link}"`;
  // execute the command
  exec(cmd, async (err, stdout, stderr) => {
    // if error display the error message and dont do anything else
    if (err) {
      console.log(stderr);
      return;
    }
    // check if the file exists
    const files = fs
      .readdirSync(__dirname)
      .filter((f) => f.startsWith(`video_${id}`));
    // if no file dont do anything else
    if (!files.length) return;
    // get the filepath
    const filePath = path.join(__dirname, files[0]);
    try {
      // get the stats of the outputed video
      const stats = fs.statSync(filePath);
      // get the size in MB of the video
      const sizeMB = stats.size / (1024 * 1024);
      // if the size is larger than 10MB remove the file and dont do anything else
      if (sizeMB > 10) {
        fs.unlinkSync(filePath);
        return;
      }
      // send the file to the discord server
      await message.channel.send({
        files: [filePath],
      });
      // remove the file
      fs.unlinkSync(filePath);
    } catch (e) {
      // if error display the error message and dont do anything else
      console.error(e);
    }
  });
});
// iniatilize discord bot
client.login(process.env.DISCORD_TOKEN);
