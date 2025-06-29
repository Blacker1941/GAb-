export async function executeDeleteCommand(message, args) {
    const ownerId = '1374080838882300114';
  
    if (message.author.id !== ownerId) {
      return message.reply('⛔ شما اجازه استفاده از این دستور را ندارید.');
    }
  
    const amount = parseInt(args[0]);
  
    if (isNaN(amount) || amount <= 0 || amount > 100) {
      return message.reply('⚠ لطفاً عددی بین 1 تا 100 وارد کنید.');
    }
  
    await message.channel.bulkDelete(amount, true)
      .then(deleted => {
        message.channel.send(`✅ ${deleted.size} پیام حذف شد.`)
          .then(msg => setTimeout(() => msg.delete(), 3000)); // پیام موفقیت بعد از ۳ ثانیه حذف شود
      })
      .catch(err => {
        console.error(err);
        message.channel.send('❌ مشکلی در حذف پیام‌ها پیش آمد.');
      });
  }
  