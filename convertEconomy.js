const fs = require('fs');

let oldData = JSON.parse(fs.readFileSync('economy.json', 'utf8'));

let newData = {};

for (let userId in oldData) {
    newData[userId] = {
        wallet: oldData[userId].balance || 0,
        bank: 0,
        jobCooldown: oldData[userId].lastDaily || 0,
        inventory: []
    }
}

fs.writeFileSync('economy.json', JSON.stringify(newData, null, 2));

console.log("✅ تبدیل دیتا با موفقیت انجام شد!");
