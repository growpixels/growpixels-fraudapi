const DAILY_LIMIT = Number(process.env.GPT_DAILY_LIMIT || 12000);

let count = 0;
let day = new Date().toDateString();

function resetIfNewDay() {
  const today = new Date().toDateString();
  if (today !== day) {
    count = 0;
    day = today;
  }
}

export function canCallGPT() {
  resetIfNewDay();
  return count < DAILY_LIMIT;
}

export function recordGPTCall() {
  resetIfNewDay();
  count++;
}

export function getGPTUsage() {
  resetIfNewDay();
  return { used: count, limit: DAILY_LIMIT };
}
