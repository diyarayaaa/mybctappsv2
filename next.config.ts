import type { NextConfig } from "next";
import os from "os";

function getLocalDevOrigins(): string[] {
  const origins = new Set<string>([
    "localhost",
    "localhost:3005",
    "localhost:3000",
    "127.0.0.1",
    "127.0.0.1:3005",
    "127.0.0.1:3000",
    "192.168.1.17",
    "192.168.1.17:3005",
    "192.168.18.66",
    "192.168.18.66:3005",
    "192.168.18.67",
    "192.168.18.67:3005"
  ]);

  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      const ifaceList = interfaces[name];
      if (!ifaceList) continue;
      for (const iface of ifaceList) {
        if (iface.family === "IPv4" || (iface.family as unknown) === 4) {
          origins.add(iface.address);
          origins.add(`${iface.address}:3005`);
          origins.add(`${iface.address}:3000`);
        }
      }
    }
  } catch (e) {
    console.error("Failed to detect network interfaces for allowedDevOrigins", e);
  }

  return Array.from(origins);
}

const nextConfig: NextConfig = {
  // Mengizinkan akses chunk dev resources dari IP LAN dan HP
  allowedDevOrigins: getLocalDevOrigins(),
};

export default nextConfig;
