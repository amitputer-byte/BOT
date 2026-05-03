require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const MONDAY_API_TOKEN = process.env.MONDAY_API_TOKEN;
const BOARD_ID = 6652155567;
const BOARD_URL = 'https://solargikcrm.monday.com/boards/6652155567';

app.use(express.static(path.join(__dirname, 'public')));

let cache = null;
let cacheTime = null;
const CACHE_TTL = 60 * 1000; // 1 minute

const COLUMN_IDS = [
  'country__1',       // Destination country
  'port__1',          // Destination port
  'status__1',        // Shipment status
  'label__1',         // Shipping method
  'timeline__1',      // ATD - ETA timeline
  'date__1',          // Initial ETA
  'arrival_date__1',  // Actual arrival date
  'text5__1',         // Origin port country
  'text77__1',        // Destination port country
  'text0__1',         // Current location
  'text94__1',        // Shipper
  'text9__1',         // Container number
  'text8__1',         // File number
  'country_mks5mp2',  // Country of origin
  'numeric_mm08nqsc', // Value of goods
];

async function fetchPage(cursor) {
  const cursorStr = cursor ? `, cursor: "${cursor}"` : '';
  const query = `{
    boards(ids: [${BOARD_ID}]) {
      items_page(limit: 500${cursorStr}) {
        cursor
        items {
          id
          name
          url
          updated_at
          group { title }
          column_values(ids: ${JSON.stringify(COLUMN_IDS)}) {
            id
            text
          }
        }
      }
    }
  }`;

  const resp = await fetch('https://api.monday.com/v2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': MONDAY_API_TOKEN,
      'API-Version': '2024-01',
    },
    body: JSON.stringify({ query }),
  });

  const json = await resp.json();
  if (json.errors) throw new Error(json.errors.map(e => e.message).join('; '));
  return json.data.boards[0].items_page;
}

async function fetchAllShipments() {
  let allItems = [];
  let cursor = null;

  do {
    const page = await fetchPage(cursor);
    allItems = allItems.concat(page.items);
    cursor = page.cursor;
  } while (cursor);

  return allItems;
}

function processItem(item) {
  const cols = {};
  item.column_values.forEach(c => { cols[c.id] = c.text || null; });

  return {
    id: item.id,
    name: item.name,
    url: item.url,
    updatedAt: item.updated_at,
    group: item.group?.title || null,
    country: cols['country__1'],
    port: cols['port__1'],
    status: cols['status__1'],
    shippingMethod: cols['label__1'],
    timeline: cols['timeline__1'],
    initialEta: cols['date__1'],
    arrivalDate: cols['arrival_date__1'],
    originCountry: cols['text5__1'],
    destinationPortCountry: cols['text77__1'],
    currentLocation: cols['text0__1'],
    shipper: cols['text94__1'],
    containerNumber: cols['text9__1'],
    fileNumber: cols['text8__1'],
    countryOfOrigin: cols['country_mks5mp2'],
    valueOfGoods: cols['numeric_mm08nqsc'],
  };
}

app.get('/api/shipments', async (req, res) => {
  try {
    if (!MONDAY_API_TOKEN) {
      return res.status(500).json({
        error: 'MONDAY_API_TOKEN is not configured. Create a .env file based on .env.example.',
        setup: true,
      });
    }

    const forceRefresh = req.query.refresh === '1';

    if (!forceRefresh && cache && cacheTime && Date.now() - cacheTime < CACHE_TTL) {
      return res.json({ ...cache, cached: true });
    }

    const items = await fetchAllShipments();
    const shipments = items.map(processItem);

    const result = {
      shipments,
      total: shipments.length,
      fetchedAt: new Date().toISOString(),
      boardUrl: BOARD_URL,
      cached: false,
    };

    cache = result;
    cacheTime = Date.now();

    res.json(result);
  } catch (err) {
    console.error('Monday.com fetch error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n🗺️  Shipments Map: http://localhost:${PORT}`);
  console.log(`📋  Board: ${BOARD_URL}\n`);
  if (!MONDAY_API_TOKEN) {
    console.warn('⚠️  Warning: MONDAY_API_TOKEN not set — add it to .env file');
  }
});
