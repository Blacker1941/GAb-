import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('selectbranch')
  .setDescription('شاخه شغلی خود را انتخاب کنید')
  .addStringOption(option =>
    option.setName('branch')
      .setDescription('شاخه شغلی')
      .setRequired(true)
      .addChoices(
        { name: 'Technology', value: 'technology' },
        { name: 'Military', value: 'military' },
        { name: 'Economy', value: 'economy' },
        { name: 'Politics', value: 'politics' }
      ));

export async function execute(interaction, economy, saveEconomy, ensureUser) {
  try {
    const userId = interaction.user.id;
    await ensureUser(userId);

    if (economy[userId].jobBranch) {
      await interaction.reply({ content: '❌ شما قبلاً شاخه شغلی خود را انتخاب کرده‌اید.', ephemeral: true });
      return;
    }

    const branch = interaction.options.getString('branch');

    economy[userId].jobBranch = branch;
    economy[userId].branchLevel = 1;

    await saveEconomy();

    await interaction.reply({ content: `✅ شاخه شغلی شما با موفقیت به **${branch}** تنظیم شد 🎯`, ephemeral: true });
  } catch (error) {
    console.error('Error in selectbranch command:', error);
    await interaction.reply({ content: '❌ خطایی در پردازش درخواست شما رخ داده است.', ephemeral: true });
  }
}
