import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/**
 * Hardware telemetry monitor: CPU, RAM, and GPU/VRAM.
 * - CPU: calculated from tick differential across logical cores.
 * - RAM: os.totalmem() and os.freemem().
 * - GPU: attempts `nvidia-smi` first (live VRAM + utilization + temp),
 *        with fallback to Windows CIM (`Win32_VideoController`) for AMD/Intel/Integrated GPUs.
 */

function sampleCpuTicks() {
  const cpus = os.cpus();
  let idle = 0;
  let total = 0;
  for (const cpu of cpus) {
    for (const type of Object.keys(cpu.times)) {
      total += cpu.times[type];
    }
    idle += cpu.times.idle;
  }
  return { idle, total };
}

let prevCpu = sampleCpuTicks();
let lastCpuPercent = 0;

function getCpuUsagePercent() {
  const cur = sampleCpuTicks();
  const idleDiff = cur.idle - prevCpu.idle;
  const totalDiff = cur.total - prevCpu.total;
  prevCpu = cur;
  if (totalDiff <= 0) return lastCpuPercent;
  lastCpuPercent = Math.min(100, Math.max(0, Math.round((1 - idleDiff / totalDiff) * 100)));
  return lastCpuPercent;
}

let cachedStaticGpu = undefined;

async function queryNvidiaSmi() {
  try {
    const { stdout } = await execFileAsync(
      'nvidia-smi',
      [
        '--query-gpu=name,memory.used,memory.total,utilization.gpu,temperature.gpu',
        '--format=csv,noheader,nounits',
      ],
      { timeout: 1500, windowsHide: true },
    );
    const line = stdout.trim().split(/\r?\n/)[0];
    if (!line) return null;
    const [name, memUsedMB, memTotalMB, utilGpu, tempC] = line.split(',').map((s) => s.trim());
    const usedBytes = Number(memUsedMB) * 1024 * 1024;
    const totalBytes = Number(memTotalMB) * 1024 * 1024;
    return {
      available: true,
      vendor: 'nvidia',
      name,
      vramUsed: Number.isFinite(usedBytes) ? usedBytes : null,
      vramTotal: Number.isFinite(totalBytes) ? totalBytes : null,
      vramPercent:
        totalBytes > 0 ? Math.min(100, Math.round((usedBytes / totalBytes) * 100)) : null,
      utilizationPercent: Number.isFinite(Number(utilGpu)) ? Number(utilGpu) : null,
      temperatureC: Number.isFinite(Number(tempC)) ? Number(tempC) : null,
    };
  } catch {
    return null;
  }
}

async function queryFallbackGpu() {
  if (cachedStaticGpu !== undefined) return cachedStaticGpu;
  if (process.platform !== 'win32') {
    cachedStaticGpu = { available: false, name: 'Unavailable' };
    return cachedStaticGpu;
  }
  try {
    const { stdout } = await execFileAsync(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        'Get-CimInstance Win32_VideoController | Select-Object -First 1 Name, AdapterRAM | ConvertTo-Json -Compress',
      ],
      { timeout: 2500, windowsHide: true },
    );
    const parsed = JSON.parse(stdout.trim());
    cachedStaticGpu = {
      available: Boolean(parsed?.Name),
      vendor: 'generic',
      name: parsed?.Name || 'Integrated GPU',
      vramUsed: null,
      vramTotal: Number(parsed?.AdapterRAM) > 0 ? Number(parsed.AdapterRAM) : null,
      vramPercent: null,
      utilizationPercent: null,
      temperatureC: null,
    };
  } catch {
    cachedStaticGpu = { available: false, name: 'GPU not detected' };
  }
  return cachedStaticGpu;
}

export async function getSystemStats() {
  const cpus = os.cpus();
  const cpuModel = cpus[0]?.model?.trim() || 'Unknown CPU';
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  const nvidia = await queryNvidiaSmi();
  const gpu = nvidia ?? (await queryFallbackGpu());

  return {
    timestamp: Date.now(),
    cpu: {
      model: cpuModel,
      cores: cpus.length,
      usagePercent: getCpuUsagePercent(),
    },
    ram: {
      usedBytes: usedMem,
      totalBytes: totalMem,
      usagePercent: Math.round((usedMem / totalMem) * 100),
    },
    gpu,
  };
}
