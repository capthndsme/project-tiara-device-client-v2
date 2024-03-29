const fs = require("fs");

let localData = {};

// Load existing data from file if it exists
if (fs.existsSync("./Data/OutputPersists.json")) {
	try {
		const loadData = fs.readFileSync("./Data/OutputPersists.json");
		localData = JSON.parse(loadData);
		for (const key in localData) {
			if (localData[key].hasLock) {
				console.warn(`Output ${key} has lock. Unclean shutdown? Unlocking`);
				localData[key].hasLock = false;
			}
		}
	} catch (e) {
		console.warn("Invalid OutputPersists, re-creating.", e);
	}
}

// Save the local data to file
export function saveData() {
	fs.writeFileSync("./Data/OutputPersists.json", JSON.stringify(localData));
}

// Register a new output with the given name and description
export function registerOutput(name, description) {
	if (localData[name]) {
		console.log(`Output ${name} already registered.`);
	} else {
		console.log(`Registering output ${name}: ${description}`);
		localData[name] = {
			description: description,
			lastExecuted: 0,
			hasLock: false,
		};
		saveData();
	}
}

// Try to obtain a lock on the output with the given name
export function tryLockOutput(name) {
	const output = localData[name];

	if (output && !output.hasLock) {
		output.hasLock = true;
		output.lastExecuted = Date.now();
		saveData();
		return true;
	}
	return false;
}

// Release the lock on the output with the given name
export function releaseOutput(name) {
	const output = localData[name];
	if (output) {
		output.hasLock = false;
	}
	console.log("Saving data stringified:", JSON.stringify(localData));
	fs.writeFileSync("./Data/OutputPersists.json", JSON.stringify(localData));
}
