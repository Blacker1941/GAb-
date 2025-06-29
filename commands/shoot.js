import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

const cooldown = new Map();

const hitChances = {
  head: 22,
  heart: 38,
  throat: 44,
  chest: 60,
  stomach: 70,
  arm: 80,
  knee: 82,
  leg: 85,
  foot: 88,
  hand: 90
};

const areaEffects = {
  head: { status: '💀 کشته شد!', condition: 'مرده' },
  heart: { status: '💘 تیر به قلب خورد و در حال مرگ است!', condition: 'در حال مرگ' },
  throat: { status: '🔇 تیر به گلو خورد و در حال مرگ است!', condition: 'در حال مرگ' },
  chest: { status: '🩸 زخمی شد و خونریزی دارد!', condition: 'زخمی' },
  stomach: { status: '🤕 مجروح شد و به زمین افتاد!', condition: 'مجروح' },
  arm: { status: '🩹 تیر به دستش خورد!', condition: 'زخمی' },
  knee: { status: '🦵 به زانو خورد و افتاد!', condition: 'لنگ می‌زند' },
  leg: { status: '🦿 پایش آسیب دید و دیگر نمی‌تواند بدود!', condition: 'لنگ می‌زند' },
  foot: { status: '🦶 تیر به کف پا خورد!', condition: 'زخمی' },
  hand: { status: '✋ تیر به دستش خورد!', condition: 'زخمی' }
};

export const data = new SlashCommandBuilder()
  .setName('shoot')
  .setDescription('به یک کاربر شلیک کن!')
  .addUserOption(option =>
    option.setName('target')
      .setDescription('هدف شلیک')
      .setRequired(true)
  )
  .addStringOption(option =>
    option.setName('area')
      .setDescription('محل شلیک')
      .setRequired(true)
      .addChoices(
        { name: 'سر', value: 'head' },
        { name: 'قلب', value: 'heart' },
        { name: 'گلو', value: 'throat' },
        { name: 'سینه', value: 'chest' },
        { name: 'شکم', value: 'stomach' },
        { name: 'دست', value: 'arm' },
        { name: 'زانو', value: 'knee' },
        { name: 'پا', value: 'leg' },
        { name: 'کف پا', value: 'foot' },
        { name: 'کف دست', value: 'hand' }
      )
  );

// تابع کمکی تغییر نیک نیم به "مرده"
async function setDeadNickname(member) {
    if (!member) return;
    try {
      const currentNick = member.nickname || member.user.username;
      if (!currentNick.startsWith('مرده')) {
        await member.setNickname(`مرده ${currentNick}`);
      }
    } catch (error) {
      // اگر مشکل مربوط به نداشتن دسترسی یا پرمیشن بود، چیزی لاگ نکن
      if (
        error.code === 50013 || // Missing Permissions
        error.message.includes('Missing Permissions') ||
        error.message.includes('Missing Access')
      ) {
        // سکوت کن
      } else {
        console.error(`خطا در تغییر نیک‌نیم کاربر ${member.user.tag}:`, error);
      }
    }
  }
  

export async function execute(interaction) {
  const shooter = interaction.member;
  const targetUser = interaction.options.getUser('target');
  const area = interaction.options.getString('area');
  const guild = interaction.guild;
  const targetMember = guild.members.cache.get(targetUser.id);
  const botUser = interaction.client.user;

  // رول تفنگدار
  const hasGunmanRole = shooter.roles.cache.some(role => role.name === 'تفنگدار');
  if (!hasGunmanRole) {
    return await interaction.reply({
      content: '⛔ فقط اعضای دارای رول **تفنگدار** می‌توانند از این دستور استفاده کنند.',
      ephemeral: true
    });
  }

  // کول‌داون
  const now = Date.now();
  const cooldownKey = shooter.id;
  const lastUsed = cooldown.get(cooldownKey);
  if (lastUsed && now - lastUsed < 30000) {
    const remaining = Math.ceil((30000 - (now - lastUsed)) / 1000);
    return await interaction.reply({
      content: `🕒 لطفاً ${remaining} ثانیه صبر کن تا دوباره شلیک کنی.`,
      ephemeral: true
    });
  }
  cooldown.set(cooldownKey, now);

  // احتمال گیر کردن اسلحه
  const jammed = Math.random() < 0.10;
  if (jammed) {
    const embed = new EmbedBuilder()
      .setTitle('🔫 اسلحه گیر کرد!')
      .setColor('DarkGold')
      .setAuthor({ name: `${shooter.user.username} ➡ ${targetUser.username}` })
      .setDescription(`😬 ${shooter.user.username} خواست شلیک کند، ولی اسلحه‌اش گیر کرد!`)
      .setThumbnail(shooter.user.displayAvatarURL({ dynamic: true }));
    return await interaction.reply({ embeds: [embed] });
  }

  // شرط ۱: خودکشی
  if (targetUser.id === shooter.id) {
    const effect = areaEffects[area];

    // تغییر نیک نیم خود شلیک‌کننده در صورت مرده بودن
    if (effect.condition === 'مرده') {
      await setDeadNickname(shooter);
    }

    const embed = new EmbedBuilder()
      .setTitle('😵 خودکشی ثبت شد!')
      .setDescription(`💔 ${shooter.user.username} تصمیم گرفت به خودش شلیک کند!\n${effect.status}`)
      .setColor('DarkRed')
      .setThumbnail(shooter.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '🎯 نقطه اثابت', value: area },
        { name: '🩸 وضعیت', value: effect.condition }
      );
    return await interaction.reply({ embeds: [embed] });
  }

  // شرط ۲: شلیک به بات (بات همیشه دقیق شلیک می‌کند)
  if (targetUser.id === botUser.id) {
    const effect = areaEffects[area];

    // اگر بات تیر را زد و وضعیت مرده بود، نیک نیم شلیک‌کننده تغییر کند
    if (effect.condition === 'مرده') {
      await setDeadNickname(shooter);
    }

    const embed = new EmbedBuilder()
      .setTitle('🤖 دفاع خودکار فعال شد!')
      .setDescription(`🚨 ${shooter.user.username} سعی کرد به بات شلیک کند!\nاما بات سریع واکنش نشان داد و تیر را به او شلیک کرد.\n${effect.status}`)
      .setColor('DarkPurple')
      .setAuthor({ name: `${botUser.username} ➡ ${shooter.user.username}` })
      .setThumbnail(shooter.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '🎯 نقطه اثابت', value: area },
        { name: '🩸 وضعیت', value: effect.condition }
      );
    return await interaction.reply({ embeds: [embed] });
  }

  // شلیک عادی با احتمال برخورد
  const chance = hitChances[area] || 70;
  const didHit = Math.random() * 100 < chance;

  const embed = new EmbedBuilder()
    .setAuthor({ name: `${shooter.user.username} ➡ ${targetUser.username}` })
    .setTitle('🎯 گزارش شلیک')
    .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
    .setColor(didHit ? 'Red' : 'Grey');

  if (didHit) {
    const effect = areaEffects[area];

    // تغییر نیک نیم هدف در صورت مرده بودن
    if (effect.condition === 'مرده') {
      await setDeadNickname(targetMember);
    }

    embed.addFields(
      { name: '🎯 نقطه اثابت', value: area },
      { name: '🩸 وضعیت', value: effect.condition },
      { name: '💥 توضیحات', value: effect.status },
      { name: '📌 نتیجه', value: 'اثابت کرده است ✅' }
    );
  } else {
    embed.addFields(
      { name: '🎯 نقطه هدف', value: area },
      { name: '📌 نتیجه', value: 'به خطا رفته است ❌' },
      { name: '😅 توضیحات', value: `${targetUser.username} خوش‌شانس بود و تیر نخورد.` }
    );
  }

  await interaction.reply({ embeds: [embed] });
}
