const { REST, Routes } = require('discord.js');
require('dotenv').config();

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

async function clearCommands() {
  const guildId = process.env.GUILD_ID;

  try {
    console.log('جاري مسح جميع الاوامر القديمة...');

    // مسح اوامر السيرفر
    if (guildId) {
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId),
        { body: [] }
      );
      console.log('تم مسح اوامر السيرفر.');
    }

    // مسح الاوامر الـ Global
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: [] }
    );
    console.log('تم مسح الاوامر الـ Global.');
    console.log('الان شغل البوت مرة ثانية بـ: node index.js');

  } catch (err) {
    console.error('خطأ:', err);
  }
}

clearCommands();
