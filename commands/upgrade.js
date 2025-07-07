import * as techJobs from '../data/jobs/technology.js';
import * as militaryJobs from '../data/jobs/military.js';
import * as economyJobs from '../data/jobs/economy.js';
import * as politicsJobs from '../data/jobs/politics.js';

import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('upgrade')
  .setDescription('ارتقاء شاخه شغلی خود را انجام دهید');

export async function execute(interaction, economy, saveEconomy, ensureUser) {
  try {
    const userId = interaction.user.id;

    await ensureUser(userId);

    if (!economy[userId].jobBranch) {
      await interaction.reply({
        content: "❌ ابتدا باید شاخه شغلی خود را انتخاب کنید. دستور: `/selectbranch`",
        ephemeral: true,
      });
      return;
    }

    let currentLevel = economy[userId].branchLevel || 1;
    const branch = economy[userId].jobBranch;

    let jobList;
    if (branch === "technology") jobList = techJobs.jobList;
    else if (branch === "military") jobList = militaryJobs.jobList;
    else if (branch === "economy") jobList = economyJobs.jobList;
    else if (branch === "politics") jobList = politicsJobs.jobList;
    else {
      await interaction.reply({ content: "❌ خطا در پیدا کردن شاخه شغلی.", ephemeral: true });
      return;
    }

    if (currentLevel >= jobList.length) {
      await interaction.reply({ content: "✅ شما در حداکثر سطح شغلی قرار دارید.", ephemeral: true });
      return;
    }

    const now = Date.now();

    const nextLevel = currentLevel + 1;
    const nextJob = jobList[nextLevel - 1];
    const upgradeCost = Math.floor(nextJob.max * 15);

    if (economy[userId].wallet < upgradeCost) {
      await interaction.reply({
        content: `❌ برای ارتقاء به سطح ${nextLevel} نیاز به ${upgradeCost} <:WorldDollar:1391358868142948453> دارید ولی موجودی شما کافی نیست.`,
        ephemeral: true,
      });
      return;
    }

    economy[userId].wallet -= upgradeCost;
    economy[userId].branchLevel = nextLevel;
    economy[userId].lastUpgradeTime = now;

    await saveEconomy();

    await interaction.reply({
      content: `🔼 تبریک! شاخه شغلی شما به سطح ${nextLevel} ارتقاء یافت. مبلغ ${upgradeCost} <:WorldDollar:1391358868142948453> پرداخت شد.`,
      ephemeral: true,
    });

  } catch (error) {
    console.error('Error in upgrade command:', error);
    await interaction.reply({ content: '❌ خطایی در پردازش درخواست شما رخ داده است.', ephemeral: true });
  }
}

