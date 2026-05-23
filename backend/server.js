const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const expensesPath = path.join(__dirname, "data", "expenses.json");
const notesPath = path.join(__dirname, "data", "notes.json");
const healthPath = path.join(__dirname, "data", "health.json");
const tasksPath = path.join(__dirname, "data", "tasks.json");
const financePath = path.join(__dirname, "data", "finance.json");

let expenses = JSON.parse(fs.readFileSync(expensesPath));
let notes = JSON.parse(fs.readFileSync(notesPath));
let healthLogs = JSON.parse(fs.readFileSync(healthPath));
let tasks = JSON.parse(fs.readFileSync(tasksPath));
let finance = JSON.parse(fs.readFileSync(financePath));

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
    income: finance.income,
    savingGoal: finance.savingGoal,
  });
});

app.post("/chat", async (req, res) => {
  const { message } = req.body;
  const lowerMessage = message.toLowerCase().trim();

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

  if (lowerMessage.includes("spent")) {
    const amountMatch = lowerMessage.match(/\d+(\.\d+)?/);
    const amount = amountMatch ? Number(amountMatch[0]) : 0;

    let category = "general";

    if (lowerMessage.includes("coffee")) category = "coffee";
    if (lowerMessage.includes("food")) category = "food";
    if (lowerMessage.includes("travel")) category = "travel";
    if (lowerMessage.includes("rent")) category = "rent";
    if (lowerMessage.includes("shopping")) category = "shopping";

    const expense = {
      amount,
      category,
      date: new Date().toLocaleDateString(),
    };

    expenses.push(expense);
    fs.writeFileSync(expensesPath, JSON.stringify(expenses, null, 2));

    const totalSpent = expenses.reduce((sum, item) => sum + item.amount, 0);

    return res.json({
      reply: `Saved £${amount} for ${category}. Your total tracked spending is now £${totalSpent}.`,
    });
  }

  if (lowerMessage.startsWith("note ")) {
    const noteText = message.substring(5);

    const note = {
      text: noteText,
      date: new Date().toLocaleString(),
    };

    notes.push(note);
    fs.writeFileSync(notesPath, JSON.stringify(notes, null, 2));

    return res.json({ reply: "Note saved successfully." });
  }

  if (lowerMessage.includes("show notes")) {
    if (notes.length === 0) {
      return res.json({ reply: "No notes saved yet." });
    }

    const formattedNotes = notes
      .map((note, index) => `${index + 1}. ${note.text} (${note.date})`)
      .join("\n");

    return res.json({ reply: formattedNotes });
  }

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
    fs.writeFileSync(healthPath, JSON.stringify(healthLogs, null, 2));

    let advice = "";

    if (hours < 5) {
      advice =
        "That is very low sleep. Try to keep today light, drink water, avoid too much caffeine, and sleep earlier tonight. If this happens often, consider speaking with a health professional.";
    } else if (hours < 7) {
      advice =
        "You slept less than 7 hours. Try a short 20-minute nap if possible, avoid caffeine later, reduce screen time before bed, and aim to sleep 30–60 minutes earlier tonight.";
    } else if (hours <= 9) {
      advice = "Good sleep amount. Try to keep the same sleep schedule consistently.";
    } else {
      advice =
        "You slept more than 9 hours. That can be okay sometimes, but if you often feel tired even after long sleep, monitor it and consider professional advice.";
    }

    return res.json({
      reply: `Sleep log saved: ${hours} hours.\n\n${advice}`,
    });
  }

  if (lowerMessage.startsWith("schedule ")) {
    const taskText = message.substring(9).trim();

    const task = {
      text: taskText,
      date: new Date().toLocaleString(),
      completed: false,
    };

    tasks.push(task);
    fs.writeFileSync(tasksPath, JSON.stringify(tasks, null, 2));

    return res.json({
      reply: `Task scheduled: ${taskText}`,
    });
  }

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

  if (lowerMessage.startsWith("set income")) {
    const amountMatch = lowerMessage.match(/\d+(\.\d+)?/);
    const income = amountMatch ? Number(amountMatch[0]) : 0;

    finance.income = income;
    fs.writeFileSync(financePath, JSON.stringify(finance, null, 2));

    return res.json({
      reply: `Income saved: £${income}.`,
    });
  }

  if (lowerMessage.startsWith("set saving goal")) {
    const amountMatch = lowerMessage.match(/\d+(\.\d+)?/);
    const savingGoal = amountMatch ? Number(amountMatch[0]) : 0;

    finance.savingGoal = savingGoal;
    fs.writeFileSync(financePath, JSON.stringify(finance, null, 2));

    return res.json({
      reply: `Saving goal saved: £${savingGoal}.`,
    });
  }

  if (lowerMessage.includes("finance advice")) {
    const totalSpent = expenses.reduce((sum, item) => sum + item.amount, 0);
    const remainingAfterGoal = finance.income - finance.savingGoal;
    const remainingAfterSpending =
      finance.income - finance.savingGoal - totalSpent;

    return res.json({
      reply:
        `Finance advice:\n\n` +
        `Income: £${finance.income}\n` +
        `Saving goal: £${finance.savingGoal}\n` +
        `Tracked spending: £${totalSpent}\n` +
        `Safe spending budget after saving goal: £${remainingAfterGoal}\n` +
        `Remaining safe budget: £${remainingAfterSpending}\n\n` +
        `Advice: Try to keep your spending below £${remainingAfterGoal} so you can still save £${finance.savingGoal}.`,
    });
  }

  res.json({
    reply:
      "I can help you track expenses, notes, sleep, schedules, finance goals, and reminders. Try: spent 5 on coffee, note I studied today, sleep 7 hours, schedule gym tomorrow at 7pm, set income 1500, set saving goal 500, or finance advice.",
  });
});

app.listen(PORT, () => {
  console.log(`Mini Jarvis backend running on http://localhost:${PORT}`);
});