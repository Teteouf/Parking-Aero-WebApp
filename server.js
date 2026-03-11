const express = require('express');
const path = require('path');
const { chromium } = require('playwright');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const ROOT_DIR = __dirname;
const CACHE_TTL_MS = Number(process.env.GATE_CACHE_TTL_MS || 90_000);

let browserPromise = null;
const lookupCache = new Map();

const ADP_URLS = [
  'https://www.parisaeroport.fr/fr/passagers/vols/tous-les-vols-depart/cdg',
  'https://www.parisaeroport.fr/fr/passagers/vols/cdg'
];

function normalizeFlight(input) {
  const value = String(input || '').toUpperCase().replace(/\s+/g, '');
  if (!/^[A-Z0-9]{2,3}\d{1,5}$/.test(value)) return null;
  return value;
}

function splitFlightCode(flight) {
  const match = String(flight).match(/^([A-Z0-9]{2,3})(\d{1,5})$/);
  if (!match) return null;
  return {
    carrier: match[1],
    number: match[2],
    normalizedNumber: match[2].replace(/^0+/, '') || match[2]
  };
}

function normalizeText(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function buildFlightRegex(flight) {
  const parts = splitFlightCode(flight);
  if (!parts) return null;

  const carrier = parts.carrier.split('').join('\\s*');
  return new RegExp(`${carrier}\\s*0*${parts.normalizedNumber}\\b`, 'i');
}

function extractGateFromChunk(chunk) {
  const text = String(chunk || '');
  if (!text) return null;

  const labeledPatterns = [
    /(?:GATE\/?PORTE|GATE|PORTE|EMBARQUEMENT)[^A-Z0-9]{0,25}([A-Z]{1,3}\d{0,3}[A-Z]?)\b/i,
    /\b([A-Z]{1,3}\d{0,3}[A-Z]?)\b[^\n]{0,25}(?:GATE\/?PORTE|GATE|PORTE|EMBARQUEMENT)/i
  ];

  for (const regex of labeledPatterns) {
    const match = text.match(regex);
    if (match) {
      const raw = match[1].toUpperCase().trim();
      if (raw.length >= 2 && raw.length <= 8 && !['CDG', 'ORY', 'PARIS'].includes(raw)) {
        return raw;
      }
    }
  }

  return null;
}

function extractTerminalFromChunk(chunk) {
  const match = String(chunk || '').match(/Terminal\s*([0-9A-Z]+)/i);
  return match ? match[1].toUpperCase() : null;
}

function extractStatusFromChunk(chunk) {
  const text = String(chunk || '');
  const known = [
    'Annulé',
    'Retard',
    'Embarquement',
    'Dernier appel',
    'Clôturé',
    'On time',
    'Delayed'
  ];

  const lowered = text.toLowerCase();
  for (const label of known) {
    if (lowered.includes(label.toLowerCase())) return label;
  }
  return null;
}

function extractGateFromText(fullText, flight) {
  const text = String(fullText || '');
  if (!text) return null;

  const lines = text
    .split(/\r?\n+/)
    .map(line => line.trim())
    .filter(Boolean);

  const flightRegex = buildFlightRegex(flight);
  const flightNorm = normalizeText(flight);

  const candidateIndexes = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const normalizedLine = normalizeText(line);
    if (normalizedLine.includes(flightNorm) || (flightRegex && flightRegex.test(line))) {
      candidateIndexes.push(index);
    }
  }

  for (const index of candidateIndexes) {
    const around = lines.slice(Math.max(0, index - 10), Math.min(lines.length, index + 11)).join(' | ');
    const gate = extractGateFromChunk(around);
    if (gate) {
      return {
        gate,
        terminal: extractTerminalFromChunk(around),
        status: extractStatusFromChunk(around),
        snippet: around
      };
    }
  }

  const flightPos = text.toUpperCase().indexOf(flight.toUpperCase());
  if (flightPos >= 0) {
    const around = text.slice(Math.max(0, flightPos - 500), Math.min(text.length, flightPos + 900));
    const gate = extractGateFromChunk(around);
    if (gate) {
      return {
        gate,
        terminal: extractTerminalFromChunk(around),
        status: extractStatusFromChunk(around),
        snippet: around
      };
    }
  }

  return null;
}

function gateFromValue(value) {
  if (typeof value !== 'string') return null;
  const raw = value.trim().toUpperCase();
  if (!raw) return null;

  const fromLabel = extractGateFromChunk(raw);
  if (fromLabel) return fromLabel;

  const strictMatch = raw.match(/\b([A-Z]{1,3}\d{0,3}[A-Z]?)\b/);
  if (!strictMatch) return null;

  const gate = strictMatch[1];
  if (gate.length < 2 || gate.length > 8) return null;
  if (['CDG', 'ORY', 'PARIS'].includes(gate)) return null;
  return gate;
}

function hasFlightInObject(current, parts, flightRegex, flightNorm) {
  const jsonText = JSON.stringify(current || {});
  if (!jsonText) return false;

  const normalizedJson = normalizeText(jsonText);
  if (normalizedJson.includes(flightNorm)) return true;
  if (flightRegex && flightRegex.test(jsonText)) return true;

  const entries = Object.entries(current || {});
  let carriers = [];
  let numbers = [];

  for (const [key, value] of entries) {
    const keyLower = key.toLowerCase();

    if (typeof value === 'string' || typeof value === 'number') {
      const raw = String(value).toUpperCase();
      if (/carrier|airline|compagnie|iata|designator/.test(keyLower)) {
        carriers.push(raw.replace(/[^A-Z0-9]/g, ''));
      }
      if (/flight|vol|numero|number/.test(keyLower)) {
        numbers.push(raw.replace(/[^0-9]/g, ''));
      }
    }
  }

  carriers = carriers.filter(Boolean);
  numbers = numbers.filter(Boolean);

  for (const carrier of carriers) {
    for (const number of numbers) {
      const compact = `${carrier}${number.replace(/^0+/, '') || number}`;
      if (compact === `${parts.carrier}${parts.normalizedNumber}`) return true;
    }
  }

  return false;
}

function findGateInJsonPayloads(payloads, flight) {
  const flightNorm = normalizeText(flight);
  const flightRegex = buildFlightRegex(flight);
  const parts = splitFlightCode(flight);
  if (!parts) return null;

  const gateKeyRegex = /(gate|porte|boarding.?gate|gatecode|porte_embarquement)/i;
  const terminalKeyRegex = /(terminal)/i;
  const statusKeyRegex = /(status|etat)/i;

  function walk(root) {
    const queue = [root];
    const seen = new Set();

    while (queue.length) {
      const current = queue.shift();
      if (!current || typeof current !== 'object') continue;
      if (seen.has(current)) continue;
      seen.add(current);

      if (Array.isArray(current)) {
        for (const item of current) queue.push(item);
        continue;
      }

      const entries = Object.entries(current);
      const hasFlight = hasFlightInObject(current, parts, flightRegex, flightNorm);

      if (hasFlight) {
        let gate = null;
        let terminal = null;
        let status = null;

        for (const [key, value] of entries) {
          if (typeof value !== 'string' && typeof value !== 'number') continue;

          const keyLower = key.toLowerCase();
          const rawValue = String(value);

          if (!gate && gateKeyRegex.test(keyLower)) {
            gate = gateFromValue(rawValue);
          }
          if (!terminal && terminalKeyRegex.test(keyLower)) {
            terminal = rawValue.trim();
          }
          if (!status && statusKeyRegex.test(keyLower)) {
            status = rawValue.trim();
          }
        }

        if (!gate) {
          gate = extractGateFromChunk(JSON.stringify(current));
        }

        if (gate) {
          return {
            gate,
            terminal,
            status,
            snippet: JSON.stringify(current).slice(0, 700)
          };
        }
      }

      for (const [, value] of entries) {
        if (value && typeof value === 'object') queue.push(value);
      }
    }

    return null;
  }

  for (const payload of payloads) {
    const found = walk(payload.data);
    if (found) {
      return {
        ...found,
        source: `adp-json:${payload.url}`
      };
    }
  }

  return null;
}

async function getBrowser() {
  if (!browserPromise) {
    browserPromise = chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }
  return browserPromise;
}

async function acceptCookiesIfPresent(page) {
  const labels = [
    'Tout accepter',
    'Accepter',
    'Allow all',
    'J\'accepte',
    'OK'
  ];

  for (const label of labels) {
    const locator = page.locator(`button:has-text("${label}")`).first();
    try {
      if (await locator.isVisible({ timeout: 700 })) {
        await locator.click({ timeout: 1200 });
        return;
      }
    } catch (_) {
      // no-op
    }
  }
}

async function fillSearchInput(page, flight) {
  const selectors = [
    'input[placeholder*="vol" i]',
    'input[placeholder*="Destination" i]',
    'input[placeholder*="n° de vol" i]',
    'input[type="search"]',
    'input[name*="search" i]'
  ];

  for (const selector of selectors) {
    const input = page.locator(selector).first();
    try {
      if (await input.isVisible({ timeout: 1000 })) {
        await input.click({ timeout: 1000 });
        await input.fill('');
        await input.fill(flight);
        await page.keyboard.press('Enter');
        return true;
      }
    } catch (_) {
      // continue
    }
  }

  return false;
}

async function tryOpenFlightDetails(page, flight) {
  try {
    const clicked = await page.evaluate(flightCode => {
      const norm = value => String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      const targetFlight = norm(flightCode);

      const candidates = Array.from(document.querySelectorAll('a, button, [role="button"], article, li, div'))
        .map(element => ({
          element,
          text: (element.innerText || element.textContent || '').trim()
        }))
        .filter(item => item.text && item.text.length <= 500)
        .filter(item => norm(item.text).includes(targetFlight));

      for (const candidate of candidates) {
        const { element } = candidate;
        try {
          element.scrollIntoView({ block: 'center' });
          element.click();
          return true;
        } catch (_) {
          // no-op
        }
      }

      return false;
    }, flight);

    if (clicked) {
      await page.waitForTimeout(1400);
      return true;
    }
  } catch (_) {
    // no-op
  }

  return false;
}

async function findFromDom(page, flight) {
  const bodyText = await page.evaluate(() => (document.body ? document.body.innerText || '' : ''));
  const result = extractGateFromText(bodyText, flight);
  if (!result) return null;
  return {
    ...result,
    source: 'adp-dom'
  };
}

async function lookupGateFromAdp(flight) {
  const browser = await getBrowser();
  const context = await browser.newContext({
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
    userAgent:
      'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36'
  });

  const page = await context.newPage();
  const capturedJsonPayloads = [];

  page.on('response', async response => {
    try {
      const contentType = String(response.headers()['content-type'] || '').toLowerCase();
      if (!contentType.includes('application/json')) return;

      const url = response.url();
      if (!/(vol|flight|depart|arriv|horaire|schedule)/i.test(url)) return;

      const data = await response.json();
      capturedJsonPayloads.push({ url, data });
    } catch (_) {
      // ignore
    }
  });

  try {
    for (const url of ADP_URLS) {
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25_000 });
      } catch (_) {
        continue;
      }

      await acceptCookiesIfPresent(page);
      await fillSearchInput(page, flight);

      let detailsOpened = false;
      for (let attempt = 0; attempt < 10; attempt += 1) {
        await page.waitForTimeout(900);

        const domResult = await findFromDom(page, flight);
        if (domResult && domResult.gate) {
          return {
            ...domResult,
            source: `${domResult.source}:${url}`
          };
        }

        const jsonResult = findGateInJsonPayloads(capturedJsonPayloads, flight);
        if (jsonResult && jsonResult.gate) {
          return jsonResult;
        }

        if (!detailsOpened && attempt >= 2) {
          detailsOpened = await tryOpenFlightDetails(page, flight);
        }
      }

      try {
        const allFlights = page.locator('a:has-text("Tous les vols"), button:has-text("Tous les vols")').first();
        if (await allFlights.isVisible({ timeout: 1000 })) {
          await allFlights.click({ timeout: 1200 });
          await page.waitForTimeout(1400);

          const domResult = await findFromDom(page, flight);
          if (domResult && domResult.gate) {
            return {
              ...domResult,
              source: `${domResult.source}:${url}:tous-les-vols`
            };
          }

          const jsonResult = findGateInJsonPayloads(capturedJsonPayloads, flight);
          if (jsonResult && jsonResult.gate) {
            return jsonResult;
          }
        }
      } catch (_) {
        // no-op
      }
    }

    return null;
  } finally {
    await context.close();
  }
}

function buildAdpFallbackUrl(flight) {
  const encoded = encodeURIComponent(flight);
  return `https://www.parisaeroport.fr/fr/passagers/vols/tous-les-vols-depart/cdg?search=${encoded}`;
}

function getCachedFlight(flight) {
  const entry = lookupCache.get(flight);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    lookupCache.delete(flight);
    return null;
  }
  return entry.data;
}

function setCachedFlight(flight, data) {
  lookupCache.set(flight, {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS
  });
}

app.use((req, res, next) => {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

app.options('/api/gate', (_req, res) => {
  res.status(204).end();
});

app.get('/api/gate', async (req, res) => {
  const flight = normalizeFlight(req.query.flight);
  if (!flight) {
    return res.status(400).json({
      found: false,
      message: 'Paramètre flight invalide (exemple: AF7434).'
    });
  }

  const cached = getCachedFlight(flight);
  if (cached) {
    return res.json({ ...cached, cached: true });
  }

  try {
    const result = await lookupGateFromAdp(flight);

    if (!result || !result.gate) {
      return res.status(404).json({
        found: false,
        flight,
        message: 'Porte non trouvée automatiquement sur ADP pour ce vol.',
        fallbackUrl: buildAdpFallbackUrl(flight)
      });
    }

    const payload = {
      found: true,
      flight,
      gate: result.gate,
      terminal: result.terminal || null,
      status: result.status || null,
      source: result.source || 'adp',
      fallbackUrl: buildAdpFallbackUrl(flight)
    };

    setCachedFlight(flight, payload);
    return res.json(payload);
  } catch (error) {
    return res.status(502).json({
      found: false,
      flight,
      message: 'Erreur lors de la récupération automatique sur ADP.',
      error: error && error.message ? error.message : String(error),
      fallbackUrl: buildAdpFallbackUrl(flight)
    });
  }
});

app.use(express.static(ROOT_DIR));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ message: 'API introuvable' });
  }
  return res.sendFile(path.join(ROOT_DIR, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Parking Aero WebApp + API running on http://localhost:${PORT}`);
});

async function shutdown() {
  try {
    const browser = await browserPromise;
    if (browser) await browser.close();
  } catch (_) {
    // no-op
  }
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);