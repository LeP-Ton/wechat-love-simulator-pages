// 角色、图片与照片条件均由数据声明；增加角色无需改动界面或结算代码。
export function createCharacterRegistry(definitions) {
  if (!Array.isArray(definitions) || !definitions.length) throw new Error('角色池不能为空。');
  const ids = new Set();
  const photoIds = new Set();
  const validateFrame = frame => {
    if (!frame || typeof frame.src !== 'string' || !frame.src.startsWith('./assets/')) throw new Error('图片必须引用项目内素材。');
    for (const key of ['columns', 'rows']) if (!Number.isInteger(frame[key]) || frame[key] < 1) throw new Error('图片网格尺寸无效。');
    if (!Number.isInteger(frame.column) || !Number.isInteger(frame.row) || frame.column < 0 || frame.column >= frame.columns || frame.row < 0 || frame.row >= frame.rows) throw new Error('图片单元位置超出网格。');
    if (!Number.isFinite(frame.aspectRatio) || frame.aspectRatio <= 0) throw new Error('图片比例无效。');
    if (frame.crop) {
      const { x, y, width, height } = frame.crop;
      if (![x,y,width,height].every(Number.isFinite) || x < 0 || y < 0 || width <= 0 || height <= 0 || x + width > 1 + 1e-9 || y + height > 1 + 1e-9) {
        throw new Error('图片取景区域必须位于素材范围内。');
      }
    }
  };
  const freezeFrame = frame => Object.freeze({ ...frame, ...(frame.crop ? { crop:Object.freeze({ ...frame.crop }) } : {}) });
  const all = definitions.map((definition, index) => {
    if (typeof definition.id !== 'string' || !/^[a-z][a-z0-9-]*$/.test(definition.id) || ids.has(definition.id)) throw new Error('角色 ID 必须使用唯一的英文标识。');
    ids.add(definition.id);
    if (!definition.name || !Number.isInteger(definition.age) || definition.age < 22 || !definition.opening?.length || !definition.likes?.length) throw new Error('角色基础资料不完整。');
    validateFrame(definition.avatar);
    if (!definition.gallery?.length) throw new Error('每位角色必须配置相册。');
    const gallery = definition.gallery.map(photo => {
      if (!photo.id || photoIds.has(photo.id) || !photo.title) throw new Error('照片 ID 必须唯一且有标题。');
      photoIds.add(photo.id);
      validateFrame(photo.image);
      const { affection, stage } = photo.unlock || {};
      if (!Number.isInteger(affection) || affection < 0 || affection > 100 || !Number.isInteger(stage) || stage < 0 || stage > 6) throw new Error('照片解锁条件无效。');
      return Object.freeze({ ...photo, image:freezeFrame(photo.image), unlock:Object.freeze({ ...photo.unlock }) });
    });
    return Object.freeze({ ...definition, index, avatar:freezeFrame(definition.avatar), gallery:Object.freeze(gallery) });
  });
  const characters = Object.freeze(all.filter(character => character.enabled !== false));
  if (!characters.length) throw new Error('至少需要一位已启用角色。');
  return Object.freeze({
    all:Object.freeze(all), characters,
    byId:Object.freeze(Object.assign(Object.create(null),Object.fromEntries(characters.map(character => [character.id, character])))),
    totalPhotos:characters.reduce((total, character) => total + character.gallery.length, 0),
  });
}
