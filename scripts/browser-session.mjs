// Dependency-free Chrome session shared by local browser audits.
import { mkdtemp, readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';

export const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

export async function createBrowserSession({ args = [] } = {}) {
  const profile = await mkdtemp(path.join(os.tmpdir(), 'idomods-refactor-qa-'));
  const chrome = process.env.CHROME_PATH || path.join(process.env.ProgramFiles, 'Google/Chrome/Application/chrome.exe');
  const browser = spawn(chrome, [
    '--headless', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-port=0', `--user-data-dir=${profile}`,
    ...args,
  ], { windowsHide: true, stdio: 'ignore' });
  let socket;
  const pending = new Map();
  const listeners = new Set();
  let nextId = 0;
  const close = () => {
    socket?.close();
    browser.kill();
  };

  try {
    let port;
    for (let attempt = 0; attempt < 100 && !port; attempt++) {
      try {
        port = Number((await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]);
      } catch { await sleep(100); }
    }
    if (!port) throw new Error('Chrome debugging endpoint did not start');
    const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    socket = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      socket.addEventListener('open', resolve, { once: true });
      socket.addEventListener('error', reject, { once: true });
    });
    socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (!message.id) {
        for (const listener of listeners) listener(message);
        return;
      }
      const request = pending.get(message.id);
      if (!request) return;
      clearTimeout(request.timeout);
      pending.delete(message.id);
      if (message.error) request.reject(new Error(message.error.message));
      else request.resolve(message.result);
    });
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++nextId;
      const timeout = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`Chrome timed out: ${method}`));
      }, 30000);
      pending.set(id, { resolve, reject, timeout });
      socket.send(JSON.stringify({ id, method, params }));
    });
    const run = async expression => {
      const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
      return result.result.value;
    };
    const waitFor = async expression => {
      for (let attempt = 0; attempt < 100; attempt++) {
        if (await run(expression)) return;
        await sleep(100);
      }
      throw new Error(`Timed out: ${expression}`);
    };
    await send('Page.enable');
    await send('Runtime.enable');
    const onEvent = listener => { listeners.add(listener); return () => listeners.delete(listener); };
    return { send, run, waitFor, close, onEvent };
  } catch (error) {
    close();
    throw error;
  }
}
