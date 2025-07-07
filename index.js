import dotenv from 'dotenv';
import { Client, GatewayIntentBits, Collection } from 'discord.js';
import fs from 'fs/promises';

// اصلاح ایمپورت: marketStats از فایل جداگانه بخون
import { updateMarketPrices } from './market/priceUpdater.js';
import { marketStats } from './market/marketStatsHandler.js';

// ایمپورت کامندها
import * as balanceCommand from './commands/balance.js';
import * as payCommand from './commands/pay.js';
import * as depositCommand from './commands/deposit.js';
import * as withdrawCommand from './commands/withdraw.js';
import * as workCommand from './commands/work.js';
import * as upgradeCommand from './commands/upgrade.js';
import * as selectBranchCommand from './commands/selectbranch.js';
import * as jobInfoCommand from './commands/jobinfo.js';
import * as idcardCommand from './commands/idcard.js';
import * as setCustomJobCommand from './commands/setcustomjob.js';
import * as shootCommand from './commands/shoot.js';
import * as forexBuyCommand from './commands/forexbuy.js';
import * as forexSellCommand from './commands/forexsell.js';
import * as forexMarketCommand from './commands/forexmarket.js';
import * as walletCommand from './commands/wallet.js';
import * as createCountry from './commands/createcountry.js';
import * as setGovernment from './commands/setgovernment.js';
import * as setCountryMeta from './commands/setcountrymeta.js';
import * as balanceNationalCommand from './commands/balanceNational.js';
import * as countryInfoCommand from './commands/countryinfo.js';
import * as joinCountryCommand from './commands/joincountry.js';
import * as leaveCountryCommand from './commands/leavecountry.js';
import * as payNationalCommand from './commands/paynational.js';
import * as robCommand from './commands/rob.js';

import { executeDeleteCommand } from './commands/delete.js';
import { executeHesoyamCommand } from './cheat/hesoyam.js';

dotenv.config();

let economy = {};
let countryData = { servers: {} };

// بارگذاری اقتصاد
async function loadEconomy() {
  try {
    const data = await fs.readFile('economy.json', 'utf8');
    economy = JSON.parse(data);
  } catch (err) {
    console.log('فایل اقتصاد پیدا نشد، فایل جدید ساخته می‌شود.');
    economy = {};
    await saveEconomy();
  }
}

// ذخیره اقتصاد
async function saveEconomy() {
  try {
    await fs.writeFile('economy.json', JSON.stringify(economy, null, 2));
  } catch (err) {
    console.error('خطا در ذخیره اقتصاد', err);
  }
}

// بارگذاری اطلاعات کشورها
async function loadCountryData() {
  try {
    const data = await fs.readFile('countriesData.json', 'utf8');
    countryData = JSON.parse(data);
  } catch (err) {
    console.log('فایل countriesData.json پیدا نشد یا خطا در بارگذاری.');
    countryData = { servers: {} };
  }
}

// اطمینان از وجود کاربر در اقتصاد
async function ensureUser(userId) {
  if (!economy[userId]) {
    economy[userId] = {
      wallet: 0,
      bank: 0,
      jobCooldown: 0,
      inventory: [],
      forex: {}
    };
    await saveEconomy();
  }
}

// ساخت کلاینت دیسکورد
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// ثبت کامندها در Collection
client.slashCommands = new Collection();
[
  balanceCommand,
  payCommand,
  depositCommand,
  withdrawCommand,
  workCommand,
  upgradeCommand,
  selectBranchCommand,
  jobInfoCommand,
  idcardCommand,
  setCustomJobCommand,
  shootCommand,
  forexBuyCommand,
  forexSellCommand,
  forexMarketCommand,
  walletCommand,
  createCountry,
  setGovernment,
  setCountryMeta,
  balanceNationalCommand,
  countryInfoCommand,
  joinCountryCommand,
  leaveCountryCommand,
  payNationalCommand,
  robCommand,
].forEach(cmd => client.slashCommands.set(cmd.data.name, cmd));

// آماده شدن ربات
client.once('ready', () => {
  console.log(`✅ ربات فعال شد: ${client.user.tag}`);
  updateMarketPrices(economy, countryData); // اجرای اولیه
  setInterval(() => updateMarketPrices(economy, countryData), 24 * 60 * 60 * 1000); // هر ۲۴ ساعت
});


// هندل پیام‌های متنی (اختیاری)
client.on('messageCreate', async message => {
  if (message.author.bot) return;

  const args = message.content.trim().split(/ +/);
  const command = args.shift().toLowerCase();
  const userId = message.author.id;
  await ensureUser(userId);

  if (command === '!delete') {
    await executeDeleteCommand(message, args);
  }

  if (command === 'هسویام') {
    await executeHesoyamCommand(message, args, economy, saveEconomy, ensureUser);
  }
});

// هندل اسلش کامندها
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.slashCommands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction, economy, saveEconomy, ensureUser, marketStats, countryData);
  } catch (error) {
    console.error('خطا در اجرای کامند اسلش:', error);
    try {
      if (!interaction.deferred && !interaction.replied) {
        await interaction.reply({ content: '❌ مشکلی در اجرای کامند رخ داد!', ephemeral: true });
      } else {
        await interaction.editReply({ content: '❌ مشکلی در اجرای کامند رخ داد!' });
      }
    } catch (err) {
      console.error('🔴 شکست در پاسخ‌دهی به interaction:', err);
    }
  }
});

// اجرای ربات
(async () => {
  await loadEconomy();
  await loadCountryData();
  client.login(process.env.DISCORD_TOKEN);
})();
