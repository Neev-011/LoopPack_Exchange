import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getNeonClient } from '../config/neonDb.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const USERS_FILE = path.join(__dirname, '../../data/users.json');

const INITIAL_USERS = [
  { id: 'usr_apex', username: 'apex_logistics', companyName: 'Apex Packaging Solutions Ltd', email: 'contact@apexlogistics.com', password: 'password123', role: 'supplier', roleLabel: 'Packaging Supplier', industry: 'Logistics & Warehousing', securityQuestion: "What is your company's founding hub city?", securityAnswer: 'mumbai', createdAt: '2026-01-15T09:00:00.000Z' },
  { id: 'usr_greenwave', username: 'greenwave_retail', companyName: 'GreenWave E-Commerce Hub', email: 'circularity@greenwaveretail.com', password: 'password123', role: 'buyer', roleLabel: 'Buyer / Recycler', industry: 'Retail & Consumer Packaging', securityQuestion: "What is your company's founding hub city?", securityAnswer: 'delhi', createdAt: '2026-02-10T11:30:00.000Z' },
  { id: 'usr_tatsav', username: 'tatsav_enterprise', companyName: 'LoopPack Industrial Ecosystems', email: 'tatsav@looppack.io', password: 'password123', role: 'enterprise', roleLabel: 'Enterprise Circularity Officer', industry: 'Closed-Loop Circular Supply Chain', securityQuestion: "What is your company's founding hub city?", securityAnswer: 'ahmedabad', createdAt: '2026-03-01T08:00:00.000Z' },
  { id: 'usr_mahindra', username: 'mahindra_freight', companyName: 'Mahindra Backhaul Fleet Carrier', email: 'dispatch@mahindrafreight.com', password: 'password123', role: 'logistics', roleLabel: 'Logistics Partner', industry: 'Freight & Fleet Logistics', securityQuestion: "What is your company's founding hub city?", securityAnswer: 'pune', createdAt: '2026-03-10T09:00:00.000Z' }
];

function readLocalUsers() {
  try {
    if (!fs.existsSync(USERS_FILE)) return INITIAL_USERS;
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8') || '[]');
    return users.length ? users : INITIAL_USERS;
  } catch (err) {
    console.error('[AuthService] Local user read failed:', err.message);
    return INITIAL_USERS;
  }
}

function saveLocalUsers(users) {
  fs.mkdirSync(path.dirname(USERS_FILE), { recursive: true });
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

function fromRow(row) {
  return row && {
    id: row.id, username: row.username, companyName: row.company_name, email: row.email,
    password: row.password, role: row.role, roleLabel: row.role_label, industry: row.industry,
    securityQuestion: row.security_question, securityAnswer: row.security_answer, createdAt: row.created_at
  };
}

function sanitizeUser(user) {
  if (!user) return null;
  const { password, securityAnswer, ...safeUser } = user;
  return safeUser;
}

async function readUsers() {
  const client = getNeonClient();
  if (client) {
    const rows = await client`SELECT * FROM users ORDER BY created_at ASC`;
    return rows.map(fromRow);
  }
  return readLocalUsers();
}

async function saveUser(user) {
  const client = getNeonClient();
  if (client) {
    await client`
      INSERT INTO users (id, username, company_name, email, password, role, role_label, industry, security_question, security_answer, created_at)
      VALUES (${user.id}, ${user.username}, ${user.companyName}, ${user.email}, ${user.password}, ${user.role}, ${user.roleLabel}, ${user.industry}, ${user.securityQuestion || ''}, ${user.securityAnswer || ''}, ${user.createdAt || new Date().toISOString()})
      ON CONFLICT (id) DO UPDATE SET company_name=EXCLUDED.company_name, email=EXCLUDED.email, password=EXCLUDED.password,
        role=EXCLUDED.role, role_label=EXCLUDED.role_label, industry=EXCLUDED.industry,
        security_question=EXCLUDED.security_question, security_answer=EXCLUDED.security_answer
    `;
    return;
  }
  const users = readLocalUsers();
  const index = users.findIndex(item => item.id === user.id);
  if (index === -1) users.push(user); else users[index] = user;
  saveLocalUsers(users);
}

export async function getAllDemoUsers() {
  return (await readUsers()).map(sanitizeUser);
}

export async function checkUsername(username) {
  if (!username) return { exists: false };
  const found = (await readUsers()).find(user => user.username.toLowerCase() === username.trim().toLowerCase());
  return found ? { exists: true, userPreview: { username: found.username, companyName: found.companyName, role: found.role, roleLabel: found.roleLabel, securityQuestion: found.securityQuestion } } : { exists: false };
}

export async function authenticateUser({ usernameOrEmail, password }) {
  if (!usernameOrEmail || !password) throw new Error('Please enter both username/email and password.');
  const needle = usernameOrEmail.trim().toLowerCase();
  const user = (await readUsers()).find(item => item.username.toLowerCase() === needle || item.email.toLowerCase() === needle);
  if (!user) throw new Error('Account does not exist. Please check your username or register a new account.');
  if (user.password !== password) throw new Error('Incorrect password. Try again or use "Forgot Password".');
  return sanitizeUser(user);
}

export async function registerUser({ username, companyName, email, password, role = 'supplier', industry = 'Manufacturing & Logistics', securityQuestion = "What is your company's founding hub city?", securityAnswer = '' }) {
  if (!username || !companyName || !email || !password) throw new Error('Username, Company Name, Email, and Password are required.');
  const cleanUsername = username.trim().toLowerCase().replace(/\s+/g, '_');
  const cleanEmail = email.trim().toLowerCase();
  const users = await readUsers();
  if (users.some(user => user.username.toLowerCase() === cleanUsername)) throw new Error(`Username "${cleanUsername}" is already registered. Please choose another username or sign in.`);
  if (users.some(user => user.email.toLowerCase() === cleanEmail)) throw new Error(`Corporate email "${cleanEmail}" is already linked to an account.`);
  const roleLabels = { supplier: 'Buyer / Seller Organization', buyer: 'Buyer / Seller Organization', logistics: 'Logistics Partner' };
  const allowedRoles = ['supplier', 'logistics'];
  if (!allowedRoles.includes(role)) throw new Error('Please choose a valid LoopPack usage role.');
  const user = { id: `usr_${Date.now()}`, username: cleanUsername, companyName: companyName.trim(), email: cleanEmail, password, role, roleLabel: roleLabels[role] || 'B2B Circular Packaging Partner', industry: industry.trim() || 'General Industrial', securityQuestion: securityQuestion.trim() || "What is your company's founding hub city?", securityAnswer: (securityAnswer || '').trim().toLowerCase(), createdAt: new Date().toISOString() };
  await saveUser(user);
  return sanitizeUser(user);
}

export async function resetPassword({ usernameOrEmail, securityAnswer, newPassword }) {
  if (!usernameOrEmail || !newPassword) throw new Error('Username/email and new password are required.');
  const needle = usernameOrEmail.trim().toLowerCase();
  const user = (await readUsers()).find(item => item.username.toLowerCase() === needle || item.email.toLowerCase() === needle);
  if (!user) throw new Error('No B2B account found with this username or corporate email.');
  if (user.securityAnswer && (securityAnswer || '').trim().toLowerCase() !== user.securityAnswer) throw new Error('Security verification answer is incorrect.');
  user.password = newPassword;
  await saveUser(user);
  return sanitizeUser(user);
}

export async function recoverUsername({ email, companyName }) {
  if (!email) throw new Error('Please provide your registered corporate email.');
  const cleanEmail = email.trim().toLowerCase();
  const cleanCompany = (companyName || '').trim().toLowerCase();
  const found = (await readUsers()).find(user => user.email.toLowerCase() === cleanEmail && (!cleanCompany || user.companyName.toLowerCase().includes(cleanCompany)));
  if (!found) throw new Error('No matching organization account found for this corporate email.');
  return { username: found.username, companyName: found.companyName, email: found.email };
}

export async function updateUserProfile({ userId, companyName, email, industry }) {
  if (!userId || !companyName || !email || !industry) throw new Error('Company name, email, and industry are required.');
  const users = await readUsers();
  const user = users.find(item => item.id === userId);
  if (!user) throw new Error('Account not found.');
  const cleanEmail = email.trim().toLowerCase();
  if (users.some(item => item.id !== userId && item.email.toLowerCase() === cleanEmail)) throw new Error('That email address is already used by another account.');
  user.companyName = companyName.trim(); user.email = cleanEmail; user.industry = industry.trim(); user.updatedAt = new Date().toISOString();
  await saveUser(user);
  return sanitizeUser(user);
}

export async function changeUserPassword({ userId, currentPassword, newPassword }) {
  if (!userId || !currentPassword || !newPassword) throw new Error('Current password and new password are required.');
  if (newPassword.length < 8) throw new Error('New password must be at least 8 characters.');
  const user = (await readUsers()).find(item => item.id === userId);
  if (!user) throw new Error('Account not found.');
  if (user.password !== currentPassword) throw new Error('Current password is incorrect.');
  user.password = newPassword; user.updatedAt = new Date().toISOString();
  await saveUser(user);
  return sanitizeUser(user);
}
