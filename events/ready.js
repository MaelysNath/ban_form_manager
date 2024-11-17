module.exports = {
    name: 'ready',
    once: true,
    async execute(client) { // Marquez cette fonction comme async
      console.log(`✅┃ Bot connecté en tant que ${client.user.tag}`);
      
      const data = client.utils.loadData();
      const currentTime = Date.now();
    
      for (const affair of data.affaires) {
        const guild = client.guilds.cache.get(affair.guildId);
        if (!guild) continue;
    
        const channel = guild.channels.cache.get(affair.channelId);
        if (!channel) continue;
    
        try {
          // Attendez que le message soit récupéré
          const message = await channel.messages.fetch(affair.messageId);
          if (!message) continue;
    
          const timeLeft = affair.endTime - currentTime;
          if (timeLeft > 0) {
            client.utils.resumeVote(message, affair, client);
          } else {
            client.utils.finalizeVote(affair, guild, channel, message);
          }
        } catch (error) {
          console.error(`❌┃ Erreur lors de la récupération du message ${affair.messageId}:`, error);
        }
      }
    },
  };
  