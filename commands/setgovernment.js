import { SlashCommandBuilder } from 'discord.js';
import fs from 'fs/promises';

const filePath = './countriesData.json';

export const data = new SlashCommandBuilder()
  .setName('setgovernment')
  .setDescription('🏛️ تنظیم پست‌های دولت و رهبر نمادین کشور (فقط توسط اونر)')
  .addStringOption(option =>
    option.setName('leadername')
      .setDescription('نام دلخواه رهبر نمادین (مثلاً پادشاه، ولی‌فقیه...)')
      .setRequired(false))
  .addUserOption(option =>
    option.setName('leader')
      .setDescription('شخص رهبر نمادین')
      .setRequired(false))
  .addStringOption(option => option.setName('navyname').setDescription('نام دلخواه ژنرال نیروی دریایی'))
  .addUserOption(option => option.setName('navyuser').setDescription('کاربر ژنرال نیروی دریایی'))
  .addStringOption(option => option.setName('airforcename').setDescription('نام دلخواه ژنرال هوایی'))
  .addUserOption(option => option.setName('airforceuser').setDescription('کاربر ژنرال هوایی'))
  .addStringOption(option => option.setName('landforcename').setDescription('نام دلخواه ژنرال زمینی'))
  .addUserOption(option => option.setName('landforceuser').setDescription('کاربر ژنرال زمینی'))
  .addStringOption(option => option.setName('foreignname').setDescription('نام وزیر خارجه'))
  .addUserOption(option => option.setName('foreignuser').setDescription('کاربر وزیر خارجه'))
  .addStringOption(option => option.setName('internalname').setDescription('نام وزیر داخلی'))
  .addUserOption(option => option.setName('internaluser').setDescription('کاربر وزیر داخلی'))
  .addStringOption(option => option.setName('economicname').setDescription('نام وزیر اقتصادی'))
  .addUserOption(option => option.setName('economicuser').setDescription('کاربر وزیر اقتصادی'))
  .addStringOption(option => option.setName('managementname').setDescription('نام وزیر مدیریت'))
  .addUserOption(option => option.setName('managementuser').setDescription('کاربر وزیر مدیریت'))
  .addStringOption(option => option.setName('educationname').setDescription('نام وزیر آموزش'))
  .addUserOption(option => option.setName('educationuser').setDescription('کاربر وزیر آموزش'));

export async function execute(interaction) {
  const serverId = interaction.guild.id;
  const userId = interaction.user.id;

  try {
    const guildOwner = await interaction.guild.fetchOwner();
    if (userId !== guildOwner.id) {
      return await interaction.reply({ content: '❌ فقط اونر سرور می‌تونه دولت را تنظیم کنه.', ephemeral: true });
    }

    // بارگذاری
    let raw = await fs.readFile(filePath, 'utf8');
    let data = JSON.parse(raw);

    const country = data.servers[serverId];
    if (!country) {
      return await interaction.reply({ content: '❌ این سرور هیچ کشوری نداره.', ephemeral: true });
    }

    country.customJobs = country.customJobs || {};

    // helper برای ثبت یک پست
    const setJob = (key, name, user) => {
      if (!name && !user) return;
      country.customJobs[key] = {
        name: name || country.customJobs[key]?.name || 'نامشخص',
        user: user?.id || country.customJobs[key]?.user || null
      };
    };

    // تنظیم پست‌ها
    setJob('symbolicLeader', interaction.options.getString('leadername'), interaction.options.getUser('leader'));
    setJob('navy', interaction.options.getString('navyname'), interaction.options.getUser('navyuser'));
    setJob('airforce', interaction.options.getString('airforcename'), interaction.options.getUser('airforceuser'));
    setJob('landforce', interaction.options.getString('landforcename'), interaction.options.getUser('landforceuser'));
    setJob('foreign', interaction.options.getString('foreignname'), interaction.options.getUser('foreignuser'));
    setJob('internal', interaction.options.getString('internalname'), interaction.options.getUser('internaluser'));
    setJob('economic', interaction.options.getString('economicname'), interaction.options.getUser('economicuser'));
    setJob('management', interaction.options.getString('managementname'), interaction.options.getUser('managementuser'));
    setJob('education', interaction.options.getString('educationname'), interaction.options.getUser('educationuser'));

    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    await interaction.reply('✅ دولت با موفقیت تنظیم شد.');

  } catch (err) {
    console.error('❌ خطا در setgovernment:', err);
    await interaction.reply({ content: '❌ خطایی در تنظیم دولت رخ داد.', ephemeral: true });
  }
}
