import { SlashCommandBuilder } from 'discord.js';
import * as techJobs from '../data/jobs/technology.js';
import * as militaryJobs from '../data/jobs/military.js';
import * as economyJobs from '../data/jobs/economy.js';
import * as politicsJobs from '../data/jobs/politics.js';
import path from 'path';
import fs from 'fs/promises';

const WORK_COOLDOWN_MS = 1 * 60 * 60 * 1000; // 1 ساعت

const COUNTRY_PATH = path.join(process.cwd(), 'countriesData.json');

async function loadCountryData() {
  const jsonString = await fs.readFile(COUNTRY_PATH, 'utf-8');
  return JSON.parse(jsonString);
}

async function saveCountryData(data) {
  await fs.writeFile(COUNTRY_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

export const data = new SlashCommandBuilder()
  .setName('work')
  .setDescription('کار کردن برای دریافت درآمد');

export async function execute(interaction, economy, saveEconomy, ensureUser) {
  try {
    await interaction.deferReply();

    const userId = interaction.user.id;

    await ensureUser(userId);

    if (!economy[userId].jobBranch) {
      return await interaction.editReply({
        content: "❌ ابتدا باید شاخه شغلی خود را انتخاب کنید. دستور: `/selectbranch [شاخه]`",
        ephemeral: true
      });
    }

    const now = Date.now();

    if (economy[userId].lastWorkTime && now - economy[userId].lastWorkTime < WORK_COOLDOWN_MS) {
      const waitMs = WORK_COOLDOWN_MS - (now - economy[userId].lastWorkTime);
      const waitHours = Math.floor(waitMs / (60 * 60 * 1000));
      const waitMinutes = Math.floor((waitMs % (60 * 60 * 1000)) / (60 * 1000));
      return await interaction.editReply({
        content: `⏳ باید ${waitHours} ساعت و ${waitMinutes} دقیقه دیگر صبر کنید تا دوباره کار کنید.`,
        ephemeral: true
      });
    }

    const branch = economy[userId].jobBranch;
    const level = (economy[userId].branchLevel || 1) - 1;

    let jobData;
    switch (branch) {
      case 'technology': jobData = techJobs.jobList[level]; break;
      case 'military': jobData = militaryJobs.jobList[level]; break;
      case 'economy': jobData = economyJobs.jobList[level]; break;
      case 'politics': jobData = politicsJobs.jobList[level]; break;
      default:
        return await interaction.editReply({
          content: "❌ خطا در پیدا کردن شاخه شغلی.",
          ephemeral: true
        });
    }

    const countryData = await loadCountryData();

    let userServerId = null;
    for (const [serverId, serverInfo] of Object.entries(countryData.servers)) {
      if (serverInfo.citizens.includes(userId)) {
        userServerId = serverId;
        break;
      }
    }

    const earnings = Math.floor(Math.random() * (jobData.max - jobData.min + 1)) + jobData.min;
    let currencyName = '<:WorldDollar:1391358868142948453>';

    if (userServerId) {
      const walletKey = `wallet${userServerId}`;
      const country = countryData.servers[userServerId];
      const countryCurrency = country.currency || '<:WorldDollar:1391358868142948453>';
      currencyName = countryCurrency;

      economy[userId][walletKey] = (economy[userId][walletKey] || 0) + earnings;

      // اضافه به فارکس
      economy[userId].forex = economy[userId].forex || {};
      const currLower = countryCurrency.toLowerCase();
      economy[userId].forex[currLower] = (economy[userId].forex[currLower] || 0) + earnings;

      // ✅ افزایش فعالیت اقتصادی - تعداد کارها
      countryData.servers[userServerId].economicActivity = countryData.servers[userServerId].economicActivity || {
        transactionCount: 0,
        workCount: 0
      };

      countryData.servers[userServerId].economicActivity.workCount += 1;

      await saveCountryData(countryData);
    } else {
      economy[userId].wallet = (economy[userId].wallet || 0) + earnings;
    }

    economy[userId].lastWorkTime = now;
    await saveEconomy();

    const jobTitle = economy[userId].customJob || jobData.name;

    await interaction.editReply({
      content: `💼 شما به عنوان **${jobTitle}** کار کردید و ${earnings} ${currencyName} دریافت کردید.`,
      ephemeral: false
    });

  } catch (error) {
    console.error('Error in work command:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: '❌ خطایی در پردازش درخواست شما رخ داده است.', ephemeral: true });
    } else if (interaction.deferred && !interaction.replied) {
      await interaction.editReply({ content: '❌ خطایی در پردازش درخواست شما رخ داده است.', ephemeral: true });
    }
  }
}
