const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
});

// ==============================
//  🎯 قائمة الـ IDs المراد إعطاؤهم الرتبة
// ==============================
const TARGET_USER_IDS = [
  '1426361301374074962',
  '416942217626910720',
  '1126171739085344882',
];

// ==============================
//  🏷️ الرتبة المراد إعطاؤها
// ==============================
const ROLE_ID = '1447347749573103790';

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

  const role = guild.roles.cache.get(ROLE_ID);
  if (!role) {
    console.error(`❌ لم يتم العثور على الرتبة: ${ROLE_ID}`);
    process.exit(1);
  }

  console.log(`🎯 السيرفر: ${guild.name}`);
  console.log(`🏷️  الرتبة: ${role.name}`);
  console.log(`📋 عدد الأعضاء: ${TARGET_USER_IDS.length}\n`);

  // تحميل الأعضاء
  await guild.members.fetch().catch(() => {});

  let successCount = 0;
  let failedCount  = 0;

  for (const userId of TARGET_USER_IDS) {
    try {
      const member = guild.members.cache.get(userId);
      if (!member) {
        console.log(`⚠️  المستخدم ${userId} غير موجود في السيرفر`);
        failedCount++;
        continue;
      }

      await member.roles.add(role);
      console.log(`✅ تم إعطاء الرتبة لـ: ${member.user.tag} (${userId})`);
      successCount++;
    } catch (err) {
      const reason =
        err.code === 50013 ? 'البوت لا يملك الصلاحية' :
        err.message;
      console.log(`❌ فشل مع ${userId} — ${reason}`);
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
