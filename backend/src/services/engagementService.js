import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getNeonClient } from '../config/neonDb.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../../data');
const INQUIRIES_FILE = path.join(DATA_DIR, 'inquiries.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');

function readJson(file) {
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, 'utf8') || '[]');
}

function writeJson(file, data) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');

  if (file === INQUIRIES_FILE) {
    const client = getNeonClient();
    if (client) {
      (async () => {
        try {
          for (const item of data) {
            await client`
              INSERT INTO inquiries (
                id, listing_id, listing_title, buyer_id, buyer_username, buyer_company, seller_username, message, quantity, status, created_at
              ) VALUES (
                ${item.id}, ${String(item.listingId)}, ${item.listingTitle || ''}, ${item.buyerId},
                ${item.buyerUsername}, ${item.buyerCompanyName}, ${item.sellerUsername},
                ${item.message}, ${item.quantity}, ${item.status || 'new'}, ${item.createdAt || new Date().toISOString()}
              )
              ON CONFLICT (id) DO UPDATE SET
                status = EXCLUDED.status,
                message = EXCLUDED.message,
                quantity = EXCLUDED.quantity
            `;
          }
        } catch (err) {
          console.error('[EngagementService Neon Sync Error]:', err.message);
        }
      })();
    }
  }
}

function requireUser(user) {
  if (!user?.id || !user?.username || !user?.companyName) {
    const error = new Error('A signed-in user profile is required.');
    error.statusCode = 401;
    throw error;
  }
}

export function createInquiry({ listing, buyer, message, quantity }) {
  requireUser(buyer);
  if (!listing?.id || !listing.createdBy) throw new Error('This listing cannot receive inquiries yet.');
  if (listing.createdBy === buyer.username) throw new Error('You cannot inquire about your own listing.');
  if (!message?.trim()) throw new Error('Please add a message for the seller.');

  const inquiries = readJson(INQUIRIES_FILE);
  const inquiry = {
    id: `inq_${Date.now()}`,
    listingId: listing.id,
    listingTitle: listing.title,
    sellerUsername: listing.createdBy,
    buyerId: buyer.id,
    buyerUsername: buyer.username,
    buyerCompanyName: buyer.companyName,
    message: message.trim(),
    quantity: Number(quantity) || listing.quantity,
    status: 'new',
    createdAt: new Date().toISOString()
  };
  inquiries.unshift(inquiry);
  writeJson(INQUIRIES_FILE, inquiries);
  return inquiry;
}

export function getInquiriesForUser(user, role) {
  requireUser(user);
  const inquiries = readJson(INQUIRIES_FILE);
  return inquiries.filter(item => role === 'seller'
    ? item.sellerUsername === user.username
    : item.buyerUsername === user.username);
}

export function updateInquiryStatus(id, user, status) {
  requireUser(user);
  const allowed = ['new', 'in_progress', 'accepted', 'declined', 'closed'];
  if (!allowed.includes(status)) throw new Error('Invalid inquiry status.');
  const inquiries = readJson(INQUIRIES_FILE);
  const index = inquiries.findIndex(item => item.id === id);
  if (index === -1) throw new Error('Inquiry not found.');
  const item = inquiries[index];
  if (item.sellerUsername !== user.username && item.buyerUsername !== user.username) {
    const error = new Error('You do not have access to this inquiry.');
    error.statusCode = 403;
    throw error;
  }
  item.status = status;
  item.updatedAt = new Date().toISOString();
  writeJson(INQUIRIES_FILE, inquiries);
  return item;
}

export function getMessages(inquiryId, user) {
  requireUser(user);
  const inquiry = readJson(INQUIRIES_FILE).find(item => item.id === inquiryId);
  if (!inquiry || (inquiry.sellerUsername !== user.username && inquiry.buyerUsername !== user.username)) {
    const error = new Error('Conversation not found.');
    error.statusCode = 404;
    throw error;
  }
  return readJson(MESSAGES_FILE).filter(item => item.inquiryId === inquiryId);
}

export function sendMessage(inquiryId, user, body) {
  requireUser(user);
  if (!body?.trim()) throw new Error('Message cannot be empty.');
  const inquiry = readJson(INQUIRIES_FILE).find(item => item.id === inquiryId);
  if (!inquiry || (inquiry.sellerUsername !== user.username && inquiry.buyerUsername !== user.username)) {
    const error = new Error('Conversation not found.');
    error.statusCode = 404;
    throw error;
  }
  const messages = readJson(MESSAGES_FILE);
  const message = {
    id: `msg_${Date.now()}`,
    inquiryId,
    senderId: user.id,
    senderUsername: user.username,
    senderCompanyName: user.companyName,
    body: body.trim(),
    createdAt: new Date().toISOString()
  };
  messages.push(message);
  writeJson(MESSAGES_FILE, messages);
  return message;
}
