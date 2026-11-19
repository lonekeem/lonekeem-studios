// Character catalog (data only, original designs). Items = base style x fabric pattern / metal / colour, generated from compact tables so
// the catalog scales to thousands of entries without new assets. COUNTS() reports exact numbers for the UI and docs.
import { PATTERNS } from './garments.js';
export { PATTERNS };

export const BASES = [ // v2: one guy + one girl base; body shape comes from the proportion sliders (old 'strong' / 'curvy' saves map onto them)
  { id: 'mp_m1', label: 'Guy', g: 'm' }, { id: 'mp_f1', label: 'Girl', g: 'f' },
];
export const SWATCH = {
  cloth: ['#f2f2f0', '#c9ccd0', '#8a8f98', '#4b4f57', '#17181b', '#7a1f1f', '#c0392b', '#e8743b', '#e9b949', '#d8c68a', '#6b8e3d', '#2f5d3a', '#1f6f78', '#4aa3c7', '#2f5fa8', '#1c2e5c', '#6c4aa5', '#b45fa7', '#e58fb0', '#8b5a3c', '#5b3a24', '#c8a27a', '#3a4a33', '#6a6a52'],
  hair: ['#0b0807', '#1a110b', '#2b1a10', '#3d2a1a', '#5a3b22', '#7a5230', '#9a6b3a', '#b88a4e', '#d4ae6a', '#e8cf94', '#efe2b8', '#8a8a8a', '#d6d6d6', '#a5391f', '#7a1f1f', '#c9481f', '#d83f8f', '#7b3fd8', '#3f6bd8', '#2fbfd0', '#34c26b', '#e8e03a', '#ff7f50', '#101a30'],
  metal: ['#d9b44a', '#cfd3d8', '#e0a98f', '#2a2a2e', '#b8733a', '#e9e3c9'],
  metalName: ['Gold', 'Silver', 'Rose gold', 'Black steel', 'Copper', 'Platinum'],
  gem: ['#e8e8f0', '#cc2a3c', '#2f6fd8', '#2fa860', '#8a3fd0', '#e9a020', '#2fc0c8', '#f07aa8', '#101010', '#f4f1e6', '#f0d060', '#ff5a1f'],
  eye: ['#2b1a10', '#4a2c17', '#6b4423', '#8a6a3a', '#3a6a3a', '#2f7a5a', '#3a7a9a', '#4a86c8', '#7aa0c8', '#8a8f98', '#5a4a8a', '#a53a3a'],
  lip: ['#a85a4a', '#8a4a40', '#6a3a34', '#c0707a', '#b2264a', '#d84a5a', '#e98a8a', '#7a1f3a', '#5a2a55', '#2a1a1a', '#d46a3a', '#e8b0a8'],
  shadow: ['#7a4a8a', '#4a6aa8', '#2f7a6a', '#a8704a', '#b0557a', '#3a3a3a', '#c9a24a', '#8a8f98'],
  tattoo: ['#1c2a3a', '#101010', '#3a1c1c', '#1c3a2a', '#4a2f6a'],
};
// ---- face presets (applied to the face-paint uniforms; sliders then offset them)
export const EYES = [ // [name, w, h, tilt, droop, round]
  ['Almond', .19, .15, .1, .3, .5], ['Round', .17, .2, 0, .2, 1], ['Wide', .22, .17, 0, .25, .7], ['Narrow', .2, .1, .05, .35, .3], ['Upturned', .19, .15, .35, .3, .5], ['Downturned', .19, .15, -.3, .3, .5],
  ['Hooded', .19, .12, 0, .55, .4], ['Big', .22, .22, 0, .2, .9], ['Sleepy', .19, .12, -.1, .6, .4], ['Cat', .21, .13, .5, .4, .35], ['Small', .15, .12, 0, .25, .6], ['Deep-set', .18, .14, .05, .45, .5],
];
export const BROWS = [ // [name, arch, tilt, taper, thick, len, density]
  ['Soft', .5, .15, .5, .075, .62, 1], ['Straight', .1, 0, .3, .08, .66, 1], ['Arched', .9, .25, .6, .06, .62, 1], ['Thick', .4, .1, .4, .13, .66, 1], ['Thin', .5, .15, .6, .035, .62, 1], ['Bushy', .3, .1, .2, .17, .7, 1],
  ['Angled', .75, .45, .5, .08, .62, 1], ['Upswept', .4, .55, .6, .07, .64, 1], ['Flat thick', .05, 0, .2, .13, .68, 1], ['Short', .5, .1, .4, .08, .4, 1], ['Sparse', .5, .15, .5, .06, .62, .55], ['Unibrow', .3, .05, .2, .1, .9, 1],
];
export const NOSES = [['Average', 0, 0, 0, 0], ['Button', -.4, -.5, 0, .5], ['Broad', .6, 0, 0, 0], ['Long', 0, .6, .2, 0], ['Roman', .1, .3, .6, -.1], ['Upturned', -.2, -.2, 0, .6], ['Wide bridge', .4, 0, .4, 0], ['Narrow', -.6, .1, 0, 0]]; // [name, width, length, bridge, tip]
export const MOUTHS = [['Neutral', .28, .5, 0], ['Full', .3, .8, 0], ['Thin', .27, .15, 0], ['Smile', .3, .5, .6], ['Wide', .35, .55, .1], ['Small', .22, .55, 0], ['Pouty', .24, .9, -.1], ['Smirk', .28, .5, .3], ['Grin', .35, .55, .9]];
export const MAKEUP = {
  shadow: ['None', 'Soft', 'Smoky', 'Bold'], liner: ['None', 'Thin', 'Wing', 'Heavy'], blush: ['None', 'Light', 'Rosy', 'Strong'], lipstick: ['None', 'Tint', 'Matte', 'Dark'],
  freckles: ['None', 'Light', 'Medium', 'Heavy'], moles: ['None', 'One', 'Two', 'Three'], scars: ['None', 'Eyebrow cut', 'Cheek slash', 'Lip scar', 'Brow-to-eye', 'Stitches'], tattoo: ['None', 'Sleeve', 'Bands', 'Dots', 'Tribal'],
};
// ---- hair (v2: sculpted caps on the analytic head; geometry lives in v2/hair.js STYLES). [id, name, gender m/f/u]
export const HAIR = [
  ['bald', 'Bald', 'u'], ['buzz', 'Buzz cut', 'u'], ['crew', 'Crew cut', 'm'], ['caesar', 'Caesar', 'm'], ['lowfade', 'Low fade', 'm'], ['midfade', 'Mid fade', 'm'], ['highfade', 'High fade', 'm'],
  ['waves', 'Waves', 'u'], ['curlcrop', 'Curly crop', 'u'], ['curlfade', 'Curly top fade', 'm'], ['afro', 'Afro', 'u'], ['afromini', 'Mini afro', 'u'], ['sidepart', 'Side part', 'm'], ['slickback', 'Slick back', 'm'],
  ['quiff', 'Quiff', 'm'], ['pomp', 'Pompadour', 'm'], ['undercut', 'Undercut', 'm'], ['messy', 'Tousled', 'u'], ['spiky', 'Spiky', 'm'], ['mohawk', 'Mohawk', 'u'], ['receding', 'Receding', 'm'], ['bowl', 'Bowl cut', 'u'],
  ['manbun', 'Man bun', 'm'], ['ponylow', 'Low ponytail', 'u'], ['ponyhigh', 'High ponytail', 'f'], ['bunhigh', 'High bun', 'f'], ['bunlow', 'Low bun', 'f'], ['spacebuns', 'Space buns', 'f'], ['afropuffs', 'Afro puffs', 'f'],
  ['pigtails', 'Pigtails', 'f'], ['braids2', 'Two Dutch braids', 'f'], ['braidpony', 'Braided ponytail', 'f'], ['cornrows', 'Cornrows', 'u'], ['bob', 'Bob', 'f'], ['lob', 'Long bob', 'f'], ['pixie', 'Pixie', 'f'],
  ['shoulder', 'Shoulder length', 'u'], ['longstr', 'Long straight', 'f'], ['longwave', 'Long waves', 'f'], ['longcurl', 'Long curls', 'f'], ['curtain', 'Curtain bangs', 'f'], ['dreads', 'Locs', 'u'], ['twists', 'Twists', 'u'],
];
export const BEARDS = [ // [id, name, kind]
  ['none', 'None', -1], ['stubble', 'Stubble', -2], ['full', 'Full beard', 1], ['boxed', 'Short boxed', 2], ['lumber', 'Big beard', 11], ['goatee', 'Goatee', 3], ['circle', 'Circle beard', 8], ['soul', 'Soul patch', 4], ['strap', 'Chin strap', 5], ['curtain', 'Chin curtain', 6], ['mutton', 'Mutton chops', 7],
];
export const STACHES = [['none', 'None', -1], ['chevron', 'Chevron', 1], ['pencil', 'Pencil', 2], ['handlebar', 'Handlebar', 3], ['walrus', 'Walrus', 4], ['horseshoe', 'Horseshoe', 5]];
// ---- clothes
// tops: [id, name, g, sleeveEnd, hem, neckTop, neckDepth, neckHalfW, dressLen, turtle, loose, flare, contrastSleeves]
export const TOPS = [
  ['tee', 'T-shirt', 'u', .45, .05, .98, .08, .12, 0, 0, 0, 0, 0], ['longtee', 'Long-sleeve tee', 'u', 1, .05, .98, .08, .12, 0, 0, 0, 0, 0], ['tank', 'Tank top', 'u', 0, .05, .94, .1, .13, 0, 0, 0, 0, 0],
  ['croptank', 'Crop tank', 'f', 0, .33, .94, .12, .14, 0, 0, 0, 0, 0], ['croptee', 'Crop tee', 'f', .45, .3, .98, .1, .14, 0, 0, 0, 0, 0], ['vneck', 'V-neck tee', 'u', .45, .05, .98, .26, .1, 0, 0, 0, 0, 0],
  ['scoop', 'Scoop neck', 'f', .4, .05, .94, .18, .14, 0, 0, 0, 0, 0], ['turtle', 'Turtleneck', 'u', 1, .05, 1.02, 0, 0, 0, 1, 0, 0, 0], ['henley', 'Henley', 'm', 1, .05, .98, .16, .08, 0, 0, 0, 0, 0],
  ['sweat', 'Sweatshirt', 'u', 1, .02, 1.0, .06, .13, 0, 0, .006, 0, 0], ['oversize', 'Oversized tee', 'u', .55, -.08, .98, .08, .14, 0, 0, .008, 0, 0], ['muscle', 'Muscle tee', 'm', .1, .05, .95, .12, .17, 0, 0, 0, 0, 0],
  ['tube', 'Tube top', 'f', 0, .12, .78, 0, .5, 0, 0, 0, 0, 0], ['tunic', 'Long tunic', 'u', .45, .05, .98, .1, .12, .18, 0, .004, .01, 0], ['raglan', 'Baseball tee', 'u', 1, .05, .98, .08, .12, 0, 0, 0, 0, 1],
  ['threeq', '3/4 sleeve', 'u', .7, .05, .98, .1, .13, 0, 0, 0, 0, 0], ['capsl', 'Cap sleeve', 'f', .2, .05, .98, .1, .13, 0, 0, 0, 0, 0], ['sundress', 'Sundress', 'f', 0, .05, .92, .13, .15, .3, 0, 0, .04, 0],
  ['sleevedress', 'Dress sleeves', 'f', .45, .05, .98, .08, .12, .32, 0, 0, .05, 0], ['minidress', 'Mini dress', 'f', .2, .05, .98, .1, .13, .2, 0, 0, .03, 0], ['maxidress', 'Maxi dress', 'f', 0, .05, .92, .11, .14, .85, 0, 0, .07, 0],
  ['bodysuit', 'Bodysuit', 'u', 1, .0, .98, .1, .12, .06, 0, 0, 0, 0], ['jersey', 'Sport jersey', 'u', .25, .0, .96, .14, .15, 0, 0, .005, 0, 0], ['flowy', 'Flowy blouse', 'f', .8, .0, .98, .12, .14, 0, 0, .008, .0, 0],
];
// jackets: [id, name, g, sleeveEnd, hem, neckTop, openHalfW, openTop, dressLen, hood/collar(turtle), loose, flare]
export const JACKETS = [
  ['bomber', 'Bomber', 'u', 1, .06, .98, .06, .0, 0, 0, .009, 0], ['denim', 'Denim jacket', 'u', 1, .1, .98, .05, .0, 0, 0, .008, 0], ['biker', 'Biker leather', 'u', 1, .12, .98, .07, .0, 0, 0, .007, 0], ['blazer', 'Blazer', 'u', 1, -.04, .98, .07, .0, 0, 0, .006, 0],
  ['puffer', 'Puffer', 'u', 1, .0, 1.0, .05, .0, 0, 1, .02, 0], ['trench', 'Trench coat', 'u', 1, -.2, .98, .06, .0, .45, 0, .008, .03], ['cardigan', 'Cardigan', 'u', 1, -.08, .98, .07, .0, 0, 0, .008, 0], ['vest', 'Vest', 'u', 0, .02, .98, .07, .0, 0, 0, .008, 0],
  ['parka', 'Parka', 'u', 1, -.12, 1.0, .05, .0, .2, 1, .016, .02], ['windbreaker', 'Windbreaker', 'u', 1, .04, .98, .05, .0, 0, 0, .012, 0], ['zip', 'Zip hoodie', 'u', 1, .0, 1.0, .04, .0, 0, 1, .011, 0], ['varsity', 'Varsity', 'u', 1, .06, .98, .06, .0, 0, 0, .01, 0],
  ['cropjacket', 'Cropped jacket', 'f', 1, .3, .98, .06, .0, 0, 0, .007, 0], ['longcoat', 'Long coat', 'u', 1, -.3, .98, .06, .0, .75, 0, .009, .04], ['shacket', 'Shirt jacket', 'u', 1, -.02, .98, .06, .0, 0, 0, .009, 0], ['poncho', 'Poncho', 'u', .8, -.1, .99, .0, .0, .1, 0, .018, .06],
];
// pants / skirts: [id, name, g, legEnd, waist, loose, flare]  (flare is per-leg radial offset, k = x + y * s)
export const PANTS = [
  ['jeans', 'Jeans', 'u', 1, .02, .006, 0, .003], ['skinny', 'Skinny jeans', 'u', 1, .02, .003, 0, 0], ['chino', 'Chinos', 'm', 1, .02, .005, 0, 0], ['cargo', 'Cargo pants', 'u', 1, .0, .014, 0, .004], ['joggers', 'Joggers', 'u', 1, .02, .009, 0, -.002],
  ['wide', 'Wide-leg', 'u', 1, .06, .007, .02, .028], ['bootcut', 'Bootcut', 'u', 1, .0, .005, .01, .014], ['shorts', 'Shorts', 'u', .42, .02, .007, 0, .004], ['bermuda', 'Bermuda shorts', 'm', .62, .02, .009, 0, .004], ['capri', 'Capri', 'f', .72, .02, .005, 0, 0],
  ['minishorts', 'Mini shorts', 'f', .22, .0, .004, 0, 0], ['leggings', 'Leggings', 'f', 1, .08, .002, 0, 0], ['highjeans', 'High-waist jeans', 'f', 1, .17, .005, 0, .004], ['miniskirt', 'Mini skirt', 'f', .2, .04, .006, .03, .09], ['midiskirt', 'Midi skirt', 'f', .5, .05, .006, .02, .13],
  ['longskirt', 'Long skirt', 'f', .9, .05, .006, .02, .15], ['trackpants', 'Track pants', 'u', 1, .03, .008, 0, .002], ['dresspants', 'Dress pants', 'u', 1, .05, .004, 0, .008], ['overalls', 'Overalls (shorts)', 'u', .42, .38, .01, 0, .004], ['kneeshorts', 'Cycling shorts', 'u', .4, .05, .002, 0, 0],
];
// shoes: [id, name, g, shaftStart(s), soleY, offset, toeCap, flareAnkle]
export const SHOES = [
  ['sneaker', 'Sneakers', 'u', .985, .03, .013, 1, 0], ['lowtop', 'Low-top canvas', 'u', .985, .014, .006, 1, 0], ['hightop', 'High-tops', 'u', .88, .024, .008, 1, 0], ['runner', 'Runners', 'u', .985, .03, .008, 0, 0], ['boot', 'Boots', 'u', .72, .02, .008, 0, 0],
  ['ankleboot', 'Ankle boots', 'u', .9, .02, .007, 0, 0], ['combat', 'Combat boots', 'u', .78, .03, .01, 0, 0], ['kneeboot', 'Knee boots', 'f', .5, .02, .007, 0, 0], ['thighboot', 'Thigh boots', 'f', .28, .02, .006, 0, 0], ['flat', 'Flats', 'f', .995, .008, .005, 0, 0],
  ['loafer', 'Loafers', 'u', .985, .012, .006, 0, 0], ['dress', 'Dress shoes', 'm', .985, .012, .006, 1, 0], ['chunky', 'Chunky sneakers', 'u', .97, .045, .012, 1, 0], ['work', 'Work boots', 'u', .8, .028, .011, 1, 0], ['rain', 'Rain boots', 'u', .6, .018, .01, 0, 0], ['socks', 'Socks only', 'u', .8, .004, .004, 0, 0],
];
export const GLOVES = [['short', 'Gloves', .98, .005], ['long', 'Long gloves', .55, .005], ['elbow', 'Elbow gloves', .3, .005], ['work', 'Work gloves', .93, .012], ['fingerless', 'Wrist wraps', .93, .006], ['driving', 'Driving gloves', .97, .005], ['winter', 'Winter mitts', .9, .016]];
export const OUTFIT_SLOTS = ['top', 'jacket', 'pants', 'shoes', 'gloves'];
// accessory families: [id, name, family, opts]
const H = (id, name, fam, o = {}) => [id, name, fam, o];
export const HATS = [
  H('capflat', 'Baseball cap', 'cap'), H('capshort', 'Short-brim cap', 'cap', { brim: .05 }), H('caplong', 'Long-brim cap', 'cap', { brim: .13 }), H('beanie', 'Beanie', 'beanie'), H('beanietall', 'Tall slouch beanie', 'beanie', { tall: 1.5 }), H('beaniepom', 'Pom beanie', 'beanie', { pom: 1 }),
  H('bucket', 'Bucket hat', 'bucket'), H('fedora', 'Fedora', 'brimmed', { wide: 1.6, crown: .75 }), H('sun', 'Sun hat', 'brimmed', { wide: 2.4, crown: .6 }), H('cowboy', 'Western hat', 'brimmed', { wide: 2.0, crown: 1.0 }), H('beret', 'Beret', 'beret'),
  H('headband', 'Headband', 'headband'), H('headbandthin', 'Thin headband', 'headband', { thick: .007 }), H('bandana', 'Bandana', 'bandana'), H('hardhat', 'Hard hat', 'hardhat'), H('visor', 'Sun visor', 'visor'), H('crown', 'Crown', 'crown'), H('catears', 'Cat-ear hat', 'ears'), H('hood', 'Hood up', 'hood'), H('helmet', 'Rider helmet', 'helmet'),
];
export const GLASSES_LIST = [];
for (const [sid, sn, o] of [['round', 'Round', { shape: 'round' }], ['square', 'Square', { shape: 'square' }], ['hex', 'Hex', { shape: 'hex' }], ['cat', 'Cat-eye', { shape: 'cat' }], ['oval', 'Oval', { shape: 'oval', w: .03, h: .018 }], ['big', 'Oversized', { shape: 'round', w: .036, h: .034 }], ['avi', 'Aviator', { shape: 'oval', aviator: 1, w: .032, h: .026 }], ['thin', 'Thin square', { shape: 'square', w: .028, h: .015, th: .0022 }]])
  for (const [lid, ln, lo] of [['clear', 'clear', {}], ['dark', 'shades', { dark: 1 }]]) GLASSES_LIST.push(H(sid + lid, sn + ' ' + ln, 'frame', { ...o, ...lo }));
GLASSES_LIST.push(H('goggles', 'Goggles', 'goggles'), H('visorg', 'Visor shades', 'visor'));
export const EARRINGS = [];
for (const [r, n] of [[.0045, 'Tiny'], [.006, 'Small'], [.008, 'Big']]) { EARRINGS.push(H('stud' + n, n + ' stud', 'stud', { r })); EARRINGS.push(H('gstud' + n, n + ' gem stud', 'stud', { r, gem: 1 })); }
for (const [R, n] of [[.011, 'Tiny'], [.016, 'Small'], [.022, 'Medium'], [.03, 'Large'], [.04, 'Huge']]) EARRINGS.push(H('hoop' + n, n + ' hoop', 'hoop', { R }));
EARRINGS.push(H('hoopthick', 'Thick hoop', 'hoop', { R: .02, t: .0055 }), H('drops', 'Gem drop', 'drop'), H('dropl', 'Long gem drop', 'drop', { len: .055 }), H('cuff', 'Ear cuff', 'cuff'), H('cross', 'Cross dangle', 'cross'), H('chain', 'Chain & stud', 'chain'));
export const PIERCINGS = [H('nose', 'Nose stud (left)', 'nose', { side: 1 }), H('noseR', 'Nose stud (right)', 'nose', { side: -1 }), H('nosegem', 'Nose gem (left)', 'nose', { side: 1, gem: 1 }), H('nosegemR', 'Nose gem (right)', 'nose', { side: -1, gem: 1 }), H('nosering', 'Nose ring', 'noseRing', { side: 1 }), H('septum', 'Septum ring', 'septum'),
  H('brow', 'Eyebrow piercing', 'brow', { side: 1 }), H('browR', 'Eyebrow piercing (right)', 'brow', { side: -1 }), H('lip', 'Lip ring', 'lip', { side: 1 }), H('lipR', 'Lip ring (right)', 'lip', { side: -1 }), H('tragus', 'Tragus stud', 'tragus', { side: 1 }), H('tragusR', 'Tragus stud (right)', 'tragus', { side: -1 })];
export const NECKLACES = [];
for (const [dn, d] of [['Short', .06], ['Mid', .12], ['Long', .2]]) for (const [pn, p, t] of [['', '', .0023], [' thick', '', .0045], [' + orb', 'orb', .0025], [' + cross', 'cross', .0025], [' + tag', 'tag', .0025], [' + ring', 'ring', .0025], [' + heart', 'heart', .0025]]) NECKLACES.push(H('chain' + dn + pn.replace(/\W/g, ''), dn + ' chain' + pn, 'chain', { drop: d, pend: p, t }));
NECKLACES.push(H('choker', 'Choker', 'choker'), H('chokerg', 'Gem choker', 'choker', { pend: 1 }), H('pearls', 'Pearl strand', 'pearls'), H('pearlsl', 'Long pearls', 'pearls', { drop: .18 }), H('beads', 'Bead necklace', 'beads'), H('scarf', 'Scarf', 'scarf'), H('lanyard', 'Lanyard', 'lanyard'));
export const WRISTS = [H('band', 'Wristband', 'band'), H('bandw', 'Wide wristband', 'band', { w: .035 }), H('bangle1', 'Bangle', 'bangle', { n: 1 }), H('bangle3', 'Bangle stack', 'bangle', { n: 3 }), H('bangle5', 'Big bangle stack', 'bangle', { n: 5 }), H('watch', 'Watch', 'watch'), H('cuffs', 'Leather cuff', 'cuffs')];
export const RINGS = [H('ring', 'Band ring', 'band'), H('ringgem', 'Gem ring', 'band', { gem: 1 })];
export const BAGS = [H('pack', 'Backpack', 'pack'), H('packbig', 'Hiking pack', 'pack', { h: .46, w: .3, d: .14 }), H('packsmall', 'Small pack', 'small'), H('cross', 'Crossbody bag', 'cross'), H('duffel', 'Duffel', 'duffel')];
export const BELTS = [H('belt', 'Belt', 'belt'), H('beltwide', 'Wide belt', 'belt', { rx: 1.04 })];
export const MASKS = [['surgical', 'Face mask', 0], ['bandanam', 'Bandana mask', 1], ['gaiter', 'Neck gaiter', 3]]; // v2: balaclava / ski mask removed (could not fit the new head cleanly)
export const SKIN_PRESETS = [0, .1, .2, .3, .4, .5, .6, .7, .8, .9, 1];

const sw = (k) => SWATCH[k].length;
export function COUNTS() {
  const pat = PATTERNS.length, cl = sw('cloth'), mt = SWATCH.metal.length, hc = sw('hair');
  const tops = TOPS.length, jac = JACKETS.length, pants = PANTS.length, shoes = SHOES.length, gl = GLOVES.length;
  const out = {
    'Hairstyles': { styles: HAIR.length, items: HAIR.length * hc, note: 'x ' + hc + ' preset colours + picker' },
    'Beards': { styles: BEARDS.length, items: BEARDS.length * hc },
    'Mustaches': { styles: STACHES.length, items: STACHES.length * hc },
    'Tops': { styles: tops, items: tops * pat, combos: tops * pat * cl },
    'Jackets': { styles: jac, items: jac * pat, combos: jac * pat * cl },
    'Pants & skirts': { styles: pants, items: pants * pat, combos: pants * pat * cl },
    'Shoes': { styles: shoes, items: shoes * 4, combos: shoes * 4 * cl },
    'Gloves': { styles: gl, items: gl * pat, combos: gl * pat * cl },
    'Hats': { styles: HATS.length, items: HATS.length * pat, combos: HATS.length * pat * cl },
    'Glasses': { styles: GLASSES_LIST.length, items: GLASSES_LIST.length * mt },
    'Masks': { styles: MASKS.length, items: MASKS.length * pat },
    'Earrings (per ear)': { styles: EARRINGS.length, items: EARRINGS.length * mt * 2 },
    'Piercings': { styles: PIERCINGS.length, items: PIERCINGS.length * mt },
    'Necklaces': { styles: NECKLACES.length, items: NECKLACES.length * mt },
    'Wrist & rings': { styles: WRISTS.length + RINGS.length, items: (WRISTS.length + RINGS.length) * mt * 2 },
    'Bags & belts': { styles: BAGS.length + BELTS.length, items: (BAGS.length + BELTS.length) * pat },
  };
  const t = { styles: 0, items: 0 }; for (const k in out) { t.styles += out[k].styles; t.items += out[k].items; } out.TOTAL = t; return out;
}
