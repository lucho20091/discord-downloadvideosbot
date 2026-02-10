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

client.once("clientReady", () => {
  console.log(`Bot online as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const args = message.content.split(" ");
  const command = args[0];
  const link = args[1];
  const quality = args[2] || "720";

  if (command !== "!video") return;
  if (!link) return;

  const id = crypto.randomBytes(4).toString("hex");
  const outputTemplate = path.join(__dirname, `video_${id}.%(ext)s`);
  const cmd = `yt-dlp -f "bv*[height<=${quality}]+ba/b[height<=${quality}]" --merge-output-format mp4 -o "${outputTemplate}" "${link}"`;
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
