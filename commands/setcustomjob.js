import { SlashCommandBuilder } from 'discord.js';
import fs from 'fs/promises';

export const data = new SlashCommandBuilder()
  .setName('setcustomjob')
  .setDescription('تنظیم یا حذف شغل سفارشی برای خود یا یک نفر دیگر (فقط توسط رهبر کشور)')
  .addStringOption(option =>
    option.setName('name')
      .setDescription('نام شغل سفارشی (خالی برای حذف)')
      .setRequired(false)
  )
  .addUserOption(option =>
    option.setName('target')
      .setDescription('کاربری که شغل سفارشی می‌گیرد')
      .setRequired(false)
  );

export async function execute(interaction, economy, saveEconomy, ensureUser) {
  const invokerId = interaction.user.id;
  const guildId = interaction.guild.id;

  // بارگذاری countries.json
  let countriesRaw;
  try {
    countriesRaw = await fs.readFile('./data/countries.json', 'utf8');
  } catch (err) {
    return await interaction.reply({ content: '❌ خطا در خواندن اطلاعات کشورها.', ephemeral: true });
  }

  const countries = JSON.parse(countriesRaw);

  // چک کن که کشور برای این سرور تعریف شده باشه
  const country = countries.servers[guildId];
  if (!country) {
    return await interaction.reply({ content: '❌ این سرور هیچ کشوری ثبت نکرده.', ephemeral: true });
  }

  // فقط سازنده کشور (مالک اصلی) می‌تونه شغل سفارشی رو تنظیم کنه
  if (country.leader !== invokerId) {
    return await interaction.reply({ content: '⛔ فقط رهبر کشور می‌تواند شغل سفارشی تنظیم کند.', ephemeral: true });
  }

  const targetUser = interaction.options.getUser('target') || interaction.user;
  const jobNameRaw = interaction.options.getString('name');

  await ensureUser(targetUser.id);

  if (!jobNameRaw || jobNameRaw.trim() === '') {
    // حذف شغل سفارشی
    delete economy[targetUser.id].customJob;
    await saveEconomy();
    const isSelf = targetUser.id === invokerId;
    return await interaction.reply({
      content: `✅ شغل سفارشی ${isSelf ? 'شما' : `برای ${targetUser.username}`} حذف شد.`,
      ephemeral: false
    });
  }

  // تنظیم شغل جدید
  const jobName = jobNameRaw.trim();
  economy[targetUser.id].customJob = jobName;
  await saveEconomy();

  const isSelf = targetUser.id === invokerId;
  await interaction.reply({
    content: `✅ شغل سفارشی ${isSelf ? 'شما' : `برای ${targetUser.username}`} به **${jobName}** تغییر یافت.`,
    ephemeral: false
  });
}
