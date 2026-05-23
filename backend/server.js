const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const dataFolderPath = path.join(__dirname, "data");

if (!fs.existsSync(dataFolderPath)) {
  fs.mkdirSync(dataFolderPath);
}

const expensesPath = path.join(dataFolderPath, "expenses.json");
const notesPath = path.join(dataFolderPath, "notes.json");
const healthPath = path.join(dataFolderPath, "health.json");
const tasksPath = path.join(dataFolderPath, "tasks.json");
const financePath = path.join(dataFolderPath, "finance.json");

function loadJsonFile(filePath, defaultValue) {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
      return defaultValue;
    }

    const fileContent = fs.readFileSync(filePath, "utf8");

    if (!fileContent.trim()) {
      fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
      return defaultValue;
    }

    return JSON.parse(fileContent);
  } catch (error) {
    console.error(`Error loading file: ${filePath}`, error.message);
    fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
    return defaultValue;
  }
}

function saveJsonFile(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

let expenses = loadJsonFile(expensesPath, []);
let notes = loadJsonFile(notesPath, []);
let healthLogs = loadJsonFile(healthPath, []);
let tasks = loadJsonFile(tasksPath, []);
let finance = loadJsonFile(financePath, {
  income: 0,
  savingGoal: 0,
});

app.get("/", (req, res) => {
  res.send("Mini Jarvis backend is running");
});

app.get("/dashboard", (req, res) => {
  const totalSpent = expenses.reduce((sum, item) => sum + item.amount, 0);

  const sleepLogs = healthLogs.filter(log => log.type === "sleep");

  let averageSleep = 0;

  if (sleepLogs.length > 0) {
    averageSleep =
      sleepLogs.reduce((sum, log) => sum + log.value, 0) / sleepLogs.length;
  }

  const pendingTasks = tasks.filter(task => !task.completed).length;

  res.json({
    totalSpent,
    averageSleep: averageSleep.toFixed(1),
    pendingTasks,
    notesCount: notes.length,
    income: finance.income || 0,
    savingGoal: finance.savingGoal || 0,
  });
});

app.post("/chat", async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.json({
      reply: "Please type a message for Jarvis.",
    });
  }

  const lowerMessage = message.toLowerCase().trim();

  // REMINDER
  if (lowerMessage.includes("remind me in")) {
    const secondsMatch = lowerMessage.match(/in (\d+) seconds?/);
    const minutesMatch = lowerMessage.match(/in (\d+) minutes?/);
    const hoursMatch = lowerMessage.match(/in (\d+) hours?/);
    const daysMatch = lowerMessage.match(/in (\d+) days?/);
    const monthsMatch = lowerMessage.match(/in (\d+) months?/);

    let timeText = "10 seconds";

    if (secondsMatch) timeText = `${secondsMatch[1]} second(s)`;
    if (minutesMatch) timeText = `${minutesMatch[1]} minute(s)`;
    if (hoursMatch) timeText = `${hoursMatch[1]} hour(s)`;
    if (daysMatch) timeText = `${daysMatch[1]} day(s)`;
    if (monthsMatch) timeText = `${monthsMatch[1]} month(s)`;

    const reminderText = message
      .replace(/remind me in \d+ seconds? to/i, "")
      .replace(/remind me in \d+ minutes? to/i, "")
      .replace(/remind me in \d+ hours? to/i, "")
      .replace(/remind me in \d+ days? to/i, "")
      .replace(/remind me in \d+ months? to/i, "")
      .trim();

    return res.json({
      reply: `Reminder set for ${timeText}: ${reminderText || "your task"}`,
    });
  }

  // HEALTH SUMMARY
  if (lowerMessage.includes("health summary")) {
    const sleepLogs = healthLogs.filter(log => log.type === "sleep");

    if (sleepLogs.length === 0) {
      return res.json({ reply: "No health logs saved yet." });
    }

    const totalSleep = sleepLogs.reduce((sum, log) => sum + log.value, 0);
    const averageSleep = (totalSleep / sleepLogs.length).toFixed(1);

    return res.json({
      reply: `Health summary: you logged sleep ${sleepLogs.length} time(s). Your average sleep is ${averageSleep} hours.`,
    });
  }

  // EXPENSE SUMMARY
  if (
    lowerMessage === "summary" ||
    lowerMessage.includes("spending summary") ||
    lowerMessage.includes("expense summary")
  ) {
    const totalSpent = expenses.reduce((sum, item) => sum + item.amount, 0);

    return res.json({
      reply: `Your spending summary: you have tracked ${expenses.length} expense(s), with total spending of £${totalSpent}.`,
    });
  }

  // ADD EXPENSE
  if (lowerMessage.includes("spent")) {
    const amountMatch = lowerMessage.match(/\d+(\.\d+)?/);
    const amount = amountMatch ? Number(amountMatch[0]) : 0;

    let category = "general";

    if (lowerMessage.includes("coffee")) category = "coffee";
    if (lowerMessage.includes("food")) category = "food";
    if (lowerMessage.includes("travel")) category = "travel";
    if (lowerMessage.includes("rent")) category = "rent";
    if (lowerMessage.includes("shopping")) category = "shopping";
    if (lowerMessage.includes("bill")) category = "bill";
    if (lowerMessage.includes("subscription")) category = "subscription";

    const expense = {
      amount,
      category,
      date: new Date().toLocaleDateString(),
    };

    expenses.push(expense);
    saveJsonFile(expensesPath, expenses);

    const totalSpent = expenses.reduce((sum, item) => sum + item.amount, 0);

    return res.json({
      reply: `Saved £${amount} for ${category}. Your total tracked spending is now £${totalSpent}.`,
    });
  }

  // ADD NOTE
  if (lowerMessage.startsWith("note ")) {
    const noteText = message.substring(5).trim();

    const note = {
      text: noteText,
      date: new Date().toLocaleString(),
    };

    notes.push(note);
    saveJsonFile(notesPath, notes);

    return res.json({ reply: "Note saved successfully." });
  }

  // SHOW NOTES
  if (lowerMessage.includes("show notes")) {
    if (notes.length === 0) {
      return res.json({ reply: "No notes saved yet." });
    }

    const formattedNotes = notes
      .map((note, index) => `${index + 1}. ${note.text} (${note.date})`)
      .join("\n");

    return res.json({ reply: formattedNotes });
  }

  // SLEEP TRACKING
  if (lowerMessage.includes("sleep")) {
    const hoursMatch = lowerMessage.match(/\d+(\.\d+)?/);
    const hours = hoursMatch ? Number(hoursMatch[0]) : 0;

    const healthLog = {
      type: "sleep",
      value: hours,
      unit: "hours",
      date: new Date().toLocaleString(),
    };

    healthLogs.push(healthLog);
    saveJsonFile(healthPath, healthLogs);

    let advice = "";

    if (hours < 5) {
      advice =
        "That is very low sleep. Try to keep today light, drink water, avoid too much caffeine, and sleep earlier tonight. If this happens often, consider speaking with a health professional.";
    } else if (hours < 7) {
      advice =
        "You slept less than 7 hours. Try a short 20-minute nap if possible, avoid caffeine later, reduce screen time before bed, and aim to sleep 30–60 minutes earlier tonight.";
    } else if (hours <= 9) {
      advice =
        "Good sleep amount. Try to keep the same sleep schedule consistently.";
    } else {
      advice =
        "You slept more than 9 hours. That can be okay sometimes, but if you often feel tired even after long sleep, monitor it and consider professional advice.";
    }

    return res.json({
      reply: `Sleep log saved: ${hours} hours.\n\n${advice}`,
    });
  }

  // ADD SCHEDULE
  if (lowerMessage.startsWith("schedule ")) {
    const taskText = message.substring(9).trim();

    const task = {
      text: taskText,
      date: new Date().toLocaleString(),
      completed: false,
    };

    tasks.push(task);
    saveJsonFile(tasksPath, tasks);

    return res.json({
      reply: `Task scheduled: ${taskText}`,
    });
  }

  // SHOW SCHEDULE
  if (lowerMessage.includes("show schedule")) {
    if (tasks.length === 0) {
      return res.json({ reply: "No scheduled tasks yet." });
    }

    const formattedTasks = tasks
      .map((task, index) => {
        const status = task.completed ? "Done" : "Pending";
        return `${index + 1}. ${task.text} - ${status}`;
      })
      .join("\n");

    return res.json({ reply: formattedTasks });
  }

  // SET INCOME
  if (lowerMessage.startsWith("set income")) {
    const amountMatch = lowerMessage.match(/\d+(\.\d+)?/);
    const income = amountMatch ? Number(amountMatch[0]) : 0;

    finance.income = income;
    saveJsonFile(financePath, finance);

    return res.json({
      reply: `Income saved: £${income}.`,
    });
  }

  // SET SAVING GOAL
  if (lowerMessage.startsWith("set saving goal")) {
    const amountMatch = lowerMessage.match(/\d+(\.\d+)?/);
    const savingGoal = amountMatch ? Number(amountMatch[0]) : 0;

    finance.savingGoal = savingGoal;
    saveJsonFile(financePath, finance);

    return res.json({
      reply: `Saving goal saved: £${savingGoal}.`,
    });
  }

  // FINANCE ADVICE
  if (lowerMessage.includes("finance advice")) {
    const totalSpent = expenses.reduce((sum, item) => sum + item.amount, 0);
    const remainingAfterGoal = finance.income - finance.savingGoal;
    const remainingAfterSpending =
      finance.income - finance.savingGoal - totalSpent;

    let advice = `Try to keep your spending below £${remainingAfterGoal} so you can still save £${finance.savingGoal}.`;

    if (remainingAfterSpending < 0) {
      advice =
        "Warning: you have gone over your safe budget. Reduce non-essential spending and review food, coffee, shopping, and subscriptions.";
    } else if (remainingAfterSpending < 100) {
      advice =
        "Careful: your remaining safe budget is low. Try to avoid unnecessary spending until your next income.";
    }

    return res.json({
      reply:
        `Finance advice:\n\n` +
        `Income: £${finance.income}\n` +
        `Saving goal: £${finance.savingGoal}\n` +
        `Tracked spending: £${totalSpent}\n` +
        `Safe spending budget after saving goal: £${remainingAfterGoal}\n` +
        `Remaining safe budget: £${remainingAfterSpending}\n\n` +
        `Advice: ${advice}`,
    });
  }

  res.json({
    reply:
      "I can help you track expenses, notes, sleep, schedules, finance goals, and reminders. Try: spent 5 on coffee, note I studied today, sleep 7 hours, schedule gym tomorrow at 7pm, set income 1500, set saving goal 500, or finance advice.",
  });
});

app.listen(PORT, () => {
  console.log(`Mini Jarvis backend running on port ${PORT}`);
});