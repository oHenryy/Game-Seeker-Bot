import { Client, GatewayIntentBits, TextChannel, REST, Routes, SlashCommandBuilder, Interaction, Presence, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { ActivityType } from 'discord-api-types/v10';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

// Carregar variáveis de ambiente do arquivo .env
dotenv.config();

// Definição do tipo de jogo no histórico
interface GameHistory {
  game: string;
  startTime: Date;
  endTime: Date | null;
}

// Definição do tipo para usuários rastreados
interface TrackedUser {
  userId: string;
  silent: boolean;  // Se as notificações são enviadas ou não
}

// Função para carregar dados de um arquivo JSON e converter as strings em objetos Date
const loadData = () => {
  if (fs.existsSync('./data.json')) {
    const rawData = fs.readFileSync('./data.json', 'utf-8');
    const parsedData = JSON.parse(rawData);

    // Converter strings de startTime e endTime para objetos Date
    parsedData.userHistory = Object.entries(parsedData.userHistory).reduce(
      (acc: Record<string, GameHistory[]>, [userId, games]: [string, unknown]) => {
        acc[userId] = (games as any[]).map((game: any) => ({
          ...game,
          startTime: new Date(game.startTime),
          endTime: game.endTime ? new Date(game.endTime) : null,
        }));
        return acc;
      },
      {}
    );

    return parsedData;
  }
  return { trackedUsers: [], userHistory: {}, notificationChannelId: null };
};

// Função para salvar dados no arquivo JSON
const saveData = (data: any) => {
  fs.writeFileSync('./data.json', JSON.stringify(data, null, 2), 'utf-8');
};

// Carregar dados persistentes (usuários rastreados, histórico e canal de notificações)
let { trackedUsers, userHistory, notificationChannelId } = loadData();

let notificationChannel: TextChannel | null = null;
let customMessageStart = '⚠️ {username} começou a jogar {game}!';
let customMessageStop = '❌ {username} parou de jogar {game}.';

// Criar cliente do Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildPresences,
  ],
});

// Evento de inicialização do bot
client.once('ready', async () => {
  console.log('Bot está online!');

  // Restaurar o canal de notificações se o ID foi salvo
  if (notificationChannelId) {
    const channel = await client.channels.fetch(notificationChannelId);
    if (channel && channel.isTextBased()) {
      notificationChannel = channel as TextChannel;
      console.log(`Canal de notificações restaurado: ${notificationChannel.name}`);
    }
  }
});

// Função para criar um embed com o histórico paginado
const createHistoryEmbed = (history: GameHistory[], page: number) => {
  const itemsPerPage = 5;
  const start = page * itemsPerPage;
  const end = start + itemsPerPage;
  const historyPage = history.slice(start, end);

  const embed = new EmbedBuilder()
    .setTitle('📜 Histórico de Atividades')
    .setDescription(`Página ${page + 1}`)
    .setColor(0x00FF00);

  historyPage.forEach((entry, index) => {
    const startTime = entry.startTime.toLocaleString();
    const endTime = entry.endTime ? entry.endTime.toLocaleString() : 'Em andamento';

    // Verificar se entry.endTime é um objeto Date antes de chamar getTime()
    const duration = entry.endTime instanceof Date
      ? Math.floor((entry.endTime.getTime() - entry.startTime.getTime()) / 60000) + ' minutos'
      : 'Ainda jogando';

    embed.addFields({
      name: `#${start + index + 1}: ${entry.game}`,
      value: `Início: ${startTime}\nFim: ${endTime}\nDuração: ${duration}`,
    });
  });

  return embed;
};

// Registrar comandos de barra
const commands = [
  new SlashCommandBuilder()
    .setName('track')
    .setDescription('Adiciona ou remove um usuário da lista de rastreamento')
    .addUserOption(option =>
      option.setName('usuario')
        .setDescription('O usuário a ser rastreado')
        .setRequired(true))
    .addBooleanOption(option =>
      option.setName('silencioso')
        .setDescription('Define se o rastreamento será silencioso')),
  
  new SlashCommandBuilder()
    .setName('silent')
    .setDescription('Altera o estado de silêncio de um usuário já rastreado')
    .addUserOption(option =>
      option.setName('usuario')
        .setDescription('O usuário cujo estado de silêncio será alterado')
        .setRequired(true)),

  new SlashCommandBuilder()
    .setName('setchannel')
    .setDescription('Define o canal para enviar notificações'),

  new SlashCommandBuilder()
    .setName('setmessage')
    .setDescription('Personaliza a mensagem de notificação')
    .addStringOption(option =>
      option.setName('mensagem')
        .setDescription('A nova mensagem de notificação para quando o usuário começar a jogar')
        .setRequired(true)),

  new SlashCommandBuilder()
    .setName('setstoppedmessage')
    .setDescription('Personaliza a mensagem de notificação quando o usuário parar de jogar')
    .addStringOption(option =>
      option.setName('mensagem')
        .setDescription('A nova mensagem de notificação para quando o usuário parar de jogar')
        .setRequired(true)),

  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Mostra a lista de comandos e suas descrições'),

  new SlashCommandBuilder()
    .setName('history')
    .setDescription('Mostra o histórico de atividades de um usuário')
    .addUserOption(option =>
      option.setName('usuario')
        .setDescription('O usuário cujo histórico você deseja ver')
        .setRequired(true)),
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);

// Registrar comandos no Discord (dinamicamente)
(async () => {
  try {
    console.log('Iniciando registro de comandos de barra...');
    await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID!), { body: commands });
    console.log('Comandos registrados com sucesso!');
  } catch (error) {
    console.error('Erro ao registrar os comandos:', error);
  }
})();

// Gerenciamento dos comandos de barra
client.on('interactionCreate', async (interaction: Interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, options } = interaction;

  // Comando "/track"
  if (commandName === 'track') {
    const user = options.getUser('usuario');
    const silent = options.getBoolean('silencioso') || false; // Definir rastreamento silencioso (padrão: false)

    if (user) {
      const existingUser = trackedUsers.find((u: TrackedUser) => u.userId === user.id);

      if (!existingUser) {
        trackedUsers.push({ userId: user.id, silent });
        saveData({ trackedUsers, userHistory, notificationChannelId });

        const embed = new EmbedBuilder()
          .setTitle('Usuário Rastreado')
          .setDescription(`✅ Usuário ${user.username} está sendo rastreado! Silencioso: ${silent ? 'Sim' : 'Não'}`)
          .setColor(0x00FF00);

        await interaction.reply({ embeds: [embed] });
      } else {
        trackedUsers = trackedUsers.filter((u: TrackedUser) => u.userId !== user.id);
        saveData({ trackedUsers, userHistory, notificationChannelId });

        const embed = new EmbedBuilder()
          .setTitle('Usuário Removido')
          .setDescription(`❌ Usuário ${user.username} não está mais sendo rastreado!`)
          .setColor(0xFF0000);

        await interaction.reply({ embeds: [embed] });
      }
    }
  }

  // Comando "/silent" para alterar o estado de silêncio de um usuário rastreado
  if (commandName === 'silent') {
    const user = options.getUser('usuario');

    if (user) {
      const trackedUser = trackedUsers.find((u: TrackedUser) => u.userId === user.id);

      if (trackedUser) {
        trackedUser.silent = !trackedUser.silent;
        saveData({ trackedUsers, userHistory, notificationChannelId });

        const embed = new EmbedBuilder()
          .setTitle('Estado de Silêncio Alterado')
          .setDescription(`🔇 Estado de silêncio para ${user.username} foi alterado para: ${trackedUser.silent ? 'Silencioso' : 'Não Silencioso'}`)
          .setColor(0x00FF00);

        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply('❌ Este usuário não está sendo rastreado.');
      }
    }
  }

  // Comando "/setchannel"
  if (commandName === 'setchannel') {
    if (interaction.channel && interaction.channel instanceof TextChannel) {
      notificationChannel = interaction.channel;

      // Salvar o ID do canal de notificações
      notificationChannelId = interaction.channel.id;
      saveData({ trackedUsers, userHistory, notificationChannelId });

      const embed = new EmbedBuilder()
        .setTitle('Canal Definido')
        .setDescription(`✅ Canal de notificações definido para ${interaction.channel.name}`)
        .setColor(0x00FF00);

      await interaction.reply({ embeds: [embed] });
    } else {
      await interaction.reply('❌ Este comando só pode ser usado em canais de texto!');
    }
  }

  // Comando "/setmessage"
  if (commandName === 'setmessage') {
    const newMessage = options.getString('mensagem');
    if (newMessage) {
      customMessageStart = newMessage;

      const embed = new EmbedBuilder()
        .setTitle('Mensagem Atualizada')
        .setDescription(`✅ Mensagem de notificação atualizada para quando o usuário começar a jogar: "${customMessageStart}"`)
        .setColor(0x00FF00);

      await interaction.reply({ embeds: [embed] });
    }
  }

  // Comando "/setstoppedmessage"
  if (commandName === 'setstoppedmessage') {
    const newMessage = options.getString('mensagem');
    if (newMessage) {
      customMessageStop = newMessage;

      const embed = new EmbedBuilder()
        .setTitle('Mensagem Atualizada')
        .setDescription(`✅ Mensagem de notificação atualizada para quando o usuário parar de jogar: "${customMessageStop}"`)
        .setColor(0x00FF00);

      await interaction.reply({ embeds: [embed] });
    }
  }

  // Comando "/help" com layout aprimorado
  if (commandName === 'help') {
    const embed = new EmbedBuilder()
      .setTitle('📋 Comandos do Bot')
      .setDescription(`
      **🔄 Rastreamento:**
      - \`/track @usuário [silencioso]\`: Adiciona ou remove um usuário da lista de rastreamento.
      - \`/silent @usuário\`: Alterna o estado silencioso de um usuário rastreado.

      **🔔 Notificações:**
      - \`/setchannel\`: Define o canal de notificações onde as mensagens serão enviadas.
      - \`/setmessage <mensagem>\`: Personaliza a mensagem de notificação para quando o usuário começar a jogar.
      - \`/setstoppedmessage <mensagem>\`: Personaliza a mensagem de notificação para quando o usuário parar de jogar.

      **🕰 Histórico:**
      - \`/history @usuário\`: Mostra o histórico de atividades do usuário rastreado.
      `)
      .setColor(0x00FF00);

    await interaction.reply({ embeds: [embed] });
  }

  // Comando "/history" com paginação
  if (commandName === 'history') {
    const user = options.getUser('usuario');
    if (user) {
      const history = userHistory[user.id] || [];
      if (history.length === 0) {
        await interaction.reply(`⚠️ O usuário ${user.username} não tem histórico de atividades.`);
      } else {
        let currentPage = 0;
        const embed = createHistoryEmbed(history, currentPage);

        const row = new ActionRowBuilder<ButtonBuilder>()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('prev')
              .setLabel('⬅️ Anterior')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(currentPage === 0),
            new ButtonBuilder()
              .setCustomId('next')
              .setLabel('Próximo ➡️')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(history.length <= (currentPage + 1) * 5)
          );

        const message = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

        const filter = (i: any) => i.user.id === interaction.user.id;
        const collector = message.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async (i) => {
          if (i.customId === 'prev') {
            currentPage--;
          } else if (i.customId === 'next') {
            currentPage++;
          }

          const newEmbed = createHistoryEmbed(history, currentPage);

          const newRow = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
              new ButtonBuilder()
                .setCustomId('prev')
                .setLabel('⬅️ Anterior')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(currentPage === 0),
              new ButtonBuilder()
                .setCustomId('next')
                .setLabel('Próximo ➡️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(history.length <= (currentPage + 1) * 5)
            );

          await i.update({ embeds: [newEmbed], components: [newRow] });
        });
      }
    }
  }
});

// Evento de rastreamento de presença (atividades)
client.on('presenceUpdate', (oldPresence: Presence | null, newPresence: Presence) => {
  const user = newPresence.user ?? null; // Verificar se `user` é null
  const trackedUser = trackedUsers.find((u: TrackedUser) => u.userId === user?.id); // Verificar `user?.id`
  if (!trackedUser || !user) return;

  const newActivity = newPresence.activities.find((activity) => activity.type === ActivityType.Playing);
  const oldActivity = oldPresence?.activities.find((activity) => activity.type === ActivityType.Playing);

  // Se o usuário começou a jogar um jogo
  if (newActivity && (!oldActivity || oldActivity.name !== newActivity.name)) {
    if (!userHistory[user.id]) {
      userHistory[user.id] = [];
    }
    userHistory[user.id].push({
      game: newActivity.name,
      startTime: new Date(),
      endTime: null,
    });
    saveData({ trackedUsers, userHistory, notificationChannelId });

    // Enviar notificação somente se o rastreamento não for silencioso
    if (!trackedUser.silent && notificationChannel) {
      const message = customMessageStart
        .replace('{username}', user.username)
        .replace('{game}', newActivity.name);
      notificationChannel.send(message);
    }
  }

  // Se o usuário parou de jogar um jogo
  if (!newActivity && oldActivity) {
    const lastGame = userHistory[user.id]?.find((entry: { game: string; startTime: Date; endTime: Date | null }) => entry.game === oldActivity.name && entry.endTime === null);
    if (lastGame) {
      lastGame.endTime = new Date();
      saveData({ trackedUsers, userHistory, notificationChannelId });
    }

    // Enviar notificação somente se o rastreamento não for silencioso
    if (!trackedUser.silent && notificationChannel) {
      const message = customMessageStop
        .replace('{username}', user.username)
        .replace('{game}', oldActivity.name);
      notificationChannel.send(message);
    }
  }
});

// Faça login no bot usando o token da variável de ambiente
client.login(process.env.DISCORD_TOKEN!);
