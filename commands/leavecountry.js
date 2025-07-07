import { SlashCommandBuilder } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function normalizeCurrencyName(rawCurrency) {
  if (!rawCurrency) return '';
  return rawCurrency.trim().toLowerCase();
}

export const data = new SlashCommandBuilder()
  .setName('leavecountry')
  .setDescription('ترک کشور فعلی‌تان');

export async function execute(interaction) {
  const userId = interaction.user.id;
  const countriesPath = path.join(__dirname, '..', 'countriesData.json');
  const marketPath = path.join(__dirname, '..', 'market.json');

  let countriesData;
  let market;

  try {
    const [countriesRaw, marketRaw] = await Promise.all([
      fs.readFile(countriesPath, 'utf8'),
      fs.readFile(marketPath, 'utf8'),
    ]);
    countriesData = JSON.parse(countriesRaw);
    market = JSON.parse(marketRaw);
  } catch (err) {
    console.error('❌ خطا در خواندن فایل‌ها:', err);
    return interaction.reply({ content: '❌ خطا در بارگذاری داده‌ها.', ephemeral: true });
  }

  let foundServerId = null;

  for (const serverId in countriesData.servers) {
    const server = countriesData.servers[serverId];
    if (server.citizens?.includes(userId)) {
      foundServerId = serverId;
      break;
    }
  }

  if (!foundServerId) {
    return interaction.reply({ content: '⚠️ شما در هیچ کشوری عضو نیستید.', ephemeral: true });
  }

  const server = countriesData.servers[foundServerId];
  const wasLeader = server.leader === userId;
  const countryName = server.country;
  const isMain = server.isMain === true;
  const currencyName = normalizeCurrencyName(server.currency);

  if (wasLeader && !isMain) {
    // حذف کشور
    delete countriesData.servers[foundServerId];
    console.log(`🗑️ کشور "${countryName}" به دلیل ترک رهبر حذف شد.`);

    // بررسی و حذف ارز در صورت استفاده‌نشدن در دیگر کشورها
    const usedElsewhere = Object.values(countriesData.servers).some(
      s => normalizeCurrencyName(s.currency) === currencyName
    );

    if (currencyName && !usedElsewhere && market[currencyName]) {
      delete market[currencyName];
      console.log(`💸 ارز "${currencyName}" نیز حذف شد.`);
    }

  } else {
    // فقط حذف از شهروندان
    server.citizens = server.citizens.filter(id => id !== userId);
  }

  try {
    await Promise.all([
      fs.writeFile(countriesPath, JSON.stringify(countriesData, null, 2), 'utf8'),
      fs.writeFile(marketPath, JSON.stringify(market, null, 2), 'utf8'),
    ]);
  } catch (err) {
    console.error('❌ خطا در ذخیره فایل‌ها:', err);
    return interaction.reply({ content: '❌ خطا در ذخیره‌سازی داده‌ها. لطفاً بعداً تلاش کنید.', ephemeral: true });
  }

  return interaction.reply({
    content: wasLeader && !isMain
      ? `⚠️ شما رهبر کشور بودید و با خروج شما، کشور **${countryName}** حذف شد و ارز آن نیز پاک شد.`
      : `✅ شما با موفقیت کشور **${countryName}** را ترک کردید.`,
  });
}
