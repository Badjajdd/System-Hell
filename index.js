const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  SlashCommandBuilder,
  REST,
  Routes,
  PermissionFlagsBits,
} = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,  // يحتاج تفعيل في Developer Portal
  ],
});

// ==============================
//  Config - القيم تُقرأ من ملف .env
// ==============================
const CONFIG = {
  DELAY_BETWEEN_DMS:      parseInt(process.env.DELAY_BETWEEN_DMS)      || 1200,
  BATCH_SIZE:             parseInt(process.env.BATCH_SIZE)             || 10,
  DELAY_BETWEEN_BATCHES:  parseInt(process.env.DELAY_BETWEEN_BATCHES)  || 15000,
  MAX_RETRIES:            parseInt(process.env.MAX_RETRIES)            || 2,
  RETRY_DELAY:            parseInt(process.env.RETRY_DELAY)            || 5000,
};

// ==============================
//  Commands
// ==============================
const commands = [
  // --- broadcast embed ---
  new SlashCommandBuilder()
    .setName('broadcast_embed')
    .setDescription('ارسل DM كـ Embed لجميع الاعضاء او رول معين')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt.setName('title').setDescription('عنوان الرسالة').setRequired(true))
    .addStringOption(opt =>
      opt.setName('description').setDescription('محتوى الرسالة').setRequired(true))
    .addStringOption(opt =>
      opt.setName('link').setDescription('رابط (اختياري)').setRequired(false))
    .addStringOption(opt =>
      opt.setName('link_label').setDescription('نص الرابط - الافتراضي: اضغط هنا').setRequired(false))
    .addStringOption(opt =>
      opt.setName('color').setDescription('لون الـ Embed بالهيكس مثال: #1DB954').setRequired(false))
    .addStringOption(opt =>
      opt.setName('thumbnail').setDescription('رابط صورة جانبية صغيرة').setRequired(false))
    .addStringOption(opt =>
      opt.setName('image').setDescription('رابط صورة كبيرة اسفل الـ Embed').setRequired(false))
    .addStringOption(opt =>
      opt.setName('footer').setDescription('نص الـ Footer').setRequired(false))
    .addStringOption(opt =>
      opt.setName('author').setDescription('اسم الـ Author فوق العنوان').setRequired(false))
    .addAttachmentOption(opt =>
      opt.setName('image_file').setDescription('ارفع صورة من جهازك').setRequired(false))
    .addRoleOption(opt =>
      opt.setName('role').setDescription('ارسل فقط لاصحاب هذا الرول').setRequired(false))
    .addChannelOption(opt =>
      opt.setName('log_channel').setDescription('قناة يُرسل فيها تقرير الانتهاء').setRequired(false))
    .toJSON(),

  // --- broadcast text ---
  new SlashCommandBuilder()
    .setName('broadcast_text')
    .setDescription('ارسل DM كرسالة نصية عادية لجميع الاعضاء او رول معين')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt.setName('message').setDescription('نص الرسالة').setRequired(true))
    .addRoleOption(opt =>
      opt.setName('role').setDescription('ارسل فقط لاصحاب هذا الرول').setRequired(false))
    .addChannelOption(opt =>
      opt.setName('log_channel').setDescription('قناة يُرسل فيها تقرير الانتهاء').setRequired(false))
    .toJSON(),

  // --- test dm ---
  new SlashCommandBuilder()
    .setName('test_dm')
    .setDescription('اختبر الـ DM على نفسك فقط')
    .addStringOption(opt =>
      opt.setName('type')
        .setDescription('نوع الرسالة')
        .setRequired(true)
        .addChoices(
          { name: 'Embed', value: 'embed' },
          { name: 'نص عادي', value: 'text' }
        ))
    .addStringOption(opt =>
      opt.setName('content').setDescription('العنوان او النص').setRequired(true))
    .addStringOption(opt =>
      opt.setName('description').setDescription('الوصف (للـ Embed فقط)').setRequired(false))
    .addStringOption(opt =>
      opt.setName('link').setDescription('رابط (للـ Embed فقط)').setRequired(false))
    .addAttachmentOption(opt =>
      opt.setName('image_file').setDescription('ارفع صورة من جهازك (للـ Embed فقط)').setRequired(false))
    .toJSON(),
];

// ==============================
//  Register Commands
// ==============================
async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
  const guildId = process.env.GUILD_ID;

  // اذا حطيت GUILD_ID الاوامر تظهر فورا - بدونه تاخذ ساعة globally
  const route = guildId
    ? Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId)
    : Routes.applicationCommands(process.env.CLIENT_ID);

  try {
    console.log(guildId
      ? `Registering commands on guild ${guildId}...`
      : 'Registering commands globally...'
    );
    await rest.put(route, { body: commands });
    console.log('Commands registered successfully.');
  } catch (err) {
    console.error('Failed to register commands:', err);
  }
}

// ==============================
//  Build Embed
// ==============================
function isValidImageUrl(url) {
  if (!url) return false;
  try {
    new URL(url);
    return /\.(png|jpg|jpeg|gif|webp)(\?.*)?$/i.test(url);
  } catch {
    return false;
  }
}

function buildEmbed({ title, description, link, linkLabel, color, thumbnail, image, attachmentUrl, footer, author, guildName }) {
  let parsedColor = 0x1DB954;
  if (color) {
    const hex = color.replace('#', '');
    const parsed = parseInt(hex, 16);
    if (!isNaN(parsed)) parsedColor = parsed;
  }

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(parsedColor)
    .setTimestamp();

  if (author) embed.setAuthor({ name: author });
  if (thumbnail && isValidImageUrl(thumbnail)) embed.setThumbnail(thumbnail);
  if (image && isValidImageUrl(image)) embed.setImage(image);
  else if (attachmentUrl) embed.setImage(attachmentUrl);
  if (footer) embed.setFooter({ text: footer });
  else embed.setFooter({ text: guildName });
  if (link) embed.addFields({ name: '\u200b', value: `[${linkLabel || 'اضغط هنا'}](${link})` });

  return embed;
}

// ==============================
//  Send DM with Retry
// ==============================
async function sendDMWithRetry(member, payload, retries = CONFIG.MAX_RETRIES) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await member.send(payload);
      return 'success';
    } catch (err) {
      if (err.code === 50007) return 'closed';
      if (err.code === 429) {
        const wait = (err.retryAfter || 5) * 1000 + 1000;
        console.warn(`Rate limited. Waiting ${wait / 1000}s...`);
        await sleep(wait);
      } else if (attempt < retries) {
        await sleep(CONFIG.RETRY_DELAY);
      }
    }
  }
  return 'failed';
}

// ==============================
//  Broadcast
// ==============================
async function sendBroadcast(interaction, members, payload, logChannel) {
  const memberArray = [...members.values()].filter(m => !m.user.bot);
  const total = memberArray.length;

  let successCount = 0;
  let closedCount = 0;
  let failedCount = 0;
  let processed = 0;

  for (let i = 0; i < memberArray.length; i += CONFIG.BATCH_SIZE) {
    const batch = memberArray.slice(i, i + CONFIG.BATCH_SIZE);

    for (const member of batch) {
      const result = await sendDMWithRetry(member, payload);

      if (result === 'success') successCount++;
      else if (result === 'closed') closedCount++;
      else failedCount++;

      processed++;

      if (processed % 20 === 0 || processed === total) {
        const percent = Math.round((processed / total) * 100);
        await interaction.editReply(
          `جاري الارسال... ${percent}% (${processed}/${total})\n` +
          `نجح: ${successCount} | DM مغلق: ${closedCount} | فشل: ${failedCount}`
        ).catch(() => {});
      }

      await sleep(CONFIG.DELAY_BETWEEN_DMS);
    }

    if (i + CONFIG.BATCH_SIZE < memberArray.length) {
      await sleep(CONFIG.DELAY_BETWEEN_BATCHES);
    }
  }

  // رسالة الانتهاء النهائية
  const summary =
    `تم الارسال لجميع الاشخاص بنجاح.\n\n` +
    `المجموع: ${total}\n` +
    `نجح: ${successCount}\n` +
    `DM مغلق: ${closedCount}\n` +
    `فشل: ${failedCount}`;

  await interaction.editReply(summary).catch(() => {});

  // ارسل تقرير للقناة اذا محددة
  if (logChannel) {
    const reportEmbed = new EmbedBuilder()
      .setTitle('تقرير الارسال')
      .setColor(0x5865F2)
      .addFields(
        { name: 'المجموع', value: String(total), inline: true },
        { name: 'نجح', value: String(successCount), inline: true },
        { name: 'DM مغلق', value: String(closedCount), inline: true },
        { name: 'فشل', value: String(failedCount), inline: true },
        { name: 'بواسطة', value: `<@${interaction.user.id}>`, inline: true },
      )
      .setTimestamp();
    await logChannel.send({ embeds: [reportEmbed] }).catch(() => {});
  }

  return { successCount, closedCount, failedCount, total };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ==============================
//  Events
// ==============================
client.once('clientReady', async () => {
  console.log(`Bot online as ${client.user.tag}`);
  client.user.setActivity(process.env.BOT_ACTIVITY || 'Podcast Bot', { type: 3 });
  // نسجل الاوامر بعد ما البوت يكون جاهز عشان يضمن الرد خلال 3 ثواني
  await registerCommands();
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  // ---- /broadcast_embed ----
  if (interaction.commandName === 'broadcast_embed') {
    try {
    await interaction.deferReply({ flags: 64 });

    const role       = interaction.options.getRole('role');
    const logChannel = interaction.options.getChannel('log_channel');

    const imageFile   = interaction.options.getAttachment('image_file');
    const embed = buildEmbed({
      title:         interaction.options.getString('title'),
      description:   interaction.options.getString('description'),
      link:          interaction.options.getString('link'),
      linkLabel:     interaction.options.getString('link_label'),
      color:         interaction.options.getString('color'),
      thumbnail:     interaction.options.getString('thumbnail'),
      image:         interaction.options.getString('image'),
      attachmentUrl: imageFile ? imageFile.url : null,
      footer:        interaction.options.getString('footer'),
      author:        interaction.options.getString('author'),
      guildName:     interaction.guild.name,
    });

    await interaction.guild.members.fetch().catch(() => {});
    let members = interaction.guild.members.cache;
    if (role) members = members.filter(m => m.roles.cache.has(role.id));

    await sendBroadcast(interaction, members, { embeds: [embed] }, logChannel);
    } catch (err) {
      console.error('broadcast_embed error:', err);
      const reply = { content: `حدث خطأ: ${err.message}`, flags: 64 };
      if (interaction.deferred) await interaction.editReply(reply).catch(() => {});
      else await interaction.reply(reply).catch(() => {});
    }
  }

  // ---- /broadcast_text ----
  if (interaction.commandName === 'broadcast_text') {
    try {
    await interaction.deferReply({ flags: 64 });

    const message    = interaction.options.getString('message');
    const role       = interaction.options.getRole('role');
    const logChannel = interaction.options.getChannel('log_channel');

    await interaction.guild.members.fetch().catch(() => {});
    let members = interaction.guild.members.cache;
    if (role) members = members.filter(m => m.roles.cache.has(role.id));

    await sendBroadcast(interaction, members, { content: message }, logChannel);
    } catch (err) {
      console.error('broadcast_text error:', err);
      const reply = { content: `حدث خطأ: ${err.message}`, flags: 64 };
      if (interaction.deferred) await interaction.editReply(reply).catch(() => {});
      else await interaction.reply(reply).catch(() => {});
    }
  }

  // ---- /test_dm ----
  if (interaction.commandName === 'test_dm') {
    await interaction.deferReply({ flags: 64 });

    const type        = interaction.options.getString('type');
    const content     = interaction.options.getString('content');
    const description = interaction.options.getString('description');
    const link        = interaction.options.getString('link');

    let payload;

    if (type === 'embed') {
      const imageFile = interaction.options.getAttachment('image_file');
      const embed = buildEmbed({
        title:         content,
        description:   description || 'هذه رسالة تجريبية.',
        link,
        attachmentUrl: imageFile ? imageFile.url : null,
        guildName:     interaction.guild.name,
      });
      payload = { embeds: [embed] };
    } else {
      payload = { content };
    }

    try {
      await interaction.user.send(payload);
      await interaction.editReply('تم ارسال الرسالة التجريبية. راجع رسائلك الخاصة.');
    } catch (err) {
      const reason = err.code === 50007
        ? 'DMs مغلقة - افتح Privacy Settings في السيرفر وفعل Allow direct messages'
        : `خطأ: ${err.message}`;
      await interaction.editReply(`فشل الارسال. ${reason}`);
    }
  }
});

// ==============================
//  Start
// ==============================
// نسجل الاوامر اول ثم نشغل البوت
client.login(process.env.BOT_TOKEN);