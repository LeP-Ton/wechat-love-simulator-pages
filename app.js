import { characters, byId, sceneFor, gifts, relationship, achievementDefinitions, MAX_ENERGY, GAME_DAYS, TOTAL_PHOTOS } from './data.js';
import { createGame, loadGame, saveGame, hydrateGame, STORAGE_KEY, money, chooseReply, sendText, sendGift, sendRedPacket, inviteDate, addFriend, work, nextDay, toggleLike, statistics, galleryProgress } from './engine.js';

const app = document.querySelector('#app');
const modalRoot = document.querySelector('#modal-root');
const toastRoot = document.querySelector('#toast-root');
let storage;
try { storage=window.localStorage; } catch { storage={getItem:()=>null,setItem:()=>{throw new Error('无法存档');}}; }
const loaded=loadGame(storage);
let state=loaded.state;
const view={nav:'chat',search:'',mobileList:false,details:true,detailExplicit:false,filter:'all',albumFilter:'all',contactFilter:'all',draft:'',busy:false};
let modal=null;
let toastTimer;
let saveFailed=false;
let modalOrigin=null;

const escape = value => String(value ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths={
  chat:'M21 11.5a8.4 8.4 0 0 1-9 8.5 10 10 0 0 1-3.7-.7L3 21l1.6-4.7A8 8 0 0 1 3 11.5 8.5 8.5 0 0 1 12 3a8.5 8.5 0 0 1 9 8.5Z M8 11h.01 M12 11h.01 M16 11h.01',
  contacts:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M16 4a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M13 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  compass:'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z M16 8l-2.5 5.5L8 16l2.5-5.5L16 8Z',
  album:'M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z M3 16l6-6 5 5 3-3 4 4 M16 7h.01',
  wallet:'M21 8H5a3 3 0 0 1 0-6h14v6 M3 5v14a3 3 0 0 0 3 3h15V8 M21 12h-5v6h5 M17 15h.01',
  search:'M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',
  plus:'M12 5v14 M5 12h14',close:'M6 6l12 12 M6 18L18 6',chevron:'M9 5l7 7-7 7',back:'M15 5l-7 7 7 7',
  more:'M5 12h.01 M12 12h.01 M19 12h.01',heart:'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',
  leaf:'M20 4c0 13-6 16-12 15-7-1-4-15 12-15Z M4 21L15 10',
  lock:'M6 10h12v11H6V10Z M8 10V6a4 4 0 0 1 8 0v4 M12 15v2',
  image:'M3 3h18v18H3V3Z M3 16l6-6 5 5 3-3 4 4 M16 7h.01',
  smile:'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z M8 9h.01 M16 9h.01 M8 14c1 4 7 4 8 0',
  folder:'M3 5h6l2 3h10v13H3V5Z',gift:'M3 8h18v4H3V8Z M5 12v9h14v-9 M12 8v13 M12 8C2 8 5 0 9 3l3 5Z M12 8c10 0 7-8 3-5l-3 5Z',
  redpacket:'M5 3h14v18H5V3Z M5 8c3 4 11 4 14 0 M12 12v3 M10 15h4',calendar:'M3 5h18v16H3V5Z M7 3v4 M17 3v4 M3 10h18 M8 14h2 M14 14h2',
  send:'M22 2L9 15 M22 2l-8 20-5-7-7-5 20-8Z',moon:'M21 13a9 9 0 1 1-10-10 7 7 0 0 0 10 10Z',
  settings:'M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1 1-3Z M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  help:'M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3 M12 17h.01 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
  check:'M5 12l4 4L19 6',battery:'M2 7h17v10H2V7Z M22 10v4 M5 10v4 M8 10v4 M11 10v4 M14 10v4',
  book:'M12 5c-3-3-7-3-10-1v16c3-2 7-2 10 1 3-3 7-3 10-1V4c-3-2-7-2-10 1Z M12 5v16',
  pin:'M12 22v-7 M7 3h10l-1 6 3 5H5l3-5-1-6Z',coffee:'M3 8h13v8a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5V8Z M16 8h2a4 4 0 0 1 0 8h-2 M6 2v2 M11 2v2',
  cake:'M3 12h18v9H3v-9Z M3 16c2-3 4 3 6 0s4 3 6 0 4 3 6 0 M12 12V7 M12 7c-3-1-2-4 0-6 2 2 3 5 0 6Z',
  flower:'M12 12c-12-1-9-10-4-8 1-5 7-5 8 0 6-2 9 7-4 8Z M12 12v10 M12 18c-7 1-6-6-6-6 4 0 6 2 6 6Z M12 19c6 0 6-5 6-5-4 0-6 2-6 5Z',
  sun:'M12 3V1 M12 23v-2 M3 12H1 M23 12h-2 M4 4l2 2 M18 18l2 2 M4 20l2-2 M18 6l2-2 M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0Z',
  location:'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  camera:'M3 7h4l2-4h6l2 4h4v14H3V7Z M16 13a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  download:'M12 3v12 M7 10l5 5 5-5 M4 16v5h16v-5',upload:'M12 16V3 M7 8l5-5 5 5 M4 16v5h16v-5',
  trophy:'M7 3h10v7a5 5 0 0 1-10 0V3Z M7 5H3v3a5 5 0 0 0 5 5 M17 5h4v3a5 5 0 0 1-5 5 M12 15v6 M7 21h10',
  briefcase:'M3 7h18v14H3V7Z M8 7V3h8v4 M3 12c6 4 12 4 18 0 M12 12v4',
  arrow:'M4 12h16 M14 6l6 6-6 6',logout:'M9 3H3v18h6 M14 8l5 4-5 4 M7 12h12',spark:'M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7',
};
const icon = (name,cls='') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] || paths.chat}"/></svg>`;
function imageFrame(frame, className, label) {
  const crop = frame.crop || { x:frame.column / frame.columns, y:frame.row / frame.rows, width:1 / frame.columns, height:1 / frame.rows };
  const x = crop.width === 1 ? 0 : crop.x / (1 - crop.width) * 100;
  const y = crop.height === 1 ? 0 : crop.y / (1 - crop.height) * 100;
  return `<span role="img" aria-label="${escape(label)}" class="photo-frame ${className}" style="--frame-image:url(${frame.src});--frame-columns:${1 / crop.width};--frame-rows:${1 / crop.height};--frame-x:${x}%;--frame-y:${y}%;--frame-aspect:${frame.aspectRatio}"><span class="frame-picture"></span></span>`;
}
function photoCard(c, photo, compact = false) {
  if (compact) {
    return `<button class="gallery-mini ${photo.unlocked?'unlocked':'locked'}" data-action="photo" data-id="${c.id}" data-photo="${photo.id}" aria-label="${escape(c.name+'的'+photo.title)}，${photo.unlocked?'已解锁':'未解锁'}">
      ${imageFrame(photo.image,'private-photo',photo.title)}<span>${icon(photo.unlocked?'image':'lock')}</span>
    </button>`;
  }
  return `<button class="album-card ${photo.unlocked?'is-unlocked':'is-locked'}" data-action="photo" data-id="${c.id}" data-photo="${photo.id}" aria-label="查看${escape(c.name+'的'+photo.title)}">
    <div class="album-card-photo">${imageFrame(photo.image,'private-photo',photo.title)}
      ${photo.unlocked?`<span class="unlocked-label">${icon('check')}已收藏</span>`:`<span class="album-lock">${icon('lock')}<span>好感 ${photo.unlock.affection} · 话题 ${photo.unlock.stage}</span></span>`}
    </div>
    <div class="album-card-caption"><strong>${escape(photo.title)}</strong><span>${photo.unlocked?'专属分享':'待解锁'}</span></div>
  </button>`;
}
const avatar = (c,cls='') => imageFrame(c.avatar, 'avatar portrait '+cls, c.name+'的头像');
const portrait = (c,cls='') => imageFrame(c.avatar, 'portrait '+cls, c.name+'的公开人像');
const playerAvatar = (cls='') => `<span class="player-avatar ${cls}" aria-label="你的头像">泽<span></span></span>`;
const buttonIcon = (name,action,label,extra='') => `<button class="icon-button" data-action="${action}" aria-label="${label}" title="${label}" ${extra}>${icon(name)}</button>`;
const tag = (text,cls='') => `<span class="tag ${cls}">${escape(text)}</span>`;
const activeCharacter = () => byId[state.selected];

function persist(){
  const success=saveGame(state,storage);
  if(!success&&!saveFailed){toast('浏览器无法保存进度，可在设置中导出存档。','warning');saveFailed=true;}
  return success;
}

function toast(text,type='success'){
  clearTimeout(toastTimer);
  toastRoot.innerHTML=`<div class="toast ${type}">${icon(type==='warning'?'help':'check')}<span>${escape(text)}</span></div>`;
  toastTimer=setTimeout(()=>toastRoot.innerHTML='',3600);
}

function rail(){
  const unread=state.added.filter(id=>!state.threads[id].read).length;
  const items=[['chat','chat','微信'],['contacts','contacts','通讯录'],['compass','moments','朋友圈'],['album','album','收藏相册'],['wallet','me','我']];
  return `<nav class="rail" aria-label="主导航">
    <button class="rail-profile" data-action="nav" data-nav="me" aria-label="我的微信">${playerAvatar()}</button>
    <div class="rail-main">${items.map(([i,n,label])=>`<button class="rail-item ${n==='me'?'mobile-me':''} ${view.nav===n?'active':''}" data-action="nav" data-nav="${n}" title="${label}" aria-label="${label}" ${view.nav===n?'aria-current="page"':''}>${icon(i)}${n==='chat'&&unread?`<span class="rail-dot">${unread}</span>`:''}<span class="rail-tooltip">${label}</span></button>`).join('')}</div>
    <div class="rail-bottom">${buttonIcon('wallet','wallet','微信钱包')}${buttonIcon('moon','day','结束今天')}${buttonIcon('help','help','玩法说明')}${buttonIcon('settings','settings','设置')}</div>
  </nav>`;
}

function conversations(){
  const query=view.search.trim().toLowerCase();
  const list=state.added.map(id=>byId[id]).filter(c=>(!query||[c.name,c.job,c.tag,c.city].join(' ').toLowerCase().includes(query))&&(view.filter!=='unread'||!state.threads[c.id].read));
  return `<aside class="sidebar ${view.mobileList?'mobile-visible':''}" aria-label="会话列表">
    <div class="sidebar-heading"><h1>微信<span>${state.added.length}</span></h1><span class="client-version">平行人生</span></div>
    <div class="search-row"><label class="search-box">${icon('search')}<input id="search" type="search" value="${escape(view.search)}" placeholder="搜索" aria-label="搜索好友">${view.search?'<button data-action="clear-search" aria-label="清空搜索">×</button>':''}</label><button class="add-friend" data-action="nav" data-nav="contacts" title="添加好友" aria-label="添加好友">${icon('plus')}</button></div>
    <div class="list-tabs"><button class="${view.filter==='all'?'selected':''}" data-action="filter" data-filter="all">全部消息</button><button class="${view.filter==='unread'?'selected':''}" data-action="filter" data-filter="unread">未读<span>${state.added.filter(id=>!state.threads[id].read).length}</span></button></div>
    <div class="conversation-list">${list.length?list.map(c=>{
      const p=state.threads[c.id];const last=p.messages.at(-1);const relation=relationship(p.affection);
      const text=last?.type==='photo'?'[图片] 这张照片只分享给你':last?.type==='gift'?'[礼物] '+last.text:last?.type==='redpacket'?'[微信红包] 一点小小的心意':last?.text||c.opening[0];
      return `<button class="conversation ${state.selected===c.id&&view.nav==='chat'?'selected':''}" data-action="chat" data-id="${c.id}"><span class="avatar-wrap">${avatar(c)}${!p.read?'<span class="unread-dot"></span>':''}</span><span class="conversation-info"><span class="conversation-top"><strong>${c.name}</strong><time>${p.stage>0?'刚刚':c.lastTime}</time></span><span class="conversation-bottom"><span>${escape(text)}</span>${p.affection>=70?icon('heart','tiny-heart'):c.index===0?icon('pin','pin-icon'):''}</span></span></button>`;
    }).join(''):`<div class="empty-small">${icon('search')}<p>${query?'没有找到好友':'暂时没有未读消息'}</p>${query?'<button data-action="nav" data-nav="contacts">去通讯录看看</button>':''}</div>`}
    ${!query&&view.filter==='all'?`<button class="conversation system-conversation" data-action="wallet"><span class="system-avatar">${icon('wallet')}</span><span class="conversation-info"><span class="conversation-top"><strong>微信支付</strong><time>服务通知</time></span><span class="conversation-bottom"><span>零钱到账通知 · ¥${money(state.balance)}</span></span></span></button>`:''}</div>
    <button class="sidebar-budget" data-action="wallet"><span class="budget-icon">${icon('wallet')}</span><span><small>我的恋爱预算</small><strong>¥ ${money(state.balance)}</strong></span>${icon('chevron')}</button>
  </aside>`;
}

function chatMessages(c,p){
  return `<div class="chat-messages" id="messages" role="log" aria-label="与${c.name}的聊天记录">
    <div class="chat-date">第 1 天 · ${state.day===1?'今天 19:42':'19:42'}</div>
    <div class="friend-notice">你已添加了${c.name}，现在可以开始聊天了。</div>
    ${p.messages.map((m,i)=>{
      if(m.side==='system')return `<div class="chat-notice">${icon(m.text.includes('心动')?'heart':'spark')}<span>${escape(m.text)}</span></div>`;
      let content='';
      if(m.type==='photo'){
        const photo=galleryProgress(state,c.id).find(item=>item.id===m.photoId)||galleryProgress(state,c.id)[0];
        content=`<button class="message-photo" data-action="photo" data-id="${c.id}" data-photo="${photo.id}" aria-label="查看${c.name}分享的${escape(photo.title)}">${photo.unlocked?imageFrame(photo.image,'private-photo',photo.title):icon('lock')}<span>${icon('image')}${escape(photo.title)}</span></button>`;
      }
      else if(['gift','redpacket','invite'].includes(m.type))content=`<div class="message-card ${m.type}">${icon(m.type==='gift'?'gift':m.type==='redpacket'?'redpacket':'calendar')}<div><strong>${escape(m.text)}</strong><span>${m.type==='redpacket'?`¥${money(m.amount)}`:m.amount?`¥${money(m.amount)}`:'用心安排，不必破费'}</span></div><small>${m.type==='redpacket'?'微信红包':m.type==='gift'?'微信礼物':'微信邀约'}</small></div>`;
      else content=`<div class="bubble">${escape(m.text)}</div>`;
      const previousDay=i>0?(p.messages[i-1].day||1):1;
      const dayChanged=(m.day||1)>previousDay;
      const same=i>0&&p.messages[i-1].side===m.side&&!dayChanged;
      return `${dayChanged?`<div class="chat-date">第 ${m.day} 天 · 19:30</div>`:''}<div class="message ${m.side==='me'?'outgoing':'incoming'} ${same?'consecutive':''}"><span class="message-avatar">${m.side==='me'?playerAvatar():avatar(c)}</span><div class="message-body">${content}</div></div>`;
    }).join('')}
    ${view.busy?`<div class="message incoming">${avatar(c)}<div class="bubble typing"><i></i><i></i><i></i></div></div>`:''}
    ${state.finished?'<div class="chat-notice">本周故事已完结，回忆已为你收藏。</div>':''}
  </div>`;
}

function chatPanel(){
  const c=activeCharacter(),p=state.threads[c.id],scene=sceneFor(c,p,state.day);
  const disabled=view.busy||state.energy<1||state.finished;
  const dailyDone=scene.kind==='daily'&&p.dailyDay===state.day&&p.dailyCount>=2;
  return `<section class="chat-panel">
    <header class="chat-header"><div class="chat-heading">${buttonIcon('back','show-list','会话列表','class="mobile-back"')}<div><h2>${c.name}<span class="online-dot"></span></h2><p>${view.busy?'对方正在输入…':`${c.tag} · ${c.job}`}</p></div></div><div class="chat-header-right"><span class="day-pill">${icon('sun')}第 ${state.day} 天</span>${buttonIcon('more','details','查看聊天信息')}</div></header>
    ${chatMessages(c,p)}
    <div class="reply-area">
      <div class="reply-heading"><span>${icon('spark')}灵感回复</span><small>${state.finished?'本周故事已完结':dailyDone?'今天的故事先聊到这里':`${scene.label} · 选择一句，继续故事`}</small></div>
      ${state.finished?`<button class="finished-reply" data-action="results">${icon('book')}打开这周的心动日记${icon('arrow')}</button>`:state.energy<1?`<button class="finished-reply" data-action="day">${icon('moon')}社交电量用完了，晚安，明天见${icon('arrow')}</button>`:dailyDone?'<div class="daily-done">日常陪伴已完成，也可以看看朋友圈或计划一次见面。</div>':`<div class="reply-options">${scene.choices.map((option,i)=>`<button class="reply-option ${i===0?'first':''}" data-action="reply" data-choice="${i}" data-scene="${scene.key}" ${disabled?'disabled':''}><span class="option-letter">${['A','B','C'][i]}</span><span class="option-text">${escape(option.text)}</span><span class="option-cost ${option.cost?'paid':'free'}">${option.cost?`¥${money(option.cost).replace('.00','')}`:'¥0'}</span>${icon('arrow')}</button>`).join('')}</div>`}
    </div>
    <div class="composer"><div class="composer-toolbar"><div>${buttonIcon('smile','emoji','发送表情')}${buttonIcon('folder','album','收藏相册')}${buttonIcon('redpacket','redpacket','发红包')}${buttonIcon('gift','gift','送礼物')}${buttonIcon('calendar','invite','约她见面')}</div><button class="energy-status ${state.energy<=3?'low':''}" data-action="day" title="每次回复消耗1格电量，结束今天后恢复">${icon('battery')}<span>社交电量</span><strong>${state.energy}<i>/ ${MAX_ENERGY}</i></strong></button></div>
      <label class="sr-only" for="composer">输入聊天消息</label><textarea id="composer" maxlength="240" placeholder="说点什么，让心动发生…" ${disabled?'disabled':''}>${escape(view.draft)}</textarea>
      <div class="composer-bottom"><span>Enter 发送，Shift + Enter 换行<span class="free-chat-hint"> · 自由聊天每日 3 次</span></span><button class="send-button" data-action="send" ${disabled||!view.draft.trim()?'disabled':''}>发送 ${icon('send')}</button></div>
    </div>
  </section>${view.details?profilePanel(c):''}`;
}

function profilePanel(c) {
  const p=state.threads[c.id],r=relationship(p.affection),gallery=galleryProgress(state,c.id);
  const owned=gallery.filter(photo=>photo.unlocked).length,next=gallery.find(photo=>!photo.unlocked);
  return `<aside class="profile-panel ${view.detailExplicit?'explicit-open':''}">
    <div class="profile-heading"><span>朋友资料</span>${buttonIcon('close','details','收起朋友资料')}</div>
    <div class="profile-content">
      <div class="profile-cover">${portrait(c)}<span class="portrait-label">${icon('camera')}${c.tag}</span></div>
      <div class="profile-name"><h2>${c.name}<span>♀</span></h2><span class="relation-badge ${r.color}">${r.short}</span></div>
      <p class="profile-job">${c.job}</p><div class="profile-meta"><span>${c.age} 岁</span><i>·</i><span>${c.zodiac}</span><i>·</i><span>${c.city}</span></div>
      <p class="profile-bio">${escape(c.bio)}</p>
      <div class="affection-section"><div class="section-label"><span>${icon('heart')}好感度</span><strong>${p.affection}<small> / 100</small></strong></div><div class="progress-track"><span style="width:${p.affection}%"></span></div><p>${r.caption}</p></div>
      <div class="interest-section"><div class="section-label"><span>她的小偏好</span><button data-action="person-moments" data-id="${c.id}">去了解 ${icon('chevron')}</button></div><div class="interest-tags">${c.likes.map(l=>tag(l)).join('')}</div></div>
      <div class="profile-album"><div class="section-label"><span>她的专属写真</span><button data-action="gallery" data-id="${c.id}">${owned} / ${gallery.length} ${icon('chevron')}</button></div>
        <div class="mini-gallery">${gallery.map(photo=>photoCard(c,photo,true)).join('')}</div>
        <p class="gallery-next">${next?`下一张「${escape(next.title)}」<br>好感 ${next.unlock.affection} · 聊完 ${next.unlock.stage} 个话题`:'这本相册里的每一刻，都已经分享给你。'}</p>
      </div>
      <p class="profile-footnote">${icon('leaf')}用心的陪伴，比昂贵的礼物更动人。</p>
    </div>
  </aside>`;
}

function pageHeader(title,subtitle,extra=''){
  return `<header class="page-header"><div>${buttonIcon('back','show-list','返回会话列表')}<div><h2>${title}</h2><p>${subtitle}</p></div></div>${extra}</header>`;
}

function contactsPage(){
  const list=characters.filter(c=>view.contactFilter==='all'||(view.contactFilter==='new'?!state.added.includes(c.id):state.added.includes(c.id)));
  return `<section class="full-page contacts-page">${pageHeader('通讯录','每个人都有自己的故事，慢慢认识她。',`<span class="count-pill">${characters.length} 位好友</span>`)}
    <div class="page-scroll"><div class="contacts-intro"><span class="intro-icon">${icon('contacts')}</span><div><h3>世界很大，幸好加了你</h3><p>从一句你好开始，认识不一样的她。</p></div><span>NEW FRIENDS</span></div>
    <div class="filter-row">${[['all','全部好友'],['added',`已添加 ${state.added.length}`],['new',`新朋友 ${characters.length-state.added.length}`]].map(([f,t])=>`<button data-action="contact-filter" data-filter="${f}" class="${view.contactFilter===f?'active':''}">${t}</button>`).join('')}</div>
    <div class="contacts-grid">${list.map(c=>{const added=state.added.includes(c.id);return `<article class="contact-card"><button class="contact-photo" data-action="person" data-id="${c.id}" aria-label="查看${c.name}资料">${portrait(c)}<span>${c.tag}</span></button><div class="contact-card-content"><div><h3>${c.name}<small>${c.age}岁</small></h3><p>${c.job} · ${c.city}</p></div><button class="${added?'contact-chat':'contact-add'}" data-action="${added?'chat':'add'}" data-id="${c.id}" aria-label="${added?'和'+c.name+'聊天':'添加'+c.name}">${icon(added?'chat':'plus')}</button></div></article>`;}).join('')}</div>
    ${!list.length?'<div class="empty-page">好友都已添加，去开启新故事吧。</div>':''}
    <p class="page-footnote">所有角色均为 22 岁以上的成年虚构人物，人物照片由 AI 生成。</p></div></section>`;
}

function momentsPage(){
  const list=view.momentPerson?[byId[view.momentPerson]]:state.added.map(id=>byId[id]);
  return `<section class="full-page moments-page">${pageHeader('朋友圈','她的日常里，也藏着靠近她的线索。',view.momentPerson?'<button class="text-button" data-action="all-moments">查看全部</button>':icon('camera'))}
    <div class="page-scroll"><div class="moments-cover"><div class="cover-art"><span class="cover-sun"></span><span class="cover-hill one"></span><span class="cover-hill two"></span></div><div class="moments-cover-text"><span>把日子过成，<br>想分享给你的样子。</span><small>A LITTLE MOMENT, A LITTLE CLOSER.</small></div><div class="moments-owner"><strong>${escape(state.playerName)}</strong>${playerAvatar()}</div></div>
    <div class="moments-feed">${list.map((c,i)=>{const liked=state.liked.includes(c.id);return `<article class="moment"><button class="moment-avatar" data-action="person" data-id="${c.id}" aria-label="查看${c.name}资料">${avatar(c)}</button><div class="moment-content"><button class="moment-name" data-action="chat" data-id="${c.id}">${c.name}</button><p>${escape(c.moment)}</p><button class="moment-image" data-action="person" data-id="${c.id}" aria-label="查看${c.name}的公开生活照">${portrait(c)}</button><div class="moment-meta"><span>${i===0?'10 分钟前':`${i+1} 小时前`} · ${c.city}</span><div><button class="moment-like ${liked?'liked':''}" data-action="like" data-id="${c.id}" aria-label="${liked?'取消点赞':'点赞'+c.name+'的朋友圈'}">${icon('heart')}${liked?'已赞':'赞'}</button><button class="moment-comment" data-action="chat" data-id="${c.id}" aria-label="私聊${c.name}">${icon('chat')}</button></div></div>${liked?`<div class="moment-likes">${icon('heart')}${escape(state.playerName)}</div>`:''}</div></article>`;}).join('')}</div></div></section>`;
}

function albumPage() {
  const stats=statistics(state);
  const groups=characters.map(c=>({character:c,photos:galleryProgress(state,c.id).filter(photo=>view.albumFilter==='all'||photo.unlocked)})).filter(group=>group.photos.length);
  return `<section class="full-page album-page">
    ${pageHeader('心动收藏','慢慢靠近，把她生活里的不同瞬间收藏起来。',`<span class="count-pill">${stats.photos} / ${stats.totalPhotos} 张</span>`)}
    <div class="page-scroll">
      <div class="album-intro"><span>${icon('image')}</span><div><small>把心动留在相册里</small><h3>${characters.length} 段故事，${stats.totalPhotos} 个专属瞬间</h3><p>每个人都有自己的生活。随着关系靠近，她会逐张分享不同场景的写真。</p></div></div>
      <div class="filter-row">${[['all','全部写真'],['unlocked',`已解锁 ${stats.photos}`]].map(([f,t])=>`<button data-action="album-filter" data-filter="${f}" class="${view.albumFilter===f?'active':''}">${t}</button>`).join('')}</div>
      ${groups.map(({character:c,photos})=>`<section class="character-album" aria-label="${c.name}的相册">
        <header class="character-album-header">${avatar(c)}<div><h3>${c.name}<small>${c.tag}</small></h3><p>${escape(c.appearance)}</p></div><button data-action="gallery" data-id="${c.id}">${galleryProgress(state,c.id).filter(photo=>photo.unlocked).length} / ${c.gallery.length} ${icon('chevron')}</button></header>
        <div class="album-grid">${photos.map(photo=>photoCard(c,photo)).join('')}</div>
      </section>`).join('')}
      ${groups.length?'':`<div class="empty-page">${icon('image')}<h3>第一张心动，等你收藏</h3><p>认真聊聊她喜欢的事，让关系慢慢靠近。</p><button class="primary-button" data-action="nav" data-nav="chat">去聊天</button></div>`}
      <p class="page-footnote">照片仅在游戏中收藏。所有角色与故事均为虚构。</p>
    </div>
  </section>`;
}

function mePage(){
  const stats=statistics(state);
  return `<section class="full-page me-page">${pageHeader('我','认真生活，也认真心动。')}<div class="page-scroll"><div class="me-content"><div class="me-profile">${playerAvatar()}<div><h2>${escape(state.playerName)}</h2><p>微信号：azhe_parallel</p><span>平行人生 · 第 ${state.day} 天</span></div><button data-action="settings" aria-label="修改个人资料">${icon('more')}</button></div>
      <button class="wallet-card" data-action="wallet"><div><span>${icon('wallet')}我的零钱</span><strong><small>¥</small> ${money(state.balance)}</strong><p>给心动一点预算，给生活一点余地。</p></div>${icon('chevron')}</button>
      <div class="me-statistics"><div><strong>${stats.friends}</strong><span>已结识</span></div><div><strong>${stats.loves}</strong><span>双向心动</span></div><div><strong>${stats.photos}</strong><span>专属写真</span></div><div><strong>¥${money(stats.spent).replace('.00','')}</strong><span>累计支出</span></div></div>
      <div class="settings-list"><button data-action="nav" data-nav="album"><span class="setting-item-icon gold">${icon('album')}</span><span>收藏相册</span><small>${stats.photos} 张心动瞬间</small>${icon('chevron')}</button><button data-action="achievements"><span class="setting-item-icon coral">${icon('trophy')}</span><span>心动成就</span><small>${state.achievements.length} / ${achievementDefinitions.length}</small>${icon('chevron')}</button><button data-action="results"><span class="setting-item-icon blue">${icon('book')}</span><span>${state.finished?'本周心动日记':'本周故事进度'}</span><small>七天，认真认识彼此</small>${icon('chevron')}</button><button data-action="work"><span class="setting-item-icon green">${icon('briefcase')}</span><span>线上兼职</span><small>${state.workDay===state.day?'今日已完成':'+¥30 / 消耗 3 格电量'}</small>${icon('chevron')}</button></div>
      <div class="settings-list"><button data-action="settings"><span class="setting-item-icon gray">${icon('settings')}</span><span>设置与存档</span><small>${saveFailed?'存档异常':'进度自动保存'}</small>${icon('chevron')}</button><button data-action="help"><span class="setting-item-icon gray">${icon('help')}</span><span>怎么玩</span>${icon('chevron')}</button><button data-action="day"><span class="setting-item-icon violet">${icon('moon')}</span><span>${state.finished?'故事已完结':'结束今天'}</span><small>${state.finished?'去看看结算吧':'恢复全部社交电量'}</small>${icon('chevron')}</button></div><p class="page-footnote">渣男模拟器 v1.1 · 微信里的平行人生<br>角色与剧情均为虚构 · 进度保存在当前浏览器</p></div></div></section>`;
}

function render(options={}){
  const priorScroll=options.keepScroll?document.querySelector('.page-scroll')?.scrollTop:0;
  app.className=`wechat-app nav-${view.nav} ${view.mobileList?'show-mobile-list':''}`;
  const page=view.nav==='chat'?chatPanel():view.nav==='contacts'?contactsPage():view.nav==='moments'?momentsPage():view.nav==='album'?albumPage():mePage();
  app.innerHTML=`<div class="client-layout">${rail()}${conversations()}<div class="workspace">${page}</div></div><footer class="client-status"><span><i></i>微信 · 平行人生<span class="status-separator">/</span><strong>第 ${state.day} / ${GAME_DAYS} 天</strong></span><button data-action="help">${icon('leaf')}预算有限，心动无限。</button><span class="save-status">${icon(saveFailed?'help':'check')}${saveFailed?'存档未保存':'进度已自动保存'}</span></footer>`;
  const messages=document.querySelector('#messages');if(messages)messages.scrollTop=messages.scrollHeight;
  if(priorScroll)document.querySelector('.page-scroll').scrollTop=priorScroll;
}

function navigate(nav){
  if(!['chat','contacts','moments','album','me'].includes(nav))return;
  view.nav=nav;view.mobileList=false;view.momentPerson=null;view.search='';
  closeModal(false);render();
}

function openChat(id){
  if(!byId[id])return;
  if(!state.added.includes(id)){const result=addFriend(state,id);if(!result.ok){toast(result.message,'warning');return;}}
  state.selected=id;state.threads[id].read=true;view.draft='';view.nav='chat';view.mobileList=false;closeModal(false);persist();render();
}

function runAction(action,{delay=false,close=false}={}){
  if(view.busy)return;
  const execute=()=>{
    const result=action();view.busy=false;
    if(!result.ok){toast(result.message,'warning');render();return;}
    if(close)closeModal(false);
    persist();render();
    if(result.unlocked)toast(`解锁了 ${result.unlockedPhotos.length} 张专属写真，她把这一刻分享给了你。`);
    else if(result.achievements?.length)toast(`新成就：${result.achievements[0]}`);
    else if(result.message)toast(result.message);
    else if(Number.isFinite(result.gain))toast(`好感 ${result.gain>=0?'+':''}${result.gain}${result.cost?` · 支出 ¥${money(result.cost)}`:' · 用心不必花钱'}`,result.gain<0?'warning':'success');
  };
  if(delay){view.busy=true;render();setTimeout(execute,550);}else execute();
}

function galleryModal(c) {
  const photos=galleryProgress(state,c.id),owned=photos.filter(photo=>photo.unlocked).length;
  return {title:`${c.name}的专属相册`,subtitle:`${c.tag} · 已收藏 ${owned} / ${photos.length} 张`,className:'gallery-modal',body:`
    <p class="gallery-modal-intro">${escape(c.bio)}</p><div class="album-grid">${photos.map(photo=>photoCard(c,photo)).join('')}</div>
    <p class="modal-note">随着好感和故事话题推进，新的照片会自动出现在聊天里。</p>`};
}

function photoModal(c, photoId) {
  const p=state.threads[c.id],photos=galleryProgress(state,c.id);
  const photo=photos.find(item=>item.id===photoId)||photos[0];
  const index=photos.findIndex(item=>item.id===photo.id);
  if(!photo.unlocked)return {
    title:photo.title,subtitle:`${c.name}的专属写真 · 第 ${index+1} / ${photos.length} 张`,body:`
      <div class="locked-photo-symbol">${icon('lock')}</div><p class="locked-photo-copy">关系再近一点，她会主动分享这个瞬间。</p>
      <div class="unlock-requirements"><div><span>好感度达到 ${photo.unlock.affection}</span><strong>${p.affection>=photo.unlock.affection?icon('check'):`${p.affection} / ${photo.unlock.affection}`}</strong></div><div><span>聊完 ${photo.unlock.stage} 个故事话题</span><strong>${p.stage>=photo.unlock.stage?icon('check'):`${p.stage} / ${photo.unlock.stage}`}</strong></div></div>
      <button class="primary-button" data-action="chat" data-id="${c.id}">和她继续聊聊 ${icon('arrow')}</button><button class="secondary-button" data-action="gallery" data-id="${c.id}">看看她的整本相册</button>`,
  };
  const nav=(direction,label,target)=>`<button data-action="photo" data-id="${c.id}" data-photo="${target?.id||''}" data-viewer-nav="${direction}" aria-label="${label}" ${target?'':'disabled'}>${icon(direction==='prev'?'back':'chevron')}</button>`;
  return {title:`${c.name} · ${photo.title}`,subtitle:`仅分享给你 · 第 ${index+1} / ${photos.length} 张`,className:'photo-modal',body:`
    <div class="full-photo">${imageFrame(photo.image,'private-photo',`${c.name}的${photo.title}`)}</div>
    <div class="photo-viewer-nav">${nav('prev','上一张写真',photos[index-1])}<button data-action="gallery" data-id="${c.id}">${index+1} / ${photos.length} · 返回相册</button>${nav('next','下一张写真',photos[index+1])}</div>
    <div class="photo-caption">${icon('heart')}这张照片，已经收藏进你的心动相册。</div>`,
  };
}

function modalContent(type,id,photoId){
  const c=byId[id]||activeCharacter(),p=state.threads[c.id];
  if(type==='gift')return {title:'送一份心意',subtitle:`送给 ${c.name} · 每天限一份，合她心意才更动人`,body:`<div class="gift-grid">${gifts.map(g=>`<button class="gift-option" data-action="send-gift" data-gift="${g.id}" data-id="${c.id}" ${p.giftDay===state.day?'disabled':''}>${icon(g.icon)}<strong>${g.name}</strong><span>¥${money(g.price)}</span><small>${g.description}</small></button>`).join('')}</div><p class="modal-note">${icon('leaf')}她喜欢：${c.likes.join('、')}。先想想她需要什么。</p><div class="modal-balance">零钱余额<span>¥${money(state.balance)}</span></div>`};
  if(type==='redpacket')return {title:'发红包',subtitle:`给 ${c.name} 一点小小的心意`,body:`<form id="redpacket-form"><div class="amount-input"><label for="red-amount">红包金额</label><span>¥</span><input id="red-amount" type="number" min="1" max="200" step="0.01" value="5.20" inputmode="decimal" required aria-label="红包金额，1到200元"></div><div class="amount-presets">${[5.20,18.88,52].map(n=>`<button type="button" data-action="red-amount" data-amount="${n}">¥${n.toFixed(2)}</button>`).join('')}</div><p class="modal-note">金额 1～200 元，每位好友每天限发一次。红包不会按金额等比例增加好感。</p><div class="modal-balance">零钱余额<span>¥${money(state.balance)}</span></div><button class="primary-button redpacket-button" type="submit" ${p.redDay===state.day?'disabled':''}>${p.redDay===state.day?'今天已经发过红包':'塞钱进红包'}</button></form>`};
  if(type==='invite')return {title:'约她见面',subtitle:`和 ${c.name} 一起，把聊天变成回忆`,body:`<div class="invite-list">${[['walk','sun','日落散步','找一条安静的街，慢慢走，慢慢聊。',0],['cafe','coffee','咖啡小聚','两杯热咖啡，换一个悠闲的午后。',3600],['gallery','image','周末看展','一起看看世界的另一种表达。',6000]].map(([key,i,n,d,cost])=>`<button data-action="send-invite" data-kind="${key}" data-id="${c.id}" ${p.affection<45||p.dateDay===state.day?'disabled':''}>${icon(i)}<span><strong>${n}</strong><small>${d}</small></span><em>${cost?`¥${money(cost)}`:'免费'}</em>${icon('chevron')}</button>`).join('')}</div><p class="modal-note">${icon('heart')}${p.affection<45?`当前好感 ${p.affection}，达到 45 后可以邀约。`:p.dateDay===state.day?'今天的见面已记在心里，明天再约吧。':'好感已达标。每次邀约消耗 2 格电量，每位好友每天一次。'}</p>`};
  if(type==='wallet')return {title:'零钱',subtitle:'微信支付 · 你的每一份心意都有迹可循',body:`<div class="wallet-modal-total">${icon('wallet')}<span>我的零钱</span><strong><small>¥</small> ${money(state.balance)}</strong><p>初始预算 ¥520.00 · 累计支出 ¥${money(state.spent)}</p></div><div class="wallet-modal-actions"><button class="primary-button" data-action="work" ${state.workDay===state.day?'disabled':''}>${icon('briefcase')}${state.workDay===state.day?'今日兼职已完成':'线上兼职 +¥30'}</button><small>每日一次 · 消耗 3 格社交电量</small></div><div class="bill-heading">零钱明细 <span>${state.transactions.length} 笔</span></div><div class="bill-list">${[...state.transactions].reverse().map(t=>`<div class="bill"><span class="bill-icon ${t.amount>0?'income':''}">${icon(t.amount>0?'wallet':'heart')}</span><div><strong>${escape(t.title)}</strong><small>第 ${t.day} 天</small></div><span class="${t.amount>0?'income':''}">${t.amount>0?'+':'−'}${money(Math.abs(t.amount))}</span></div>`).join('')}</div>`};
  if(type==='gallery')return galleryModal(c);
  if(type==='photo')return photoModal(c,photoId);
  if(type==='person')return {title:'朋友资料',subtitle:`微信号：${c.handle}`,body:`<div class="person-modal-profile">${avatar(c)}<div><h3>${c.name}<span>♀</span></h3><p>${c.age} 岁 · ${c.job} · ${c.city}</p></div></div><p class="person-bio">${c.bio}</p><div class="person-detail"><span>性格印象</span><strong>${c.tag}</strong></div><div class="person-detail"><span>喜欢的事</span><strong>${c.likes.join('、')}</strong></div><div class="person-detail"><span>不太喜欢</span><strong>${c.dislikes.join('、')}</strong></div><button class="primary-button" data-action="chat" data-id="${c.id}">${icon('chat')}${state.added.includes(c.id)?'发消息':'添加并开始聊天'}</button>`};
  if(type==='day')return {title:state.finished?'本周的故事已收藏':'今天就到这里吗？',subtitle:`第 ${state.day} / ${GAME_DAYS} 天 · 剩余社交电量 ${state.energy} / ${MAX_ENERGY}`,body:`<div class="day-illustration">${icon(state.finished?'book':'moon')}</div><p class="day-copy">${state.finished?'七天的聊天，已经变成了你的专属回忆。':state.day===7?'七天的故事即将落笔。结束今天后，将生成本周的心动日记。':'把手机放下，好好睡一觉。明天电量会充满，聊天和回忆都会留下。'}</p><button class="primary-button" data-action="${state.finished?'results':'next-day'}">${state.finished?'查看心动日记':state.day===7?'结束本周，翻开心动日记':'晚安，进入下一天'}</button><button class="secondary-button" data-action="close-modal">再聊一会儿</button>`};
  if(type==='achievements')return {title:'心动成就',subtitle:'每一份认真，都值得被记住。',body:`<div class="achievement-list">${achievementDefinitions.map(a=>`<div class="achievement ${state.achievements.includes(a.id)?'earned':''}"><span>${icon(a.icon)}</span><div><strong>${a.title}</strong><small>${a.description}</small></div>${icon(state.achievements.includes(a.id)?'check':'lock')}</div>`).join('')}</div>`};
  if(type==='results'){
    const s=statistics(state);return {title:state.finished?'你的七日心动日记':'故事还在继续',subtitle:`第 ${state.day} 天 · ${state.finished?'这一次，有人记住了你的认真。':'每一句走心的回应，都在写下新的可能。'}`,body:`<div class="results-art">${icon('book')}<span>DEAR, THIS IS OUR STORY.</span></div><div class="result-stats"><div><strong>${s.loves}</strong><span>位双向心动</span></div><div><strong>${s.photos}</strong><span>张专属写真</span></div><div><strong>${s.stories}</strong><span>段完整故事</span></div></div><div class="results-spend"><span>本周累计支出</span><strong>¥${money(s.spent)}</strong></div><p class="results-quote">${s.spent===0&&s.photos>0?'你证明了，真诚的心意确实可以无价。':s.loves>0?'原来最好的攻略，是好好听一个人说话。':'有些故事需要耐心，每一句你好都算数。'}</p><button class="primary-button" data-action="${state.finished?'restart-confirm':'close-modal'}">${state.finished?'开启另一种人生':'继续我的故事'}</button>`};
  }
  if(type==='help')return {title:'微信里的平行人生',subtitle:'用有限的预算，收集不一样的心动。',body:`<div class="help-list"><div><span>01</span><section><h3>认真回复，慢慢靠近</h3><p>${characters.length} 位成年虚构好友，各有 6 段故事话题。选择灵感回复推进剧情；自由输入根据关键词回应，每位好友每天限 3 次。</p></section></div><div><span>02</span><section><h3>先了解她，再表达心意</h3><p>朋友圈和朋友资料藏着兴趣线索。回复、红包、礼物各消耗 1 格电量，邀约消耗 2 格；花钱不保证更高好感。</p></section></div><div><span>03</span><section><h3>收藏属于你们的瞬间</h3><p>首张写真在好感 45 且聊完 2 个话题后解锁，其余随关系推进逐张解锁，当前共有 ${TOTAL_PHOTOS} 张。70 开始暧昧，90 成为双向心动。日落散步免费，礼物每日一份。</p></section></div><div><span>04</span><section><h3>七天，一份心动日记</h3><p>初始预算 ¥520，每天 12 格电量，兼职可赚 ¥30。结束今天会恢复电量，七天后按心动人数、写真和支出生成结算。</p></section></div></div><p class="modal-note">这是本地分支剧情游戏，自由聊天并非在线 AI。进度自动保存在当前浏览器，可在设置中导出备份。</p><button class="primary-button" data-action="close-modal">知道了，开始心动</button>`};
  if(type==='settings')return {title:'设置与存档',subtitle:'平行人生的每一步，都为你记着。',body:`<form id="name-form"><label class="field-label" for="player-name">我的昵称</label><div class="nickname-row"><input id="player-name" value="${escape(state.playerName)}" maxlength="12" required aria-label="我的昵称"><button class="primary-button" type="submit">保存</button></div></form><div class="save-information">${icon('check')}<span>${saveFailed?'自动保存不可用，请导出备份':'已启用自动保存'}<small>只保存在当前浏览器，不会跨设备同步。</small></span></div><div class="settings-list modal-settings"><button data-action="export">${icon('download')}<span>导出存档</span>${icon('chevron')}</button><button data-action="import">${icon('upload')}<span>导入存档</span>${icon('chevron')}</button><button class="danger-text" data-action="restart-confirm">${icon('logout')}<span>重新开始</span>${icon('chevron')}</button></div><input id="import-file" type="file" accept="application/json,.json" hidden><p class="modal-note">导入会覆盖当前进度，请先导出备份。所有人物与故事均为虚构；写实角色图片由 AI 生成。</p>`};
  if(type==='restart')return {title:'开启另一种人生？',subtitle:'当前故事会被新的开始替换。',body:`<p class="restart-copy">已经收藏的写真、聊天记录和关系进度都会清空。你可以先导出存档，再开始新的七天。</p><button class="secondary-button" data-action="export">${icon('download')}先导出当前存档</button><button class="primary-button danger-button" data-action="restart">确认，重新开始</button><button class="text-button full-width" data-action="close-modal">留在这个故事里</button>`};
  if(type==='work')return {title:'线上兼职',subtitle:'照顾好自己的生活，也为心动留点余地。',body:`<div class="work-illustration">${icon('briefcase')}</div><h3 class="work-title">一份轻量文案整理</h3><p class="work-copy">消耗 3 格社交电量，完成后零钱到账 ¥30.00。每天可以做一次。</p><div class="modal-balance">当前社交电量<span>${state.energy} / ${MAX_ENERGY}</span></div><button class="primary-button" data-action="do-work" ${state.workDay===state.day?'disabled':''}>${state.workDay===state.day?'今天已经完成，明天再来':'完成兼职，领取 ¥30.00'}</button>`};
  return {title:'微信',subtitle:'',body:''};
}

function openModal(type,id=state.selected,photoId){
  modalOrigin=document.activeElement;modal={type,id,photoId};renderModal();
}
function renderModal(){
  if(!modal)return;
  const content=modalContent(modal.type,modal.id,modal.photoId);
  modalRoot.innerHTML=`<div class="modal-backdrop" data-action="backdrop"><section class="modal ${content.className||''}" role="dialog" aria-modal="true" aria-labelledby="modal-title" tabindex="-1"><header class="modal-header"><div><h2 id="modal-title">${content.title}</h2><p>${content.subtitle}</p></div>${buttonIcon('close','close-modal','关闭窗口')}</header><div class="modal-body">${content.body}</div></section></div>`;
  document.querySelector('.modal')?.focus();
}
function closeModal(restoreFocus=true){modal=null;modalRoot.innerHTML='';if(restoreFocus&&modalOrigin?.isConnected)modalOrigin.focus();}

// 委托事件使重绘后的按钮与键盘操作使用同一条结算路径。
document.addEventListener('click',event=>{
  const target=event.target.closest('[data-action]');if(!target||target.disabled)return;
  const action=target.dataset.action,id=target.dataset.id||state.selected;
  if(view.busy&&!['close-modal','backdrop','details','show-list'].includes(action)){toast('正在等待她的回复，马上就好。','warning');return;}
  if(action==='backdrop'){if(event.target===target)closeModal();return;}
  if(action==='close-modal'){closeModal();return;}
  if(action==='nav'){navigate(target.dataset.nav);return;}
  if(action==='chat'){openChat(id);return;}
  if(action==='add'){const result=addFriend(state,id);if(result.ok){persist();render({keepScroll:true});toast(result.message||'已经是好友啦。');}else toast(result.message,'warning');return;}
  if(action==='details'){
    if(window.innerWidth<=1000){view.detailExplicit=!view.detailExplicit;view.details=view.detailExplicit;}
    else {view.details=!view.details;view.detailExplicit=false;}
    render();return;
  }
  if(action==='show-list'){view.mobileList=!view.mobileList;render();return;}
  if(action==='filter'){view.filter=target.dataset.filter;render();return;}
  if(action==='clear-search'){view.search='';render();document.querySelector('#search').focus();return;}
  if(action==='contact-filter'){view.contactFilter=target.dataset.filter;render();return;}
  if(action==='album-filter'){view.albumFilter=target.dataset.filter;render();return;}
  if(action==='album'){navigate('album');return;}
  if(action==='gallery'){openModal('gallery',id);return;}
  if(action==='photo'){openModal(target.dataset.photo?'photo':'gallery',id,target.dataset.photo);return;}
  if(action==='person-moments'){view.nav='moments';view.momentPerson=id;render();return;}
  if(action==='all-moments'){view.momentPerson=null;render();return;}
  if(action==='like'){toggleLike(state,id);persist();render({keepScroll:true});return;}
  if(action==='reply'){const chosen=Number(target.dataset.choice),key=target.dataset.scene;runAction(()=>chooseReply(state,id,chosen,key),{delay:true});return;}
  if(action==='send'){
    const text=view.draft;runAction(()=>{const result=sendText(state,id,text);if(result.ok)view.draft='';return result;},{delay:true});return;
  }
  if(action==='emoji'){view.draft+=' ☀️';render();document.querySelector('#composer')?.focus();return;}
  if(action==='send-gift'){runAction(()=>sendGift(state,id,target.dataset.gift),{close:true});return;}
  if(action==='send-invite'){runAction(()=>inviteDate(state,id,target.dataset.kind),{close:true});return;}
  if(action==='red-amount'){document.querySelector('#red-amount').value=Number(target.dataset.amount).toFixed(2);return;}
  if(action==='next-day'){const result=nextDay(state);persist();closeModal(false);render();if(result.finished)openModal('results');else toast(result.message);return;}
  if(action==='do-work'){runAction(()=>work(state),{close:true});return;}
  if(action==='restart-confirm'){openModal('restart');return;}
  if(action==='restart'){state=createGame();view.nav='chat';view.draft='';view.busy=false;persist();closeModal(false);render();toast('新的七天，从一句你好开始。');return;}
  if(action==='export'){
    const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=url;link.download=`平行人生-第${state.day}天-存档.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('存档已导出，记得好好保存。');return;
  }
  if(action==='import'){document.querySelector('#import-file')?.click();return;}
  if(['gift','redpacket','invite','wallet','photo','person','day','help','settings','achievements','results','work'].includes(action))openModal(action,id);
});

document.addEventListener('input',event=>{
  if(event.target.id==='composer'){view.draft=event.target.value;const send=document.querySelector('.send-button');if(send)send.disabled=!view.draft.trim()||view.busy||state.energy<1||state.finished;}
  if(event.target.id==='search'){
    if(event.isComposing)return;
    const input=event.target;view.search=input.value;const position=input.selectionStart;render();const next=document.querySelector('#search');next.focus();try{next.setSelectionRange(position,position);}catch{}
  }
});

document.addEventListener('compositionend',event=>{
  if(event.target.id!=='search')return;
  view.search=event.target.value;render();document.querySelector('#search')?.focus();
});

document.addEventListener('keydown',event=>{
  if(event.key==='Escape'){if(modal)closeModal();else if(view.mobileList){view.mobileList=false;render();}return;}
  if(modal&&event.key==='Tab'){
    const focusable=[...modalRoot.querySelectorAll('button:not(:disabled),input:not([hidden]),a,textarea,select')];
    const first=focusable[0],last=focusable.at(-1);
    if(event.shiftKey&&(document.activeElement===first||document.activeElement===document.querySelector('.modal'))){event.preventDefault();last?.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
  }
  if(event.target.id==='composer'&&event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();document.querySelector('.send-button')?.click();}
});

document.addEventListener('submit',event=>{
  if(event.target.id==='redpacket-form'){
    event.preventDefault();const value=document.querySelector('#red-amount').value;
    if(!/^\d+(\.\d{1,2})?$/.test(value)){toast('请输入最多两位小数的有效金额。','warning');return;}
    const cents=Math.round(Number(value)*100),id=modal.id;
    runAction(()=>sendRedPacket(state,id,cents),{close:true});
  }
  if(event.target.id==='name-form'){
    event.preventDefault();const name=document.querySelector('#player-name').value.trim();
    if(!name){toast('昵称不能为空。','warning');return;}
    state.playerName=name.slice(0,12);persist();render();closeModal(false);toast('昵称已保存。');
  }
});

document.addEventListener('change',async event=>{
  if(event.target.id!=='import-file')return;
  const file=event.target.files?.[0];if(!file)return;
  if(file.size>8*1024*1024){toast('存档文件过大，请选择游戏导出的 JSON 文件。','warning');event.target.value='';return;}
  let restored;
  try {restored=hydrateGame(await file.text());}catch{toast('无法读取这个文件，请重新选择存档。','warning');return;}
  if(!restored){toast('存档格式无效或版本不兼容，当前进度已保留。','warning');event.target.value='';return;}
  state=restored;view.nav='chat';view.draft='';persist();closeModal(false);render();toast('存档已恢复，欢迎回到你的故事。');
});

// 同时打开试玩页时同步规则状态，避免旧标签页覆盖已解锁的关系进度。
window.addEventListener('storage',event=>{
  if(event.key!==STORAGE_KEY||!event.newValue)return;
  const incoming=hydrateGame(event.newValue);if(!incoming)return;
  const selected=state.selected;
  state=incoming;
  if(state.added.includes(selected))state.selected=selected;
  render({keepScroll:true});
  if(modal)renderModal();
});

render();
persist();
if(loaded.migrated)toast('存档已升级：保留预算与关系，暂不出场的好友进度已归档。');
if(loaded.reset)toast('旧存档无法读取，已为你开启新的故事。','warning');
if(loaded.unavailable)toast('当前浏览器无法读取存档，可以在设置中导出备份。','warning');
