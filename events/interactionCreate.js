module.exports = {
    name: 'interactionCreate',
    execute(interaction, client) {
      if (!interaction.isChatInputCommand()) return;
  
      const command = client.commands.get(interaction.commandName);
  
      if (!command) return;
  
      try {
        command.execute(interaction, client);
      } catch (error) {
        console.error(error);
        interaction.reply({ content: '❌┃ Une erreur est survenue lors de l’exécution de cette commande.', ephemeral: true });
      }
    },
  };
  