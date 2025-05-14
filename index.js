const Discord = require("discord.js");
const config = require("./config.json");
const { QuickDB } = require("quick.db");
const db = new QuickDB();

const client = new Discord.Client({
  intents: [
    Discord.GatewayIntentBits.Guilds,
    Discord.GatewayIntentBits.GuildMembers,         // Necessário para guildMemberAdd e autorole
    Discord.GatewayIntentBits.GuildMessages,        // Necessário para enviar mensagens em canais
    Discord.GatewayIntentBits.MessageContent
  ],
});

// Anexa o banco de dados ao client
client.db = db;


module.exports = client;

client.on("interactionCreate", (interaction) => {
  if (interaction.type === Discord.InteractionType.ApplicationCommand) {
    const cmd = client.slashCommands.get(interaction.commandName);

    if (!cmd) return interaction.reply(`Error`);

    interaction["member"] = interaction.guild.members.cache.get(interaction.user.id);

    cmd.run(client, interaction);
  }
});

client.on("ready", () => {

  console.log(`${client.user.username} ligado e syncando com todos os servidores!`);
  console.log(`Syncado em ${client.guilds.cache.size} servidores!`);

  const activities = [
    { name: "Sistema de Bate Ponto", type: Discord.ActivityType.Watching },
    { name: "© Desenvolvido por: uknwxx", type: Discord.ActivityType.Watching },
    { name: "Entre: https://discord.gg/ZwfEjsApHq", type: Discord.ActivityType.Watching },

  ];

  let i = 0;
  client.user.setPresence({ status: "dnd", activities: [activities[0]] });

  setInterval(() => {
    i = (i + 1) % activities.length;
    client.user.setPresence({ status: "dnd", activities: [activities[i]] });
  }, 15000); // 15 segundos
});
// Captura erros do client
client.on("error", (err) => {
  console.error("Erro no client:", err);
});

// Captura promessas não tratadas
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection:", reason);
});


client.slashCommands = new Discord.Collection();

require("./handler")(client);

const fs = require("fs");

fs.readdir("./Events", (err, file) => {
  file.forEach((event) => {
    require(`./Events/${event}`);
  });
});

client.login(config.token);