const { EmbedBuilder, ChannelType, PermissionsBitField } = require('discord.js');
const { uploadAttachment } = require('../utils/cloudinary');
const { saveAffair } = require('../utils/data');

module.exports = {
  name: 'demande_deban',
  description: 'Ouvre une affaire de demande de déban',
  async execute(interaction, client) {
    // Réponse différée
    await interaction.deferReply({ ephemeral: true });

    const username = interaction.options.getString('pseudo');
    const userId = interaction.options.getString('id');
    const description = interaction.options.getString('description') || 'Aucune description fournie.';
    const attachment = interaction.options.getAttachment('attachment');
    const categoryId = process.env.CATEGORY_AFFAIRS_ID;
    const requiredRoleId = process.env.ROLE_REQUIRED_ID; // Assurez-vous que cette variable est définie

    const category = interaction.guild.channels.cache.get(categoryId);
    if (!category || category.type !== ChannelType.GuildCategory) {
      await interaction.editReply({ content: '⭕┃ Catégorie invalide. Veuillez contacter un administrateur.' });
      return;
    }

    const channelName = `⏳┃affaire-${username}`;
    const debanChannel = await interaction.guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: categoryId,
      permissionOverwrites: [
        {
          id: interaction.guild.id,
          deny: [PermissionsBitField.Flags.ViewChannel],
        },
        {
          id: requiredRoleId,
          allow: [PermissionsBitField.Flags.ViewChannel],
        },
        {
          id: interaction.user.id,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
        },
      ],
    });

    let attachmentUrl = null;
    if (attachment) {
      try {
        attachmentUrl = await uploadAttachment(attachment);
      } catch (error) {
        await interaction.editReply({ content: '❌┃ Erreur lors de l\'upload de la pièce jointe. Veuillez réessayer.' });
        console.error('Erreur Cloudinary:', error);
        return;
      }
    }

    const embed = new EmbedBuilder()
      .setTitle('Nouvelle Demande de Deban')
      .setDescription(description)
      .addFields(
        { name: 'Pseudo', value: username, inline: true },
        { name: 'ID', value: userId, inline: true },
        { name: 'Votes', value: `Acceptations: 0/${process.env.VOTE_THRESHOLD}\nRefus: 0/${process.env.VOTE_THRESHOLD}`, inline: false }
      )
      .setColor('Blue')
      .setFooter({ text: 'Attention : votre vote est définitif, sauf en cas de changement.' })
      .setTimestamp();

    if (attachmentUrl) {
      embed.setImage(attachmentUrl);
      embed.addFields({ name: 'Pièce Jointe', value: `[Voir la pièce jointe](${attachmentUrl})`, inline: false });
    }

    const debanMessage = await debanChannel.send({ embeds: [embed] });
    await debanMessage.react('✅');
    await debanMessage.react('⭕');
    await debanMessage.react('📦'); // Ajout de la réaction réservée aux admins

    const affairData = {
        guildId: interaction.guild.id,
        channelId: debanChannel.id,
        messageId: debanMessage.id,
        endTime: Date.now() + 7 * 24 * 60 * 60 * 1000,
        votes: { accept: [], decline: [] },
      };
      
      // Test rapide pour vérifier les données de l'affaire
      console.log('Affaire à sauvegarder:', affairData);
      
      // Sauvegarde de l'affaire
      saveAffair(affairData);
      
      console.log('Affaire sauvegardée avec succès.');

    // Réponse finale après avoir créé le salon
    await interaction.editReply({ content: `✅┃ Le salon ${debanChannel} a été créé pour cette demande.` });

    // Lancez le système de votes
    if (client.utils && typeof client.utils.resumeVote === 'function') {
      client.utils.resumeVote(debanMessage, affairData, client);
    } else {
      console.error('❌┃ La fonction resumeVote n\'est pas définie dans utils.');
    }
  },
};
