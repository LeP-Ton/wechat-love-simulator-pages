import { characterDefinitions } from './characters.js';
import { createCharacterRegistry } from './character-registry.js';

export const GAME_DAYS = 7;
export const MAX_ENERGY = 12;
export const characterRegistry = createCharacterRegistry(characterDefinitions);
export const characters = characterRegistry.characters;
export const byId = characterRegistry.byId;
export const TOTAL_PHOTOS = characterRegistry.totalPhotos;

const responses = {
  creative: ['比起照片，我更想听你讲讲那一刻。','不用急着找答案，先陪你把这个故事聊完。','我们去寻找一点平常生活里的灵感？'],
  calm: ['认真做过的事情，都不会白费。我想听你慢慢说。','你的想法一定有原因，我愿意认真听。','不赶时间，我们边走边聊。'],
  warm: ['不完美也没关系，你已经做得很好了。','能让你开心的小事，我也想参与。','我来做你的第一位体验官。'],
  independent: ['辛苦啦，今天可以不用再做任何决定。','我喜欢你有自己想法的样子。','时间和地点你来定，我带着好心情到。'],
  active: ['有！不过听你这么说，我已经开始期待下次了。','下次带上我，我想亲眼看看你喜欢的世界。','一起去走走？我保证不迟到。'],
  romantic: ['有些感觉不用解释，我想陪你一起记住。','你认真对待的小事，我也想认真对待。','找个安静的地方，听你慢慢讲。'],
};

// 每个分支的数值和反馈一起定义；剧情推进只由引擎结算一次。
export function sceneFor(character, progress, day) {
  const c = character;
  const lines = responses[c.type];
  const scenes = [
    {
      prompt: c.opening[2],
      choices:[
        {text:c.openingReply, gain:8, cost:0, reply:'你这么说，突然觉得和你聊聊天，是今天最好的决定。'},
        {text:'给你点杯喝的，今天也辛苦了。', gain:5, cost:1800, reply:'谢谢你的心意。不过其实，陪我说说话就很好。'},
        {text:'哈哈，早点休息，多喝热水。', gain:-3, cost:0, reply:'嗯……那先这样吧。'},
      ],
    },
    {
      prompt:`其实我一直很喜欢${c.likes[0]}。你有特别喜欢、愿意花时间去做的事吗？`,
      choices:[
        {text:`我想多了解一点${c.likes[0]}，从你的故事开始。`, gain:10, cost:0, reply:`那我可以聊很久哦。难得有人愿意听我讲${c.likes[0]}。`},
        {text:lines[1], gain:8, cost:0, reply:'好像和你聊天，会不自觉地说得比平时多。'},
        {text:'我的爱好是赚钱，其他都随便。', gain:-4, cost:0, reply:'这样啊，我们好像有点不一样。'},
      ],
    },
    {
      prompt:'这个周末突然空下来了。你有什么不错的安排吗？',
      choices:[
        {text:lines[2], gain:12, cost:0, reply:'好啊。简单一点的安排，反而让我更期待。'},
        {text:'我订了一家人均 128 元的餐厅，一起去？', gain:13, cost:12800, reply:'可以呀。其实重要的不是去哪，是和谁一起。'},
        {text:'你来找我吧，我懒得安排。', gain:-8, cost:0, reply:'算啦，我还是自己安排吧。'},
      ],
    },
    {
      prompt:'平时很少跟人说这些。不知道为什么，跟你聊天还挺放松的。',
      choices:[
        {text:'那就慢慢来吧，我想认识真实的你。', gain:10, cost:0, reply:'好。那你也不用在我面前装得很完美。'},
        {text:'彼此彼此，我也很珍惜这些聊天。', gain:8, cost:0, reply:'原来不是只有我一个人这么觉得。'},
        {text:'所以你现在是不是喜欢上我了？', gain:-7, cost:0, reply:'也不用这么急着要一个答案。'},
      ],
    },
    {
      prompt:`如果有一天我忙到忘了回消息，你会怎么想？做${c.job}有时候真的会这样。`,
      choices:[
        {text:'你有自己的生活，忙完再聊就好。', gain:12, cost:0, reply:'谢谢你理解。被信任的感觉，比随时在线更让我安心。'},
        {text:'我会有点想你，不过会先把自己的日子过好。', gain:10, cost:0, reply:'这句话有一点点让人心动。'},
        {text:'我会一直发消息，直到你回我为止。', gain:-10, cost:0, reply:'这样会让我有点压力。我们还是留一点空间吧。'},
      ],
    },
    {
      prompt:'跟你认识的时间不长，但已经会期待手机里出现你的消息了。',
      choices:[
        {text:'我也是。下次见面，想认真地告诉你。', gain:12, cost:0, reply:'那这次，换我来等你。说好了哦。'},
        {text:'那我们继续创造更多回忆，好不好？', gain:10, cost:0, reply:'好，下一页我们一起写。'},
        {text:'哈哈，你不是第一个这么说的。', gain:-12, cost:0, reply:'原来如此。那可能是我想多了。'},
      ],
    },
  ];
  if (progress.stage < scenes.length) {
    const current=scenes[progress.stage];
    const offset=(c.index+progress.stage)%current.choices.length;
    const choices=[...current.choices.slice(offset),...current.choices.slice(0,offset)];
    return { ...current, choices, key:`${c.id}:story:${progress.stage}`, label:`故事 ${progress.stage + 1} / 6`, kind:'story' };
  }
  return {
    key:`${c.id}:daily:${day}:${progress.dailyCount || 0}`,
    kind:'daily', label:'日常陪伴',
    prompt:`今天也想和你聊聊。最近有什么让你开心的小事吗？`,
    choices:[
      {text:`今天想到你说过的${c.likes[0]}，就想来找你。`, gain:5, cost:0, reply:'你居然还记得！被人记住的感觉真好。'},
      {text:'今天的好消息，是又可以跟你聊一会儿。', gain:4, cost:0, reply:'这大概也是我的好消息。'},
      {text:'给你带了杯咖啡，一起放空一会儿。', gain:5, cost:1800, reply:'好呀，今天就把时间浪费在舒服的事情上。'},
    ],
  };
}

export const gifts = [
  {id:'coffee',name:'一杯咖啡',price:1800,icon:'coffee',description:'把今天的小疲惫交给它。',match:['咖啡','黑咖啡','编程','设计'],gain:6},
  {id:'dessert',name:'一份小甜点',price:1200,icon:'cake',description:'生活的甜，分你一半。',match:['甜食','甜品','美食','烘焙','做饭'],gain:6},
  {id:'flowers',name:'一束鲜花',price:6800,icon:'flower',description:'普通的一天也值得纪念。',match:['鲜花','花','植物','香水'],gain:8},
  {id:'book',name:'一本好书',price:3500,icon:'book',description:'看到这本书，就想起了你。',match:['阅读','旧书','诗歌','文学','科幻','悬疑'],gain:7},
];

export function relationship(value) {
  if (value >= 90) return { label:'双向心动', short:'心动', color:'rose', caption:'你们的故事，正慢慢成为日常。' };
  if (value >= 70) return { label:'渐生情愫', short:'暧昧', color:'rose', caption:'有些心事，只想说给你听。' };
  if (value >= 45) return { label:'慢慢靠近', short:'熟悉', color:'green', caption:'从聊天开始，让彼此更靠近一点。' };
  return { label:'初次心动', short:'初识', color:'green', caption:'每一段故事，都始于一句你好。' };
}

export const achievementDefinitions = [
  {id:'first-photo',title:'限定分享',description:'解锁第一张专属写真',icon:'image',check:s=>characters.some(c=>s.threads[c.id]?.unlockedPhotos?.length)},
  {id:'first-love',title:'双向奔赴',description:'与一位好友达到 90 好感',icon:'heart',check:s=>Object.values(s.threads).some(p=>p.affection>=90)},
  {id:'good-listener',title:'认真听你说',description:'完成一位好友的全部故事',icon:'chat',check:s=>Object.values(s.threads).some(p=>p.stage>=6)},
  {id:'social',title:'你的好友已上线',description:`结识全部 ${characters.length} 位好友`,icon:'contacts',check:s=>characters.every(c=>s.added.includes(c.id))},
  {id:'free-love',title:'心意无价',description:'不花钱解锁一张写真',icon:'leaf',check:s=>s.spent===0&&characters.some(c=>s.threads[c.id]?.unlockedPhotos?.length)},
  {id:'collector',title:'收藏心动',description:'获得 5 张专属写真',icon:'album',check:s=>characters.reduce((count,c)=>count+(s.threads[c.id]?.unlockedPhotos?.length||0),0)>=5},
];
