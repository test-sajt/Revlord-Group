// Supabase Database Webhook: public.messages / INSERT -> notify-message.
// Deploy with verify_jwt=false and a high-entropy x-webhook-secret; never expose secrets in Vite.
import { createClient } from 'npm:@supabase/supabase-js@2.95.3';
import webpush from 'npm:web-push@3.6.7';

const json=(status:number,body:string)=>new Response(JSON.stringify({ok:status<400,message:body}),{status,headers:{'content-type':'application/json'}});
Deno.serve(async request=>{
  if(request.method!=='POST') return json(405,'Method not allowed');
  const secret=Deno.env.get('RG_WEBHOOK_SECRET');
  if(!secret || request.headers.get('x-webhook-secret')!==secret)return json(401,'Unauthorized');
  const serviceRole=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const url=Deno.env.get('SUPABASE_URL');
  const pub=Deno.env.get('VAPID_PUBLIC_KEY');
  const priv=Deno.env.get('VAPID_PRIVATE_KEY');
  const subject=Deno.env.get('VAPID_SUBJECT');
  if(!url||!serviceRole||!pub||!priv||!subject)return json(503,'Push sender is not configured');
  let input: {type?:string;table?:string;schema?:string;record?:{id?:string}};
  try{input=await request.json();}catch{return json(400,'Invalid JSON');}
  if(input.type!=='INSERT'||input.table!=='messages'||input.schema!=='public'||!input.record?.id||!/^[a-f0-9-]{36}$/i.test(input.record.id))return json(400,'Invalid event');
  const db=createClient(url,serviceRole,{auth:{autoRefreshToken:false,persistSession:false}});
  const {data:msg,error:e1}=await db.from('messages').select('id,thread_id,sender').eq('id',input.record.id).maybeSingle();
  if(e1||!msg)return json(404,'Message not found');
  const {data:thread,error:e2}=await db.from('threads').select('id,owner_id,peer_id').eq('id',msg.thread_id).maybeSingle();
  if(e2||!thread)return json(404,'Thread not found');
  const recipient=msg.sender===thread.owner_id?thread.peer_id:msg.sender===thread.peer_id?thread.owner_id:null;
  if(!recipient)return json(400,'Invalid participants');
  const {data:last}=await db.from('push_delivery_log').select('last_sent').eq('recipient',recipient).eq('thread_id',thread.id).maybeSingle();
  if(last && Date.now()-Date.parse(last.last_sent)<25000)return json(200,'Coalesced');
  const {data:subs,error:e3}=await db.from('push_subscriptions').select('id,endpoint,p256dh,auth_key').eq('user_id',recipient);
  if(e3)return json(503,'Subscriptions unavailable');
  if(!subs?.length)return json(200,'No subscriptions');
  // These credentials are server-side environment variables only.
  webpush.setVapidDetails(subject,pub,priv);
  const payload=JSON.stringify({thread:thread.id});
  let sent=0;
  for(const sub of subs){
    try{
      await webpush.sendNotification({endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth_key}},payload,{TTL:3600,urgency:'normal'});
      sent++;
    }catch(err){
      const status=(err as {statusCode?:number}).statusCode;
      if(status===404||status===410)await db.from('push_subscriptions').delete().eq('id',sub.id);
      else console.error('Web push delivery failed',status||'unknown');
    }
  }
  if(sent)await db.from('push_delivery_log').upsert({recipient,thread_id:thread.id,last_sent:new Date().toISOString()});
  return json(200,sent?'Sent':'Delivery pending');
});
