import { SlashCommandBuilder } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';

const COOLDOWN_FILE = path.join(process.cwd(), 'robCooldowns.json');
const cooldownTime = 2 * 60 * 60 * 1000; // 2 ساعت

const levels = {
  small: { chance: 0.4, stealPercent: 0.05, minFine: 0.01, maxFine: 0.03 },
  medium: { chance: 0.2, stealPercent: 0.15, minFine: 0.05, maxFine: 0.1 },
  large: { chance: 0.1, stealPercent: 0.3, minFine: 0.1, maxFine: 0.2 },
};

async function loadCooldowns() {
  try {
    const data = await fs.readFile(COOLDOWN_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function saveCooldowns(data) {
  await fs.writeFile(COOLDOWN_FILE, JSON.stringify(data, null, 2));
}

export const data = new SlashCommandBuilder()
  .setName('rob')
  .setDescription('سرقت از کیف پول دیگران')
  .addUserOption(option =>
    option.setName('target')
      .setDescription('کاربری که می‌خواهید از او سرقت کنید')
      .setRequired(true))
  .addStringOption(option =>
    option.setName('level')
      .setDescription('سطح سرقت')
      .addChoices(
        { name: 'کوچک', value: 'small' },
        { name: 'متوسط', value: 'medium' },
        { name: 'بزرگ', value: 'large' }
      )
      .setRequired(true));

export async function execute(interaction, economy, saveEconomy, ensureUser, marketStats, countryData) {
  const userId = interaction.user.id;
  const target = interaction.options.getUser('target');
  const level = interaction.options.getString('level');

  // deferReply برای جلوگیری از Timeout
  await interaction.deferReply({ ephemeral: false });

  // چک: دزدی از بات ممنوع
  if (target.bot) {
    if (target.id === interaction.client.user.id) {
      // چک زدن به طرف اگه از خود بات بدزده
      await interaction.editReply('🖐️👋 جرأت کردی از من دزدی کنی؟ برو با کله بخواب!');
    } else {
      await interaction.editReply('🤖 نمی‌تونی از یک بات دزدی کنی.');
    }
    return;
  }

  await ensureUser(userId);
  await ensureUser(target.id);

  const cooldowns = await loadCooldowns();
  const now = Date.now();

  if (cooldowns[userId] && now - cooldowns[userId] < cooldownTime) {
    const remaining = ((cooldowns[userId] + cooldownTime - now) / 60000).toFixed(0);
    await interaction.editReply(`⏳ باید ${remaining} دقیقه دیگر صبر کنید تا دوباره دزدی کنید.`);
    return;
  }

  const serverId = interaction.guild.id;
  const sameCountry = Object.values(countryData.servers).some(server =>
    Array.isArray(server.citizens) &&
    server.citizens.includes(userId) &&
    server.citizens.includes(target.id)
  );

  const walletKey = sameCountry ? `wallet${serverId}` : 'wallet';

  economy[userId].wallet = economy[userId].wallet || 0;
  economy[userId].bank = economy[userId].bank || 0;
  economy[target.id][walletKey] = economy[target.id][walletKey] || 0;
  economy[target.id].wallet = economy[target.id].wallet || 0;

  const config = levels[level];
  const roll = Math.random();
  let message = '';

  if (roll < config.chance) {
    // دزدی موفق
    const targetWallet = economy[target.id][walletKey];
    const stolenAmount = Math.floor(targetWallet * config.stealPercent);

    if (stolenAmount > 0) {
      economy[userId].wallet += stolenAmount;
      economy[target.id][walletKey] -= stolenAmount;
      message = `💰 دزدی موفقیت‌آمیز! شما ${stolenAmount.toLocaleString()} از ${target.username} دزدیدید.`;
    } else {
      message = '🤷‍♂️ قربانی شما پولی در کیفش نداشت!';
    }
  } else {
    // گیر افتادن
    const finePercent = Math.random() * (config.maxFine - config.minFine) + config.minFine;
    const fineAmount = Math.floor((economy[userId].wallet || 0) * finePercent);

    if (fineAmount > 0) {
      if (economy[userId].wallet >= fineAmount) {
        economy[userId].wallet -= fineAmount;
      } else {
        const remainder = fineAmount - economy[userId].wallet;
        economy[userId].wallet = 0;
        economy[userId].bank = Math.max(0, economy[userId].bank - remainder);
      }

      economy[target.id].wallet += fineAmount;
      message = `🚨 گیر افتادی! پلیس دستگیرت کرد و ${fineAmount.toLocaleString()} به ${target.username} جریمه دادی.`;
    } else {
      message = '😅 گیر افتادی ولی چون پولی نداشتی، چیزی از دست ندادی!';
    }
  }

  cooldowns[userId] = now;
  await saveCooldowns(cooldowns);
  await saveEconomy();

  await interaction.editReply({ content: message });
}
