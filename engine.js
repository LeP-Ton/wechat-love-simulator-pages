import { characters, byId, sceneFor, gifts, achievementDefinitions, GAME_DAYS, MAX_ENERGY, TOTAL_PHOTOS } from './data.js';

export const STORAGE_KEY = 'wechat-life-save-v2';
export const LEGACY_STORAGE_KEY = 'wechat-life-save-v1';
export const SAVE_VERSION = 2;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export const money = cents => (cents / 100).toLocaleString('zh-CN', { minimumFractionDigits:2, maximumFractionDigits:2 });

export function createGame() {
  const added = characters.filter(c=>c.initialFriend).map(c=>c.id);
  if(!added.length)added.push(characters[0].id);
  return {
    version:SAVE_VERSION, day:1, energy:MAX_ENERGY, balance:52000, spent:0, earned:0,
    selected:added[0], added, liked:[], achievements:[], archivedThreads:{}, archivedAdded:[], archivedLiked:[],
    workDay:0, finished:false, startedAt:Date.now(), playerName:'阿泽',
    transactions:[{id:'initial',day:1,amount:52000,title:'你的初始恋爱预算',kind:'income'}],
    threads:Object.fromEntries(characters.map(c=>[c.id,{
      affection:c.initialAffection, stage:0, unlockedPhotos:[], dailyCount:0, dailyDay:0,
      freeCount:0, freeDay:0, giftDay:0, dateDay:0, redDay:0, met:added.includes(c.id),
      read:c.index===0 || c.index>4, messages:c.opening.map((text,i)=>({id:`${c.id}-opening-${i}`,side:'them',type:'text',text})),
    }])),
  };
}

function eligiblePhotos(character, progress) {
  return character.gallery.filter(photo=>progress.affection>=photo.unlock.affection&&progress.stage>=photo.unlock.stage);
}

export function galleryProgress(state,id) {
  const owned=new Set(state.threads[id]?.unlockedPhotos||[]);
  return (byId[id]?.gallery||[]).map(photo=>({...photo,unlocked:owned.has(photo.id)}));
}

// 旧版可导入迁移。暂不出场的角色单独归档，重新加入角色池时可按 ID 恢复。
export function hydrateGame(raw) {
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!parsed || ![1,SAVE_VERSION].includes(parsed.version) || !Number.isInteger(parsed.balance) || parsed.balance<0 || parsed.balance>100000000) return null;
    if (!Number.isInteger(parsed.day) || parsed.day<1 || parsed.day>GAME_DAYS || !Number.isInteger(parsed.energy) || parsed.energy<0 || parsed.energy>MAX_ENERGY) return null;
    if (!Number.isInteger(parsed.spent) || parsed.spent<0 || !Number.isInteger(parsed.earned) || parsed.earned<0) return null;
    if(!parsed.threads||typeof parsed.threads!=='object'||!Object.keys(parsed.threads).length)return null;
    const state = createGame();
    for (const key of ['day','energy','balance','spent','earned','workDay','startedAt']) if (Number.isFinite(parsed[key])) state[key]=parsed[key];
    state.finished=parsed.finished===true;
    state.playerName=typeof parsed.playerName==='string' ? parsed.playerName.slice(0,12) : '阿泽';
    state.selected=byId[parsed.selected] ? parsed.selected : characters[0].id;
    const knownAdded=[...new Set([...(Array.isArray(parsed.added)?parsed.added:state.added),...(Array.isArray(parsed.archivedAdded)?parsed.archivedAdded:[])])];
    state.added=knownAdded.filter(id=>byId[id]);
    state.archivedAdded=knownAdded.filter(id=>!byId[id]&&typeof id==='string');
    if(!state.added.length)state.added=[characters[0].id];
    if(!state.added.includes(state.selected))state.selected=state.added[0];
    const knownLiked=[...new Set([...(Array.isArray(parsed.liked)?parsed.liked:[]),...(Array.isArray(parsed.archivedLiked)?parsed.archivedLiked:[])])];
    state.liked=knownLiked.filter(id=>byId[id]);
    state.archivedLiked=knownLiked.filter(id=>!byId[id]&&typeof id==='string');
    state.achievements=Array.isArray(parsed.achievements)?parsed.achievements.filter(id=>achievementDefinitions.some(a=>a.id===id)):[];
    state.transactions=Array.isArray(parsed.transactions)?parsed.transactions.filter(t=>t && Number.isInteger(t.amount)&&typeof t.title==='string'&&Number.isInteger(t.day)).slice(-300):state.transactions;
    const previousThreads=Object.fromEntries([...Object.entries(parsed.archivedThreads||{}),...Object.entries(parsed.threads)]);
    state.archivedThreads=Object.fromEntries(Object.entries(previousThreads).filter(([id])=>!byId[id]));
    for(const c of characters){
      const p=previousThreads[c.id];
      if(!p)continue;
      if(!Number.isFinite(p.affection) || !Number.isInteger(p.stage) || p.stage<0 || p.stage>6)return null;
      const t=state.threads[c.id];
      t.affection=clamp(Math.trunc(p.affection),0,100); t.stage=p.stage;
      const owned=Array.isArray(p.unlockedPhotos)?[...p.unlockedPhotos]:[];
      // 单张布尔收藏迁移到第一张新写真，已获得的照片不受后续好感下降影响。
      if(p.photo===true&&p.stage>=2)owned.push(c.gallery[0].id);
      t.unlockedPhotos=[...new Set([...owned,...eligiblePhotos(c,t).map(photo=>photo.id)])].filter(id=>c.gallery.some(photo=>photo.id===id));
      t.met=state.added.includes(c.id);t.read=p.read!==false;
      for(const field of ['dailyCount','dailyDay','freeCount','freeDay','giftDay','dateDay','redDay'])t[field]=Number.isInteger(p[field])&&p[field]>=0?p[field]:0;
      if(Array.isArray(p.messages))t.messages=p.messages.filter(m=>m&&['me','them','system'].includes(m.side)&&['text','photo','gift','redpacket','invite','notice'].includes(m.type)&&typeof m.text==='string').slice(-180).map(m=>({...m,text:m.text.slice(0,500),...(m.type==='photo'?{photoId:c.gallery.some(photo=>photo.id===m.photoId)?m.photoId:c.gallery[0].id}:{})}));
    }
    return state;
  } catch { return null; }
}

export function loadGame(storage) {
  try {
    // 新旧版本使用独立写入键，避免尚未刷新的旧标签页覆盖新增相册进度。
    const current=storage.getItem(STORAGE_KEY),legacy=current?null:storage.getItem(LEGACY_STORAGE_KEY);
    const raw=current||legacy,restored=hydrateGame(raw);
    return {state:restored||createGame(),reset:!!raw&&!restored,migrated:!!restored&&(!!legacy||JSON.parse(raw).version===1)};
  }
  catch {return {state:createGame(),unavailable:true};}
}

export function saveGame(state,storage) {
  try {storage.setItem(STORAGE_KEY,JSON.stringify(state));return true;}catch{return false;}
}

function addMessage(state,id,side,text,type='text',extra={}) {
  const p=state.threads[id];
  p.messages.push({id:`${Date.now()}-${p.messages.length}`,side,text,type,day:state.day,...extra});
  if(p.messages.length>180)p.messages=p.messages.slice(-180);
}

function guard(state,id,energy=1) {
  if(state.finished)return '本周故事已结束，可以在「我」里查看结算或开启新故事。';
  if(!byId[id] || !state.added.includes(id))return '请先添加这位好友。';
  if(state.energy<energy)return '今天的社交电量不足啦，结束今天后即可恢复。';
  return null;
}

function settle(state,id,gain) {
  const p=state.threads[id];
  const before=p.affection;
  p.affection=clamp(before+gain,0,100);
  const unlockedPhotos=eligiblePhotos(byId[id],p).filter(photo=>!p.unlockedPhotos.includes(photo.id));
  for(const photo of unlockedPhotos){
    p.unlockedPhotos.push(photo.id);
    addMessage(state,id,'them',`这张「${photo.title}」只分享给你。记得好好收藏。`,'photo',{photoId:photo.id});
  }
  if(before<90&&p.affection>=90)addMessage(state,id,'system','你们的关系变成了「双向心动」。','notice');
  const fresh=achievementDefinitions.filter(a=>!state.achievements.includes(a.id)&&a.check(state));
  state.achievements.push(...fresh.map(a=>a.id));
  return {gain:p.affection-before,unlocked:unlockedPhotos.length>0,unlockedPhotos:unlockedPhotos.map(photo=>photo.id),achievements:fresh.map(a=>a.title)};
}

function spend(state,amount,title) {
  if(amount===0)return;
  state.balance-=amount;state.spent+=amount;
  state.transactions.push({id:`tx-${Date.now()}-${state.transactions.length}`,day:state.day,amount:-amount,title,kind:'expense'});
}

export function addFriend(state,id) {
  if(!byId[id])return {ok:false,message:'没有找到这位好友。'};
  if(state.finished)return {ok:false,message:'本周故事已结束，请开启新故事后再添加好友。'};
  if(state.added.includes(id))return {ok:true,existing:true};
  state.added.push(id);state.threads[id].met=true;state.threads[id].read=true;
  settle(state,id,0);
  return {ok:true,message:`你已添加 ${byId[id].name}，现在可以开始聊天了。`};
}

export function chooseReply(state,id,index,expectedKey) {
  const error=guard(state,id);if(error)return {ok:false,message:error};
  const p=state.threads[id],c=byId[id],scene=sceneFor(c,p,state.day);
  if(expectedKey!==scene.key)return {ok:false,message:'这条回复已经发送，请选择当前的新话题。'};
  const choice=scene.choices[index];if(!choice)return {ok:false,message:'请选择一条有效回复。'};
  if(scene.kind==='daily'&&p.dailyDay===state.day&&p.dailyCount>=2)return {ok:false,message:'今天聊了很多啦，留一点故事给明天吧。'};
  if(choice.cost>state.balance)return {ok:false,message:'零钱不足，试试不花钱的用心回复。'};
  state.energy--;spend(state,choice.cost,`${c.name} · ${choice.cost===1800?'一杯饮品':'周末餐厅'}`);
  addMessage(state,id,'me',choice.text);addMessage(state,id,'them',choice.reply);
  if(scene.kind==='story')p.stage++;
  else {if(p.dailyDay!==state.day)p.dailyCount=0;p.dailyDay=state.day;p.dailyCount++;}
  const result=settle(state,id,choice.gain);
  if(p.stage<6)addMessage(state,id,'them',sceneFor(c,p,state.day).prompt);
  else if(p.stage===6&&scene.kind==='story')addMessage(state,id,'system','她的故事已读完，新的日常才刚刚开始。','notice');
  return {ok:true,cost:choice.cost,...result};
}

export function sendText(state,id,text) {
  const clean=String(text).trim();
  if(!clean)return {ok:false,message:'先写一句想说的话吧。'};
  if(clean.length>240)return {ok:false,message:'每条消息最多 240 个字。'};
  const error=guard(state,id);if(error)return {ok:false,message:error};
  const p=state.threads[id],c=byId[id];
  if(p.freeDay===state.day&&p.freeCount>=3)return {ok:false,message:'今天的自由聊天已达 3 次，试试话题回复，或者明天再聊。'};
  if(p.freeDay!==state.day)p.freeCount=0;p.freeDay=state.day;p.freeCount++;state.energy--;
  addMessage(state,id,'me',clean);
  const rude=/滚|闭嘴|废物|傻逼|骚货/.test(clean);
  const matched=c.likes.some(word=>clean.includes(word));
  const question=/[?？]/.test(clean);
  addMessage(state,id,'them',rude?'我希望我们能好好说话，彼此尊重。':matched?`你提到${c.likes.find(w=>clean.includes(w))}啦！看来你有认真看我的朋友圈。`:question?'这个问题，我想找个舒服的时间慢慢跟你聊。也想听听你的答案。':'收到你的消息了。像这样聊聊生活里的小事，也挺好的。');
  return {ok:true,...settle(state,id,rude?-6:matched?3:1)};
}

export function sendGift(state,id,giftId) {
  const error=guard(state,id);if(error)return {ok:false,message:error};
  const gift=gifts.find(g=>g.id===giftId),p=state.threads[id],c=byId[id];
  if(!gift)return {ok:false,message:'礼物不存在。'};
  if(p.giftDay===state.day)return {ok:false,message:'今天已经送过心意了，明天再送吧。'};
  if(gift.price>state.balance)return {ok:false,message:'零钱不足。陪她聊聊天，也是一份心意。'};
  spend(state,gift.price,`${c.name} · ${gift.name}`);state.energy--;p.giftDay=state.day;
  const matched=gift.match.some(word=>c.likes.some(like=>like.includes(word)||word.includes(like)));
  addMessage(state,id,'me',gift.name,'gift',{amount:gift.price,giftId});
  addMessage(state,id,'them',matched?`你怎么知道我喜欢${gift.name}！这份用心我收下了。`:'谢谢你的心意。不过下次不用破费，陪我聊聊就好。');
  return {ok:true,cost:gift.price,...settle(state,id,matched?gift.gain:2)};
}

export function sendRedPacket(state,id,cents) {
  const error=guard(state,id);if(error)return {ok:false,message:error};
  const p=state.threads[id],c=byId[id];
  if(!Number.isInteger(cents)||cents<100||cents>20000)return {ok:false,message:'红包金额需为 1.00～200.00 元，最多两位小数。'};
  if(p.redDay===state.day)return {ok:false,message:'今天已经发过红包了，心意不用重复证明。'};
  if(state.balance<cents)return {ok:false,message:'零钱不足，换一种方式表达心意吧。'};
  spend(state,cents,`${c.name} · 微信红包`);state.energy--;p.redDay=state.day;
  addMessage(state,id,'me','一点小小的心意','redpacket',{amount:cents});
  addMessage(state,id,'them','谢谢啦，红包收到了。下次把想说的话直接告诉我就好。');
  return {ok:true,cost:cents,...settle(state,id,cents>=5200?4:2)};
}

export function inviteDate(state,id,kind) {
  const error=guard(state,id,2);if(error)return {ok:false,message:error};
  const p=state.threads[id],c=byId[id];
  const plans={walk:{name:'日落散步',cost:0,gain:10},cafe:{name:'咖啡小聚',cost:3600,gain:10},gallery:{name:'周末看展',cost:6000,gain:12}};
  const plan=plans[kind];if(!plan)return {ok:false,message:'请选择邀约安排。'};
  if(p.affection<45)return {ok:false,message:'好感达到 45 后，就可以试着邀请她见面了。'};
  if(p.dateDay===state.day)return {ok:false,message:'今天已经见过面了，把下次的期待留给明天。'};
  if(state.balance<plan.cost)return {ok:false,message:'零钱不足。日落散步是免费的好选择。'};
  spend(state,plan.cost,`${c.name} · ${plan.name}`);state.energy-=2;p.dateDay=state.day;
  addMessage(state,id,'me',`邀请你一起${plan.name}`,'invite',{amount:plan.cost});
  addMessage(state,id,'them','好呀，和你一起的话，我很期待。');
  return {ok:true,cost:plan.cost,...settle(state,id,plan.gain)};
}

export function work(state) {
  if(state.finished)return {ok:false,message:'本周已结束，先去看看你的故事结算吧。'};
  if(state.workDay===state.day)return {ok:false,message:'今天的兼职已经完成，明天再来。'};
  if(state.energy<3)return {ok:false,message:'兼职需要 3 格社交电量，今天先好好休息。'};
  state.energy-=3;state.balance+=3000;state.earned+=3000;state.workDay=state.day;
  state.transactions.push({id:`work-${state.day}`,day:state.day,amount:3000,title:'线上文案兼职',kind:'income'});
  return {ok:true,message:'兼职完成，零钱到账 ¥30.00。'};
}

export function nextDay(state) {
  if(state.finished)return {ok:false,message:'本周已经结束。'};
  if(state.day>=GAME_DAYS){state.finished=true;return {ok:true,finished:true};}
  state.day++;state.energy=MAX_ENERGY;
  return {ok:true,message:`第 ${state.day} 天，社交电量已充满。新的故事在等你。`};
}

export function toggleLike(state,id) {
  if(!byId[id])return {ok:false};
  const i=state.liked.indexOf(id);if(i>=0)state.liked.splice(i,1);else state.liked.push(id);
  return {ok:true,liked:i<0};
}

export function statistics(state) {
  const threads=characters.map(c=>state.threads[c.id]);
  const photos=characters.reduce((count,c)=>count+galleryProgress(state,c.id).filter(photo=>photo.unlocked).length,0);
  return {photos,totalPhotos:TOTAL_PHOTOS,loves:threads.filter(p=>p.affection>=90).length,stories:threads.filter(p=>p.stage>=6).length,friends:state.added.length,spent:state.spent,efficiency:state.spent===0?'心意无价':`¥${money(state.spent/Math.max(photos,1))}`};
}
