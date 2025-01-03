const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(cors());

// Challenge 1 data
const data = require('./database/data.json');

// Challenge 2 data
const productData = require('./database/product-data.json');

// Challenge 3 - Path to finance.json
const financeFilePath = path.join(__dirname, 'database', 'finance.json');
let financeData = {};
if (fs.existsSync(financeFilePath)) {
	financeData = JSON.parse(fs.readFileSync(financeFilePath, 'utf8'));
} else {
	financeData = {};
	fs.writeFileSync(financeFilePath, JSON.stringify(financeData, null, 2));
}

const lastChanceTimestamps = {
	prints: 0,
	panoramas: 0,
	strips: 0
};

// For Challenge 3: Track monthly revenue
function getCurrentMonth() {
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, '0');
	return `${year}-${month}`;
}
function saveFinanceData() {
	fs.writeFileSync(financeFilePath, JSON.stringify(financeData, null, 2));
}
function updateMonthData() {
	const currentMonth = getCurrentMonth();
	if (!financeData[currentMonth]) {
		financeData[currentMonth] = {
			revenue: 0,
			freeRevenue: 0,
			taxOwed: 0
		};
	}

	const revenue = financeData[currentMonth].revenue;
	const taxRate = 0.08625;
	financeData[currentMonth].taxOwed = revenue * taxRate;
}
function addRevenue(amount) {
	const currentMonth = getCurrentMonth();
	if (!financeData[currentMonth]) {
		financeData[currentMonth] = { revenue: 0, freeRevenue: 0, taxOwed: 0 };
	}
	financeData[currentMonth].revenue += amount;
	updateMonthData();
	saveFinanceData();
}
function addFreeRevenue(amount) {
	const currentMonth = getCurrentMonth();
	if (!financeData[currentMonth]) {
		financeData[currentMonth] = { revenue: 0, freeRevenue: 0, taxOwed: 0 };
	}
	financeData[currentMonth].freeRevenue += amount;
	updateMonthData();
	saveFinanceData();
}
// Structure: { "YYYY-MM": totalRevenueForThatMonth }
const monthlyRevenue = {};
const monthlyFreeRevenue = {};

// function addRevenue(amount) {
// 	const currentMonth = getCurrentMonth();
// 	if (!monthlyRevenue[currentMonth]) {
// 		monthlyRevenue[currentMonth] = 0;
// 	}
// 	monthlyRevenue[currentMonth] += amount;
// }
// function addFreeRevenue(amount) {
// 	const currentMonth = getCurrentMonth();
// 	if (!monthlyFreeRevenue[currentMonth]) {
// 		monthlyFreeRevenue[currentMonth] = 0;
// 	}
// 	monthlyFreeRevenue[currentMonth] += amount;
// }




// Endpoint for Challenge 1
app.get('/data', (req, res) => {
	res.json(data);
});

// Endpoint for Challenge 2
/*
  Logic:
  - We assume the customer ordered one of the package types: "prints", "panoramas", or "strips".
  - Once per hour at most, we want one qualifying customer (someone who ordered one of these packages)
    to have a chance to win the other two packages for free.

  For this example, we won't strictly enforce the "once per hour" rule or track previous winners,
  but we’ll show how you might determine eligibility and a "win".

  Steps:
  - Check if the ordered package is valid.
  - If valid, the customer is "eligible".
  - For demonstration, randomly determine if they "win".
  - If they win, return the original package plus the other two packages as free.
*/
app.get('/lucky', (req, res) => {
	const packageType = req.query.package;
	if (!packageType) {
		return res.status(400).json({ error: 'Please specify a package type. e.g. /lucky?package=prints' });
	}

	const selectedPackage = productData.packages.find(p => p.type === packageType);
	if (!selectedPackage) {
		return res.status(404).json({ error: 'Package not found' });
	}

	const now = Date.now();
	const oneHour = 1; // (for demo it will be 1, for rule at task it should be 60 * 60 * 1000;)
	const lastChance = lastChanceTimestamps[packageType] || 0;
	let isEligible = false;
	let won = false;
	let freePackages = [];

	if (now - lastChance >= oneHour) {
		isEligible = true;
		// Determine if they win (for demo, 33% chance)
		won = Math.random() < 0.33;
		addRevenue(selectedPackage.price);

		if (won) {
			freePackages = productData.packages.filter(p => p.type !== packageType);
			const freeValue = freePackages.reduce((sum, pkg) => sum + pkg.price, 0);
			addFreeRevenue(freeValue);
		}

		lastChanceTimestamps[packageType] = now;

	} else {
		// Not eligible (not enough time has passed)
		isEligible = false;
		won = false;
		freePackages = [];
		addRevenue(selectedPackage.price);
	}

	res.json({
		orderedPackage: selectedPackage,
		isEligible,
		won,
		freePackages
	});
});

// Endpoint for Challenge 3
// This simulates a customer just paying for a package without the "lucky" logic
app.get('/order', (req, res) => {
	const packageType = req.query.package;
	if (!packageType) {
		return res.status(400).json({ error: 'Please specify a package type. e.g. /order?package=prints' });
	}

	const selectedPackage = productData.packages.find(p => p.type === packageType);
	if (!selectedPackage) {
		return res.status(404).json({ error: 'Package not found' });
	}

	addRevenue(selectedPackage.price);

	res.json({
		message: 'Order placed successfully.',
		orderedPackage: selectedPackage
	});
});

app.get('/tax', (req, res) => {
	const currentMonth = getCurrentMonth();
	const monthData = financeData[currentMonth] || { revenue: 0, freeRevenue: 0, taxOwed: 0 };
	res.json({
		currentMonth,
		revenue: monthData.revenue,
		freeRevenue: monthData.freeRevenue,
		taxOwed: monthData.taxOwed
	});
	// const revenue = monthlyRevenue[currentMonth] || 0;
	// const freeRev = monthlyFreeRevenue[currentMonth] || 0;
	// const taxRate = 0.08625;
	// const taxOwed = revenue * taxRate;
	//
	// res.json({
	// 	currentMonth,
	// 	revenue,
	// 	freeRevenue: freeRev,
	// 	taxOwed
	// });
});

app.get('/clear-finance', (req, res) => {
	financeData = {};
	saveFinanceData();
	res.json({ message: 'Finance data cleared.' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
	console.log(`Backend server is running on http://localhost:${PORT}`);
});
