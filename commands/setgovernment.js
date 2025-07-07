import { SlashCommandBuilder } from 'discord.js';
import fs from 'fs/promises';

const countryPath = './countriesData.json';
const economyPath = './economy.json';

export const data = new SlashCommandBuilder()
  .setName('setgovernment')
  .setDescription('🏛️ تنظیم پست‌های دولت و رهبر نمادین کشور (فقط توسط اونر کشور)')
  .addStringOption(option => option.setName('leadername').setDescription('نام رهبر نمادین'))
  .addUserOption(option => option.setName('leader').setDescription('کاربر رهبر نمادین'))
  .addStringOption(option => option.setName('navyname').setDescription('نام ژنرال نیروی دریایی'))
  .addUserOption(option => option.setName('navyuser').setDescription('کاربر ژنرال نیروی دریایی'))
  .addStringOption(option => option.setName('airforcename').setDescription('نام ژنرال هوایی'))
  .addUserOption(option => option.setName('airforceuser').setDescription('کاربر ژنرال هوایی'))
  .addStringOption(option => option.setName('landforcename').setDescription('نام ژنرال زمینی'))
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
    await interaction.deferReply({ ephemeral: true }); // جلوگیری از تایم‌اوت

    const rawCountry = await fs.readFile(countryPath, 'utf8');
    const rawEconomy = await fs.readFile(economyPath, 'utf8');
    const countries = JSON.parse(rawCountry);
    const economy = JSON.parse(rawEconomy);

    const country = countries.servers[serverId];
    if (!country) {
      return await interaction.editReply({ content: '❌ این سرور هیچ کشوری نداره.' });
    }

    // چک کردن که کاربر لیدر کشور هست (اونر کشور)
    if (userId !== country.leader) {
      return await interaction.editReply({ content: '❌ فقط رهبر کشور می‌تونه دولت را تنظیم کند.' });
    }

    country.customJobs = country.customJobs || {};

    const setJob = (key, name, user) => {
      if (!name && !user) return;

      country.customJobs[key] = {
        name: name || country.customJobs[key]?.name || 'نامشخص',
        user: user?.id || country.customJobs[key]?.user || null
      };

      if (user?.id) {
        economy[user.id] = economy[user.id] || {};
        economy[user.id].customJob = name;
      }
    };

    setJob('symbolicLeader', interaction.options.getString('leadername'), interaction.options.getUser('leader'));
    setJob('navy', interaction.options.getString('navyname'), interaction.options.getUser('navyuser'));
    setJob('airforce', interaction.options.getString('airforcename'), interaction.options.getUser('airforceuser'));
    setJob('landforce', interaction.options.getString('landforcename'), interaction.options.getUser('landforceuser'));
    setJob('foreign', interaction.options.getString('foreignname'), interaction.options.getUser('foreignuser'));
    setJob('internal', interaction.options.getString('internalname'), interaction.options.getUser('internaluser'));
    setJob('economic', interaction.options.getString('economicname'), interaction.options.getUser('economicuser'));
    setJob('management', interaction.options.getString('managementname'), interaction.options.getUser('managementuser'));
    setJob('education', interaction.options.getString('educationname'), interaction.options.getUser('educationuser'));

    await fs.writeFile(countryPath, JSON.stringify(countries, null, 2));
    await fs.writeFile(economyPath, JSON.stringify(economy, null, 2));

    await interaction.editReply('✅ پست‌های دولتی تنظیم و به عنوان شغل سفارشی ثبت شدند.');
  } catch (err) {
    console.error('❌ خطا در setgovernment:', err);
    try {
      await interaction.editReply({ content: '❌ خطایی در تنظیم دولت رخ داد.' });
    } catch (editError) {
      console.error('❌ خطا در ارسال پیام خطا:', editError);
    }
  }
}
