const milestones = [[45,2],[55,3],[65,4],[78,5],[90,6]];

const still = src => ({ src, columns:1, rows:1, column:0, row:0, aspectRatio:3 / 4 });

function photos(id, src, titles, { rowSplit = .5, avatar, replacements = {} } = {}) {
  // 生成图的分界偶有偏差，按实际区域取景，避免下排人物被规则网格裁头。
  const frame = slot => {
    const column = slot % 3, row = Math.floor(slot / 3);
    return {
      src, columns:3, rows:2, column, row, aspectRatio:3 / 4,
      ...(rowSplit === .5 ? {} : { crop:{ x:column / 3, y:row ? rowSplit : 0, width:1 / 3, height:row ? 1 - rowSplit : rowSplit } }),
    };
  };
  return {
    avatar:avatar ? still(avatar) : frame(0),
    gallery:titles.map((title, index) => ({
      id:`${id}-photo-${index + 1}`, title, image:replacements[index + 1] ? still(replacements[index + 1]) : frame(index + 1),
      unlock:{ affection:milestones[index][0], stage:milestones[index][1] },
    })),
  };
}

// 首发五位保留原始 ID。后续增补定义并启用即可接入通讯录、剧情、相册和存档。
export const characterDefinitions = [
  {
    id:'c01', name:'林晚', age:27, job:'独立摄影师', city:'杭州', zodiac:'双鱼座', tag:'慢热文艺', type:'creative',
    handle:'linwan__', initialAffection:28, initialFriend:true, lastTime:'19:42',
    appearance:'乌黑微卷长发 · 温柔鹅蛋脸 · 清透杏眼',
    bio:'把没说出口的话，慢慢留在胶片里。喜欢被认真听见，也喜欢不必急着回答的相处。',
    likes:['日落','胶片','散步'], dislikes:['敷衍','过度炫耀'],
    moment:'今天的日落很好看，可惜照片拍不出万分之一。',
    opening:['还记得上次那家咖啡店吗？','今天路过，发现靠窗的位置还空着。','你说，下次会不会刚好遇见你？'],
    openingReply:'我会提前到，帮你留住靠窗的位置。',
    ...photos('c01','./assets/characters/linwan-v4.png',['靠窗的位置','旧街有光','留给自己的下午','雨落在伞上','落日也想见你'],{
      avatar:'./assets/characters/linwan-avatar-v5.png',
      replacements:{
        1:'./assets/characters/linwan-photo-1-v5.png',
        3:'./assets/characters/linwan-photo-3-v5.png',
      },
    }),
  },
  {
    id:'c02', name:'沈知意', age:29, job:'建筑设计师', city:'上海', zodiac:'摩羯座', tag:'清冷知性', type:'calm',
    handle:'shenzhiyi__', initialAffection:19, initialFriend:true, lastTime:'19:36',
    appearance:'栗棕侧分短发 · 心形小脸 · 清冷猫眼',
    bio:'对建筑讲结构，对感情讲真诚。看起来不好接近，只是不喜欢毫无意义的热闹。',
    likes:['建筑','展览','黑咖啡'], dislikes:['迟到','空话'],
    moment:'在老建筑里走了一下午。好的设计，大概是让人愿意停留。',
    opening:['刚从工地回来，有点累。','今天的方案又改了第三版。','如果是你，会坚持原来的想法吗？'],
    openingReply:'先听听你的坚持是什么，再一起想办法。',
    ...photos('c02','./assets/characters/shenzhiyi-v4.png',['模型之外','一起看展的人','一杯茶的时间','城市还没入睡','借你半页秋天'],{
      avatar:'./assets/characters/shenzhiyi-avatar-v5.png',
      replacements:{
        2:'./assets/characters/shenzhiyi-photo-2-v5.png',
        3:'./assets/characters/shenzhiyi-photo-3-v5.png',
      },
    }),
  },
  {
    id:'c03', name:'许桃', age:25, job:'甜品店主理人', city:'成都', zodiac:'巨蟹座', tag:'甜系治愈', type:'warm',
    handle:'xutao__', initialAffection:18, initialFriend:true, lastTime:'19:20',
    appearance:'蜜棕蓬松卷发 · 甜美心形脸 · 明亮鹿眼',
    bio:'会把最后一颗草莓留给喜欢的人。爱笑，也会坦白自己的小委屈，喜欢热乎乎的陪伴。',
    likes:['甜品','小猫','春天'], dislikes:['浪费食物','冷场'],
    moment:'今天的草莓塔售罄！最后一颗草莓偷偷留给了自己。',
    opening:['新品翻车了，奶油打过头了。','不过失败的样子也蛮可爱的。','你会愿意试吃一个不完美的蛋糕吗？'],
    openingReply:'当然，试吃官到位。不完美也值得被喜欢。',
    ...photos('c03','./assets/characters/xutao-v4.png',['最后一颗草莓','野餐请带上我','厨房里的早安','晚风和游乐场','花开的时候'],{
      avatar:'./assets/characters/xutao-avatar-v5.png',
      replacements:{
        1:'./assets/characters/xutao-photo-1-v5.png',
      },
    }),
  },
  {
    id:'c04', name:'顾清禾', age:32, job:'品牌策略顾问', city:'深圳', zodiac:'天蝎座', tag:'成熟独立', type:'independent',
    handle:'guqinghe__', initialAffection:24, initialFriend:false, lastTime:'18:58',
    appearance:'深棕侧分长波浪 · 秀丽长脸 · 妩媚凤眼',
    bio:'能自己处理很多事，也愿意为合拍的人留出时间。欣赏有分寸的幽默，不喜欢被安排。',
    likes:['效率','爵士','旅行'], dislikes:['控制欲','油腻话术'],
    moment:'忙完一个大项目。把通知关掉的瞬间，世界终于安静了。',
    opening:['终于下班。今天开了七个会。','手机电量剩 8%，社交电量大概也是。','来点不用动脑的聊天？'],
    openingReply:'那今天不聊工作，我负责逗你开心。',
    ...photos('c04','./assets/characters/guqinghe-v4.png',['下班后的我','给自己放个假','安静也很合拍','今晚听爵士','冬天的慢步调'],{ rowSplit:577 / 1182,
      avatar:'./assets/characters/guqinghe-avatar-v5.png',
      replacements:{
        1:'./assets/characters/guqinghe-photo-1-v5.png',
        2:'./assets/characters/guqinghe-photo-2-v5.png',
        5:'./assets/characters/guqinghe-photo-5-v5.png',
      },
    }),
  },
  {
    id:'c05', name:'程夏', age:26, job:'户外运动教练', city:'厦门', zodiac:'白羊座', tag:'元气直球', type:'active',
    handle:'chengxia__', initialAffection:16, initialFriend:false, lastTime:'18:32',
    appearance:'乌黑高马尾 · 清秀菱形脸 · 阳光笑眼',
    bio:'说喜欢就会主动靠近，说出发就真的穿上鞋。精力充沛，也想有人陪她一起看更远的风景。',
    likes:['爬山','海边','运动'], dislikes:['放鸽子','消极抱怨'],
    moment:'五点起床看到了日出。早起的奖励，真的有点浪漫。',
    opening:['刚跑完五公里！','海边的风也太舒服了。','你今天有出门走走吗？'],
    openingReply:'有！不过下次想和你一起去海边。',
    ...photos('c05','./assets/characters/chengxia-v4.png',['海风有回音','下次一起出发','比赛后的笑','休息日也想你','山顶一起看日出'],{
      avatar:'./assets/characters/chengxia-avatar-v5.png',
      replacements:{
        3:'./assets/characters/chengxia-photo-3-v5.png',
        4:'./assets/characters/chengxia-photo-4-v5.png',
      },
    }),
  },
];
