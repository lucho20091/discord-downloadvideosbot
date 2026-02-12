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
// once bot has initialized it console logs the username
client.once("clientReady", () => {
  console.log(`Bot online as ${client.user.tag}`);
});
// it listens on messages
client.on("messageCreate", async (message) => {
  // if the author of the message is a bot it doesnt do anything
  if (message.author.bot) return;
  // it separates the messages in 3 arguments using spaces
  const args = message.content.split(" ");
  const command = args[0];
  const link = args[1];
  const quality = args[2] || null;
  // if the command is not !video it doesnt do anything
  if (command !== "!video") return;
  // if it has the command but no link it doesnt do anything
  if (!link) return;
  // if there is a third argument it formats the quality of the video else just selects the best quality available
  const format = quality
    ? `bv*[height<=${quality}]+ba/b[height<=${quality}]`
    : "bv+ba/b";
  // it creates a random id
  const id = crypto.randomBytes(4).toString("hex");
  // it selects a directory and a filename
  const outputTemplate = path.join(__dirname, `video_${id}.%(ext)s`);
  const cmd = `yt-dlp -f "${format}" --merge-output-format mp4 -o "${outputTemplate}" "${link}"`;
  exec(cmd, async (err, stdout, stderr) => {
    if (err) {
      console.log(stderr);
      return;
    }
    const files = fs
      .readdirSync(__dirname)
      .filter((f) => f.startsWith(`video_${id}`));
    if (!files.length) return;
    const filePath = path.join(__dirname, files[0]);
    try {
      const stats = fs.statSync(filePath);
      const sizeMB = stats.size / (1024 * 1024);
      if (sizeMB > 10) {
        fs.unlinkSync(filePath);
        return;
      }
      await message.channel.send({
        files: [filePath],
      });
      fs.unlinkSync(filePath);
    } catch (e) {
      console.error(e);
    }
  });
});

client.login(process.env.DISCORD_TOKEN);
