const { EmbedBuilder } = require('discord.js');
const { loadData, saveData } = require('./data');
const finalizeVote = require('./finalizeVote');

const resumeVote = async (message, affair, client) => {
  const voteThreshold = parseInt(process.env.VOTE_THRESHOLD, 10);
  const adminReaction = '📦'; // Réaction réservée aux admins
  const { accept, decline } = affair.votes;
  let isFinalized = false; // Empêche la double exécution de l'archivage

  if (!message.fetch) {
    const channel = client.channels.cache.get(affair.channelId);
    if (!channel) {
      console.error(`❌┃ Impossible de trouver le canal pour l'affaire ${affair.channelId}`);
      return;
    }
    message = await channel.messages.fetch(affair.messageId).catch(() => null);
    if (!message) {
      console.error(`❌┃ Impossible de trouver le message pour l'affaire ${affair.messageId}`);
      return;
    }
  }

  const collector = message.createReactionCollector({
    filter: (reaction, user) => ['✅', '⭕', adminReaction].includes(reaction.emoji.name) && !user.bot,
    time: affair.endTime - Date.now(),
  });

  const updateEmbedVotes = async () => {
    const embed = message.embeds[0];
    if (!embed) {
      console.error('❌┃ Aucun embed trouvé dans le message.');
      return;
    }

    try {
      const updatedEmbed = EmbedBuilder.from(embed)
        .setFields([
          { name: 'Pseudo', value: affair.username || 'Inconnu', inline: true },
          { name: 'ID', value: affair.userId || 'Inconnu', inline: true },
          {
            name: 'Votes',
            value: `Acceptations: ${accept.length}/${voteThreshold}\nRefus: ${decline.length}/${voteThreshold}`,
            inline: false,
          },
        ]);

      await message.edit({ embeds: [updatedEmbed] });
    } catch (error) {
      console.error('❌┃ Erreur lors de la mise à jour de l\'embed :', error);
    }
  };

  const archiveDecision = async (adminUser = null) => {
    if (isFinalized) return; // Empêche la double exécution
    isFinalized = true;

    const guild = message.guild;
    const channel = message.channel;

    if (adminUser) {
      await channel.send(`📦┃ Archivage forcé déclenché par ${adminUser.username}.`);
    }

    if (accept.length > decline.length) {
      await finalizeVote({ ...affair, votes: { accept, decline } }, guild, channel, message, true); // Accepté
    } else {
      await finalizeVote({ ...affair, votes: { accept, decline } }, guild, channel, message, false); // Refusé
    }

    collector.stop();
  };

  collector.on('collect', async (reaction, user) => {
    if (reaction.emoji.name === '✅') {
      if (!accept.includes(user.id)) accept.push(user.id);
      decline.splice(decline.indexOf(user.id), 1); // Retirer le vote opposé si présent
    } else if (reaction.emoji.name === '⭕') {
      if (!decline.includes(user.id)) decline.push(user.id);
      accept.splice(accept.indexOf(user.id), 1); // Retirer le vote opposé si présent
    } else if (reaction.emoji.name === adminReaction) {
      const member = await message.guild.members.fetch(user.id);
      if (member.permissions.has('ADMINISTRATOR')) {
        await archiveDecision(user); // Décision forcée par un admin
      } else {
        await reaction.users.remove(user.id); // Retirer la réaction pour les non-admins
        await message.channel.send({
          content: `❌┃ Désolé ${user.username}, cette action est réservée aux administrateurs.`,
        });
      }
    }

    await updateEmbedVotes();

    // Sauvegarder les votes
    const data = loadData();
    const affairIndex = data.affaires.findIndex((a) => a.channelId === affair.channelId);
    if (affairIndex !== -1) {
      data.affaires[affairIndex].votes = { accept, decline };
      saveData(data);
    }

    // Vérifier si le seuil est atteint pour mettre fin aux votes
    if (accept.length >= voteThreshold || decline.length >= voteThreshold) {
      await archiveDecision();
    }
  });

  collector.on('remove', async (reaction, user) => {
    if (reaction.emoji.name === '✅') {
      const index = accept.indexOf(user.id);
      if (index !== -1) accept.splice(index, 1);
    } else if (reaction.emoji.name === '⭕') {
      const index = decline.indexOf(user.id);
      if (index !== -1) decline.splice(index, 1);
    }

    await updateEmbedVotes();

    // Sauvegarder les votes
    const data = loadData();
    const affairIndex = data.affaires.findIndex((a) => a.channelId === affair.channelId);
    if (affairIndex !== -1) {
      data.affaires[affairIndex].votes = { accept, decline };
      saveData(data);
    }
  });

  collector.on('end', async () => {
    await archiveDecision(); // Archive automatiquement selon les votes
  });
};

module.exports = resumeVote;
