const Discord = require("discord.js");
const { createCanvas } = require("canvas");
const client = require("../index");

client.on("interactionCreate", async (interaction) => {
  try {
    // Botão para gerar código
    if (interaction.isButton()) {
      if (interaction.customId.startsWith("gerar_codigo_")) {
        const cargoId = interaction.customId.split("_")[2];

        if (!interaction.deferred && !interaction.replied) {
          await interaction.deferReply({ ephemeral: true });
        }

        const code = generateRandomCode();
        const imageBuffer = await createCodeImage(code);

        // Garante que os códigos errados não sejam iguais ao correto
        let wrong1, wrong2;
        do { wrong1 = generateRandomCode(); } while (wrong1 === code);
        do { wrong2 = generateRandomCode(); } while (wrong2 === code || wrong2 === wrong1);

        const options = [
          { label: code, value: code },
          { label: wrong1, value: wrong1 },
          { label: wrong2, value: wrong2 },
        ].sort(() => Math.random() - 0.5);

        const selectverific = new Discord.ActionRowBuilder().addComponents(
          new Discord.StringSelectMenuBuilder()
            .setCustomId(`verificar_codigo_${cargoId}_${code}`)
            .setPlaceholder("Selecione o código correto")
            .addOptions(options)
        );

        await interaction.editReply({
          embeds: [
            new Discord.EmbedBuilder()
              .setColor("#2F3136")
              .setDescription("***SISTEMA DE VERIFICAÇÃO***\n\n > Selecione o código correto correspondente à imagem abaixo:")
              .setImage("attachment://codigo.png")
          ],
          components: [selectverific],
          files: [{ attachment: imageBuffer, name: "codigo.png" }],
        });
      }
    }

    // Select menu para verificar código
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId.startsWith("verificar_codigo_")) {
        if (!interaction.deferred && !interaction.replied) {
          await interaction.deferReply({ ephemeral: true });
        }

        const [_, cargoId, correctCode] = interaction.customId.split("_");
        const selectedCode = interaction.values[0];

        // Sempre remove o select menu e a imagem ao responder
        const cleanReply = {
          components: [],
          files: []
        };

        if (selectedCode === correctCode) {
          // Se for em servidor, tenta dar cargo
          if (interaction.guild) {
            const role = interaction.guild.roles.cache.get(cargoId);
            if (!role) {
              return interaction.editReply({
                embeds: [
                  new Discord.EmbedBuilder()
                    .setDescription("***SISTEMA DE VERIFICAÇÃO***\n\n > O cargo especificado não foi encontrado.")
                    .setColor("#FF0000"),
                ],
                ...cleanReply
              });
            }
            const member = interaction.member;
            if (member && member.roles) {
              await member.roles.add(role).catch(() => {});
              return interaction.editReply({
                embeds: [
                  new Discord.EmbedBuilder()
                    .setDescription(`***SISTEMA DE VERIFICAÇÃO***\n\n > Você selecionou o código correto e recebeu o cargo: ${role.name}.`)
                    .setColor("#2F3136"),
                ],
                ...cleanReply
              });
            } else {
              return interaction.editReply({
                embeds: [
                  new Discord.EmbedBuilder()
                    .setDescription("***SISTEMA DE VERIFICAÇÃO***\n\n > Não foi possível atribuir o cargo. Use esse comando em um servidor.")
                    .setColor("#FF0000"),
                ],
                ...cleanReply
              });
            }
          } else {
            // Se for DM, só responde com sucesso
            return interaction.editReply({
              embeds: [
                new Discord.EmbedBuilder()
                  .setDescription("***SISTEMA DE VERIFICAÇÃO***\n\n > Você selecionou o código correto! (Este sistema em DM não atribui cargos)")
                  .setColor("#2F3136"),
              ],
              ...cleanReply
            });
          }
        } else {
          return interaction.editReply({
            embeds: [
              new Discord.EmbedBuilder()
                .setDescription("***SISTEMA DE VERIFICAÇÃO***\n\n > Código incorreto! Tente novamente.")
                .setColor("#FF0000"),
            ],
            ...cleanReply
          });
        }
      }
    }
  } catch (err) {
    console.error("Erro no sistema de verificação:", err);
    if (interaction.replied || interaction.deferred) return;
    try {
      await interaction.reply({
        content: "Ocorreu um erro inesperado. Tente novamente ou contate o suporte.",
        ephemeral: true
      });
    } catch {}
  }
});

// Gera código aleatório
function generateRandomCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Cria imagem do código
async function createCodeImage(code) {
  const canvas = createCanvas(400, 65);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#2F3136";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.font = "bold 30px Verdana";
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillText(code, canvas.width / 2, canvas.height / 2);

  return canvas.toBuffer();
}