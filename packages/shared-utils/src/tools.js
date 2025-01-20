export function waitTime(time = 100) {
  return new Promise(r => setTimeout(r, time))
}
