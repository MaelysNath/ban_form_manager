const { loadData, saveData } = require('./data');

const finalizeVote = async (affair, guild, channel, message, adminOverride = false) => {
  const voteThreshold = parseInt(process.env.VOTE_THRESHOLD, 10);
  const validatedCategoryId = process.env.CATEGORY_VALIDATED_ID;
  const refusedCategoryId = process.env.CATEGORY_REFUSED_ID;

  if (!channel) {
    console.error(`❌┃ Le salon pour l'affaire ${affair.channelId} n'existe pas ou a été supprimé.`);
    if (message) {
      await message.reply('Le salon associé à cette demande n\'existe plus. Impossible de finaliser.');
    }
    return;
  }

  const { accept, decline } = affair.votes;

  // Décider selon les votes ou une action forcée d'un admin
  const validated = adminOverride
    ? accept.length > decline.length
    : accept.length >= voteThreshold || accept.length > decline.length;

  const categoryId = validated ? validatedCategoryId : refusedCategoryId;
  const newName = validated
    ? `✅┃affaire-${channel.name.replace('⏳┃affaire-', '')}-validé`
    : `⭕┃affaire-${channel.name.replace('⏳┃affaire-', '')}-refusé`;
  const response = validated
    ? '✅┃La demande a été validée par le STAFF. Affaire classée.'
    : '⭕┃La demande a été refusée par le STAFF. Affaire classée.';

  try {
    // Déplacer le salon vers une nouvelle catégorie
    await channel.setParent(categoryId, { lockPermissions: true });

    // Modifier le nom du salon
    await channel.setName(newName);

    // Envoyer un message final dans le salon
    await channel.send(response);
  } catch (error) {
    console.error(`❌┃ Erreur lors du déplacement ou de la modification du salon ${channel.id}:`, error);
  }

  // Supprimer l'affaire des données sauvegardées
  const data = loadData();
  const updatedAffaires = data.affaires.filter((a) => a.channelId !== channel.id);
  saveData({ ...data, affaires: updatedAffaires });
};

module.exports = finalizeVote;
