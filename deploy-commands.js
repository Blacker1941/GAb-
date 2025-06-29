import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';

import { data as balanceData } from './commands/balance.js';
import { data as payData } from './commands/pay.js';
import { data as depositData } from './commands/deposit.js';
import { data as withdrawData } from './commands/withdraw.js';
import { data as workData } from './commands/work.js';
import { data as upgradeData } from './commands/upgrade.js';
import { data as selectBranchData } from './commands/selectbranch.js';
import { data as jobInfoData } from './commands/jobinfo.js';
import { data as idcardData } from './commands/idcard.js';
import { data as setCustomJobData } from './commands/setcustomjob.js';
import { data as shootData } from './commands/shoot.js';
import { data as forexMarketData } from './commands/forexmarket.js';
import { data as forexBuyData } from './commands/forexbuy.js';
import { data as forexSellData } from './commands/forexsell.js';
import { data as walletData } from './commands/wallet.js';
import { data as createCountryData } from './commands/createcountry.js';
import { data as setGovernmentData } from './commands/setgovernment.js';
import { data as setCountryMetaData } from './commands/setcountrymeta.js';
import { data as balanceNationalData } from './commands/balanceNational.js';
import { data as countryInfoData } from './commands/countryinfo.js';
import { data as joinCountryData } from './commands/joincountry.js';
import { data as leaveCountryData } from './commands/leavecountry.js';
import { data as payNationalData } from './commands/paynational.js';
import { data as robData } from './commands/rob.js';


dotenv.config();

const commands = [
  balanceData.toJSON(),
  payData.toJSON(),
  depositData.toJSON(),
  withdrawData.toJSON(),
  workData.toJSON(),
  upgradeData.toJSON(),
  selectBranchData.toJSON(),
  jobInfoData.toJSON(),
  idcardData.toJSON(),
  setCustomJobData.toJSON(),
  shootData.toJSON(),
  forexMarketData.toJSON(),
  forexBuyData.toJSON(),
  forexSellData.toJSON(),
  walletData.toJSON(),
  createCountryData.toJSON(),
  setGovernmentData.toJSON(),
  setCountryMetaData.toJSON(),
  balanceNationalData.toJSON(),
  countryInfoData.toJSON(),
  joinCountryData.toJSON(),
  leaveCountryData.toJSON(),
  payNationalData.toJSON(),
  robData.toJSON(),
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

// تابع پاک کردن همه کامندهای گیلد (اگر خواستی میتونی صداش کنی)
// این کمک می‌کنه اگه کامندهای قبلی باقی موندن پاک بشن
async function clearGuildCommands() {
  try {
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: [] }
    );
    console.log('✅ همه کامندهای گیلد پاک شدند.');
  } catch (error) {
    console.error('خطا در پاکسازی کامندهای گیلد:', error);
  }
}

async function registerCommands() {
  try {
    // چک کردن نام کامندها برای پیدا کردن تکراری
    const commandNames = commands.map(c => c.name);
    const duplicates = commandNames.filter((item, index) => commandNames.indexOf(item) !== index);
    if (duplicates.length > 0) {
      console.error('❌ خطا: کامندهای تکراری یافت شد:', duplicates);
      console.error('لطفا نام کامندها را یکتا کنید.');
      process.exit(1);
    }

    const mode = process.argv[2]; // 'guild' یا 'global'

    if (mode === 'guild') {
      console.log('در حال ثبت کامندهای گیلد (خصوصی)...');
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: commands }
      );
      console.log('✅ کامندهای گیلد با موفقیت ثبت شدند!');
    } else {
      console.log('در حال ثبت کامندهای گلوبال...');
      await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: commands }
      );
      console.log('✅ کامندهای گلوبال با موفقیت ثبت شدند!');
    }
  } catch (error) {
    console.error('خطا در ثبت کامندها:', error);
  }
}

registerCommands();
