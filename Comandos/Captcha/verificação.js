const Discord = require("discord.js");
const { createCanvas, loadImage } = require("canvas");

// Mapa para rastrear usuários com painéis ativos
const usuariosComPainelAtivo = new Map();

// Função para gerar o código aleatório
function gerarCodigo() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let parte1 = "", parte2 = "";
    for (let i = 0; i < 3; i++) parte1 += chars[Math.floor(Math.random() * chars.length)];
    for (let i = 0; i < 3; i++) parte2 += chars[Math.floor(Math.random() * chars.length)];
    return `${parte1}-${parte2}`;
}

// Função para gerar opções de código (incluindo o correto)
function gerarOpcoes(codigoCerto) {
    const opcoes = new Set([codigoCerto]);
    while (opcoes.size < 4) {
        opcoes.add(gerarCodigo());
    }
    return Array.from(opcoes).sort(() => Math.random() - 0.5); // Embaralha as opções
}

// Função para gerar a imagem do código
async function gerarImagemCodigo(codigo) {
    const urlFundo = "./assets/fundo.png"; // Use uma imagem local
    let bg;

    try {
        bg = await loadImage(urlFundo);
    } catch (error) {
        console.error("Erro ao carregar a imagem de fundo:", error);
        return null; // Retorna null se a imagem não puder ser carregada
    }

    const largura = bg.width;
    const altura = bg.height;
    const canvas = createCanvas(largura, altura);
    const ctx = canvas.getContext("2d");

    ctx.drawImage(bg, 0, 0, largura, altura);

    ctx.font = `bold ${Math.floor(altura * 0.5)}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#fff";
    ctx.fillText(codigo, largura / 2, altura / 2);

    return canvas.toBuffer();
}

module.exports = {
    name: "painelverificacao",
    description: "Envia um painel de verificação com botão para DM.",
    type: Discord.ApplicationCommandType.ChatInput,
    options: [
        {
            name: "cargo",
            description: "Cargo a ser atribuído ao usuário após verificação",
            type: Discord.ApplicationCommandOptionType.Role,
            required: true,
        }
    ],

    run: async (client, interaction) => {
        const cargo = interaction.options.getRole("cargo");

        // Verifica se o bot tem permissão para gerenciar cargos
        if (!interaction.guild.members.me.permissions.has(Discord.PermissionFlagsBits.ManageRoles)) {
            return interaction.reply({
                embeds: [
                    new Discord.EmbedBuilder()
                        .setColor("#303136")
                        .setDescription("❌ O bot não tem permissão para gerenciar cargos.")
                ],
                ephemeral: true
            });
        }

        // Verifica se o cargo está abaixo do cargo mais alto do bot
        if (cargo.position >= interaction.guild.members.me.roles.highest.position) {
            return interaction.reply({
                embeds: [
                    new Discord.EmbedBuilder()
                        .setColor("#303136")
                        .setDescription("❌ O cargo especificado está acima do cargo mais alto do bot.")
                ],
                ephemeral: true
            });
        }

        // Mensagem de confirmação (apenas para quem executou)
        const confirmEmbed = new Discord.EmbedBuilder()
            .setColor("#303136")
            .setDescription(
                "***SISTEMA DE CAPTCHA - PAINEL CRIADO***\n\n" +
                "> O painel de verificação foi criado com sucesso!"
            );
        await interaction.reply({ embeds: [confirmEmbed], ephemeral: true });

        // Embed do painel (visível para todos)
        const painelEmbed = new Discord.EmbedBuilder()
            .setColor("#303136")
            .setDescription(
                "***SISTEMA DE CAPTCHA - INICIAR VERIFICAÇÃO***\n\n" +
                "> Clique no botão abaixo para iniciar sua verificação e receber acesso ao servidor."
            )
            .setFooter({ text: "Certifique-se de que seu privado está aberto para receber a verificação." });

        const painelRow = new Discord.ActionRowBuilder().addComponents(
            new Discord.ButtonBuilder()
                .setCustomId("painel_verificacao")
                .setLabel("Verifique-se")
                .setStyle(Discord.ButtonStyle.Secondary)
        );

        const painelMsg = await interaction.channel.send({ embeds: [painelEmbed], components: [painelRow] });

        const collector = interaction.channel.createMessageComponentCollector({
            componentType: Discord.ComponentType.Button,
            time: 5 * 60 * 1000 // 5 minutos
        });

        collector.on("collect", async i => {
            if (i.customId !== "painel_verificacao") return;

            // Verifica se o usuário já possui o cargo
            const guildMember = await interaction.guild.members.fetch(i.user.id);
            if (guildMember.roles.cache.has(cargo.id)) {
                const jaVerificadoEmbed = new Discord.EmbedBuilder()
                    .setColor("#303136")
                    .setDescription(
                        "***SISTEMA DE CAPTCHA - JÁ VERIFICADO***\n\n" +
                        "> Você já possui o cargo de verificado e não pode executar novamente."
                    )

                    return i.reply({ embeds: [jaVerificadoEmbed], ephemeral: true });
            }

            // Verifica se o usuário já tem um painel ativo
            if (usuariosComPainelAtivo.has(i.user.id)) {
                try {
                    const dm = await i.user.createDM();
                    const mensagens = await dm.messages.fetch({ limit: 10 }); // Busca as últimas mensagens no privado
                    const painelAtivo = mensagens.some(msg => msg.embeds.length > 0 && msg.embeds[0].title?.includes("SISTEMA DE CAPTCHA"));

                    if (painelAtivo) {
                        const painelAtivoEmbed = new Discord.EmbedBuilder()
                            .setColor("#303136")
                            .setDescription(
                                "***SISTEMA DE CAPTCHA - PAINEL ATIVO***\n\n" +
                                "> Você já possui um painel de verificação ativo no seu privado. Conclua-o antes de iniciar outro."
                            )
                        return i.reply({ embeds: [painelAtivoEmbed], ephemeral: true });
                    }
                } catch (error) {
                    console.error("Erro ao verificar mensagens no privado:", error);
                }
            }

            // Marca o usuário como tendo um painel ativo
            usuariosComPainelAtivo.set(i.user.id, true);

            // Gera código e opções
            const codigoCerto = gerarCodigo();
            const opcoes = gerarOpcoes(codigoCerto);
            const buffer = await gerarImagemCodigo(codigoCerto);
            const attachment = new Discord.AttachmentBuilder(buffer, { name: "codigo.png" });

            const embed = new Discord.EmbedBuilder()
                .setColor("#303136")
                .setDescription(
                    "***SISTEMA DE CAPTCHA - VERIFICAÇÃO ANTI-SPAM***\n\n" +
                    "> Selecione o código correto para receber acesso ao servidor.\n> Você só pode tentar uma vez."
                )
                .setImage("attachment://codigo.png");

            const selectMenu = new Discord.StringSelectMenuBuilder()
                .setCustomId("verificacao_select")
                .setPlaceholder("Selecione o código correto")
                .addOptions(opcoes.map(cod => ({
                    label: cod,
                    value: cod
                })));

            const row = new Discord.ActionRowBuilder().addComponents(selectMenu);

            // Tenta enviar no privado
            try {
                const dm = await i.user.createDM();
                const dmMessage = await dm.send({ embeds: [embed], components: [row], files: [attachment] });

                const enviadoEmbed = new Discord.EmbedBuilder()
                    .setColor("#303136")
                    .setDescription(
                        "***SISTEMA DE CAPTCHA - ENVIADO NO PRIVADO***\n\n" +
                        "> Sua verificação foi enviada no seu privado. Certifique-se de escolher o código correto!"
                    )
                await i.reply({ embeds: [enviadoEmbed], ephemeral: true });

                // Coleta resposta no privado
                const dmCollector = dmMessage.createMessageComponentCollector({
                    componentType: Discord.ComponentType.StringSelect,
                    time: 60_000 // 1 minuto
                });

                let respostaRecebida = false;

                dmCollector.on("collect", async dmInteraction => {
                    respostaRecebida = true;

                    if (dmInteraction.customId !== "verificacao_select") return;

                    const sucessoEmbed = new Discord.EmbedBuilder()
                        .setColor("#303136")
                        .setDescription(
                            dmInteraction.values[0] === codigoCerto
                                ? "***SISTEMA DE CAPTCHA - VERIFICAÇÃO CONCLUÍDA***\n\n> Você foi verificado com sucesso e recebeu acesso ao servidor! certifique-se  de ler as regras."
                                : "***SISTEMA DE CAPTCHA - CÓDIGO INCORRETO***\n\n> Você selecionou o código incorreto. Tente novamente mais tarde!"
                        )
                        .setFooter({ text: "Seu código está disponível acima da notificação. Qualquer erro, entre em contato e envie seu código." });

                    // Remove a imagem ao editar a mensagem
                    sucessoEmbed.setImage(null);
                    await dmInteraction.update({ embeds: [sucessoEmbed], components: [] });

                    if (dmInteraction.values[0] === codigoCerto) {
                        await guildMember.roles.add(cargo);
                    }
                });

                dmCollector.on("end", async (_, reason) => {
                    if (!respostaRecebida && reason === "time") {
                        const tempoEmbed = new Discord.EmbedBuilder()
                            .setColor("#303136")
                            .setDescription(
                                "***SISTEMA DE CAPTCHA - TEMPO ESGOTADO***\n\n" +
                                "> Seu tempo de verificação foi esgotado. Tente novamente mais tarde!"
                            )
                            .setFooter({ text: "Seu código está disponível acima da notificação. Qualquer erro, entre em contato e envie seu código." });

                        // Remove a imagem ao editar a mensagem
                        tempoEmbed.setImage(null);
                        await dmMessage.edit({ embeds: [tempoEmbed], components: [] });
                    }

                    // Remove o usuário do mapa de painéis ativos
                    usuariosComPainelAtivo.delete(i.user.id);
                });
            } catch (e) {
                const erroDMEmbed = new Discord.EmbedBuilder()
                    .setColor("#303136")
                    .setDescription(
                        "***SISTEMA DE CAPTCHA - ERRO AO ENVIAR***\n\n" +
                        "> Não consegui enviar mensagem no seu privado. Verifique suas configurações de privacidade."
                    )
                    .setFooter({ text: "Seu código está disponível acima da notificação. Qualquer erro, entre em contato e envie seu código." });
                await i.reply({ embeds: [erroDMEmbed], ephemeral: true });
            }
        });
    }
};