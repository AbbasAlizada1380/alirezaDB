// generateFakePackages.js
import { faker } from '@faker-js/faker/locale/fa';
import { config } from 'dotenv';
import readline from 'readline';
import { createInterface } from 'readline/promises';
import sequelize from './dbconnection.js';
import Customer from './Models/Customer.js';
import Package from './Models/package.js';

config();

// List of countries for package destinations
const countries = [
  'ایران', 'افغانستان', 'پاکستان', 'هند', 'امارات متحده عربی',
  'ترکیه', 'آلمان', 'انگلستان', 'کانادا', 'آمریکا',
  'استرالیا', 'ژاپن', 'کره جنوبی', 'فرانسه', 'ایتالیا'
];

// List of transit methods
const transitMethods = [
  'هوایی', 'دریایی', 'زمینی', 'ترکیبی', 'اکسپرس',
  'پست پیشتاز', 'پست سفارشی', 'پیک موتوری', 'حمل کانتینری'
];

// Items for packing list
const packingItems = [
  'لباس زنانه', 'مردانه لباس', 'ماهی تابه', 'چادر', 'ملاقه',
  'پلون مردانه', 'گزاره', 'حاکت زنانه', 'بلوز', 'واسکت',
  'بوت', 'گند افغانی', 'کردن بند', 'بیک', 'کرتی',
  'پوش بالش', 'پوش نوشک', 'زیرپوش بالش', 'زیرپوش نوشک', 'قالین',
  'نمد', 'پرده', 'میوه خشک', 'فروت', 'گیاه یونانی',
  'ترموز', 'چاینک', 'پیاله', 'پتو', 'وسایل آشپزخانه'
];

// Generate random packing list
function generatePackingList() {
  const itemCount = faker.number.int({ min: 3, max: 10 });
  const packList = [];
  
  for (let i = 0; i < itemCount; i++) {
    const itemName = faker.helpers.arrayElement(packingItems);
    const qty = faker.number.int({ min: 1, max: 10 });
    const weight = faker.number.float({ min: 0.5, max: 5, fractionDigits: 2 });
    const value = faker.number.float({ min: 5, max: 100, fractionDigits: 2 });
    
    packList.push({
      description: itemName,
      qty: qty.toString(),
      weight: weight.toString(),
      value: value.toString()
    });
  }
  
  return packList;
}

// Calculate totals from packing list
function calculateTotalsFromPackingList(packList) {
  let totalWeight = 0;
  let totalQty = 0;
  let totalValue = 0;
  
  packList.forEach(item => {
    const qty = parseFloat(item.qty) || 0;
    const weight = parseFloat(item.weight) || 0;
    const value = parseFloat(item.value) || 0;
    
    totalQty += qty;
    totalWeight += (qty * weight);
    totalValue += (qty * value);
  });
  
  return { totalWeight, totalQty, totalValue };
}

// Generate a single package
async function generatePackage(index) {
  try {
    // Generate sender
    const sender = await Customer.create({
      name: faker.person.fullName(),
      address: faker.location.streetAddress(),
      email: faker.internet.email(),
      phoneNumber: faker.phone.number('+93 7## ### ###'),
      country: faker.helpers.arrayElement(countries)
    });

    // Generate receiver
    const receiver = await Customer.create({
      name: faker.person.fullName(),
      address: faker.location.streetAddress(),
      email: faker.internet.email(),
      phoneNumber: faker.phone.number('+98 9## ### ####'),
      country: faker.helpers.arrayElement(countries)
    });

    // Generate packing list
    const packList = generatePackingList();
    const { totalWeight, totalQty, totalValue } = calculateTotalsFromPackingList(packList);

    // Generate package data
    const perKgCash = faker.number.float({ min: 2, max: 15, fractionDigits: 2 });
    const OPerKgCash = perKgCash * faker.number.float({ min: 0.8, max: 1.2, fractionDigits: 2 });
    const transitWay = faker.helpers.arrayElement(transitMethods);
    const received = faker.number.float({ 
      min: 50, 
      max: Math.min(totalWeight * perKgCash * 0.8, 1000),
      fractionDigits: 2 
    });
    
    const packageData = {
      totalWeight,
      piece: totalQty,
      value: totalValue,
      perKgCash,
      OPerKgCash,
      OTotalCash: parseFloat((totalWeight * OPerKgCash).toFixed(2)),
      transitWay,
      totalCash: parseFloat((totalWeight * perKgCash).toFixed(2)),
      remain: parseFloat(((totalWeight * perKgCash) - received).toFixed(2)),
      received,
      date: faker.date.between({ from: '2024-01-01', to: '2025-01-01' }),
      track_number: `TRK${faker.string.alphanumeric(12).toUpperCase()}`,
      packList
    };

    // Create package
    const newPackage = await Package.create({
      sender: sender.id,
      receiver: receiver.id,
      location: 'Kabul Stock',
      ...packageData
    });

    console.log(`✅ Package ${index + 1} created successfully`);
    console.log(`   📦 ID: ${newPackage.id}`);
    console.log(`   👤 From: ${sender.name} to ${receiver.name}`);
    console.log(`   📊 Weight: ${totalWeight.toFixed(2)}kg, Value: $${totalValue.toFixed(2)}`);
    console.log(`   💰 Total Cash: $${(totalWeight * perKgCash).toFixed(2)}`);
    console.log(`   📍 Location: ${newPackage.location}`);
    console.log(`   📅 Date: ${newPackage.date.toISOString().split('T')[0]}`);
    console.log('─'.repeat(50));

    return { sender, receiver, package: newPackage };
  } catch (error) {
    console.error(`❌ Error creating package ${index + 1}:`, error.message);
    throw error;
  }
}

// Helper function for confirmation
async function askConfirmation(question) {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  try {
    const answer = await rl.question(question);
    return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
  } finally {
    rl.close();
  }
}

// Main function
async function generateFakePackages(count = 1000) {
  try {
    // Authenticate database connection
    console.log('🔌 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connection established.');

    // Sync models (optional - remove in production)
    console.log('🔄 Syncing database models...');
    await sequelize.sync();
    console.log('✅ Database models synced.');

    console.log(`🚀 Starting to generate ${count} fake packages...\n`);

    const startTime = Date.now();
    let successCount = 0;
    let errorCount = 0;

    // Generate packages in batches to prevent memory issues
    const batchSize = 50;
    
    for (let i = 0; i < count; i += batchSize) {
      const batchEnd = Math.min(i + batchSize, count);
      console.log(`📦 Processing batch ${i + 1} to ${batchEnd}...`);
      
      const batchPromises = [];
      for (let j = i; j < batchEnd; j++) {
        batchPromises.push(generatePackage(j).catch(err => {
          console.error(`❌ Error in package ${j + 1}:`, err.message);
          return null;
        }));
      }

      const results = await Promise.allSettled(batchPromises);
      
      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          successCount++;
        } else {
          errorCount++;
        }
      });

      console.log(`✅ Batch ${i + 1}-${batchEnd} completed. Total: ${successCount} successful, ${errorCount} failed\n`);
      
      // Small delay between batches
      if (batchEnd < count) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const endTime = Date.now();
    const totalTime = (endTime - startTime) / 1000;

    console.log('\n🎉 Package generation completed!');
    console.log('='.repeat(50));
    console.log(`📊 Statistics:`);
    console.log(`   ✅ Successful packages: ${successCount}`);
    console.log(`   ❌ Failed packages: ${errorCount}`);
    console.log(`   ⏱️  Total time: ${totalTime.toFixed(2)} seconds`);
    console.log(`   📈 Average time per package: ${(totalTime / count).toFixed(3)} seconds`);
    console.log(`   💾 Total data generated: ${Math.round(count * 2.5)} records (approx.)`);
    console.log('='.repeat(50));

    // Show some sample statistics
    const totalPackages = await Package.count();
    const totalCustomers = await Customer.count();
    
    console.log(`\n📋 Database Summary:`);
    console.log(`   📦 Total packages in database: ${totalPackages}`);
    console.log(`   👥 Total customers in database: ${totalCustomers}`);
    
    // Get latest package info
    const latestPackage = await Package.findOne({
      order: [['createdAt', 'DESC']],
      include: [
        { model: Customer, as: 'Sender' },
        { model: Customer, as: 'Receiver' }
      ]
    });
    
    if (latestPackage) {
      console.log(`\n📦 Latest package created:`);
      console.log(`   ID: ${latestPackage.id}`);
      console.log(`   From: ${latestPackage.Sender.name} (${latestPackage.Sender.country})`);
      console.log(`   To: ${latestPackage.Receiver.name} (${latestPackage.Receiver.country})`);
      console.log(`   Weight: ${latestPackage.totalWeight}kg`);
      console.log(`   Value: $${latestPackage.value}`);
      console.log(`   Status: ${latestPackage.remain > 0 ? 'Pending Payment' : 'Paid'}`);
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    // Close database connection
    await sequelize.close();
    console.log('\n🔌 Database connection closed.');
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  let count = 1000; // Default count

  if (args.length > 0) {
    const argCount = parseInt(args[0]);
    if (!isNaN(argCount) && argCount > 0) {
      count = argCount;
    }
  }

  console.log(`
  ============================================
   Fake Package Generator
  ============================================
   📦 Generating: ${count} packages
   📍 Destination: Database
   🗺️  Countries: ${countries.length} different countries
   🚚 Transit: ${transitMethods.length} methods
   🏷️  Items: ${packingItems.length} different items
  ============================================
  `);

  const confirm = await askConfirmation(`Are you sure you want to generate ${count} packages? (y/n): `);
  
  if (confirm) {
    await generateFakePackages(count);
  } else {
    console.log('❌ Operation cancelled.');
    process.exit(0);
  }
}

// Run the script
main().catch(console.error);