import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getNeonClient } from '../config/neonDb.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../../data');
const INQUIRIES_FILE = path.join(DATA_DIR, 'inquiries.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');

function localRead(file) {
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, 'utf8') || '[]');
}

function localWrite(file, data) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

function requireUser(user) {
  if (!user?.id || !user?.username || !user?.companyName) {
    const error = new Error('A signed-in user profile is required.');
    error.statusCode = 401;
    throw error;
  }
}

function fromInquiry(row) {
  return {
    id: row.id, listingId: row.listing_id, listingTitle: row.listing_title,
    sellerUsername: row.seller_username, buyerId: row.buyer_id,
    buyerUsername: row.buyer_username, buyerCompanyName: row.buyer_company,
    message: row.message, quantity: Number(row.quantity), status: row.status,
    createdAt: row.created_at, updatedAt: row.updated_at
  };
}

function fromMessage(row) {
  return {
    id: row.id, inquiryId: row.inquiry_id, senderId: row.sender_id,
    senderUsername: row.sender_username, senderCompanyName: row.sender_company,
    body: row.body, createdAt: row.created_at
  };
}

export async function createInquiry({ listing, buyer, message, quantity }) {
  requireUser(buyer);
  if (!listing?.id || !listing.createdBy) throw new Error('This listing cannot receive inquiries yet.');
  if (listing.createdBy === buyer.username) throw new Error('You cannot inquire about your own listing.');
  if (!message?.trim()) throw new Error('Please add a message for the seller.');
  const inquiry = { id: `inq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, listingId: listing.id, listingTitle: listing.title, sellerUsername: listing.createdBy, buyerId: buyer.id, buyerUsername: buyer.username, buyerCompanyName: buyer.companyName, message: message.trim(), quantity: Number(quantity) || listing.quantity, status: 'new', createdAt: new Date().toISOString() };
  const client = getNeonClient();
  if (client) {
    await client`INSERT INTO inquiries (id, listing_id, listing_title, buyer_id, buyer_username, buyer_company, seller_username, message, quantity, status, created_at) VALUES (${inquiry.id}, ${String(inquiry.listingId)}, ${inquiry.listingTitle}, ${inquiry.buyerId}, ${inquiry.buyerUsername}, ${inquiry.buyerCompanyName}, ${inquiry.sellerUsername}, ${inquiry.message}, ${inquiry.quantity}, ${inquiry.status}, ${inquiry.createdAt})`;
  } else {
    const inquiries = localRead(INQUIRIES_FILE); inquiries.unshift(inquiry); localWrite(INQUIRIES_FILE, inquiries);
  }
  return inquiry;
}

export async function getInquiriesForUser(user, role) {
  requireUser(user);
  const client = getNeonClient();
  if (client) {
    const rows = role === 'seller'
      ? await client`SELECT * FROM inquiries WHERE seller_username = ${user.username} ORDER BY created_at DESC`
      : await client`SELECT * FROM inquiries WHERE buyer_username = ${user.username} ORDER BY created_at DESC`;
    return rows.map(fromInquiry);
  }
  return localRead(INQUIRIES_FILE).filter(item => role === 'seller' ? item.sellerUsername === user.username : item.buyerUsername === user.username);
}

export async function updateInquiryStatus(id, user, status) {
  requireUser(user);
  if (!['new', 'in_progress', 'accepted', 'declined', 'closed'].includes(status)) throw new Error('Invalid inquiry status.');
  const client = getNeonClient();
  if (client) {
    const rows = await client`UPDATE inquiries SET status = ${status}, updated_at = CURRENT_TIMESTAMP WHERE id = ${id} AND (seller_username = ${user.username} OR buyer_username = ${user.username}) RETURNING *`;
    if (!rows.length) throw new Error('Inquiry not found or you do not have access to it.');
    return fromInquiry(rows[0]);
  }
  const inquiries = localRead(INQUIRIES_FILE);
  const item = inquiries.find(entry => entry.id === id);
  if (!item) throw new Error('Inquiry not found.');
  if (item.sellerUsername !== user.username && item.buyerUsername !== user.username) { const error = new Error('You do not have access to this inquiry.'); error.statusCode = 403; throw error; }
  item.status = status; item.updatedAt = new Date().toISOString(); localWrite(INQUIRIES_FILE, inquiries); return item;
}

export async function getMessages(inquiryId, user) {
  requireUser(user);
  const client = getNeonClient();
  if (client) {
    const inquiries = await client`SELECT id FROM inquiries WHERE id = ${inquiryId} AND (seller_username = ${user.username} OR buyer_username = ${user.username})`;
    if (!inquiries.length) { const error = new Error('Conversation not found.'); error.statusCode = 404; throw error; }
    const rows = await client`SELECT * FROM messages WHERE inquiry_id = ${inquiryId} ORDER BY created_at ASC`;
    return rows.map(fromMessage);
  }
  const inquiry = localRead(INQUIRIES_FILE).find(item => item.id === inquiryId);
  if (!inquiry || (inquiry.sellerUsername !== user.username && inquiry.buyerUsername !== user.username)) { const error = new Error('Conversation not found.'); error.statusCode = 404; throw error; }
  return localRead(MESSAGES_FILE).filter(item => item.inquiryId === inquiryId);
}

export async function sendMessage(inquiryId, user, body) {
  requireUser(user);
  if (!body?.trim()) throw new Error('Message cannot be empty.');
  const client = getNeonClient();
  const message = { id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, inquiryId, senderId: user.id, senderUsername: user.username, senderCompanyName: user.companyName, body: body.trim(), createdAt: new Date().toISOString() };
  if (client) {
    const inquiries = await client`SELECT id FROM inquiries WHERE id = ${inquiryId} AND (seller_username = ${user.username} OR buyer_username = ${user.username})`;
    if (!inquiries.length) { const error = new Error('Conversation not found.'); error.statusCode = 404; throw error; }
    await client`INSERT INTO messages (id, inquiry_id, sender_id, sender_username, sender_company, body, created_at) VALUES (${message.id}, ${message.inquiryId}, ${message.senderId}, ${message.senderUsername}, ${message.senderCompanyName}, ${message.body}, ${message.createdAt})`;
  } else {
    const inquiry = localRead(INQUIRIES_FILE).find(item => item.id === inquiryId);
    if (!inquiry || (inquiry.sellerUsername !== user.username && inquiry.buyerUsername !== user.username)) { const error = new Error('Conversation not found.'); error.statusCode = 404; throw error; }
    const messages = localRead(MESSAGES_FILE); messages.push(message); localWrite(MESSAGES_FILE, messages);
  }
  return message;
}
