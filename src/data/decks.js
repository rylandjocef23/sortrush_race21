export const DECKS = {
  dev: {
    id: 'dev',
    label: 'Frontend / Backend',
    leftLabel: 'FRONTEND',
    rightLabel: 'BACKEND',
    leftHint: 'UI, styling, browser runtime',
    rightHint: 'Servers, APIs, databases',
    items: [
      { id: 'react', name: 'React', tag: 'UI Library', category: 'left' },
      { id: 'tailwind', name: 'Tailwind CSS', tag: 'Utility CSS', category: 'left' },
      { id: 'vite', name: 'Vite', tag: 'Frontend Bundler', category: 'left' },
      { id: 'html5', name: 'HTML5', tag: 'Markup', category: 'left' },
      { id: 'css3', name: 'CSS Grid', tag: 'Layout Engine', category: 'left' },
      { id: 'vue', name: 'Vue.js', tag: 'UI Framework', category: 'left' },
      { id: 'svelte', name: 'Svelte', tag: 'UI Compiler', category: 'left' },
      { id: 'figma', name: 'Figma', tag: 'Interface Design', category: 'left' },
      { id: 'dom', name: 'DOM API', tag: 'Browser Tree', category: 'left' },
      { id: 'sass', name: 'Sass / SCSS', tag: 'CSS Preprocessor', category: 'left' },
      { id: 'redux', name: 'Redux', tag: 'Client State', category: 'left' },
      { id: 'jsx', name: 'JSX', tag: 'UI Syntax', category: 'left' },
      { id: 'angular', name: 'Angular', tag: 'Web Framework', category: 'left' },
      { id: 'bootstrap', name: 'Bootstrap', tag: 'Component Kit', category: 'left' },
      { id: 'canvas', name: 'Canvas API', tag: '2D Graphics', category: 'left' },
      { id: 'postgres', name: 'PostgreSQL', tag: 'Relational DB', category: 'right' },
      { id: 'express', name: 'Express.js', tag: 'Node Server', category: 'right' },
      { id: 'supabase', name: 'Supabase', tag: 'BaaS / Postgres', category: 'right' },
      { id: 'firebase', name: 'Firebase RTDB', tag: 'Realtime DB', category: 'right' },
      { id: 'django', name: 'Django', tag: 'Python Framework', category: 'right' },
      { id: 'flask', name: 'Flask', tag: 'Python Micro-API', category: 'right' },
      { id: 'mongodb', name: 'MongoDB', tag: 'NoSQL Document DB', category: 'right' },
      { id: 'redis', name: 'Redis', tag: 'In-Memory Cache', category: 'right' },
      { id: 'laravel', name: 'Laravel', tag: 'PHP Framework', category: 'right' },
      { id: 'mysql', name: 'MySQL', tag: 'SQL Database', category: 'right' },
      { id: 'nginx', name: 'NGINX', tag: 'Reverse Proxy', category: 'right' },
      { id: 'fastapi', name: 'FastAPI', tag: 'Async Python API', category: 'right' },
      { id: 'graphql', name: 'GraphQL Server', tag: 'Query Runtime', category: 'right' },
      { id: 'springboot', name: 'Spring Boot', tag: 'Java Backend', category: 'right' },
      { id: 'prisma', name: 'Prisma ORM', tag: 'DB Query Layer', category: 'right' },
    ],
  },
  systems: {
    id: 'systems',
    label: 'Hardware / Software',
    leftLabel: 'HARDWARE',
    rightLabel: 'SOFTWARE',
    leftHint: 'Physical components & peripherals',
    rightHint: 'OS, applications & utilities',
    items: [
      { id: 'cpu', name: 'CPU', tag: 'Processor Unit', category: 'left' },
      { id: 'ram', name: 'DDR5 RAM', tag: 'Volatile Memory', category: 'left' },
      { id: 'nvme', name: 'NVMe SSD', tag: 'Solid State Drive', category: 'left' },
      { id: 'gpu', name: 'GPU', tag: 'Graphics Card', category: 'left' },
      { id: 'psu', name: 'Power Supply', tag: 'ATX PSU', category: 'left' },
      { id: 'mobo', name: 'Motherboard', tag: 'Main PCB', category: 'left' },
      { id: 'nic', name: 'NIC Card', tag: 'Network Adapter', category: 'left' },
      { id: 'rj45', name: 'RJ45 Connector', tag: 'Ethernet Plug', category: 'left' },
      { id: 'switch', name: '24-Port Switch', tag: 'Layer 2 Device', category: 'left' },
      { id: 'router', name: 'Cisco 1941', tag: 'Physical Router', category: 'left' },
      { id: 'cmos', name: 'CMOS Battery', tag: 'CR2032 Cell', category: 'left' },
      { id: 'heatsink', name: 'VRM Heatsink', tag: 'Thermal Cooler', category: 'left' },
      { id: 'ups', name: 'UPS Unit', tag: 'Battery Backup', category: 'left' },
      { id: 'crimper', name: 'RJ45 Crimper', tag: 'Cabling Tool', category: 'left' },
      { id: 'oled', name: 'OLED Panel', tag: 'Display Matrix', category: 'left' },
      { id: 'linux', name: 'Ubuntu Linux', tag: 'Operating System', category: 'right' },
      { id: 'vscode', name: 'VS Code', tag: 'Code Editor', category: 'right' },
      { id: 'git', name: 'Git CLI', tag: 'Version Control', category: 'right' },
      { id: 'docker', name: 'Docker Engine', tag: 'Container Runtime', category: 'right' },
      { id: 'chrome', name: 'Chromium', tag: 'Web Browser', category: 'right' },
      { id: 'bios', name: 'UEFI Firmware', tag: 'Bootloader', category: 'right' },
      { id: 'wireshark', name: 'Wireshark', tag: 'Packet Analyzer', category: 'right' },
      { id: 'packettracer', name: 'Packet Tracer', tag: 'Network Simulator', category: 'right' },
      { id: 'python', name: 'Python 3.12', tag: 'Interpreter', category: 'right' },
      { id: 'win11', name: 'Windows 11', tag: 'Desktop OS', category: 'right' },
      { id: 'powershell', name: 'PowerShell', tag: 'Command Shell', category: 'right' },
      { id: 'defender', name: 'Endpoint AV', tag: 'Security Suite', category: 'right' },
      { id: 'photoshop', name: 'Photoshop', tag: 'Raster Editor', category: 'right' },
      { id: '7zip', name: '7-Zip', tag: 'File Archiver', category: 'right' },
      { id: 'vmware', name: 'VMware', tag: 'Hypervisor', category: 'right' },
    ],
  },
  network: {
    id: 'network',
    label: 'Web / Networking',
    leftLabel: 'WEB APP',
    rightLabel: 'NETWORKING',
    leftHint: 'HTTP, browser & web standards',
    rightHint: 'Routing, packets & infrastructure',
    items: [
      { id: 'rest', name: 'REST API', tag: 'HTTP Architecture', category: 'left' },
      { id: 'cors', name: 'CORS Policy', tag: 'Browser Security', category: 'left' },
      { id: 'jwt', name: 'JWT Token', tag: 'Web Auth', category: 'left' },
      { id: 'websocket', name: 'WebSocket', tag: 'Full-Duplex Web', category: 'left' },
      { id: 'localstorage', name: 'localStorage', tag: 'Client Storage', category: 'left' },
      { id: 'pwa', name: 'Service Worker', tag: 'Offline PWA', category: 'left' },
      { id: 'cookies', name: 'HTTP Cookie', tag: 'Session Header', category: 'left' },
      { id: 'json', name: 'JSON Payload', tag: 'Data Format', category: 'left' },
      { id: 'oauth', name: 'OAuth 2.0', tag: 'Delegated Auth', category: 'left' },
      { id: 'ssr', name: 'SSR Rendering', tag: 'Page Delivery', category: 'left' },
      { id: 'webhook', name: 'Webhook', tag: 'HTTP Callback', category: 'left' },
      { id: 'csp', name: 'CSP Header', tag: 'XSS Mitigation', category: 'left' },
      { id: 'fetch', name: 'Fetch API', tag: 'Async Request', category: 'left' },
      { id: 'svg', name: 'Inline SVG', tag: 'Vector Graphic', category: 'left' },
      { id: 'wasm', name: 'WebAssembly', tag: 'Browser Binary', category: 'left' },
      { id: 'vlan', name: 'VLAN 802.1Q', tag: 'Subnet Tagging', category: 'right' },
      { id: 'dhcp', name: 'DHCP Server', tag: 'IP Lease Pool', category: 'right' },
      { id: 'dns', name: 'DNS Resolver', tag: 'Name Lookup', category: 'right' },
      { id: 'ospf', name: 'OSPF Protocol', tag: 'Dynamic Routing', category: 'right' },
      { id: 'nat', name: 'PAT / NAT', tag: 'Address Translation', category: 'right' },
      { id: 'arp', name: 'ARP Table', tag: 'IP-to-MAC Map', category: 'right' },
      { id: 'icmp', name: 'ICMP Ping', tag: 'Echo Diagnostic', category: 'right' },
      { id: 'cidr', name: 'CIDR /24', tag: 'Subnet Mask', category: 'right' },
      { id: 'tcp', name: 'TCP Handshake', tag: 'Transport Layer', category: 'right' },
      { id: 'udp', name: 'UDP Datagram', tag: 'Connectionless', category: 'right' },
      { id: 'bgp', name: 'BGP Peering', tag: 'AS Routing', category: 'right' },
      { id: 'acl', name: 'Standard ACL', tag: 'Packet Filter', category: 'right' },
      { id: 'stp', name: 'Spanning Tree', tag: 'Loop Prevention', category: 'right' },
      { id: 't568b', name: 'T568B Pinout', tag: 'Twisted Pair', category: 'right' },
      { id: 'ssh', name: 'SSH Port 22', tag: 'Remote CLI', category: 'right' },
    ],
  },
};

export function createSeededQueue(deckId, count, seed) {
  const deck = DECKS[deckId] || DECKS.dev;
  const pool = [...deck.items];
  // Deterministic PRNG (Mulberry32) so both 1v1 players get the exact same item order
  let a = seed >>> 0;
  const rand = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const queue = [];
  while (queue.length < count) {
    queue.push(pool[queue.length % pool.length]);
  }
  return queue;
}
