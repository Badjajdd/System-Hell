const { Client, GatewayIntentBits, PermissionFlagsBits } = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
});

// ==============================
//  🚫 قائمة الـ IDs المراد بانهم
// ==============================
const BAN_LIST = [
  '1426361301374074962',
  '416942217626910720',
  '1126171739085344882',
];

const BAN_REASON = process.env.BAN_REASON || 'تم الباند بواسطة البوت';
const DELETE_MESSAGES_DAYS = 0; // عدد أيام الرسائل المحذوفة (0-7)

// ==============================
//  Main
// ==============================
client.once('ready', async () => {
  console.log(`✅ بوت جاهز: ${client.user.tag}`);

  const guild = client.guilds.cache.get(process.env.GUILD_ID);
  if (!guild) {
    console.error('❌ لم يتم العثور على السيرفر. تأكد من GUILD_ID في ملف .env');
    process.exit(1);
  }

  console.log(`🎯 السيرفر: ${guild.name}`);
  console.log(`📋 عدد الـ IDs المراد بانهم: ${BAN_LIST.length}\n`);

  let successCount = 0;
  let failedCount  = 0;

  for (const userId of BAN_LIST) {
    try {
      await guild.bans.create(userId, {
        reason: BAN_REASON,
        deleteMessageSeconds: DELETE_MESSAGES_DAYS * 86400,
      });
      console.log(`✅ تم باند: ${userId}`);
      successCount++;
    } catch (err) {
      const reason =
        err.code === 10007 ? 'المستخدم ليس في السيرفر' :
        err.code === 50013 ? 'البوت لا يملك صلاحية البان' :
        err.message;
      console.log(`❌ فشل باند ${userId} — ${reason}`);
      failedCount++;
    }
  }

  console.log(`\n📊 النتيجة:`);
  console.log(`   ✅ نجح: ${successCount}`);
  console.log(`   ❌ فشل: ${failedCount}`);

  client.destroy();
  process.exit(0);
});

client.login(process.env.BOT_TOKEN);
