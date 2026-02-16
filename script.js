require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawn } = require("child_process");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  rest: {
    timeout: 300000, // 5 minutes
  },
});
// array of phrases
const phrases = [
  "ya quedó mi rey 🤴",
  "¿no hay nadie mas disponible? 😖",
  "solo deseo servir 🤖",
  "obedezco con gusto 🥰",
];
// once bot has initialized display the username to the console
client.once("clientReady", () => {
  console.log(`Bot online as ${client.user.tag}`);
});
// bot listens on messages
client.on("messageCreate", async (message) => {
  // if the author of the message is a bot dont do anything
  if (message.author.bot) return;
  // separate the message in arguments using spaces
  const args = message.content.split(" ");
  const command = args[0];
  const complement = args[1];
  // if command is !video and there is a second argument call function
  if (command == "!video" && complement) {
    // validate is an url
    if (!isValidUrl(complement)) {
      message.reply("link inválido 🤡");
      return;
    }
    const quality = args[2] || null;
    const ok = await checkVideoDuration(complement, message);
    if (!ok) return;

    downloadVideo(complement, quality, message);
  }
});
// function to download videos
function downloadVideo(link, quality, message) {
  // if quality not null use that to format video else just use best available format
  const format = quality
    ? `bv*[height<=${quality}]+ba/b[height<=${quality}]`
    : "bv+ba/b";
  const id = crypto.randomBytes(4).toString("hex");
  const outputTemplate = path.join(__dirname, `video_${id}.%(ext)s`);
  // create the command to download the video we pass: format, the desired output path and filename, and the link of the video
  const args = [
    "-f",
    format,
    "--merge-output-format",
    "mp4",
    "-o",
    outputTemplate,
    link,
  ];
  const proc = spawn("yt-dlp", args, { shell: false });
  // warnings
  proc.stderr.on("data", (d) => console.log(d.toString()));
  // exit code
  proc.on("close", async (code) => {
    if (code !== 0) return;

    const files = fs
      .readdirSync(__dirname)
      .filter((f) => f.startsWith(`video_${id}`));
    // if no file dont do anything else
    if (!files.length) return;

    const filePath = path.join(__dirname, files[0]);

    try {
      const stats = fs.statSync(filePath);
      // get video size
      const sizeMB = stats.size / (1024 * 1024);
      // if video size is more than 10MB remove and dont do anything else
      if (sizeMB > 10) {
        fs.unlinkSync(filePath);
        await listAvailableQualities(link, message);
        return;
      }

      // send video as a reply
      await message.reply({
        files: [filePath],
        content: phrases[Math.floor(Math.random() * phrases.length)],
        tts: true,
      });
      // remove file
      fs.unlinkSync(filePath);
    } catch (e) {
      // display error and dont do anything else
      console.error(e);
    }
  });
}

// function to check if url is valid
function isValidUrl(str) {
  try {
    const u = new URL(str);
    return ["http:", "https:"].includes(u.protocol);
  } catch {
    return false;
  }
}
// function to check video duration
function checkVideoDuration(link, message) {
  return new Promise((resolve) => {
    const args = ["--print", "duration", link];
    const proc = spawn("yt-dlp", args, { shell: false });

    let output = "";

    proc.stdout.on("data", (d) => {
      output += d.toString();
    });

    proc.on("close", async () => {
      const durationSec = parseInt(output.trim(), 10);

      if (!durationSec) {
        message.reply("error validando duracion de video");
        return resolve(false);
      }

      const maxSeconds = 5 * 60; // 5 minutes

      if (durationSec > maxSeconds) {
        message.reply("duracion excede 5 minutos 😞");
        return resolve(false);
      }

      resolve(true);
    });
  });
}
// function to list available qualities for video
function listAvailableQualities(link, message) {
  return new Promise((resolve) => {
    const args = ["--list-formats", link];
    const proc = spawn("yt-dlp", args, { shell: false });

    let output = "";

    proc.stdout.on("data", (d) => {
      output += d.toString();
    });

    proc.on("close", () => {
      // buscar resoluciones tipo 1920x1080 o solo 1080p
      const heights = new Set();

      const lines = output.split("\n");

      for (const line of lines) {
        // match 1920x1080
        const match = line.match(/(\d{3,4})x(\d{3,4})/);
        if (match) {
          heights.add(parseInt(match[2]));
        }

        // match 1080p
        const matchP = line.match(/(\d{3,4})p/);
        if (matchP) {
          heights.add(parseInt(matchP[1]));
        }
      }

      const sorted = Array.from(heights)
        .filter((n) => !isNaN(n))
        .sort((a, b) => a - b);

      if (!sorted.length) {
        message.reply(
          "Video excede 10MB, no pude detectar calidades disponibles",
        );
        return resolve();
      }

      message.reply(
        `Video excede 10MB, Hay estas calidades disponibles: ${sorted.join(", ")}`,
      );
      message.reply(`prueba de nuevo con !video ${link} <numero>`);

      resolve(sorted);
    });
  });
}

// iniatilize discord bot
client.login(process.env.DISCORD_TOKEN);

// command to check available quality for video
// yt-dlp --list-formats <video_url>
