// seedPackages.js
import { faker } from "@faker-js/faker";
import sequelize from "./dbconnection.js";
import Package from "./Models/package.js";

const generatePackages = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected.");

    // Create 100 fake package records
    const packages = [];
    for (let i = 0; i < 100; i++) {
      const goodWeight = faker.number.float({
        min: 1,
        max: 50,
        precision: 0.01,
      });
      const perKgCash = faker.number.float({
        min: 100,
        max: 600,
        precision: 0.01,
      });
      const totalCash = (goodWeight * perKgCash).toFixed(2);
      const recip = faker.number.float({
        min: 0,
        max: totalCash,
        precision: 0.01,
      });
      const remain = (totalCash - recip).toFixed(2);

      packages.push({
        date: faker.date.recent({ days: 30 }),
        receiverName: faker.person.fullName(),
        receiverPhone: faker.phone.number("07#########"),
        receiverAddress: faker.location.streetAddress(),
        receiverEmail: faker.internet.email(),
        country: faker.location.country(),
        senderName: faker.person.fullName(),
        senderPhone: faker.phone.number("07#########"),
        senderAddress: faker.location.streetAddress(),
        senderEmail: faker.internet.email(),
        goodsDetails: faker.commerce.productDescription(),
        goodWeight,
        piece: faker.number.int({ min: 1, max: 10 }),
        goodsValue: faker.number.float({
          min: 100,
          max: 5000,
          precision: 0.01,
        }),
        perKgCash,
        recip,
        remain,
        totalCash,
        location: faker.location.city(),
      });
    }

    await Package.bulkCreate(packages);
    console.log("🎉 100 fake package records added successfully!");

    process.exit(0);
  } catch (err) {
    console.error("❌ Error seeding packages:", err);
    process.exit(1);
  }
};

generatePackages();
