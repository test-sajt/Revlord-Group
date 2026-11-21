// Offline guardrails for the additive five-hour live room. Supabase deployment still needs testing.
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const file = (p) => readFileSync(p,'utf8');
const inbox=file('src/Inbox.tsx');
const room=file('src/LiveChat.tsx');
const db=file('src/db.js');
const css=file('src/live-chat.css');
const sql=file('supabase/migrations/20261121_live_chat_5h.sql');
let passed=0;
function check(label,callback){callback();console.log('PASS',label);passed++;}
check('Envelope has side-by-side messages and live chat tabs',()=>{assert(inbox.includes("setActiveTab('messages')"));assert(inbox.includes("setActiveTab('live')"));assert(inbox.includes('rg-inbox-tabs'));});
check('Existing private messages and notifications remain in original inbox',()=>{for(const term of ['db.deleteChatForMe','db.notificationsEnabled','db.listenInbox','rg-delete-confirm'])assert(inbox.includes(term));});
check('Mobile popup is portaled above the sticky header and covers the full viewport',()=>{assert(inbox.includes('createPortal(popover, document.body)'));assert(css.includes('height:100dvh!important'));assert(css.includes('z-index:10000!important'));});
check('Room supports realtime and network fallback polling',()=>{assert(room.includes('db.listenLiveChat'));assert(room.includes('15000'));assert(db.includes("table: 'live_chat_messages'"));});
check('Expiration is measured from original send timestamp and never based on refresh time',()=>{assert(room.includes('5 * 60 * 60 * 1000'));assert(room.includes('new Date(message.created_at)'));assert(sql.includes("created_at > now() - interval '5 hours'"));});
check('Database restricts room access to logged-in senders and server-set timestamps',()=>{assert(sql.includes('sender = auth.uid()'));assert(sql.includes('GRANT INSERT(sender,body)'));assert(sql.includes('ENABLE ROW LEVEL SECURITY'));});
check('Physical expiry works on read and has optional every-minute cron cleanup',()=>{assert(sql.includes('DELETE FROM public.live_chat_messages'));assert(sql.includes("cron.schedule('rg-live-chat-five-hour-cleanup', '* * * * *'"));});
check('Private message table is never altered or deleted in migration',()=>{assert(!/alter table\s+public\.messages\b/i.test(sql));assert(!/delete\s+from\s+public\.messages\b/i.test(sql));});
console.log(`PASS ${passed} additive live chat checks.`);
