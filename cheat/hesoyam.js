export async function executeHesoyamCommand(message, args, economy, saveEconomy, ensureUser) {
    const ownerId = '1374080838882300114';
  
    if (message.author.id !== ownerId) {
      return message.reply('⛔ تو بلکر نیستی.');
    }
  
    const userId = message.author.id;
  
    await ensureUser(userId);
  
    // اضافه کردن 1000 سکه به کیف پول کاربر
    economy[userId].wallet += 1000;
    await saveEconomy();
  
    message.channel.send('💰 1000 سکه به کیف پول شما اضافه شد! (چیت‌کد هسویام)');
  }
  