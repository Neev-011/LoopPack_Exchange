import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const USERS_FILE = path.join(__dirname, '../../data/users.json');

const INITIAL_USERS = [
  {
    id: 'usr_apex',
    username: 'apex_logistics',
    companyName: 'Apex Packaging Solutions Ltd',
    email: 'contact@apexlogistics.com',
    password: 'password123',
    role: 'supplier',
    roleLabel: 'Packaging Generator / Supplier',
    industry: 'Logistics & Warehousing',
    securityQuestion: "What is your company's founding hub city?",
    securityAnswer: 'mumbai',
    createdAt: '2026-01-15T09:00:00.000Z'
  },
  {
    id: 'usr_greenwave',
    username: 'greenwave_retail',
    companyName: 'GreenWave E-Commerce Hub',
    email: 'circularity@greenwaveretail.com',
    password: 'password123',
    role: 'buyer',
    roleLabel: 'Material Buyer & Recycler',
    industry: 'Retail & Consumer Packaging',
    securityQuestion: "What is your company's founding hub city?",
    securityAnswer: 'delhi',
    createdAt: '2026-02-10T11:30:00.000Z'
  },
  {
    id: 'usr_tatsav',
    username: 'tatsav_enterprise',
    companyName: 'LoopPack Industrial Ecosystems',
    email: 'tatsav@looppack.io',
    password: 'password123',
    role: 'enterprise',
    roleLabel: 'Enterprise Circularity Officer',
    industry: 'Closed-Loop Circular Supply Chain',
    securityQuestion: "What is your company's founding hub city?",
    securityAnswer: 'ahmedabad',
    createdAt: '2026-03-01T08:00:00.000Z'
  }
];

function readUsers() {
  try {
    if (!fs.existsSync(USERS_FILE)) {
      saveUsers(INITIAL_USERS);
      return INITIAL_USERS;
    }
    const raw = fs.readFileSync(USERS_FILE, 'utf8');
    const parsed = JSON.parse(raw || '[]');
    if (!parsed || parsed.length === 0) {
      saveUsers(INITIAL_USERS);
      return INITIAL_USERS;
    }
    return parsed;
  } catch (err) {
    console.error('[AuthService] Error reading users file:', err);
    return INITIAL_USERS;
  }
}

function saveUsers(users) {
  try {
    const dir = path.dirname(USERS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
  } catch (err) {
    console.error('[AuthService] Error saving users file:', err);
  }
}

function sanitizeUser(user) {
  if (!user) return null;
  const { password, securityAnswer, ...safeUser } = user;
  return safeUser;
}

export function getAllDemoUsers() {
  const users = readUsers();
  return users.map(sanitizeUser);
}

export function checkUsername(username) {
  if (!username) return { exists: false };
  const users = readUsers();
  const found = users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
  if (found) {
    return {
      exists: true,
      userPreview: {
        username: found.username,
        companyName: found.companyName,
        role: found.role,
        roleLabel: found.roleLabel,
        securityQuestion: found.securityQuestion
      }
    };
  }
  return { exists: false };
}

export function authenticateUser({ usernameOrEmail, password }) {
  if (!usernameOrEmail || !password) {
    throw new Error('Please enter both username/email and password.');
  }
  const users = readUsers();
  const needle = usernameOrEmail.trim().toLowerCase();
  const user = users.find(
    u => u.username.toLowerCase() === needle || u.email.toLowerCase() === needle
  );

  if (!user) {
    throw new Error('Account does not exist. Please check your username or register a new account.');
  }

  if (user.password !== password) {
    throw new Error('Incorrect password. Try again or use "Forgot Password".');
  }

  return sanitizeUser(user);
}

export function registerUser({
  username,
  companyName,
  email,
  password,
  role = 'supplier',
  industry = 'Manufacturing & Logistics',
  securityQuestion = "What is your company's founding hub city?",
  securityAnswer = ''
}) {
  if (!username || !companyName || !email || !password) {
    throw new Error('Username, Company Name, Email, and Password are required.');
  }

  const cleanUsername = username.trim().toLowerCase().replace(/\s+/g, '_');
  const cleanEmail = email.trim().toLowerCase();

  const users = readUsers();

  if (users.some(u => u.username.toLowerCase() === cleanUsername)) {
    throw new Error(`Username "${cleanUsername}" is already registered. Please choose another username or sign in.`);
  }

  if (users.some(u => u.email.toLowerCase() === cleanEmail)) {
    throw new Error(`Corporate email "${cleanEmail}" is already linked to an account. Try logging in or recover your username.`);
  }

  const roleLabels = {
    supplier: 'Packaging Generator / Supplier',
    buyer: 'Material Buyer & Recycler',
    enterprise: 'Enterprise Circularity Officer',
    logistics: 'Fleet / Backhaul Logistics Partner'
  };

  const newUser = {
    id: 'usr_' + Date.now(),
    username: cleanUsername,
    companyName: companyName.trim(),
    email: cleanEmail,
    password,
    role,
    roleLabel: roleLabels[role] || 'B2B Circular Packaging Partner',
    industry: industry.trim() || 'General Industrial',
    securityQuestion: securityQuestion.trim() || "What is your company's founding hub city?",
    securityAnswer: (securityAnswer || '').trim().toLowerCase(),
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  saveUsers(users);

  console.log(`[AuthService] New B2B Enterprise registered: ${newUser.companyName} (@${newUser.username})`);
  return sanitizeUser(newUser);
}

export function resetPassword({ usernameOrEmail, securityAnswer, newPassword }) {
  if (!usernameOrEmail || !newPassword) {
    throw new Error('Username/email and new password are required.');
  }

  const users = readUsers();
  const needle = usernameOrEmail.trim().toLowerCase();
  const userIndex = users.findIndex(
    u => u.username.toLowerCase() === needle || u.email.toLowerCase() === needle
  );

  if (userIndex === -1) {
    throw new Error('No B2B account found with this username or corporate email.');
  }

  const user = users[userIndex];

  // Verify security answer if configured
  if (user.securityAnswer) {
    const cleanAnswer = (securityAnswer || '').trim().toLowerCase();
    if (cleanAnswer !== user.securityAnswer) {
      throw new Error('Security verification answer is incorrect.');
    }
  }

  users[userIndex].password = newPassword;
  saveUsers(users);

  console.log(`[AuthService] Password reset successful for user: @${user.username}`);
  return sanitizeUser(users[userIndex]);
}

export function recoverUsername({ email, companyName }) {
  if (!email) {
    throw new Error('Please provide your registered corporate email.');
  }

  const users = readUsers();
  const cleanEmail = email.trim().toLowerCase();
  const cleanCompany = (companyName || '').trim().toLowerCase();

  const found = users.find(u => {
    const emailMatch = u.email.toLowerCase() === cleanEmail;
    if (cleanCompany) {
      return emailMatch && u.companyName.toLowerCase().includes(cleanCompany);
    }
    return emailMatch;
  });

  if (!found) {
    throw new Error('No matching organization account found for this corporate email.');
  }

  return {
    username: found.username,
    companyName: found.companyName,
    email: found.email
  };
}
